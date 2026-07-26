'use client';

import {
  BarChartOutlined,
  CalendarOutlined,
  DesktopOutlined,
  EyeOutlined,
  GlobalOutlined,
  RobotOutlined,
  SearchOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Alert, App, Card, Empty, Input, Progress, Tag, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { shortDomain } from '@/lib/config';
import { countryFlag, formatDateTime, fullNumber, prettyUrl } from '@/lib/format';
import type { PublicLinkStats } from '@/lib/types';
import { TrendChart } from './charts/TrendChart';
import { CountUp } from './motion/CountUp';
import { Reveal } from './motion/Reveal';

const { Text } = Typography;

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  active: { color: 'success', label: 'Active' },
  expired: { color: 'warning', label: 'Expired' },
  blocked: { color: 'error', label: 'Blocked' },
  deleted: { color: 'default', label: 'Removed' },
  not_found: { color: 'default', label: 'Unknown' },
};

const POINTS = [
  {
    icon: <ThunderboltOutlined />,
    accent: 'blue',
    title: 'Clicks and unique visitors',
    body: 'Totals, today, this week, and a day-by-day trend across the last 30 days.',
  },
  {
    icon: <GlobalOutlined />,
    accent: 'cyan',
    title: 'Where the traffic came from',
    body: 'Referring sites, countries and device types, each ranked by share.',
  },
  {
    icon: <RobotOutlined />,
    accent: 'emerald',
    title: 'Bots counted separately',
    body: 'Crawlers and link previews are excluded, so the numbers reflect real people.',
  },
] as const;

export function LinkAnalytics() {
  const { message } = App.useApp();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PublicLinkStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const lookup = useCallback(
    async (raw: string) => {
      const target = raw.trim();
      if (!target) {
        message.warning('Paste a Shorty link to look up');
        return;
      }

      setLoading(true);
      setSearched(true);
      setError(null);

      try {
        const result = await api.linkStats(target);
        setData(result);
        // Keep the URL shareable without a full navigation.
        router.replace(`/analytics?url=${encodeURIComponent(target)}`, { scroll: false });
      } catch (caught) {
        setData(null);
        setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [message, router],
  );

  /**
   * The `?url=` parameter is read from the location on mount rather than with
   * useSearchParams, which would opt this page out of prerendering and leave
   * the hero copy out of the served HTML.
   */
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get('url');
    if (preset) {
      setInput(preset);
      void lookup(preset);
    }
    // Mount-only; later lookups come from the search box.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = data ? (STATUS_TAG[data.link.status] ?? STATUS_TAG.not_found!) : null;

  return (
    <>
      {/* ------------------------------ hero ------------------------------ */}
      <section className="page-hero">
        <div className="hero__glow hero__glow--1" aria-hidden="true" />
        <div className="hero__glow hero__glow--2" aria-hidden="true" />

        <div className="container page-hero__inner">
          <div className="page-hero__lead">
            <span className="section__eyebrow">Analytics</span>
            <h1 className="page-hero__title">See how any short link is really performing.</h1>
            <p className="page-hero__lede">
              Paste a <strong>{shortDomain}</strong> link to get its full click history. Aggregate statistics are
              public for every Shorty link, so you can check one even if you did not create it.
            </p>

            <ul className="point-list">
              {POINTS.map((point) => (
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
          </div>

          <div className="page-hero__aside">
            <div className="panel">
              <h2 className="panel__title">Look up a link</h2>
              <p className="panel__hint">Paste the full short URL, or just the code after the slash.</p>

              <Input.Search
                size="large"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onSearch={(value) => void lookup(value)}
                placeholder={`${shortDomain}/abc123`}
                enterButton={<SearchOutlined />}
                loading={loading}
                allowClear
                aria-label="Shorty link to analyse"
              />

              <Text type="secondary" style={{ display: 'block', marginTop: 14, fontSize: 12.5, lineHeight: 1.6 }}>
                Individual visitor details are never shown. Only totals and breakdowns are public.
              </Text>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------- results ---------------------------- */}
      <div className="container" style={{ paddingBottom: 24 }}>
        {loading && (
          <div className="results" aria-hidden="true">
            <div className="skeleton-block" style={{ height: 128 }} />
            <div className="grid grid-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton-block" style={{ height: 132 }} />
              ))}
            </div>
            <div className="skeleton-block" style={{ height: 300 }} />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon title="We could not load that link" description={error} />
        )}

        {!loading && !error && searched && !data && (
          <Card variant="borderless">
            <Empty description="No results" />
          </Card>
        )}

        {!loading && data && (
          <div className="results">
            {/* ---------------------- link summary ---------------------- */}
            <Reveal>
              <Card variant="borderless">
                <div className="row-between" style={{ marginBottom: 14 }}>
                  <a
                    href={data.link.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono"
                    style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-500)', wordBreak: 'break-all' }}
                  >
                    {data.link.shortUrl.replace(/^https?:\/\//, '')}
                  </a>
                  {status && <Tag color={status.color}>{status.label}</Tag>}
                </div>

                <div className="summary-grid">
                  <div>
                    <span className="summary-grid__cap">Destination</span>
                    <span className="summary-grid__val truncate" title={data.link.destination}>
                      {prettyUrl(data.link.destination, 60)}
                    </span>
                  </div>
                  <div>
                    <span className="summary-grid__cap">Created</span>
                    <span className="summary-grid__val">{formatDateTime(data.link.createdAt)}</span>
                  </div>
                  <div>
                    <span className="summary-grid__cap">Last click</span>
                    <span className="summary-grid__val">{formatDateTime(data.link.lastClickedAt, 'Never clicked')}</span>
                  </div>
                </div>

                {data.link.status === 'blocked' && (
                  <Alert
                    style={{ marginTop: 16 }}
                    type="error"
                    showIcon
                    title="This link has been blocked"
                    description="It was disabled after abuse reports and no longer redirects."
                  />
                )}
                {data.link.status === 'expired' && (
                  <Alert
                    style={{ marginTop: 16 }}
                    type="warning"
                    showIcon
                    title="This link has expired"
                    description="It no longer redirects to its destination."
                  />
                )}
              </Card>
            </Reveal>

            {/* -------------------------- totals ------------------------- */}
            <div className="grid grid-4">
              <Reveal delay={0}>
                <Metric icon={<ThunderboltOutlined />} accent="blue" label="Total clicks" value={data.totals.totalVisits} />
              </Reveal>
              <Reveal delay={70}>
                <Metric icon={<TeamOutlined />} accent="cyan" label="Unique visitors" value={data.totals.uniqueVisitors} />
              </Reveal>
              <Reveal delay={140}>
                <Metric icon={<EyeOutlined />} accent="emerald" label="Clicks today" value={data.totals.visitsToday} />
              </Reveal>
              <Reveal delay={210}>
                <Metric icon={<CalendarOutlined />} accent="amber" label="Last 7 days" value={data.totals.visitsLast7Days} />
              </Reveal>
            </div>

            {/* -------------------- trend and devices -------------------- */}
            <div className="results__split">
              <Reveal>
                <Card
                  variant="borderless"
                  title={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <BarChartOutlined style={{ color: 'var(--a-blue)' }} /> Clicks over 30 days
                    </span>
                  }
                >
                  {data.daily.length > 0 ? (
                    <TrendChart
                      data={data.daily.map((point) => ({ date: point.date, value: point.visits }))}
                      label="Clicks"
                      height={280}
                    />
                  ) : (
                    <Empty description="No clicks recorded yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </Card>
              </Reveal>

              <Reveal delay={90}>
                <Card
                  variant="borderless"
                  title={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <DesktopOutlined style={{ color: 'var(--a-violet)' }} /> Devices
                    </span>
                  }
                >
                  <ShareList
                    rows={data.devices.map((row) => ({
                      key: row.device,
                      name: row.device.charAt(0).toUpperCase() + row.device.slice(1),
                      value: row.visits,
                    }))}
                    accent="violet"
                  />
                  {data.totals.botVisits > 0 && (
                    <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 12.5, lineHeight: 1.6 }}>
                      <RobotOutlined /> {fullNumber(data.totals.botVisits)} further visits were identified as bots or
                      link previews and are excluded from every figure above.
                    </Text>
                  )}
                </Card>
              </Reveal>
            </div>

            {/* ------------------ referrers and countries ---------------- */}
            <div className="grid grid-2">
              <Reveal>
                <Card
                  variant="borderless"
                  title={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <GlobalOutlined style={{ color: 'var(--a-cyan)' }} /> Top referrers
                    </span>
                  }
                >
                  <ShareList
                    rows={data.referrers.map((row) => ({ key: row.referrer, name: row.referrer, value: row.visits }))}
                    accent="cyan"
                  />
                </Card>
              </Reveal>

              <Reveal delay={90}>
                <Card
                  variant="borderless"
                  title={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <GlobalOutlined style={{ color: 'var(--a-emerald)' }} /> Top countries
                    </span>
                  }
                >
                  <ShareList
                    rows={data.countries.map((row) => ({
                      key: row.country,
                      name: `${countryFlag(row.country)}  ${row.country}`,
                      value: row.visits,
                    }))}
                    accent="emerald"
                  />
                </Card>
              </Reveal>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Metric({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      className="stat-card"
      style={{ '--accent': `var(--a-${accent})`, '--accent-bg': `var(--a-${accent}-bg)` } as React.CSSProperties}
    >
      <div className="stat-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="stat-card__value">
        <CountUp value={value} />
      </div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}

/** Ranked breakdown with proportion bars, replacing the old dense table. */
function ShareList({
  rows,
  accent,
}: {
  rows: { key: string; name: string; value: number }[];
  accent: string;
}) {
  if (rows.length === 0) {
    return <Empty description="No data yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="share-list">
      {rows.map((row) => (
        <div className="share-row" key={row.key}>
          <span className="share-row__name truncate" title={row.name}>
            {row.name}
          </span>
          <Progress
            percent={Math.round((row.value / max) * 100)}
            showInfo={false}
            size={{ height: 7 }}
            strokeColor={`var(--a-${accent})`}
            trailColor="var(--surface-sunken)"
          />
          <span className="share-row__value tabular">{fullNumber(row.value)}</span>
          <span className="share-row__pct tabular">{Math.round((row.value / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
