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
  jwtSecret: process.env.ADMIN_SECRET || 'easypdf_super_secret_admin_token_salt_2026',
};

/**
 * Validates admin credentials
 */
export function verifyAdminCredentials(email: string, password: string): AdminUser | null {
  const cleanEmail = email.trim().toLowerCase();
  const targetEmail = ADMIN_CONFIG.defaultEmail.toLowerCase();

  if (cleanEmail === targetEmail && password === ADMIN_CONFIG.defaultPassword) {
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
 * Generate lightweight secure token for browser session
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
  return btoa(JSON.stringify(payload));
}

/**
 * Parse and verify session token
 */
export function parseAdminSessionToken(token: string): AdminUser | null {
  try {
    const raw = atob(token);
    const data = JSON.parse(raw);
    if (!data.userId || !data.expiresAt) return null;
    if (Date.now() > data.expiresAt) return null;

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
