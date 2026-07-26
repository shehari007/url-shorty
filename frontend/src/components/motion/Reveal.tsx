'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Reveals its children once they scroll into view.
 *
 * The element starts visible in the DOM and is only *visually* offset, so the
 * content is always present for crawlers and for anyone with JavaScript off.
 * `prefers-reduced-motion` skips the animation entirely.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
  y = 18,
}: {
  children: ReactNode;
  /** Stagger, in milliseconds. */
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'li';
  className?: string;
  y?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      // Fire slightly before the element reaches the viewport edge.
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`reveal${shown ? ' reveal--in' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms`, '--reveal-y': `${y}px` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
