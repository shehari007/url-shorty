import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.fullName}, Free URL Shortener`,
    short_name: SITE.fullName,
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f7fb',
    theme_color: '#2563eb',
    orientation: 'portrait-primary',
    categories: ['utilities', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
    ],
  };
}
