'use client';

import { MailOutlined, MessageOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Result } from 'antd';
import Link from 'next/link';
import { useState } from 'react';
import { ApiError, api } from '@/lib/api';

const { TextArea } = Input;

interface Values {
  fullname: string;
  email: string;
  subject?: string;
  message: string;
  website?: string;
}

export function ContactForm() {
  const { message: toast } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (values: Values) => {
    setLoading(true);
    try {
      await api.submitContact(values);
      form.resetFields();
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.issues?.length) {
        form.setFields(error.issues.map((issue) => ({ name: issue.path as keyof Values, errors: [issue.message] })));
      }
      toast.error(error instanceof ApiError ? error.message : 'Could not send your message. Please try again.');
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
            title="Message sent"
            subTitle="Thanks for getting in touch. We read everything and usually reply within a couple of working days."
            extra={[
              <Button key="another" onClick={() => setDone(false)}>
                Send another
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
      <h2 className="panel__title">Send us a message</h2>
      <p className="panel__hint">We reply to the address you give us here.</p>
      <div>
        <Form form={form} layout="vertical" size="large" onFinish={submit} requiredMark="optional">
          {/* Honeypot: hidden from people, irresistible to bots. */}
          <Form.Item name="website" hidden aria-hidden="true">
            <Input tabIndex={-1} autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="fullname"
            label="Your name"
            rules={[
              { required: true, message: 'Enter your name' },
              { min: 2, message: 'That name looks a little short' },
              { max: 100, message: 'Please keep this under 100 characters' },
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: 'var(--text-muted)' }} />} placeholder="Ada Lovelace" autoComplete="name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Enter your email' },
              { type: 'email', message: 'Enter a valid email address' },
            ]}
          >
            <Input prefix={<MailOutlined style={{ color: 'var(--text-muted)' }} />} placeholder="you@example.com" autoComplete="email" />
          </Form.Item>

          <Form.Item name="subject" label="Subject" rules={[{ max: 150, message: 'Please keep this under 150 characters' }]}>
            <Input placeholder="What is this about?" />
          </Form.Item>

          <Form.Item
            name="message"
            label="Message"
            rules={[
              { required: true, message: 'Write your message' },
              { min: 10, message: 'Please write at least 10 characters' },
              { max: 2000, message: 'Please keep this under 2000 characters' },
            ]}
          >
            <TextArea
              rows={6}
              showCount
              maxLength={2000}
              placeholder="Tell us what you need, questions, bug reports, feature ideas and partnership enquiries are all welcome."
              style={{ resize: 'none' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SendOutlined />} block size="large">
              Send message
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
