import type { Metadata } from 'next';
import { LinkAnalytics } from '@/components/LinkAnalytics';
import { shortDomain } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Link Analytics, Track Clicks on Any Shorty Link',
  description: `Look up any ${shortDomain} short link to see total and unique clicks, daily trends, top referrers, countries and device breakdown. Free, no signup.`,
  alternates: { canonical: '/analytics' },
  openGraph: {
    title: 'Link Analytics · Shorty',
    description: 'See clicks, referrers, countries and devices for any Shorty short link.',
    url: '/analytics',
  },
};

export default function AnalyticsPage() {
  return <LinkAnalytics />;
}
