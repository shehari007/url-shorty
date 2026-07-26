import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

/**
 * Only public, indexable routes. `/admin/**` and `/api/**` are excluded
 * deliberately. They are also blocked in robots.txt and by an X-Robots-Tag.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] =
    [
      { path: '', priority: 1, changeFrequency: 'daily' },
      { path: '/analytics', priority: 0.9, changeFrequency: 'weekly' },
      { path: '/report', priority: 0.7, changeFrequency: 'monthly' },
      { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
      { path: '/terms', priority: 0.4, changeFrequency: 'yearly' },
      { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' },
    ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
