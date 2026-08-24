import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/user-auth';
import { safeApiError } from '@/lib/api-security';
import { dbService } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          user: null,
        },
        { status: 200 }
      );
    }

    // Fetch user's plan details
    const plans = await dbService.getPlans();
    const userPlan = plans.find((p) => p.id === user.planId) || plans[0];

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        ...user,
        plan: {
          id: userPlan.id,
          name: userPlan.name,
          slug: userPlan.slug,
          maxFileSizeMb: Math.round(userPlan.max_file_size_bytes / (1024 * 1024)),
          dailyOperationsLimit: userPlan.daily_operations_limit,
          ocrMonthlyPages: userPlan.ocr_monthly_pages,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(safeApiError(err, 'Failed to fetch current user session.'), {
      status: 500,
    });
  }
}
