import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config';

/**
 * PWA manifest.
 *
 * `purpose: 'any'` icons keep their own rounded corners; the `maskable` one is
 * full-bleed with the mark inside the middle 80% safe zone, so Android can crop
 * it to whatever shape the launcher uses without clipping the glyph.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: `${SITE.fullName}, Free URL Shortener`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f7fb',
    theme_color: '#2563eb',
    orientation: 'portrait-primary',
    categories: ['utilities', 'productivity'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Look up link analytics', short_name: 'Analytics', url: '/analytics' },
      { name: 'Report a malicious link', short_name: 'Report', url: '/report' },
    ],
  };
}

export const dynamic = 'force-static';
