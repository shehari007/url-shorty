-- ============================================================================
--  Pre-flight check, run this BEFORE 002_upgrade_v3.sql
--
--  Read-only. Changes nothing. It answers one question: will the upgrade
--  succeed on your data?
--
--  Paste into your SQL client against the live database, or:
--    mysql -h HOST -P PORT -u USER -p DBNAME < sql/000_preflight.sql
--
--  Every `problem_count` below must be 0. If any is not, fix it first, the
--  upgrade is additive and idempotent, so once fixed you can just re-run it.
-- ============================================================================

SELECT '--- 1. duplicate short codes (blocks the UNIQUE index) ---' AS check_name;
SELECT COUNT(*) AS problem_count
FROM (
  SELECT SUBSTRING_INDEX(short_url, '/', -1) AS code
  FROM shorty_url
  GROUP BY code
  HAVING COUNT(*) > 1
) d;

-- If the count above is > 0, this lists the offenders so you can fix them:
SELECT SUBSTRING_INDEX(short_url, '/', -1) AS duplicate_code,
       COUNT(*) AS times,
       GROUP_CONCAT(id) AS row_ids
FROM shorty_url
GROUP BY duplicate_code
HAVING COUNT(*) > 1
LIMIT 20;

SELECT '--- 2. codes longer than 32 chars (would not fit VARCHAR(32)) ---' AS check_name;
SELECT COUNT(*) AS problem_count
FROM shorty_url
WHERE CHAR_LENGTH(SUBSTRING_INDEX(short_url, '/', -1)) > 32;

SELECT '--- 3. short_url values longer than 255 chars ---' AS check_name;
SELECT COUNT(*) AS problem_count
FROM shorty_url
WHERE CHAR_LENGTH(short_url) > 255;

SELECT '--- 4. rows with an empty short_url (would get a legacy<id> code) ---' AS check_name;
SELECT COUNT(*) AS problem_count
FROM shorty_url
WHERE short_url IS NULL OR short_url = '';

SELECT '--- 5. contact rows whose status is outside the new ENUM ---' AS check_name;
SELECT COUNT(*) AS problem_count
FROM shorty_contact
WHERE status IS NOT NULL
  AND status NOT IN ('pending', 'read', 'replied', 'archived');

SELECT '--- 6. report rows whose status is outside the new ENUM ---' AS check_name;
SELECT COUNT(*) AS problem_count
FROM shorty_report
WHERE status IS NOT NULL
  AND status NOT IN ('pending', 'reviewed', 'actioned', 'dismissed');

SELECT '--- 7. size of the tables being altered (for timing expectations) ---' AS check_name;
SELECT 'shorty_url' AS table_name, COUNT(*) AS row_count FROM shorty_url
UNION ALL SELECT 'shorty_visits',   COUNT(*) FROM shorty_visits
UNION ALL SELECT 'shorty_report',   COUNT(*) FROM shorty_report
UNION ALL SELECT 'shorty_contact',  COUNT(*) FROM shorty_contact
UNION ALL SELECT 'shorty_analytics', COUNT(*) FROM shorty_analytics;

SELECT '--- 8. has the upgrade already been applied? ---' AS check_name;
SELECT COUNT(*) AS v3_columns_present
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'shorty_url'
  AND column_name IN ('short_code', 'url_hash', 'flagged', 'deleted_at');
-- 0 = not yet applied · 4 = already applied · anything between = partial, re-run the upgrade
