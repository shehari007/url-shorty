import type { MetadataRoute } from 'next';
import { IS_PUBLIC_SITE_URL, SITE_URL } from '@/lib/config';

/**
 * `/admin` and `/api` are never useful to a crawler; both are also served with
 * `X-Robots-Tag: noindex` and carry `robots` metadata, so a crawler that ignores
 * this file still will not index them.
 *
 * The `Sitemap` line is omitted when the canonical origin was never configured,
 * because pointing crawlers at `http://localhost:3000/sitemap.xml` is worse than
 * pointing them at nothing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
    ],
    ...(IS_PUBLIC_SITE_URL ? { sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL } : {}),
  };
}

export const dynamic = 'force-static';
