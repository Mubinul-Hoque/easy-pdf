import { query } from './db';
import crypto from 'crypto';
import { parsePhoneNumberFromString } from 'libphonenumber-js/mobile';
import { resolveTwilioCredentials } from './notification-settings';
import { settingsService } from './settings-service';

export type OtpChannel = 'email' | 'phone';
export type OtpType = 'register' | 'login' | 'reset_password';

export interface OtpRecord {
  id: string;
  identifier: string;
  otpCode: string;
  type: OtpType;
  attempts: number;
  expiresAt: number; // timestamp ms
  createdAt: number;
}

// Global shared fallback store with TTL across all Next.js worker threads
declare global {
  var __easypdf_global_otp_store: Map<string, OtpRecord> | undefined;
}

const inMemoryOtpStore: Map<string, OtpRecord> =
  globalThis.__easypdf_global_otp_store || new Map<string, OtpRecord>();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__easypdf_global_otp_store = inMemoryOtpStore;
}

// Cooldown tracking (5s in development for seamless testing, 60s in production)
const COOLDOWN_MS = process.env.NODE_ENV === 'production' ? 60 * 1000 : 5 * 1000;
// Expiry duration (10 minutes)
const EXPIRY_MS = 10 * 60 * 1000;
// Max verification attempts before invalidation
const MAX_ATTEMPTS = 5;

let tableEnsured = false;
async function ensureOtpTable() {
  if (tableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id VARCHAR(64) PRIMARY KEY,
        identifier VARCHAR(191) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        type ENUM('register', 'login', 'reset_password') NOT NULL DEFAULT 'register',
        attempts INT NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_otp_identifier (identifier),
        INDEX idx_otp_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    tableEnsured = true;
  } catch (err: any) {
    // Database offline or query error, inMemoryOtpStore will handle seamlessly
  }
}

/**
 * Normalizes email or phone number to standard format
 */
export function normalizeIdentifier(raw: string): { identifier: string; channel: OtpChannel } {
  const trimmed = (raw || '').trim();
  if (trimmed.includes('@')) {
    return {
      identifier: trimmed.toLowerCase(),
      channel: 'email',
    };
  }

  // Clean phone number: remove spaces, dashes, parentheses.
  // The frontend always submits a full E.164 number (e.g. "+8801712345678");
  // re-parsing here normalizes it to a canonical form regardless of caller,
  // and is the server-side source of truth — client validation is never trusted alone.
  const digitsAndPlus = trimmed.replace(/[^\d+]/g, '');
  const parsed = parsePhoneNumberFromString(digitsAndPlus);
  return {
    identifier: parsed?.number || digitsAndPlus,
    channel: 'phone',
  };
}

/**
 * Validates format of email or phone number. Phone numbers are validated
 * against real per-country numbering rules (length, prefixes, mobile vs.
 * landline patterns) via libphonenumber-js, not just a loose digit-count regex.
 */
export function isValidIdentifier(raw: string): boolean {
  const { identifier, channel } = normalizeIdentifier(raw);
  if (!identifier) return false;

  if (channel === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(identifier);
  }

  if (channel === 'phone') {
    const parsed = parsePhoneNumberFromString(identifier);
    return parsed?.isValid() || false;
  }

  return false;
}

/**
 * Generates a secure 4-digit OTP code (1000 - 9999)
 */
export function generate4DigitOtp(): string {
  const code = crypto.randomInt(1000, 10000);
  return code.toString();
}

export const otpService = {
  /**
   * Generates and sends a 4-digit OTP code to email or mobile phone
   */
  async sendOtp(rawIdentifier: string, type: OtpType = 'register') {
    const { identifier, channel } = normalizeIdentifier(rawIdentifier);

    if (!isValidIdentifier(identifier)) {
      throw new Error(`Invalid ${channel === 'email' ? 'email address' : 'mobile phone number'} format`);
    }

    // Respect the admin's channel on/off switch (Branding & Settings) before
    // doing anything else — a disabled channel is rejected regardless of
    // whether its delivery provider happens to be configured.
    const siteSettings = await settingsService.getSettings();
    const channelEnabled = channel === 'email' ? siteSettings.emailVerificationEnabled : siteSettings.phoneVerificationEnabled;
    if (!channelEnabled) {
      return {
        success: false,
        code: 'CHANNEL_DISABLED' as const,
        message: `${channel === 'email' ? 'Email' : 'Phone'} verification is currently disabled by the administrator.`,
      };
    }

    await ensureOtpTable();
    const now = Date.now();

    // 1. Check Cooldown
    const existing = inMemoryOtpStore.get(identifier);
    if (existing && now - existing.createdAt < COOLDOWN_MS) {
      const waitRemaining = Math.ceil((COOLDOWN_MS - (now - existing.createdAt)) / 1000);
      return {
        success: false,
        code: 'COOLDOWN_ACTIVE' as const,
        cooldownRemainingSeconds: waitRemaining,
        message: `Please wait ${waitRemaining}s before requesting a new verification code.`,
      };
    }

    // 2. Generate 4-digit code
    const otpCode = generate4DigitOtp();
    const id = `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const expiresAt = now + EXPIRY_MS;

    const record: OtpRecord = {
      id,
      identifier,
      otpCode,
      type,
      attempts: 0,
      expiresAt,
      createdAt: now,
    };

    // Store in global memory
    inMemoryOtpStore.set(identifier, record);

    // Store in Database
    try {
      await query(`DELETE FROM otp_verifications WHERE identifier = ?`, [identifier]);

      const expiresDate = new Date(expiresAt);
      await query(
        `INSERT INTO otp_verifications (id, identifier, otp_code, type, attempts, expires_at, created_at)
         VALUES (?, ?, ?, ?, 0, ?, NOW())`,
        [id, identifier, otpCode, type, expiresDate]
      );
    } catch (err: any) {
      console.warn('[OTP DB Notice] Storing in resilient global memory cache:', err.message);
    }

    // 3. Dispatch OTP via Channel (Email / SMS)
    const dispatchResult = await this.dispatchOtpNotification({
      identifier,
      channel,
      otpCode,
      type,
    });

    const cooldownSec = process.env.NODE_ENV === 'production' ? 60 : 5;

    // In production, never claim success unless a real provider actually
    // delivered the message — the code was already generated/stored above,
    // but a fake "sent!" response just leaves the user waiting for nothing.
    // In development, console-log delivery + demoOtp is an accepted stand-in.
    if (process.env.NODE_ENV === 'production' && !dispatchResult.delivered) {
      console.error(`[OTP Delivery Failed] channel=${channel} identifier=${identifier} reason=${dispatchResult.error}`);
      return {
        success: false,
        code: 'DELIVERY_FAILED' as const,
        message:
          channel === 'phone'
            ? 'SMS delivery is not currently configured for this app. Please contact support.'
            : 'Email delivery is not currently configured for this app. Please contact support.',
      };
    }

    return {
      success: true,
      identifier,
      channel,
      cooldownSeconds: cooldownSec,
      expiresInSeconds: 600,
      message: `A 4-digit verification code has been sent to your ${channel === 'email' ? 'email address' : 'mobile phone'}.`,
      // Never echo the real OTP back to the client in production — it must
      // only reach the user via the actual email/SMS channel. Exposed only
      // in local development to make manual testing convenient.
      demoOtp: process.env.NODE_ENV === 'production' ? undefined : otpCode,
    };
  },

  /**
   * Verifies the 4-digit OTP code submitted by the user
   */
  async verifyOtp(rawIdentifier: string, inputOtp: string, expectedType?: OtpType): Promise<{
    valid: boolean;
    message: string;
    remainingAttempts?: number;
  }> {
    const { identifier } = normalizeIdentifier(rawIdentifier);
    const cleanOtp = (inputOtp || '').trim().replace(/\D/g, '');

    if (cleanOtp.length !== 4) {
      return {
        valid: false,
        message: 'Please enter a valid 4-digit code.',
      };
    }

    await ensureOtpTable();
    const now = Date.now();

    // Check DB first, fallback to memory
    let foundRecord: OtpRecord | null = null;

    try {
      const rows = await query<any>(
        `SELECT * FROM otp_verifications WHERE identifier = ? ORDER BY created_at DESC LIMIT 1`,
        [identifier]
      );
      if (rows && rows.length > 0) {
        const row = rows[0];
        foundRecord = {
          id: row.id,
          identifier: row.identifier,
          otpCode: String(row.otp_code).trim(),
          type: row.type as OtpType,
          attempts: Number(row.attempts || 0),
          expiresAt: new Date(row.expires_at).getTime(),
          createdAt: new Date(row.created_at).getTime(),
        };
      }
    } catch {
      // Fallback to memory
    }

    if (!foundRecord) {
      foundRecord = inMemoryOtpStore.get(identifier) || null;
    }

    if (!foundRecord) {
      return {
        valid: false,
        message: 'No active verification code found. Please request a new code.',
      };
    }

    // Check expiration
    if (now > foundRecord.expiresAt) {
      inMemoryOtpStore.delete(identifier);
      try {
        await query(`DELETE FROM otp_verifications WHERE identifier = ?`, [identifier]);
      } catch {}
      return {
        valid: false,
        message: 'Verification code has expired. Please request a new one.',
      };
    }

    // Check max attempts
    if (foundRecord.attempts >= MAX_ATTEMPTS) {
      inMemoryOtpStore.delete(identifier);
      try {
        await query(`DELETE FROM otp_verifications WHERE identifier = ?`, [identifier]);
      } catch {}
      return {
        valid: false,
        message: 'Too many incorrect attempts. Please request a new verification code.',
      };
    }

    // Check match
    const isMatch = foundRecord.otpCode === cleanOtp;

    if (!isMatch) {
      foundRecord.attempts += 1;
      inMemoryOtpStore.set(identifier, foundRecord);

      try {
        await query(`UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?`, [
          foundRecord.id,
        ]);
      } catch {}

      const remaining = Math.max(0, MAX_ATTEMPTS - foundRecord.attempts);
      return {
        valid: false,
        message: `Incorrect 4-digit code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        remainingAttempts: remaining,
      };
    }

    // Successfully verified -> Clean up used code
    inMemoryOtpStore.delete(identifier);
    try {
      await query(`DELETE FROM otp_verifications WHERE identifier = ?`, [identifier]);
    } catch {}

    return {
      valid: true,
      message: 'Verification successful.',
    };
  },

  /**
   * Internal helper: Dispatches notification via SMS gateway or SMTP/Email.
   * Returns whether a REAL delivery channel actually sent the message —
   * console logging alone never counts as delivered. Callers must not report
   * success to the end user unless this is honest about that.
   */
  async dispatchOtpNotification(payload: {
    identifier: string;
    channel: OtpChannel;
    otpCode: string;
    type: OtpType;
  }): Promise<{ delivered: boolean; error?: string }> {
    const actionText =
      payload.type === 'register'
        ? 'registration'
        : payload.type === 'login'
        ? 'sign in'
        : 'verification';

    const message = `[EasyPDF] Your 4-digit ${actionText} code is: ${payload.otpCode}. Valid for 10 minutes. Do not share this code.`;
    let delivered = false;
    let error: string | undefined;

    if (payload.channel === 'phone') {
      // Admin-panel-configured credentials take priority; TWILIO_* env vars are the fallback.
      const twilio = await resolveTwilioCredentials();

      if (twilio.accountSid && twilio.authToken && twilio.phoneNumber) {
        try {
          const params = new URLSearchParams();
          params.append('To', payload.identifier);
          params.append('From', twilio.phoneNumber);
          params.append('Body', message);

          const twilioRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                Authorization: 'Basic ' + Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: params.toString(),
            }
          );
          const twilioData = await twilioRes.json();
          if (twilioRes.ok) {
            delivered = true;
            console.log('📱 [Twilio SMS Sent]:', twilioData.sid);
          } else {
            // Common causes: destination country not geo-permitted on this
            // Twilio account, invalid/unverified From number, insufficient balance.
            error = twilioData.message || 'SMS provider rejected the message.';
            console.error('❌ [Twilio SMS Delivery Error]:', error);
          }
        } catch (smsErr: any) {
          error = smsErr.message || 'SMS provider request failed.';
          console.error('❌ [Twilio SMS Delivery Error]:', error);
        }
      } else {
        error = 'No SMS provider is configured. Set Twilio credentials in the admin panel (Branding & Settings) or via TWILIO_* environment variables.';
      }
    } else {
      // Real email delivery via Resend (https://resend.com). Falls back to
      // console-log-only if RESEND_API_KEY isn't set.
      if (process.env.RESEND_API_KEY) {
        try {
          const fromAddress = process.env.EMAIL_FROM || 'EasyPDF <onboarding@resend.dev>';
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromAddress,
              to: payload.identifier,
              subject: `Your EasyPDF verification code: ${payload.otpCode}`,
              html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                  <h2 style="color: #1e293b;">EasyPDF Verification Code</h2>
                  <p style="color: #475569;">Use the code below to complete your ${actionText}:</p>
                  <p style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">${payload.otpCode}</p>
                  <p style="color: #94a3b8; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
                </div>
              `,
            }),
          });
          const emailData = await emailRes.json();
          if (emailRes.ok) {
            delivered = true;
            console.log('📧 [Resend Email Sent]:', emailData.id);
          } else {
            // Common cause: sending domain in EMAIL_FROM isn't verified on the Resend account yet.
            error = emailData.message || 'Email provider rejected the message.';
            console.error('❌ [Resend Email Delivery Error]:', error);
          }
        } catch (emailErr: any) {
          error = emailErr.message || 'Email provider request failed.';
          console.error('❌ [Resend Email Delivery Error]:', error);
        }
      } else {
        error = 'No email provider is configured (RESEND_API_KEY environment variable).';
      }
    }

    // 2. Always log to server console too — the only delivery path in local development
    if (payload.channel === 'phone') {
      console.log(`\n========================================`);
      console.log(`📱 [MOBILE OTP DISPATCH] To: ${payload.identifier}`);
      console.log(`💬 Message: ${message}`);
      console.log(`🔑 4-Digit OTP Code: >>> ${payload.otpCode} <<<`);
      console.log(`========================================\n`);
    } else {
      console.log(`\n========================================`);
      console.log(`📧 [EMAIL OTP DISPATCH] To: ${payload.identifier}`);
      console.log(`💬 Subject: Your EasyPDF Verification Code (${payload.otpCode})`);
      console.log(`🔑 4-Digit OTP Code: >>> ${payload.otpCode} <<<`);
      console.log(`========================================\n`);
    }

    return { delivered, error };
  },
};
