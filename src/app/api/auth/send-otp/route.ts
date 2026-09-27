import { NextRequest, NextResponse } from 'next/server';
import { otpService, normalizeIdentifier, isValidIdentifier } from '@/lib/otp-service';
import { dbService } from '@/lib/db';
import { safeApiError } from '@/lib/api-security';
import { enforceSecurityGate } from '@/lib/security-gate';

export async function POST(req: NextRequest) {
  try {
    const gate = await enforceSecurityGate(req.headers, 'otpSend');
    if (gate.blocked) return gate.response!;

    const body = await req.json().catch(() => ({}));
    const { identifier: rawIdentifier, type = 'register' } = body;

    if (!rawIdentifier || typeof rawIdentifier !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Please provide a valid email address or mobile phone number.',
          },
        },
        { status: 400 }
      );
    }

    const { identifier, channel } = normalizeIdentifier(rawIdentifier);

    if (!isValidIdentifier(identifier)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: `Please enter a valid ${channel === 'email' ? 'email address' : 'mobile phone number (e.g. +1234567890 or 017xxxxxxxx)'}.`,
          },
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    let existingUser = null;
    try {
      existingUser = await dbService.getUserByIdentifier(identifier);
    } catch {
      // Fallback
    }

    if (type === 'register' && existingUser) {
      // If user exists and is already verified, let them know they can sign in
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: `An account with this ${channel === 'email' ? 'email' : 'phone number'} already exists. Please sign in instead.`,
          },
          existingUser: true,
        },
        { status: 409 }
      );
    }

    if (type === 'login' && !existingUser) {
      // For seamless passwordless onboarding, we can either inform or auto-switch to registration
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: `No account found with this ${channel === 'email' ? 'email' : 'phone number'}. Please register first.`,
          },
          needsRegistration: true,
        },
        { status: 404 }
      );
    }

    const result = await otpService.sendOtp(identifier, type);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'COOLDOWN_ACTIVE',
            message: result.message,
            cooldownRemainingSeconds: result.cooldownRemainingSeconds,
          },
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      identifier: result.identifier,
      channel: result.channel,
      cooldownSeconds: result.cooldownSeconds,
      expiresInSeconds: result.expiresInSeconds,
      message: result.message,
      demoOtp: result.demoOtp,
    });
  } catch (err: any) {
    return NextResponse.json(safeApiError(err, 'Failed to send verification code.'), {
      status: 500,
    });
  }
}
