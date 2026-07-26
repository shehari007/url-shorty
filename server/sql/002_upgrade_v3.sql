-- ============================================================================
--  Shorty v2 → v3 upgrade
--
--  Run against an existing v2 database:
--      npm run db:setup -- upgrade
--
--  It is additive. No column is dropped and no row is deleted. So v2 code
--  keeps working while you roll out v3.
--
--  Portability: every change is its own statement and none use
--  `IF NOT EXISTS` (stock MySQL 8.0 rejects that on ADD COLUMN, TiDB accepts
--  it). Re-running is safe: the runner in scripts/setup-db.ts skips
--  "already exists" errors and carries on. Applying it by piping straight into
--  the `mysql` client also works. You will just see those errors reported.
--
--  ⚠ Take a backup first:
--     mysqldump --single-transaction -h HOST -P PORT -u USER -p DBNAME > backup.sql
-- ============================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
--  1. shorty_url, widen and add columns
-- ---------------------------------------------------------------------------

-- The full short URL outgrew VARCHAR(50) once custom domains are in play.
ALTER TABLE `shorty_url` MODIFY COLUMN `short_url` VARCHAR(255) NOT NULL;

ALTER TABLE `shorty_url` ADD COLUMN `short_code` VARCHAR(32) NULL AFTER `id`;
ALTER TABLE `shorty_url` ADD COLUMN `url_hash` CHAR(64) NULL AFTER `main_url`;
ALTER TABLE `shorty_url` ADD COLUMN `domain` VARCHAR(255) NULL;
ALTER TABLE `shorty_url` ADD COLUMN `title` VARCHAR(255) NULL;

-- `flagged` was referenced by v2 application code but never existed in the
-- schema, so every auto-flag UPDATE was silently failing.
ALTER TABLE `shorty_url` ADD COLUMN `flagged` TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE `shorty_url` ADD COLUMN `report_count` INT NOT NULL DEFAULT 0;
ALTER TABLE `shorty_url` ADD COLUMN `expires_at` DATETIME NULL;
ALTER TABLE `shorty_url` ADD COLUMN `last_clicked_at` DATETIME NULL;
ALTER TABLE `shorty_url` ADD COLUMN `deleted_at` DATETIME NULL;
ALTER TABLE `shorty_url` ADD COLUMN `admin_note` VARCHAR(500) NULL;

-- ---------------------------------------------------------------------------
--  2. shorty_url, backfill the new columns
-- ---------------------------------------------------------------------------

-- v2 stored the whole short URL; v3 resolves redirects by the bare code.
UPDATE `shorty_url`
   SET `short_code` = SUBSTRING_INDEX(`short_url`, '/', -1)
 WHERE `short_code` IS NULL OR `short_code` = '';

-- sha256 of the destination, so dedupe stops full-scanning a TEXT column.
UPDATE `shorty_url`
   SET `url_hash` = SHA2(`main_url`, 256)
 WHERE `url_hash` IS NULL OR `url_hash` = '';

-- Destination host, denormalised for admin filtering and abuse triage.
UPDATE `shorty_url`
   SET `domain` = LOWER(SUBSTRING_INDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(`main_url`, '://', -1), '/', 1), ':', 1))
 WHERE `domain` IS NULL;

-- Denormalised report counter used by the admin list and auto-block logic.
UPDATE `shorty_url` u
   SET u.`report_count` = (SELECT COUNT(*) FROM `shorty_report` r WHERE r.`url_id` = u.`id`);

-- Best-effort backfill of the most recent click from the visit history.
UPDATE `shorty_url` u
   SET u.`last_clicked_at` = (SELECT MAX(v.`visited_at`) FROM `shorty_visits` v WHERE v.`url_id` = u.`id`)
 WHERE u.`last_clicked_at` IS NULL;

-- Any row that somehow still has no code gets a placeholder, so the NOT NULL
-- and UNIQUE constraints below can be applied without losing the row.
UPDATE `shorty_url`
   SET `short_code` = CONCAT('legacy', `id`)
 WHERE `short_code` IS NULL OR `short_code` = '';

-- ---------------------------------------------------------------------------
--  3. shorty_url, tighten and index
-- ---------------------------------------------------------------------------

ALTER TABLE `shorty_url` MODIFY COLUMN `short_code` VARCHAR(32) NOT NULL;
ALTER TABLE `shorty_url` MODIFY COLUMN `url_hash` CHAR(64) NOT NULL;

ALTER TABLE `shorty_url` ADD UNIQUE INDEX `uq_short_code` (`short_code`);
ALTER TABLE `shorty_url` ADD INDEX `idx_url_hash` (`url_hash`);
ALTER TABLE `shorty_url` ADD INDEX `idx_flagged` (`flagged`);
ALTER TABLE `shorty_url` ADD INDEX `idx_domain` (`domain`);
ALTER TABLE `shorty_url` ADD INDEX `idx_expires_at` (`expires_at`);
ALTER TABLE `shorty_url` ADD INDEX `idx_deleted_at` (`deleted_at`);

-- ---------------------------------------------------------------------------
--  4. shorty_visits, richer analytics dimensions
-- ---------------------------------------------------------------------------

ALTER TABLE `shorty_visits` ADD COLUMN `country` VARCHAR(2) NULL;
ALTER TABLE `shorty_visits` ADD COLUMN `device` VARCHAR(20) NULL;
ALTER TABLE `shorty_visits` ADD COLUMN `browser` VARCHAR(50) NULL;
ALTER TABLE `shorty_visits` ADD COLUMN `os` VARCHAR(50) NULL;
ALTER TABLE `shorty_visits` ADD COLUMN `is_bot` TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE `shorty_visits` ADD INDEX `idx_url_visited` (`url_id`, `visited_at`);

-- ---------------------------------------------------------------------------
--  5. shorty_report, moderation trail
-- ---------------------------------------------------------------------------

ALTER TABLE `shorty_report`
  ADD COLUMN `reason` ENUM('phishing','malware','spam','adult','copyright','other')
  NOT NULL DEFAULT 'other' AFTER `report_details`;

ALTER TABLE `shorty_report` ADD COLUMN `reviewed_at` DATETIME NULL;
ALTER TABLE `shorty_report` ADD COLUMN `reviewed_by` INT NULL;
ALTER TABLE `shorty_report` ADD COLUMN `resolution_note` VARCHAR(500) NULL;

ALTER TABLE `shorty_report` MODIFY COLUMN `shorty_url` VARCHAR(255) NOT NULL;
ALTER TABLE `shorty_report` ADD INDEX `idx_report_url_id` (`url_id`);

-- ---------------------------------------------------------------------------
--  6. shorty_contact, handling trail
-- ---------------------------------------------------------------------------

ALTER TABLE `shorty_contact` ADD COLUMN `subject` VARCHAR(150) NULL AFTER `email`;
ALTER TABLE `shorty_contact` ADD COLUMN `handled_at` DATETIME NULL;
ALTER TABLE `shorty_contact` ADD COLUMN `handled_by` INT NULL;
ALTER TABLE `shorty_contact` ADD COLUMN `admin_note` VARCHAR(500) NULL;

ALTER TABLE `shorty_contact`
  MODIFY COLUMN `status` ENUM('pending','read','replied','archived') NOT NULL DEFAULT 'pending';

-- ---------------------------------------------------------------------------
--  7. New v3 tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `shorty_admin_user` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `email`           VARCHAR(255) NOT NULL,
  `name`            VARCHAR(100) NOT NULL,
  `password_hash`   VARCHAR(255) NOT NULL,
  `role`            ENUM('owner','admin','moderator') NOT NULL DEFAULT 'moderator',
  `is_active`       TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at`   DATETIME DEFAULT NULL,
  `last_login_ip`   VARCHAR(45) DEFAULT NULL,
  `failed_attempts` INT NOT NULL DEFAULT 0,
  `locked_until`    DATETIME DEFAULT NULL,
  `token_version`   INT NOT NULL DEFAULT 0,
  `created_at`      DATETIME NOT NULL,
  `updated_at`      DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_email` (`email`),
  KEY `idx_admin_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shorty_admin_session` (
  `id`                 INT NOT NULL AUTO_INCREMENT,
  `admin_id`           INT NOT NULL,
  `refresh_token_hash` CHAR(64) NOT NULL,
  `user_agent`         VARCHAR(255) DEFAULT NULL,
  `ip`                 VARCHAR(45) DEFAULT NULL,
  `expires_at`         DATETIME NOT NULL,
  `revoked_at`         DATETIME DEFAULT NULL,
  `created_at`         DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refresh_token` (`refresh_token_hash`),
  KEY `idx_session_admin` (`admin_id`),
  KEY `idx_session_expires` (`expires_at`),
  CONSTRAINT `fk_session_admin` FOREIGN KEY (`admin_id`) REFERENCES `shorty_admin_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shorty_audit_log` (
  `id`          BIGINT NOT NULL AUTO_INCREMENT,
  `admin_id`    INT DEFAULT NULL,
  `admin_email` VARCHAR(255) DEFAULT NULL,
  `action`      VARCHAR(64) NOT NULL,
  `entity`      VARCHAR(32) NOT NULL,
  `entity_id`   VARCHAR(64) DEFAULT NULL,
  `meta`        TEXT DEFAULT NULL,
  `ip`          VARCHAR(45) DEFAULT NULL,
  `user_agent`  VARCHAR(255) DEFAULT NULL,
  `created_at`  DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_admin` (`admin_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_entity` (`entity`, `entity_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shorty_blocked_domain` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `domain`     VARCHAR(255) NOT NULL,
  `reason`     VARCHAR(255) DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blocked_domain` (`domain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shorty_setting` (
  `setting_key`   VARCHAR(64) NOT NULL,
  `setting_value` TEXT DEFAULT NULL,
  `updated_by`    INT DEFAULT NULL,
  `updated_at`    DATETIME NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  8. Verify. Each of these should return 0
-- ---------------------------------------------------------------------------
--
--    SELECT COUNT(*) FROM shorty_url WHERE short_code IS NULL OR short_code = '';
--    SELECT COUNT(*) FROM shorty_url WHERE url_hash  IS NULL OR url_hash  = '';
--    SELECT COUNT(*) FROM (
--      SELECT short_code FROM shorty_url GROUP BY short_code HAVING COUNT(*) > 1
--    ) dupes;
--
--  Then create the first administrator:  npm run admin:create
-- ---------------------------------------------------------------------------
