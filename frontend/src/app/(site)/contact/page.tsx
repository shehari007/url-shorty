import type { Metadata } from 'next';
import { ContactForm } from '@/components/ContactForm';
import { BugOutlined, CloudOutlined, SafetyCertificateOutlined } from '@/components/icons';
import { PageHero } from '@/components/PageHero';
import { jsonLd, pageGraph } from '@/lib/seo';

const TITLE = 'Contact Us';
const DESCRIPTION =
  'Questions, bug reports, feature requests or partnership enquiries. Get in touch with the Shorty team.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/contact' },
  openGraph: {
    type: 'website',
    title: 'Contact Us · Shorty',
    description: 'Get in touch with the Shorty team.',
    url: '/contact',
  },
};

const POINTS = [
  {
    icon: <BugOutlined />,
    accent: 'blue' as const,
    title: 'Bugs and feature ideas',
    body: 'Tell us what broke or what is missing. Reproduction steps and a short link make it much faster to fix.',
  },
  {
    icon: <SafetyCertificateOutlined />,
    accent: 'rose' as const,
    title: 'Reporting an abusive link?',
    body: 'Use the report form instead. It routes straight into the moderation queue and gets looked at sooner.',
  },
  {
    icon: <CloudOutlined />,
    accent: 'violet' as const,
    title: 'Bulk or API access',
    body: 'Running something that needs more than the fair-use limits? Describe your use case and we will sort it out.',
  },
];

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(pageGraph({ path: '/contact', title: TITLE, description: DESCRIPTION })) }}
      />
      <PageHero
        eyebrow="Get in touch"
        title="Questions, bugs, or something we should know about?"
        lede="We read every message. Most get a reply within a couple of working days."
        points={POINTS}
        aside={<ContactForm />}
      />
    </>
  );
}
