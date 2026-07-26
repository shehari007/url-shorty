'use client';

import { LogoutOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { AdminApiError, adminApi } from '@/lib/adminClient';
import { formatDateTime, timeAgo } from '@/lib/format';
import type { AdminAccount, AdminProfile } from '@/lib/types';
import { PageHeading } from './PageHeading';

const ROLE_COLOR: Record<string, string> = { owner: 'gold', admin: 'blue', moderator: 'default' };

const ROLE_OPTIONS = [
  { value: 'moderator', label: 'Moderator, review reports and messages' },
  { value: 'admin', label: 'Admin, full moderation, plus delete and blocklist' },
  { value: 'owner', label: 'Owner, everything, including managing admins' },
];

export function AccountsManager({ currentAdmin }: { currentAdmin: AdminProfile }) {
  const { message } = App.useApp();

  const [rows, setRows] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.get<AdminAccount[]>('admins');
      setRows(result.data);
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : 'Could not load admin accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await adminApi.post('admins', values);
      message.success('Admin created');
      form.resetFields();
      setCreating(false);
      await load();
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.issues?.length) {
        form.setFields(caught.issues.map((issue) => ({ name: issue.path, errors: [issue.message] })));
      }
      message.error(caught instanceof AdminApiError ? caught.message : 'Could not create that admin');
    } finally {
      setSaving(false);
    }
  }, [form, load, message]);

  const update = useCallback(
    async (id: number, body: Record<string, unknown>, successMessage: string) => {
      try {
        await adminApi.patch(`admins/${id}`, body);
        message.success(successMessage);
        await load();
      } catch (caught) {
        message.error(caught instanceof AdminApiError ? caught.message : 'That change could not be saved');
      }
    },
    [load, message],
  );

  const revokeSessions = useCallback(
    async (id: number) => {
      try {
        await adminApi.post(`admins/${id}/revoke-sessions`);
        message.success('All of their sessions were signed out');
        await load();
      } catch (caught) {
        message.error(caught instanceof AdminApiError ? caught.message : 'Could not revoke those sessions');
      }
    },
    [load, message],
  );

  return (
    <>
      <PageHeading
        title="Admin accounts"
        subtitle="Who can sign in to this console, and what they are allowed to do."
        actions={
          <>
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
              Add admin
            </Button>
          </>
        }
      />

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <Card variant="borderless" styles={{ body: { padding: 0 } }}>
        <div className="table-wrap">
          <Table<AdminAccount>
            rowKey="id"
            dataSource={rows}
            loading={loading}
            size="middle"
            scroll={{ x: 860 }}
            pagination={false}
            columns={[
              {
                title: 'Name',
                dataIndex: 'name',
                render: (name: string, row) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {name}
                      {row.id === currentAdmin.id && (
                        <Tag color="processing" style={{ marginLeft: 8 }}>
                          You
                        </Tag>
                      )}
                    </div>
                    <span className="text-muted" style={{ fontSize: 12.5 }}>
                      {row.email}
                    </span>
                  </div>
                ),
              },
              {
                title: 'Role',
                dataIndex: 'role',
                width: 160,
                render: (role: string, row) => (
                  <Select
                    size="small"
                    value={role}
                    style={{ width: 130 }}
                    disabled={row.id === currentAdmin.id}
                    options={[
                      { value: 'moderator', label: 'Moderator' },
                      { value: 'admin', label: 'Admin' },
                      { value: 'owner', label: 'Owner' },
                    ]}
                    onChange={(value) => void update(row.id, { role: value }, `Role changed to ${value}`)}
                  />
                ),
              },
              {
                title: 'Active',
                dataIndex: 'isActive',
                width: 90,
                render: (isActive: boolean, row) => (
                  <Switch
                    size="small"
                    checked={isActive}
                    disabled={row.id === currentAdmin.id}
                    onChange={(checked) =>
                      void update(row.id, { isActive: checked }, checked ? 'Account activated' : 'Account deactivated')
                    }
                  />
                ),
              },
              {
                title: 'Last sign in',
                dataIndex: 'lastLoginAt',
                width: 190,
                responsive: ['lg'],
                render: (value: string | null, row) => (
                  <div>
                    <div style={{ fontSize: 12.5 }}>{value ? timeAgo(value) : 'Never'}</div>
                    {row.lastLoginIp && (
                      <span className="mono text-muted" style={{ fontSize: 11.5 }}>
                        {row.lastLoginIp}
                      </span>
                    )}
                    {row.lockedUntil && new Date(row.lockedUntil) > new Date() && (
                      <Tag color="error" style={{ marginTop: 4 }}>
                        Locked until {formatDateTime(row.lockedUntil)}
                      </Tag>
                    )}
                  </div>
                ),
              },
              {
                title: 'Status',
                key: 'badge',
                width: 110,
                render: (_value, row) => (
                  <Tag color={ROLE_COLOR[row.role] ?? 'default'}>{row.isActive ? row.role : 'disabled'}</Tag>
                ),
              },
              {
                title: '',
                key: 'actions',
                width: 130,
                render: (_value, row) => (
                  <Space size={2}>
                    <Popconfirm
                      title="Sign this admin out everywhere?"
                      description="Their active sessions end immediately and they will need to sign in again."
                      okText="Sign out"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => void revokeSessions(row.id)}
                    >
                      <Button type="text" size="small" icon={<LogoutOutlined />}>
                        Revoke
                      </Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Modal
        open={creating}
        title="Add an admin"
        onCancel={() => setCreating(false)}
        onOk={() => void create()}
        confirmLoading={saving}
        okText="Create admin"
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="Share the password securely"
          description="The password is set once here and cannot be recovered later, send it through a secure channel and ask them to change it after signing in."
        />
        <Form form={form} layout="vertical" initialValues={{ role: 'moderator' }}>
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: 'Enter their name' },
              { min: 2, message: 'That name looks too short' },
            ]}
          >
            <Input placeholder="Ada Lovelace" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Enter their email' },
              { type: 'email', message: 'Enter a valid email address' },
            ]}
          >
            <Input placeholder="ada@example.com" autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Temporary password"
            rules={[
              { required: true, message: 'Set a password' },
              { min: 12, message: 'Use at least 12 characters' },
              { pattern: /[a-z]/, message: 'Include a lowercase letter' },
              { pattern: /[A-Z]/, message: 'Include an uppercase letter' },
              { pattern: /[0-9]/, message: 'Include a number' },
            ]}
          >
            <Input.Password placeholder="At least 12 characters" autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
