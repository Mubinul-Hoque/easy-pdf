import crypto from 'crypto';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'ops_manager' | 'support_lead';
  avatarUrl?: string;
}

// --------------------------------------------------------------------------
// Token signing secret — MUST be set via environment variable in production.
// Validated lazily (at request time) so builds succeed without the secret set.
// --------------------------------------------------------------------------
let _adminJwtSecret: string | null = null;

function getAdminJwtSecret(): string {
  if (_adminJwtSecret) return _adminJwtSecret;

  const envSecret = process.env.ADMIN_SECRET || process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 32) {
    _adminJwtSecret = envSecret;
    return _adminJwtSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[EasyPDF Security] ADMIN_SECRET or JWT_SECRET environment variable is not set or is too short (minimum 32 chars). ' +
        'Set a strong random secret before starting the production server.'
    );
  }

  // Development: use a stable deterministic secret so all route handlers and hot-reloads share the same key
  _adminJwtSecret = 'easypdf_dev_fixed_secret_key_session_signing_minimum_32_chars_2026';
  return _adminJwtSecret;
}

export const ADMIN_CONFIG = {
  defaultEmail: process.env.ADMIN_EMAIL || '',
  defaultName: process.env.ADMIN_NAME || 'Administrator',
  sessionCookieName: 'easypdf_admin_token',
  get jwtSecret() { return getAdminJwtSecret(); },
  sessionTtlMs: 1000 * 60 * 60 * 8, // 8-hour sessions
};

// --------------------------------------------------------------------------
// Derive a stable per-password HMAC for constant-time comparison.
// Avoids storing plain text; uses the JWT secret as the HMAC key.
// --------------------------------------------------------------------------
function derivePasswordHmac(password: string): Buffer {
  return crypto
    .createHmac('sha256', getAdminJwtSecret())
    .update(password || '')
    .digest();
}

/**
 * Validates admin credentials with timing-safe HMAC comparison.
 * Never returns the reason a specific field failed (prevents enumeration).
 */
export function verifyAdminCredentials(email: string, password: string): AdminUser | null {
  const configuredEmail = ADMIN_CONFIG.defaultEmail;
  const configuredPassword = process.env.ADMIN_PASSWORD || '';

  if (!configuredEmail || !configuredPassword) return null;

  const cleanEmail = (email || '').trim().toLowerCase().slice(0, 254);
  const targetEmail = configuredEmail.trim().toLowerCase();

  // Normalise both to equal-length buffers for timing-safe comparison
  const emailBuf = Buffer.from(cleanEmail.padEnd(targetEmail.length, '\0'));
  const targetBuf = Buffer.from(targetEmail.padEnd(cleanEmail.length, '\0'));
  const emailMatch =
    emailBuf.length === targetBuf.length && crypto.timingSafeEqual(emailBuf, targetBuf);

  // HMAC-compare passwords — never compare plain text
  const suppliedHash = derivePasswordHmac(password);
  const expectedHash = derivePasswordHmac(configuredPassword);
  const passwordMatch = crypto.timingSafeEqual(suppliedHash, expectedHash);

  if (emailMatch && passwordMatch) {
    return {
      id: 'usr_admin_001',
      email: configuredEmail.trim().toLowerCase(),
      name: ADMIN_CONFIG.defaultName,
      role: 'super_admin',
    };
  }

  return null;
}

/**
 * Generate a cryptographically signed HMAC-SHA256 session token (8-hour TTL).
 */
export function generateAdminSessionToken(user: AdminUser): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + ADMIN_CONFIG.sessionTtlMs;

  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: issuedAt,
    exp: expiresAt,
  };

  const base64Data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getAdminJwtSecret())
    .update(base64Data)
    .digest('base64url');

  return `${base64Data}.${signature}`;
}

/**
 * Parse and cryptographically verify a session token.
 * ONLY accepts HMAC-signed tokens — no legacy fallback.
 */
export function parseAdminSessionToken(token: string): AdminUser | null {
  try {
    if (!token || typeof token !== 'string') return null;

    // Must contain exactly one dot separating payload from signature
    const dotIndex = token.indexOf('.');
    if (dotIndex < 0 || dotIndex !== token.lastIndexOf('.')) return null;

    const base64Data = token.slice(0, dotIndex);
    const signature = token.slice(dotIndex + 1);
    if (!base64Data || !signature) return null;

    // Recompute expected signature and compare in constant time
    const expectedSignature = crypto
      .createHmac('sha256', getAdminJwtSecret())
      .update(base64Data)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');

    // Fail if lengths differ (timing-safe comparison requires equal lengths)
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const raw = Buffer.from(base64Data, 'base64url').toString('utf8');
    const data = JSON.parse(raw);

    if (
      !data.userId ||
      typeof data.exp !== 'number' ||
      Date.now() > data.exp
    ) {
      return null;
    }

    // Validate expected shape to prevent token injection
    const allowedRoles = ['super_admin', 'ops_manager', 'support_lead'];
    if (!allowedRoles.includes(data.role)) return null;

    return {
      id: String(data.userId).slice(0, 64),
      email: String(data.email || '').slice(0, 254),
      name: String(data.name || ADMIN_CONFIG.defaultName).slice(0, 100),
      role: data.role as AdminUser['role'],
    };
  } catch {
    // Never leak parse errors — simply reject the token
    return null;
  }
}
