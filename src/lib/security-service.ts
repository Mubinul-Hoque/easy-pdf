import { query, cachedQuery, invalidateQueryCache } from './db';

export interface SecurityAuditLog {
  id: string;
  eventType:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'STORAGE_PURGED'
    | 'PLAN_MODIFIED'
    | 'USER_SUSPENDED'
    | 'TOOL_MODIFIED'
    | 'IP_BANNED'
    | 'IP_UNBANNED'
    | 'SECURITY_SETTINGS_UPDATED';
  actorEmail: string;
  ipAddress: string;
  userAgent?: string;
  details?: any;
  createdAt: string;
}

export interface BannedIP {
  id: string;
  ipAddress: string;
  reason: string;
  bannedBy: string;
  createdAt: string;
}

// In-memory runtime fallback records — kept on globalThis (like the OTP store,
// settings cache, and MySQL pool elsewhere in this codebase) so state survives
// Next.js dev-mode module reloads across route handlers. Arrays are mutated
// in place (push/unshift/splice), never reassigned, so the globalThis
// reference stays valid.
declare global {
  var __easypdf_security_audit_logs: SecurityAuditLog[] | undefined;
  var __easypdf_banned_ips: BannedIP[] | undefined;
}

const DEFAULT_AUDIT_LOGS: SecurityAuditLog[] = [
  {
    id: 'log_001',
    eventType: 'LOGIN_SUCCESS',
    actorEmail: 'mubinulhq@gmail.com',
    ipAddress: '127.0.0.1',
    userAgent: 'Chrome 134 / Windows 11',
    details: { message: 'Authenticated via Admin Gateway' },
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'log_002',
    eventType: 'STORAGE_PURGED',
    actorEmail: 'mubinulhq@gmail.com',
    ipAddress: '127.0.0.1',
    details: { purgedBytes: 184000000, message: 'Manual force purge executed' },
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 'log_003',
    eventType: 'LOGIN_FAILED',
    actorEmail: 'unknown_bot@crawler.xyz',
    ipAddress: '194.26.29.114',
    details: { reason: 'Invalid passkey attempt' },
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'log_004',
    eventType: 'USER_SUSPENDED',
    actorEmail: 'mubinulhq@gmail.com',
    ipAddress: '127.0.0.1',
    details: { targetUser: 'suspicious_traffic_44@tempmail.co' },
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
];

const DEFAULT_BANNED_IPS: BannedIP[] = [
  {
    id: 'ban_001',
    ipAddress: '194.26.29.114',
    reason: 'Automated brute-force crawl attempt',
    bannedBy: 'Mubinul Houqe',
    createdAt: '2026-08-22T14:10:00Z',
  },
  {
    id: 'ban_002',
    ipAddress: '45.154.255.89',
    reason: 'Rate limit abuse / scraper bot',
    bannedBy: 'Mubinul Houqe',
    createdAt: '2026-08-20T09:25:00Z',
  },
];

const RUNTIME_AUDIT_LOGS: SecurityAuditLog[] =
  globalThis.__easypdf_security_audit_logs || DEFAULT_AUDIT_LOGS;
const RUNTIME_BANNED_IPS: BannedIP[] = globalThis.__easypdf_banned_ips || DEFAULT_BANNED_IPS;

globalThis.__easypdf_security_audit_logs = RUNTIME_AUDIT_LOGS;
globalThis.__easypdf_banned_ips = RUNTIME_BANNED_IPS;

export const securityService = {
  async getAuditLogs(limit: number = 30): Promise<SecurityAuditLog[]> {
    try {
      const rows = await query<any>(
        `SELECT id, event_type as eventType, actor_email as actorEmail, ip_address as ipAddress, user_agent as userAgent, details, created_at as createdAt 
         FROM security_audit_logs ORDER BY created_at DESC LIMIT ?`,
        [limit]
      );
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          ...r,
          details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
        }));
      }
    } catch {
      // Fallback to runtime
    }
    return RUNTIME_AUDIT_LOGS;
  },

  async logEvent(event: Omit<SecurityAuditLog, 'id' | 'createdAt'>) {
    const id = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newLog: SecurityAuditLog = {
      ...event,
      id,
      createdAt: new Date().toISOString(),
    };

    RUNTIME_AUDIT_LOGS.unshift(newLog);
    if (RUNTIME_AUDIT_LOGS.length > 100) RUNTIME_AUDIT_LOGS.pop();

    try {
      await query(
        `INSERT INTO security_audit_logs (id, event_type, actor_email, ip_address, user_agent, details)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          event.eventType,
          event.actorEmail,
          event.ipAddress,
          event.userAgent || null,
          JSON.stringify(event.details || {}),
        ]
      );
    } catch {
      // Graceful fallback
    }

    return newLog;
  },

  /**
   * Fast membership check used on every gated request. Backed by a short-lived
   * cache (see cachedQuery) so enforcing bans doesn't add a DB round-trip per request.
   */
  async isIpBanned(ipAddress: string): Promise<boolean> {
    if (!ipAddress) return false;
    try {
      const rows = await cachedQuery<{ ip_address: string }>(
        `SELECT ip_address FROM banned_ips`,
        [],
        15 // 15s cache — banning takes effect within seconds, not on every request
      );
      if (rows) {
        return rows.some((r) => r.ip_address === ipAddress);
      }
    } catch {
      // Fallback to in-memory list
    }
    return RUNTIME_BANNED_IPS.some((b) => b.ipAddress === ipAddress);
  },

  async getBannedIPs(): Promise<BannedIP[]> {
    try {
      const rows = await query<any>(
        `SELECT id, ip_address as ipAddress, reason, banned_by as bannedBy, created_at as createdAt FROM banned_ips ORDER BY created_at DESC`
      );
      if (rows && rows.length > 0) return rows;
    } catch {
      // Fallback
    }
    return RUNTIME_BANNED_IPS;
  },

  async banIP(ipAddress: string, reason: string, bannedBy: string = 'Mubinul Houqe'): Promise<BannedIP> {
    const id = `ban_${Date.now()}`;
    const entry: BannedIP = {
      id,
      ipAddress: ipAddress.trim(),
      reason: reason.trim() || 'Manual IP block by administrator',
      bannedBy,
      createdAt: new Date().toISOString(),
    };

    RUNTIME_BANNED_IPS.unshift(entry);

    try {
      await query(
        `INSERT INTO banned_ips (id, ip_address, reason, banned_by) VALUES (?, ?, ?, ?)`,
        [id, entry.ipAddress, entry.reason, bannedBy]
      );
    } catch {
      // Fallback
    }
    invalidateQueryCache('banned_ips');

    await this.logEvent({
      eventType: 'IP_BANNED',
      actorEmail: bannedBy,
      ipAddress: '127.0.0.1',
      details: { bannedIp: entry.ipAddress, reason: entry.reason },
    });

    return entry;
  },

  async unbanIP(id: string, unbannedBy: string = 'System Admin'): Promise<boolean> {
    const existing = RUNTIME_BANNED_IPS.find((b) => b.id === id);
    // Mutate in place (not a reassignment) so the globalThis reference stays valid.
    const idx = RUNTIME_BANNED_IPS.findIndex((b) => b.id === id);
    if (idx !== -1) RUNTIME_BANNED_IPS.splice(idx, 1);
    try {
      await query(`DELETE FROM banned_ips WHERE id = ?`, [id]);
    } catch {
      // Fallback
    }
    invalidateQueryCache('banned_ips');

    await this.logEvent({
      eventType: 'IP_UNBANNED',
      actorEmail: unbannedBy,
      ipAddress: '127.0.0.1',
      details: { unbannedIp: existing?.ipAddress || id },
    });

    return true;
  },
};
