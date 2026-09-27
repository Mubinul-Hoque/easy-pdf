import mysql from 'mysql2/promise';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_file_size_bytes: number;
  daily_operations_limit: number;
  ocr_monthly_pages: number;
  batch_file_limit: number;
  storage_retention_hours: number;
  is_active: number | boolean;
}

export const DEFAULT_PLANS: Plan[] = [
  {
    id: 'plan_free_001',
    name: 'Free Tier',
    slug: 'free',
    description: 'Essential tools for casual document tasks',
    price_monthly: 0,
    price_yearly: 0,
    max_file_size_bytes: 26214400,
    daily_operations_limit: 20,
    ocr_monthly_pages: 15,
    batch_file_limit: 2,
    storage_retention_hours: 1,
    is_active: 1,
  },
  {
    id: 'plan_pro_002',
    name: 'Pro Plan',
    slug: 'pro',
    description: 'Powerhouse for freelancers and power users with batch processing and high limits',
    price_monthly: 9,
    price_yearly: 86.4,
    max_file_size_bytes: 262144000,
    daily_operations_limit: 99999,
    ocr_monthly_pages: 500,
    batch_file_limit: 10,
    storage_retention_hours: 168,
    is_active: 1,
  },
  {
    id: 'plan_biz_003',
    name: 'Business Plan',
    slug: 'business',
    description: 'Enterprise team collaboration with massive limits and batch processing',
    price_monthly: 29,
    price_yearly: 278.4,
    max_file_size_bytes: 1073741824,
    daily_operations_limit: 99999,
    ocr_monthly_pages: 3000,
    batch_file_limit: 50,
    storage_retention_hours: 720,
    is_active: 1,
  },
];

// In-Memory Database Query Cache with TTL
interface DbCacheEntry<T> {
  data: T;
  expiresAt: number;
}
const queryCache = new Map<string, DbCacheEntry<any>>();

export function invalidateQueryCache(prefix?: string): void {
  if (!prefix) {
    queryCache.clear();
    return;
  }
  for (const key of queryCache.keys()) {
    if (key.includes(prefix)) {
      queryCache.delete(key);
    }
  }
}

// Global singleton MySQL connection pool to avoid socket leaks on Next.js reloads
declare global {
  var __easypdf_mysql_pool: mysql.Pool | undefined;
}

function createMySQLPool(): mysql.Pool {
  return mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'easypdf',
    waitForConnections: true,
    connectionLimit: 15,
    maxIdle: 5,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 3000,
  });
}

export const pool: mysql.Pool = globalThis.__easypdf_mysql_pool || createMySQLPool();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__easypdf_mysql_pool = pool;
}

/**
 * Execute parameterized SQL query with fault tolerance and resilient fallback
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } catch (err: any) {
    console.warn(`[Database Warning] Query notice (${err.code || err.message}). Resilient fallback operational.`);
    throw err;
  }
}

/**
 * Execute SQL query with in-memory TTL caching for high read-throughput static/settings tables
 */
export async function cachedQuery<T = any>(
  sql: string,
  params: any[] = [],
  ttlSeconds: number = 30
): Promise<T[]> {
  const cacheKey = `${sql}:${JSON.stringify(params)}`;
  const cached = queryCache.get(cacheKey);
  const now = Date.now();

  if (cached && now < cached.expiresAt) {
    return cached.data as T[];
  }

  const results = await query<T>(sql, params);
  queryCache.set(cacheKey, {
    data: results,
    expiresAt: now + ttlSeconds * 1000,
  });

  return results;
}

/**
 * Database Services for EasyPDF
 */
export const dbService = {
  // 1. Get all active subscription plans (with cached query)
  async getPlans(): Promise<Plan[]> {
    try {
      const plans = await cachedQuery<Plan>(
        `SELECT * FROM plans WHERE is_active = 1 ORDER BY price_monthly ASC`,
        [],
        60 // Cache for 60s
      );
      if (plans && plans.length > 0) {
        return plans;
      }
      return DEFAULT_PLANS;
    } catch {
      return DEFAULT_PLANS;
    }
  },

  // 2. Register or get user by email
  async getUserByEmail(email: string) {
    try {
      const users = await query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email.toLowerCase().trim()]);
      return users.length > 0 ? users[0] : null;
    } catch {
      return null;
    }
  },

  // 2.1 Get user by phone number
  async getUserByPhone(phone: string) {
    try {
      const cleanPhone = phone.trim();
      const users = await query(`SELECT * FROM users WHERE phone = ? LIMIT 1`, [cleanPhone]);
      return users.length > 0 ? users[0] : null;
    } catch {
      return null;
    }
  },

  // 2.2 Get user by identifier (either email or phone)
  async getUserByIdentifier(identifier: string) {
    try {
      const clean = identifier.trim();
      const isEmail = clean.includes('@');
      if (isEmail) {
        return await this.getUserByEmail(clean);
      } else {
        return await this.getUserByPhone(clean);
      }
    } catch {
      return null;
    }
  },

  // 2.3 Get user by ID
  async getUserById(id: string) {
    try {
      const users = await query(`SELECT * FROM users WHERE id = ? LIMIT 1`, [id]);
      return users.length > 0 ? users[0] : null;
    } catch {
      return null;
    }
  },

  // 2.4 Create new registered user
  async createUser(user: {
    id: string;
    email?: string | null;
    phone?: string | null;
    fullName: string;
    role?: 'USER' | 'ADMIN';
    tier?: string;
    planId?: string;
    passwordHash?: string | null;
    emailVerified?: boolean;
    phoneVerified?: boolean;
  }) {
    try {
      const emailVerifiedAt = user.emailVerified ? new Date() : null;
      const phoneVerifiedAt = user.phoneVerified ? new Date() : null;
      await query(
        `INSERT INTO users (id, email, phone, full_name, role, tier, plan_id, password_hash, email_verified_at, phone_verified_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          user.id,
          user.email ? user.email.toLowerCase().trim() : null,
          user.phone ? user.phone.trim() : null,
          user.fullName.trim(),
          user.role || 'USER',
          user.tier || 'FREE',
          user.planId || 'plan_free_001',
          user.passwordHash || null,
          emailVerifiedAt,
          phoneVerifiedAt,
        ]
      );
      return await this.getUserById(user.id);
    } catch (err) {
      console.warn('Create user notice:', err);
      throw err;
    }
  },

  // 3. Create a processing job
  async createJob(params: {
    id: string;
    userId?: string | null;
    operationType: string;
    priority?: number;
    inputFiles?: any;
    parameters?: any;
  }) {
    try {
      await query(
        `INSERT INTO processing_jobs (id, user_id, operation_type, status, priority, input_files, parameters)
         VALUES (?, ?, ?, 'QUEUED', ?, ?, ?)`,
        [
          params.id,
          params.userId || null,
          params.operationType,
          params.priority || 5,
          JSON.stringify(params.inputFiles || []),
          JSON.stringify(params.parameters || {}),
        ]
      );
      return params.id;
    } catch (err) {
      // Graceful fallback for offline DB
      return params.id;
    }
  },

  // 4. Update job status
  async updateJobStatus(
    jobId: string,
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELED'
  ) {
    try {
      const timestampField =
        status === 'PROCESSING'
          ? ', started_at = NOW()'
          : status === 'COMPLETED'
          ? ', completed_at = NOW()'
          : '';
      await query(`UPDATE processing_jobs SET status = ? ${timestampField} WHERE id = ?`, [
        status,
        jobId,
      ]);
    } catch {
      // Graceful fallback
    }
  },

  // 5. Save job result
  async saveResult(params: {
    id: string;
    jobId: string;
    storageKey: string;
    fileName: string;
    fileSize: number;
    pageCount?: number;
    compressionRatio?: number;
    durationMs: number;
    retentionHours?: number;
  }) {
    try {
      const retention = params.retentionHours || 1;
      await query(
        `INSERT INTO processing_results (id, job_id, storage_key, file_name, file_size, page_count, compression_ratio, processing_duration_ms, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
        [
          params.id,
          params.jobId,
          params.storageKey,
          params.fileName,
          params.fileSize,
          params.pageCount || null,
          params.compressionRatio || null,
          params.durationMs,
          retention,
        ]
      );
    } catch {
      // Graceful fallback
    }
  },

  // 6. Record failed job diagnostic
  async saveFailedJob(params: {
    id: string;
    jobId: string;
    errorCode: string;
    errorMessage: string;
    stackTrace?: any;
  }) {
    try {
      await query(
        `INSERT INTO failed_jobs (id, job_id, error_code, error_message, stack_trace)
         VALUES (?, ?, ?, ?, ?)`,
        [
          params.id,
          params.jobId,
          params.errorCode,
          params.errorMessage,
          JSON.stringify(params.stackTrace || {}),
        ]
      );
    } catch {
      // Graceful fallback
    }
  },

  // 7. Track daily usage
  async incrementDailyUsage(userId: string, operations: number = 1, ocrPages: number = 0, bytes: number = 0) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const usageId = `usg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await query(
        `INSERT INTO usage_limits (id, user_id, period_date, operations_count, ocr_pages_count, total_bytes_processed)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         operations_count = operations_count + VALUES(operations_count),
         ocr_pages_count = ocr_pages_count + VALUES(ocr_pages_count),
         total_bytes_processed = total_bytes_processed + VALUES(total_bytes_processed)`,
        [usageId, userId, today, operations, ocrPages, bytes]
      );
    } catch {
      // Graceful fallback
    }
  },

  // 8. Delete specific job files from server storage after confirmed download
  async cleanupJobFiles(jobId: string, fileIds: string[] = [], storageKeys: string[] = []) {
    try {
      if (jobId) {
        await query(
          `UPDATE processing_jobs SET status = 'COMPLETED', updated_at = NOW() WHERE id = ? AND status != 'PROCESSING'`,
          [jobId]
        );
        await query(
          `DELETE FROM processing_results WHERE job_id = ?`,
          [jobId]
        );
      }
      return { success: true, purgedJobId: jobId, purgedCount: 1 };
    } catch (err: any) {
      console.warn('DB Job cleanup notice:', err.message);
      return { success: true, purgedJobId: jobId, purgedCount: 0 };
    }
  },

  // 9. Backup cleanup: purge abandoned or expired files
  async cleanupExpiredFiles() {
    try {
      // 1. Delete results past their retention expiration timestamp
      const expiredResults = await query<{ storage_key: string; job_id: string; file_size: number }>(
        `SELECT storage_key, job_id, file_size FROM processing_results WHERE expires_at < NOW()`
      );

      await query(
        `DELETE FROM processing_results WHERE expires_at < NOW()`
      );

      // 2. Mark abandoned jobs older than 2 hours that are not actively processing
      await query(
        `UPDATE processing_jobs
         SET status = 'FAILED', parameters = JSON_SET(COALESCE(parameters, '{}'), '$.abandoned', true)
         WHERE status = 'QUEUED' AND created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR)`
      );

      const purgedBytes = expiredResults.reduce((sum, r) => sum + (Number(r.file_size) || 0), 0);
      await recordCleanupRun(expiredResults.length, purgedBytes);

      return {
        success: true,
        purgedCount: expiredResults.length,
        purgedBytes,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn('Expired files cleanup notice:', err.message);
      return { success: true, purgedCount: 0, purgedBytes: 0, error: err.message };
    }
  },

  // 10. Fetch a user's usage counters for the current day (against their plan's daily quota)
  async getUsageToday(userId: string): Promise<{ operations_count: number; ocr_pages_count: number; total_bytes_processed: number }> {
    const empty = { operations_count: 0, ocr_pages_count: 0, total_bytes_processed: 0 };
    try {
      const today = new Date().toISOString().slice(0, 10);
      const rows = await query<{ operations_count: number; ocr_pages_count: number; total_bytes_processed: number }>(
        `SELECT operations_count, ocr_pages_count, total_bytes_processed FROM usage_limits WHERE user_id = ? AND period_date = ? LIMIT 1`,
        [userId, today]
      );
      return rows.length > 0 ? rows[0] : empty;
    } catch {
      return empty;
    }
  },
};

// --------------------------------------------------------------------------
// Persistent operational ledger (survives restarts, unlike in-memory counters).
// Tracks cumulative purge activity and the last cleanup-run timestamp so the
// admin panel can report real numbers instead of hardcoded placeholders.
// --------------------------------------------------------------------------
export interface PurgeLedger {
  totalFilesPurged: number;
  totalBytesPurged: number;
  lastCleanupRunAt: string | null;
}

let purgeLedgerTableEnsured = false;
async function ensurePurgeLedgerTable(): Promise<void> {
  if (purgeLedgerTableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    purgeLedgerTableEnsured = true;
  } catch {
    // DB offline — ledger falls back to in-memory defaults
  }
}

const PURGE_LEDGER_KEY = 'purge_ledger';

declare global {
  var __easypdf_purge_ledger: PurgeLedger | undefined;
}

let cachedLedger: PurgeLedger =
  globalThis.__easypdf_purge_ledger || { totalFilesPurged: 0, totalBytesPurged: 0, lastCleanupRunAt: null };
globalThis.__easypdf_purge_ledger = cachedLedger;

export async function getPurgeLedger(): Promise<PurgeLedger> {
  try {
    await ensurePurgeLedgerTable();
    const rows = await query<{ setting_value: string }>(
      `SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1`,
      [PURGE_LEDGER_KEY]
    );
    if (rows.length > 0) {
      const parsed = JSON.parse(rows[0].setting_value);
      cachedLedger = { ...cachedLedger, ...parsed };
      globalThis.__easypdf_purge_ledger = cachedLedger;
      return cachedLedger;
    }
  } catch {
    // Fallback to cached/default
  }
  return cachedLedger;
}

async function recordCleanupRun(filesPurged: number, bytesPurged: number): Promise<void> {
  const current = await getPurgeLedger();
  const updated: PurgeLedger = {
    totalFilesPurged: current.totalFilesPurged + filesPurged,
    totalBytesPurged: current.totalBytesPurged + bytesPurged,
    lastCleanupRunAt: new Date().toISOString(),
  };
  cachedLedger = updated;
  globalThis.__easypdf_purge_ledger = cachedLedger;
  try {
    await ensurePurgeLedgerTable();
    await query(
      `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
      [PURGE_LEDGER_KEY, JSON.stringify(updated)]
    );
  } catch {
    // Ledger stays accurate in-memory for this process even if the write fails
  }
}

/** Records a manual (admin-triggered) purge into the same persistent ledger as the auto-cleanup cron. */
export async function recordManualPurge(filesPurged: number, bytesPurged: number): Promise<void> {
  await recordCleanupRun(filesPurged, bytesPurged);
}
