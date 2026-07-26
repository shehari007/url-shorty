import type { ReactNode } from 'react';

export interface HeroPoint {
  icon: ReactNode;
  accent: 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet';
  title: string;
  body: string;
}

/**
 * Two-column page header: the argument on the left, the thing you came to do on
 * the right. Replaces the narrow centred column the interior pages used to have,
 * which wasted most of the viewport on wide screens.
 *
 * Pure markup, so it renders in Server Components. Icons are passed in by the
 * caller from the client-side icon barrel.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  points,
  aside,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  points?: HeroPoint[];
  /** The panel on the right, usually a form or a lookup box. */
  aside: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="hero__glow hero__glow--1" aria-hidden="true" />
      <div className="hero__glow hero__glow--2" aria-hidden="true" />

      <div className="container page-hero__inner">
        <div className="page-hero__lead">
          <span className="section__eyebrow">{eyebrow}</span>
          <h1 className="page-hero__title">{title}</h1>
          <p className="page-hero__lede">{lede}</p>

          {points && points.length > 0 && (
            <ul className="point-list">
              {points.map((point) => (
                <li
                  key={point.title}
                  style={
                    {
                      '--accent': `var(--a-${point.accent})`,
                      '--accent-bg': `var(--a-${point.accent}-bg)`,
                    } as React.CSSProperties
                  }
                >
                  <span className="point-list__icon" aria-hidden="true">
                    {point.icon}
                  </span>
                  <span>
                    <strong>{point.title}</strong>
                    {point.body}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="page-hero__aside">{aside}</div>
      </div>
    </section>
  );
}
