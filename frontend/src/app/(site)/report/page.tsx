import type { Metadata } from 'next';
import { BugOutlined, SafetyCertificateOutlined, ThunderboltOutlined } from '@/components/icons';
import { PageHero } from '@/components/PageHero';
import { ReportForm } from '@/components/ReportForm';
import { jsonLd, pageGraph } from '@/lib/seo';

const TITLE = 'Report a Malicious Link';
const DESCRIPTION =
  'Report a Shorty short link that leads to phishing, malware, spam or other abusive content. Every report is reviewed by a moderator.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/report' },
  openGraph: {
    type: 'website',
    title: 'Report a Malicious Link · Shorty',
    description: 'Help keep Shorty safe by reporting links used for phishing, malware or spam.',
    url: '/report',
  },
};

const POINTS = [
  {
    icon: <BugOutlined />,
    accent: 'rose' as const,
    title: 'What we act on',
    body: 'Phishing and fake login pages, malware downloads, spam campaigns, adult content behind a neutral link, and copyright infringement.',
  },
  {
    icon: <ThunderboltOutlined />,
    accent: 'amber' as const,
    title: 'Repeat reports act on their own',
    body: 'A link that crosses our report threshold is taken offline automatically, before a moderator has even opened it.',
  },
  {
    icon: <SafetyCertificateOutlined />,
    accent: 'emerald' as const,
    title: 'Every report is read',
    body: 'A human reviews each one. If the link breaks our rules it stops redirecting and the destination goes on our blocklist.',
  },
];

export default function ReportPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(pageGraph({ path: '/report', title: TITLE, description: DESCRIPTION })) }}
      />
      <PageHero
        eyebrow="Trust and safety"
        title="Found a Shorty link being used for harm?"
        lede="Shorty is only useful if people can trust the links. Tell us about one that is being abused and we will act on it."
        points={POINTS}
        aside={<ReportForm />}
      />
    </>
  );
}
