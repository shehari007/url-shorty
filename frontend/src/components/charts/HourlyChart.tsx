'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useThemeMode } from '@/theme/ThemeProvider';

/**
 * Clicks per UTC hour over the last 24 hours.
 * The busiest hour is highlighted so the shape of the day reads at a glance.
 */
export function HourlyChart({ data, height = 190 }: { data: { hour: number; visits: number }[]; height?: number }) {
  const { mode } = useThemeMode();

  const base = mode === 'dark' ? '#273246' : '#e3e8f0';
  const peakColor = mode === 'dark' ? '#22d3ee' : '#0891b2';
  const activeColor = mode === 'dark' ? '#60a5fa' : '#2563eb';
  const axis = mode === 'dark' ? '#8492b0' : '#64748b';
  const surface = mode === 'dark' ? '#18202f' : '#ffffff';
  const border = mode === 'dark' ? '#273246' : '#e3e8f0';
  const text = mode === 'dark' ? '#eef4ff' : '#0f172a';

  const peak = data.reduce((best, current) => (current.visits > best.visits ? current : best), data[0] ?? { hour: 0, visits: 0 });
  const hasTraffic = data.some((point) => point.visits > 0);

  const formatted = data.map((point) => ({ ...point, label: `${String(point.hour).padStart(2, '0')}:00` }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} margin={{ top: 6, right: 4, bottom: 0, left: -22 }} barCategoryGap="18%">
          <XAxis
            dataKey="label"
            tick={{ fill: axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={3}
          />
          <YAxis tick={{ fill: axis, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={42} />
          <Tooltip
            cursor={{ fill: mode === 'dark' ? 'rgba(255,255,255,.04)' : 'rgba(15,23,42,.04)' }}
            contentStyle={{
              background: surface,
              border: `1px solid ${border}`,
              borderRadius: 12,
              color: text,
              fontSize: 13,
            }}
            labelStyle={{ color: axis, marginBottom: 2 }}
            formatter={(value: unknown) => [Number(value ?? 0).toLocaleString('en-US'), 'Clicks']}
          />
          <Bar dataKey="visits" radius={[4, 4, 0, 0]}>
            {formatted.map((point) => (
              <Cell
                key={point.hour}
                fill={hasTraffic && point.hour === peak.hour ? peakColor : point.visits > 0 ? activeColor : base}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
