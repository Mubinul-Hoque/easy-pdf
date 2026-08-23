import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'HEALTHY';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await query(`SELECT 1 as ping`);
    dbLatencyMs = Date.now() - dbStart;
  } catch (err: any) {
    dbStatus = 'OFFLINE_FALLBACK';
  }

  const memory = process.memoryUsage ? process.memoryUsage() : null;

  return NextResponse.json(
    {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'production',
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
      },
      system: {
        nodeVersion: process.version,
        memoryRssMb: memory ? Math.round(memory.rss / 1024 / 1024) : 0,
        memoryHeapUsedMb: memory ? Math.round(memory.heapUsed / 1024 / 1024) : 0,
      },
      latencyMs: Date.now() - startTime,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
