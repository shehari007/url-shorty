'use client';

import { CheckOutlined, DeleteOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminApiError, adminApi } from '@/lib/adminClient';
import { formatDateTime, fullNumber, prettyUrl } from '@/lib/format';
import type { AdminReport, ApiMeta, ReportStatus } from '@/lib/types';
import { PageHeading } from './PageHeading';

const { Paragraph, Text } = Typography;

const STATUS_META: Record<ReportStatus, { color: string; label: string }> = {
  pending: { color: 'warning', label: 'Pending' },
  reviewed: { color: 'processing', label: 'Reviewed' },
  actioned: { color: 'error', label: 'Actioned' },
  dismissed: { color: 'default', label: 'Dismissed' },
};

const REASON_LABEL: Record<string, string> = {
  phishing: 'Phishing',
  malware: 'Malware',
  spam: 'Spam',
  adult: 'Adult content',
  copyright: 'Copyright',
  other: 'Other',
};

export function ReportsManager({ initialStatus }: { initialStatus?: string }) {
  const { message } = App.useApp();

  const [filters, setFilters] = useState({
    status: initialStatus ?? 'pending',
    search: '',
    page: 1,
    pageSize: 20,
  });

  const [rows, setRows] = useState<AdminReport[]>([]);
  const [meta, setMeta] = useState<ApiMeta>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<AdminReport | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.get<AdminReport[]>('reports', filters);
      setRows(result.data);
      setMeta(result.meta ?? {});
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : 'Could not load reports');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = useCallback(async () => {
    if (!active) return;
    const values = (await form.validateFields()) as {
      status: ReportStatus;
      resolutionNote?: string;
      blockLink?: boolean;
    };

    setSaving(true);
    try {
      await adminApi.patch(`reports/${active.id}`, values);
      message.success(values.blockLink ? 'Report resolved and link blocked' : 'Report updated');
      setActive(null);
      await load();
    } catch (caught) {
      message.error(caught instanceof AdminApiError ? caught.message : 'Could not update that report');
    } finally {
      setSaving(false);
    }
  }, [active, form, load, message]);

  const remove = useCallback(
    async (id: number) => {
      try {
        await adminApi.delete(`reports/${id}`);
        message.success('Report deleted');
        await load();
      } catch (caught) {
        message.error(caught instanceof AdminApiError ? caught.message : 'Could not delete that report');
      }
    },
    [load, message],
  );

  const columns = useMemo<ColumnsType<AdminReport>>(
    () => [
      {
        title: 'Reported link',
        dataIndex: 'linkCode',
        width: 140,
        render: (code: string | null, row) => (
          <span className="mono">{code ? `/${code}` : prettyUrl(row.shortUrl, 20)}</span>
        ),
      },
      {
        title: 'Reason',
        dataIndex: 'reason',
        width: 130,
        render: (reason: string) => <Tag>{REASON_LABEL[reason] ?? reason}</Tag>,
      },
      {
        title: 'Detail',
        dataIndex: 'detail',
        ellipsis: true,
        render: (detail: string | null) => (
          <span className="truncate" title={detail ?? ''}>
            {detail ?? <span className="text-muted">No detail provided</span>}
          </span>
        ),
      },
      {
        title: 'Reporter',
        dataIndex: 'email',
        width: 190,
        responsive: ['xl'],
        render: (email: string) => (
          <span className="truncate" style={{ fontSize: 12.5 }} title={email}>
            {email}
          </span>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 110,
        render: (status: ReportStatus, row) => (
          <Space size={4} direction="vertical">
            <Tag color={STATUS_META[status].color}>{STATUS_META[status].label}</Tag>
            {row.linkBlocked && <Tag color="error">Link blocked</Tag>}
          </Space>
        ),
      },
      {
        title: 'Received',
        dataIndex: 'reportedAt',
        width: 160,
        responsive: ['lg'],
        render: (value: string) => (
          <span className="text-muted" style={{ fontSize: 12.5 }}>
            {formatDateTime(value)}
          </span>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 120,
        fixed: 'right',
        render: (_value, row) => (
          <Space size={2}>
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => {
                setActive(row);
                form.setFieldsValue({
                  status: row.status === 'pending' ? 'actioned' : row.status,
                  resolutionNote: row.resolutionNote ?? '',
                  blockLink: false,
                });
              }}
            >
              Review
            </Button>
            <Popconfirm title="Delete this report?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => void remove(row.id)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [form, remove],
  );

  return (
    <>
      <PageHeading
        title="Abuse reports"
        subtitle="Review reported links and take them offline where needed."
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
        }
      />

      <Card variant="borderless" style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div className="admin-toolbar" style={{ marginBottom: 0 }}>
          <Input.Search
            placeholder="Search by link, email or detail"
            allowClear
            style={{ maxWidth: 320, flex: 1 }}
            onSearch={(search) => setFilters((current) => ({ ...current, search, page: 1 }))}
          />
          <Select
            value={filters.status}
            onChange={(status) => setFilters((current) => ({ ...current, status, page: 1 }))}
            style={{ minWidth: 160 }}
            options={[
              { value: 'all', label: 'All reports' },
              { value: 'pending', label: 'Pending' },
              { value: 'reviewed', label: 'Reviewed' },
              { value: 'actioned', label: 'Actioned' },
              { value: 'dismissed', label: 'Dismissed' },
            ]}
          />
        </div>
      </Card>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <Card variant="borderless" styles={{ body: { padding: 0 } }}>
        <div className="table-wrap">
          <Table<AdminReport>
            rowKey="id"
            dataSource={rows}
            columns={columns}
            loading={loading}
            size="middle"
            scroll={{ x: 900 }}
            pagination={{
              current: filters.page,
              pageSize: filters.pageSize,
              total: meta.total ?? 0,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${fullNumber(total)}`,
              onChange: (page, pageSize) => setFilters((current) => ({ ...current, page, pageSize })),
            }}
          />
        </div>
      </Card>

      <Drawer
        open={active !== null}
        onClose={() => setActive(null)}
        title={active ? `Report #${active.id}` : 'Report'}
        size="default"
        destroyOnHidden
        extra={
          <Button type="primary" onClick={() => void resolve()} loading={saving}>
            Save
          </Button>
        }
      >
        {active && (
          <div className="stack gap-16">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Short link">
                <a href={active.shortUrl} target="_blank" rel="noopener noreferrer" className="mono">
                  {active.shortUrl}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="Destination">
                <Paragraph style={{ margin: 0, wordBreak: 'break-all', fontSize: 13 }} ellipsis={{ rows: 3, expandable: true }}>
                  {active.linkDestination ?? 'Link no longer exists'}
                </Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="Reason">{REASON_LABEL[active.reason] ?? active.reason}</Descriptions.Item>
              <Descriptions.Item label="Reporter">{active.email}</Descriptions.Item>
              <Descriptions.Item label="Reporter IP">
                <span className="mono" style={{ fontSize: 12.5 }}>
                  {active.reporterIp ?? 'unknown'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Received">{formatDateTime(active.reportedAt)}</Descriptions.Item>
              <Descriptions.Item label="Total reports on this link">
                {active.linkReportCount ?? 1}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                What the reporter said
              </Text>
              <Card size="small" styles={{ body: { background: 'var(--surface-sunken)' } }}>
                <Text style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{active.detail ?? 'No detail provided.'}</Text>
              </Card>
            </div>

            <Form form={form} layout="vertical">
              <Form.Item name="status" label="Resolution" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'actioned', label: 'Actioned, the report was valid' },
                    { value: 'dismissed', label: 'Dismissed. No action needed' },
                    { value: 'reviewed', label: 'Reviewed, still deciding' },
                    { value: 'pending', label: 'Back to pending' },
                  ]}
                />
              </Form.Item>

              <Form.Item name="resolutionNote" label="Note" extra="Recorded in the audit log alongside your decision.">
                <Input.TextArea rows={3} maxLength={500} showCount placeholder="What did you find, and what did you do?" />
              </Form.Item>

              {!active.linkBlocked && active.urlId && (
                <Form.Item name="blockLink" valuePropName="checked">
                  <Checkbox>
                    <StopOutlined /> Block this link as well. It stops redirecting immediately
                  </Checkbox>
                </Form.Item>
              )}
            </Form>
          </div>
        )}
      </Drawer>
    </>
  );
}
