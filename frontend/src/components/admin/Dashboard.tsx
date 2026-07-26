'use client';

import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  LinkOutlined,
  MailOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  RobotOutlined,
  StopOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Empty, Progress, Segmented, Table, Tag, Tooltip, Typography } from 'antd';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminApiError, adminApi } from '@/lib/adminClient';
import { formatDate, fullNumber, prettyUrl, timeAgo } from '@/lib/format';
import type { AdminDashboard } from '@/lib/types';
import { HourlyChart } from '../charts/HourlyChart';
import { StatusDonut } from '../charts/StatusDonut';
import { TrendChart } from '../charts/TrendChart';
import { Reveal } from '../motion/Reveal';
import { PageHeading } from './PageHeading';
import { StatTile, type Delta } from './StatTile';

const { Text } = Typography;

type Metric = 'clicks' | 'links';
type Range = 7 | 30;

/**
 * The API groups by date, so days with no activity are absent from the series.
 * Everything below works on calendar days rather than array positions, which
 * would otherwise make "last 7 points" span an arbitrary stretch of time.
 */
function densify(series: { date: string; value: number }[], days: number): { date: string; value: number }[] {
  const byDate = new Map(series.map((point) => [point.date.slice(0, 10), point.value]));
  const out: { date: string; value: number }[] = [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - offset);
    const key = day.toISOString().slice(0, 10);
    out.push({ date: key, value: byDate.get(key) ?? 0 });
  }
  return out;
}

/** Percentage change of the last `window` days against the `window` days before them. */
function periodDelta(dense: { date: string; value: number }[], window: number): number {
  if (dense.length < window * 2) return 0;
  const sum = (points: { value: number }[]) => points.reduce((total, point) => total + point.value, 0);
  const recent = sum(dense.slice(-window));
  const prior = sum(dense.slice(-window * 2, -window));
  if (prior === 0) return recent === 0 ? 0 : 100;
  return ((recent - prior) / prior) * 100;
}

export function Dashboard() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('clicks');
  const [range, setRange] = useState<Range>(30);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.get<AdminDashboard>('dashboard');
      setData(result.data);
      setRefreshedAt(new Date());
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : 'Could not load the dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Gap-filled to 30 calendar days, so sparklines and deltas are comparable.
  const denseClicks = useMemo(
    () => densify(data?.visitTrend.map((point) => ({ date: point.date, value: point.visits })) ?? [], 30),
    [data],
  );
  const denseLinks = useMemo(
    () => densify(data?.linkTrend.map((point) => ({ date: point.date, value: point.links })) ?? [], 30),
    [data],
  );

  const clickSeries = useMemo(() => denseClicks.map((point) => point.value), [denseClicks]);
  const linkSeries = useMemo(() => denseLinks.map((point) => point.value), [denseLinks]);

  const trendSeries = useMemo(
    () => (metric === 'clicks' ? denseClicks : denseLinks).slice(-range),
    [denseClicks, denseLinks, metric, range],
  );

  const deltas = useMemo(
    () => ({
      clicks: { percent: periodDelta(denseClicks, 7), label: 'vs last week' } satisfies Delta,
      links: { percent: periodDelta(denseLinks, 7), label: 'vs last week' } satisfies Delta,
    }),
    [denseClicks, denseLinks],
  );

  if (loading && !data) return <DashboardSkeleton />;

  if (error && !data) {
    return (
      <>
        <PageHeading title="Dashboard" />
        <Alert
          type="error"
          showIcon
          title="Could not load the dashboard"
          description={error}
          action={
            <Button size="small" onClick={() => void load()}>
              Retry
            </Button>
          }
        />
      </>
    );
  }

  if (!data) return null;
  const { overview } = data;

  const humanClicks = Math.max(0, overview.clicks.last7Days);
  const botShare =
    humanClicks + overview.clicks.bots > 0
      ? Math.round((overview.clicks.bots / (humanClicks + overview.clicks.bots)) * 100)
      : 0;

  const linkColumns = [
    {
      title: 'Short link',
      dataIndex: 'code',
      width: 124,
      render: (code: string) => (
        <Link href={`/admin/links?search=${encodeURIComponent(code)}`} className="mono">
          /{code}
        </Link>
      ),
    },
    {
      title: 'Destination',
      dataIndex: 'destination',
      ellipsis: true,
      render: (destination: string) => (
        <span className="truncate" title={destination}>
          {prettyUrl(destination, 42)}
        </span>
      ),
    },
    {
      title: 'Clicks',
      dataIndex: 'clicks',
      width: 82,
      align: 'right' as const,
      render: (clicks: number) => <span className="tabular">{fullNumber(clicks)}</span>,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 108,
      responsive: ['xxl' as const],
      render: (value: string) => (
        <span className="text-muted" style={{ fontSize: 12.5 }}>
          {formatDate(value)}
        </span>
      ),
    },
  ];

  const maxDomain = Math.max(1, ...data.topDomains.map((entry) => entry.links));

  return (
    <>
      <PageHeading
        title="Dashboard"
        subtitle={refreshedAt ? `Live view of links, traffic and the moderation queue. Updated ${timeAgo(refreshedAt)}.` : undefined}
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
        }
      />

      {overview.reports.pending > 0 || overview.links.flagged > 0 ? (
        <Reveal>
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 18 }}
            title="Items need your attention"
            description={
              <span style={{ display: 'inline-flex', gap: 16, flexWrap: 'wrap' }}>
                {overview.reports.pending > 0 && (
                  <Link href="/admin/reports?status=pending">
                    {overview.reports.pending} pending report{overview.reports.pending === 1 ? '' : 's'} <ArrowRightOutlined />
                  </Link>
                )}
                {overview.links.flagged > 0 && (
                  <Link href="/admin/links?status=flagged">
                    {overview.links.flagged} flagged link{overview.links.flagged === 1 ? '' : 's'} <ArrowRightOutlined />
                  </Link>
                )}
              </span>
            }
          />
        </Reveal>
      ) : (
        <Reveal>
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 18 }}
            title="Queue is clear"
            description="No pending abuse reports and no flagged links."
          />
        </Reveal>
      )}

      {/* Headline metrics, each with a sparkline and week-over-week delta. */}
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Reveal delay={0}>
          <StatTile
            accent="blue"
            icon={<LinkOutlined />}
            label="Total links"
            value={overview.links.total}
            delta={deltas.links}
            trend={linkSeries}
            hint={`${fullNumber(overview.links.today)} created today`}
          />
        </Reveal>
        <Reveal delay={70}>
          <StatTile
            accent="cyan"
            icon={<ThunderboltOutlined />}
            label="Total clicks"
            value={overview.clicks.total}
            delta={deltas.clicks}
            trend={clickSeries}
            hint={`${fullNumber(overview.clicks.today)} today, ${fullNumber(overview.clicks.last7Days)} this week`}
          />
        </Reveal>
        <Reveal delay={140}>
          <StatTile
            accent={overview.reports.pending > 0 ? 'rose' : 'emerald'}
            icon={<WarningOutlined />}
            label="Pending reports"
            value={overview.reports.pending}
            hint={`${fullNumber(overview.reports.total)} received in total`}
          />
        </Reveal>
        <Reveal delay={210}>
          <StatTile
            accent={overview.contacts.pending > 0 ? 'amber' : 'emerald'}
            icon={<MailOutlined />}
            label="Unread messages"
            value={overview.contacts.pending}
            hint={`${fullNumber(overview.contacts.total)} received in total`}
          />
        </Reveal>
      </div>

      {/* Trend plus link-health donut. */}
      <div className="grid dash-split" style={{ marginBottom: 16 }}>
        <Reveal>
          <Card
            variant="borderless"
            title="Traffic"
            styles={{ body: { paddingTop: 8 } }}
            extra={
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Segmented
                  size="small"
                  value={metric}
                  onChange={(value) => setMetric(value as Metric)}
                  options={[
                    { label: 'Clicks', value: 'clicks' },
                    { label: 'Links', value: 'links' },
                  ]}
                />
                <Segmented
                  size="small"
                  value={range}
                  onChange={(value) => setRange(value as Range)}
                  options={[
                    { label: '7d', value: 7 },
                    { label: '30d', value: 30 },
                  ]}
                />
              </div>
            }
          >
            {trendSeries.length > 0 ? (
              <TrendChart data={trendSeries} label={metric === 'clicks' ? 'Clicks' : 'Links'} height={286} />
            ) : (
              <Empty description="No data for this period yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Reveal>

        <Reveal delay={90}>
          <Card variant="borderless" title="Link health">
            <StatusDonut
              centerLabel="live links"
              data={[
                { name: 'Active', value: overview.links.active, accent: 'emerald' },
                { name: 'Blocked', value: overview.links.blocked, accent: 'rose' },
                { name: 'Expired', value: overview.links.expired, accent: 'amber' },
                { name: 'Flagged', value: overview.links.flagged, accent: 'violet' },
              ]}
            />
          </Card>
        </Reveal>
      </div>

      {/* Hour-of-day activity. */}
      <Reveal>
        <Card
          variant="borderless"
          title="Activity by hour"
          style={{ marginBottom: 16 }}
          extra={
            <Text type="secondary" style={{ fontSize: 12.5 }}>
              Last 24 hours, UTC
            </Text>
          }
        >
          <HourlyChart data={data.hourly} />
        </Card>
      </Reveal>

      {/* Secondary metrics. */}
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Reveal delay={0}>
          <StatTile accent="rose" icon={<StopOutlined />} label="Blocked links" value={overview.links.blocked} />
        </Reveal>
        <Reveal delay={70}>
          <StatTile accent="amber" icon={<ClockCircleOutlined />} label="Expired links" value={overview.links.expired} />
        </Reveal>
        <Reveal delay={140}>
          <StatTile accent="violet" icon={<QrcodeOutlined />} label="QR downloads" value={overview.qr.total} />
        </Reveal>
        <Reveal delay={210}>
          <StatTile
            accent="cyan"
            icon={<RobotOutlined />}
            label="Bot hits this week"
            value={overview.clicks.bots}
            hint={`${botShare}% of all traffic, excluded from click counts`}
          />
        </Reveal>
      </div>

      {/* Tables. */}
      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Reveal>
          <Card
            variant="borderless"
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FireOutlined style={{ color: 'var(--a-amber)' }} /> Top performing
              </span>
            }
            extra={<Link href="/admin/links?sort=clicks">View all</Link>}
          >
            <div className="table-wrap">
              <Table
                size="small"
                rowKey="id"
                dataSource={data.topLinks}
                columns={linkColumns}
                pagination={false}
                locale={{ emptyText: <Empty description="No links yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              />
            </div>
          </Card>
        </Reveal>

        <Reveal delay={90}>
          <Card
            variant="borderless"
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ClockCircleOutlined style={{ color: 'var(--a-cyan)' }} /> Recently created
              </span>
            }
            extra={<Link href="/admin/links">View all</Link>}
          >
            <div className="table-wrap">
              <Table
                size="small"
                rowKey="id"
                dataSource={data.recentLinks}
                columns={linkColumns}
                pagination={false}
                locale={{ emptyText: <Empty description="No links yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              />
            </div>
          </Card>
        </Reveal>
      </div>

      {/* Destination breakdown with proportion bars. */}
      <Reveal>
        <Card variant="borderless" title="Most-linked destinations">
          {data.topDomains.length > 0 ? (
            <div className="domain-list">
              {data.topDomains.map((entry) => (
                <Link
                  key={entry.domain}
                  href={`/admin/links?search=${encodeURIComponent(entry.domain)}`}
                  className="domain-row"
                >
                  <span className="domain-row__name truncate" title={entry.domain}>
                    {entry.domain}
                  </span>
                  <Progress
                    percent={Math.round((entry.links / maxDomain) * 100)}
                    showInfo={false}
                    size={{ height: 7 }}
                    strokeColor={{ from: 'var(--a-blue)', to: 'var(--a-cyan)' }}
                    trailColor="var(--surface-sunken)"
                  />
                  <span className="domain-row__count tabular">{fullNumber(entry.links)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty description="No data yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </Reveal>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <PageHeading title="Dashboard" subtitle="Loading current activity" />
      <div className="skeleton-block" style={{ height: 58, marginBottom: 18 }} />
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-block" style={{ height: 168 }} />
        ))}
      </div>
      <div className="grid dash-split" style={{ marginBottom: 16 }}>
        <div className="skeleton-block" style={{ height: 360 }} />
        <div className="skeleton-block" style={{ height: 360 }} />
      </div>
      <div className="skeleton-block" style={{ height: 250 }} />
    </>
  );
}
