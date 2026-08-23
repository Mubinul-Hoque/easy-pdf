import { NextResponse } from 'next/server';
import { dbService, DEFAULT_PLANS } from '@/lib/db';

export async function GET() {
  try {
    const plans = await dbService.getPlans();
    return NextResponse.json({
      success: true,
      data: plans,
      error: null,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      data: DEFAULT_PLANS,
      error: null,
      fallback: true,
    });
  }
}
