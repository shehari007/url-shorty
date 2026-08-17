# Shorty API

Express 5 + Drizzle ORM + TypeScript. Serves the public JSON API, the admin
control plane, and the short-link redirects themselves.

## Requirements

- Node.js **20.9+**
- MySQL **8.0** or TiDB (MySQL 8.0 compatible)

## Setup

```bash
npm install
cp .env.example .env
```

Generate a signing secret and put it in `ADMIN_JWT_SECRET`:

```bash
openssl rand -base64 48
```

Then create the schema:

```bash
npm run db:setup            # fresh install  → sql/001_baseline.sql
npm run db:setup -- upgrade # existing v2 db → sql/002_upgrade_v3.sql
npm run admin:create        # first owner account
npm run dev
```

Every environment variable is validated at boot by `src/config/env.ts`, so a
missing or malformed value fails immediately with a readable message rather than
surfacing as a 500 later.

## Environment

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` · `test` · `production` |
| `PORT` | `8080` | Ignored on Vercel |
| `LOG_LEVEL` | `info` | pino level, or `silent` |
| `DBHOST` / `DBPORT` |, / `3306` | **Required** host |
| `DBUSERNAME` / `DBPASS` |, / `''` | **Required** user |
| `DBNAME` |, | **Required** |
| `DB_SSL` | `true` | Required by TiDB Cloud and most managed MySQL |
| `DB_POOL_SIZE` | `5` | Keep small. Every warm lambda holds its own pool |
| `SHORTURLDEF` |, | **Required.** Redirect origin, e.g. `https://short.msyb.dev/` |
| `PARAMLEN` | `6` | Length of newly generated codes (4-16) |
| `DOMAINS` | `http://localhost:3000` | Comma-separated CORS allow-list |
| `HOMEPAGE_LINK` / `CONTACTUS_LINK` | localhost | Used by the redirect interstitial pages |
| `TRUST_PROXY_HOPS` | `1` | Proxies in front of the app. A wrong value makes rate limits spoofable |
| `TRUSTED_IP_HEADER` | _unset_ | Header to read the client IP from, e.g. `cf-connecting-ip`. Only set it if your proxy overwrites that header on every request; otherwise clients can spoof their address |

> [!IMPORTANT]
> Client IPs come from `req.ip`, which Express derives from `X-Forwarded-For` using
> `TRUST_PROXY_HOPS`. Admin sign-in reaches this API through the web app's BFF rather than
> directly from the browser, so on a platform where the edge sets a trustworthy header
> (Vercel's `x-vercel-forwarded-for`, Cloudflare's `cf-connecting-ip`) set
> `TRUSTED_IP_HEADER` to it — otherwise `lastLoginIp` and the login audit entries record
> the web app's egress address instead of the operator's.
| `ADMIN_JWT_SECRET` |, | **Required, 32+ chars.** Changing it signs everyone out |
| `ADMIN_ACCESS_TTL_MIN` | `30` | Access-token lifetime (5-720) |
| `ADMIN_REFRESH_TTL_DAYS` | `7` | Refresh-token lifetime (1-90) |
| `ADMIN_MAX_FAILED_LOGINS` | `5` | Failed sign-ins before lockout |
| `ADMIN_LOCKOUT_MINUTES` | `15` | Lockout duration |
| `AUTO_FLAG_THRESHOLD` | `3` | Reports before a link is flagged for review |
| `AUTO_BLOCK_THRESHOLD` | `8` | Reports before a link is taken offline automatically |
| `BLOCK_PRIVATE_HOSTS` | `true` | SSRF guard, leave on |
| `ALLOW_HTTP_TARGETS` | `false` | Off means https-only destinations |

## API

Every JSON response shares one envelope:

```jsonc
// success
{ "success": true, "data": { }, "meta": { } }
// failure
{ "success": false, "error": { "code": "…", "message": "…", "issues": [] }, "requestId": "…" }
```

### Public, `/api/v1`

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/links` | Create a short link |
| `POST` | `/links/stats` | Aggregate analytics for one link |
| `POST` | `/links/qr` | Record a QR download |
| `GET` | `/links/:code/exists` | Cheap existence probe |
| `GET` | `/stats` | Platform totals + 14-day trend |
| `GET` | `/stats/leaderboard` | Most-clicked links |
| `POST` | `/reports` | Submit an abuse report |
| `POST` | `/contact` | Contact form |

### Admin, `/api/v1/admin`

Auth: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`,
`GET /auth/me`, `POST /auth/password`.

Everything else needs `Authorization: Bearer <accessToken>`:

| Method | Path | Minimum role |
| --- | --- | --- |
| `GET` | `/dashboard` · `/audit` | moderator |
| `GET` `POST` `PATCH` `DELETE` | `/links`, `/links/:id`, `/links/bulk`, `/links/:id/restore` | moderator |
| `DELETE` | `/links/:id/purge` | **owner** |
| `GET` `PATCH` | `/reports`, `/reports/:id` | moderator |
| `DELETE` | `/reports/:id` | admin |
| `GET` `PATCH` | `/contacts`, `/contacts/:id` | moderator |
| `DELETE` | `/contacts/:id` | admin |
| `GET` | `/blocked-domains` | moderator |
| `POST` `DELETE` | `/blocked-domains`, `/blocked-domains/:id` | admin |

> [!NOTE]
> `POST /blocked-domains` is retroactive. A leading `www.` is stripped before the entry is
> stored, so one row covers the apex, `www.` and every subdomain, and every existing link
> whose domain matches is blacklisted and flagged in the same request. The response and the
> audit entry carry `linksTakenDown`. Removing the entry does **not** unblock those links:
> some may have been blacklisted by a moderator or by the report threshold, so restoring
> them stays a deliberate bulk action.
| `GET` `POST` `PATCH` | `/admins`, `/admins/:id`, `/admins/:id/revoke-sessions` | **owner** |

### Redirects & health

- `GET /:code` and `GET /co/:code`, 302 to the destination, or a branded
  interstitial (404 not found · 410 expired · 410 blocked). Click tracking runs
  after the response is flushed, so analytics never delay or break a redirect.
- `GET /health`, liveness plus a database round-trip.

### Legacy compatibility

The v2 `POST /api/shorty-url` action endpoint still works. It reshapes the old
payloads onto the new handlers, so `generate`, `stats`, `perLinkStats`,
`contact`, `report` and `trackQr` keep functioning for anything still calling it.

## Database

The schema lives in `src/db/schema.ts` (Drizzle) and, as plain SQL, in `sql/`.

### Upgrading an existing v2 database

`sql/002_upgrade_v3.sql` is additive. No column is dropped, no row is deleted, so v2 code keeps working during the rollout. It is idempotent: re-running skips
anything already applied.

**Back up first:**

```bash
mysqldump --single-transaction -h HOST -P PORT -u USER -p DBNAME > backup.sql
npm run db:setup -- upgrade
```

What it changes:

- **`shorty_url`**, adds `short_code` (backfilled from `short_url`; this is now
  the redirect lookup key), `url_hash` (sha256 of the destination, so dedupe no
  longer full-scans a TEXT column), `domain`, `title`, `report_count`,
  `expires_at`, `last_clicked_at`, `deleted_at`, `admin_note`, and **`flagged`**, which v2 application code already wrote to but which never existed in the
  schema, meaning every auto-flag update was silently failing.
- **`shorty_visits`**, adds `country`, `device`, `browser`, `os`, `is_bot`, and a
  composite `(url_id, visited_at)` index.
- **`shorty_report`**, adds `reason`, `reviewed_at`, `reviewed_by`, `resolution_note`.
- **`shorty_contact`**, adds `subject`, `handled_at`, `handled_by`, `admin_note`.
- **New tables**, `shorty_admin_user`, `shorty_admin_session`, `shorty_audit_log`,
  `shorty_blocked_domain`, `shorty_setting`.

Verify afterwards. Each of these should return `0`:

```sql
SELECT COUNT(*) FROM shorty_url WHERE short_code IS NULL OR short_code = '';
SELECT COUNT(*) FROM shorty_url WHERE url_hash  IS NULL OR url_hash  = '';
SELECT COUNT(*) FROM (
  SELECT short_code FROM shorty_url GROUP BY short_code HAVING COUNT(*) > 1
) dupes;
```

> **Note on older backups.** Dumps taken from TiDB before this release name both
> foreign keys `fk_1`. TiDB scopes constraint names per table; stock MySQL 8
> requires them to be unique per database, so such a dump **fails to restore into
> MySQL** with `ERROR 1826: Duplicate foreign key constraint name 'fk_1'`. This
> affects only the dump file, a live TiDB database is unaffected, and the
> in-place upgrade above does not touch foreign keys. The schema here uses
> distinct names (`fk_visits_url`, `fk_report_url`). To restore an old dump into
> MySQL, rename one of the two constraints first:
>
> ```bash
> sed -i '0,/fk_1/{s/fk_1/fk_report_url/}' dump.sql   # first occurrence only
> ```

### Copying to a different database

Only needed if you are **moving** to a new database rather than upgrading the one
you have. `scripts/migrate-data.ts` reads a v2 database and writes a v3 one,
deriving the new columns as it goes.

```bash
# 1. Point DB* at the new database and SRC_DB* at the old one
#    (both sets live in .env, see .env.example)
npm run db:setup                  # create the v3 schema in the TARGET
npm run db:migrate-data -- --dry-run
npm run db:migrate-data
npm run db:migrate-data -- --verify
```

Behaviour:

- **The source is never written to.** The script issues no writes against it.
- **Primary keys are preserved**, so existing short URLs, foreign keys and click
  counts survive the move exactly.
- **Resumable and re-runnable**. It continues after the highest id already in
  the target and ignores duplicates, so an interrupted run is safe to repeat.
- **Streams in batches** using keyset pagination, so large `shorty_visits` tables
  do not have to fit in memory.
- Derives `short_code`, `url_hash`, `domain`, `report_count` and
  `last_clicked_at` for links, and `device` / `browser` / `os` / `is_bot` for
  historical visits, reusing the same `parseUserAgent` the live request path
  uses, so old and new rows are classified identically.
- Refuses to run if source and target are the same database, or if the target is
  not on the v3 schema.

It finishes with a verification pass: row counts on both sides, orphan and
duplicate checks, and a click-total comparison.

> Because bot classification is applied retroactively, per-link analytics after a
> migration may show noticeably fewer *human* clicks than the legacy
> `times_clicked` counter. That counter is preserved as-is; the new figures
> simply exclude crawlers and link-preview bots, which the v2 code counted.

## A note on the TypeScript version

`typescript` is pinned to an exact **5.9.3**, not a caret range. This is
deliberate, so please do not "upgrade" it.

`@vercel/node` compiles the serverless function through TypeScript's
*programmatic* API (`ts.sys`, `ts.createProgram`, `ts.transpileModule`), and it
prefers a locally installed TypeScript over its own bundled copy. The 7.x npm
package ships the native Go compiler and does not expose that JavaScript API at
all, so a Vercel build with TypeScript 7 installed fails with:

```text
Using TypeScript 7.0.2 (local user-provided)
Error: Cannot read properties of undefined (reading 'readFile')
```

| API used by `@vercel/node` | TypeScript 7.0.2 | TypeScript 5.9.3 |
| --- | --- | --- |
| `ts.sys` | undefined | object |
| `ts.sys.readFile` | not available | function |
| `ts.createProgram` | undefined | function |
| `ts.transpileModule` | undefined | function |

5.9.3 is the exact version `@vercel/node@5.x` bundles. The CLI (`tsc --noEmit`)
works fine on 7.x, so this only surfaces at deploy time, never locally. Widen the
range only once `@vercel/node` supports the 7.x API.

## Deployment (Vercel)

`vercel.json` routes every request to `api/index.ts`, which exports the Express
app directly, `@vercel/node` compiles the TypeScript.

Project settings:

- **Root Directory:** `server`
- **Framework Preset:** Other
- **Build Command / Output Directory:** leave empty (`vercel.json` drives the build)
- **Environment Variables:** everything from `.env.example`, with real values

`engines.node` is pinned to `22.x`. Because `vercel.json` uses `builds`, the Node
version selector in Project Settings is ignored and `engines` is the only control.

Each lambda holds its own connection pool, so keep `DB_POOL_SIZE` small (3-5) and
well under your database's connection limit.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Watch-mode dev server (tsx) |
| `npm run build` | Type-check and emit to `dist/` |
| `npm start` | Run the compiled build |
| `npm run typecheck` | Type-check only |
| `npm run db:setup` | Apply `sql/001_baseline.sql` |
| `npm run db:setup -- upgrade` | Apply `sql/002_upgrade_v3.sql` (in-place upgrade) |
| `npm run db:migrate-data` | Copy a v2 database into a separate v3 one |
| `npm run admin:create` | Create or reset an admin account |
| `npm run db:generate` / `db:push` / `db:studio` | Drizzle Kit |
