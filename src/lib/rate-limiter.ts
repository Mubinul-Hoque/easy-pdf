interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipBuckets = new Map<string, RateLimitRecord>();

// Cleanup stale buckets periodically
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleRecords(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of ipBuckets.entries()) {
    if (now > record.resetAt) {
      ipBuckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * In-memory sliding window rate limiter
 * @param key Unique identifier (e.g., `login:${clientIp}` or `api:${clientIp}`)
 * @param maxRequests Maximum allowed requests in window
 * @param windowSeconds Window duration in seconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 60,
  windowSeconds: number = 60
): RateLimitResult {
  cleanupStaleRecords();

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = ipBuckets.get(key);

  if (!existing || now > existing.resetAt) {
    ipBuckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetSeconds: windowSeconds,
    };
  }

  if (existing.count >= maxRequests) {
    const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, maxRequests - existing.count);
  const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  return {
    allowed: true,
    remaining,
    resetSeconds,
  };
}

/**
 * Extract client IP from request headers (x-forwarded-for, x-real-ip)
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}
