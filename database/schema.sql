-- =============================================================================
-- EasyPDF Enterprise Database Schema (MySQL / MariaDB)
-- High-Performance Scalable Schema with Composite Indexes
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `easypdf` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `easypdf`;

-- Disable foreign key checks for clean recreation if needed
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` VARCHAR(64) NOT NULL,
    `email` VARCHAR(191) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) DEFAULT NULL,
    `full_name` VARCHAR(150) DEFAULT NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `tier` ENUM('ANONYMOUS', 'FREE', 'PRO', 'BUSINESS') NOT NULL DEFAULT 'FREE',
    `plan_id` VARCHAR(64) NOT NULL DEFAULT 'plan_free_001',
    `status` ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
    `total_operations` INT NOT NULL DEFAULT 0,
    `storage_used_bytes` BIGINT NOT NULL DEFAULT 0,
    `avatar_url` VARCHAR(500) DEFAULT NULL,
    `api_key` VARCHAR(64) DEFAULT NULL UNIQUE,
    `email_verified_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_plan` (`plan_id`),
    INDEX `idx_users_status_plan` (`status`, `plan_id`),
    INDEX `idx_users_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. PLANS TABLE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `plans`;
CREATE TABLE `plans` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(50) NOT NULL UNIQUE,
    `description` TEXT DEFAULT NULL,
    `price_monthly` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `price_yearly` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `max_file_size_bytes` BIGINT NOT NULL DEFAULT 26214400, -- 25MB default
    `daily_operations_limit` INT NOT NULL DEFAULT 20,
    `ocr_monthly_pages` INT NOT NULL DEFAULT 15,
    `batch_file_limit` INT NOT NULL DEFAULT 2,
    `storage_retention_hours` INT NOT NULL DEFAULT 1,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. SUBSCRIPTIONS TABLE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `subscriptions`;
CREATE TABLE `subscriptions` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `plan_id` VARCHAR(64) NOT NULL,
    `status` ENUM('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING') NOT NULL DEFAULT 'ACTIVE',
    `stripe_customer_id` VARCHAR(100) DEFAULT NULL,
    `stripe_subscription_id` VARCHAR(100) DEFAULT NULL,
    `billing_cycle` ENUM('MONTHLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
    `current_period_start` DATETIME DEFAULT NULL,
    `current_period_end` DATETIME DEFAULT NULL,
    `cancel_at_period_end` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_subscriptions_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE RESTRICT,
    INDEX `idx_subscriptions_status` (`status`),
    INDEX `idx_subscriptions_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. PAYMENTS TABLE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `subscription_id` VARCHAR(64) DEFAULT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `status` ENUM('SUCCEEDED', 'PENDING', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'SUCCEEDED',
    `stripe_payment_intent_id` VARCHAR(100) DEFAULT NULL,
    `payment_method` VARCHAR(50) DEFAULT 'credit_card',
    `receipt_url` VARCHAR(500) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_payments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_payments_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL,
    INDEX `idx_payments_status` (`status`),
    INDEX `idx_payments_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. FILES TABLE (Uploaded & Ephemeral Documents)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `files`;
CREATE TABLE `files` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) DEFAULT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `storage_key` VARCHAR(500) NOT NULL,
    `storage_provider` VARCHAR(50) NOT NULL DEFAULT 'local',
    `mime_type` VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    `file_size` BIGINT NOT NULL,
    `page_count` INT DEFAULT NULL,
    `is_ephemeral` BOOLEAN NOT NULL DEFAULT TRUE,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_files_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_files_expires` (`expires_at`),
    INDEX `idx_files_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. PROCESSING_JOBS TABLE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `processing_jobs`;
CREATE TABLE `processing_jobs` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) DEFAULT NULL,
    `operation_type` VARCHAR(64) NOT NULL,
    `status` ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'QUEUED',
    `priority` TINYINT NOT NULL DEFAULT 5, -- 1 (Highest) to 10 (Lowest)
    `input_files` JSON DEFAULT NULL,
    `parameters` JSON DEFAULT NULL,
    `started_at` DATETIME DEFAULT NULL,
    `completed_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_jobs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_jobs_status` (`status`),
    INDEX `idx_jobs_operation` (`operation_type`),
    INDEX `idx_jobs_created` (`created_at`),
    INDEX `idx_jobs_status_created` (`status`, `created_at`),
    INDEX `idx_jobs_user_created` (`user_id`, `created_at`),
    INDEX `idx_jobs_op_created` (`operation_type`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. PROCESSING_RESULTS TABLE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `processing_results`;
CREATE TABLE `processing_results` (
    `id` VARCHAR(64) NOT NULL,
    `job_id` VARCHAR(64) NOT NULL UNIQUE,
    `storage_key` VARCHAR(500) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_size` BIGINT NOT NULL,
    `page_count` INT DEFAULT NULL,
    `compression_ratio` DECIMAL(5, 2) DEFAULT NULL,
    `processing_duration_ms` INT NOT NULL DEFAULT 0,
    `download_count` INT NOT NULL DEFAULT 0,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_results_job` FOREIGN KEY (`job_id`) REFERENCES `processing_jobs` (`id`) ON DELETE CASCADE,
    INDEX `idx_results_expires` (`expires_at`),
    INDEX `idx_results_expires_created` (`expires_at`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. FAILED_JOBS TABLE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `failed_jobs`;
CREATE TABLE `failed_jobs` (
    `id` VARCHAR(64) NOT NULL,
    `job_id` VARCHAR(64) NOT NULL UNIQUE,
    `error_code` VARCHAR(100) NOT NULL,
    `error_message` TEXT NOT NULL,
    `stack_trace` JSON DEFAULT NULL,
    `failed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_failed_jobs_job` FOREIGN KEY (`job_id`) REFERENCES `processing_jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. USAGE_LIMITS TABLE (Quota & Consumption Tracking)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `usage_limits`;
CREATE TABLE `usage_limits` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `period_date` DATE NOT NULL,
    `operations_count` INT NOT NULL DEFAULT 0,
    `ocr_pages_count` INT NOT NULL DEFAULT 0,
    `total_bytes_processed` BIGINT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_date` (`user_id`, `period_date`),
    INDEX `idx_usage_period` (`period_date`),
    CONSTRAINT `fk_usage_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. SECURITY_AUDIT_LOGS TABLE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `security_audit_logs`;
CREATE TABLE `security_audit_logs` (
    `id` VARCHAR(64) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `actor_email` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
    `user_agent` TEXT DEFAULT NULL,
    `details` JSON DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_audit_event` (`event_type`),
    INDEX `idx_audit_created` (`created_at`),
    INDEX `idx_audit_actor_created` (`actor_email`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. BANNED_IPS TABLE (Firewall)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `banned_ips`;
CREATE TABLE `banned_ips` (
    `id` VARCHAR(64) NOT NULL,
    `ip_address` VARCHAR(64) NOT NULL UNIQUE,
    `reason` VARCHAR(255) NOT NULL,
    `banned_by` VARCHAR(150) NOT NULL DEFAULT 'Mubinul Houqe',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_banned_ip` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- SEED INITIAL DEFAULT DATA
-- -----------------------------------------------------------------------------

-- Seed Subscription Plans
INSERT INTO `plans` (`id`, `name`, `slug`, `description`, `price_monthly`, `price_yearly`, `max_file_size_bytes`, `daily_operations_limit`, `ocr_monthly_pages`, `batch_file_limit`, `storage_retention_hours`, `is_active`)
VALUES 
('plan_free_001', 'Free Tier', 'free', 'Essential tools for casual document tasks', 0.00, 0.00, 26214400, 20, 15, 2, 1, 1),
('plan_pro_002', 'Pro Plan', 'pro', 'Powerhouse for freelancers and power users with batch processing and high limits', 9.00, 86.40, 262144000, 99999, 500, 10, 168, 1),
('plan_biz_003', 'Business Plan', 'business', 'Enterprise team collaboration with massive limits, REST API, and VIP queue', 29.00, 278.40, 1073741824, 99999, 3000, 50, 720, 1);

-- Seed Administrator Account
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `role`, `tier`, `api_key`, `email_verified_at`)
VALUES 
('usr_admin_001', 'mubinulhq@gmail.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6W6PfF.0hR8v17.4q', 'Mubinul Houqe', 'ADMIN', 'BUSINESS', 'ep_live_9a7d8c6b5e4f3a2b1c0e9d8c7b6a5f4e', NOW());
