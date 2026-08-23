import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/lib/admin-service';
import { parseAdminSessionToken, ADMIN_CONFIG } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    const cookieToken = req.cookies.get(ADMIN_CONFIG.sessionCookieName)?.value;
    const token = authHeader || cookieToken;

    const admin = parseAdminSessionToken(token || '');
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }

    const stats = await adminService.getDashboardStats();
    const recentJobs = await adminService.getRecentJobs(15);
    const banner = await adminService.getMaintenanceBanner();

    return NextResponse.json({
      success: true,
      stats,
      recentJobs,
      banner,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
