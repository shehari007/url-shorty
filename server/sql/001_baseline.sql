-- ============================================================================
--  Shorty v3, baseline schema (fresh install)
--  MySQL 8.0 / TiDB compatible.
--
--  For an EXISTING v2 database, run 002_upgrade_v3.sql instead. This file
--  assumes the tables do not exist yet.
-- ============================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
--  Links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shorty_url` (
  `id`             INT NOT NULL AUTO_INCREMENT,
  `short_code`     VARCHAR(32)  NOT NULL,
  `short_url`      VARCHAR(255) NOT NULL,
  `main_url`       TEXT         NOT NULL,
  `url_hash`       CHAR(64)     NOT NULL,
  `domain`         VARCHAR(255) DEFAULT NULL,
  `title`          VARCHAR(255) DEFAULT NULL,
  `expired_status` TINYINT(1)   NOT NULL DEFAULT 0,
  `blacklisted`    TINYINT(1)   NOT NULL DEFAULT 0,
  `flagged`        TINYINT(1)   NOT NULL DEFAULT 0,
  `times_clicked`  INT          NOT NULL DEFAULT 0,
  `qr_generated`   INT          NOT NULL DEFAULT 0,
  `report_count`   INT          NOT NULL DEFAULT 0,
  `expires_at`     DATETIME     DEFAULT NULL,
  `last_clicked_at` DATETIME    DEFAULT NULL,
  `deleted_at`     DATETIME     DEFAULT NULL,
  `admin_note`     VARCHAR(500) DEFAULT NULL,
  `req_ip`         VARCHAR(45)  DEFAULT NULL,
  `req_agent`      TEXT         DEFAULT NULL,
  `time_issued`    DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_short_code` (`short_code`),
  UNIQUE KEY `short_url` (`short_url`),
  KEY `idx_url_hash` (`url_hash`),
  KEY `idx_time_issued` (`time_issued`),
  KEY `idx_blacklisted` (`blacklisted`),
  KEY `idx_flagged` (`flagged`),
  KEY `idx_domain` (`domain`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  Visits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shorty_visits` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `url_id`        INT NOT NULL,
  `visitor_ip`    VARCHAR(45)  DEFAULT NULL,
  `visitor_agent` TEXT         DEFAULT NULL,
  `referer`       TEXT         DEFAULT NULL,
  `country`       VARCHAR(2)   DEFAULT NULL,
  `device`        VARCHAR(20)  DEFAULT NULL,
  `browser`       VARCHAR(50)  DEFAULT NULL,
  `os`            VARCHAR(50)  DEFAULT NULL,
  `is_bot`        TINYINT(1)   NOT NULL DEFAULT 0,
  `visited_at`    DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_url_id` (`url_id`),
  KEY `idx_visited_at` (`visited_at`),
  KEY `idx_visitor_ip` (`visitor_ip`),
  KEY `idx_url_visited` (`url_id`, `visited_at`),
  CONSTRAINT `fk_visits_url` FOREIGN KEY (`url_id`) REFERENCES `shorty_url` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  Reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shorty_report` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `user_email`      VARCHAR(255) NOT NULL,
  `shorty_url`      VARCHAR(255) NOT NULL,
  `url_id`          INT DEFAULT NULL,
  `report_details`  TEXT DEFAULT NULL,
  `reason`          ENUM('phishing','malware','spam','adult','copyright','other') NOT NULL DEFAULT 'other',
  `time_report`     DATETIME NOT NULL,
  `user_ip`         VARCHAR(45) DEFAULT NULL,
  `user_agent`      TEXT DEFAULT NULL,
  `status`          ENUM('pending','reviewed','actioned','dismissed') NOT NULL DEFAULT 'pending',
  `reviewed_at`     DATETIME DEFAULT NULL,
  `reviewed_by`     INT DEFAULT NULL,
  `resolution_note` VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_shorty_url` (`shorty_url`),
  KEY `idx_time_report` (`time_report`),
  KEY `idx_status` (`status`),
  KEY `idx_user_ip` (`user_ip`),
  KEY `idx_report_url_id` (`url_id`),
  CONSTRAINT `fk_report_url` FOREIGN KEY (`url_id`) REFERENCES `shorty_url` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  Contact messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shorty_contact` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `fullname`   VARCHAR(100) NOT NULL,
  `email`      VARCHAR(255) NOT NULL,
  `subject`    VARCHAR(150) DEFAULT NULL,
  `message`    TEXT NOT NULL,
  `user_ip`    VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `time_sent`  DATETIME NOT NULL,
  `status`     ENUM('pending','read','replied','archived') NOT NULL DEFAULT 'pending',
  `handled_at` DATETIME DEFAULT NULL,
  `handled_by` INT DEFAULT NULL,
  `admin_note` VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_time_sent` (`time_sent`),
  KEY `idx_contact_status` (`status`),
  KEY `idx_contact_user_ip` (`user_ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  Analytics events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shorty_analytics` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `event_type`  VARCHAR(50) NOT NULL,
  `event_data`  TEXT DEFAULT NULL,
  `event_ip`    VARCHAR(45) DEFAULT NULL,
  `event_agent` TEXT DEFAULT NULL,
  `event_time`  DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_event_time` (`event_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  Admin users & sessions
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

-- ---------------------------------------------------------------------------
--  Audit log
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
--  Blocked domains & settings
-- ---------------------------------------------------------------------------
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
