/**
 * Brand asset generator, run by hand, not part of the build.
 *
 *   node scripts/generate-og.mjs
 *
 * Renders the social card once, at two sizes, using Satori (the same engine
 * behind `src/app/opengraph-image.tsx`) so the static asset and the route
 * output stay visually identical:
 *
 *   public/og.png                    1200x630  OpenGraph / Twitter / blog hero
 *   public/github-social-preview.png 1280x640  GitHub, Settings > Social preview
 *
 * Fonts are pulled from Google Fonts on first run and cached in
 * `.cache/fonts/` (gitignored) rather than vendored, so the repo carries no
 * font binaries. Satori reads ttf/otf/woff but NOT woff2, hence the legacy
 * user-agent below, which makes the CSS API hand back woff.
 */
import { ImageResponse } from 'next/og.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONT_CACHE = join(ROOT, '.cache', 'fonts');

/** A UA old enough that Google Fonts serves woff instead of woff2. */
const LEGACY_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.57.2 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2';

async function loadFont(family, weight, file) {
  const cached = join(FONT_CACHE, file);
  if (existsSync(cached)) return readFile(cached);

  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`,
    { headers: { 'User-Agent': LEGACY_UA } },
  ).then((r) => r.text());

  const url = css.match(/https:\/\/fonts\.gstatic\.com[^)]+/)?.[0];
  if (!url) throw new Error(`Could not resolve a font URL for ${family} ${weight}`);

  const data = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
  await mkdir(FONT_CACHE, { recursive: true });
  await writeFile(cached, data);
  return data;
}

/* Element helper, so this file needs no JSX transform. */
const h = (type, props = {}, ...children) => ({
  type,
  props: { ...props, ...(children.length ? { children: children.length === 1 ? children[0] : children } : {}) },
});

/* Brand palette, mirroring src/theme/tokens.ts. */
const C = {
  ink: '#F8FAFC',
  muted: '#94A3B8',
  dim: '#64748B',
  blue: '#60A5FA',
  cyan: '#22D3EE',
  emerald: '#34D399',
  amber: '#FBBF24',
  violet: '#A78BFA',
};

const BRAND_GRADIENT = `linear-gradient(90deg, ${C.blue} 0%, ${C.cyan} 50%, ${C.emerald} 100%)`;

/** The gradient-on-a-rounded-square logo mark, matching the app icon. */
const logoMark = (s) =>
  h(
    'svg',
    { width: s, height: s, viewBox: '0 0 48 48', fill: 'none' },
    h(
      'defs',
      {},
      h(
        'linearGradient',
        { id: 'mark', x1: '0', y1: '0', x2: '48', y2: '48', gradientUnits: 'userSpaceOnUse' },
        h('stop', { stopColor: '#2563EB' }),
        h('stop', { offset: '0.5', stopColor: '#06B6D4' }),
        h('stop', { offset: '1', stopColor: '#10B981' }),
      ),
    ),
    h('rect', { width: '48', height: '48', rx: '13', fill: 'url(#mark)' }),
    h(
      'g',
      { stroke: '#fff', strokeWidth: '3.6', strokeLinecap: 'round', fill: 'none' },
      h('path', { d: 'M20.4 27.6 27.6 20.4' }),
      h('path', { d: 'M18.6 22.2 16.2 24.6a5.1 5.1 0 0 0 7.2 7.2l2.4-2.4' }),
      h('path', { d: 'M29.4 25.8l2.4-2.4a5.1 5.1 0 0 0-7.2-7.2l-2.4 2.4' }),
    ),
  );

/**
 * Miniature analytics panel. Balances the composition against the headline and,
 * more usefully, shows the thing the headline is claiming rather than asserting
 * it: this is a shortener that reports back.
 */
const analyticsPanel = () => {
  const bars = [26, 38, 31, 52, 44, 61, 48, 70, 58, 66, 54, 74, 63, 80];
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: 340,
        padding: 22,
        borderRadius: 20,
        background: 'rgba(15,23,42,0.55)',
        border: '1px solid rgba(148,163,184,0.18)',
      },
    },
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      h('div', { style: { fontSize: 17, color: C.dim, fontWeight: 600 } }, 'Last 30 days'),
      h('div', { style: { fontSize: 17, color: C.emerald, fontWeight: 700 } }, '+18.4%'),
    ),
    h(
      'div',
      { style: { display: 'flex', alignItems: 'flex-end', gap: 9, marginTop: 12 } },
      h('div', { style: { fontSize: 46, fontWeight: 800, color: C.ink, letterSpacing: -1.6, lineHeight: 1 } }, '12,480'),
      h('div', { style: { fontSize: 19, color: C.muted, paddingBottom: 5 } }, 'clicks'),
    ),
    h(
      'div',
      { style: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 84, marginTop: 18 } },
      ...bars.map((height, i) =>
        h('div', {
          key: i,
          style: {
            width: 14,
            height,
            borderRadius: 4,
            background: `linear-gradient(180deg, ${C.cyan} 0%, rgba(37,99,235,0.55) 100%)`,
          },
        }),
      ),
    ),
    h('div', {
      style: { width: '100%', height: 1, background: 'rgba(148,163,184,0.16)', marginTop: 20 },
    }),
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 18, marginTop: 16 } },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 9 } },
        h('div', { style: { width: 8, height: 8, borderRadius: 999, background: C.blue } }),
        h('div', { style: { fontSize: 17, color: '#CBD5E1' } }, '8,204 unique'),
      ),
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 9 } },
        h('div', { style: { width: 8, height: 8, borderRadius: 999, background: C.amber } }),
        h('div', { style: { fontSize: 17, color: '#CBD5E1' } }, 'bots filtered'),
      ),
    ),
  );
};

/** A labelled dot. Colour-coded so the feature row reads as a set, not a list. */
const chip = (color, label) =>
  h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '11px 20px',
        borderRadius: 999,
        background: 'rgba(148,163,184,0.07)',
        border: '1px solid rgba(148,163,184,0.16)',
      },
    },
    h('div', { style: { width: 10, height: 10, borderRadius: 999, background: color } }),
    h('div', { style: { fontSize: 22, color: '#CBD5E1', fontWeight: 600 } }, label),
  );

function card({ width, height }) {
  return h(
    'div',
    {
      style: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #070C18 0%, #0B1428 45%, #072027 100%)',
        fontFamily: 'Inter',
      },
    },

    /* Depth: two soft brand-coloured glows behind the content. */
    h('div', {
      style: {
        position: 'absolute',
        top: -220,
        right: -140,
        width: 720,
        height: 720,
        borderRadius: 999,
        background: 'radial-gradient(circle, rgba(6,182,212,0.20) 0%, rgba(6,182,212,0) 68%)',
      },
    }),
    h('div', {
      style: {
        position: 'absolute',
        bottom: -300,
        left: -180,
        width: 760,
        height: 760,
        borderRadius: 999,
        background: 'radial-gradient(circle, rgba(37,99,235,0.24) 0%, rgba(37,99,235,0) 68%)',
      },
    }),

    /* Brand rule across the top edge. */
    h('div', {
      style: { position: 'absolute', top: 0, left: 0, width, height: 7, background: BRAND_GRADIENT },
    }),

    h(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '58px 64px 60px',
        },
      },

      /* Header */
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 18 } },
          logoMark(58),
          h('div', { style: { fontSize: 35, fontWeight: 800, color: C.ink, letterSpacing: -0.8 } }, 'Shorty URL'),
        ),
        h(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 20,
              fontFamily: 'JetBrains Mono',
              color: C.dim,
              padding: '9px 18px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.18)',
            },
          },
          'github.com/shehari007/url-shorty',
        ),
      ),

      /* Headline and before/after strip on the left, live-looking stats on the right */
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 32 } },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', width: 660 } },
          h(
            'div',
            { style: { fontSize: 60, fontWeight: 800, color: C.ink, letterSpacing: -2.1, lineHeight: 1.05 } },
            'Shorten links.',
          ),
          h(
            'div',
            {
              /* alignSelf keeps the box tight to the glyphs, so the gradient runs
                 across the words rather than across the whole column. */
              style: {
                display: 'flex',
                alignSelf: 'flex-start',
                fontSize: 60,
                fontWeight: 800,
                letterSpacing: -2.1,
                lineHeight: 1.05,
                background: BRAND_GRADIENT,
                backgroundClip: 'text',
                color: 'transparent',
              },
            },
            'Know who clicks.',
          ),
          h(
            'div',
            { style: { fontSize: 23, color: C.muted, marginTop: 15, lineHeight: 1.42 } },
            'Free and open source. QR codes, bot-filtered analytics, and a full moderation console.',
          ),

          /* The product, in one line: long in, short out. */
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 30 } },
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  fontSize: 17,
                  fontFamily: 'JetBrains Mono',
                  color: '#7D8CA6',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  padding: '14px 20px',
                  borderRadius: 13,
                  background: 'rgba(148,163,184,0.07)',
                  border: '1px solid rgba(148,163,184,0.16)',
                },
              },
              'example.com/blog/post?utm=x',
            ),
            h(
              'svg',
              { width: '32', height: '20', viewBox: '0 0 32 20', fill: 'none' },
              h('path', {
                d: 'M2 10h26M21 3l7 7-7 7',
                stroke: C.emerald,
                strokeWidth: '2.6',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }),
            ),
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono',
                  color: C.emerald,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  padding: '14px 20px',
                  borderRadius: 13,
                  background: 'rgba(16,185,129,0.10)',
                  border: '1px solid rgba(52,211,153,0.42)',
                },
              },
              'short.msyb.dev/gMW7g',
            ),
          ),
        ),
        analyticsPanel(),
      ),

      /* Feature row */
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 12 } },
        chip(C.blue, 'No signup'),
        chip(C.cyan, 'QR codes'),
        chip(C.emerald, 'Real analytics'),
        chip(C.amber, 'Abuse guard'),
        chip(C.violet, 'MIT licensed'),
      ),
    ),
  );
}

const fonts = [
  { name: 'Inter', data: await loadFont('Inter', 400, 'inter-400.woff'), weight: 400, style: 'normal' },
  { name: 'Inter', data: await loadFont('Inter', 600, 'inter-600.woff'), weight: 600, style: 'normal' },
  { name: 'Inter', data: await loadFont('Inter', 800, 'inter-800.woff'), weight: 800, style: 'normal' },
  { name: 'JetBrains Mono', data: await loadFont('JetBrains+Mono', 500, 'jbmono-500.woff'), weight: 500, style: 'normal' },
  { name: 'JetBrains Mono', data: await loadFont('JetBrains+Mono', 700, 'jbmono-700.woff'), weight: 700, style: 'normal' },
];

const targets = [
  { file: 'public/og.png', width: 1200, height: 630 },
  { file: 'public/github-social-preview.png', width: 1280, height: 640 },
];

for (const { file, width, height } of targets) {
  const png = Buffer.from(await new ImageResponse(card({ width, height }), { width, height, fonts }).arrayBuffer());
  await writeFile(join(ROOT, file), png);
  console.log(`${file.padEnd(34)} ${width}x${height}  ${(png.length / 1024).toFixed(0)} KB`);
}
