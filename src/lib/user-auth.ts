import crypto from 'crypto';
import { dbService } from './db';
import { NextRequest } from 'next/server';

export interface AuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  fullName: string;
  role: 'USER' | 'ADMIN';
  tier: 'ANONYMOUS' | 'FREE' | 'PRO' | 'BUSINESS';
  planId: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt?: string;
}

let _userJwtSecret: string | null = null;

function getUserJwtSecret(): string {
  if (_userJwtSecret) return _userJwtSecret;

  const envSecret = process.env.JWT_SECRET || process.env.ADMIN_SECRET;
  if (envSecret && envSecret.length >= 32) {
    _userJwtSecret = envSecret;
    return _userJwtSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[EasyPDF Security] JWT_SECRET or ADMIN_SECRET environment variable is not set or is too short (minimum 32 chars). ' +
        'Set a strong random secret before starting the production server.'
    );
  }

  // Stable development secret
  _userJwtSecret = 'easypdf_user_auth_session_secret_key_minimum_32_chars_2026';
  return _userJwtSecret;
}

export const USER_AUTH_CONFIG = {
  sessionCookieName: 'easypdf_user_token',
  sessionTtlMs: 1000 * 60 * 60 * 24 * 30, // 30 days
  get jwtSecret() {
    return getUserJwtSecret();
  },
};

/**
 * Generate a cryptographically signed HMAC-SHA256 session token
 */
export function generateUserSessionToken(user: AuthUser): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + USER_AUTH_CONFIG.sessionTtlMs;

  const payload = {
    userId: user.id,
    email: user.email || null,
    phone: user.phone || null,
    fullName: user.fullName,
    role: user.role,
    tier: user.tier,
    planId: user.planId,
    status: user.status,
    iat: issuedAt,
    exp: expiresAt,
  };

  const base64Data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getUserJwtSecret())
    .update(base64Data)
    .digest('base64url');

  return `${base64Data}.${signature}`;
}

/**
 * Parse and verify user HMAC session token
 */
export function parseUserSessionToken(token: string): AuthUser | null {
  try {
    if (!token || typeof token !== 'string') return null;

    const dotIndex = token.indexOf('.');
    if (dotIndex < 0 || dotIndex !== token.lastIndexOf('.')) return null;

    const base64Data = token.slice(0, dotIndex);
    const signature = token.slice(dotIndex + 1);
    if (!base64Data || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', getUserJwtSecret())
      .update(base64Data)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const raw = Buffer.from(base64Data, 'base64url').toString('utf8');
    const data = JSON.parse(raw);

    if (!data.userId || typeof data.exp !== 'number' || Date.now() > data.exp) {
      return null;
    }

    return {
      id: String(data.userId),
      email: data.email || null,
      phone: data.phone || null,
      fullName: String(data.fullName || 'User'),
      role: data.role === 'ADMIN' ? 'ADMIN' : 'USER',
      tier: data.tier || 'FREE',
      planId: data.planId || 'plan_free_001',
      status: data.status || 'active',
    };
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies current authenticated user from request cookies or Authorization header
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  const cookieToken = req.cookies.get(USER_AUTH_CONFIG.sessionCookieName)?.value;
  const headerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  const token = cookieToken || headerToken;
  if (!token) return null;

  const parsed = parseUserSessionToken(token);
  if (!parsed) return null;

  // Verify status in DB if available
  try {
    const dbUser = await dbService.getUserById(parsed.id);
    if (dbUser) {
      if (dbUser.status === 'suspended') return null;
      return {
        id: dbUser.id,
        email: dbUser.email,
        phone: dbUser.phone,
        fullName: dbUser.full_name,
        role: dbUser.role,
        tier: dbUser.tier,
        planId: dbUser.plan_id,
        status: dbUser.status,
        createdAt: dbUser.created_at,
      };
    }
  } catch {
    // Return parsed token if DB lookup is offline
  }

  return parsed;
}
