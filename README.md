<div align="center">
  <img src="frontend/public/logo.png" height="120px" width="120px" alt="Shorty URL Logo">
  <h1>Shorty URL</h1>
  <p><strong>A fast, free URL shortener with real click analytics and a full moderation console</strong></p>

  <a href="https://choosealicense.com/licenses/mit/">
    <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License">
  </a>
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/Ant%20Design-6-0170fe?style=flat-square&logo=antdesign" alt="Ant Design 6">
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express" alt="Express 5">
  <img src="https://img.shields.io/badge/Drizzle_ORM-0.45-c5f74f?style=flat-square" alt="Drizzle ORM">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript" alt="TypeScript">
</div>

---

## Overview

Shorty is a two-service application:

| Service | Directory | Stack | Deployed as |
| --- | --- | --- | --- |
| **Web** | `frontend/` | Next.js 16 (App Router), React 19, Ant Design 6, TypeScript | `shorty.msyb.dev` |
| **API + redirects** | `server/` | Express 5, Drizzle ORM, MySQL/TiDB, TypeScript | `short.msyb.dev` |

The web app serves the public marketing site and the `/admin` console. The API
serves the JSON endpoints **and** resolves short links (`short.msyb.dev/abc123`).

## Features

### Public

- **One-click shortening**. No account, no signup, no paywall.
- **Real analytics**, total and unique clicks, 30-day trend, referrers, countries, devices, with bot traffic separated out.
- **QR codes**, downloadable print-ready PNG for every link.
- **Abuse reporting**, structured categories, auto-flagging, and auto-block on repeated reports.
- **Light and dark themes**. With no flash of the wrong theme on load.
- **Built for SEO**, server-rendered pages, per-route metadata, JSON-LD (`WebApplication`, `FAQPage`, `HowTo`), `sitemap.xml`, `robots.txt`, canonical URLs, and OpenGraph/Twitter cards.

### Admin console (`/admin`)

- **Overview**, links, clicks, pending reports and messages at a glance, with 30-day trend charts.
- **Links**, search and filter by status/domain/date; block, unblock, expire, reactivate, soft-delete, restore, edit title/note/expiry, and bulk actions. Per-link drawer with full analytics and recent visitor detail.
- **Reports**, triage queue with one-click "resolve and block the link".
- **Messages**, inbox for the contact form, with statuses and internal notes.
- **Blocked domains**, destinations refused at creation time, subdomains included.
- **Audit log**, append-only record of every admin action, including failed sign-ins.
- **Admin accounts**, owner-only management with three roles.

### Security

- Argon-grade password hashing (bcrypt, cost 12), short-lived HS256 access tokens, rotating opaque refresh tokens stored hashed.
- Tokens live in **httpOnly cookies** held by the Next.js server, never in `localStorage`. No XSS token-theft surface.
- Role-based access control (`owner` > `admin` > `moderator`) enforced server-side on every route.
- Account lockout after repeated failed sign-ins; identical error messages prevent account enumeration.
- SSRF/abuse guard: private, loopback, link-local, CGNAT and reserved-TLD destinations are refused, as are URLs carrying embedded credentials.
- Per-route rate limiting with correct IPv6 subnet handling, strict CSP on both services, and Zod validation on every request body.

## Quick start

**Prerequisites:** Node.js 20.9+, and a MySQL 8 or TiDB database.

```bash
git clone https://github.com/shehari007/url-shorty.git
cd url-shorty
```

### 1. API

```bash
cd server
npm install
cp .env.example .env          # then fill it in, see the table in server/README.md

# Generate a signing secret and paste it into ADMIN_JWT_SECRET
openssl rand -base64 48

npm run db:setup              # fresh database
# ...or, upgrading an existing v2 install:
npm run db:setup -- upgrade

npm run admin:create          # create your first owner account
npm run dev                   # http://localhost:8080
```

### 2. Web

```bash
cd ../frontend
npm install
cp .env.example .env.local    # point NEXT_PUBLIC_API_URL at the API
npm run dev                   # http://localhost:3000
```

Sign in to the console at `http://localhost:3000/admin/login`.

## Project layout

```
url-shorty/
├─ server/
│  ├─ api/index.ts            Vercel serverless entry (exports the Express app)
│  ├─ sql/                    001_baseline.sql · 002_upgrade_v3.sql
│  ├─ scripts/                setup-db.ts · create-admin.ts
│  └─ src/
│     ├─ config/env.ts        Zod-validated environment
│     ├─ db/                  Drizzle schema + pooled client
│     ├─ lib/                 errors · logger · crypto · request · url-safety
│     ├─ middleware/          security · cors · rate-limit · auth · validate
│     ├─ modules/             links · redirect · stats · reports · contact · admin
│     └─ routes/              public API + admin router
└─ frontend/
   ├─ proxy.ts                Next 16 proxy (was middleware.ts), /admin gate
   └─ src/
      ├─ app/
      │  ├─ (site)/           public pages
      │  ├─ admin/            login + (console) route group
      │  └─ api/admin/        BFF: session + authenticated proxy
      ├─ components/          public + admin UI
      ├─ lib/                 api client · admin client · server session
      └─ theme/               design tokens + antd config
```

## Documentation

- **[server/README.md](server/README.md)**, environment reference, API endpoints, migration guide, deployment.
- **[frontend/README.md](frontend/README.md)**, environment reference, routing, SEO, deployment.

## Licence

MIT, see [LICENSE](LICENSE).

Built by [shehari007](https://github.com/shehari007).
