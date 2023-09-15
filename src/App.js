
import './App.css';
import React, { useState } from 'react';
import { HomeFilled, GithubFilled, LinkOutlined, CopyOutlined, QrcodeOutlined, WarningOutlined, ContactsOutlined, SafetyCertificateTwoTone } from '@ant-design/icons';
import { Menu, Card, Input, Alert, Space, Spin, Tag, Button, QRCode, Layout } from 'antd';
import Footer from './Components/Footer/Footer';
import axios from 'axios';
import Contact from './Components/Contact/Contact';
import DetailsCard from './Components/DetailsCard/DetailsCard';
import ReportPage from './Components/ReportPage/ReportPage';
import copy from 'copy-to-clipboard';
import Marquee from 'react-fast-marquee';

const { Search } = Input;

const items = [
  {
    label: 'Home',
    key: 'home',
    icon: <HomeFilled />,
  },
  {
    label: 'Contact Us',
    key: 'contact',
    icon: <ContactsOutlined />,
  },
  {
    label: 'Report Shorty Link',
    key: 'report',
    icon: <WarningOutlined />,
  },
  {
    label: (
      <a
        href={process.env.REACT_APP_GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        View Github
      </a>
    ),

    key: 'github',
    icon: <GithubFilled />,
  },
]

const { Content } = Layout;


function App() {

  const urlSearchParams = new URLSearchParams(window.location.search);
  const testParam = urlSearchParams.get('menu');

  const [current, setCurrent] = useState(!testParam ? 'home' : testParam);
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
    //event.preventDefault();
    setResponse(() => false);
    setCopied(() => false);
    setHTTPError(200);
    try {
      setLoading(true);
      const data = await axios.post(process.env.REACT_APP_API_URL, {
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
      } else if (error.response.status === 403) {
        setLoading(false);
        setHTTPError(403);
      }
    }
  };

  const onClick = (e) => {

    if (e.key === 'github') {
      setCurrent(current)
    } else {
      setResponse(() => false);
      setCopied(() => false);
      setHTTPError(200);
      setCurrent(e.key)
    }
  };

  return <>
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className='layout-back'>
      <Content style={{ flex: '1' }}>

        <Menu onClick={onClick} selectedKeys={[current]} theme='light' mode="horizontal" style={{ justifyContent: 'center', minHeight: '50px' }} items={items} />

        {current === 'home' ?
          <div align="center">
            <Card
              style={{
                width: '85%',
                justifyItems: 'center',
                marginTop: '15px',
                boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div align="center">
                <Alert
                  banner
                  type='info'
                  style={{ maxWidth: '85%' }}
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
                <h1> <img src='logo.png' height="150px" width="150px" alt="logo"></img> <br />SHORTY URL</h1>
                <Search
                  style={{ maxWidth: '95%' }}
                  placeholder="Enter your URL here.."
                  allowClear
                  onChange={e => setUrlValue(e.target.value)}
                  prefix={<LinkOutlined />}
                  enterButton="Submit"
                  size="large"
                  onSearch={onSubmit}
                />
                <br />
                {loading === true ?
                  <Space>
                    <Spin tip="Shorty URL Generating..." size="medium">
                      <div className="content" />
                    </Spin>
                  </Space>
                  :
                  null}
                <br />
                {response === true && shortURL !== '' ?
                  <>
                    <Alert
                      message={<>
                        <Tag color="#108ee9"><b>Generated Link: </b></Tag>
                        <a href={shortURL} target="_blank" rel="noreferrer">{shortURL} </a>

                        <Button title="Copy Link" type="primary" onClick={() => handleCopyClick()} icon={<CopyOutlined />} />
                        <Button type="primary" onClick={() => handleQRShowBtn()} style={{ marginLeft: '5px' }} title='Show QR TAG' icon={<QrcodeOutlined />}></Button> {copied === true ? <> Copied! <img src='tick.webp' alt='tick' height={15} width={15} /></> : null}

                      </>}
                      type="success"

                      style={{ textAlign: 'center', maxWidth: '95%' }}
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
                          <p style={{ fontSize: '12px' }}>{shortURL}</p>
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
                      message={<><p>Only HTTPS Links are allowed, Make sure your link starts with https://<br />Or entered URL is not a valid URL</p></>}
                      type="error"
                      style={{ textAlign: 'center', maxWidth: '95%' }}

                    />
                    :
                    HTTPError === 403 ?
                      <Alert
                        message={<><p>This URL is Blacklisted, Try another URL<br />You think it's mistake? <a href='?menu=contact'>Contact us</a></p></>}
                        type="error"
                        style={{ textAlign: 'center', maxWidth: '95%' }}
                        showIcon
                        closable
                      />
                      :
                      null}
              </div>
            </Card>
            <Card
              style={{
                width: '85%',
                justifyItems: 'center',
                marginTop: '15px',
                boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
              }}
            >
              <DetailsCard />

            </Card>
          </div>
          :
          current === 'report' ?
            <div align="center">
              <Card
                style={{
                  width: '85%',
                  justifyItems: 'center',
                  marginTop: '15px',
                  boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
                }}
              >
                <ReportPage />

              </Card>
            </div>
            :
            current === 'contact' ?
              <div align="center">
                <Card
                  style={{
                    width: '85%',
                    justifyItems: 'center',
                    marginTop: '15px',
                    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <Contact />

                </Card>
              </div>
              :
              null}
      </Content>
      <Footer />
    </Layout>
  </>

}

export default App;
