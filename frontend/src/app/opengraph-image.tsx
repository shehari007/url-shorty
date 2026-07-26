import { ImageResponse } from 'next/og';
import { SITE, shortDomain } from '@/lib/config';

export const alt = `${SITE.fullName}, free URL shortener with QR codes and click analytics`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Social preview card, rendered at build time by Satori.
 *
 * Only system fonts and inline SVG are used. Satori supports a subset of CSS
 * (flexbox only, no grid), so the layout here is deliberately simple.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #0B1020 0%, #12203B 55%, #0B2B33 100%)',
          color: '#F8FAFC',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/*
            Inline SVG rather than an emoji: Satori resolves emoji through a
            remote font provider, which would make the build depend on network
            access. This renders identically everywhere.
          */}
          <svg width="76" height="76" viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient id="ogBadge" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2563EB" />
                <stop offset="0.5" stopColor="#06B6D4" />
                <stop offset="1" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <rect width="48" height="48" rx="13" fill="url(#ogBadge)" />
            <g stroke="#fff" strokeWidth="3.6" strokeLinecap="round" fill="none">
              <path d="M20.4 27.6 27.6 20.4" />
              <path d="M18.6 22.2 16.2 24.6a5.1 5.1 0 0 0 7.2 7.2l2.4-2.4" />
              <path d="M29.4 25.8l2.4-2.4a5.1 5.1 0 0 0-7.2-7.2l-2.4 2.4" />
            </g>
          </svg>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>{SITE.fullName}</div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 74, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2.5, maxWidth: 930 }}>
            Shorten your links.
          </div>
          <div
            style={{
              fontSize: 74,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2.5,
              background: 'linear-gradient(90deg, #60A5FA 0%, #22D3EE 50%, #34D399 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Understand your clicks.
          </div>
          <div style={{ fontSize: 30, color: '#94A3B8', marginTop: 10, maxWidth: 900 }}>
            Free QR codes, real click analytics, and no signup.
          </div>
        </div>

        {/* Footer chips */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {['Free forever', 'No account', 'Open source'].map((chip) => (
            <div
              key={chip}
              style={{
                display: 'flex',
                fontSize: 24,
                padding: '12px 24px',
                borderRadius: 999,
                background: 'rgba(148,163,184,0.14)',
                border: '1px solid rgba(148,163,184,0.28)',
                color: '#CBD5E1',
              }}
            >
              {chip}
            </div>
          ))}
          <div style={{ display: 'flex', marginLeft: 'auto', fontSize: 26, color: '#64748B' }}>{shortDomain}</div>
        </div>
      </div>
    ),
    size,
  );
}
