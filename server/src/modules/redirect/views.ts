import { env } from '../../config/env.js';

/**
 * Self-contained interstitial pages served by the redirect host.
 *
 * No external CSS, fonts, or scripts. They must render instantly and satisfy
 * the strict CSP set in `middleware/security.ts`.
 */

/** Everything interpolated into these templates is escaped. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface PageOptions {
  title: string;
  heading: string;
  body: string;
  accent: string;
  glyph: string;
  code: string | null;
  statusLabel: string;
}

function render({ title, heading, body, accent, glyph, code, statusLabel }: PageOptions): string {
  const safeCode = code ? escapeHtml(code) : null;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)} · Shorty</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  :root{color-scheme:light dark;--bg:#f8fafc;--card:#fff;--fg:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:${accent}}
  @media (prefers-color-scheme:dark){:root{--bg:#020617;--card:#0f172a;--fg:#f8fafc;--muted:#94a3b8;--border:#1e293b}}
  html,body{margin:0;height:100%}
  body{background:var(--bg);color:var(--fg);font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
       display:grid;place-items:center;padding:24px}
  .card{width:100%;max-width:480px;background:var(--card);border:1px solid var(--border);border-radius:20px;
        padding:40px 32px;text-align:center;box-shadow:0 12px 40px rgba(2,6,23.08)}
  .glyph{width:72px;height:72px;margin:0 auto 24px;border-radius:20px;display:grid;place-items:center;
         font-size:34px;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent)}
  h1{margin:0 0 12px;font-size:23px;line-height:1.3;letter-spacing:-.02em}
  p{margin:0 0 8px;color:var(--muted);font-size:15px}
  .status{display:inline-block;margin-bottom:20px;padding:5px 12px;border-radius:999px;font-size:12px;
          font-weight:600;letter-spacing:.06em;text-transform:uppercase;
          background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent)}
  code{display:block;margin:20px 0 4px;padding:12px 14px;border-radius:12px;background:var(--bg);
       border:1px solid var(--border);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;
       word-break:break-all;color:var(--fg)}
  .actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:28px}
  a.btn{display:inline-block;padding:11px 20px;border-radius:11px;text-decoration:none;font-weight:600;font-size:14px;
        border:1px solid var(--border);color:var(--fg);transition:transform .12s ease}
  a.btn:hover{transform:translateY(-1px)}
  a.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
  footer{margin-top:26px;font-size:12.5px;color:var(--muted)}
  footer a{color:var(--muted)}
</style>
</head>
<body>
  <main class="card">
    <div class="glyph" aria-hidden="true">${glyph}</div>
    <span class="status">${escapeHtml(statusLabel)}</span>
    <h1>${escapeHtml(heading)}</h1>
    <p>${body}</p>
    ${safeCode ? `<code>${safeCode}</code>` : ''}
    <div class="actions">
      <a class="btn primary" href="${escapeHtml(env.HOMEPAGE_LINK)}">Create a short link</a>
      <a class="btn" href="${escapeHtml(env.CONTACTUS_LINK)}">Contact support</a>
    </div>
    <footer>Shorty · <a href="${escapeHtml(env.HOMEPAGE_LINK)}">${escapeHtml(
      new URL(env.HOMEPAGE_LINK).host,
    )}</a></footer>
  </main>
</body>
</html>`;
}

export const views = {
  notFound: (code: string | null) =>
    render({
      title: 'Link not found',
      statusLabel: '404 · Not found',
      heading: 'This short link does not exist',
      body: 'The link may have been mistyped, or it may never have been created. Double-check the address and try again.',
      accent: '#6366f1',
      glyph: '🔍',
      code,
    }),

  expired: (code: string | null) =>
    render({
      title: 'Link expired',
      statusLabel: '410 · Expired',
      heading: 'This short link has expired',
      body: 'The person who created this link set it to expire, or it was retired by our team. You will need a fresh link from whoever shared it.',
      accent: '#f59e0b',
      glyph: '⏳',
      code,
    }),

  blocked: (code: string | null) =>
    render({
      title: 'Link blocked',
      statusLabel: '410 · Blocked',
      heading: 'This link was blocked for safety',
      body: 'Our team disabled this link after it was reported for phishing, malware, or other abuse. You have not been taken to the destination.',
      accent: '#ef4444',
      glyph: '🛡️',
      code,
    }),

  error: () =>
    render({
      title: 'Something went wrong',
      statusLabel: '500 · Error',
      heading: 'We could not resolve this link',
      body: 'Something failed on our side while looking up this link. Please try again in a moment.',
      accent: '#ef4444',
      glyph: '⚠️',
      code: null,
    }),
};
