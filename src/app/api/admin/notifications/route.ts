import { NextRequest, NextResponse } from 'next/server';
import { parseAdminSessionToken, ADMIN_CONFIG } from '@/lib/admin-auth';
import { safeApiError, extractBearerToken } from '@/lib/api-security';
import { getMaskedTwilioStatus, updateTwilioCredentials } from '@/lib/notification-settings';
import { securityService } from '@/lib/security-service';

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers, req.cookies, ADMIN_CONFIG.sessionCookieName);
    if (!parseAdminSessionToken(token)) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const twilio = await getMaskedTwilioStatus();
    return NextResponse.json({ success: true, twilio });
  } catch (err) {
    return NextResponse.json(safeApiError(err, 'Failed to load notification settings.'), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers, req.cookies, ADMIN_CONFIG.sessionCookieName);
    const admin = parseAdminSessionToken(token);
    if (!admin) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // Only accept fields the client actually sent — omitted fields leave the
    // stored secret untouched (the client never receives the real value back,
    // so it has no way to "round-trip" it in an update otherwise).
    const partial: { accountSid?: string; authToken?: string; phoneNumber?: string } = {};
    if (typeof body.accountSid === 'string') partial.accountSid = body.accountSid.slice(0, 128);
    if (typeof body.authToken === 'string') partial.authToken = body.authToken.slice(0, 128);
    if (typeof body.phoneNumber === 'string') partial.phoneNumber = body.phoneNumber.slice(0, 32);

    const twilio = await updateTwilioCredentials(partial);

    await securityService.logEvent({
      eventType: 'TOOL_MODIFIED',
      actorEmail: admin.email,
      ipAddress: '127.0.0.1',
      details: { message: 'Twilio SMS credentials updated via admin panel' },
    });

    return NextResponse.json({ success: true, twilio, message: 'Twilio settings saved.' });
  } catch (err) {
    return NextResponse.json(safeApiError(err, 'Failed to update notification settings.'), { status: 500 });
  }
}
