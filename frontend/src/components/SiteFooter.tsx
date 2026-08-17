import Link from 'next/link';
import { Logo } from './Logo';
import { APP_VERSION, GITHUB_URL, RELEASE_URL, SITE, shortDomain } from '@/lib/config';

/**
 * Server component, deliberately free of antd so it renders with zero
 * client-side JavaScript.
 */

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/', label: 'Shorten a link' },
      { href: '/analytics', label: 'Link analytics' },
      { href: '/#features', label: 'Features' },
      { href: '/#how-it-works', label: 'How it works' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/contact', label: 'Contact us' },
      { href: '/report', label: 'Report abuse' },
      { href: '/#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms of service' },
      { href: '/privacy', label: 'Privacy policy' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div>
            <span className="brand">
              <Logo size={32} />
              <span className="brand__word">{SITE.fullName}</span>
            </span>
            <p className="site-footer__blurb">
              A fast, free URL shortener with QR codes and real click analytics. Links are served from{' '}
              <strong>{shortDomain}</strong>. No account, no tracking cookies.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h4>{column.title}</h4>
              <nav className="site-footer__links" aria-label={column.title}>
                {column.links.map((link) => (
                  <Link key={link.href + link.label} href={link.href}>
                    {link.label}
                  </Link>
                ))}
                {column.title === 'Product' && (
                  <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                    Source on GitHub
                  </a>
                )}
              </nav>
            </div>
          ))}
        </div>

        <div className="site-footer__bottom">
          <span>
            © {new Date().getFullYear()} {SITE.fullName}. Open source under the MIT licence.
          </span>
          <span>
            Built by{' '}
            <a href="https://github.com/shehari007" target="_blank" rel="noopener noreferrer">
              {SITE.author}
            </a>{' '}
            ·{' '}
            <a
              className="site-footer__version"
              href={RELEASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={`Release notes for v${APP_VERSION}`}
            >
              v{APP_VERSION}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
