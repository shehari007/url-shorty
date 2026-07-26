'use client';

import {
  GlobalOutlined,
  LinkOutlined,
  QrcodeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { CountUp } from './motion/CountUp';
import { Reveal } from './motion/Reveal';
import type { PlatformStats } from '@/lib/types';

/**
 * Live platform counters.
 *
 * The figures are fetched on the server and passed in, so they are already in
 * the HTML for crawlers. The count-up is a purely visual flourish that runs
 * when the band scrolls into view.
 */

type Accent = 'blue' | 'cyan' | 'emerald' | 'amber';

const TILES: {
  key: keyof PlatformStats;
  label: string;
  icon: React.ReactNode;
  accent: Accent;
  ribbon?: string;
}[] = [
  { key: 'totalLinks', label: 'Links shortened', icon: <LinkOutlined />, accent: 'blue' },
  { key: 'totalClicks', label: 'Clicks served', icon: <GlobalOutlined />, accent: 'cyan' },
  { key: 'qrDownloads', label: 'QR codes downloaded', icon: <QrcodeOutlined />, accent: 'emerald' },
  { key: 'linksToday', label: 'Created today', icon: <ThunderboltOutlined />, accent: 'amber', ribbon: 'Live' },
];

export function StatsBand({ totals }: { totals: PlatformStats }) {
  return (
    <div className="grid grid-4">
      {TILES.map((tile, index) => (
        <Reveal key={tile.key} delay={index * 80}>
          <div
            className="stat-card"
            style={
              {
                '--accent': `var(--a-${tile.accent})`,
                '--accent-bg': `var(--a-${tile.accent}-bg)`,
              } as React.CSSProperties
            }
          >
            {tile.ribbon && <span className="ribbon">{tile.ribbon}</span>}
            <div className="stat-card__icon" aria-hidden="true">
              {tile.icon}
            </div>
            <div className="stat-card__value">
              <CountUp value={totals[tile.key]} />
            </div>
            <div className="stat-card__label">{tile.label}</div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
