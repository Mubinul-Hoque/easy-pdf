import { query } from './db';
import { ensureSettingsTable } from './settings-service';

/**
 * Twilio credentials, admin-configurable so they don't require a redeploy to
 * change. DB values (when set) take precedence over the TWILIO_* env vars,
 * which remain a valid fallback for infra-as-code style configuration.
 */
export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

const SETTINGS_KEY = 'twilioCredentials';
const EMPTY_CREDENTIALS: TwilioCredentials = { accountSid: '', authToken: '', phoneNumber: '' };

declare global {
  var __easypdf_twilio_credentials: TwilioCredentials | undefined;
}

let cached: TwilioCredentials = globalThis.__easypdf_twilio_credentials || { ...EMPTY_CREDENTIALS };
globalThis.__easypdf_twilio_credentials = cached;

/** Full, unmasked credentials — server-side use only (e.g. building the Twilio API call). Never return this to a client. */
export async function getTwilioCredentials(): Promise<TwilioCredentials> {
  try {
    await ensureSettingsTable();
    const rows = await query<{ setting_value: string }>(
      `SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1`,
      [SETTINGS_KEY]
    );
    if (rows.length > 0) {
      const parsed = JSON.parse(rows[0].setting_value);
      cached = { ...EMPTY_CREDENTIALS, ...parsed };
      globalThis.__easypdf_twilio_credentials = cached;
      return cached;
    }
  } catch {
    // Fall back to cached/default
  }
  return cached;
}

/**
 * Resolves the credentials actually used at send-time: DB values (set via the
 * admin panel) take priority; any field left blank falls back to its env var.
 */
export async function resolveTwilioCredentials(): Promise<TwilioCredentials> {
  const stored = await getTwilioCredentials();
  return {
    accountSid: stored.accountSid || process.env.TWILIO_ACCOUNT_SID || '',
    authToken: stored.authToken || process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: stored.phoneNumber || process.env.TWILIO_PHONE_NUMBER || '',
  };
}

function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}

export interface MaskedTwilioStatus {
  accountSid: string;
  authTokenMasked: string;
  phoneNumber: string;
  isConfigured: boolean;
  source: 'admin' | 'env' | 'none';
}

/** Safe-to-return-to-the-client view: secrets are masked, never sent in full. */
export async function getMaskedTwilioStatus(): Promise<MaskedTwilioStatus> {
  const stored = await getTwilioCredentials();
  const resolved = await resolveTwilioCredentials();
  const usingAdminValue = Boolean(stored.accountSid || stored.authToken || stored.phoneNumber);

  return {
    accountSid: resolved.accountSid,
    authTokenMasked: maskSecret(resolved.authToken),
    phoneNumber: resolved.phoneNumber,
    isConfigured: Boolean(resolved.accountSid && resolved.authToken && resolved.phoneNumber),
    source: usingAdminValue ? 'admin' : resolved.accountSid ? 'env' : 'none',
  };
}

/**
 * Updates stored Twilio credentials. A field passed as undefined/omitted
 * leaves the existing stored value untouched (so the admin form never has to
 * resend a secret it can't see back). Pass an empty string to explicitly clear a field.
 */
export async function updateTwilioCredentials(
  partial: Partial<TwilioCredentials>
): Promise<MaskedTwilioStatus> {
  const current = await getTwilioCredentials();
  const updated: TwilioCredentials = {
    accountSid: partial.accountSid !== undefined ? partial.accountSid.trim() : current.accountSid,
    authToken: partial.authToken !== undefined ? partial.authToken.trim() : current.authToken,
    phoneNumber: partial.phoneNumber !== undefined ? partial.phoneNumber.trim() : current.phoneNumber,
  };

  cached = updated;
  globalThis.__easypdf_twilio_credentials = cached;

  try {
    await ensureSettingsTable();
    await query(
      `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
      [SETTINGS_KEY, JSON.stringify(updated)]
    );
  } catch {
    // Stays accurate in-memory for this process even if the write fails
  }

  return getMaskedTwilioStatus();
}
