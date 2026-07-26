'use client';

/**
 * Client boundary for Ant Design icons.
 *
 * `@ant-design/icons` calls `React.createContext` internally, which does not
 * exist in the React Server Components runtime, importing it directly from a
 * Server Component throws at build time. Re-exporting through a `'use client'`
 * module turns each icon into a client reference the server can render around.
 */
export {
  BarChartOutlined,
  BugOutlined,
  CloudOutlined,
  CustomerServiceOutlined,
  FileTextOutlined,
  GlobalOutlined,
  LinkOutlined,
  LockOutlined,
  QrcodeOutlined,
  RobotOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
