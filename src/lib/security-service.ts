import { query } from './db';

export interface SecurityAuditLog {
  id: string;
  eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'STORAGE_PURGED' | 'PLAN_MODIFIED' | 'USER_SUSPENDED' | 'TOOL_MODIFIED' | 'IP_BANNED';
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

// In-memory runtime fallback records
let RUNTIME_AUDIT_LOGS: SecurityAuditLog[] = [
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

let RUNTIME_BANNED_IPS: BannedIP[] = [
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

    await this.logEvent({
      eventType: 'IP_BANNED',
      actorEmail: bannedBy,
      ipAddress: '127.0.0.1',
      details: { bannedIp: entry.ipAddress, reason: entry.reason },
    });

    return entry;
  },

  async unbanIP(id: string): Promise<boolean> {
    RUNTIME_BANNED_IPS = RUNTIME_BANNED_IPS.filter((b) => b.id !== id);
    try {
      await query(`DELETE FROM banned_ips WHERE id = ?`, [id]);
    } catch {
      // Fallback
    }
    return true;
  },
};
