/**
 * Client-side helpers for the daily usage-quota gate. Every tool page calls
 * checkUsageQuota() before starting a client-side PDF operation, and
 * trackUsageCompletion() after it finishes successfully — this is what feeds
 * the real (non-mock) job/usage data behind the admin dashboard.
 */

export type ToolAction = 'merge' | 'split' | 'organize' | 'rotate' | 'compress' | 'repair' | 'ocr';

export interface UsageQuotaResult {
  allowed: boolean;
  message?: string;
  dailyLimit?: number;
  remaining?: number;
}

export async function checkUsageQuota(action: ToolAction): Promise<UsageQuotaResult> {
  try {
    const res = await fetch('/api/usage/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok || !data.success || !data.quota) {
      // Fail open — an infra hiccup in the checker should never block the user
      return { allowed: true };
    }
    return data.quota as UsageQuotaResult;
  } catch {
    return { allowed: true };
  }
}

export interface UsageTrackParams {
  action: ToolAction;
  files: Array<{ name: string; size: number }>;
  durationMs: number;
  pageCount?: number;
}

/**
 * Fire-and-forget completion report. Never blocks or throws — this is
 * telemetry only, not part of the actual (fully client-side) PDF processing.
 */
export function trackUsageCompletion(params: UsageTrackParams): void {
  try {
    const payload = JSON.stringify({
      status: 'COMPLETED',
      files: params.files.map((f) => ({ name: f.name, size: f.size })),
      durationMs: Math.round(params.durationMs),
      pageCount: params.pageCount,
    });

    const url = `/api/pdf/${params.action}`;

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Best-effort telemetry only
  }
}
