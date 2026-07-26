'use client';

import {
  ArrowLeftOutlined,
  AuditOutlined,
  BarChartOutlined,
  LoadingOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { AdminApiError, signIn } from '@/lib/adminClient';
import { SITE } from '@/lib/config';

interface Values {
  email: string;
  password: string;
}

const HIGHLIGHTS = [
  {
    icon: <BarChartOutlined />,
    title: 'Every link, every click',
    body: 'Search, filter and inspect any short link, with full visit history behind it.',
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: 'Moderation built in',
    body: 'Triage abuse reports and take a malicious link offline in one click.',
  },
  {
    icon: <AuditOutlined />,
    title: 'Everything is logged',
    body: 'An append-only audit trail records every action, including failed sign-ins.',
  },
];

export function LoginForm() {
  const router = useRouter();
  const [form] = Form.useForm<Values>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * `?next=` is read at submit time rather than through useSearchParams, which
   * would opt this page out of prerendering and leave the sign-in screen blank
   * until hydration. Only same-origin admin paths are accepted, so it cannot be
   * turned into an open redirect.
   */
  const resolveDestination = (): string => {
    const next = new URLSearchParams(window.location.search).get('next');
    return next && /^\/admin(\/|$)/.test(next) ? next : '/admin';
  };

  const submit = async (values: Values) => {
    setLoading(true);
    setError(null);
    try {
      await signIn(values.email, values.password);
      router.replace(resolveDestination());
      router.refresh();
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : 'Sign-in failed. Please try again.');
      form.setFieldValue('password', '');
      setLoading(false);
    }
  };

  return (
    <div className="login">
      {/* Brand panel, hidden on narrow screens. */}
      <aside className="login__aside">
        <Link href="/" className="brand" style={{ color: '#fff' }}>
          <Logo size={36} />
          <span className="brand__word" style={{ color: '#fff', fontSize: 18 }}>
            {SITE.fullName}
          </span>
        </Link>

        <div>
          <h1 className="login__headline">The control room for your links.</h1>
          <p className="login__lede">
            Sign in to manage short links, review abuse reports, answer messages and keep the domain trustworthy.
          </p>

          <ul className="login__points">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title}>
                <span className="dot" aria-hidden="true">
                  {item.icon}
                </span>
                <span>
                  <strong style={{ display: 'block', color: '#fff', marginBottom: 2 }}>{item.title}</strong>
                  {item.body}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="login__aside-foot">
          Restricted area. Access is limited to authorised administrators.
        </p>
      </aside>

      {/* Form panel */}
      <main className="login__panel">
        <div className="login__form">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Logo size={46} />
          </div>

          <h2 className="login__title" style={{ textAlign: 'center' }}>
            Sign in
          </h2>
          <p className="login__hint" style={{ textAlign: 'center' }}>
            Use your administrator credentials to continue.
          </p>

          {error && (
            <Alert
              type="error"
              showIcon
              title={error}
              style={{ marginBottom: 20 }}
              closable
              onClose={() => setError(null)}
            />
          )}

          <Form form={form} layout="vertical" size="large" onFinish={submit} requiredMark={false} disabled={loading}>
            <Form.Item
              name="email"
              label="Email address"
              rules={[
                { required: true, message: 'Enter your email' },
                { type: 'email', message: 'Enter a valid email address' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: 'var(--text-muted)' }} />}
                placeholder="you@example.com"
                autoComplete="username"
                autoFocus
              />
            </Form.Item>

            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password' }]}>
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--text-muted)' }} />}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 26 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                icon={loading ? <LoadingOutlined /> : undefined}
                style={{ height: 46, fontSize: 15.5 }}
              >
                {loading ? 'Signing in' : 'Sign in'}
              </Button>
            </Form.Item>
          </Form>

          <div className="login__secure">
            <SafetyOutlined style={{ color: 'var(--a-emerald)', fontSize: 15, marginTop: 1 }} />
            <span>
              Sign-in attempts are rate limited and recorded. Accounts lock automatically after repeated failures.
            </span>
          </div>

          <div style={{ textAlign: 'center', marginTop: 22 }}>
            <Link href="/" style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
              <ArrowLeftOutlined /> Back to {SITE.fullName}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
