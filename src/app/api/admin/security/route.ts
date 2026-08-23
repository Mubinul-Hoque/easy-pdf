import { NextRequest, NextResponse } from 'next/server';
import { securityService } from '@/lib/security-service';
import { parseAdminSessionToken, ADMIN_CONFIG } from '@/lib/admin-auth';

const IP_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') || req.cookies.get(ADMIN_CONFIG.sessionCookieName)?.value;
    if (!parseAdminSessionToken(token || '')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await securityService.getAuditLogs(40);
    const bannedIps = await securityService.getBannedIPs();

    return NextResponse.json({ success: true, logs, bannedIps });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') || req.cookies.get(ADMIN_CONFIG.sessionCookieName)?.value;
    const admin = parseAdminSessionToken(token || '');
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, ipAddress, reason, banId } = body;

    if (action === 'ban') {
      const cleanIp = (ipAddress || '').trim();
      if (!cleanIp || !IP_REGEX.test(cleanIp)) {
        return NextResponse.json({ success: false, error: 'Invalid IPv4 or IPv6 address format' }, { status: 400 });
      }
      const cleanReason = (reason || 'Manual IP block by administrator').slice(0, 250);
      const banned = await securityService.banIP(cleanIp, cleanReason, admin.name || 'Mubinul Houqe');
      return NextResponse.json({ success: true, banned });
    }

    if (action === 'unban') {
      if (!banId || typeof banId !== 'string') {
        return NextResponse.json({ success: false, error: 'Missing or invalid ban ID' }, { status: 400 });
      }
      await securityService.unbanIP(banId);
      return NextResponse.json({ success: true, message: 'IP unbanned successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
