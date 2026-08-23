import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/lib/admin-service';
import { parseAdminSessionToken, ADMIN_CONFIG } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') || req.cookies.get(ADMIN_CONFIG.sessionCookieName)?.value;
    if (!parseAdminSessionToken(token || '')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
    const token = req.headers.get('authorization')?.replace('Bearer ', '') || req.cookies.get(ADMIN_CONFIG.sessionCookieName)?.value;
    if (!parseAdminSessionToken(token || '')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
