import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE, shortDomain } from '@/lib/config';
import { jsonLd, pageGraph, updatedLabel } from '@/lib/seo';

const TITLE = 'Privacy Policy';
const DESCRIPTION = `What ${SITE.fullName} collects when you shorten a link or click one, why, how long it is kept, and how to have it removed.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/privacy' },
  openGraph: {
    type: 'article',
    title: `${TITLE} · Shorty`,
    description: DESCRIPTION,
    url: '/privacy',
  },
};

// Comes from the route table, so the date shown here and the <lastmod> in the
// sitemap can never disagree.
const UPDATED = updatedLabel('/privacy');

const SECTIONS = [
  {
    id: 'collect',
    title: 'What we collect',
    body: (
      <>
        <h3>When you shorten a link</h3>
        <ul>
          <li>The destination URL you submitted, and the short code we generated for it.</li>
          <li>Your IP address and browser user-agent string.</li>
          <li>A timestamp.</li>
        </ul>
        <p>
          The IP address and user-agent are kept so we can trace and act on abuse, and enforce rate limits. They are
          never shown publicly.
        </p>

        <h3>When someone clicks a short link</h3>
        <ul>
          <li>A timestamp.</li>
          <li>The visitor&rsquo;s IP address, used to count unique visitors and detect abuse.</li>
          <li>The referring page, if the browser sends one.</li>
          <li>An approximate country, derived at the network edge. Never a precise location.</li>
          <li>Browser, operating system and device type, derived from the user-agent.</li>
          <li>Whether the request looked like a bot or a link-preview crawler.</li>
        </ul>

        <h3>When you contact us or report a link</h3>
        <ul>
          <li>Your name (contact form only), email address and message.</li>
          <li>Your IP address and user-agent, for spam prevention.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'not-collected',
    title: 'What we do not collect',
    body: (
      <ul>
        <li>
          No tracking or advertising cookies. The only things stored in your browser are your theme preference and your
          own recent links, both of which stay on your device.
        </li>
        <li>No third-party analytics or advertising scripts.</li>
        <li>No accounts, passwords, or payment details for public use of the service.</li>
        <li>No precise geolocation, and no cross-site tracking of any kind.</li>
      </ul>
    ),
  },
  {
    id: 'public',
    title: 'What is public',
    body: (
      <p>
        Aggregate click statistics for a short link, meaning totals, daily trends, referrer domains, countries and
        device types, are visible to anyone with the link. Individual visitor records, IP addresses and user-agents are
        never public and are only accessible to site administrators.
      </p>
    ),
  },
  {
    id: 'basis',
    title: 'Why we are allowed to hold it',
    body: (
      <p>
        Where the UK or EU GDPR applies, our lawful basis is legitimate interest: operating the service, producing the
        analytics we advertise, and preventing fraud and abuse. For messages you send us, the basis is your consent in
        sending them.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <ul>
        <li>
          <strong>Links:</strong> for as long as the link exists. Removed links are retained in a disabled state so the
          same code is not reissued.
        </li>
        <li>
          <strong>Click records:</strong> indefinitely in aggregate. The per-visit rows carrying IP addresses are what a
          deletion request removes.
        </li>
        <li>
          <strong>Messages and reports:</strong> until resolved and archived.
        </li>
        <li>
          <strong>Administrator audit logs:</strong> retained for security review.
        </li>
      </ul>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    body: (
      <p>
        Nobody, other than the infrastructure providers needed to run the service, meaning our hosting platform and our
        database provider, which process it on our behalf. We will disclose data if legally compelled to.
      </p>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: (
      <p>
        You can ask us to confirm what we hold about you, correct it, or delete it. Message us through the{' '}
        <Link href="/contact">contact form</Link> with enough detail to identify the record, such as the short link in
        question or the email address you used. We respond within 30 days.
      </p>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        All traffic is served over HTTPS and database connections are TLS-encrypted. Administrator accounts use hashed
        passwords, short-lived signed sessions, and rate-limited sign-in with automatic lockout.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        The service is not directed at children under 13, and we do not knowingly collect their personal data. If you
        believe we have, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes',
    body: (
      <p>
        We may update this policy. Material changes will be reflected in the &ldquo;last updated&rdquo; date above.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(pageGraph({ path: '/privacy', title: TITLE, description: DESCRIPTION })) }}
      />
      <section className="page-hero" style={{ paddingBottom: 8 }}>
        <div className="hero__glow hero__glow--2" aria-hidden="true" />
        <div className="container">
          <span className="section__eyebrow">Legal</span>
          <h1 className="page-hero__title" style={{ maxWidth: '18ch' }}>
            Privacy Policy
          </h1>
          <p className="page-hero__lede">
            The short version: we collect the minimum needed to run a link shortener and stop it being abused. No
            tracking cookies, no advertising, no data sales.
          </p>
        </div>
      </section>

      <div className="container" style={{ paddingBottom: 40 }}>
        <div className="doc">
          <nav className="doc__toc" aria-label="Contents">
            <h2>On this page</h2>
            <ol>
              {SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="doc__body surface-card">
            <div className="doc__meta">
              <span>Last updated: {UPDATED}</span>
              <span>Applies to: {shortDomain}</span>
            </div>

            {SECTIONS.map((section, index) => (
              <section key={section.id} id={section.id}>
                <h2>
                  {index + 1}. {section.title}
                </h2>
                <div className="prose">{section.body}</div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </>
  );
}
