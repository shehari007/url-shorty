import './App.css';
import React, { useEffect } from 'react';
import { HomeFilled, GithubFilled, WarningOutlined, ContactsOutlined, RiseOutlined } from '@ant-design/icons';
import { Menu, Layout } from 'antd';
import Footer from './Components/Footer/Footer';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
// Pages
import Home from './pages/Home';
import ContactPage from './pages/Contact';
import Report from './pages/Report';
import PerLinkStats from './pages/PerLinkStats';

const { Content, Header } = Layout;

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Backward compatibility for old links like ?menu=contact
  useEffect(() => {
    const menu = new URLSearchParams(location.search).get('menu');
    if (!menu) return;
    const map = {
      home: '/',
      contact: '/contact',
      report: '/report',
      per_link_stats: '/per-link-stats',
      stats: '/per-link-stats',
    };
    const to = map[menu];
    if (to) navigate(to, { replace: true });
  }, [location.search, navigate]);

  const routeKeyMap = {
    '/': 'home',
    '/contact': 'contact',
    '/per-link-stats': 'per_link_stats',
    '/report': 'report',
  };
  const selectedKey = routeKeyMap[location.pathname] || 'home';

  const menuItems = [
    { label: <NavLink to="/">Home</NavLink>, key: 'home', icon: <HomeFilled /> },
    { label: <NavLink to="/contact">Contact Us</NavLink>, key: 'contact', icon: <ContactsOutlined /> },
    { label: <NavLink to="/per-link-stats">Per Link Stats</NavLink>, key: 'per_link_stats', icon: <RiseOutlined /> },
    { label: <NavLink to="/report">Report Shorty Link</NavLink>, key: 'report', icon: <WarningOutlined /> },
    {
      label: (
        <a
          href="https://github.com/shehari007/url-shorty"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Github
        </a>
      ),
      key: 'github',
      icon: <GithubFilled />,
    },
  ];

  return (
    <>
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className='layout-back'>
        <Header style={{ background: '#fff', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <Menu
            selectedKeys={[selectedKey]}
            theme='light'
            mode="horizontal"
            style={{ justifyContent: 'center', minHeight: 56 }}
            items={menuItems}
          />
        </Header>
        <Content style={{ flex: 1, padding: '16px 0' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/report" element={<Report />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/per-link-stats" element={<PerLinkStats />} />
          </Routes>
        </Content>
        <Footer />
      </Layout>
    </>
  );
}

export default App;
