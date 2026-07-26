'use client';

import {
  BarChartOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExportOutlined,
  EyeOutlined,
  ReloadOutlined,
  StopOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Dropdown,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminApiError, adminApi } from '@/lib/adminClient';
import { formatDateTime, fullNumber, prettyUrl } from '@/lib/format';
import type { AdminLink, ApiMeta } from '@/lib/types';
import { LinkDetailDrawer } from './LinkDetailDrawer';
import { RiskBadge } from './RiskBadge';
import { PageHeading } from './PageHeading';

const { Text } = Typography;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All links' },
  { value: 'active', label: 'Active' },
  { value: 'suspicious', label: 'Needs review' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'reported', label: 'Reported' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'expired', label: 'Expired' },
  { value: 'deleted', label: 'Deleted' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'clicks', label: 'Most clicks' },
  { value: 'reports', label: 'Most reports' },
];

interface Filters {
  search: string;
  status: string;
  sort: string;
  page: number;
  pageSize: number;
  /** Lets the object be passed straight to the query-string builder. */
  [key: string]: unknown;
}

const INITIAL: Filters = { search: '', status: 'all', sort: 'newest', page: 1, pageSize: 20 };

export function LinksManager({ initialStatus, initialSearch }: { initialStatus?: string; initialSearch?: string }) {
  const { message, modal } = App.useApp();

  const [filters, setFilters] = useState<Filters>({
    ...INITIAL,
    ...(initialStatus ? { status: initialStatus } : {}),
    ...(initialSearch ? { search: initialSearch } : {}),
  });
  const [searchDraft, setSearchDraft] = useState(initialSearch ?? '');

  const [rows, setRows] = useState<AdminLink[]>([]);
  const [meta, setMeta] = useState<ApiMeta>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [editing, setEditing] = useState<AdminLink | null>(null);
  const [editForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.get<AdminLink[]>('links', filters);
      setRows(result.data);
      setMeta(result.meta ?? {});
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : 'Could not load links');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback(
    async (id: number, body: Record<string, unknown>, successMessage: string) => {
      try {
        await adminApi.patch(`links/${id}`, body);
        message.success(successMessage);
        await load();
      } catch (caught) {
        message.error(caught instanceof AdminApiError ? caught.message : 'That change could not be saved');
      }
    },
    [load, message],
  );

  const remove = useCallback(
    async (id: number) => {
      try {
        await adminApi.delete(`links/${id}`);
        message.success('Link deleted. It no longer redirects');
        await load();
      } catch (caught) {
        message.error(caught instanceof AdminApiError ? caught.message : 'Could not delete that link');
      }
    },
    [load, message],
  );

  const restore = useCallback(
    async (id: number) => {
      try {
        await adminApi.post(`links/${id}/restore`);
        message.success('Link restored');
        await load();
      } catch (caught) {
        message.error(caught instanceof AdminApiError ? caught.message : 'Could not restore that link');
      }
    },
    [load, message],
  );

  const runBulk = useCallback(
    (action: string, label: string) => {
      if (selectedIds.length === 0) return;

      modal.confirm({
        title: `${label} ${selectedIds.length} link${selectedIds.length === 1 ? '' : 's'}?`,
        content: action === 'delete' ? 'Deleted links stop redirecting immediately. You can restore them later.' : undefined,
        okText: label,
        okButtonProps: { danger: action === 'delete' || action === 'block' },
        onOk: async () => {
          try {
            await adminApi.post('links/bulk', { ids: selectedIds, action });
            message.success(`${label} applied to ${selectedIds.length} link${selectedIds.length === 1 ? '' : 's'}`);
            setSelectedIds([]);
            await load();
          } catch (caught) {
            message.error(caught instanceof AdminApiError ? caught.message : 'Bulk action failed');
          }
        },
      });
    },
    [selectedIds, modal, message, load],
  );

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    const values = (await editForm.validateFields()) as {
      title?: string;
      adminNote?: string;
      expiresAt?: { toISOString: () => string } | null;
    };

    await patch(
      editing.id,
      {
        title: values.title?.trim() || null,
        adminNote: values.adminNote?.trim() || null,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
      },
      'Link updated',
    );
    setEditing(null);
  }, [editing, editForm, patch]);

  const copyLink = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        message.success('Copied');
      } catch {
        message.error('Could not copy');
      }
    },
    [message],
  );

  const columns = useMemo<ColumnsType<AdminLink>>(
    () => [
      {
        title: 'Short link',
        dataIndex: 'code',
        width: 150,
        fixed: 'left',
        render: (code: string, row) => (
          <Space size={4}>
            <a href={row.shortUrl} target="_blank" rel="noopener noreferrer" className="mono">
              /{code}
            </a>
            <Tooltip title="Copy full link">
              <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => void copyLink(row.shortUrl)} />
            </Tooltip>
          </Space>
        ),
      },
      {
        title: 'Destination',
        dataIndex: 'destination',
        ellipsis: true,
        render: (destination: string, row) => (
          <div style={{ minWidth: 0 }}>
            <span className="truncate" title={destination}>
              {prettyUrl(destination, 60)}
            </span>
            {row.title && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                {row.title}
              </Text>
            )}
          </div>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 128,
        render: (_status, row) => <StatusTags link={row} />,
      },
      {
        title: 'Risk',
        dataIndex: ['risk', 'score'],
        width: 132,
        render: (_value, row) => <RiskBadge risk={row.risk} />,
      },
      {
        title: 'Clicks',
        dataIndex: 'clicks',
        width: 90,
        align: 'right',
        sorter: false,
        render: (clicks: number) => fullNumber(clicks),
      },
      {
        title: 'Reports',
        dataIndex: 'reportCount',
        width: 90,
        align: 'right',
        render: (count: number) =>
          count > 0 ? <Tag color="error">{count}</Tag> : <span className="text-muted">0</span>,
      },
      {
        title: 'Created',
        dataIndex: 'createdAt',
        width: 165,
        responsive: ['xl'],
        render: (value: string) => (
          <span style={{ fontSize: 12.5 }} className="text-muted">
            {formatDateTime(value)}
          </span>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 190,
        fixed: 'right',
        render: (_value, row) => (
          <Space size={2}>
            <Tooltip title="Details & analytics">
              <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setDetailId(row.id)} />
            </Tooltip>

            {row.blacklisted ? (
              <Tooltip title="Unblock, allow redirects again">
                <Button
                  type="text"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => void patch(row.id, { blacklisted: false, flagged: false }, 'Link unblocked')}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Block, stop this link redirecting">
                <Popconfirm
                  title="Block this link?"
                  description="Visitors will see a 'blocked for safety' page instead of the destination."
                  okText="Block"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void patch(row.id, { blacklisted: true }, 'Link blocked')}
                >
                  <Button type="text" size="small" danger icon={<StopOutlined />} />
                </Popconfirm>
              </Tooltip>
            )}

            <Tooltip title={row.expired ? 'Reactivate' : 'Expire'}>
              <Button
                type="text"
                size="small"
                icon={row.expired ? <UndoOutlined /> : <ExportOutlined />}
                onClick={() =>
                  void patch(row.id, { expired: !row.expired }, row.expired ? 'Link reactivated' : 'Link expired')
                }
              />
            </Tooltip>

            <Tooltip title="Edit title, note & expiry">
              <Button
                type="text"
                size="small"
                icon={<BarChartOutlined />}
                onClick={() => {
                  setEditing(row);
                  editForm.setFieldsValue({ title: row.title ?? '', adminNote: row.adminNote ?? '' });
                }}
              />
            </Tooltip>

            {row.deletedAt ? (
              <Tooltip title="Restore">
                <Button type="text" size="small" icon={<UndoOutlined />} onClick={() => void restore(row.id)} />
              </Tooltip>
            ) : (
              <Tooltip title="Delete">
                <Popconfirm
                  title="Delete this link?"
                  description="It stops redirecting straight away. Click history is kept and you can restore it later."
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void remove(row.id)}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
            )}
          </Space>
        ),
      },
    ],
    [copyLink, editForm, patch, remove, restore],
  );

  return (
    <>
      <PageHeading
        title="Links"
        subtitle="Search, inspect, block, expire or delete any short link."
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
        }
      />

      <Card variant="borderless" style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div className="admin-toolbar" style={{ marginBottom: 0 }}>
          <Input.Search
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onSearch={(value) => setFilters((current) => ({ ...current, search: value, page: 1 }))}
            placeholder="Search by code, destination or domain"
            allowClear
            style={{ maxWidth: 340, flex: 1 }}
          />
          <Select
            value={filters.status}
            onChange={(status) => setFilters((current) => ({ ...current, status, page: 1 }))}
            options={STATUS_OPTIONS}
            style={{ minWidth: 150 }}
          />
          <Select
            value={filters.sort}
            onChange={(sort) => setFilters((current) => ({ ...current, sort, page: 1 }))}
            options={SORT_OPTIONS}
            style={{ minWidth: 160 }}
          />

          {selectedIds.length > 0 && (
            <Dropdown
              menu={{
                items: [
                  { key: 'block', icon: <StopOutlined />, label: 'Block', danger: true, onClick: () => runBulk('block', 'Block') },
                  { key: 'unblock', icon: <CheckCircleOutlined />, label: 'Unblock', onClick: () => runBulk('unblock', 'Unblock') },
                  { key: 'expire', icon: <ExportOutlined />, label: 'Expire', onClick: () => runBulk('expire', 'Expire') },
                  { key: 'reactivate', icon: <UndoOutlined />, label: 'Reactivate', onClick: () => runBulk('reactivate', 'Reactivate') },
                  { type: 'divider' },
                  { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true, onClick: () => runBulk('delete', 'Delete') },
                  { key: 'restore', icon: <UndoOutlined />, label: 'Restore', onClick: () => runBulk('restore', 'Restore') },
                ],
              }}
            >
              <Button type="primary">{selectedIds.length} selected, actions</Button>
            </Dropdown>
          )}
        </div>
      </Card>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <Card variant="borderless" styles={{ body: { padding: 0 } }}>
        <div className="table-wrap">
          <Table<AdminLink>
            rowKey="id"
            dataSource={rows}
            columns={columns}
            loading={loading}
            size="middle"
            scroll={{ x: 1140 }}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys as number[]),
            }}
            pagination={{
              current: filters.page,
              pageSize: filters.pageSize,
              total: meta.total ?? 0,
              showSizeChanger: true,
              pageSizeOptions: [20, 50, 100],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${fullNumber(total)}`,
              onChange: (page, pageSize) => setFilters((current) => ({ ...current, page, pageSize })),
            }}
          />
        </div>
      </Card>

      <LinkDetailDrawer id={detailId} onClose={() => setDetailId(null)} onChanged={() => void load()} />

      <Modal
        open={editing !== null}
        title={editing ? `Edit /${editing.code}` : 'Edit link'}
        onCancel={() => setEditing(null)}
        onOk={() => void saveEdit()}
        okText="Save changes"
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Title" extra="Internal label shown in this table.">
            <Input placeholder="e.g. Spring campaign, Instagram bio" maxLength={255} />
          </Form.Item>
          <Form.Item name="adminNote" label="Moderator note" extra="Only visible to administrators.">
            <Input.TextArea rows={3} maxLength={500} showCount placeholder="Why was this link actioned?" />
          </Form.Item>
          <Form.Item name="expiresAt" label="Expires at" extra="Leave empty for no expiry.">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function StatusTags({ link }: { link: AdminLink }) {
  if (link.deletedAt) return <Tag>Deleted</Tag>;

  return (
    <Space size={4} wrap>
      {link.blacklisted && <Tag color="error">Blocked</Tag>}
      {link.expired && <Tag color="warning">Expired</Tag>}
      {link.flagged && !link.blacklisted && <Tag color="orange">Flagged</Tag>}
      {!link.blacklisted && !link.expired && !link.flagged && <Tag color="success">Active</Tag>}
    </Space>
  );
}
