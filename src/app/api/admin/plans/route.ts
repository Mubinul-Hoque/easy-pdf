import { NextRequest, NextResponse } from 'next/server';
import { dbService, Plan, DEFAULT_PLANS, query } from '@/lib/db';
import { parseAdminSessionToken, ADMIN_CONFIG } from '@/lib/admin-auth';

let RUNTIME_PLANS: Plan[] = [...DEFAULT_PLANS];

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') || req.cookies.get(ADMIN_CONFIG.sessionCookieName)?.value;
    if (!parseAdminSessionToken(token || '')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const plans = await query<Plan>(`SELECT * FROM plans ORDER BY price_monthly ASC`);
      if (plans && plans.length > 0) {
        return NextResponse.json({ success: true, plans });
      }
    } catch {
      // Fallback
    }

    return NextResponse.json({ success: true, plans: RUNTIME_PLANS });
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
    const { planId, updates } = body;

    if (!planId || !updates) {
      return NextResponse.json({ success: false, error: 'Missing planId or updates' }, { status: 400 });
    }

    // Update in MySQL
    try {
      await query(
        `UPDATE plans SET 
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         price_monthly = COALESCE(?, price_monthly),
         price_yearly = COALESCE(?, price_yearly),
         max_file_size_bytes = COALESCE(?, max_file_size_bytes),
         daily_operations_limit = COALESCE(?, daily_operations_limit),
         ocr_monthly_pages = COALESCE(?, ocr_monthly_pages),
         batch_file_limit = COALESCE(?, batch_file_limit),
         storage_retention_hours = COALESCE(?, storage_retention_hours),
         is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [
          updates.name || null,
          updates.description || null,
          updates.price_monthly !== undefined ? updates.price_monthly : null,
          updates.price_yearly !== undefined ? updates.price_yearly : null,
          updates.max_file_size_bytes !== undefined ? updates.max_file_size_bytes : null,
          updates.daily_operations_limit !== undefined ? updates.daily_operations_limit : null,
          updates.ocr_monthly_pages !== undefined ? updates.ocr_monthly_pages : null,
          updates.batch_file_limit !== undefined ? updates.batch_file_limit : null,
          updates.storage_retention_hours !== undefined ? updates.storage_retention_hours : null,
          updates.is_active !== undefined ? (updates.is_active ? 1 : 0) : null,
          planId,
        ]
      );
    } catch {
      // Fallback
    }

    // Update runtime memory
    const idx = RUNTIME_PLANS.findIndex((p) => p.id === planId);
    if (idx !== -1) {
      RUNTIME_PLANS[idx] = {
        ...RUNTIME_PLANS[idx],
        ...updates,
      };
    }

    return NextResponse.json({ success: true, plan: RUNTIME_PLANS[idx] || updates });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
