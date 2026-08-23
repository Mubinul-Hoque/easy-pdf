import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

const SUPPORTED_ACTIONS = new Set([
  'merge',
  'split',
  'organize',
  'rotate',
  'compress',
  'repair',
  'ocr',
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const clientIp = getClientIp(req.headers);
    // Rate limit API actions to 60 requests per minute per IP
    const rateCheck = checkRateLimit(`api_action:${clientIp}`, 60, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `API rate limit exceeded. Please retry in ${rateCheck.resetSeconds} seconds.`,
          },
        },
        { status: 429 }
      );
    }

    const { action } = await params;
    const cleanAction = (action || '').toLowerCase().trim();

    if (!SUPPORTED_ACTIONS.has(cleanAction)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNSUPPORTED_OPERATION',
            message: `The operation '${action}' is not supported by EasyPDF API Gateway.`,
          },
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Generate unique job ticket
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Validate and sanitize files array
    const rawFiles = Array.isArray(body.files) ? body.files : [];
    const sanitizedFiles = rawFiles.slice(0, 100).map((f: any) => ({
      name: typeof f?.name === 'string' ? f.name.slice(0, 255) : 'document.pdf',
      size: typeof f?.size === 'number' ? Math.max(0, f.size) : 0,
    }));

    const safePriority = Math.max(1, Math.min(10, Number(body.priority) || 5));
    const safeUserId = typeof body.userId === 'string' ? body.userId.slice(0, 64) : null;

    // Persist to MySQL processing_jobs table
    try {
      await dbService.createJob({
        id: jobId,
        userId: safeUserId,
        operationType: cleanAction,
        priority: safePriority,
        inputFiles: sanitizedFiles,
        parameters: {
          level: body.level || undefined,
          mode: body.mode || undefined,
          ranges: body.ranges || undefined,
        },
      });
    } catch (dbErr) {
      console.warn('MySQL Job Logging notice:', dbErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        action: cleanAction,
        status: 'QUEUED',
        queuePosition: 1,
        estimatedDurationMs: 1200,
        createdAt: new Date().toISOString(),
      },
      error: null,
      meta: {
        apiVersion: 'v1',
        requestId: `req_${Math.random().toString(36).substring(2, 9)}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to dispatch PDF processing job.',
        },
      },
      { status: 500 }
    );
  }
}
