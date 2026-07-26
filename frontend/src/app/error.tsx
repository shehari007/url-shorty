'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary. The raw error message is deliberately not shown, * it can carry internal detail. But the digest is, so a user report can be
 * matched against server logs.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="result-page">
      <div>
        <div className="result-page__code" aria-hidden="true">
          500
        </div>
        <h1>Something went wrong</h1>
        <p>An unexpected error stopped this page from loading. Try again, if it keeps happening, let us know.</p>
        {error.digest && (
          <p style={{ marginTop: 12, fontSize: 13, opacity: 0.7 }}>
            Reference: <code className="mono">{error.digest}</code>
          </p>
        )}
        <div className="result-page__actions">
          <button type="button" className="btn btn--primary" onClick={reset}>
            Try again
          </button>
          <a className="btn" href="/">
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
