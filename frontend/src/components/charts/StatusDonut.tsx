'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { fullNumber } from '@/lib/format';
import { useThemeMode } from '@/theme/ThemeProvider';

export interface Slice {
  name: string;
  value: number;
  accent: 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet';
}

const ACCENT_HEX: Record<Slice['accent'], { light: string; dark: string }> = {
  blue: { light: '#2563eb', dark: '#60a5fa' },
  cyan: { light: '#0891b2', dark: '#22d3ee' },
  emerald: { light: '#059669', dark: '#34d399' },
  amber: { light: '#d97706', dark: '#fbbf24' },
  rose: { light: '#e11d48', dark: '#fb7185' },
  violet: { light: '#7c3aed', dark: '#a78bfa' },
};

/**
 * Donut with a total in the middle and a legend beneath.
 * Zero-value slices are dropped so the ring never renders a hairline wedge.
 */
export function StatusDonut({ data, centerLabel, height = 214 }: { data: Slice[]; centerLabel: string; height?: number }) {
  const { mode } = useThemeMode();

  const slices = data.filter((slice) => slice.value > 0);
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  const colorOf = (accent: Slice['accent']) => ACCENT_HEX[accent][mode === 'dark' ? 'dark' : 'light'];
  const surface = mode === 'dark' ? '#18202f' : '#ffffff';
  const border = mode === 'dark' ? '#273246' : '#e3e8f0';
  const text = mode === 'dark' ? '#eef4ff' : '#0f172a';

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices.length > 0 ? slices : [{ name: 'No data', value: 1, accent: 'blue' as const }]}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={slices.length > 1 ? 3 : 0}
              stroke="none"
            >
              {(slices.length > 0 ? slices : [{ name: 'No data', value: 1, accent: 'blue' as const }]).map((slice) => (
                <Cell key={slice.name} fill={slices.length > 0 ? colorOf(slice.accent) : border} />
              ))}
            </Pie>
            {slices.length > 0 && (
              <Tooltip
                contentStyle={{
                  background: surface,
                  border: `1px solid ${border}`,
                  borderRadius: 12,
                  color: text,
                  fontSize: 13,
                }}
                formatter={(value: unknown, name: unknown) => [fullNumber(Number(value ?? 0)), String(name)]}
              />
            )}
          </PieChart>
        </ResponsiveContainer>

        {/* Centre readout, positioned over the ring's hole. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              {fullNumber(total)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{centerLabel}</div>
          </div>
        </div>
      </div>

      <div className="donut-legend">
        {data.map((slice) => (
          <div key={slice.name} className="donut-legend__item">
            <span className="donut-legend__dot" style={{ background: colorOf(slice.accent) }} aria-hidden="true" />
            <span className="donut-legend__name">{slice.name}</span>
            <span className="donut-legend__value tabular">{fullNumber(slice.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
