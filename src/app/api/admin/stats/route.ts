import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/lib/admin-service';
import { parseAdminSessionToken, ADMIN_CONFIG } from '@/lib/admin-auth';
import { safeApiError, extractBearerToken } from '@/lib/api-security';

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers, req.cookies, ADMIN_CONFIG.sessionCookieName);
    if (!parseAdminSessionToken(token)) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const stats = await adminService.getDashboardStats();
    const { jobs: recentJobs } = await adminService.getRecentJobs(1, 15);
    const banner = await adminService.getMaintenanceBanner();

    return NextResponse.json({ success: true, stats, recentJobs, banner });
  } catch (err) {
    return NextResponse.json(safeApiError(err, 'Failed to load dashboard statistics.'), { status: 500 });
  }
}
