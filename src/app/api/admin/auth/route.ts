import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminCredentials,
  generateAdminSessionToken,
  parseAdminSessionToken,
  ADMIN_CONFIG,
} from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, token } = body;

    // A. Verify existing session token
    if (action === 'verify') {
      const user = parseAdminSessionToken(token || req.cookies.get(ADMIN_CONFIG.sessionCookieName)?.value || '');
      if (user) {
        return NextResponse.json({ success: true, user });
      }
      return NextResponse.json({ success: false, error: 'Unauthorized or expired session' }, { status: 401 });
    }

    // B. Login with credentials
    if (action === 'login') {
      const user = verifyAdminCredentials(email || '', password || '');
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Invalid admin email or password' },
          { status: 401 }
        );
      }

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

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
