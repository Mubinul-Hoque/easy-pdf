import { query, pool, DEFAULT_PLANS } from './db';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  max_file_size_bytes BIGINT NOT NULL DEFAULT 26214400,
  daily_operations_limit INT NOT NULL DEFAULT 20,
  ocr_monthly_pages INT NOT NULL DEFAULT 15,
  batch_file_limit INT NOT NULL DEFAULT 2,
  storage_retention_hours INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) DEFAULT NULL,
  full_name VARCHAR(150) NOT NULL,
  plan_id VARCHAR(64) NOT NULL DEFAULT 'plan_free_001',
  status ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
  total_operations INT NOT NULL DEFAULT 0,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_plan (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS processing_jobs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) DEFAULT NULL,
  operation_type VARCHAR(64) NOT NULL,
  status ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'QUEUED',
  priority INT NOT NULL DEFAULT 5,
  input_files JSON,
  parameters JSON,
  started_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_jobs_status (status),
  INDEX idx_jobs_user (user_id),
  INDEX idx_jobs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS processing_results (
  id VARCHAR(64) PRIMARY KEY,
  job_id VARCHAR(64) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  page_count INT DEFAULT NULL,
  compression_ratio DECIMAL(5, 2) DEFAULT NULL,
  processing_duration_ms INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_results_job (job_id),
  INDEX idx_results_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS failed_jobs (
  id VARCHAR(64) PRIMARY KEY,
  job_id VARCHAR(64) NOT NULL,
  error_code VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_failed_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usage_limits (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  period_date DATE NOT NULL,
  operations_count INT NOT NULL DEFAULT 0,
  ocr_pages_count INT NOT NULL DEFAULT 0,
  total_bytes_processed BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_period (user_id, period_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS security_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  actor_email VARCHAR(191) NOT NULL,
  ip_address VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
  user_agent TEXT,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_event (event_type),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS banned_ips (
  id VARCHAR(64) PRIMARY KEY,
  ip_address VARCHAR(64) NOT NULL UNIQUE,
  reason VARCHAR(255) NOT NULL,
  banned_by VARCHAR(150) NOT NULL DEFAULT 'System Admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function runDatabaseMigrations(): Promise<{ success: boolean; message: string; tablesCreated: string[] }> {
  const statements = SCHEMA_SQL.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const tables = [
    'plans',
    'users',
    'processing_jobs',
    'processing_results',
    'failed_jobs',
    'usage_limits',
    'security_audit_logs',
    'banned_ips',
  ];

  try {
    for (const sql of statements) {
      await query(sql);
    }

    // Seed Default Plans if empty
    for (const plan of DEFAULT_PLANS) {
      await query(
        `INSERT IGNORE INTO plans (id, name, slug, description, price_monthly, price_yearly, max_file_size_bytes, daily_operations_limit, ocr_monthly_pages, batch_file_limit, storage_retention_hours, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          plan.id,
          plan.name,
          plan.slug,
          plan.description,
          plan.price_monthly,
          plan.price_yearly,
          plan.max_file_size_bytes,
          plan.daily_operations_limit,
          plan.ocr_monthly_pages,
          plan.batch_file_limit,
          plan.storage_retention_hours,
          plan.is_active ? 1 : 0,
        ]
      );
    }

    return {
      success: true,
      message: 'All 8 database tables verified and migrated successfully with default plans seeded.',
      tablesCreated: tables,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Migration notice: ${err.message || 'Database offline or query error.'}`,
      tablesCreated: [],
    };
  }
}
