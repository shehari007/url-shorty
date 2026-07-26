/**
 * Applies a SQL file from `sql/` against the configured database.
 *
 *   npm run db:setup             # 001_baseline.sql   (fresh install)
 *   npm run db:setup -- upgrade  # 002_upgrade_v3.sql (existing v2 database)
 *
 * Statements run one at a time so a failure names the statement that broke.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

const here = dirname(fileURLToPath(import.meta.url));

const target = process.argv[2] === 'upgrade' ? '002_upgrade_v3.sql' : '001_baseline.sql';
const sqlPath = resolve(here, '..', 'sql', target);

/** Split on `;` at end-of-statement while ignoring comments and quoted text. */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let quote: string | null = null;
  let lineComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i]!;
    const next = sql[i + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      else continue;
    }

    if (!quote && ((char === '-' && next === '-') || char === '#')) {
      lineComment = true;
      continue;
    }

    if (quote) {
      if (char === '\\') {
        current += char + (next ?? '');
        i += 1;
        continue;
      }
      if (char === quote) quote = null;
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char;
    }

    if (char === ';' && !quote) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

async function main(): Promise<void> {
  const sql = await readFile(sqlPath, 'utf8');
  const statements = splitStatements(sql);

  console.log(`\n▶ Applying ${target} to ${env.DBNAME} @ ${env.DBHOST}`);
  console.log(`  ${statements.length} statements\n`);

  const connection = await mysql.createConnection({
    host: env.DBHOST,
    port: env.DBPORT,
    user: env.DBUSERNAME,
    password: env.DBPASS,
    database: env.DBNAME,
    multipleStatements: false,
    ssl: env.DB_SSL ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  });

  let applied = 0;
  try {
    for (const [index, statement] of statements.entries()) {
      const label = statement.replace(/\s+/g, ' ').slice(0, 78);
      try {
        await connection.query(statement);
        applied += 1;
        console.log(`  ✔ [${index + 1}/${statements.length}] ${label}`);
      } catch (error) {
        const code = (error as { code?: string }).code;
        // Re-running a migration is expected to hit these, keep going.
        if (code === 'ER_DUP_FIELDNAME' || code === 'ER_DUP_KEYNAME' || code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`  ↷ [${index + 1}/${statements.length}] already applied, ${label}`);
          continue;
        }
        console.error(`\n  ✖ [${index + 1}/${statements.length}] ${label}`);
        throw error;
      }
    }
    console.log(`\n✅ Done, ${applied} statements applied.\n`);
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  console.error('\n❌ Migration failed:', error instanceof Error ? error.message : error, '\n');
  process.exit(1);
});
