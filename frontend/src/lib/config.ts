/**
 * Runtime configuration.
 *
 * `NEXT_PUBLIC_*` values are inlined into the browser bundle at build time.
 * `API_URL` (no prefix) is server-only and lets the Next server talk to the API
 * over a private/internal address when one exists.
 */

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/** Base URL the browser uses to reach the API. */
export const PUBLIC_API_URL = trimSlash(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080');

/** Base URL the Next.js server uses. Falls back to the public one. */
export const SERVER_API_URL = trimSlash(process.env.API_URL ?? PUBLIC_API_URL);

/**
 * Canonical origin of this site, used for metadata, canonicals, sitemap and OG tags.
 *
 * Read on the server only (`layout.tsx`, `sitemap.ts`, `robots.ts`, the home page's
 * JSON-LD), which is why the platform fallbacks may use unprefixed env vars.
 *
 * The fallback chain matters: a deploy that forgets `NEXT_PUBLIC_SITE_URL` would
 * otherwise publish a sitemap, canonical tags and OG URLs full of `localhost:3000`,
 * which tells Google the whole site is unreachable.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return trimSlash(explicit);

  // Vercel injects these; the first is the stable production domain, the second
  // is the per-deployment URL, which is still far better than localhost.
  const platform = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (platform) return `https://${trimSlash(platform)}`;

  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();

/** True when `SITE_URL` is a real public origin rather than the dev fallback. */
export const IS_PUBLIC_SITE_URL = !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(SITE_URL);

/** Origin that serves short links, e.g. https://short.msyb.dev */
export const SHORT_URL_BASE = trimSlash(process.env.NEXT_PUBLIC_SHORT_URL ?? 'http://localhost:8080');

/** Where the GitHub icon in the header points. May be a profile or org page. */
export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL ?? 'https://github.com/shehari007/url-shorty';

const DEFAULT_REPO_URL = 'https://github.com/shehari007/url-shorty';

/**
 * The repository this build came from.
 *
 * Deliberately not just `GITHUB_URL`. That value is a display link and is
 * routinely set to a profile page, and appending `/releases/tag/...` to
 * `github.com/<user>` produces a link to a *repository literally named
 * "releases"* rather than to the release. So the value is only trusted when it
 * has the `owner/repo` shape, and otherwise falls back to the canonical repo.
 */
function resolveRepoUrl(): string {
  const candidate = trimSlash(process.env.NEXT_PUBLIC_REPO_URL ?? process.env.NEXT_PUBLIC_GITHUB_URL ?? '');
  return /^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(candidate) ? candidate : DEFAULT_REPO_URL;
}

export const REPO_URL = resolveRepoUrl();

/** Injected from `package.json` by `next.config.ts`, so it tracks the release. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

/** Release notes for the running version. */
export const RELEASE_URL = `${REPO_URL}/releases/tag/v${APP_VERSION}`;

export const SITE = {
  name: 'Shorty',
  fullName: 'Shorty URL',
  tagline: 'Short links, real analytics, zero signup',
  description:
    'Shorten long URLs into clean, shareable links in one click. Get QR codes, click analytics, and geographic breakdowns, free, fast, and no account required.',
  author: 'shehari007',
  twitter: '@shehari007',
} as const;

export const shortDomain = (() => {
  try {
    return new URL(SHORT_URL_BASE).host;
  } catch {
    return 'short.msyb.dev';
  }
})();
