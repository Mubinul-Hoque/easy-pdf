import { NextResponse } from 'next/server';
import { adminService } from '@/lib/admin-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const toolId = searchParams.get('id');

    const configs = await adminService.getToolConfigs();
    const banner = await adminService.getMaintenanceBanner();

    if (toolId) {
      const config = configs.find((c) => c.id === toolId);
      if (!config) {
        return NextResponse.json(
          { success: false, error: 'Tool configuration not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        config,
        banner,
      });
    }

    return NextResponse.json({
      success: true,
      configs,
      banner,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to load tool configurations' },
      { status: 500 }
    );
  }
}
