import React, { useState } from 'react';
import { Card, Input, Alert, Space, Spin, Tag, Button, QRCode, Typography, Divider } from 'antd';
import { LinkOutlined, CopyOutlined, QrcodeOutlined, SafetyCertificateTwoTone } from '@ant-design/icons';
import axios from 'axios';
import copy from 'copy-to-clipboard';
import Marquee from 'react-fast-marquee';
import DetailsCard from '../Components/DetailsCard/DetailsCard';
import PageContainer from './PageContainer';
import { NavLink } from 'react-router-dom';

const { Search } = Input;
const { Title, Text } = Typography;

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [response, setResponse] = useState(false);
  const [HTTPError, setHTTPError] = useState(200);
  const [urlValue, setUrlValue] = useState('');
  const [shortURL, setShortURL] = useState('');
  const [copied, setCopied] = useState(false);

  const downloadQRCode = () => {
    const canvas = document.getElementById('myqrcode')?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL();
      const a = document.createElement('a');
      a.download = 'QRCode.png';
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleCopyClick = () => {
    if (copy(shortURL)) setCopied(true);
  };

  const onSubmit = async () => {
    setResponse(false);
    setCopied(false);
    setHTTPError(200);
    try {
      setLoading(true);
      const data = await axios.post(process.env.REACT_APP_API_URL, { urlValue });
      if (data.status === 200) {
        setLoading(false);
        const res = data.data;
        setResponse(true);
        setShortURL(res.message);
      } else {
        setResponse(false);
      }
    } catch (error) {
      setLoading(false);
      if (error?.response?.status === 400) setHTTPError(400);
      else if (error?.response?.status === 403) setHTTPError(403);
    }
  };

  return (
    <>
      <PageContainer title="Shorty URL" icon={<img src='logo.png' height="32" width="32" alt="logo" style={{ verticalAlign: 'text-bottom' }} />}>
        <div style={{ textAlign: 'center' }}>
          <Alert
            banner
            type='info'
            style={{ marginBottom: 16 }}
            message={
              <Marquee pauseOnHover gradient={false}>
                <SafetyCertificateTwoTone />&nbsp; 100% Ad-Free &nbsp;&nbsp;
                <SafetyCertificateTwoTone />&nbsp; SSL Secured &nbsp;&nbsp;
                <SafetyCertificateTwoTone />&nbsp; Open-Source &nbsp;&nbsp;
                <SafetyCertificateTwoTone />&nbsp; Cloud Secure Database &nbsp;&nbsp;
                <SafetyCertificateTwoTone />&nbsp; Spam Protection &nbsp;&nbsp;
                <SafetyCertificateTwoTone />&nbsp; Scam Link Blacklist Request&nbsp;&nbsp;
                <SafetyCertificateTwoTone />&nbsp; Hobby Project&nbsp;&nbsp;
              </Marquee>
            }
          />

          <Title level={3} style={{ marginTop: 0, marginBottom: 12 }}>Paste a long link to get your Shorty</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Fast, secure, and open-source URL shortener
          </Text>

          <Search
            style={{ width: '100%', maxWidth: 720 }}
            placeholder="Enter your URL here..."
            allowClear
            onChange={e => setUrlValue(e.target.value)}
            prefix={<LinkOutlined />}
            enterButton="Shorten"
            size="large"
            onSearch={onSubmit}
          />

          <div style={{ marginTop: 18 }}>
            {loading ? (
              <Space>
                <Spin tip="Generating your Shorty..." size="large">
                  <div className="content" />
                </Spin>
              </Space>
            ) : null}
          </div>

          <div style={{ marginTop: 16 }}>
            {response && shortURL !== '' ? (
              <>
                <Alert
                  message={
                    <>
                      <Tag color="#108ee9"><b>Generated Link: </b></Tag>
                      <a href={shortURL} target="_blank" rel="noreferrer">{shortURL} </a>
                      <Button title="Copy Link" type="primary" onClick={handleCopyClick} icon={<CopyOutlined />} style={{ marginLeft: 8 }} />
                      <Button type="default" onClick={() => setShowQR(s => !s)} style={{ marginLeft: 8 }} title='Show QR Code' icon={<QrcodeOutlined />}>QR</Button>
                      {copied ? <span style={{ marginLeft: 8, color: '#52c41a' }}>Copied!</span> : null}
                    </>
                  }
                  type="success"
                  style={{ textAlign: 'center' }}
                  closable
                />
                {showQR ? (
                  <div id="myqrcode" style={{ marginTop: 16 }}>
                    <QRCode value={shortURL} bgColor="#fff" style={{ marginBottom: 12 }} />
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{shortURL}</Text>
                    </div>
                    <Button type="primary" onClick={downloadQRCode}>Download QR</Button>
                  </div>
                ) : null}
              </>
            ) : HTTPError === 400 ? (
              <Alert
                message={<><p>Only HTTPS Links are allowed. Make sure your link starts with https://<br />Or the entered URL is not valid.</p></>}
                type="error"
                style={{ textAlign: 'center' }}
              />
            ) : HTTPError === 403 ? (
              <Alert
                message={<><p>This URL is blacklisted. Try another URL.<br />Think it's a mistake? <NavLink to="/contact">Contact us</NavLink></p></>}
                type="error"
                style={{ textAlign: 'center' }}
                showIcon
                closable
              />
            ) : null}
          </div>
        </div>
      </PageContainer>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{ width: '100%', maxWidth: 1100 }}>
          <Card style={{ marginTop: 16, boxShadow: '0px 6px 18px rgba(0, 0, 0, 0.06)', borderRadius: 12 }}>
            <DetailsCard />
          </Card>
        </div>
      </div>
      <Divider style={{ margin: 24 }} />
    </>
  );
}
