import type { Metadata } from 'next';
import Link from 'next/link';
import { Faq } from '@/components/Faq';
import {
  BarChartOutlined,
  CloudOutlined,
  GlobalOutlined,
  QrcodeOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@/components/icons';
import { Reveal } from '@/components/motion/Reveal';
import { Shortener } from '@/components/Shortener';
import { StatsBand } from '@/components/StatsBand';
import { fetchFromServer } from '@/lib/api';
import { SITE, SITE_URL, shortDomain } from '@/lib/config';
import { ORG_ID, SITE_ID, jsonLd, updatedAt } from '@/lib/seo';
import type { PublicStatsResponse } from '@/lib/types';

const TITLE = `${SITE.fullName}, Free URL Shortener with QR Codes and Click Analytics`;

export const metadata: Metadata = {
  // `absolute` opts out of the root "%s · Shorty" template. The brand name is
  // already in this title and would otherwise appear twice.
  title: { absolute: TITLE },
  description: SITE.description,
  alternates: { canonical: '/' },
};

// Statistics are re-fetched at most once a minute. The shell stays static.
export const revalidate = 60;

/** Each feature gets its own accent so the grid reads as a colourful set. */
const FEATURES = [
  {
    icon: <ThunderboltOutlined />,
    accent: 'blue',
    title: 'Instant, no signup',
    body: 'Paste a link, press Shorten, done. No account, no email confirmation, no paywall on the basics.',
  },
  {
    icon: <BarChartOutlined />,
    accent: 'cyan',
    title: 'Analytics that mean something',
    body: 'Total and unique clicks, daily trends, referrers, countries and device split, with bot traffic separated out.',
  },
  {
    icon: <QrcodeOutlined />,
    accent: 'emerald',
    title: 'QR codes built in',
    body: 'Every link gets a downloadable, print-ready PNG QR code. Ideal for posters, packaging and slide decks.',
  },
  {
    icon: <SafetyCertificateOutlined />,
    accent: 'amber',
    title: 'Actively moderated',
    body: 'Destinations are screened on creation, abuse reports are reviewed, and malicious links are taken offline fast.',
  },
  {
    icon: <GlobalOutlined />,
    accent: 'rose',
    title: 'Fast everywhere',
    body: 'Redirects resolve in milliseconds, wherever the person clicking happens to be in the world.',
  },
  {
    icon: <CloudOutlined />,
    accent: 'violet',
    title: 'Open source',
    body: 'The whole stack is MIT licensed and on GitHub. Read it, audit it, or run your own copy.',
  },
] as const;

const STEPS = [
  {
    title: 'Paste your link',
    body: 'Drop in any long https:// URL. We validate and normalise it before anything is saved.',
  },
  {
    title: 'Get your short link',
    body: `You get a clean ${shortDomain} link plus a QR code, ready to share immediately.`,
  },
  {
    title: 'Watch the clicks',
    body: 'Paste the short link into Analytics any time to see who clicked, from where, and when.',
  },
];

const FAQ = [
  {
    q: 'Do my short links expire?',
    a: 'No. Links stay live indefinitely unless they are reported and removed for abuse, or an administrator sets an expiry date on them.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. Shortening, QR codes and analytics are all available without signing up. Your recent links are kept in your browser so you can find them again.',
  },
  {
    q: 'Is there a limit on how many links I can create?',
    a: 'There is a fair-use rate limit to stop automated abuse, which normal use will never hit. If you need bulk access, get in touch.',
  },
  {
    q: 'What information do you collect about clicks?',
    a: 'For each click we record a timestamp, the referring site, an approximate country, and the browser and device type. We do not use tracking cookies and we do not sell data.',
  },
  {
    q: 'What happens to malicious links?',
    a: 'Destinations are checked against a blocklist when a link is created. Anyone can report a link, and links crossing our report threshold are taken offline automatically pending review.',
  },
  {
    q: 'Can I get analytics for a link someone else made?',
    a: 'Yes. Aggregate click statistics for any Shorty link are public. Individual visitor details are never exposed.',
  },
];

export default async function HomePage() {
  const stats = await fetchFromServer<PublicStatsResponse>('/api/v1/stats', 60);
  const totals = stats?.totals;

  /**
   * Structured data, so Google can render a richer result for the home page.
   *
   * The `Organization` and `WebSite` nodes come from the root layout; this graph
   * only references them by `@id` so the entity is not declared twice.
   */
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: TITLE,
      description: SITE.description,
      inLanguage: 'en',
      isPartOf: { '@id': SITE_ID },
      dateModified: updatedAt('/'),
      about: { '@id': `${SITE_URL}/#app` },
      primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE_URL}/opengraph-image` },
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#app`,
      name: SITE.fullName,
      url: SITE_URL,
      description: SITE.description,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      // A price of 0 is what makes the "Free" annotation eligible; omitting the
      // offer entirely just reads as "price unknown".
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      featureList: FEATURES.map((feature) => feature.title),
      screenshot: `${SITE_URL}/opengraph-image`,
      isAccessibleForFree: true,
      publisher: { '@id': ORG_ID },
      author: { '@type': 'Person', name: SITE.author, url: 'https://github.com/shehari007' },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      isPartOf: { '@id': `${SITE_URL}/#webpage` },
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
    {
      '@type': 'HowTo',
      '@id': `${SITE_URL}/#howto`,
      name: 'How to shorten a URL with Shorty',
      totalTime: 'PT1M',
      step: STEPS.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.title,
        text: step.body,
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(graph) }} />

      {/* ------------------------------ hero ------------------------------ */}
      <section className="hero">
        <div className="hero__glow hero__glow--1" aria-hidden="true" />
        <div className="hero__glow hero__glow--2" aria-hidden="true" />
        <div className="hero__glow hero__glow--3" aria-hidden="true" />

        <div className="container-narrow">
          <span className="hero__badge">
            <b>
              <span className="live-dot" aria-hidden="true" />
              Live
            </b>
            <RocketOutlined aria-hidden="true" /> Free and open source, no signup
          </span>

          <h1 className="hero__title">
            Shorten your links.
            <br />
            <em>Understand your clicks.</em>
          </h1>

          <p className="hero__subtitle">
            Turn long, unwieldy URLs into clean <strong>{shortDomain}</strong> links in one click, then track every
            visit with real analytics, QR codes and geographic breakdowns. Free, forever.
          </p>

          <Shortener />

          <div className="hero__trust">
            <span>
              <span className="tick" aria-hidden="true">
                ✓
              </span>
              No account needed
            </span>
            <span>
              <span className="tick" aria-hidden="true">
                ✓
              </span>
              No tracking cookies
            </span>
            <span>
              <span className="tick" aria-hidden="true">
                ✓
              </span>
              Unlimited links
            </span>
          </div>

          <p className="hero__note">
            By shortening a link you agree to our <Link href="/terms">Terms of Service</Link> and{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>

      {/* ----------------------------- stats ------------------------------ */}
      {totals && (
        <section className="section" aria-labelledby="stats-heading" style={{ paddingBlock: '8px 40px' }}>
          <div className="container">
            <h2 id="stats-heading" className="sr-only">
              Platform statistics
            </h2>
            <StatsBand totals={totals} />
          </div>
        </section>
      )}

      {/* ---------------------------- features ---------------------------- */}
      <section className="section" id="features" aria-labelledby="features-heading">
        <div className="container">
          <Reveal className="section__head">
            <span className="section__eyebrow">Features</span>
            <h2 id="features-heading" className="section__title">
              Everything you need from a link shortener
            </h2>
            <p className="section__subtitle">
              Not just a shorter URL. The numbers behind it, and the safety work that keeps the domain trustworthy.
            </p>
          </Reveal>

          {/* Six cards on a fixed 3-column grid, so the last row is never ragged. */}
          <div className="grid grid-3">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={(index % 3) * 90} as="article">
                <article
                  className="feature-card"
                  style={
                    {
                      '--accent': `var(--a-${feature.accent})`,
                      '--accent-bg': `var(--a-${feature.accent}-bg)`,
                    } as React.CSSProperties
                  }
                >
                  <div className="feature-card__icon" aria-hidden="true">
                    {feature.icon}
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------- how it works -------------------------- */}
      <section className="section" id="how-it-works" aria-labelledby="how-heading">
        <div className="container">
          <Reveal className="section__head">
            <span className="section__eyebrow">How it works</span>
            <h2 id="how-heading" className="section__title">
              Three steps, about ten seconds
            </h2>
            <p className="section__subtitle">No configuration, no onboarding flow, no credit card.</p>
          </Reveal>

          <div className="steps">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 110} as="article">
                <article className="step">
                  <span className="step__number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- faq ------------------------------ */}
      <section className="section" id="faq" aria-labelledby="faq-heading">
        <div className="container-narrow">
          <Reveal className="section__head">
            <span className="section__eyebrow">FAQ</span>
            <h2 id="faq-heading" className="section__title">
              Frequently asked questions
            </h2>
            <p className="section__subtitle">
              Still stuck? <Link href="/contact">Send us a message</Link>, we read everything.
            </p>
          </Reveal>

          <Reveal>
            <Faq items={FAQ} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
