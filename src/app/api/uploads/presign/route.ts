import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { filename, sizeBytes, mimeType } = body;

    if (!filename || mimeType !== 'application/pdf') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_METADATA',
            message: 'Only application/pdf files are accepted for processing.',
          },
        },
        { status: 400 }
      );
    }

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const storageKey = `uploads/ephemeral/${fileId}/${filename}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      success: true,
      data: {
        fileId,
        storageKey,
        uploadUrl: `https://storage.easypdf.internal/presigned-put/${fileId}?key=${storageKey}`,
        expiresAt,
        maxSizeBytes: 100 * 1024 * 1024,
      },
      error: null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PRESIGN_ERROR',
          message: error.message || 'Unable to issue presigned upload ticket.',
        },
      },
      { status: 500 }
    );
  }
}
