import type { MetadataRoute } from 'next';
import { SITE, SITE_URL } from './config';

/**
 * The public route table.
 *
 * One place defines which pages exist, what they are called and when they last
 * changed, so the sitemap, the breadcrumb structured data and the "Last updated"
 * lines on the legal pages cannot drift apart.
 *
 * `updated` is a *content* date, not a build date. Bump it by hand when you
 * change what the page says. Google explicitly discards `<lastmod>` across a
 * whole sitemap once it decides the values are not trustworthy, and stamping
 * every URL with `new Date()` at build time is the fastest way to earn that,
 * because a deploy that only touched CSS would claim every page was rewritten.
 */
export interface PublicRoute {
  path: string;
  /** Breadcrumb label. The home page is the implicit root and has none. */
  name?: string;
  /** ISO `YYYY-MM-DD`, the day this page's content last changed. */
  updated: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
}

export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { path: '/', updated: '2026-07-26', changeFrequency: 'weekly', priority: 1 },
  { path: '/analytics', name: 'Link Analytics', updated: '2026-07-26', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/report', name: 'Report Abuse', updated: '2026-07-26', changeFrequency: 'yearly', priority: 0.7 },
  { path: '/contact', name: 'Contact', updated: '2026-07-26', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/terms', name: 'Terms of Service', updated: '2026-07-26', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', name: 'Privacy Policy', updated: '2026-07-26', changeFrequency: 'yearly', priority: 0.3 },
] as const;

/** Absolute URL for a route. The home page has no trailing slash, matching its canonical. */
export function absoluteUrl(path: string): string {
  return path === '/' ? SITE_URL : `${SITE_URL}${path}`;
}

function route(path: string): PublicRoute {
  const found = PUBLIC_ROUTES.find((entry) => entry.path === path);
  if (!found) throw new Error(`[seo] "${path}" is missing from PUBLIC_ROUTES`);
  return found;
}

/**
 * The `updated` date of a route as `YYYY-MM-DD`, which is simultaneously a valid
 * W3C Datetime for `<lastmod>` and a valid schema.org Date for `dateModified`.
 */
export function updatedAt(path: string): string {
  return route(path).updated;
}

/** The `updated` date of a route, formatted for display, e.g. "July 2026". */
export function updatedLabel(path: string): string {
  return new Date(`${route(path).updated}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Stable node ids so every page's graph points at the same publisher and site. */
export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;

/**
 * Publisher and site nodes.
 *
 * Emitted once from the root layout so every page, not just the home page, is
 * attributed to a known entity. Repeating the same `@id` across pages lets
 * search engines merge them into one entity instead of many anonymous ones.
 */
export function siteGraph() {
  return [
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: SITE.fullName,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
      sameAs: ['https://github.com/shehari007/url-shorty', 'https://github.com/shehari007'],
    },
    {
      '@type': 'WebSite',
      '@id': SITE_ID,
      url: SITE_URL,
      name: SITE.fullName,
      description: SITE.description,
      inLanguage: 'en',
      publisher: { '@id': ORG_ID },
    },
  ];
}

/**
 * `WebPage` plus `BreadcrumbList` for an interior page.
 *
 * Breadcrumbs are what make a search result show "shorty.app › Link Analytics"
 * instead of a bare URL, and they give every page a `dateModified` that agrees
 * with the sitemap.
 */
export function pageGraph({ path, title, description }: { path: string; title: string; description: string }) {
  const url = absoluteUrl(path);
  const entry = route(path);

  return [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: title,
      description,
      inLanguage: 'en',
      isPartOf: { '@id': SITE_ID },
      dateModified: updatedAt(path),
      breadcrumb: { '@id': `${url}#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        ...(entry.name ? [{ '@type': 'ListItem', position: 2, name: entry.name, item: url }] : []),
      ],
    },
  ];
}

/** Serialises a `@graph` for a `<script type="application/ld+json">` tag. */
export function jsonLd(graph: object[]): string {
  // `<` is escaped so a value can never close the script tag early.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}
