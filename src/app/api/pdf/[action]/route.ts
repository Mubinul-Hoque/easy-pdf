import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { enforceSecurityGate } from '@/lib/security-gate';
import { formatUserFriendlyError, logJobFailure } from '@/lib/error-handler';
import { getAuthenticatedUser } from '@/lib/user-auth';
import { settingsService } from '@/lib/settings-service';
import { RETENTION_POLICY_HOURS } from '@/lib/settings-types';

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
    // Admin-configurable IP ban + rate limit (default 60 req/min per IP)
    const gate = await enforceSecurityGate(req.headers, 'apiActions');
    if (gate.blocked) return gate.response!;

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

    // The caller's own userId claim is never trusted — it's derived only from
    // the authenticated session, otherwise this endpoint would let anyone
    // attribute jobs (and burn through daily quotas) against another account.
    const authUser = await getAuthenticatedUser(req).catch(() => null);
    const safeUserId = authUser?.id || null;

    const requestedStatus = body.status === 'COMPLETED' || body.status === 'FAILED' ? body.status : 'QUEUED';
    const totalBytes = sanitizedFiles.reduce((sum: number, f: any) => sum + (f.size || 0), 0);
    const durationMs = Number.isFinite(Number(body.durationMs)) ? Math.max(0, Math.round(Number(body.durationMs))) : 0;
    const ocrPages = cleanAction === 'ocr' && Number.isFinite(Number(body.pageCount)) ? Math.max(0, Math.round(Number(body.pageCount))) : 0;

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

      if (requestedStatus === 'COMPLETED') {
        await dbService.updateJobStatus(jobId, 'COMPLETED');

        // Look up the user's plan retention window; guests get the admin-configured default
        let retentionHours = RETENTION_POLICY_HOURS['1_hour'];
        if (safeUserId) {
          try {
            const plans = await dbService.getPlans();
            const dbUser = await dbService.getUserById(safeUserId);
            const plan = plans.find((p) => p.id === dbUser?.plan_id);
            if (plan) retentionHours = plan.storage_retention_hours;
          } catch {
            // Keep default retention
          }
        } else {
          try {
            const siteSettings = await settingsService.getSettings();
            retentionHours = RETENTION_POLICY_HOURS[siteSettings.defaultRetentionPolicy];
          } catch {
            // Keep default retention
          }
        }

        await dbService.saveResult({
          id: `res_${jobId}`,
          jobId,
          storageKey: `ephemeral/${jobId}`,
          fileName: sanitizedFiles[0]?.name || `${cleanAction}_result.pdf`,
          fileSize: totalBytes,
          durationMs,
          retentionHours,
        });

        if (safeUserId) {
          await dbService.incrementDailyUsage(safeUserId, 1, ocrPages, totalBytes);
        }
      } else if (requestedStatus === 'FAILED') {
        await dbService.updateJobStatus(jobId, 'FAILED');
      }
    } catch (dbErr) {
      console.warn('MySQL Job Logging notice:', dbErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        action: cleanAction,
        status: requestedStatus,
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
    const standardized = formatUserFriendlyError(error);
    
    // Log failure diagnostics for administrators
    const fallbackJobId = `fail_${Date.now()}`;
    await logJobFailure({
      jobId: fallbackJobId,
      errorCode: standardized.code,
      errorMessage: standardized.userMessage,
      stackTrace: {
        raw: error?.message,
        stack: error?.stack?.slice(0, 1000),
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: standardized.code,
          message: standardized.userMessage,
        },
      },
      { status: 500 }
    );
  }
}
