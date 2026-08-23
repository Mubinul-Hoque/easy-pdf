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

    const configs = await adminService.getToolConfigs();
    const banner = await adminService.getMaintenanceBanner();

    return NextResponse.json({ success: true, configs, banner });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token2 = extractBearerToken(req.headers, req.cookies, ADMIN_CONFIG.sessionCookieName);
    if (!parseAdminSessionToken(token2)) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const body = await req.json();
    const { toolId, updates, bannerText } = body;

    if (bannerText !== undefined) {
      await adminService.setMaintenanceBanner(bannerText);
    }

    if (toolId && updates) {
      await adminService.updateToolConfig(toolId, updates);
    }

    const configs = await adminService.getToolConfigs();
    const banner = await adminService.getMaintenanceBanner();

    return NextResponse.json({ success: true, configs, banner });
  } catch (err) {
    return NextResponse.json(safeApiError(err, 'Failed to load tool configurations.'), { status: 500 });
  }
}
