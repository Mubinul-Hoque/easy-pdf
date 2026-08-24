import { NextResponse } from 'next/server';
import { settingsService } from '@/lib/settings-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await settingsService.getSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to load site settings' },
      { status: 500 }
    );
  }
}
