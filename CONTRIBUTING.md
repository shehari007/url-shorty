# Contributing to Shorty URL

Thanks for taking the time. Bug reports, documentation fixes and features are all welcome,
and small PRs get reviewed fastest.

## Before you start

- For anything larger than a bug fix, **open an issue first** so we can agree on the shape
  of the change before you spend time on it.
- For security problems, **do not open an issue** — see [SECURITY.md](SECURITY.md).
- By contributing you agree your work is licensed under the [MIT License](LICENSE).

## Repository layout

Shorty is two independent npm projects in one repository. There is no root `package.json`
and no workspace tooling — you install and run each service separately.

| Directory | What it is |
| --- | --- |
| `server/` | Express 5 API, short-link redirects, admin control plane |
| `frontend/` | Next.js 16 web app, public site and `/admin` console |

## Local setup

Follow the [Quick start](README.md#-quick-start) in the root README. In short:

```bash
# API — needs a MySQL 8 / TiDB database that already exists
cd server
npm install
cp .env.example .env      # fill in DB* and ADMIN_JWT_SECRET
npm run db:setup
npm run admin:create
npm run dev               # http://localhost:8080

# Web app, in a second terminal
cd frontend
npm install
cp .env.example .env.local
npm run dev               # http://localhost:3000
```

Node **22.x** is what the API is built and deployed against; the web app needs 20.9+.
A `.nvmrc` is provided, so `nvm use` picks the right one.

### Local database tips

- Set `DB_SSL=false` for a plain local MySQL — the default expects a managed provider
  with a valid certificate chain.
- `npm run db:setup` connects *into* an existing schema. Create it first:

  ```sql
  CREATE DATABASE `shorty-db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```

- Leave `BLOCK_PRIVATE_HOSTS` and `ALLOW_HTTP_TARGETS` at their defaults unless you are
  specifically testing the SSRF guard.

## Before you open a PR

Run the checks for whichever service you touched:

```bash
cd server    && npm run typecheck && npm test && npm run build
cd frontend  && npm run typecheck && npm run build
```

All must pass — they are the review gate, so please run them before pushing.

If you touch `src/lib/url-safety.ts`, `src/lib/crypto.ts` or the admin auth flow, add a
test. The existing cases in `src/lib/*.test.ts` pin real bypasses that shipped once, and
the SSRF guard in particular fails silently: a hole in it looks exactly like a working
shortener until someone points a link at your metadata endpoint.

> [!NOTE]
> There is no ESLint setup in `frontend/` — `next lint` was removed in Next.js 16, so the
> dead script was dropped. It is on the [roadmap](README.md#-roadmap); don't treat linting
> as a gate until it exists.

## Conventions

This codebase has a consistent style. Match the file you are editing rather than
introducing a new one.

- **TypeScript, strict.** No `any` where a real type will do, and no `@ts-ignore` without
  a comment explaining why.
- **Comments explain *why*, not *what*.** The existing comments are a good model — they
  document reasoning and trade-offs, not syntax. Don't narrate the obvious.
- **Validate at the edge.** Every request body gets a Zod schema in the module's
  `schemas.ts` and goes through the `validate` middleware.
- **Errors go through `lib/errors.ts`.** Don't hand-roll status codes in controllers.
- **Admin actions get an audit entry.** If you add an admin mutation, call `recordAudit`.
- **Database changes are numbered SQL files** in `server/sql/` (`003_*.sql`, and so on).
  `server/drizzle/` is generated and gitignored — the checked-in SQL is the source of
  truth. Update `server/src/db/schema.ts` to match.
- **No new runtime dependencies** without a note in the PR describing why an existing one
  won't do. The server deliberately has no native addons.

## Commit and PR style

- Present tense, imperative: `add link expiry presets`, not `added` or `adds`.
- One logical change per PR. Refactors separate from behaviour changes.
- Fill in the PR template — especially which service(s) you touched and whether a new
  migration is needed.
- Screenshots or a short clip for anything that changes the UI.

## Questions

Open a [Discussion](https://github.com/shehari007/url-shorty/discussions). No question
about getting the project running locally is too small.
