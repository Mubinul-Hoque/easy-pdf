import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminCredentials,
  generateAdminSessionToken,
  parseAdminSessionToken,
  ADMIN_CONFIG,
} from '@/lib/admin-auth';
import { securityService } from '@/lib/security-service';
import { safeApiError } from '@/lib/api-security';
import { enforceSecurityGate } from '@/lib/security-gate';

export async function POST(req: NextRequest) {
  try {
    // IP-ban check applies to every admin auth action; the per-category rate
    // limit below is applied only to the 'login' action specifically.
    const gate = await enforceSecurityGate(req.headers);
    if (gate.blocked) return gate.response!;
    const clientIp = gate.clientIp;

    const body = await req.json().catch(() => ({}));
    const { action, email, password, token } = body;
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // A. Verify existing session token
    if (action === 'verify') {
      const user = parseAdminSessionToken(
        token || req.cookies.get(ADMIN_CONFIG.sessionCookieName)?.value || ''
      );
      if (user) {
        return NextResponse.json({ success: true, user });
      }
      return NextResponse.json({ success: false, error: 'Unauthorized or expired session' }, { status: 401 });
    }

    // B. Login with credentials & Brute-Force Rate Limiting (admin-configurable)
    if (action === 'login') {
      const loginGate = await enforceSecurityGate(req.headers, 'adminLogin');
      if (loginGate.blocked) {
        await securityService.logEvent({
          eventType: 'LOGIN_FAILED',
          actorEmail: (email || 'unknown').slice(0, 100),
          ipAddress: clientIp,
          userAgent,
          details: { reason: 'Rate limit exceeded on admin login gateway' },
        });
        return loginGate.response!;
      }

      const user = verifyAdminCredentials(email || '', password || '');
      if (!user) {
        await securityService.logEvent({
          eventType: 'LOGIN_FAILED',
          actorEmail: (email || 'unknown').slice(0, 100),
          ipAddress: clientIp,
          userAgent,
          details: { reason: 'Invalid email or passkey attempt' },
        });

        return NextResponse.json(
          { success: false, error: 'Invalid admin credentials provided.' },
          { status: 401 }
        );
      }

      // Log successful authentication event
      await securityService.logEvent({
        eventType: 'LOGIN_SUCCESS',
        actorEmail: user.email,
        ipAddress: clientIp,
        userAgent,
        details: { message: 'Authenticated successfully via Admin Gateway' },
      });

      const sessionToken = generateAdminSessionToken(user);
      const res = NextResponse.json({ success: true, user, token: sessionToken });

      res.cookies.set({
        name: ADMIN_CONFIG.sessionCookieName,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
      });

      return res;
    }

    // C. Logout
    if (action === 'logout') {
      const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
      res.cookies.delete(ADMIN_CONFIG.sessionCookieName);
      return res;
    }

    return NextResponse.json({ success: false, error: 'Unknown action requested' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(safeApiError(err, 'Authentication service error.'), { status: 500 });
  }
}
