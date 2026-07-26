import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

/**
 * Plain markup. No antd. This page must render even if something in the
 * component layer is what failed.
 */
export default function NotFound() {
  return (
    <div className="result-page">
      <div>
        <div className="result-page__code" aria-hidden="true">
          404
        </div>
        <h1>Page not found</h1>
        <p>
          The page you are looking for does not exist, or it has moved. If you followed a short link, it may have
          expired or been removed for abuse.
        </p>
        <div className="result-page__actions">
          <Link className="btn btn--primary" href="/">
            Back to home
          </Link>
          <Link className="btn" href="/contact">
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
