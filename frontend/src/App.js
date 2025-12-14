import './App.css';
import React, { useState, useEffect } from 'react';
import { 
  HomeOutlined, 
  GithubOutlined, 
  WarningOutlined, 
  MailOutlined, 
  BarChartOutlined,
  MenuOutlined,
  SunOutlined,
  MoonOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { Menu, Layout, Button, Drawer, Space, Tooltip } from 'antd';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from './context';

// Pages
import Home from './pages/Home';
import ContactPage from './pages/Contact';
import Report from './pages/Report';
import PerLinkStats from './pages/PerLinkStats';
import Terms from './pages/Terms';

const { Content, Header, Footer: AntFooter } = Layout;

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { 
      label: <NavLink to="/">Home</NavLink>, 
      key: 'home', 
      icon: <HomeOutlined /> 
    },
    { 
      label: <NavLink to="/per-link-stats">Analytics</NavLink>, 
      key: 'per_link_stats', 
      icon: <BarChartOutlined /> 
    },
    { 
      label: <NavLink to="/contact">Contact</NavLink>, 
      key: 'contact', 
      icon: <MailOutlined /> 
    },
    { 
      label: <NavLink to="/report">Report</NavLink>, 
      key: 'report', 
      icon: <WarningOutlined /> 
    },
  ];

  const handleMenuClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <Layout className="app-layout">
      {/* Header */}
      <Header className="app-header">
        <div className="header-content">
          {/* Logo */}
          <div className="logo-container" onClick={() => navigate('/')}>
            <div className="logo-icon">
              <img src="/logo.png" alt="Shorty URL" />
            </div>
            <span className="logo-text">Shorty URL</span>
          </div>

          {/* Desktop Navigation */}
          <Menu
            selectedKeys={[selectedKey]}
            mode="horizontal"
            items={menuItems}
            className="nav-menu"
            onClick={handleMenuClick}
          />

          {/* Header Actions */}
          <div className="header-actions">
            <Tooltip title={isDarkMode ? 'Light Mode' : 'Dark Mode'}>
              <Button
                type="text"
                icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
                className="theme-switch"
              />
            </Tooltip>
            
            <Tooltip title="GitHub">
              <Button
                type="text"
                icon={<GithubOutlined />}
                href="https://github.com/shehari007/url-shorty"
                target="_blank"
                rel="noopener noreferrer"
              />
            </Tooltip>

            {/* Mobile Menu Button */}
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              className="mobile-menu-btn"
            />
          </div>
        </div>
      </Header>

      {/* Mobile Menu Drawer */}
      <Drawer
        title={
          <div className="logo-container">
            <div className="logo-icon">
              <img src="/logo.png" alt="Shorty URL" />
            </div>
            <span className="logo-text">Shorty URL</span>
          </div>
        }
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
      >
        <Menu
          selectedKeys={[selectedKey]}
          mode="vertical"
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none' }}
        />
        <div style={{ padding: '16px', borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: '16px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              block
              icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
            >
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </Button>
            <Button
              block
              icon={<GithubOutlined />}
              href="https://github.com/shehari007/url-shorty"
              target="_blank"
            >
              View on GitHub
            </Button>
          </Space>
        </div>
      </Drawer>

      {/* Main Content */}
      <Content className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<Report />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/per-link-stats" element={<PerLinkStats />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
      </Content>

      {/* Footer */}
      <AntFooter className="app-footer">
        <div className="footer-content">
          <div className="footer-links">
            <NavLink to="/" className="footer-link">Home</NavLink>
            <NavLink to="/per-link-stats" className="footer-link">Analytics</NavLink>
            <NavLink to="/contact" className="footer-link">Contact</NavLink>
            <NavLink to="/report" className="footer-link">Report</NavLink>
            <NavLink to="/terms" className="footer-link">Terms</NavLink>
            <a 
              href="https://github.com/shehari007/url-shorty" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              GitHub
            </a>
          </div>
          <p className="footer-copyright">
            © {new Date().getFullYear()} Shorty URL. Made with <span className="footer-heart">♥</span> by shehari007
          </p>
        </div>
      </AntFooter>
    </Layout>
  );
}

export default App;
