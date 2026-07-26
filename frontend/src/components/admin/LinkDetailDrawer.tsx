'use client';

import { RobotOutlined } from '@ant-design/icons';
import { Alert, Descriptions, Drawer, Empty, Skeleton, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { AdminApiError, adminApi } from '@/lib/adminClient';
import { countryFlag, formatDateTime, fullNumber, timeAgo } from '@/lib/format';
import type { AdminLink, CreatorIpIntel, LinkAnalytics, VisitorIpIntel } from '@/lib/types';
import { TrendChart } from '../charts/TrendChart';
import { RiskBadge } from './RiskBadge';

const { Text, Paragraph } = Typography;

interface VisitRow {
  id: number;
  ip: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referer: string | null;
  isBot: boolean;
  visitedAt: string;
}

interface DetailPayload {
  link: AdminLink;
  analytics: LinkAnalytics;
  recentVisits: VisitRow[];
  creatorIp: CreatorIpIntel | null;
  topVisitorIps: VisitorIpIntel[];
}

export function LinkDetailDrawer({
  id,
  onClose,
}: {
  id: number | null;
  onClose: () => void;
  /** Called after a mutation so the parent list can refresh. */
  onChanged?: () => void;
}) {
  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (linkId: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.get<DetailPayload>(`links/${linkId}`);
      setData(result.data);
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : 'Could not load link details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id === null) {
      setData(null);
      return;
    }
    void load(id);
  }, [id, load]);

  return (
    <Drawer
      open={id !== null}
      onClose={onClose}
      title={data ? `/${data.link.code}` : 'Link details'}
      size="large"
      destroyOnHidden
    >
      {loading && <Skeleton active paragraph={{ rows: 10 }} />}
      {!loading && error && <Alert type="error" showIcon title={error} />}

      {!loading && data && (
        <div className="stack gap-16">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Short URL">
              <a href={data.link.shortUrl} target="_blank" rel="noopener noreferrer" className="mono">
                {data.link.shortUrl}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="Destination">
              <Paragraph
                copyable
                style={{ margin: 0, wordBreak: 'break-all', fontSize: 13 }}
                ellipsis={{ rows: 3, expandable: true, symbol: 'show all' }}
              >
                {data.link.destination}
              </Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {data.link.deletedAt ? (
                <Tag>Deleted {timeAgo(data.link.deletedAt)}</Tag>
              ) : (
                <>
                  {data.link.blacklisted && <Tag color="error">Blocked</Tag>}
                  {data.link.expired && <Tag color="warning">Expired</Tag>}
                  {data.link.flagged && <Tag color="orange">Flagged</Tag>}
                  {!data.link.blacklisted && !data.link.expired && !data.link.flagged && (
                    <Tag color="success">Active</Tag>
                  )}
                </>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Risk">
              <RiskBadge risk={data.link.risk} />
            </Descriptions.Item>
            <Descriptions.Item label="Created">{formatDateTime(data.link.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Last click">
              {data.link.lastClickedAt ? formatDateTime(data.link.lastClickedAt) : 'Never clicked'}
            </Descriptions.Item>
            <Descriptions.Item label="Expires">
              {data.link.expiresAt ? formatDateTime(data.link.expiresAt) : 'No expiry set'}
            </Descriptions.Item>

            {data.link.adminNote && <Descriptions.Item label="Moderator note">{data.link.adminNote}</Descriptions.Item>}
          </Descriptions>

          <div className="grid grid-4">
            <Statistic title="Total clicks" value={data.analytics.totals.totalVisits} />
            <Statistic title="Unique visitors" value={data.analytics.totals.uniqueVisitors} />
            <Statistic title="Last 7 days" value={data.analytics.totals.visitsLast7Days} />
            <Statistic title="Reports" value={data.link.reportCount} />
          </div>

          {data.analytics.daily.length > 0 ? (
            <TrendChart
              data={data.analytics.daily.map((point) => ({ date: point.date, value: point.visits }))}
              label="Clicks"
              height={200}
            />
          ) : (
            <Empty description="No clicks recorded yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}

          {/* Who created it, and what else that address has done. */}
          {data.creatorIp && <CreatorPanel intel={data.creatorIp} currentId={data.link.id} />}

          {/* Heaviest visitor addresses: repeat hits from one IP suggest automation. */}
          {data.topVisitorIps.length > 0 && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 10 }}>
                Top visitor IPs
              </Text>
              <div className="table-wrap">
                <Table<VisitorIpIntel>
                  rowKey={(row) => row.ip ?? 'unknown'}
                  size="small"
                  dataSource={data.topVisitorIps}
                  pagination={false}
                  columns={[
                    {
                      title: 'IP address',
                      dataIndex: 'ip',
                      render: (ip: string | null) => (
                        <span className="mono" style={{ fontSize: 12.5 }}>
                          {ip ?? 'unknown'}
                        </span>
                      ),
                    },
                    {
                      title: 'Country',
                      dataIndex: 'country',
                      width: 92,
                      render: (country: string | null) =>
                        country ? `${countryFlag(country)} ${country}` : <span className="text-muted">Unknown</span>,
                    },
                    {
                      title: 'Hits',
                      dataIndex: 'hits',
                      width: 76,
                      align: 'right',
                      render: (hits: number, row) => (
                        <Tooltip title={row.botHits > 0 ? `${row.botHits} identified as bot` : 'All human traffic'}>
                          <span className="tabular">
                            {fullNumber(hits)}
                            {row.botHits > 0 && <RobotOutlined style={{ marginLeft: 5, color: 'var(--text-muted)' }} />}
                          </span>
                        </Tooltip>
                      ),
                    },
                    {
                      title: 'Last seen',
                      dataIndex: 'lastSeen',
                      width: 116,
                      render: (value: string) => (
                        <span style={{ fontSize: 12.5 }} className="text-muted">
                          {timeAgo(value)}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          )}

          <div>
            <Text strong style={{ display: 'block', marginBottom: 10 }}>
              Recent visits
            </Text>
            <div className="table-wrap">
              <Table<VisitRow>
                rowKey="id"
                size="small"
                dataSource={data.recentVisits}
                pagination={{ pageSize: 10, size: 'small' }}
                scroll={{ x: 620 }}
                columns={[
                  {
                    title: 'When',
                    dataIndex: 'visitedAt',
                    width: 130,
                    render: (value: string) => <span style={{ fontSize: 12.5 }}>{timeAgo(value)}</span>,
                  },
                  {
                    title: 'IP',
                    dataIndex: 'ip',
                    width: 130,
                    render: (ip: string | null) => (
                      <span className="mono" style={{ fontSize: 12 }}>
                        {ip ?? 'Not recorded'}
                      </span>
                    ),
                  },
                  {
                    title: 'Country',
                    dataIndex: 'country',
                    width: 90,
                    render: (country: string | null) =>
                      country ? `${countryFlag(country)} ${country}` : <span className="text-muted">, </span>,
                  },
                  {
                    title: 'Device',
                    dataIndex: 'device',
                    width: 110,
                    render: (device: string | null, row) => (
                      <span style={{ fontSize: 12.5 }}>
                        {row.isBot && <RobotOutlined style={{ marginRight: 5, color: 'var(--text-muted)' }} />}
                        {device ?? 'Unknown'}
                        {row.browser ? ` · ${row.browser}` : ''}
                      </span>
                    ),
                  },
                  {
                    title: 'Referrer',
                    dataIndex: 'referer',
                    ellipsis: true,
                    render: (referer: string | null) => (
                      <span className="truncate" style={{ fontSize: 12.5 }} title={referer ?? 'Direct'}>
                        {referer ?? 'Direct'}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
            {data.analytics.totals.botVisits > 0 && (
              <Text type="secondary" style={{ fontSize: 12.5, display: 'block', marginTop: 8 }}>
                {fullNumber(data.analytics.totals.botVisits)} of these visits were identified as bots and are excluded
                from the click totals.
              </Text>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

/**
 * Creator-IP intelligence.
 *
 * The single most useful abuse signal is not the link itself, it is what else
 * the same address has created. A clean-looking link from an IP with three
 * blocked siblings is worth a much closer look.
 */
function CreatorPanel({ intel, currentId }: { intel: CreatorIpIntel; currentId: number }) {
  const risky = intel.blockedLinks > 0 || intel.reportedLinks > 0;

  return (
    <div>
      <Text strong style={{ display: 'block', marginBottom: 10 }}>
        Created from
      </Text>

      <div className={`ip-panel${risky ? ' ip-panel--risky' : ''}`}>
        <div className="ip-panel__head">
          <div>
            <div className="mono ip-panel__addr">{intel.ip}</div>
            {intel.userAgent && (
              <div className="ip-panel__ua truncate" title={intel.userAgent}>
                {intel.userAgent}
              </div>
            )}
          </div>
          {risky && <Tag color="error">Repeat offender</Tag>}
        </div>

        <div className="ip-panel__stats">
          <div>
            <span className="ip-panel__num tabular">{fullNumber(intel.totalLinks)}</span>
            <span className="ip-panel__cap">links created</span>
          </div>
          <div>
            <span className="ip-panel__num tabular" style={{ color: intel.blockedLinks > 0 ? 'var(--a-rose)' : undefined }}>
              {fullNumber(intel.blockedLinks)}
            </span>
            <span className="ip-panel__cap">blocked</span>
          </div>
          <div>
            <span className="ip-panel__num tabular" style={{ color: intel.reportedLinks > 0 ? 'var(--a-amber)' : undefined }}>
              {fullNumber(intel.reportedLinks)}
            </span>
            <span className="ip-panel__cap">reported</span>
          </div>
          <div>
            <span className="ip-panel__num" style={{ fontSize: 14 }}>
              {timeAgo(intel.firstSeen)}
            </span>
            <span className="ip-panel__cap">first seen</span>
          </div>
        </div>

        {intel.otherLinks.length > 0 && (
          <div className="ip-panel__others">
            <div className="ip-panel__cap" style={{ marginBottom: 8 }}>
              Other links from this address
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {intel.otherLinks
                .filter((other) => other.id !== currentId)
                .map((other) => (
                  <Tooltip
                    key={other.id}
                    title={`${other.domain ?? 'unknown host'}, ${formatDateTime(other.createdAt)}`}
                  >
                    <Tag
                      color={other.blacklisted ? 'error' : other.reportCount > 0 ? 'warning' : 'default'}
                      style={{ marginInlineEnd: 0 }}
                      className="mono"
                    >
                      /{other.code}
                    </Tag>
                  </Tooltip>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
