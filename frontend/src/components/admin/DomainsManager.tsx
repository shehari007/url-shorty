'use client';

import { DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Form, Input, Modal, Popconfirm, Table, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { AdminApiError, adminApi } from '@/lib/adminClient';
import { formatDateTime } from '@/lib/format';
import type { BlockedDomain } from '@/lib/types';
import { PageHeading } from './PageHeading';

const { Text } = Typography;

export function DomainsManager() {
  const { message } = App.useApp();

  const [rows, setRows] = useState<BlockedDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.get<BlockedDomain[]>('blocked-domains');
      setRows(result.data);
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : 'Could not load the blocklist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(async () => {
    const values = (await form.validateFields()) as { domain: string; reason?: string };
    setSaving(true);
    try {
      const { data } = await adminApi.post<{ domain: string; linksTakenDown: number }>(
        'blocked-domains',
        values,
      );
      // The server normalises the entry (a leading `www.` is stripped, since one
      // entry covers the apex and every subdomain), so report what it stored
      // rather than what was typed.
      const domain = data?.domain ?? values.domain;
      const taken = data?.linksTakenDown ?? 0;
      message.success(
        taken > 0
          ? `${domain} is now blocked, and ${taken} existing link${taken === 1 ? '' : 's'} taken offline`
          : `${domain} is now blocked`,
      );
      form.resetFields();
      setAdding(false);
      await load();
    } catch (caught) {
      message.error(caught instanceof AdminApiError ? caught.message : 'Could not block that domain');
    } finally {
      setSaving(false);
    }
  }, [form, load, message]);

  const remove = useCallback(
    async (id: number, domain: string) => {
      try {
        await adminApi.delete(`blocked-domains/${id}`);
        message.success(`${domain} unblocked`);
        await load();
      } catch (caught) {
        message.error(caught instanceof AdminApiError ? caught.message : 'Could not unblock that domain');
      }
    },
    [load, message],
  );

  return (
    <>
      <PageHeading
        title="Blocked domains"
        subtitle="Destinations on this list are refused at creation time, nobody can shorten a link pointing at them."
        actions={
          <>
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
              Block a domain
            </Button>
          </>
        }
      />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="Subdomains are covered automatically"
        description="Blocking example.com also blocks www.example.com and any other subdomain. Private, loopback and link-local addresses are always rejected regardless of this list."
      />

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <Card variant="borderless" styles={{ body: { padding: 0 } }}>
        <div className="table-wrap">
          <Table<BlockedDomain>
            rowKey="id"
            dataSource={rows}
            loading={loading}
            size="middle"
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            columns={[
              {
                title: 'Domain',
                dataIndex: 'domain',
                render: (domain: string) => <span className="mono">{domain}</span>,
              },
              {
                title: 'Reason',
                dataIndex: 'reason',
                render: (reason: string | null) => reason ?? <Text type="secondary">, </Text>,
              },
              {
                title: 'Blocked',
                dataIndex: 'createdAt',
                width: 180,
                responsive: ['md'],
                render: (value: string) => (
                  <span className="text-muted" style={{ fontSize: 12.5 }}>
                    {formatDateTime(value)}
                  </span>
                ),
              },
              {
                title: '',
                key: 'actions',
                width: 60,
                render: (_value, row) => (
                  <Popconfirm
                    title={`Unblock ${row.domain}?`}
                    description="People will be able to shorten links to it again."
                    okText="Unblock"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => void remove(row.id, row.domain)}
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Modal
        open={adding}
        title="Block a domain"
        onCancel={() => setAdding(false)}
        onOk={() => void add()}
        confirmLoading={saving}
        okText="Block domain"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="domain"
            label="Domain"
            rules={[
              { required: true, message: 'Enter a domain' },
              {
                pattern: /^(https?:\/\/)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/,
                message: 'Enter a valid domain, for example: example.com',
              },
            ]}
            extra="Subdomains are included automatically."
          >
            <Input placeholder="example.com" autoFocus />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ max: 255 }]}>
            <Input placeholder="e.g. Repeated phishing campaigns" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
