
import './App.css';
import React, { useState } from 'react';
import { HomeFilled, DashboardFilled, GithubFilled, LinkOutlined, CopyOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Menu, Card, Input, Alert, Space, Spin, Tag, Button, QRCode } from 'antd';
import axios from 'axios';
import DetailsCard from './Components/DetailsCard/DetailsCard';
import copy from 'copy-to-clipboard';

const items = [
  {
    label: 'Home',
    key: 'mail',
    icon: <HomeFilled />,
  },
  {
    label: 'Stats',
    key: 'stats',
    icon: <DashboardFilled />,
  },
  {
    label: 'Github',
    key: 'github',
    icon: <GithubFilled />,
  }
]

function App() {
  const [current, setCurrent] = useState('mail');
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
  const handleQRShowBtn = () => {
    setShowQR(!showQR);
  }
  const handleCopyClick = () => {
    if (copy(shortURL)) {
      setCopied(true);
    }


  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setResponse(() => false);
    setCopied(() => false);
    setHTTPError(200);
    try {
      setLoading(true);
      const data = await axios.post('http://localhost:8080/api/url-shorty', {
        urlValue: urlValue
      });

      if (data.status === 200) {
        setLoading(false);
        var res = data.data;
        setResponse(true);
        setShortURL(res.message);
      } else {
        setResponse(false);
      }
    } catch (error) {
      if (error.response.status === 400) {
        setLoading(false);
        setHTTPError(400);
      }
    }
  };

  const onClick = (e) => {
    console.log('click ', e);
    setCurrent(e.key);
  };

  return <>
    <Menu onClick={onClick} selectedKeys={[current]} theme='light' mode="horizontal" style={{ justifyContent: 'center' }} items={items} />;
    {current === 'mail' ? <div align="center">
      <Card
        style={{
          width: '85%',
          justifyItems: 'center',
          boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div align="center">
          <h3>URL SHORTY</h3>
          <form onSubmit={onSubmit}>
            <Input
              style={{ maxWidth: '90%' }}
              placeholder="Enter your URL here.."
              onChange={e => setUrlValue(e.target.value)}
              prefix={<LinkOutlined />}
            />
          </form>
          <br />
          {loading === true ?
            <Space>
              <Spin tip="Shorty URL Generating..." size="medium">
                <div className="content" />
              </Spin>
            </Space>
            :
            null}

          {response === true && shortURL !== '' ?
            <>
              <Alert
                message={<>
                  <Tag color="#108ee9"><b>Generated Link: </b></Tag>
                  <a href={shortURL} target="_blank">{shortURL} </a>

                  <Button title="Copy Link" type="primary" onClick={() => handleCopyClick()} icon={<CopyOutlined />} />
                  <Button type="primary" onClick={() => handleQRShowBtn()} style={{ marginLeft: '5px' }} title='Show QR TAG' icon={<QrcodeOutlined />}></Button> {copied === true ? <> Copied! <img src='tick.webp' height={15} width={15} /></> : null}

                </>}
                type="success"
                showIcon
                style={{ textAlign: 'center', maxWidth: '90%' }}
                closable
              />
              {showQR === true ?
                <>
                  <div id="myqrcode">
                    <QRCode
                      value={shortURL}
                      bgColor="#fff"
                      style={{
                        marginBottom: 15,
                        marginTop: 15
                      }}

                    />
                    <p style={{fontSize:'12px'}}>{shortURL}</p>
                    <Button type="primary" onClick={downloadQRCode}>
                      Download QR TAG
                    </Button>
                  </div>
                </>
                :
                null}
            </>
            :
            HTTPError === 400 ?
              <Alert
                message="Only HTTPS Links are allowed, Make sure your link starts with https://"
                type="error"
                style={{ textAlign: 'center', maxWidth: '90%' }}
                showIcon
                closable
              />
              :
              null}
        </div>
      </Card>
    </div>
      :
      current === 'stats' ?
        <h1>HI STATS</h1>
        :
        null}

  </>
}

export default App;
