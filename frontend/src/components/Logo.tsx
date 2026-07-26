/**
 * Brand mark.
 *
 * A chain link inside a rounded badge, with an orbit ring for the "web" idea.
 * Drawn inline as SVG so it is crisp at any size, themeable, cacheable with the
 * HTML, and costs no extra network request.
 *
 * Pure SVG with no hooks, so it renders in Server Components too.
 */
export function Logo({ size = 34, withRing = true }: { size?: number; withRing?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Shorty"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="shortyBadge" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="0.5" stopColor="#06B6D4" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="shortyShine" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.34" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="13" fill="url(#shortyBadge)" />
      <rect width="48" height="48" rx="13" fill="url(#shortyShine)" />

      {/* Orbit ring: the "web" half of the mark. */}
      {withRing && (
        <ellipse
          cx="24"
          cy="24"
          rx="16.5"
          ry="7.5"
          transform="rotate(-30 24 24)"
          stroke="#fff"
          strokeOpacity="0.42"
          strokeWidth="1.6"
        />
      )}

      {/* Two interlocking link halves. */}
      <g stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none">
        <path d="M20.4 27.6 27.6 20.4" />
        <path d="M18.6 22.2 16.2 24.6a5.1 5.1 0 0 0 7.2 7.2l2.4-2.4" />
        <path d="M29.4 25.8l2.4-2.4a5.1 5.1 0 0 0-7.2-7.2l-2.4 2.4" />
      </g>
    </svg>
  );
}

/** Wordmark plus badge, used in the header, footer and login screen. */
export function LogoLockup({ size = 34, textSize = 17 }: { size?: number; textSize?: number }) {
  return (
    <>
      <Logo size={size} />
      <span className="brand__word" style={{ fontSize: textSize }}>
        Shorty
      </span>
    </>
  );
}
