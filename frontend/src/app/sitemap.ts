import type { MetadataRoute } from 'next';
import { IS_PUBLIC_SITE_URL, SITE_URL } from '@/lib/config';
import { PUBLIC_ROUTES, absoluteUrl, updatedAt } from '@/lib/seo';

/**
 * Only public, indexable routes. `/admin/**` and `/api/**` are excluded
 * deliberately: they are also blocked in robots.txt and by an X-Robots-Tag.
 *
 * Routes, and the dates they last changed, come from `PUBLIC_ROUTES` so this
 * file cannot fall behind the app. `<lastmod>` is a real content date rather
 * than the build time, so a deploy that changes nothing does not tell Google
 * that every page was rewritten.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!IS_PUBLIC_SITE_URL && process.env.NODE_ENV === 'production') {
    // Publishing localhost URLs is worse than publishing nothing: Google would
    // record every canonical as unreachable.
    console.warn(`[sitemap] NEXT_PUBLIC_SITE_URL is unset; refusing to emit ${SITE_URL} URLs.`);
    return [];
  }

  return PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: updatedAt(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

// The route table is static, so serve the sitemap from the build output rather
// than re-rendering it per request.
export const dynamic = 'force-static';
export const revalidate = false;
