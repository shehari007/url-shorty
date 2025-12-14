import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Form, 
  Input, 
  Typography, 
  message,
  Alert
} from 'antd';
import { 
  WarningOutlined, 
  LinkOutlined, 
  MailOutlined,
  SendOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { ApiService } from '../services';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function Report() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const result = await ApiService.submitReport({
        email: values.email,
        shortyUrl: values.shorty_url,
        detail: values.report_detail || ''
      });
      
      if (result.success) {
        setSubmitted(true);
        form.resetFields();
        message.success('Report submitted successfully!');
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        message.error('This Shorty URL was not found in our system.');
      } else if (error?.response?.status === 409) {
        message.error('This URL has already been reported.');
      } else if (error?.response?.status === 429) {
        message.error('Too many submissions. Please try again later.');
      } else {
        message.error('Failed to submit report. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="report-container">
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
            <CheckCircleOutlined />
          </div>
          <Title level={2}>Report Submitted</Title>
          <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 400, margin: '0 auto' }}>
            Thank you for helping keep Shorty URL safe. We'll review your report and take appropriate action.
          </Paragraph>
          <Button 
            type="primary" 
            size="large"
            onClick={() => setSubmitted(false)}
            style={{ marginTop: 24 }}
          >
            Submit Another Report
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-container">
      <div className="page-header">
        <div style={{ 
          width: 80, 
          height: 80, 
          borderRadius: 20, 
          background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 36,
          color: 'white'
        }}>
          <SafetyCertificateOutlined />
        </div>
        <Title level={2} className="page-title">Report Malicious Link</Title>
        <Text className="page-subtitle">
          Help us keep Shorty safe for everyone
        </Text>
      </div>

      <Alert
        className="report-warning"
        message="Why Report?"
        description="If you've encountered a Shorty link that redirects to spam, phishing, malware, or any malicious content, please report it here. We review all reports and take action to protect our users."
        type="warning"
        icon={<WarningOutlined />}
        showIcon
        style={{ marginBottom: 24, borderRadius: 12 }}
      />

      <Card className="report-card" bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
        >
          <Form.Item
            label="Your Email"
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
            label="Shorty URL to Report"
            name="shorty_url"
            rules={[
              { required: true, message: 'Please enter the Shorty URL' }
            ]}
          >
            <Input 
              prefix={<LinkOutlined style={{ color: '#94a3b8' }} />}
              placeholder="https://shorty.com/abc123" 
            />
          </Form.Item>

          <Form.Item
            label="Report Details"
            name="report_detail"
            rules={[
              { required: true, message: 'Please describe the issue' },
              { min: 10, message: 'Please provide more details (at least 10 characters)' }
            ]}
          >
            <TextArea 
              rows={4} 
              placeholder="Describe why this link should be reviewed (e.g., phishing attempt, spam, malware, etc.)"
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
              danger
              style={{ 
                height: 48
              }}
            >
              Submit Report
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
