import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/lib/admin-service';
import { parseAdminSessionToken, ADMIN_CONFIG } from '@/lib/admin-auth';
import { query, getPurgeLedger } from '@/lib/db';
import { safeApiError, extractBearerToken } from '@/lib/api-security';

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers, req.cookies, ADMIN_CONFIG.sessionCookieName);
    if (!parseAdminSessionToken(token)) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // A. Force purge all storage
    if (action === 'purge_storage') {
      const result = await adminService.forcePurgeStorage();
      return NextResponse.json({ success: true, result, message: 'All temporary files and job artifacts purged successfully.' });
    }

    // B. Test MySQL Database Connection Pool
    if (action === 'test_db') {
      try {
        const start = Date.now();
        await query(`SELECT 1 as ping`);
        const latency = Date.now() - start;
        return NextResponse.json({
          success: true,
          status: 'HEALTHY',
          database: process.env.MYSQL_DATABASE || 'easypdf',
          host: process.env.MYSQL_HOST || 'localhost',
          latencyMs: latency,
          message: `Database connection pool operational (${latency}ms roundtrip).`,
        });
      } catch {
        return NextResponse.json({
          success: true,
          status: 'OFFLINE_FALLBACK',
          message: 'Database is offline or unreachable. Application is running in resilient fallback mode.',
        });
      }
    }

    // C. Get System Health Metrics
    if (action === 'health_check') {
      const memoryUsage = process.memoryUsage ? process.memoryUsage() : null;
      const ledger = await getPurgeLedger();
      return NextResponse.json({
        success: true,
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Math.round(process.uptime()),
        memory: memoryUsage
          ? {
              rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
              heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
              heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            }
          : null,
        lastCleanupRunAt: ledger.lastCleanupRunAt,
      });
    }

    // D. One-Click Database Schema Migrations
    if (action === 'migrate_schema') {
      const { runDatabaseMigrations } = await import('@/lib/db-schema');
      const result = await runDatabaseMigrations();
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Unknown system action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(safeApiError(err, 'System action failed.'), { status: 500 });
  }
}
