# Shorty Web

Next.js 16 (App Router) + React 19 + Ant Design 6 + TypeScript. Serves the
public site and the `/admin` console.

## Requirements

- Node.js **20.9+**
- A running [Shorty API](../server/README.md)

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | yes | API base URL used by the browser. No trailing slash |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical origin, drives metadata, `sitemap.xml`, `robots.txt`, OG tags |
| `NEXT_PUBLIC_SHORT_URL` | yes | Origin that serves the short links |
| `API_URL` | no | Server-side API base. Set when the Next server has a private route to the API; falls back to `NEXT_PUBLIC_API_URL` |
| `NEXT_PUBLIC_GITHUB_URL` | no | Repository link in the header and footer |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | no | Google Search Console token |

`NEXT_PUBLIC_*` values are inlined into the browser bundle at build time. Never
put a secret in one.

## Routes

### Public

| Path | Rendering | Purpose |
| --- | --- | --- |
| `/` | Static, revalidated every 60s | Hero, shortener, live platform stats, features, FAQ |
| `/analytics` | Static shell + client lookup | Per-link analytics for any Shorty link |
| `/report` | Static | Abuse report form |
| `/contact` | Static | Contact form |
| `/terms`, `/privacy` | Static | Legal pages |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` | Generated | SEO and PWA metadata |

### Admin

| Path | Purpose |
| --- | --- |
| `/admin/login` | Sign in |
| `/admin` | Overview: counters, trend charts, top and recent links |
| `/admin/links` | Search, filter, block, expire, delete, restore, bulk actions |
| `/admin/reports` | Abuse report triage |
| `/admin/contacts` | Contact form inbox |
| `/admin/domains` | Destination blocklist |
| `/admin/audit` | Admin action history |
| `/admin/accounts` | Admin user management (owner only) |
| `/admin/account` | Own profile and password change |

Admin routes are `no-store` and `noindex` via headers in `next.config.ts`, and
excluded from `robots.txt` and `sitemap.xml`.

## How admin auth works

The browser never holds a token.

1. `/admin/login` posts credentials to `POST /api/admin/session` (a Next Route
   Handler).
2. That handler calls the API, then stores the access and refresh tokens in
   **httpOnly, secure, SameSite=Lax cookies**. Only the admin profile is
   returned to the browser.
3. The console calls `/api/admin/proxy/*` on its own origin. The proxy attaches
   the bearer token server-side and forwards to `/api/v1/admin/**`. And nothing
   else, so it cannot be turned into an open relay.
4. On a `401`, the proxy transparently refreshes using the rotating refresh
   token and persists the new pair. If the refresh also fails, it clears the
   cookies so the UI stops retrying.

Because no token is reachable from JavaScript, an XSS bug cannot exfiltrate the
session, unlike the common `localStorage` JWT pattern.

`proxy.ts` (Next 16's replacement for `middleware.ts`) is only a fast first gate:
it redirects to `/admin/login` when no session cookie exists. Real authorisation
happens server-side on every request, `src/app/admin/(console)/layout.tsx`
validates the session against the API before rendering, and the API enforces
role checks independently.

## SEO

- Per-route `metadata` with a shared title template, canonical URLs, and
  OpenGraph/Twitter cards.
- JSON-LD on the homepage: `WebApplication`, `WebSite`, `FAQPage`, `HowTo`.
- Generated `sitemap.xml` and `robots.txt`.
- Public pages are server-rendered and statically prerendered; content, including
  every FAQ answer, is present in the initial HTML, not injected by JavaScript.
- Semantic landmarks, a skip link, and labelled interactive controls throughout.

### A note on Ant Design and Server Components

antd and `@ant-design/icons` call `React.createContext`, which does not exist in
the React Server Components runtime, importing them into a Server Component
fails the build. So:

- Server Components use plain semantic HTML styled from `globals.css`.
- Interactive pieces are `'use client'` islands (they still server-render to HTML).
- Icons needed inside Server Components are re-exported through
  `src/components/icons.tsx`, a `'use client'` barrel.

## Theming

Light and dark are defined once as CSS custom properties in `globals.css` and
mirrored as antd tokens in `src/theme/tokens.ts`. An inline script in the
document head stamps the saved preference on `<html>` before first paint, so a
returning dark-mode visitor never sees a white flash.

## Deployment (Vercel)

- **Root Directory:** `frontend`
- **Framework Preset:** **Next.js**, if this project previously deployed Create
  React App, you must change it from "Create React App"
- **Build Command / Output Directory:** leave empty (Next.js defaults)
- **Environment Variables:** everything from `.env.example`, with real values

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | Type-check only |
| `npm run og` | Regenerate `public/og.png` and `public/github-social-preview.png` |
