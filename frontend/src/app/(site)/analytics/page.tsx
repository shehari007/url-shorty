import type { Metadata } from 'next';
import { LinkAnalytics } from '@/components/LinkAnalytics';
import { shortDomain } from '@/lib/config';
import { jsonLd, pageGraph } from '@/lib/seo';

const TITLE = 'Link Analytics, Track Clicks on Any Shorty Link';
const DESCRIPTION = `Look up any ${shortDomain} short link to see total and unique clicks, daily trends, top referrers, countries and device breakdown. Free, no signup.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/analytics' },
  openGraph: {
    type: 'website',
    title: 'Link Analytics · Shorty',
    description: 'See clicks, referrers, countries and devices for any Shorty short link.',
    url: '/analytics',
  },
};

export default function AnalyticsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(pageGraph({ path: '/analytics', title: TITLE, description: DESCRIPTION })) }}
      />
      <LinkAnalytics />
    </>
  );
}
