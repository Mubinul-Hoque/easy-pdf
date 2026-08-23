import { NextRequest, NextResponse } from 'next/server';
import { securityService } from '@/lib/security-service';
import { parseAdminSessionToken, ADMIN_CONFIG } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') || req.cookies.get(ADMIN_CONFIG.sessionCookieName)?.value;
    if (!parseAdminSessionToken(token || '')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await securityService.getAuditLogs(30);
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

    const body = await req.json();
    const { action, ipAddress, reason, banId } = body;

    if (action === 'ban') {
      if (!ipAddress) return NextResponse.json({ success: false, error: 'Missing IP address' }, { status: 400 });
      const banned = await securityService.banIP(ipAddress, reason || '', admin.name || 'Mubinul Houqe');
      return NextResponse.json({ success: true, banned });
    }

    if (action === 'unban') {
      if (!banId) return NextResponse.json({ success: false, error: 'Missing ban ID' }, { status: 400 });
      await securityService.unbanIP(banId);
      return NextResponse.json({ success: true, message: 'IP unbanned successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
