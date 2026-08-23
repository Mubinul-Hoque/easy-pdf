import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { jobId, fileIds = [], storageKeys = [] } = body;

    if (!jobId && fileIds.length === 0 && storageKeys.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No files specified for cleanup.',
      });
    }

    // Safely delete server files & results for the completed job
    const result = await dbService.cleanupJobFiles(jobId, fileIds, storageKeys);

    return NextResponse.json({
      success: true,
      message: 'Source and generated files successfully purged from server storage.',
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CLEANUP_ERROR',
          message: err.message || 'Failed to complete server storage cleanup.',
        },
      },
      { status: 500 }
    );
  }
}
