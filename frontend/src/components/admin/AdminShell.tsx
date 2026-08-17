'use client';

import {
  AuditOutlined,
  BellOutlined,
  DashboardOutlined,
  GlobalOutlined,
  LinkOutlined,
  LogoutOutlined,
  MailOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  StopOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { App, Avatar, Badge, Button, Drawer, Dropdown, Layout, Menu, Tag, Tooltip } from 'antd';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import { AdminApiError, adminApi, signOut } from '@/lib/adminClient';
import { APP_VERSION, SITE } from '@/lib/config';
import type { AdminDashboard, AdminProfile } from '@/lib/types';
import { useThemeMode } from '@/theme/ThemeProvider';

const { Header, Sider, Content } = Layout;

const ROLE_RANK = { moderator: 1, admin: 2, owner: 3 } as const;
const ROLE_COLOR: Record<string, string> = { owner: 'gold', admin: 'blue', moderator: 'default' };

/** Grouped navigation. `minRole` hides what the operator is not allowed to use. */
const GROUPS: {
  label: string;
  items: { key: string; icon: ReactNode; label: string; minRole?: 'owner' | 'admin'; badge?: 'reports' | 'contacts' }[];
}[] = [
  {
    label: 'Overview',
    items: [{ key: '/admin', icon: <DashboardOutlined />, label: 'Dashboard' }],
  },
  {
    label: 'Manage',
    items: [
      { key: '/admin/links', icon: <LinkOutlined />, label: 'Links' },
      { key: '/admin/reports', icon: <WarningOutlined />, label: 'Reports', badge: 'reports' },
      { key: '/admin/contacts', icon: <MailOutlined />, label: 'Messages', badge: 'contacts' },
    ],
  },
  {
    label: 'Safety',
    items: [
      { key: '/admin/domains', icon: <StopOutlined />, label: 'Blocked domains' },
      { key: '/admin/audit', icon: <AuditOutlined />, label: 'Audit log' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { key: '/admin/accounts', icon: <TeamOutlined />, label: 'Admins', minRole: 'owner' },
      { key: '/admin/account', icon: <UserOutlined />, label: 'My account' },
    ],
  },
];

const COLLAPSE_KEY = 'shorty:admin:collapsed';

/**
 * Console chrome: collapsible sidebar, sticky header, mobile drawer.
 *
 * The desktop/mobile split is done in CSS rather than with a JS breakpoint
 * hook. antd's `useBreakpoint` reports nothing during SSR, which made the
 * server emit the mobile layout and then jump to the sidebar on hydration.
 */
export function AdminShell({ admin, children }: { admin: AdminProfile; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, toggle } = useThemeMode();
  const { modal, message } = App.useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, setPending] = useState({ reports: 0, contacts: 0 });
  const [apiUp, setApiUp] = useState(true);

  // Restore the collapsed preference after mount, so SSR and first paint agree.
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1');
  }, []);

  const setCollapsedPersisted = useCallback((next: boolean) => {
    setCollapsed(next);
    window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
  }, []);

  // Sidebar badges, plus a cheap API reachability signal for the footer.
  useEffect(() => {
    let cancelled = false;
    adminApi
      .get<AdminDashboard>('dashboard')
      .then(({ data }) => {
        if (cancelled) return;
        setPending({ reports: data.overview.reports.pending, contacts: data.overview.contacts.pending });
        setApiUp(true);
      })
      .catch((error: unknown) => {
        // Only a transport failure means the API is unreachable; a 401 does not.
        if (!cancelled && error instanceof AdminApiError && error.code === 'API_UNREACHABLE') setApiUp(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  /** Longest matching prefix, so /admin/links/12 still highlights "Links". */
  const selected = useMemo(() => {
    const match = GROUPS.flatMap((group) => group.items)
      .filter((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))
      .sort((a, b) => b.key.length - a.key.length)[0];
    return match ? [match.key] : ['/admin'];
  }, [pathname]);

  /** `showGroups` is false in the collapsed rail, where headings are just noise. */
  const buildItems = useCallback(
    (showGroups: boolean) =>
      GROUPS.flatMap((group) => {
        const visible = group.items.filter(
          (item) => !item.minRole || ROLE_RANK[admin.role] >= ROLE_RANK[item.minRole],
        );
        if (visible.length === 0) return [];

        return [
          ...(showGroups
            ? [{ type: 'group' as const, key: `g-${group.label}`, label: group.label }]
            : [{ type: 'divider' as const, key: `d-${group.label}` }]),
          ...visible.map((item) => {
            const count = item.badge ? pending[item.badge] : 0;
            return {
              key: item.key,
              icon: item.icon,
              label: (
                <Link href={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {count > 0 && <Badge count={count} size="small" />}
                </Link>
              ),
            };
          }),
        ];
      }),
    [admin.role, pending],
  );

  const handleSignOut = () => {
    modal.confirm({
      title: 'Sign out?',
      content: 'You will need to sign in again to get back into the console.',
      okText: 'Sign out',
      okButtonProps: { danger: true },
      onOk: async () => {
        await signOut();
        message.success('Signed out');
        router.replace('/admin/login');
        router.refresh();
      },
    });
  };

  const totalPending = pending.reports + pending.contacts;

  return (
    <Layout className="admin-shell">
      <Sider
        className="admin-sider"
        theme={mode === 'dark' ? 'dark' : 'light'}
        collapsed={collapsed}
        collapsible
        trigger={null}
        width={244}
        collapsedWidth={72}
      >
        <div className="admin-sider__brand">
          <Logo size={30} />
          {!collapsed && <span>{SITE.fullName}</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={selected}
          items={buildItems(!collapsed)}
          inlineCollapsed={collapsed}
          style={{ borderInlineEnd: 'none', paddingInline: 4 }}
        />
        <Tooltip title={apiUp ? 'API reachable' : 'API unreachable'} placement="right">
          <div className="admin-sider__foot">
            <span className={apiUp ? 'status-dot' : 'status-dot status-dot--down'} aria-hidden="true" />
            {!collapsed && <span>{apiUp ? 'API connected' : 'API unreachable'} · v{APP_VERSION}</span>}
          </div>
        </Tooltip>
      </Sider>

      <Layout className="admin-main" style={{ background: 'transparent' }}>
        <Header className="admin-header">
          <Button
            className="admin-only-mobile"
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
          />

          <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <Button
              className="admin-only-desktop"
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsedPersisted(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            />
          </Tooltip>

          <div style={{ flex: 1, minWidth: 0 }} />

          <Tooltip title={totalPending > 0 ? `${totalPending} items need attention` : 'Nothing pending'}>
            <Badge count={totalPending} size="small" offset={[-2, 4]}>
              <Button
                type="text"
                icon={<BellOutlined />}
                onClick={() => router.push(pending.reports > 0 ? '/admin/reports' : '/admin/contacts')}
                aria-label="Pending items"
              />
            </Badge>
          </Tooltip>

          <Tooltip title="Open the public site">
            <Button
              type="text"
              icon={<GlobalOutlined />}
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open the public site"
            />
          </Tooltip>

          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <Button
              type="text"
              icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggle}
              aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            />
          </Tooltip>

          <Dropdown
            menu={{
              items: [
                {
                  key: 'identity',
                  label: (
                    <div style={{ padding: '4px 0', minWidth: 196 }}>
                      <div style={{ fontWeight: 650 }}>{admin.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{admin.email}</div>
                      <Tag color={ROLE_COLOR[admin.role] ?? 'default'} style={{ marginTop: 8 }}>
                        {admin.role}
                      </Tag>
                    </div>
                  ),
                  disabled: true,
                },
                { type: 'divider' },
                { key: 'account', icon: <UserOutlined />, label: <Link href="/admin/account">My account</Link> },
                { key: 'signout', icon: <LogoutOutlined />, label: 'Sign out', danger: true, onClick: handleSignOut },
              ],
            }}
            trigger={['click']}
          >
            <Button type="text" style={{ height: 42, paddingInline: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size={30} style={{ background: 'var(--brand-gradient)', fontSize: 13, fontWeight: 600 }}>
                {admin.name.charAt(0).toUpperCase()}
              </Avatar>
              <span className="admin-only-desktop" style={{ fontSize: 14, fontWeight: 550, color: 'var(--text-primary)' }}>
                {admin.name}
              </span>
            </Button>
          </Dropdown>
        </Header>

        <Content className="admin-content">{children}</Content>
      </Layout>

      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size="default"
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Logo size={28} />
            {SITE.fullName}
          </span>
        }
        styles={{ body: { padding: '8px 0' } }}
      >
        <div onClick={() => setDrawerOpen(false)}>
          <Menu
            mode="inline"
            selectedKeys={selected}
            items={buildItems(true)}
            style={{ borderInlineEnd: 'none', paddingInline: 4 }}
          />
        </div>
      </Drawer>
    </Layout>
  );
}
