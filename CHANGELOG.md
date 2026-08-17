# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> [!NOTE]
> Releases before 3.0.0 were never tagged in git. The entries below are reconstructed from
> commit history and are summaries rather than exhaustive lists. Dates are the dates the
> work landed on `main`.

## [Unreleased]

Nothing yet.

## [3.0.1] — 2026-08-17

A maintenance release. No new features: this is a security pass over the API and the admin
console, a correctness fix to domain blocking, and the repository groundwork (tests,
contributing guide, security policy, this changelog) that was missing.

**Upgrading from 3.0.0:** no database migration. Two things to check —

1. If you deploy behind Vercel or Cloudflare, set `TRUSTED_IP_HEADER` (see
   [server/README.md](server/README.md#environment)). Client IPs now come from `req.ip`
   rather than from whichever proxy header happened to be present, so without it
   `lastLoginIp` and the login audit entries will record your web app's egress address
   instead of the operator's.
2. `GET /health` no longer returns `environment`, `uptimeSeconds`, or the database error
   string. If a monitor parses those fields, point it at `status` and the 200/503 split.

### Changed

- **Blocking a domain now takes down the links that already point at it.** Previously the
  blocklist was only consulted when a *new* link was created, so mass-minting links to a
  phishing domain and waiting for the first report meant every existing link kept
  redirecting after the moderator blocked it — the console displayed the domain as blocked
  while `short.msyb.dev` carried on serving it. Blocking now blacklists and flags every
  matching link in one step, and reports how many were taken offline
  (`src/modules/admin/moderation.controller.ts`).
- **One blocklist entry covers the apex, `www.` and every subdomain, automatically.**
  A leading `www.` is stripped before the entry is stored, so blocking `www.evil.com` no
  longer covers `a.www.evil.com` while leaving `evil.com` itself reachable. Blocking
  `evil.com` matches `evil.com`, `www.evil.com` and `anything.evil.com`, at creation time
  and retroactively, while leaving `notevil.com` alone. Blocking a specific subdomain
  (`sub.evil.com`) still scopes to that subdomain.
- The admin console reports the result of a block as "N existing links taken offline"
  rather than a bare confirmation (`frontend/src/components/admin/DomainsManager.tsx`).

### Security

- **Closed an admin account-enumeration oracle in the login endpoint.** The hash used to
  equalise timing for an unknown email was a hand-written literal of 65 characters; bcrypt
  requires exactly 60 and rejects a malformed hash immediately, so an unknown address
  answered in 0.04 ms against 265 ms for a real one. The hash is now generated at runtime
  and asserted to be 60 characters (`src/lib/crypto.ts`).
- **Locked accounts no longer identify themselves.** A locked account returned `423
  ACCOUNT_LOCKED` with a countdown while every other failure returned a generic 401, which
  confirmed the address belonged to a real admin. It now returns the same 401 after the
  same bcrypt work, and records the `admin.login_failed` audit entry that this path was
  previously missing (`src/modules/admin/auth.controller.ts`).
- **Client IPs are no longer taken from spoofable headers.** `getClientIp` read
  `x-real-ip`, `cf-connecting-ip`, `true-client-ip` and the leftmost `x-forwarded-for`
  entry before falling back to `req.ip`. Nothing strips those on the way in, so any client
  could send a fresh value per request to get a clean rate-limit bucket every time, and
  write chosen addresses into visit rows, audit entries, `lastLoginIp` and the IP dedupe on
  reports and contact messages. It now uses `req.ip`, with an opt-in `TRUSTED_IP_HEADER`
  for deployments behind a proxy that overwrites the header (`src/lib/request.ts`).
- **"Revoke sessions" actually revokes sessions now.** It incremented `token_version` and
  nothing else, but `refresh()` never compares a session against that version, so a stolen
  refresh token could be exchanged straight back for a working access token carrying the
  *new* version. The operator was told the sessions were revoked while the attacker kept
  full console access for up to `ADMIN_REFRESH_TTL_DAYS`. Session rows are now revoked
  alongside the bump, and the same sweep runs when an account is deactivated so
  deactivate-then-reactivate cannot resurrect outstanding tokens. Signing out everywhere
  also bumps `token_version`, so the paired access token dies with it
  (`src/modules/admin/dashboard.controller.ts`, `src/modules/admin/auth.controller.ts`).
- **Added CSRF protection to the admin BFF.** The proxy and session routes attached the
  httpOnly bearer token to any request that arrived with the cookies and never checked
  where it came from. `SameSite=Lax` is a same-*site* control and the registrable domain is
  shared with `short.msyb.dev`, so a page on any sibling subdomain could drive every
  admin write. Unsafe methods now require a same-origin `Origin` header, and the sign-in
  route requires `application/json` — without that, a `text/plain` form post from any
  origin could sign an operator into an attacker's account and misattribute everything they
  did next (`frontend/src/lib/server/session.ts` and the two admin route handlers).
- **Rate-limited the admin auth routes that had no limiter at all.** `/auth/logout`,
  `/auth/me` and `/auth/password` were registered above the router-level
  `adminRouter.use(...)`, so it never ran for them, and `adminRouter` mounts above
  `apiLimiter`. `/auth/password` runs two bcrypt cost-12 operations per call, making it an
  unmetered CPU-exhaustion lever for any token holder, down to the `moderator` role. The
  limiter is now mounted first and separately from `requireAdmin`, and password changes get
  their own tight per-admin bucket (`src/routes/admin.routes.ts`).
- **Bounded the login endpoint.** Its only limiter was keyed on `ip:email` read from the
  raw body, so varying the email gave an unlimited supply of fresh buckets, each costing a
  full bcrypt compare. The key also never trimmed while the account lookup did, so padded
  variants of one address were independent buckets that resolved to the same row — enough
  to hold any known admin in a permanent lockout. An IP-keyed outer limiter now caps the
  work, and the composite key is normalised and hashed (`src/middleware/rate-limit.ts`).
- **Closed a limiter bypass in the legacy `/api/shorty-url` adapter.** It re-dispatched
  into the public controllers while running only the general `apiLimiter`, so
  `{"action":"report"}` allowed roughly 80x the intended report rate — enough for a small
  set of hosts to push arbitrary links past `AUTO_BLOCK_THRESHOLD` with no moderator
  involved. It now applies the same limiter instance the equivalent `/api/v1` route uses,
  so quota is shared rather than doubled. `POST /api/v1/links/qr` had no limiter either
  (`src/routes/index.ts`).
- **`/health` no longer echoes driver errors.** It returned the raw message to anonymous
  callers, disclosing the database hostname, port and account name
  (`Access denied for user 'x'@'y'`). It is now logged server-side and reduced to
  `{ ok }` in the response (`src/app.ts`).
- **The blocklist no longer fails open.** A database error while loading it fell back to an
  empty list, so on a cold serverless process whose first round-trip times out, every
  blocked domain was accepted and permanently minted — surviving the recovery, because
  nothing re-checked existing links. A stale list is now served when one exists, and link
  creation returns 503 only when the blocklist has never loaded at all
  (`src/modules/links/service.ts`).
- **Hardened the host check against wildcard DNS.** `169-254-169-254.nip.io` and the rest
  of that family resolve to the address spelled out in the label, which made the entire
  literal-address table optional for anyone willing to paste a different hostname. Those
  services are refused, as is any host embedding a private dotted-quad. Added the 6to4
  (`2002::/16`), Teredo (`2001::/32`), site-local (`fec0::/10`) and discard (`100::/64`)
  ranges, which reach the same private destinations by another route
  (`src/lib/url-safety.ts`).
- **Closed an SSRF bypass for IPv4-mapped IPv6 addresses.** The guard matched
  `::ffff:` only in dotted-quad form, but the WHATWG URL parser re-serialises
  `[::ffff:127.0.0.1]` to `[::ffff:7f00:1]`, so `[::ffff:a9fe:a9fe]` reached the cloud
  metadata address unchallenged. Range checks now use `net.BlockList`, which resolves
  IPv4-mapped addresses against the IPv4 rules, and the deprecated IPv4-compatible
  (`::/96`) and NAT64 (`64:ff9b::/96`) ranges are covered too (`src/lib/url-safety.ts`).

### Added

- `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` and this changelog.
- GitHub issue and pull request templates, `CODEOWNERS`, and a Dependabot configuration
  covering both services.
- `frontend/scripts/generate-og.mjs`, which renders the social card at both the
  OpenGraph (1200×630) and GitHub social preview (1280×640) sizes.
- Root `.nvmrc` pinning Node 22.
- First tests: `server/vitest.config.ts` plus 24 cases across `url-safety` and `crypto`,
  pinning each bypass above as a regression test. `npm test` previously exited 1 because
  the vitest script had no test files to run.
- `TRUSTED_IP_HEADER`, an opt-in setting for reading the client IP from a proxy header.

### Changed

- Rewrote the root README: live demo and quick-start call-to-action, dynamic badges,
  screenshots (previously present in the repository but referenced nowhere), an
  architecture section, a roadmap and an FAQ.
- Recaptured all four screenshots against the live 3.x site — the previous set predated
  the Next.js 16 rewrite. Re-encoded to WebP at 1600px, which took the set from 14.6 MB
  to 278 KB.
- Corrected three overstated security claims in the README — password hashing is bcrypt,
  not Argon2; the strict `default-src 'none'` CSP applies to the API, while the web app
  permits inline script for Ant Design and the no-flash theme script.
- Documented the `CREATE DATABASE` step that `npm run db:setup` requires, and added a
  platform-independent alternative to `openssl rand` for generating `ADMIN_JWT_SECRET`.
- `LICENSE` copyright now reads `2023-present`.

### Removed

- The `lint` script in `frontend/package.json`. `next lint` was removed in Next.js 16, so
  the script errored out; there is no ESLint configuration to replace it with yet.

## [3.0.0] — 2026-07-26

A full rewrite of the web app onto the Next.js App Router, and of the API onto Express 5
with Drizzle ORM.

### Added

- Admin console at `/admin`: overview dashboard, link management with per-link analytics
  drawer, abuse-report triage, contact inbox, blocked domains, append-only audit log, and
  owner-managed accounts across three roles.
- Session handling through a Next.js BFF — access and refresh tokens live in httpOnly
  cookies held by the server and never reach the browser.
- Bot detection, so automated traffic is separated from real clicks in every statistic.
- SSRF and abuse guard on link creation: private, loopback, link-local, CGNAT and
  reserved-TLD destinations are refused, as are URLs carrying embedded credentials.
- Per-route rate limiting with IPv6 subnet handling, and Zod validation on request bodies.
- SEO groundwork: per-route metadata, JSON-LD (`WebApplication`, `FAQPage`, `HowTo`),
  `sitemap.xml`, `robots.txt`, canonical URLs and OpenGraph cards.
- Light and dark themes with no flash of the wrong theme on first paint.
- `002_upgrade_v3.sql` and `npm run db:setup -- upgrade` for migrating a v2 database.

### Changed

- Web app moved from a React SPA to Next.js 16 (App Router) with React 19 and Ant Design 6.
- API moved from Express 4 to Express 5, with Drizzle ORM over MySQL/TiDB replacing hand-
  written queries.
- Admin passwords rehashed with bcrypt at cost 12.
- Both services now ship strict TypeScript throughout.

### Fixed

- Silent server-side crashes caused by unhandled rejections in async route handlers
  (`5bc9e1f`, `63675e2`).
- SEO link structure and icon rendering across viewports (`89667ad`).

## [2.0.0] — 2025-12-15

### Added

- Monorepo layout splitting the project into `frontend/` and `server/`.
- Structured logging and error controls on the API.
- Input validation across the public endpoints.

### Changed

- Substantial UI/UX redesign and a rewritten backend API (`12a60a7`).

## [1.0.0] — 2023-09-14

### Added

- Initial release: URL shortening, click counting, QR codes, an abuse report form and a
  contact form, built as a React SPA against a Node.js backend on serverless functions.

[Unreleased]: https://github.com/shehari007/url-shorty/compare/v3.0.1...HEAD
[3.0.1]: https://github.com/shehari007/url-shorty/releases/tag/v3.0.1
[3.0.0]: https://github.com/shehari007/url-shorty/commit/a387402
[2.0.0]: https://github.com/shehari007/url-shorty/commit/12a60a7
[1.0.0]: https://github.com/shehari007/url-shorty/commit/6900580
