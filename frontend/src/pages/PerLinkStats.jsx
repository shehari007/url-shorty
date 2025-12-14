import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Typography, 
  message,
  Statistic,
  Tag,
  Empty,
  Skeleton,
  Divider
} from 'antd';
import { 
  LinkOutlined, 
  SearchOutlined,
  ThunderboltOutlined,
  UserOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  GlobalOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import CountUp from 'react-countup';
import { useSearchParams } from 'react-router-dom';
import { ApiService } from '../services';

const { Title, Text, Paragraph } = Typography;

// Helper function to format dates properly
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function PerLinkStats() {
  const [searchParams] = useSearchParams();
  const [urlValue, setUrlValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [visitStats, setVisitStats] = useState(null);
  const [searched, setSearched] = useState(false);

  // Auto-fill and fetch from URL params
  useEffect(() => {
    const urlFromParams = searchParams.get('url');
    if (urlFromParams) {
      setUrlValue(urlFromParams);
      // Auto-fetch stats
      fetchStats(urlFromParams);
    }
  }, [searchParams]);

  const fetchStats = async (url) => {
    if (!url?.trim()) {
      message.warning('Please enter a Shorty URL link');
      return;
    }
    
    setLoading(true);
    setSearched(true);
    try {
      const result = await ApiService.getPerLinkStats(url);
      if (result.success) {
        setStats(result.data.link);
        setVisitStats(result.data.visitStats);
      }
    } catch (error) {
      setStats(null);
      setVisitStats(null);
      const errorMessage = error?.response?.data?.message || 'Something went wrong. Please try again.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchStats(urlValue);

  const formatter = (value) => <CountUp end={value} separator="," />;

  const statItems = [
    {
      icon: <ThunderboltOutlined />,
      iconClass: 'primary',
      label: 'Total Clicks',
      value: stats?.timesClicked || 0,
      color: '#6366f1'
    },
    {
      icon: <UserOutlined />,
      iconClass: 'info',
      label: 'Unique Visitors',
      value: visitStats?.unique_visitors || 0,
      color: '#3b82f6'
    },
    {
      icon: <EyeOutlined />,
      iconClass: 'success',
      label: 'Visits Today',
      value: visitStats?.visits_today || 0,
      color: '#10b981'
    },
    {
      icon: <CalendarOutlined />,
      iconClass: 'warning',
      label: 'This Week',
      value: visitStats?.visits_last_week || 0,
      color: '#f59e0b'
    },
  ];

  return (
    <div className="pls-container">
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
          <BarChartOutlined />
        </div>
        <Title level={2} className="page-title">Link Analytics</Title>
        <Text className="page-subtitle">
          Track performance and insights for any Shorty URL link
        </Text>
      </div>

      {/* Search Card */}
      <Card className="pls-search-card" bordered={false}>
        <div className="pls-search-form">
          <Input
            className="pls-search-input"
            size="large"
            placeholder="Enter your Shorty URL link (e.g., https://short.msyb.dev/abc123)"
            prefix={<LinkOutlined style={{ color: '#94a3b8' }} />}
            value={urlValue}
            onChange={e => setUrlValue(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
          />
          <Button
            type="primary"
            size="large"
            icon={<SearchOutlined />}
            loading={loading}
            onClick={handleSearch}
            style={{ 
              minWidth: 140,
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              border: 'none'
            }}
          >
            Analyze
          </Button>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <Card className="pls-results-card" bordered={false}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      ) : searched && stats ? (
        <Card className="pls-results-card" bordered={false}>
          {/* Link Info Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <GlobalOutlined style={{ fontSize: 20, color: '#6366f1' }} />
              <Text strong style={{ fontSize: 16 }}>Link Details</Text>
              {stats.blacklisted === 0 ? (
                <Tag color="success" icon={<CheckCircleOutlined />}>Safe</Tag>
              ) : (
                <Tag color="error" icon={<WarningOutlined />}>Reported</Tag>
              )}
            </div>
            <Paragraph 
              type="secondary" 
              ellipsis={{ rows: 2 }}
              style={{ marginBottom: 4 }}
            >
              <strong>Original:</strong> {stats.mainUrl || 'N/A'}
            </Paragraph>
            <Text type="secondary">
              <ClockCircleOutlined style={{ marginRight: 6 }} />
              Created: {formatDate(stats.timeIssued)}
            </Text>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          {/* Stats Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16
          }}>
            {statItems.map((item, index) => (
              <div key={index} className="pls-stat-row" style={{ 
                padding: 16, 
                borderRadius: 12, 
                background: 'rgba(0,0,0,0.02)',
                border: 'none',
                display: 'flex',
                alignItems: 'center'
              }}>
                <div 
                  className={`pls-stat-icon ${item.iconClass}`}
                  style={{ 
                    background: `${item.color}15`,
                    color: item.color
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="pls-stat-value" style={{ color: item.color }}>
                    <Statistic 
                      value={item.value} 
                      formatter={formatter}
                      valueStyle={{ fontSize: 24, fontWeight: 700, color: item.color }}
                    />
                  </div>
                  <div className="pls-stat-label">{item.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Stats */}
          {visitStats && (
            <>
              <Divider style={{ margin: '24px 0 16px' }} />
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12,
                textAlign: 'center'
              }}>
                <div>
                  <Text type="secondary">This Month</Text>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{visitStats.visits_month || 0}</div>
                </div>
                <div>
                  <Text type="secondary">QR Scans</Text>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.qrGenerated || 0}</div>
                </div>
              </div>
            </>
          )}
        </Card>
      ) : searched ? (
        <Card className="pls-results-card" bordered={false}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No data found for this link"
          />
        </Card>
      ) : (
        <Card className="pls-results-card" bordered={false}>
          <div className="empty-state">
            <div className="empty-icon">
              <BarChartOutlined />
            </div>
            <div className="empty-title">Enter a URL to get started</div>
            <div className="empty-description">
              Paste any Shorty URL link above to see detailed analytics
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
