import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { SITE, SITE_URL } from '@/lib/config';
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
  alternates: { canonical: '/' },
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
    creator: SITE.twitter,
  },
  // The <link rel="icon"> tags come from app/icon.svg; this is the legacy fallback.
  icons: { shortcut: '/favicon.ico' },
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
