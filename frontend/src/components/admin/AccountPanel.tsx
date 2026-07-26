'use client';

import { LockOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Descriptions, Form, Input, Tag } from 'antd';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminApiError, adminApi, signOut } from '@/lib/adminClient';
import { formatDateTime } from '@/lib/format';
import type { AdminProfile } from '@/lib/types';
import { PageHeading } from './PageHeading';

const ROLE_COLOR: Record<string, string> = { owner: 'gold', admin: 'blue', moderator: 'default' };

interface Values {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function AccountPanel({ admin }: { admin: AdminProfile }) {
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);

  const changePassword = async (values: Values) => {
    setSaving(true);
    try {
      await adminApi.post('auth/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      message.success('Password updated, signing you out');
      form.resetFields();

      // The API bumps tokenVersion, so every existing session is now invalid.
      await signOut();
      router.replace('/admin/login');
      router.refresh();
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.issues?.length) {
        form.setFields(caught.issues.map((issue) => ({ name: issue.path as keyof Values, errors: [issue.message] })));
      }
      message.error(caught instanceof AdminApiError ? caught.message : 'Could not change your password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeading title="My account" subtitle="Your details and sign-in security." />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card variant="borderless" title="Profile">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Name">{admin.name}</Descriptions.Item>
            <Descriptions.Item label="Email">{admin.email}</Descriptions.Item>
            <Descriptions.Item label="Role">
              <Tag color={ROLE_COLOR[admin.role] ?? 'default'}>{admin.role}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Last sign in">
              {admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : 'This is your first session'}
            </Descriptions.Item>
            <Descriptions.Item label="Last sign-in IP">
              <span className="mono" style={{ fontSize: 12.5 }}>
                {admin.lastLoginIp ?? 'Not recorded'}
              </span>
            </Descriptions.Item>
            {admin.createdAt && (
              <Descriptions.Item label="Account created">{formatDateTime(admin.createdAt)}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card variant="borderless" title="Change password">
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 18 }}
            title="This signs out every device"
            description="Changing your password invalidates all active sessions, including this one. You will be asked to sign in again."
          />

          <Form form={form} layout="vertical" onFinish={changePassword} requiredMark={false}>
            <Form.Item
              name="currentPassword"
              label="Current password"
              rules={[{ required: true, message: 'Enter your current password' }]}
            >
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="New password"
              rules={[
                { required: true, message: 'Choose a new password' },
                { min: 12, message: 'Use at least 12 characters' },
                { pattern: /[a-z]/, message: 'Include a lowercase letter' },
                { pattern: /[A-Z]/, message: 'Include an uppercase letter' },
                { pattern: /[0-9]/, message: 'Include a number' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirm new password"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_rule, value: string) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject(new Error('The two passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={saving}>
                Update password
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </>
  );
}
