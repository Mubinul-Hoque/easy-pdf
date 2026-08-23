import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    const body = await req.json().catch(() => ({}));

    // Generate unique job ticket
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const supportedActions = [
      'merge',
      'split',
      'organize',
      'rotate',
      'compress',
      'repair',
      'ocr',
    ];

    if (!supportedActions.includes(action)) {
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

    // Persist to MySQL processing_jobs table
    try {
      await dbService.createJob({
        id: jobId,
        userId: body.userId || null,
        operationType: action,
        priority: body.priority || 5,
        inputFiles: body.files || [],
        parameters: body,
      });
    } catch (dbErr) {
      console.warn('MySQL Job Logging notice:', dbErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        action,
        status: 'QUEUED',
        queuePosition: 1,
        estimatedDurationMs: 1200,
        createdAt: new Date().toISOString(),
        payload: body,
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
