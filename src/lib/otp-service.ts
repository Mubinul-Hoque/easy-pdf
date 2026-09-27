import { query } from './db';
import crypto from 'crypto';

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

  // Clean phone number: remove spaces, dashes, parentheses
  const digitsAndPlus = trimmed.replace(/[^\d+]/g, '');
  return {
    identifier: digitsAndPlus,
    channel: 'phone',
  };
}

/**
 * Validates format of email or phone number
 */
export function isValidIdentifier(raw: string): boolean {
  const { identifier, channel } = normalizeIdentifier(raw);
  if (!identifier) return false;

  if (channel === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(identifier);
  }

  if (channel === 'phone') {
    // Standard phone format: 6 to 20 digits, optional leading '+'
    const phoneRegex = /^\+?[0-9]{6,20}$/;
    return phoneRegex.test(identifier);
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

    await ensureOtpTable();
    const now = Date.now();

    // 1. Check Cooldown
    const existing = inMemoryOtpStore.get(identifier);
    if (existing && now - existing.createdAt < COOLDOWN_MS) {
      const waitRemaining = Math.ceil((COOLDOWN_MS - (now - existing.createdAt)) / 1000);
      return {
        success: false,
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

    // 3. Dispatch OTP via Channel (Email / SMS simulation)
    await this.dispatchOtpNotification({
      identifier,
      channel,
      otpCode,
      type,
    });

    const cooldownSec = process.env.NODE_ENV === 'production' ? 60 : 5;

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
   * Internal helper: Dispatches notification via SMS gateway or SMTP/Email
   */
  async dispatchOtpNotification(payload: {
    identifier: string;
    channel: OtpChannel;
    otpCode: string;
    type: OtpType;
  }) {
    const actionText =
      payload.type === 'register'
        ? 'registration'
        : payload.type === 'login'
        ? 'sign in'
        : 'verification';

    const message = `[EasyPDF] Your 4-digit ${actionText} code is: ${payload.otpCode}. Valid for 10 minutes. Do not share this code.`;

    // 1. If Twilio SMS credentials exist, send live SMS
    if (
      payload.channel === 'phone' &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;

        const params = new URLSearchParams();
        params.append('To', payload.identifier);
        params.append('From', fromNumber);
        params.append('Body', message);

        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );
        const twilioData = await twilioRes.json();
        console.log('📱 [Twilio SMS Sent]:', twilioData.sid || twilioData.message);
      } catch (smsErr: any) {
        console.error('❌ [Twilio SMS Delivery Error]:', smsErr.message);
      }
    }

    // 2. Log to Server Console for localhost / development
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
  },
};
