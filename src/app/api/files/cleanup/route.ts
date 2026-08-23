import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { sanitizeStorageKey } from '@/lib/file-security';
import { safeApiError } from '@/lib/api-security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { jobId, fileIds = [], storageKeys = [] } = body;

    const safeJobId = typeof jobId === 'string' ? jobId.slice(0, 64) : '';
    const safeFileIds = Array.isArray(fileIds)
      ? fileIds.map((id: any) => String(id).slice(0, 64))
      : [];
    const safeStorageKeys = Array.isArray(storageKeys)
      ? storageKeys.map((k: any) => sanitizeStorageKey(String(k)))
      : [];

    if (!safeJobId && safeFileIds.length === 0 && safeStorageKeys.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No files specified for cleanup.',
      });
    }

    // Safely delete server files & results for the completed job within sandbox
    const result = await dbService.cleanupJobFiles(safeJobId, safeFileIds, safeStorageKeys);

    return NextResponse.json({
      success: true,
      message: 'Source and generated files successfully purged from server storage.',
      data: result,
    });
  } catch (err) {
    return NextResponse.json(safeApiError(err, 'Failed to complete server storage cleanup.', 'CLEANUP_ERROR'), { status: 500 });
  }
}
