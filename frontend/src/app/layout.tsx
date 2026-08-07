import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { SITE, SITE_URL } from '@/lib/config';
import { jsonLd, siteGraph } from '@/lib/seo';
import { ThemeProvider, themeInitScript } from '@/theme/ThemeProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '600'],
});

/**
 * Root metadata. Page-level `metadata` exports inherit and override these, * `title.template` gives every page a consistent `… · Shorty URL` suffix.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.fullName}, Free URL Shortener with QR Codes & Click Analytics`,
    template: `%s · ${SITE.fullName}`,
  },
  description: SITE.description,
  applicationName: SITE.fullName,
  authors: [{ name: SITE.author, url: 'https://github.com/shehari007' }],
  creator: SITE.author,
  publisher: SITE.fullName,
  keywords: [
    'url shortener',
    'link shortener',
    'short url',
    'shorten link',
    'qr code generator',
    'link analytics',
    'click tracking',
    'free url shortener',
    'bitly alternative',
    'tinyurl alternative',
    'custom short links',
  ],
  category: 'technology',
  // No `alternates.canonical` here on purpose. Metadata is inherited, so a root
  // canonical of '/' silently makes every page that forgets to set its own
  // canonicalise to the home page, which asks Google to drop it from the index.
  // Each public page declares its own canonical instead.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: SITE.fullName,
    url: SITE_URL,
    title: `${SITE.fullName}, Free URL Shortener with QR Codes & Click Analytics`,
    description: SITE.description,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.fullName}, Free URL Shortener`,
    description: SITE.description,
    site: SITE.twitter,
    creator: SITE.twitter,
  },
  // `icons` is deliberately NOT set. Defining it here would override the
  // app/favicon.ico, app/icon.svg and app/apple-icon.png file conventions
  // entirely, which is exactly how this app ended up shipping a leftover React
  // logo as its only icon.
  manifest: '/manifest.webmanifest',
  formatDetection: { telephone: false, address: false, email: false },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#080d1a' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        {/* Applies the saved theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {/* Publisher and site identity, emitted once for every page so each one
            is attributed to the same entity rather than an anonymous URL. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(siteGraph()) }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
