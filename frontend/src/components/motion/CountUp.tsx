'use client';

import { useEffect, useRef, useState } from 'react';
import { compactNumber } from '@/lib/format';

/**
 * Counts up to `value` the first time it scrolls into view.
 *
 * The final number is rendered on the server and shown immediately if motion is
 * reduced, so the real figure is always in the HTML rather than animated in.
 */
export function CountUp({
  value,
  duration = 1400,
  format = compactNumber,
}: {
  value: number;
  duration?: number;
  format?: (value: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || started) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setStarted(true);

        const from = 0;
        const startedAt = performance.now();
        let frame = 0;

        const tick = (now: number) => {
          const progress = Math.min(1, (now - startedAt) / duration);
          // easeOutExpo: fast start, gentle settle.
          const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          setDisplay(Math.round(from + (value - from) * eased));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };

        setDisplay(0);
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration, started]);

  // Keep in sync if the parent refetches a new figure.
  useEffect(() => {
    if (started) setDisplay(value);
  }, [value, started]);

  return (
    <span ref={ref} className="tabular">
      {format(display)}
    </span>
  );
}
