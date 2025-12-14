import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  QRCode, 
  Typography, 
  message, 
  Skeleton,
  Space,
  Modal,
  Tooltip,
  Popconfirm
} from 'antd';
import { 
  LinkOutlined, 
  CopyOutlined, 
  QrcodeOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  GlobalOutlined,
  BarChartOutlined,
  CheckCircleFilled,
  DownloadOutlined,
  ShareAltOutlined,
  RocketOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  ClearOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import copy from 'copy-to-clipboard';
import { NavLink } from 'react-router-dom';
import { ApiService } from '../services';

const { Title, Text, Paragraph } = Typography;

// localStorage key for link history
const LINK_HISTORY_KEY = 'shorty_link_history';
const MAX_HISTORY_ITEMS = 20;

// Helper functions for localStorage
const getLinkHistory = () => {
  try {
    const history = localStorage.getItem(LINK_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (e) {
    return [];
  }
};

const saveLinkHistory = (history) => {
  try {
    localStorage.setItem(LINK_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save link history:', e);
  }
};

const addToHistory = (link) => {
  const history = getLinkHistory();
  // Check if already exists
  const existingIndex = history.findIndex(h => h.shortUrl === link.shortUrl);
  if (existingIndex > -1) {
    history.splice(existingIndex, 1);
  }
  // Add to beginning
  history.unshift(link);
  // Keep only max items
  if (history.length > MAX_HISTORY_ITEMS) {
    history.pop();
  }
  saveLinkHistory(history);
  return history;
};

const removeFromHistory = (shortUrl) => {
  const history = getLinkHistory();
  const filtered = history.filter(h => h.shortUrl !== shortUrl);
  saveLinkHistory(filtered);
  return filtered;
};

const clearHistory = () => {
  saveLinkHistory([]);
  return [];
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [shortURL, setShortURL] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [linkHistory, setLinkHistory] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load link history on mount
  useEffect(() => {
    setLinkHistory(getLinkHistory());
  }, []);

  // Fetch stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await ApiService.getStats();
        if (result.success && result.data) {
          // Map API response to frontend expected format
          const overview = result.data.overview || {};
          setStats({
            totalLinks: overview.total_shorty || 0,
            totalClicks: overview.total_clicked || 0,
            qrGenerated: overview.total_qr_generated || 0,
            todayLinks: overview.created_today || 0,
          });
        }
      } catch (e) {
        console.error('Failed to fetch stats:', e);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const downloadQRCode = useCallback(async (canvasId = 'qr-canvas', url = shortURL) => {
    const canvas = document.getElementById(canvasId)?.querySelector('canvas');
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      const a = document.createElement('a');
      a.download = 'shorty-qrcode.png';
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      try {
        await ApiService.trackQrGeneration(url);
      } catch (e) {
        // Silent fail for tracking
      }
      message.success('QR Code downloaded!');
    }
  }, [shortURL]);

  const handleCopy = useCallback((url = shortURL) => {
    if (copy(url)) {
      message.success('Link copied to clipboard!');
    }
  }, [shortURL]);

  const handleShare = async (url = shortURL) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shorty URL - Shortened Link',
          text: 'Check out this shortened link!',
          url: url,
        });
      } catch (e) {
        // User cancelled or share failed
      }
    } else {
      handleCopy(url);
    }
  };

  const onSubmit = async () => {
    if (!urlValue.trim()) {
      message.warning('Please enter a URL');
      return;
    }
    
    setLoading(true);
    try {
      const result = await ApiService.generate(urlValue);
      if (result.success) {
        const newShortUrl = result.data.shortUrl;
        setShortURL(newShortUrl);
        setShowModal(true);
        
        // Add to history
        const newLink = {
          shortUrl: newShortUrl,
          originalUrl: urlValue,
          createdAt: new Date().toISOString(),
          originalLength: urlValue.length,
          shortLength: newShortUrl.length,
        };
        const updatedHistory = addToHistory(newLink);
        setLinkHistory(updatedHistory);
        
        setUrlValue('');
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || 'Something went wrong. Please try again.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = (shortUrl) => {
    const updated = removeFromHistory(shortUrl);
    setLinkHistory(updated);
    message.success('Link removed from history');
  };

  const handleClearHistory = () => {
    const updated = clearHistory();
    setLinkHistory(updated);
    message.success('History cleared');
  };

  const handleViewDetails = (link) => {
    setSelectedLink(link);
    setShowDetailModal(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const features = [
    {
      icon: <ThunderboltOutlined />,
      title: 'Lightning Fast',
      description: 'Generate short links instantly with our optimized infrastructure.',
    },
    {
      icon: <SafetyOutlined />,
      title: 'Secure & Private',
      description: 'SSL encrypted with spam protection and blacklist filtering.',
    },
    {
      icon: <BarChartOutlined />,
      title: 'Analytics',
      description: 'Track clicks and monitor your link performance.',
    },
  ];

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  return (
    <>
      {/* Hero Section - URL Shortener */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <RocketOutlined /> Free & Open Source
          </div>
          
          <Title className="hero-title">
            Shorten Your Links,<br />
            <span className="hero-title-gradient">Amplify Your Reach</span>
          </Title>
          
          <Paragraph className="hero-subtitle">
            Transform long, unwieldy URLs into clean, shareable links. 
            Track clicks, generate QR codes, and analyze your link performance — all for free.
          </Paragraph>

          {/* URL Shortener Form */}
          <div className="shortener-container">
            <Card className="shortener-card" bordered={false}>
              <div className="shortener-form">
                <Input
                  className="shortener-input"
                  size="large"
                  placeholder="Paste your long URL here..."
                  prefix={<LinkOutlined style={{ color: '#94a3b8' }} />}
                  value={urlValue}
                  onChange={e => setUrlValue(e.target.value)}
                  onPressEnter={onSubmit}
                  allowClear
                />
                <Button
                  type="primary"
                  size="large"
                  className="shorten-btn"
                  loading={loading}
                  onClick={onSubmit}
                >
                  Shorten
                </Button>
              </div>
            </Card>
          </div>

          <Text type="secondary" style={{ marginTop: 16, display: 'block' }}>
            By using Shorty URL, you agree to our <NavLink to="/terms">Terms of Service</NavLink>
          </Text>
        </div>
      </section>

      {/* Link History Section */}
      {linkHistory.length > 0 && (
        <section className="link-history-section">
          <div className="link-history-header">
            <Title level={3} className="link-history-title">
              <HistoryOutlined style={{ marginRight: 12 }} />
              Your Recent Links
            </Title>
            <Popconfirm
              title="Clear all history?"
              description="This will remove all your saved links from this browser."
              onConfirm={handleClearHistory}
              okText="Clear"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button icon={<ClearOutlined />} danger type="text">
                Clear All
              </Button>
            </Popconfirm>
          </div>

          <div className="link-history-grid">
            {linkHistory.map((link, index) => (
              <Card 
                key={link.shortUrl + index} 
                className="link-history-card" 
                bordered={false}
                hoverable
              >
                <div className="link-history-card-header">
                  <div className="link-history-icon">
                    <LinkOutlined />
                  </div>
                  <div className="link-history-short-url">
                    <a href={link.shortUrl} target="_blank" rel="noopener noreferrer">
                      {link.shortUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>
                
                <div className="link-history-original" title={link.originalUrl}>
                  {link.originalUrl}
                </div>
                
                <div className="link-history-meta">
                  <span className="link-history-meta-item">
                    <ClockCircleOutlined />
                    {formatDate(link.createdAt)}
                  </span>
                  <span className="link-history-meta-item">
                    <LinkOutlined />
                    {link.originalLength} → {link.shortLength} chars
                  </span>
                </div>

                <div className="link-history-actions">
                  <Tooltip title="Copy">
                    <Button 
                      size="small" 
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(link.shortUrl)}
                    />
                  </Tooltip>
                  <Tooltip title="View Details">
                    <Button 
                      size="small" 
                      icon={<EyeOutlined />}
                      onClick={() => handleViewDetails(link)}
                    />
                  </Tooltip>
                  <Tooltip title="Share">
                    <Button 
                      size="small" 
                      icon={<ShareAltOutlined />}
                      onClick={() => handleShare(link.shortUrl)}
                    />
                  </Tooltip>
                  <Tooltip title="Delete">
                    <Popconfirm
                      title="Remove this link?"
                      onConfirm={() => handleDeleteLink(link.shortUrl)}
                      okText="Remove"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button 
                        size="small" 
                        icon={<DeleteOutlined />}
                        danger
                      />
                    </Popconfirm>
                  </Tooltip>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="section-header">
            <Title level={2} className="section-title">Platform Statistics</Title>
            <Text className="section-subtitle">See how our community is growing</Text>
          </div>

          <div className="stats-grid">
            {statsLoading ? (
              <>
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="stat-card skeleton-card">
                    <Skeleton active paragraph={{ rows: 1 }} />
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card className="stat-card" bordered={false}>
                  <div className="stat-card-content">
                    <div className="stat-icon primary">
                      <LinkOutlined />
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{formatNumber(stats?.totalLinks || 0)}</div>
                      <div className="stat-label">Total Links Created</div>
                    </div>
                  </div>
                </Card>

                <Card className="stat-card" bordered={false}>
                  <div className="stat-card-content">
                    <div className="stat-icon success">
                      <GlobalOutlined />
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{formatNumber(stats?.totalClicks || 0)}</div>
                      <div className="stat-label">Total Clicks</div>
                    </div>
                  </div>
                </Card>

                <Card className="stat-card" bordered={false}>
                  <div className="stat-card-content">
                    <div className="stat-icon warning">
                      <QrcodeOutlined />
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{formatNumber(stats?.qrGenerated || 0)}</div>
                      <div className="stat-label">QR Codes Downloaded</div>
                    </div>
                  </div>
                </Card>

                <Card className="stat-card" bordered={false}>
                  <div className="stat-card-content">
                    <div className="stat-icon info">
                      <BarChartOutlined />
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{formatNumber(stats?.todayLinks || 0)}</div>
                      <div className="stat-label">Links Today</div>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <Title level={2} className="section-title">Why Choose Shorty URL?</Title>
          <Text className="section-subtitle">Simple, powerful, and completely free</Text>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <Card key={index} className="feature-card" bordered={false}>
              <div className="feature-icon">{feature.icon}</div>
              <Title level={4} className="feature-title">{feature.title}</Title>
              <Text className="feature-description">{feature.description}</Text>
            </Card>
          ))}
        </div>
      </section>

      {/* Success Modal */}
      <Modal
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        centered
        width={480}
        className="details-modal"
      >
        <div className="details-header">
          <div className="details-success-icon">
            <CheckCircleFilled />
          </div>
          <Title level={3} className="details-title">Link Created!</Title>
          <Text type="secondary" className="details-subtitle">
            Your shortened URL is ready to share
          </Text>
        </div>

        <div className="details-url-box">
          <div className="details-url-label">Your Short URL</div>
          <div className="details-url">{shortURL}</div>
        </div>

        <div className="details-actions">
          <Tooltip title="Copy to clipboard">
            <Button 
              type="primary" 
              icon={<CopyOutlined />} 
              onClick={() => handleCopy()}
              size="large"
            >
              Copy Link
            </Button>
          </Tooltip>
          <Tooltip title="Share link">
            <Button 
              icon={<ShareAltOutlined />} 
              onClick={() => handleShare()}
              size="large"
            >
              Share
            </Button>
          </Tooltip>
        </div>

        <div id="qr-canvas" className="qr-container">
          <QRCode 
            value={shortURL || 'https://shorty.com'} 
            size={180}
            style={{ margin: '0 auto' }}
          />
        </div>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            block 
            icon={<DownloadOutlined />} 
            onClick={() => downloadQRCode()}
          >
            Download QR Code
          </Button>
          <Button 
            block 
            type="link"
            onClick={() => setShowModal(false)}
          >
            Create Another Link
          </Button>
        </Space>
      </Modal>

      {/* Link Detail Modal */}
      <Modal
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={null}
        centered
        width={520}
        className="link-detail-modal"
        title={
          <Space>
            <LinkOutlined />
            Link Details
          </Space>
        }
      >
        {selectedLink && (
          <>
            <div className="details-url-box" style={{ marginBottom: 16 }}>
              <div className="details-url-label">Short URL</div>
              <div className="details-url">{selectedLink.shortUrl}</div>
            </div>

            <Card size="small" style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Original URL</Text>
              <Paragraph 
                ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
                style={{ marginBottom: 0, wordBreak: 'break-all' }}
              >
                {selectedLink.originalUrl}
              </Paragraph>
            </Card>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: 12, 
              marginBottom: 16 
            }}>
              <Card size="small">
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Created</Text>
                <Text strong>{formatDate(selectedLink.createdAt)}</Text>
              </Card>
              <Card size="small">
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Characters Saved</Text>
                <Text strong style={{ color: '#10b981' }}>
                  {selectedLink.originalLength - selectedLink.shortLength} chars
                </Text>
              </Card>
              <Card size="small">
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Original Length</Text>
                <Text strong>{selectedLink.originalLength} chars</Text>
              </Card>
              <Card size="small">
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Short Length</Text>
                <Text strong>{selectedLink.shortLength} chars</Text>
              </Card>
            </div>

            <div id="detail-qr-canvas" className="link-detail-qr">
              <QRCode 
                value={selectedLink.shortUrl} 
                size={160}
              />
            </div>

            <Space direction="vertical" style={{ width: '100%' }}>
              <Space style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(selectedLink.shortUrl)}
                  style={{ flex: 1 }}
                >
                  Copy Link
                </Button>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={() => downloadQRCode('detail-qr-canvas', selectedLink.shortUrl)}
                  style={{ flex: 1 }}
                >
                  Download QR
                </Button>
              </Space>
              <Button 
                block
                icon={<BarChartOutlined />}
                onClick={() => {
                  setShowDetailModal(false);
                  window.location.href = `/per-link-stats?url=${encodeURIComponent(selectedLink.shortUrl)}`;
                }}
              >
                View Analytics
              </Button>
            </Space>
          </>
        )}
      </Modal>
    </>
  );
}
