import { NextRequest, NextResponse } from 'next/server';
import { Plan, DEFAULT_PLANS, query } from '@/lib/db';
import { parseAdminSessionToken, ADMIN_CONFIG } from '@/lib/admin-auth';
import { safeApiError, extractBearerToken } from '@/lib/api-security';

let RUNTIME_PLANS: Plan[] = [...DEFAULT_PLANS];

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers, req.cookies, ADMIN_CONFIG.sessionCookieName);
    if (!parseAdminSessionToken(token)) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
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
  } catch (err) {
    return NextResponse.json(safeApiError(err, 'Failed to load plans.'), { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers, req.cookies, ADMIN_CONFIG.sessionCookieName);
    if (!parseAdminSessionToken(token)) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { planId, updates } = body;

    if (!planId || typeof planId !== 'string' || !updates || typeof updates !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing or invalid planId / updates' }, { status: 400 });
    }

    // Sanitize and clamp numeric limits
    const sanitizedUpdates: Partial<Plan> = {};
    if (updates.name && typeof updates.name === 'string') {
      sanitizedUpdates.name = updates.name.trim().slice(0, 100);
    }
    if (updates.description && typeof updates.description === 'string') {
      sanitizedUpdates.description = updates.description.trim().slice(0, 500);
    }
    if (updates.price_monthly !== undefined) {
      sanitizedUpdates.price_monthly = Math.max(0, Number(updates.price_monthly) || 0);
    }
    if (updates.price_yearly !== undefined) {
      sanitizedUpdates.price_yearly = Math.max(0, Number(updates.price_yearly) || 0);
    }
    if (updates.max_file_size_bytes !== undefined) {
      sanitizedUpdates.max_file_size_bytes = Math.max(1048576, Number(updates.max_file_size_bytes) || 26214400); // at least 1MB
    }
    if (updates.daily_operations_limit !== undefined) {
      sanitizedUpdates.daily_operations_limit = Math.max(1, Number(updates.daily_operations_limit) || 20);
    }
    if (updates.ocr_monthly_pages !== undefined) {
      sanitizedUpdates.ocr_monthly_pages = Math.max(0, Number(updates.ocr_monthly_pages) || 0);
    }
    if (updates.batch_file_limit !== undefined) {
      sanitizedUpdates.batch_file_limit = Math.max(1, Math.min(200, Number(updates.batch_file_limit) || 2));
    }
    if (updates.storage_retention_hours !== undefined) {
      sanitizedUpdates.storage_retention_hours = Math.max(1, Math.min(8760, Number(updates.storage_retention_hours) || 1));
    }
    if (updates.is_active !== undefined) {
      sanitizedUpdates.is_active = updates.is_active ? 1 : 0;
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
          sanitizedUpdates.name || null,
          sanitizedUpdates.description || null,
          sanitizedUpdates.price_monthly !== undefined ? sanitizedUpdates.price_monthly : null,
          sanitizedUpdates.price_yearly !== undefined ? sanitizedUpdates.price_yearly : null,
          sanitizedUpdates.max_file_size_bytes !== undefined ? sanitizedUpdates.max_file_size_bytes : null,
          sanitizedUpdates.daily_operations_limit !== undefined ? sanitizedUpdates.daily_operations_limit : null,
          sanitizedUpdates.ocr_monthly_pages !== undefined ? sanitizedUpdates.ocr_monthly_pages : null,
          sanitizedUpdates.batch_file_limit !== undefined ? sanitizedUpdates.batch_file_limit : null,
          sanitizedUpdates.storage_retention_hours !== undefined ? sanitizedUpdates.storage_retention_hours : null,
          sanitizedUpdates.is_active !== undefined ? (sanitizedUpdates.is_active ? 1 : 0) : null,
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
        ...sanitizedUpdates,
      };
    }

    return NextResponse.json({ success: true, plan: RUNTIME_PLANS[idx] || sanitizedUpdates });
  } catch (err) {
    return NextResponse.json(safeApiError(err, 'Failed to update plan.'), { status: 500 });
  }
}
