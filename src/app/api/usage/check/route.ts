import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/user-auth';
import { dbService } from '@/lib/db';
import { enforceSecurityGate } from '@/lib/security-gate';

const SUPPORTED_ACTIONS = new Set(['merge', 'split', 'organize', 'rotate', 'compress', 'repair', 'ocr']);

/**
 * Pre-flight quota check called by tool pages before starting a client-side
 * PDF operation. Anonymous visitors are always allowed (guest usage isn't
 * tracked per-account); authenticated users are checked against their plan's
 * daily_operations_limit using today's row in usage_limits.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await enforceSecurityGate(req.headers, 'general');
    if (gate.blocked) return gate.response!;

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action.toLowerCase().trim() : '';
    if (!SUPPORTED_ACTIONS.has(action)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ACTION', message: 'Unknown tool action.' } },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      // Guests aren't tracked against a plan quota — only the admin's global
      // per-tool file-size/batch limits apply to them.
      return NextResponse.json({ success: true, quota: { allowed: true } });
    }

    const plans = await dbService.getPlans();
    const plan = plans.find((p) => p.id === user.planId) || plans[0];
    const dailyLimit = plan.daily_operations_limit;

    const usage = await dbService.getUsageToday(user.id);
    const used = usage.operations_count;

    if (used >= dailyLimit) {
      return NextResponse.json({
        success: true,
        quota: {
          allowed: false,
          dailyLimit,
          remaining: 0,
          message: `You've reached your ${plan.name} plan's daily limit of ${dailyLimit} operations. Upgrade your plan or try again after midnight.`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      quota: { allowed: true, dailyLimit, remaining: dailyLimit - used },
    });
  } catch (err) {
    // Fail open: an infra hiccup in the quota checker should never block a user's workflow
    return NextResponse.json({ success: true, quota: { allowed: true } });
  }
}
