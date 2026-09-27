import { query } from './db';
import { ensureSettingsTable } from './settings-service';

export type RateLimitCategory = 'adminLogin' | 'otpSend' | 'otpVerify' | 'apiActions' | 'general';

export interface RateLimitRule {
  enabled: boolean;
  maxRequests: number;
  windowSeconds: number;
}

export interface SecuritySettings {
  ipBanEnforcementEnabled: boolean;
  rateLimits: Record<RateLimitCategory, RateLimitRule>;
  updatedAt?: string;
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  ipBanEnforcementEnabled: true,
  rateLimits: {
    adminLogin: { enabled: true, maxRequests: 5, windowSeconds: 300 },
    otpSend: { enabled: true, maxRequests: 8, windowSeconds: 600 },
    otpVerify: { enabled: true, maxRequests: 20, windowSeconds: 600 },
    apiActions: { enabled: true, maxRequests: 60, windowSeconds: 60 },
    general: { enabled: true, maxRequests: 100, windowSeconds: 60 },
  },
};

const SETTINGS_KEY = 'securitySettings';

declare global {
  var __easypdf_security_settings: SecuritySettings | undefined;
}

let cachedSettings: SecuritySettings =
  globalThis.__easypdf_security_settings || cloneDefaults();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__easypdf_security_settings = cachedSettings;
}

function cloneDefaults(): SecuritySettings {
  return JSON.parse(JSON.stringify(DEFAULT_SECURITY_SETTINGS));
}

/** Clamp a rate-limit rule to sane bounds so a bad admin input can't disable the server. */
function sanitizeRule(rule: Partial<RateLimitRule> | undefined, fallback: RateLimitRule): RateLimitRule {
  if (!rule || typeof rule !== 'object') return fallback;
  const maxRequests = Number(rule.maxRequests);
  const windowSeconds = Number(rule.windowSeconds);
  return {
    enabled: typeof rule.enabled === 'boolean' ? rule.enabled : fallback.enabled,
    maxRequests: Number.isFinite(maxRequests) ? Math.min(100000, Math.max(1, Math.round(maxRequests))) : fallback.maxRequests,
    windowSeconds: Number.isFinite(windowSeconds) ? Math.min(86400, Math.max(1, Math.round(windowSeconds))) : fallback.windowSeconds,
  };
}

function mergeWithDefaults(partial: any): SecuritySettings {
  const defaults = cloneDefaults();
  const source = partial && typeof partial === 'object' ? partial : {};
  const sourceLimits = source.rateLimits && typeof source.rateLimits === 'object' ? source.rateLimits : {};

  return {
    ipBanEnforcementEnabled:
      typeof source.ipBanEnforcementEnabled === 'boolean'
        ? source.ipBanEnforcementEnabled
        : defaults.ipBanEnforcementEnabled,
    rateLimits: {
      adminLogin: sanitizeRule(sourceLimits.adminLogin, defaults.rateLimits.adminLogin),
      otpSend: sanitizeRule(sourceLimits.otpSend, defaults.rateLimits.otpSend),
      otpVerify: sanitizeRule(sourceLimits.otpVerify, defaults.rateLimits.otpVerify),
      apiActions: sanitizeRule(sourceLimits.apiActions, defaults.rateLimits.apiActions),
      general: sanitizeRule(sourceLimits.general, defaults.rateLimits.general),
    },
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : new Date().toISOString(),
  };
}

function setCache(settings: SecuritySettings) {
  cachedSettings = settings;
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__easypdf_security_settings = cachedSettings;
  }
}

/**
 * Loads the persisted security configuration (IP ban enforcement + per-category
 * rate limits). Falls back to the in-memory cache/defaults if the DB is offline.
 */
export async function getSecuritySettings(): Promise<SecuritySettings> {
  try {
    await ensureSettingsTable();
    const rows = await query<{ setting_value: string }>(
      `SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1`,
      [SETTINGS_KEY]
    );
    if (rows && rows.length > 0) {
      const parsed = JSON.parse(rows[0].setting_value);
      const merged = mergeWithDefaults(parsed);
      setCache(merged);
      return merged;
    }
  } catch {
    // DB offline — serve cached/default settings
  }
  return cachedSettings;
}

/**
 * Persists an admin-supplied (partial) update to the security configuration.
 * Values are validated/clamped before being written.
 */
export async function updateSecuritySettings(
  partial: Partial<SecuritySettings> & { rateLimits?: Partial<Record<RateLimitCategory, Partial<RateLimitRule>>> }
): Promise<SecuritySettings> {
  const current = await getSecuritySettings();
  const merged = mergeWithDefaults({
    ...current,
    ...partial,
    rateLimits: { ...current.rateLimits, ...(partial.rateLimits || {}) },
    updatedAt: new Date().toISOString(),
  });

  try {
    await ensureSettingsTable();
    await query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
      [SETTINGS_KEY, JSON.stringify(merged)]
    );
  } catch {
    // DB offline — keep the in-memory value so this process stays consistent
  }

  setCache(merged);
  return merged;
}
