import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/lib/admin-service';
import { parseAdminSessionToken, ADMIN_CONFIG } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') || req.cookies.get(ADMIN_CONFIG.sessionCookieName)?.value;
    if (!parseAdminSessionToken(token || '')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.slice(0, 100) || undefined;
    const plan = searchParams.get('plan') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    const result = await adminService.getUsers(search, plan, page, limit);
    return NextResponse.json({
      success: true,
      users: result.users,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
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
    const { userId, updates } = body;

    if (!userId || typeof userId !== 'string' || !updates || typeof updates !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid userId or updates format' }, { status: 400 });
    }

    // Input whitelist validation
    const allowedUpdates: any = {};
    if (updates.plan && ['free', 'pro', 'business'].includes(updates.plan)) {
      allowedUpdates.plan = updates.plan;
    }
    if (updates.status && ['active', 'suspended', 'pending'].includes(updates.status)) {
      allowedUpdates.status = updates.status;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid update fields provided' }, { status: 400 });
    }

    const updated = await adminService.updateUser(userId, allowedUpdates);
    return NextResponse.json({ success: true, user: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
