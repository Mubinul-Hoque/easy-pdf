import { query, dbService, getPurgeLedger, recordManualPurge } from './db';
import { PDF_TOOLS } from './pdf-tools-data';
import { ensureSettingsTable } from './settings-service';
import fs from 'fs';
import path from 'path';

// Maps the short action names used by /api/pdf/[action] (and stored in
// processing_jobs.operation_type) to the full tool ids used in PDF_TOOLS.
const ACTION_TO_TOOL_ID: Record<string, string> = {
  merge: 'merge-pdf',
  split: 'split-pdf',
  organize: 'organize-pdf',
  rotate: 'rotate-pdf',
  compress: 'compress-pdf',
  repair: 'repair-pdf',
  ocr: 'ocr-pdf',
};

const TOOL_COLOR_MAP: Record<string, string> = {
  'compress-pdf': '#f59e0b',
  'merge-pdf': '#6366f1',
  'ocr-pdf': '#8b5cf6',
  'organize-pdf': '#ec4899',
  'split-pdf': '#3b82f6',
  'rotate-pdf': '#10b981',
  'repair-pdf': '#ef4444',
};

export interface AdminStats {
  totalOperations: number;
  operationsToday: number;
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  activeJobsCount: number;
  purgedFilesCount: number;
  totalStoragePurgedBytes: number;
  currentTempStorageBytes: number;
  serverUptimeSeconds: number;
  avgLatencyMs: number;
  errorRatePercent: number;
  toolUsageBreakdown: Array<{ toolId: string; name: string; count: number; percentage: number; color: string }>;
  dailyVolume: Array<{ date: string; operations: number; users: number }>;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'business';
  status: 'active' | 'suspended' | 'pending';
  totalOperations: number;
  storageUsedBytes: number;
  createdAt: string;
  lastActiveAt: string;
}

export interface PaginatedUsersResponse {
  users: AdminUserRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminJobRecord {
  id: string;
  userId: string | null;
  userEmail?: string;
  operationType: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileCount: number;
  fileSizeBytes: number;
  durationMs: number;
  createdAt: string;
}

export interface AdminToolConfig {
  id: string;
  name: string;
  enabled: boolean;
  maxFileSizeMb: number;
  batchLimit: number;
  maintenanceNotice?: string;
}

// In-memory runtime cache with TTL to eliminate redundant queries
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number = 10000): void {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
}

// Global singleton cache in memory for persistent lookups across Next.js reloads
declare global {
  var __easypdf_tool_configs: Record<string, AdminToolConfig> | undefined;
  var __easypdf_maintenance_banner: string | undefined;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'database', 'admin-tool-configs.json');

function getDefaultToolConfigs(): Record<string, AdminToolConfig> {
  const configs: Record<string, AdminToolConfig> = {};
  PDF_TOOLS.forEach((t) => {
    configs[t.id] = {
      id: t.id,
      name: t.name,
      enabled: true,
      maxFileSizeMb: 100,
      batchLimit: 25,
    };
  });
  return configs;
}

function loadFromFileSystem(): { configs?: Record<string, AdminToolConfig>; banner?: string } {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // Ignore file read error
  }
  return {};
}

function saveToFileSystem(data: { configs: Record<string, AdminToolConfig>; banner: string }) {
  try {
    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Ignore file write error
  }
}
export const adminService = {
  /**
   * Get all aggregated system statistics with 10s TTL caching.
   * Every figure is computed from real tables; if the DB is unreachable
   * the metrics are honestly zeroed rather than backfilled with placeholders.
   */
  async getDashboardStats(): Promise<AdminStats> {
    const cached = getCached<AdminStats>('admin_kpi_stats');
    if (cached) return cached;

    const ledger = await getPurgeLedger();

    let totalOperations = 0;
    let operationsToday = 0;
    let totalUsers = 0;
    let activeJobsCount = 0;
    let activeSubscriptions = 0;
    let monthlyRecurringRevenue = 0;
    let currentTempStorageBytes = 0;
    let avgLatencyMs = 0;
    let errorRatePercent = 0;
    let toolUsage: AdminStats['toolUsageBreakdown'] = [];
    let dailyVolume: AdminStats['dailyVolume'] = [];

    try {
      const [
        totalOpsRows,
        todayOpsRows,
        usersRows,
        activeJobsRows,
        revenueRows,
        tempStorageRows,
        latencyRows,
        errorRows,
        toolUsageRows,
        dailyVolumeRows,
      ] = await Promise.all([
        query<{ count: number }>(`SELECT COUNT(*) as count FROM processing_jobs`),
        query<{ count: number }>(`SELECT COUNT(*) as count FROM processing_jobs WHERE DATE(created_at) = CURDATE()`),
        query<{ count: number }>(`SELECT COUNT(*) as count FROM users`),
        query<{ count: number }>(`SELECT COUNT(*) as count FROM processing_jobs WHERE status IN ('QUEUED', 'PROCESSING')`),
        query<{ revenue: number; count: number }>(
          `SELECT COALESCE(SUM(p.price_monthly), 0) as revenue, COUNT(*) as count
           FROM users u JOIN plans p ON p.id = u.plan_id
           WHERE u.status = 'active' AND p.price_monthly > 0`
        ),
        query<{ bytes: number }>(`SELECT COALESCE(SUM(file_size), 0) as bytes FROM processing_results WHERE expires_at > NOW()`),
        // processing_duration_ms lives on processing_results, not processing_jobs
        query<{ avg: number }>(`SELECT AVG(processing_duration_ms) as avg FROM processing_results`),
        query<{ failed: number; total: number }>(
          `SELECT (SELECT COUNT(*) FROM processing_jobs WHERE status = 'FAILED') as failed, COUNT(*) as total FROM processing_jobs`
        ),
        query<{ operation_type: string; count: number }>(
          `SELECT operation_type, COUNT(*) as count FROM processing_jobs GROUP BY operation_type ORDER BY count DESC`
        ),
        query<{ day: string; operations: number; users: number }>(
          `SELECT DATE(created_at) as day, COUNT(*) as operations, COUNT(DISTINCT user_id) as users
           FROM processing_jobs WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
           GROUP BY DATE(created_at) ORDER BY day ASC`
        ),
      ]);

      totalOperations = totalOpsRows[0]?.count || 0;
      operationsToday = todayOpsRows[0]?.count || 0;
      totalUsers = usersRows[0]?.count || 0;
      activeJobsCount = activeJobsRows[0]?.count || 0;
      monthlyRecurringRevenue = Number(revenueRows[0]?.revenue) || 0;
      activeSubscriptions = revenueRows[0]?.count || 0;
      currentTempStorageBytes = Number(tempStorageRows[0]?.bytes) || 0;
      avgLatencyMs = Math.round(Number(latencyRows[0]?.avg) || 0);

      const failedCount = errorRows[0]?.failed || 0;
      const totalJobsForError = errorRows[0]?.total || 0;
      errorRatePercent = totalJobsForError > 0 ? Math.round((failedCount / totalJobsForError) * 10000) / 100 : 0;

      const toolMetaMap = new Map(PDF_TOOLS.map((t) => [t.id, t]));
      const toolTotal = toolUsageRows.reduce((sum, r) => sum + Number(r.count), 0) || 1;
      toolUsage = toolUsageRows.map((r) => {
        const toolId = ACTION_TO_TOOL_ID[r.operation_type] || r.operation_type;
        return {
          toolId,
          name: toolMetaMap.get(toolId)?.name || r.operation_type,
          count: Number(r.count),
          percentage: Math.round((Number(r.count) / toolTotal) * 1000) / 10,
          color: TOOL_COLOR_MAP[toolId] || '#6366f1',
        };
      });

      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayStr = new Date().toISOString().slice(0, 10);
      dailyVolume = dailyVolumeRows.map((r) => {
        const dateStr = typeof r.day === 'string' ? r.day.slice(0, 10) : new Date(r.day).toISOString().slice(0, 10);
        const label = dateStr === todayStr ? 'Today' : dayLabels[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
        return { date: label, operations: Number(r.operations), users: Number(r.users) };
      });
    } catch (err: any) {
      console.warn('[Admin] Dashboard stats query failed — showing zeroed metrics:', err?.message);
    }

    const uptimeSeconds = Math.round(process.uptime());

    const stats: AdminStats = {
      totalOperations,
      operationsToday,
      totalUsers,
      activeSubscriptions,
      monthlyRecurringRevenue,
      activeJobsCount,
      purgedFilesCount: ledger.totalFilesPurged,
      totalStoragePurgedBytes: ledger.totalBytesPurged,
      currentTempStorageBytes,
      serverUptimeSeconds: uptimeSeconds,
      avgLatencyMs,
      errorRatePercent,
      toolUsageBreakdown: toolUsage,
      dailyVolume,
    };

    setCache('admin_kpi_stats', stats, 10000); // 10s TTL
    return stats;
  },

  /**
   * Get paginated registered users (real `users` table) with sanitized filters.
   */
  async getUsers(
    searchQuery?: string,
    planFilter?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedUsersResponse> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    try {
      const plans = await dbService.getPlans();
      const planIdToSlug = new Map(plans.map((p) => [p.id, p.slug]));
      const slugToPlanIds = new Map<string, string[]>();
      for (const p of plans) {
        const list = slugToPlanIds.get(p.slug) || [];
        list.push(p.id);
        slugToPlanIds.set(p.slug, list);
      }

      const whereClauses: string[] = [];
      const params: any[] = [];

      if (searchQuery) {
        const q = `%${searchQuery.trim().replace(/[%_]/g, '')}%`;
        whereClauses.push(`(full_name LIKE ? OR email LIKE ? OR id LIKE ?)`);
        params.push(q, q, q);
      }

      if (planFilter && planFilter !== 'all') {
        const ids = slugToPlanIds.get(planFilter) || [];
        if (ids.length === 0) {
          // No plan matches this slug — return an empty page rather than all users
          return { users: [], total: 0, page: safePage, limit: safeLimit, totalPages: 1 };
        }
        whereClauses.push(`plan_id IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countRows = await query<{ count: number }>(`SELECT COUNT(*) as count FROM users ${whereSql}`, params);
      const total = countRows[0]?.count || 0;

      const rows = await query<any>(
        `SELECT id, full_name, email, phone, plan_id, status, total_operations, storage_used_bytes, created_at, last_active_at
         FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, safeLimit, offset]
      );

      const users: AdminUserRecord[] = rows.map((r) => ({
        id: r.id,
        name: r.full_name,
        email: r.email || r.phone || 'unknown',
        plan: (planIdToSlug.get(r.plan_id) as AdminUserRecord['plan']) || 'free',
        status: r.status,
        totalOperations: r.total_operations || 0,
        storageUsedBytes: r.storage_used_bytes || 0,
        createdAt: r.created_at,
        lastActiveAt: r.last_active_at || r.created_at,
      }));

      return {
        users,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      };
    } catch (err: any) {
      console.warn('[Admin] getUsers query failed — DB unavailable:', err?.message);
      return { users: [], total: 0, page: safePage, limit: safeLimit, totalPages: 1 };
    }
  },

  /**
   * Update a real user's plan tier and/or account status.
   */
  async updateUser(userId: string, updates: Partial<AdminUserRecord>): Promise<AdminUserRecord | null> {
    try {
      const setClauses: string[] = [];
      const params: any[] = [];

      if (updates.plan) {
        const plans = await dbService.getPlans();
        const targetPlan = plans.find((p) => p.slug === updates.plan);
        if (targetPlan) {
          setClauses.push('plan_id = ?');
          params.push(targetPlan.id);
        }
      }
      if (updates.status) {
        setClauses.push('status = ?');
        params.push(updates.status);
      }
      if (setClauses.length === 0) return null;

      params.push(userId);
      await query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, params);
      invalidateCache('admin_kpi_stats');

      const rows = await query<any>(
        `SELECT id, full_name, email, phone, plan_id, status, total_operations, storage_used_bytes, created_at, last_active_at
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
      if (rows.length === 0) return null;

      const plans = await dbService.getPlans();
      const planSlug = plans.find((p) => p.id === rows[0].plan_id)?.slug || 'free';

      return {
        id: rows[0].id,
        name: rows[0].full_name,
        email: rows[0].email || rows[0].phone || 'unknown',
        plan: planSlug as AdminUserRecord['plan'],
        status: rows[0].status,
        totalOperations: rows[0].total_operations || 0,
        storageUsedBytes: rows[0].storage_used_bytes || 0,
        createdAt: rows[0].created_at,
        lastActiveAt: rows[0].last_active_at || rows[0].created_at,
      };
    } catch (err: any) {
      console.warn('[Admin] updateUser failed — DB unavailable:', err?.message);
      return null;
    }
  },

  /**
   * Get the real recent jobs queue (from processing_jobs, joined with users/results
   * for display context) with indexed pagination.
   */
  async getRecentJobs(page: number = 1, limit: number = 20): Promise<{ jobs: AdminJobRecord[]; total: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    try {
      const [rows, countRows] = await Promise.all([
        query<any>(
          `SELECT j.id, j.user_id, j.operation_type, j.status, j.created_at, j.input_files,
                  u.email as user_email, u.phone as user_phone,
                  r.file_size, r.processing_duration_ms
           FROM processing_jobs j
           LEFT JOIN users u ON u.id = j.user_id
           LEFT JOIN processing_results r ON r.job_id = j.id
           ORDER BY j.created_at DESC LIMIT ? OFFSET ?`,
          [safeLimit, offset]
        ),
        query<{ count: number }>(`SELECT COUNT(*) as count FROM processing_jobs`),
      ]);

      const jobs: AdminJobRecord[] = rows.map((r) => {
        let fileCount = 1;
        try {
          const inputFiles = typeof r.input_files === 'string' ? JSON.parse(r.input_files) : r.input_files;
          if (Array.isArray(inputFiles) && inputFiles.length > 0) fileCount = inputFiles.length;
        } catch {
          // Keep default of 1
        }
        return {
          id: r.id,
          userId: r.user_id,
          userEmail: r.user_email || r.user_phone || (r.user_id ? undefined : 'Anonymous Guest'),
          operationType: r.operation_type,
          status: r.status,
          fileCount,
          fileSizeBytes: Number(r.file_size) || 0,
          durationMs: Number(r.processing_duration_ms) || 0,
          createdAt: r.created_at || new Date().toISOString(),
        };
      });

      return { jobs, total: countRows[0]?.count || 0 };
    } catch (err: any) {
      console.warn('[Admin] getRecentJobs query failed — DB unavailable:', err?.message);
      return { jobs: [], total: 0 };
    }
  },

  /**
   * Get all tool configurations with multi-layer persistence (DB -> File -> Memory)
   */
  async getToolConfigs(): Promise<AdminToolConfig[]> {
    const defaults = getDefaultToolConfigs();

    // 1. Try DB first
    try {
      await ensureSettingsTable();
      const rows = await query<{ setting_value: string }>(
        `SELECT setting_value FROM system_settings WHERE setting_key = 'admin_tool_configs' LIMIT 1`
      );
      if (rows && rows.length > 0 && rows[0].setting_value) {
        const parsed = JSON.parse(rows[0].setting_value);
        if (parsed && typeof parsed === 'object') {
          const merged: Record<string, AdminToolConfig> = { ...defaults, ...parsed };
          globalThis.__easypdf_tool_configs = merged;
          return Object.values(merged);
        }
      }
    } catch {
      // DB Fallback
    }

    // 2. Global Memory Cache
    if (globalThis.__easypdf_tool_configs && Object.keys(globalThis.__easypdf_tool_configs).length > 0) {
      return Object.values({ ...defaults, ...globalThis.__easypdf_tool_configs });
    }

    // 3. Local File Fallback
    const fileData = loadFromFileSystem();
    if (fileData.configs && Object.keys(fileData.configs).length > 0) {
      const merged = { ...defaults, ...fileData.configs };
      globalThis.__easypdf_tool_configs = merged;
      return Object.values(merged);
    }

    // 4. Default fallback
    globalThis.__easypdf_tool_configs = defaults;
    return Object.values(defaults);
  },

  /**
   * Update a specific tool's status or limits and persist to DB, file, and memory
   */
  async updateToolConfig(toolId: string, updates: Partial<AdminToolConfig>): Promise<AdminToolConfig | null> {
    await this.getToolConfigs();

    const currentConfigs = globalThis.__easypdf_tool_configs || getDefaultToolConfigs();
    if (!currentConfigs[toolId]) {
      const toolMeta = PDF_TOOLS.find((t) => t.id === toolId);
      currentConfigs[toolId] = {
        id: toolId,
        name: toolMeta?.name || toolId,
        enabled: true,
        maxFileSizeMb: 100,
        batchLimit: 25,
      };
    }

    currentConfigs[toolId] = {
      ...currentConfigs[toolId],
      ...updates,
    };

    globalThis.__easypdf_tool_configs = currentConfigs;

    // Persist to DB
    try {
      await ensureSettingsTable();
      await query(
        `INSERT INTO system_settings (setting_key, setting_value)
         VALUES ('admin_tool_configs', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify(currentConfigs)]
      );
    } catch (err: any) {
      console.warn('[Admin Tool Config DB Error]', err.message);
    }

    // Persist to File System
    const currentBanner = globalThis.__easypdf_maintenance_banner || '';
    saveToFileSystem({ configs: currentConfigs, banner: currentBanner });

    return currentConfigs[toolId];
  },

  /**
   * Get current system banner
   */
  async getMaintenanceBanner(): Promise<string> {
    try {
      await ensureSettingsTable();
      const rows = await query<{ setting_value: string }>(
        `SELECT setting_value FROM system_settings WHERE setting_key = 'admin_maintenance_banner' LIMIT 1`
      );
      if (rows && rows.length > 0 && rows[0].setting_value !== undefined) {
        globalThis.__easypdf_maintenance_banner = rows[0].setting_value;
        return rows[0].setting_value;
      }
    } catch {
      // Fallback
    }

    if (globalThis.__easypdf_maintenance_banner !== undefined) {
      return globalThis.__easypdf_maintenance_banner;
    }

    const fileData = loadFromFileSystem();
    if (fileData.banner !== undefined) {
      globalThis.__easypdf_maintenance_banner = fileData.banner;
      return fileData.banner;
    }

    return '';
  },

  /**
   * Update system announcement banner
   */
  async setMaintenanceBanner(bannerText: string): Promise<string> {
    const cleanBanner = bannerText.trim();
    globalThis.__easypdf_maintenance_banner = cleanBanner;

    try {
      await ensureSettingsTable();
      await query(
        `INSERT INTO system_settings (setting_key, setting_value)
         VALUES ('admin_maintenance_banner', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [cleanBanner]
      );
    } catch (err: any) {
      console.warn('[Admin Banner DB Error]', err.message);
    }

    const currentConfigs = globalThis.__easypdf_tool_configs || getDefaultToolConfigs();
    saveToFileSystem({ configs: currentConfigs, banner: cleanBanner });

    return cleanBanner;
  },

  /**
   * Force purge all storage & reset metrics. Counts and sums the real rows
   * before deleting them, and records the totals into the persistent purge
   * ledger so the dashboard's lifetime purge stats stay accurate.
   */
  async forcePurgeStorage(): Promise<{ success: boolean; purgedFiles: number; purgedBytes: number }> {
    try {
      const rows = await query<{ count: number; totalBytes: number }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as totalBytes FROM processing_results`
      );
      const purgedFiles = rows[0]?.count || 0;
      const purgedBytes = Number(rows[0]?.totalBytes) || 0;

      await query(`DELETE FROM processing_results`);
      await recordManualPurge(purgedFiles, purgedBytes);
      invalidateCache('admin_kpi_stats');

      return { success: true, purgedFiles, purgedBytes };
    } catch (err: any) {
      console.warn('[Admin] forcePurgeStorage failed — DB unavailable:', err?.message);
      return { success: false, purgedFiles: 0, purgedBytes: 0 };
    }
  },
};
