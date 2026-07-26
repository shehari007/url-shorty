'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useThemeMode } from '@/theme/ThemeProvider';

interface Point {
  date: string;
  value: number;
}

/**
 * Single-series area chart used for click and link trends.
 * Colours are read from the active theme rather than hard-coded so the chart
 * stays legible in both light and dark mode.
 */
export function TrendChart({ data, label, height = 260 }: { data: Point[]; label: string; height?: number }) {
  const { mode } = useThemeMode();

  const stroke = mode === 'dark' ? '#60a5fa' : '#2563eb';
  const grid = mode === 'dark' ? '#273246' : '#eef2f8';
  const axis = mode === 'dark' ? '#8492b0' : '#64748b';
  const surface = mode === 'dark' ? '#18202f' : '#ffffff';
  const border = mode === 'dark' ? '#273246' : '#e3e8f0';
  const text = mode === 'dark' ? '#eef4ff' : '#0f172a';

  const formatted = data.map((point) => ({
    ...point,
    label: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: axis, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: grid }}
            minTickGap={24}
          />
          <YAxis tick={{ fill: axis, fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
          <Tooltip
            cursor={{ stroke: stroke, strokeWidth: 1, strokeDasharray: '4 4' }}
            contentStyle={{
              background: surface,
              border: `1px solid ${border}`,
              borderRadius: 12,
              color: text,
              fontSize: 13,
              boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            }}
            labelStyle={{ color: axis, marginBottom: 4 }}
            formatter={(value) => [Number(value ?? 0).toLocaleString('en-US'), label]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2.4}
            fill="url(#trendFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: surface }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
