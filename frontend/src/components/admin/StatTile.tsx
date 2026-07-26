'use client';

import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { ReactNode } from 'react';
import { Sparkline } from '../charts/Sparkline';
import { CountUp } from '../motion/CountUp';
import { compactNumber, fullNumber } from '@/lib/format';

export type TileAccent = 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet';

export interface Delta {
  /** Percentage change against the preceding period. */
  percent: number;
  label: string;
  /** False when a rise is bad, e.g. blocked links. */
  higherIsBetter?: boolean;
}

/**
 * Admin metric tile: value, optional period-over-period delta, and an optional
 * sparkline. The exact figure is on hover so the tile itself stays compact.
 */
export function StatTile({
  icon,
  label,
  value,
  hint,
  accent = 'blue',
  delta,
  trend,
  animate = true,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint?: string;
  accent?: TileAccent;
  delta?: Delta;
  /** Series for the sparkline, oldest first. */
  trend?: number[];
  animate?: boolean;
}) {
  return (
    <div
      className="metric"
      style={{ '--accent': `var(--a-${accent})`, '--accent-bg': `var(--a-${accent}-bg)` } as React.CSSProperties}
    >
      <div className="metric__head">
        <div style={{ minWidth: 0 }}>
          <Tooltip title={fullNumber(value)}>
            <div className="metric__value">{animate ? <CountUp value={value} /> : compactNumber(value)}</div>
          </Tooltip>
          <div className="metric__label">{label}</div>
        </div>
        <div className="metric__icon" aria-hidden="true">
          {icon}
        </div>
      </div>

      {delta && <DeltaBadge {...delta} />}

      {trend && trend.length > 1 && (
        <div className="metric__spark">
          <Sparkline data={trend} accent={accent} />
        </div>
      )}

      {hint && <div className="metric__hint">{hint}</div>}
    </div>
  );
}

function DeltaBadge({ percent, label, higherIsBetter = true }: Delta) {
  const flat = Math.abs(percent) < 1;
  const rising = percent > 0;
  // "Good" is about direction, not sign: more blocked links is not an improvement.
  const good = flat ? null : rising === higherIsBetter;

  const tone = good === null ? 'flat' : good ? 'up' : 'down';
  const icon = flat ? <MinusOutlined /> : rising ? <ArrowUpOutlined /> : <ArrowDownOutlined />;

  return (
    <div className={`delta delta--${tone}`}>
      {icon}
      <span className="tabular">{flat ? 'No change' : `${Math.abs(Math.round(percent))}%`}</span>
      <span className="delta__label">{label}</span>
    </div>
  );
}
