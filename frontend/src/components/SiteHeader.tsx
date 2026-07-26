'use client';

import {
  BarChartOutlined,
  GithubOutlined,
  HomeOutlined,
  MailOutlined,
  MenuOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Layout, Tooltip } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GITHUB_URL, SITE } from '@/lib/config';
import { useThemeMode } from '@/theme/ThemeProvider';
import { Logo } from './Logo';

const { Header } = Layout;

const NAV = [
  { href: '/', label: 'Home', icon: <HomeOutlined /> },
  { href: '/analytics', label: 'Analytics', icon: <BarChartOutlined /> },
  { href: '/report', label: 'Report abuse', icon: <SafetyCertificateOutlined /> },
  { href: '/contact', label: 'Contact', icon: <MailOutlined /> },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { mode, toggle } = useThemeMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The header only grows a border and shadow once the page has moved.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isCurrent = (href: string) => (pathname === href ? 'page' : undefined);

  return (
    <>
      <Header className="site-header" data-scrolled={scrolled}>
        <div className="container site-header__inner">
          <Link href="/" className="brand" aria-label={`${SITE.fullName} home`}>
            <Logo size={34} />
            <span className="brand__word">{SITE.fullName}</span>
          </Link>

          <nav className="nav" aria-label="Main">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="nav__link" aria-current={isCurrent(item.href)}>
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
              <Button
                type="text"
                shape="circle"
                aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggle}
              />
            </Tooltip>

            <Tooltip title="View source on GitHub">
              <Button
                className="only-desktop"
                type="text"
                shape="circle"
                aria-label="View source on GitHub"
                icon={<GithubOutlined />}
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
              />
            </Tooltip>

            <Button
              className="only-mobile"
              type="text"
              shape="circle"
              aria-label="Open navigation menu"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
            />
          </div>
        </div>
      </Header>

      <Drawer
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Logo size={28} />
            {SITE.fullName}
          </span>
        }
        placement="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size="default"
        styles={{ body: { padding: 16 } }}
      >
        <nav className="stack gap-4" aria-label="Mobile">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav__link"
              aria-current={isCurrent(item.href)}
              onClick={() => setDrawerOpen(false)}
              style={{ padding: '12px 14px', fontSize: 15.5 }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border-soft)' }}>
          <Button block icon={<GithubOutlined />} href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            View on GitHub
          </Button>
        </div>
      </Drawer>
    </>
  );
}
