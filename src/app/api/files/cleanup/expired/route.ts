import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { safeApiError } from '@/lib/api-security';

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
  } catch (err) {
    return NextResponse.json(safeApiError(err, 'Failed to run expired cleanup routine.', 'BACKUP_CLEANUP_ERROR'), { status: 500 });
  }
}
