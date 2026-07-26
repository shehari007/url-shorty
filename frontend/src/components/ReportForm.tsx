'use client';

import { CheckCircleOutlined, LinkOutlined, MailOutlined, SendOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Result, Select } from 'antd';
import Link from 'next/link';
import { useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { shortDomain } from '@/lib/config';

const { TextArea } = Input;

const REASONS = [
  { value: 'phishing', label: 'Phishing or credential theft' },
  { value: 'malware', label: 'Malware or unwanted downloads' },
  { value: 'spam', label: 'Spam or misleading content' },
  { value: 'adult', label: 'Adult content' },
  { value: 'copyright', label: 'Copyright infringement' },
  { value: 'other', label: 'Something else' },
];

interface Values {
  email: string;
  url: string;
  reason: string;
  detail: string;
}

export function ReportForm() {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (values: Values) => {
    setLoading(true);
    try {
      await api.submitReport(values);
      form.resetFields();
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.issues?.length) {
        form.setFields(error.issues.map((issue) => ({ name: issue.path as keyof Values, errors: [issue.message] })));
      }
      message.error(error instanceof ApiError ? error.message : 'Could not submit your report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="panel">
        <div>
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: 'var(--success)' }} />}
            title="Report received"
            subTitle="Thank you. Our moderators review every report. If the link breaks our rules it will be taken offline, and links crossing our report threshold are disabled automatically in the meantime."
            extra={[
              <Button key="another" onClick={() => setDone(false)}>
                Report another link
              </Button>,
              <Link key="home" href="/">
                <Button type="primary">Back to home</Button>
              </Link>,
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="panel__title">Report a link</h2>
      <p className="panel__hint">The more detail you give, the faster we can act.</p>
      <div>
        <Form form={form} layout="vertical" size="large" onFinish={submit} requiredMark="optional" initialValues={{ reason: 'phishing' }}>
          <Form.Item
            name="url"
            label="Shorty link to report"
            rules={[{ required: true, message: 'Enter the link you want to report' }]}
            extra={`Paste the full link, or just its code (the part after ${shortDomain}/).`}
          >
            <Input prefix={<LinkOutlined style={{ color: 'var(--text-muted)' }} />} placeholder={`https://${shortDomain}/abc123`} />
          </Form.Item>

          <Form.Item name="reason" label="What is wrong with it?" rules={[{ required: true, message: 'Choose a category' }]}>
            <Select options={REASONS} />
          </Form.Item>

          <Form.Item
            name="detail"
            label="Tell us what happened"
            rules={[
              { required: true, message: 'Please describe the problem' },
              { min: 10, message: 'A little more detail helps us act faster (10+ characters)' },
              { max: 500, message: 'Please keep this under 500 characters' },
            ]}
          >
            <TextArea rows={5} showCount maxLength={500} placeholder="Describe what the link does and what you saw when you opened it." style={{ resize: 'none' }} />
          </Form.Item>

          <Form.Item
            name="email"
            label="Your email"
            rules={[
              { required: true, message: 'Enter your email' },
              { type: 'email', message: 'Enter a valid email address' },
            ]}
            extra="Only used to follow up on this report. Never shared or added to a mailing list."
          >
            <Input prefix={<MailOutlined style={{ color: 'var(--text-muted)' }} />} placeholder="you@example.com" autoComplete="email" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" danger htmlType="submit" loading={loading} icon={<SendOutlined />} block size="large">
              Submit report
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
