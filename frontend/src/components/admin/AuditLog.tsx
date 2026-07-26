'use client';

import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Card, Button, Input, Select, Table, Tag, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { AdminApiError, adminApi } from '@/lib/adminClient';
import { formatDateTime, fullNumber } from '@/lib/format';
import type { ApiMeta, AuditEntry } from '@/lib/types';
import { PageHeading } from './PageHeading';

const { Text } = Typography;

/** Destructive actions are tinted red so they stand out when scanning. */
const ACTION_COLOR = (action: string): string => {
  if (action.includes('delete') || action.includes('purge') || action.includes('blocked')) return 'error';
  if (action.includes('failed')) return 'warning';
  if (action.includes('login') || action.includes('created')) return 'success';
  return 'default';
};

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'admin.login', label: 'Sign in' },
  { value: 'admin.login_failed', label: 'Failed sign in' },
  { value: 'link.blocked', label: 'Link blocked' },
  { value: 'link.unblocked', label: 'Link unblocked' },
  { value: 'link.deleted', label: 'Link deleted' },
  { value: 'link.purged', label: 'Link purged' },
  { value: 'link.bulk_action', label: 'Bulk action' },
  { value: 'report.status_changed', label: 'Report resolved' },
  { value: 'contact.status_changed', label: 'Message handled' },
  { value: 'domain.blocked', label: 'Domain blocked' },
];

interface Filters {
  action: string;
  adminId?: number;
  page: number;
  pageSize: number;
  /** Lets the object be passed straight to the query-string builder. */
  [key: string]: unknown;
}

export function AuditLog() {
  const [filters, setFilters] = useState<Filters>({ action: '', page: 1, pageSize: 30 });
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [meta, setMeta] = useState<ApiMeta>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.get<AuditEntry[]>('audit', filters);
      setRows(result.data);
      setMeta(result.meta ?? {});
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : 'Could not load the audit log');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeading
        title="Audit log"
        subtitle="Every action taken in this console, including failed sign-in attempts."
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
        }
      />

      <Card variant="borderless" style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div className="admin-toolbar" style={{ marginBottom: 0 }}>
          <Select
            value={filters.action}
            onChange={(action) => setFilters((current) => ({ ...current, action, page: 1 }))}
            options={ACTION_OPTIONS}
            style={{ minWidth: 210 }}
          />
          <Input.Search
            placeholder="Filter by admin ID"
            allowClear
            style={{ maxWidth: 200 }}
            onSearch={(value) => {
              const adminId = value.trim() ? Number(value.trim()) : undefined;
              setFilters((current) => ({
                ...current,
                ...(Number.isFinite(adminId) ? { adminId } : { adminId: undefined }),
                page: 1,
              }));
            }}
          />
        </div>
      </Card>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <Card variant="borderless" styles={{ body: { padding: 0 } }}>
        <div className="table-wrap">
          <Table<AuditEntry>
            rowKey="id"
            dataSource={rows}
            loading={loading}
            size="middle"
            scroll={{ x: 860 }}
            expandable={{
              rowExpandable: (row) => row.meta !== null && row.meta !== undefined,
              expandedRowRender: (row) => (
                <pre
                  className="mono"
                  style={{
                    margin: 0,
                    padding: 12,
                    borderRadius: 10,
                    background: 'var(--surface-sunken)',
                    fontSize: 12.5,
                    overflowX: 'auto',
                  }}
                >
                  {JSON.stringify(row.meta, null, 2)}
                </pre>
              ),
            }}
            columns={[
              {
                title: 'When',
                dataIndex: 'createdAt',
                width: 175,
                render: (value: string) => (
                  <span style={{ fontSize: 12.5 }}>{formatDateTime(value)}</span>
                ),
              },
              {
                title: 'Action',
                dataIndex: 'action',
                width: 190,
                render: (action: string) => <Tag color={ACTION_COLOR(action)}>{action}</Tag>,
              },
              {
                title: 'Admin',
                dataIndex: 'adminEmail',
                width: 200,
                render: (email: string | null) => (
                  <span className="truncate" style={{ fontSize: 13 }}>
                    {email ?? <Text type="secondary">system</Text>}
                  </span>
                ),
              },
              {
                title: 'Target',
                dataIndex: 'entity',
                width: 150,
                render: (entity: string, row) => (
                  <span style={{ fontSize: 12.5 }}>
                    {entity}
                    {row.entityId ? ` #${row.entityId}` : ''}
                  </span>
                ),
              },
              {
                title: 'IP',
                dataIndex: 'ip',
                width: 130,
                responsive: ['xl'],
                render: (ip: string | null) => (
                  <span className="mono" style={{ fontSize: 12 }}>
                    {ip ?? 'Not recorded'}
                  </span>
                ),
              },
            ]}
            pagination={{
              current: filters.page,
              pageSize: filters.pageSize,
              total: meta.total ?? 0,
              showSizeChanger: true,
              pageSizeOptions: [30, 60, 100],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${fullNumber(total)}`,
              onChange: (page, pageSize) => setFilters((current) => ({ ...current, page, pageSize })),
            }}
          />
        </div>
      </Card>
    </>
  );
}
