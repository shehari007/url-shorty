import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Form, 
  Input, 
  Typography, 
  message,
  Space
} from 'antd';
import { 
  MailOutlined, 
  UserOutlined, 
  MessageOutlined,
  SendOutlined,
  CustomerServiceOutlined
} from '@ant-design/icons';
import { ApiService } from '../services';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function ContactPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const result = await ApiService.submitContact({
        email: values.email,
        fullname: values.fullname,
        message: values.message || ''
      });
      
      if (result.success) {
        setSubmitted(true);
        form.resetFields();
        message.success('Message sent successfully!');
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || 'Failed to send message. Please try again.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ 
            width: 100, 
            height: 100, 
            borderRadius: '50%', 
            background: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 48,
            color: '#10b981'
          }}>
            <MailOutlined />
          </div>
          <Title level={2}>Message Sent!</Title>
          <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 400, margin: '0 auto' }}>
            Thank you for reaching out. We'll get back to you within 24 hours.
          </Paragraph>
          <Button 
            type="primary" 
            size="large"
            onClick={() => setSubmitted(false)}
            style={{ marginTop: 24 }}
          >
            Send Another Message
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ 
          width: 80, 
          height: 80, 
          borderRadius: 20, 
          background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 36,
          color: 'white'
        }}>
          <CustomerServiceOutlined />
        </div>
        <Title level={2} className="page-title">Get in Touch</Title>
        <Text className="page-subtitle">
          Have a question or feedback? We'd love to hear from you.
        </Text>
      </div>

      <Card className="form-card" bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
        >
          <Form.Item
            label="Full Name"
            name="fullname"
            rules={[
              { required: true, message: 'Please enter your full name' },
              { min: 2, message: 'Name must be at least 2 characters' }
            ]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              placeholder="John Doe" 
            />
          </Form.Item>

          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input 
              prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
              placeholder="you@example.com" 
            />
          </Form.Item>

          <Form.Item
            label="Message"
            name="message"
            rules={[
              { required: true, message: 'Please enter your message' },
              { min: 10, message: 'Message must be at least 10 characters' }
            ]}
          >
            <TextArea 
              rows={5} 
              placeholder="Tell us how we can help..."
              style={{ resize: 'none' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<SendOutlined />}
              block
              style={{ 
                height: 48,
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                border: 'none',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
              }}
            >
              Send Message
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Space direction="vertical" size={4}>
          <Text type="secondary">Or reach to me directly at</Text>
          <a href="mailto:shehariyar@gmail.com" style={{ fontWeight: 600 }}>
            shehariyar@gmail.com
          </a>
        </Space>
      </div>
    </div>
  );
}
