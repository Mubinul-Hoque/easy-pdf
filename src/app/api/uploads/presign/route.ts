import { NextRequest, NextResponse } from 'next/server';
import { generateSignedFileToken, sanitizeStorageKey } from '@/lib/file-security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { filename, sizeBytes, mimeType, userId } = body;

    // Validate MIME type & file extension
    const cleanFilename = sanitizeStorageKey(filename || 'document.pdf');
    if (!cleanFilename.toLowerCase().endsWith('.pdf') || (mimeType && mimeType !== 'application/pdf')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_METADATA',
            message: 'Only authentic PDF documents (.pdf) are permitted.',
          },
        },
        { status: 400 }
      );
    }

    // Max file size enforcement (100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (sizeBytes && (typeof sizeBytes !== 'number' || sizeBytes > MAX_SIZE || sizeBytes <= 0)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_SIZE_EXCEEDED',
            message: 'File size exceeds maximum allowed threshold (100MB).',
          },
        },
        { status: 400 }
      );
    }

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const storageKey = `uploads/ephemeral/${fileId}/${cleanFilename}`;
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes short-lived TTL

    // Generate cryptographic HMAC-SHA256 authorization token
    const accessToken = generateSignedFileToken({
      fileId,
      userId: typeof userId === 'string' ? userId : null,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        fileId,
        storageKey,
        accessToken,
        uploadUrl: `https://storage.easypdf.internal/presigned-put/${fileId}?key=${encodeURIComponent(storageKey)}&token=${accessToken}`,
        expiresAt: new Date(expiresAt).toISOString(),
        maxSizeBytes: MAX_SIZE,
      },
      error: null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PRESIGN_ERROR',
          message: error.message || 'Unable to issue secure upload ticket.',
        },
      },
      { status: 500 }
    );
  }
}
