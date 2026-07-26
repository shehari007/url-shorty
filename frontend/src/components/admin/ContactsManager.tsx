'use client';

import { DeleteOutlined, MailOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
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
import { formatDateTime, fullNumber, timeAgo } from '@/lib/format';
import type { AdminContact, ApiMeta, ContactStatus } from '@/lib/types';
import { PageHeading } from './PageHeading';

const { Text } = Typography;

const STATUS_META: Record<ContactStatus, { color: string; label: string }> = {
  pending: { color: 'warning', label: 'Unread' },
  read: { color: 'processing', label: 'Read' },
  replied: { color: 'success', label: 'Replied' },
  archived: { color: 'default', label: 'Archived' },
};

export function ContactsManager({ initialStatus }: { initialStatus?: string }) {
  const { message } = App.useApp();

  const [filters, setFilters] = useState({
    status: initialStatus ?? 'all',
    search: '',
    page: 1,
    pageSize: 20,
  });

  const [rows, setRows] = useState<AdminContact[]>([]);
  const [meta, setMeta] = useState<ApiMeta>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<AdminContact | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.get<AdminContact[]>('contacts', filters);
      setRows(result.data);
      setMeta(result.meta ?? {});
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : 'Could not load messages');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Opening an unread message marks it read, the way an inbox should behave. */
  const open = useCallback(
    async (row: AdminContact) => {
      setActive(row);
      form.setFieldsValue({ status: row.status === 'pending' ? 'read' : row.status, adminNote: row.adminNote ?? '' });

      if (row.status === 'pending') {
        try {
          await adminApi.patch(`contacts/${row.id}`, { status: 'read' });
          await load();
        } catch {
          // Non-critical, the operator can still set the status manually.
        }
      }
    },
    [form, load],
  );

  const save = useCallback(async () => {
    if (!active) return;
    const values = (await form.validateFields()) as { status: ContactStatus; adminNote?: string };

    setSaving(true);
    try {
      await adminApi.patch(`contacts/${active.id}`, values);
      message.success('Message updated');
      setActive(null);
      await load();
    } catch (caught) {
      message.error(caught instanceof AdminApiError ? caught.message : 'Could not update that message');
    } finally {
      setSaving(false);
    }
  }, [active, form, load, message]);

  const remove = useCallback(
    async (id: number) => {
      try {
        await adminApi.delete(`contacts/${id}`);
        message.success('Message deleted');
        await load();
      } catch (caught) {
        message.error(caught instanceof AdminApiError ? caught.message : 'Could not delete that message');
      }
    },
    [load, message],
  );

  const columns = useMemo<ColumnsType<AdminContact>>(
    () => [
      {
        title: 'From',
        dataIndex: 'name',
        width: 200,
        render: (name: string, row) => (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: row.status === 'pending' ? 700 : 500 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: 12.5 }} className="truncate">
              {row.email}
            </Text>
          </div>
        ),
      },
      {
        title: 'Message',
        dataIndex: 'message',
        ellipsis: true,
        render: (body: string, row) => (
          <div style={{ minWidth: 0 }}>
            {row.subject && <div style={{ fontWeight: 600, fontSize: 13.5 }}>{row.subject}</div>}
            <span className="truncate text-muted" style={{ fontSize: 13 }}>
              {body}
            </span>
          </div>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 110,
        render: (status: ContactStatus) => <Tag color={STATUS_META[status].color}>{STATUS_META[status].label}</Tag>,
      },
      {
        title: 'Received',
        dataIndex: 'sentAt',
        width: 140,
        responsive: ['lg'],
        render: (value: string) => (
          <span className="text-muted" style={{ fontSize: 12.5 }}>
            {timeAgo(value)}
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
            <Button type="text" size="small" icon={<MailOutlined />} onClick={() => void open(row)}>
              Open
            </Button>
            <Popconfirm title="Delete this message?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => void remove(row.id)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [open, remove],
  );

  return (
    <>
      <PageHeading
        title="Messages"
        subtitle="Everything submitted through the public contact form."
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
        }
      />

      <Card variant="borderless" style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div className="admin-toolbar" style={{ marginBottom: 0 }}>
          <Input.Search
            placeholder="Search by name, email or message"
            allowClear
            style={{ maxWidth: 320, flex: 1 }}
            onSearch={(search) => setFilters((current) => ({ ...current, search, page: 1 }))}
          />
          <Select
            value={filters.status}
            onChange={(status) => setFilters((current) => ({ ...current, status, page: 1 }))}
            style={{ minWidth: 150 }}
            options={[
              { value: 'all', label: 'All messages' },
              { value: 'pending', label: 'Unread' },
              { value: 'read', label: 'Read' },
              { value: 'replied', label: 'Replied' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>
      </Card>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <Card variant="borderless" styles={{ body: { padding: 0 } }}>
        <div className="table-wrap">
          <Table<AdminContact>
            rowKey="id"
            dataSource={rows}
            columns={columns}
            loading={loading}
            size="middle"
            scroll={{ x: 820 }}
            onRow={(row) => ({ onClick: () => void open(row), style: { cursor: 'pointer' } })}
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
        title={active?.subject || 'Message'}
        size="default"
        destroyOnHidden
        extra={
          <Space>
            {active && (
              <Button
                href={`mailto:${active.email}?subject=${encodeURIComponent(`Re: ${active.subject ?? 'Your message to Shorty'}`)}`}
                icon={<MailOutlined />}
              >
                Reply by email
              </Button>
            )}
            <Button type="primary" onClick={() => void save()} loading={saving}>
              Save
            </Button>
          </Space>
        }
      >
        {active && (
          <div className="stack gap-16">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="From">{active.name}</Descriptions.Item>
              <Descriptions.Item label="Email">
                <a href={`mailto:${active.email}`}>{active.email}</a>
              </Descriptions.Item>
              <Descriptions.Item label="Received">{formatDateTime(active.sentAt)}</Descriptions.Item>
              <Descriptions.Item label="IP">
                <span className="mono" style={{ fontSize: 12.5 }}>
                  {active.ip ?? 'unknown'}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Message
              </Text>
              <Card size="small" styles={{ body: { background: 'var(--surface-sunken)' } }}>
                <Text style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7 }}>{active.message}</Text>
              </Card>
            </div>

            <Form form={form} layout="vertical">
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'read', label: 'Read' },
                    { value: 'replied', label: 'Replied' },
                    { value: 'archived', label: 'Archived' },
                    { value: 'pending', label: 'Back to unread' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="adminNote" label="Internal note">
                <Input.TextArea rows={3} maxLength={500} showCount placeholder="Context for the rest of the team" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Drawer>
    </>
  );
}
