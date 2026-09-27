import { NextRequest, NextResponse } from 'next/server';
import { otpService, normalizeIdentifier } from '@/lib/otp-service';
import { dbService } from '@/lib/db';
import {
  generateUserSessionToken,
  USER_AUTH_CONFIG,
  AuthUser,
} from '@/lib/user-auth';
import { safeApiError } from '@/lib/api-security';
import { enforceSecurityGate } from '@/lib/security-gate';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const gate = await enforceSecurityGate(req.headers, 'otpVerify');
    if (gate.blocked) return gate.response!;

    const body = await req.json().catch(() => ({}));
    const {
      identifier: rawIdentifier,
      otp,
      type = 'register',
      fullName,
    } = body;

    if (!rawIdentifier || !otp) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Please provide both the identifier (email/phone) and the 4-digit code.',
          },
        },
        { status: 400 }
      );
    }

    const { identifier, channel } = normalizeIdentifier(rawIdentifier);

    // 1. Verify OTP code
    const verification = await otpService.verifyOtp(identifier, otp, type);
    if (!verification.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_OTP',
            message: verification.message,
            remainingAttempts: verification.remainingAttempts,
          },
        },
        { status: 400 }
      );
    }

    // 2. User resolution / creation
    let userRecord = await dbService.getUserByIdentifier(identifier);

    if (!userRecord) {
      // New user registration
      const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const defaultName =
        (fullName || '').trim() ||
        (channel === 'email'
          ? identifier.split('@')[0]
          : `User ${identifier.slice(-4)}`);

      try {
        userRecord = await dbService.createUser({
          id: userId,
          email: channel === 'email' ? identifier : null,
          phone: channel === 'phone' ? identifier : null,
          fullName: defaultName,
          role: 'USER',
          tier: 'FREE',
          planId: 'plan_free_001',
          emailVerified: channel === 'email',
          phoneVerified: channel === 'phone',
        });
      } catch (createErr: any) {
        // Fallback user object if DB is in mock/offline mode
        userRecord = {
          id: userId,
          email: channel === 'email' ? identifier : null,
          phone: channel === 'phone' ? identifier : null,
          full_name: defaultName,
          role: 'USER',
          tier: 'FREE',
          plan_id: 'plan_free_001',
          status: 'active',
          created_at: new Date().toISOString(),
        };
      }
    }

    const authUser: AuthUser = {
      id: userRecord.id,
      email: userRecord.email,
      phone: userRecord.phone,
      fullName: userRecord.full_name || userRecord.fullName || 'User',
      role: userRecord.role || 'USER',
      tier: userRecord.tier || 'FREE',
      planId: userRecord.plan_id || userRecord.planId || 'plan_free_001',
      status: userRecord.status || 'active',
      createdAt: userRecord.created_at || userRecord.createdAt,
    };

    // 3. Issue Session Token
    const sessionToken = generateUserSessionToken(authUser);

    // 4. Create Response and set Secure HTTP-Only Cookie
    const response = NextResponse.json({
      success: true,
      message:
        type === 'register'
          ? 'Account successfully registered and verified!'
          : 'Successfully signed in!',
      user: authUser,
      token: sessionToken,
    });

    const cookieMaxAge = Math.floor(USER_AUTH_CONFIG.sessionTtlMs / 1000);
    response.cookies.set({
      name: USER_AUTH_CONFIG.sessionCookieName,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: cookieMaxAge,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(safeApiError(err, 'Verification failed. Please try again.'), {
      status: 500,
    });
  }
}
