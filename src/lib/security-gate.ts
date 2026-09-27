import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from './rate-limiter';
import { getSecuritySettings, RateLimitCategory } from './security-settings';
import { securityService } from './security-service';

export interface SecurityGateResult {
  blocked: boolean;
  response?: NextResponse;
  clientIp: string;
}

/**
 * Shared entry-point guard for public-facing API routes: enforces the
 * admin-configurable IP ban list and, optionally, an admin-configurable
 * rate limit category. Call this first thing in a route handler and
 * return `result.response` immediately if `result.blocked` is true.
 */
export async function enforceSecurityGate(
  headers: Headers,
  category?: RateLimitCategory
): Promise<SecurityGateResult> {
  const clientIp = getClientIp(headers);
  const settings = await getSecuritySettings();

  if (settings.ipBanEnforcementEnabled) {
    const banned = await securityService.isIpBanned(clientIp);
    if (banned) {
      return {
        blocked: true,
        clientIp,
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: 'IP_BANNED',
              message: 'Access denied. This IP address has been blocked by the administrator.',
            },
          },
          { status: 403 }
        ),
      };
    }
  }

  if (category) {
    const rule = settings.rateLimits[category];
    if (rule?.enabled) {
      const rateCheck = checkRateLimit(`${category}:${clientIp}`, rule.maxRequests, rule.windowSeconds);
      if (!rateCheck.allowed) {
        return {
          blocked: true,
          clientIp,
          response: NextResponse.json(
            {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Too many requests. Please try again in ${rateCheck.resetSeconds} seconds.`,
              },
            },
            { status: 429 }
          ),
        };
      }
    }
  }

  return { blocked: false, clientIp };
}
