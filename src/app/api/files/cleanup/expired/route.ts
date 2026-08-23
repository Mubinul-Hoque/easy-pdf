import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export async function GET(req: NextRequest) {
  return handleExpiredCleanup(req);
}

export async function POST(req: NextRequest) {
  return handleExpiredCleanup(req);
}

async function handleExpiredCleanup(req: NextRequest) {
  try {
    const result = await dbService.cleanupExpiredFiles();

    return NextResponse.json({
      success: true,
      message: 'Expired and abandoned storage files successfully cleaned up.',
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BACKUP_CLEANUP_ERROR',
          message: err.message || 'Failed to run backup expired cleanup routine.',
        },
      },
      { status: 500 }
    );
  }
}
