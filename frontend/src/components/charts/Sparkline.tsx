'use client';

import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { TileAccent } from '../admin/StatTile';

/**
 * Tiny trend line for a metric tile. No axes, no grid, no tooltip: it exists to
 * show shape, and the exact numbers live in the tile itself.
 */
export function Sparkline({ data, accent = 'blue', height = 38 }: { data: number[]; accent?: TileAccent; height?: number }) {
  if (data.length < 2) return null;

  const points = data.map((value, index) => ({ index, value }));
  const gradientId = `spark-${accent}-${data.length}-${Math.round(data.reduce((a, b) => a + b, 0))}`;
  const stroke = `var(--a-${accent})`;

  return (
    <div style={{ width: '100%', height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.34} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.9}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
