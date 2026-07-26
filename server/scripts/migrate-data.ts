/**
 * Copies a v2 Shorty database into a v3 one, transforming rows on the way.
 *
 * You only need this if you are moving to a DIFFERENT database. To upgrade the
 * database you already have, run `npm run db:setup -- upgrade` instead. It is
 * additive, in-place, and does not move any data.
 *
 *   npm run db:migrate-data -- --dry-run   # read + report, write nothing
 *   npm run db:migrate-data                # copy
 *   npm run db:migrate-data -- --verify    # compare source and target
 *
 * Properties:
 *  - The SOURCE is opened read-only in intent: this script issues no writes
 *    against it, ever.
 *  - Primary keys are preserved, so foreign keys and existing short URLs
 *    survive the move untouched.
 *  - Resumable and re-runnable: it continues after the highest id already in
 *    the target, and inserts ignore duplicates.
 *  - Keyset pagination (`WHERE id > ?`), so it streams large tables without
 *    loading them into memory or degrading on deep offsets.
 *
 * Source connection is read from SRC_* variables; the target is the normal
 * DB* configuration in your .env.
 */
import 'dotenv/config';
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import { sha256 } from '../src/lib/crypto.js';
import { parseUserAgent } from '../src/lib/request.js';

/* -------------------------------------------------------------------------- */
/*  Options                                                                   */
/* -------------------------------------------------------------------------- */

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERIFY_ONLY = args.includes('--verify');
const BATCH = Number(process.env.MIGRATE_BATCH_SIZE ?? 1000);

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Set the SRC_* variables to point at your existing database.`);
  }
  return value;
}

function sourceConfig() {
  return {
    host: required('SRC_DBHOST'),
    port: Number(process.env.SRC_DBPORT ?? 3306),
    user: required('SRC_DBUSERNAME'),
    password: process.env.SRC_DBPASS ?? '',
    database: required('SRC_DBNAME'),
    ssl: process.env.SRC_DB_SSL === 'false' ? undefined : { minVersion: 'TLSv1.2' as const, rejectUnauthorized: true },
    timezone: 'Z',
    dateStrings: false as const,
  };
}

function targetConfig() {
  return {
    host: required('DBHOST'),
    port: Number(process.env.DBPORT ?? 3306),
    user: required('DBUSERNAME'),
    password: process.env.DBPASS ?? '',
    database: required('DBNAME'),
    ssl: process.env.DB_SSL === 'false' ? undefined : { minVersion: 'TLSv1.2' as const, rejectUnauthorized: true },
    timezone: 'Z',
    dateStrings: false as const,
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const log = (message: string) => console.log(message);
const step = (message: string) => console.log(`\n▶ ${message}`);

async function tableExists(connection: Connection, table: string): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [table],
  );
  return Number(rows[0]?.n ?? 0) > 0;
}

async function columnsOf(connection: Connection, table: string): Promise<Set<string>> {
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT column_name AS c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
    [table],
  );
  return new Set(rows.map((row) => String(row.c)));
}

async function countRows(connection: Connection, table: string): Promise<number> {
  if (!(await tableExists(connection, table))) return -1;
  const [rows] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM \`${table}\``);
  return Number(rows[0]?.n ?? 0);
}

async function maxId(connection: Connection, table: string): Promise<number> {
  if (!(await tableExists(connection, table))) return 0;
  const [rows] = await connection.query<RowDataPacket[]>(`SELECT COALESCE(MAX(id), 0) AS n FROM \`${table}\``);
  return Number(rows[0]?.n ?? 0);
}

/** Derivations must match sql/002_upgrade_v3.sql and the live request path. */
function deriveShortCode(shortUrl: string | null, id: number): string {
  const tail = (shortUrl ?? '').split('/').filter(Boolean).pop();
  return tail && /^[A-Za-z0-9_-]{1,32}$/.test(tail) ? tail : `legacy${id}`;
}

function deriveDomain(mainUrl: string): string | null {
  try {
    return new URL(mainUrl).hostname.toLowerCase().replace(/\.$/, '').slice(0, 255) || null;
  } catch {
    // Fall back to string surgery for rows that predate URL validation.
    const host = mainUrl.split('://').pop()?.split('/')[0]?.split(':')[0]?.toLowerCase();
    return host ? host.slice(0, 255) : null;
  }
}

/**
 * Streams a table from source to target in keyset-paginated batches.
 * `transform` returns the ordered column values for one target row.
 */
async function copyTable<T extends RowDataPacket>(options: {
  source: Connection;
  target: Connection;
  table: string;
  columns: string[];
  transform: (row: T) => unknown[] | null;
  /** Extra per-row work, e.g. counting reports. */
  label?: string;
}): Promise<{ copied: number; skipped: number }> {
  const { source, target, table, columns, transform } = options;

  if (!(await tableExists(source, table))) {
    log(`  · ${table}: not present in source, skipping`);
    return { copied: 0, skipped: 0 };
  }
  if (!(await tableExists(target, table))) {
    throw new Error(`Target is missing table \`${table}\`. Run \`npm run db:setup\` against the target first.`);
  }

  const total = await countRows(source, table);
  // Resume after whatever is already there.
  let cursor = await maxId(target, table);
  if (cursor > 0) log(`  · ${table}: resuming after id ${cursor}`);

  const placeholders = `(${columns.map(() => '?').join(', ')})`;
  const insertSql = `INSERT IGNORE INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES `;

  let copied = 0;
  let skipped = 0;

  for (;;) {
    const [rows] = await source.query<T[]>(
      `SELECT * FROM \`${table}\` WHERE id > ? ORDER BY id ASC LIMIT ?`,
      [cursor, BATCH],
    );
    if (rows.length === 0) break;

    const values: unknown[] = [];
    let batchRows = 0;

    for (const row of rows) {
      const mapped = transform(row);
      if (mapped === null) {
        skipped += 1;
        continue;
      }
      values.push(...mapped);
      batchRows += 1;
    }

    if (batchRows > 0 && !DRY_RUN) {
      await target.query(insertSql + Array.from({ length: batchRows }, () => placeholders).join(', '), values);
    }

    copied += batchRows;
    cursor = Number(rows[rows.length - 1]!.id);

    const pct = total > 0 ? Math.min(100, Math.round((copied / total) * 100)) : 100;
    process.stdout.write(`\r  · ${table}: ${copied}/${total} (${pct}%)   `);
  }

  process.stdout.write(`\r  · ${table}: ${copied} rows${skipped ? `, ${skipped} skipped` : ''}${' '.repeat(20)}\n`);
  return { copied, skipped };
}

/* -------------------------------------------------------------------------- */
/*  Migration                                                                 */
/* -------------------------------------------------------------------------- */

async function migrate(source: Connection, target: Connection): Promise<void> {
  const sourceLinkColumns = await columnsOf(source, 'shorty_url');
  const hasV3Columns = sourceLinkColumns.has('short_code');
  if (hasV3Columns) {
    log('  (source already has v3 columns, existing values will be preserved where present)');
  }

  /* ---------------------------- 1. links --------------------------------- */

  step('Copying links');

  // Report counts come from the source so the denormalised column lands correct.
  const reportTally = new Map<number, number>();
  if (await tableExists(source, 'shorty_report')) {
    const [rows] = await source.query<RowDataPacket[]>(
      'SELECT url_id, COUNT(*) AS n FROM shorty_report WHERE url_id IS NOT NULL GROUP BY url_id',
    );
    for (const row of rows) reportTally.set(Number(row.url_id), Number(row.n));
  }

  // Latest click per link, for the last_clicked_at backfill.
  const lastClick = new Map<number, Date>();
  if (await tableExists(source, 'shorty_visits')) {
    const [rows] = await source.query<RowDataPacket[]>(
      'SELECT url_id, MAX(visited_at) AS last FROM shorty_visits GROUP BY url_id',
    );
    for (const row of rows) {
      if (row.last) lastClick.set(Number(row.url_id), new Date(row.last as string | Date));
    }
  }

  const linkColumns = [
    'id', 'short_code', 'short_url', 'main_url', 'url_hash', 'domain', 'title',
    'expired_status', 'blacklisted', 'flagged', 'times_clicked', 'qr_generated',
    'report_count', 'expires_at', 'last_clicked_at', 'deleted_at', 'admin_note',
    'req_ip', 'req_agent', 'time_issued',
  ];

  await copyTable<RowDataPacket>({
    source,
    target,
    table: 'shorty_url',
    columns: linkColumns,
    transform: (row) => {
      const id = Number(row.id);
      const mainUrl = String(row.main_url ?? '');
      if (!mainUrl) return null;

      const shortCode = (row.short_code as string | undefined) || deriveShortCode(row.short_url as string, id);

      return [
        id,
        shortCode,
        String(row.short_url ?? '').slice(0, 255),
        mainUrl,
        (row.url_hash as string | undefined) || sha256(mainUrl),
        (row.domain as string | undefined) ?? deriveDomain(mainUrl),
        (row.title as string | undefined) ?? null,
        Number(row.expired_status ?? 0),
        Number(row.blacklisted ?? 0),
        Number(row.flagged ?? 0),
        Number(row.times_clicked ?? 0),
        Number(row.qr_generated ?? 0),
        Number(row.report_count ?? reportTally.get(id) ?? 0),
        (row.expires_at as Date | undefined) ?? null,
        (row.last_clicked_at as Date | undefined) ?? lastClick.get(id) ?? null,
        (row.deleted_at as Date | undefined) ?? null,
        (row.admin_note as string | undefined) ?? null,
        (row.req_ip as string | undefined) ?? null,
        (row.req_agent as string | undefined) ?? null,
        (row.time_issued as Date | undefined) ?? new Date(),
      ];
    },
  });

  /* ---------------------------- 2. visits -------------------------------- */

  step('Copying visits (deriving device, browser, OS and bot flag from user agents)');

  await copyTable<RowDataPacket>({
    source,
    target,
    table: 'shorty_visits',
    columns: [
      'id', 'url_id', 'visitor_ip', 'visitor_agent', 'referer',
      'country', 'device', 'browser', 'os', 'is_bot', 'visited_at',
    ],
    transform: (row) => {
      const userAgent = String(row.visitor_agent ?? '');
      const ua = parseUserAgent(userAgent);

      return [
        Number(row.id),
        Number(row.url_id),
        (row.visitor_ip as string | undefined) ?? null,
        (row.visitor_agent as string | undefined) ?? null,
        (row.referer as string | undefined) ?? null,
        (row.country as string | undefined) ?? null,
        (row.device as string | undefined) ?? (userAgent ? ua.device : null),
        (row.browser as string | undefined) ?? ua.browser,
        (row.os as string | undefined) ?? ua.os,
        row.is_bot !== undefined && row.is_bot !== null ? Number(row.is_bot) : ua.isBot ? 1 : 0,
        (row.visited_at as Date | undefined) ?? new Date(),
      ];
    },
  });

  /* ---------------------------- 3. reports ------------------------------- */

  step('Copying reports');

  const validReasons = new Set(['phishing', 'malware', 'spam', 'adult', 'copyright', 'other']);
  const validReportStatus = new Set(['pending', 'reviewed', 'actioned', 'dismissed']);

  await copyTable<RowDataPacket>({
    source,
    target,
    table: 'shorty_report',
    columns: [
      'id', 'user_email', 'shorty_url', 'url_id', 'report_details', 'reason',
      'time_report', 'user_ip', 'user_agent', 'status',
      'reviewed_at', 'reviewed_by', 'resolution_note',
    ],
    transform: (row) => {
      const reason = String(row.reason ?? 'other');
      const status = String(row.status ?? 'pending');

      return [
        Number(row.id),
        String(row.user_email ?? '').slice(0, 255),
        String(row.shorty_url ?? '').slice(0, 255),
        row.url_id === null || row.url_id === undefined ? null : Number(row.url_id),
        (row.report_details as string | undefined) ?? null,
        validReasons.has(reason) ? reason : 'other',
        (row.time_report as Date | undefined) ?? new Date(),
        (row.user_ip as string | undefined) ?? null,
        (row.user_agent as string | undefined) ?? null,
        validReportStatus.has(status) ? status : 'pending',
        (row.reviewed_at as Date | undefined) ?? null,
        // reviewed_by references an admin account that does not exist in a v2
        // database; dropping it avoids a dangling reference.
        null,
        (row.resolution_note as string | undefined) ?? null,
      ];
    },
  });

  /* ---------------------------- 4. contacts ------------------------------ */

  step('Copying contact messages');

  const validContactStatus = new Set(['pending', 'read', 'replied', 'archived']);

  await copyTable<RowDataPacket>({
    source,
    target,
    table: 'shorty_contact',
    columns: [
      'id', 'fullname', 'email', 'subject', 'message', 'user_ip', 'user_agent',
      'time_sent', 'status', 'handled_at', 'handled_by', 'admin_note',
    ],
    transform: (row) => {
      const status = String(row.status ?? 'pending');

      return [
        Number(row.id),
        String(row.fullname ?? '').slice(0, 100),
        String(row.email ?? '').slice(0, 255),
        (row.subject as string | undefined) ?? null,
        String(row.message ?? ''),
        (row.user_ip as string | undefined) ?? null,
        (row.user_agent as string | undefined) ?? null,
        (row.time_sent as Date | undefined) ?? new Date(),
        validContactStatus.has(status) ? status : 'pending',
        (row.handled_at as Date | undefined) ?? null,
        null,
        (row.admin_note as string | undefined) ?? null,
      ];
    },
  });

  /* ---------------------------- 5. analytics ----------------------------- */

  step('Copying analytics events');

  await copyTable<RowDataPacket>({
    source,
    target,
    table: 'shorty_analytics',
    columns: ['id', 'event_type', 'event_data', 'event_ip', 'event_agent', 'event_time'],
    transform: (row) => [
      Number(row.id),
      String(row.event_type ?? 'unknown').slice(0, 50),
      (row.event_data as string | undefined) ?? null,
      (row.event_ip as string | undefined) ?? null,
      (row.event_agent as string | undefined) ?? null,
      (row.event_time as Date | undefined) ?? new Date(),
    ],
  });
}

/* -------------------------------------------------------------------------- */
/*  Verification                                                              */
/* -------------------------------------------------------------------------- */

const TABLES = ['shorty_url', 'shorty_visits', 'shorty_report', 'shorty_contact', 'shorty_analytics'];

async function verify(source: Connection, target: Connection): Promise<boolean> {
  step('Verifying');

  let ok = true;

  log('  Row counts');
  for (const table of TABLES) {
    const from = await countRows(source, table);
    const to = await countRows(target, table);
    if (from < 0) {
      log(`    ${table.padEnd(18)} not in source`);
      continue;
    }
    const match = from === to;
    if (!match) ok = false;
    log(`    ${table.padEnd(18)} source ${String(from).padStart(8)}  target ${String(to).padStart(8)}  ${match ? '✔' : '✖ MISMATCH'}`);
  }

  log('\n  Data integrity in target');
  const checks: [string, string][] = [
    ['links missing short_code', "SELECT COUNT(*) AS n FROM shorty_url WHERE short_code IS NULL OR short_code = ''"],
    ['links missing url_hash', "SELECT COUNT(*) AS n FROM shorty_url WHERE url_hash IS NULL OR url_hash = ''"],
    ['duplicate short_codes', 'SELECT COUNT(*) AS n FROM (SELECT short_code FROM shorty_url GROUP BY short_code HAVING COUNT(*) > 1) d'],
    ['visits with no matching link', 'SELECT COUNT(*) AS n FROM shorty_visits v LEFT JOIN shorty_url u ON u.id = v.url_id WHERE u.id IS NULL'],
    ['reports with dangling url_id', 'SELECT COUNT(*) AS n FROM shorty_report r LEFT JOIN shorty_url u ON u.id = r.url_id WHERE r.url_id IS NOT NULL AND u.id IS NULL'],
  ];

  for (const [label, sql] of checks) {
    const [rows] = await target.query<RowDataPacket[]>(sql);
    const n = Number(rows[0]?.n ?? 0);
    if (n !== 0) ok = false;
    log(`    ${label.padEnd(30)} ${String(n).padStart(6)}  ${n === 0 ? '✔' : '✖'}`);
  }

  // Spot-check that click totals survived the move.
  const [srcClicks] = await source.query<RowDataPacket[]>('SELECT COALESCE(SUM(times_clicked), 0) AS n FROM shorty_url');
  const [dstClicks] = await target.query<RowDataPacket[]>('SELECT COALESCE(SUM(times_clicked), 0) AS n FROM shorty_url');
  const clicksMatch = Number(srcClicks[0]?.n) === Number(dstClicks[0]?.n);
  if (!clicksMatch) ok = false;
  log(`    ${'total clicks preserved'.padEnd(30)} ${String(dstClicks[0]?.n).padStart(6)}  ${clicksMatch ? '✔' : '✖'}`);

  return ok;
}

/* -------------------------------------------------------------------------- */
/*  Entry point                                                               */
/* -------------------------------------------------------------------------- */

async function main(): Promise<void> {
  const src = sourceConfig();
  const dst = targetConfig();

  if (src.host === dst.host && src.database === dst.database && src.port === dst.port) {
    throw new Error(
      'Source and target are the same database.\n' +
        '   To upgrade a database in place, use `npm run db:setup -- upgrade` instead. It does not copy data.',
    );
  }

  log('\n╭──────────────────────────────────────────────╮');
  log('│  Shorty, v2 → v3 data migration             │');
  log('╰──────────────────────────────────────────────╯');
  log(`  source : ${src.user}@${src.host}:${src.port}/${src.database}  (read-only)`);
  log(`  target : ${dst.user}@${dst.host}:${dst.port}/${dst.database}`);
  log(`  mode   : ${VERIFY_ONLY ? 'verify only' : DRY_RUN ? 'DRY RUN (no writes)' : 'copy'}`);
  log(`  batch  : ${BATCH}`);

  const source = await mysql.createConnection(src);
  const target = await mysql.createConnection(dst);

  try {
    // Confirm the target actually has the v3 schema before touching anything.
    if (!(await tableExists(target, 'shorty_url'))) {
      throw new Error('Target has no `shorty_url` table. Run `npm run db:setup` against the target first.');
    }
    if (!(await columnsOf(target, 'shorty_url')).has('short_code')) {
      throw new Error('Target is not on the v3 schema. Run `npm run db:setup` against the target first.');
    }

    if (!VERIFY_ONLY) {
      // Copy links before their children, and skip FK checks during the load so
      // batch order can never trip a constraint mid-run.
      if (!DRY_RUN) await target.query('SET FOREIGN_KEY_CHECKS = 0');
      try {
        await migrate(source, target);
      } finally {
        if (!DRY_RUN) await target.query('SET FOREIGN_KEY_CHECKS = 1');
      }
    }

    if (DRY_RUN) {
      log('\n✅ Dry run complete, nothing was written.\n');
      return;
    }

    const ok = await verify(source, target);

    if (ok) {
      log('\n✅ Migration complete and verified.');
      log('   Next: `npm run admin:create` against the target, then point SHORTURLDEF/DB* at it.\n');
    } else {
      log('\n⚠  Migration finished but verification found differences. Review the ✖ rows above.');
      log('   Re-running is safe. It resumes and ignores duplicates.\n');
      process.exitCode = 1;
    }
  } finally {
    await source.end().catch(() => undefined);
    await target.end().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
