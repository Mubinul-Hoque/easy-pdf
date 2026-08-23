import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminCredentials,
  generateAdminSessionToken,
  parseAdminSessionToken,
  ADMIN_CONFIG,
} from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { securityService } from '@/lib/security-service';
import { safeApiError } from '@/lib/api-security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, email, password, token } = body;
    const clientIp = getClientIp(req.headers);
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

    // B. Login with credentials & Brute-Force Rate Limiting
    if (action === 'login') {
      // Limit to 5 login attempts per 5 minutes per IP
      const rateCheck = checkRateLimit(`login:${clientIp}`, 5, 300);
      if (!rateCheck.allowed) {
        await securityService.logEvent({
          eventType: 'LOGIN_FAILED',
          actorEmail: (email || 'unknown').slice(0, 100),
          ipAddress: clientIp,
          userAgent,
          details: { reason: 'Rate limit exceeded on admin login gateway', resetInSeconds: rateCheck.resetSeconds },
        });

        return NextResponse.json(
          {
            success: false,
            error: `Too many failed login attempts. Please try again in ${rateCheck.resetSeconds} seconds.`,
          },
          { status: 429 }
        );
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
