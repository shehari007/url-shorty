import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE, shortDomain } from '@/lib/config';
import { jsonLd, pageGraph, updatedLabel } from '@/lib/seo';

const TITLE = 'Terms of Service';
const DESCRIPTION = `The rules for using ${SITE.fullName}: acceptable use, prohibited content, moderation and liability.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'article',
    title: `${TITLE} · Shorty`,
    description: DESCRIPTION,
    url: '/terms',
  },
};

// Comes from the route table, so the date shown here and the <lastmod> in the
// sitemap can never disagree.
const UPDATED = updatedLabel('/terms');

/** Sections drive both the contents sidebar and the body, so they cannot drift. */
const SECTIONS = [
  {
    id: 'service',
    title: 'What the service does',
    body: (
      <p>
        {SITE.fullName} converts a long URL into a short one and records aggregate statistics about clicks on it. It is
        provided free of charge, with no account required.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>You agree not to use the service to create links that lead to, or facilitate:</p>
        <ul>
          <li>Phishing, credential harvesting, or impersonation of a person or organisation.</li>
          <li>Malware, ransomware, spyware, or any unwanted automatic download.</li>
          <li>Unsolicited bulk messaging, comment spam, or deceptive advertising.</li>
          <li>Content that is illegal in your jurisdiction or ours, including child sexual abuse material.</li>
          <li>Harassment, doxxing, incitement to violence, or targeted abuse of any individual.</li>
          <li>Infringement of copyright, trademark, or other intellectual-property rights.</li>
          <li>Circumvention of the service&rsquo;s rate limits, moderation, or abuse controls.</li>
        </ul>
        <p>
          You also agree not to shorten links pointing at private, internal, or loopback network addresses. These are
          rejected automatically.
        </p>
      </>
    ),
  },
  {
    id: 'moderation',
    title: 'Moderation and removal',
    body: (
      <p>
        We may disable, expire, or delete any short link at any time, with or without notice, if we believe it breaks
        these terms. Anyone can <Link href="/report">report a link</Link>; a link that accumulates reports past our
        threshold is disabled automatically pending review. Disabling a link is not reversible by you, so contact us if
        you believe one was removed in error.
      </p>
    ),
  },
  {
    id: 'permanence',
    title: 'Link permanence',
    body: (
      <p>
        We intend for short links to keep working indefinitely, but we do not guarantee it. Do not rely on the service
        for anything where a broken link would cause you loss, and keep your own record of the destination URLs.
      </p>
    ),
  },
  {
    id: 'availability',
    title: 'Availability',
    body: (
      <p>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, with no warranty of any kind,
        express or implied. We do not guarantee any level of uptime, performance, or data retention, and we may change
        or discontinue any part of it at any time.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <>
        <p>
          To the maximum extent permitted by law, {SITE.fullName}, its authors, and its contributors are not liable for
          any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, revenue,
          data, or goodwill, arising from your use of or inability to use the service.
        </p>
        <p>
          We do not control the destinations that short links point to and are not responsible for their content. Follow
          any link at your own risk.
        </p>
      </>
    ),
  },
  {
    id: 'your-content',
    title: 'Your content',
    body: (
      <p>
        You keep whatever rights you have in the URLs you submit. By submitting one you grant us the limited licence
        needed to store it, serve redirects to it, and display aggregate statistics about it.
      </p>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy',
    body: (
      <p>
        Our handling of personal data is described in the <Link href="/privacy">Privacy Policy</Link>, which forms part
        of these terms.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes',
    body: (
      <p>
        We may update these terms. Material changes will be reflected in the &ldquo;last updated&rdquo; date above.
        Continuing to use the service after a change means you accept the revised terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions about these terms? <Link href="/contact">Get in touch</Link>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(pageGraph({ path: '/terms', title: TITLE, description: DESCRIPTION })) }}
      />
      <section className="page-hero" style={{ paddingBottom: 8 }}>
        <div className="hero__glow hero__glow--1" aria-hidden="true" />
        <div className="container">
          <span className="section__eyebrow">Legal</span>
          <h1 className="page-hero__title" style={{ maxWidth: '18ch' }}>
            Terms of Service
          </h1>
          <p className="page-hero__lede">
            The rules for using {SITE.fullName} and the short links served from <strong>{shortDomain}</strong>.
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

            <div className="prose">
              <p>
                These terms cover your use of {SITE.fullName} (&ldquo;the service&rdquo;), the website you are reading,
                and the short links served from <strong>{shortDomain}</strong>. By creating a short link you accept them.
              </p>
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
