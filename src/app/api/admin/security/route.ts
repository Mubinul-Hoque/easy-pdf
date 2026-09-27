import { NextRequest, NextResponse } from 'next/server';
import { securityService } from '@/lib/security-service';
import { parseAdminSessionToken, ADMIN_CONFIG } from '@/lib/admin-auth';
import { safeApiError, extractBearerToken } from '@/lib/api-security';
import { getSecuritySettings, updateSecuritySettings } from '@/lib/security-settings';

// Strict IPv4 and abbreviated IPv6 validation
const IP_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers, req.cookies, ADMIN_CONFIG.sessionCookieName);
    if (!parseAdminSessionToken(token)) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const logs = await securityService.getAuditLogs(40);
    const bannedIps = await securityService.getBannedIPs();
    const securitySettings = await getSecuritySettings();
    return NextResponse.json({ success: true, logs, bannedIps, securitySettings });
  } catch (err) {
    return NextResponse.json(safeApiError(err, 'Failed to load security data.'), { status: 500 });
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
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'ban') {
      const cleanIp = (typeof body.ipAddress === 'string' ? body.ipAddress : '').trim().slice(0, 64);
      if (!cleanIp || !IP_REGEX.test(cleanIp)) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid IPv4 or IPv6 address format' } }, { status: 400 });
      }
      const cleanReason = (typeof body.reason === 'string' ? body.reason : 'Manual IP block by administrator')
        .replace(/[<>&"']/g, '') // strip XSS chars from reason
        .slice(0, 250);

      const banned = await securityService.banIP(cleanIp, cleanReason, admin.name);
      return NextResponse.json({ success: true, banned });
    }

    if (action === 'unban') {
      const banId = typeof body.banId === 'string' ? body.banId.slice(0, 64) : '';
      if (!banId) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing or invalid ban ID' } }, { status: 400 });
      }
      await securityService.unbanIP(banId, admin.name);
      return NextResponse.json({ success: true, message: 'IP unbanned successfully' });
    }

    if (action === 'updateSecuritySettings') {
      const updated = await updateSecuritySettings(body.settings || {});
      await securityService.logEvent({
        eventType: 'SECURITY_SETTINGS_UPDATED',
        actorEmail: admin.email,
        ipAddress: '127.0.0.1',
        details: { message: 'Rate limiting / IP ban enforcement configuration updated' },
      });
      return NextResponse.json({ success: true, securitySettings: updated });
    }

    return NextResponse.json({ success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action' } }, { status: 400 });
  } catch (err) {
    return NextResponse.json(safeApiError(err, 'Failed to process security action.'), { status: 500 });
  }
}
