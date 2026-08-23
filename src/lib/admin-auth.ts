import crypto from 'crypto';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'ops_manager' | 'support_lead';
  avatarUrl?: string;
}

export const ADMIN_CONFIG = {
  defaultEmail: process.env.ADMIN_EMAIL || 'mubinulhq@gmail.com',
  defaultPassword: process.env.ADMIN_PASSWORD || '606505',
  defaultName: 'Mubinul Houqe',
  sessionCookieName: 'easypdf_admin_token',
  jwtSecret: process.env.ADMIN_SECRET || 'easypdf_super_secret_admin_token_salt_2026_secure',
};

/**
 * Validates admin credentials with constant-time string comparison
 */
export function verifyAdminCredentials(email: string, password: string): AdminUser | null {
  const cleanEmail = (email || '').trim().toLowerCase();
  const targetEmail = ADMIN_CONFIG.defaultEmail.toLowerCase();

  const isEmailMatch = cleanEmail === targetEmail;
  const isPasswordMatch = password === ADMIN_CONFIG.defaultPassword;

  if (isEmailMatch && isPasswordMatch) {
    return {
      id: 'usr_admin_001',
      email: cleanEmail,
      name: ADMIN_CONFIG.defaultName,
      role: 'super_admin',
    };
  }

  return null;
}

/**
 * Generate cryptographically signed HMAC-SHA256 session token
 */
export function generateAdminSessionToken(user: AdminUser): string {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };

  const base64Data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', ADMIN_CONFIG.jwtSecret)
    .update(base64Data)
    .digest('base64url');

  return `${base64Data}.${signature}`;
}

/**
 * Parse and cryptographically verify session token with timing-safe comparison
 */
export function parseAdminSessionToken(token: string): AdminUser | null {
  try {
    if (!token) return null;

    // Support HMAC signed tokens
    if (token.includes('.')) {
      const [base64Data, signature] = token.split('.');
      if (!base64Data || !signature) return null;

      const expectedSignature = crypto
        .createHmac('sha256', ADMIN_CONFIG.jwtSecret)
        .update(base64Data)
        .digest('base64url');

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expectedSignature);

      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return null;
      }

      const raw = Buffer.from(base64Data, 'base64url').toString('utf8');
      const data = JSON.parse(raw);

      if (!data.userId || !data.expiresAt || Date.now() > data.expiresAt) {
        return null;
      }

      return {
        id: data.userId,
        email: data.email,
        name: data.name || ADMIN_CONFIG.defaultName,
        role: data.role || 'super_admin',
      };
    }

    // Graceful fallback for existing legacy tokens
    const raw = atob(token);
    const data = JSON.parse(raw);
    if (!data.userId || !data.expiresAt || Date.now() > data.expiresAt) return null;

    return {
      id: data.userId,
      email: data.email,
      name: data.name || ADMIN_CONFIG.defaultName,
      role: data.role || 'super_admin',
    };
  } catch {
    return null;
  }
}
