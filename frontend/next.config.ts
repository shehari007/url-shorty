import type { NextConfig } from 'next';
import { version } from './package.json' with { type: 'json' };

/**
 * Security headers applied to every route.
 *
 * The CSP allows inline styles because Ant Design v6 injects them at runtime;
 * `'unsafe-eval'` is permitted in development only, where React's refresh
 * runtime needs it.
 */
const isDev = process.env.NODE_ENV === 'development';

const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').origin;
  } catch {
    return 'http://localhost:8080';
  }
})();

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}${isDev ? ' ws: http://localhost:*' : ''}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Single source of truth for the version the UI displays: read from
  // package.json at build time so the footer and the admin sidebar cannot drift
  // away from the released version the way two hardcoded strings did.
  env: { NEXT_PUBLIC_APP_VERSION: version },

  // antd ships ESM that benefits from being transpiled alongside the app.
  transpilePackages: ['antd', '@ant-design/icons', 'rc-util', 'rc-picker', 'rc-tree', 'rc-table'],

  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', 'recharts'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          ...(isDev
            ? []
            : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
        ],
      },
      {
        // The admin console must never be cached or indexed.
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
    ];
  },
};

export default nextConfig;
