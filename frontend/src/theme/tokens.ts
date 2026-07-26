import { theme, type ThemeConfig } from 'antd';

/**
 * Design tokens.
 *
 * The brand runs blue to cyan to emerald, a "connected web" palette rather than
 * a single flat hue. Accent colours below are used one-per-card so feature and
 * stat tiles read as a colourful set instead of a wall of one colour.
 */

export const brand = {
  primary: '#2563eb',
  primaryDark: '#60a5fa',
  gradient: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 52%, #10b981 100%)',
  gradientDark: 'linear-gradient(135deg, #60a5fa 0%, #22d3ee 52%, #34d399 100%)',
  success: '#10b981',
  successDark: '#34d399',
  warning: '#f59e0b',
  warningDark: '#fbbf24',
  error: '#ef4444',
  errorDark: '#f87171',
} as const;

/** Per-tile accents. Ordered so adjacent cards never share a hue. */
export const accents = ['blue', 'cyan', 'emerald', 'amber', 'rose', 'violet'] as const;
export type Accent = (typeof accents)[number];

/** Chart series colours, distinguishable in both themes. */
export const chartColors = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6'];

const shared: ThemeConfig['token'] = {
  fontFamily:
    "var(--font-sans), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  fontFamilyCode: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  borderRadius: 12,
  borderRadiusLG: 16,
  borderRadiusSM: 8,
  wireframe: false,
  fontSize: 15,
  sizeStep: 4,
  controlHeight: 40,
  motionDurationMid: '0.18s',
  motionEaseInOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

export const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    ...shared,
    colorPrimary: brand.primary,
    colorInfo: brand.primary,
    colorSuccess: brand.success,
    colorWarning: brand.warning,
    colorError: brand.error,
    colorLink: brand.primary,
    colorBgLayout: '#f5f7fb',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBorder: '#e3e8f0',
    colorBorderSecondary: '#eef2f8',
    colorText: '#0f172a',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#64748b',
    colorTextQuaternary: '#94a3b8',
    boxShadowTertiary: '0 1px 2px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.05)',
  },
  components: {
    Layout: { headerBg: 'transparent', bodyBg: '#f5f7fb', footerBg: 'transparent', headerHeight: 68, siderBg: '#ffffff' },
    Card: { borderRadiusLG: 18, paddingLG: 24 },
    Button: { fontWeight: 600, primaryShadow: '0 8px 20px rgba(37,99,235,.24)' },
    Input: { paddingBlock: 9 },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      horizontalItemSelectedColor: brand.primary,
      activeBarBorderWidth: 0,
      itemSelectedBg: 'rgba(37,99,235,.09)',
      itemHoverBg: 'rgba(37,99,235,.05)',
      itemBorderRadius: 10,
      itemMarginInline: 8,
    },
    Table: { headerBg: '#f8fafc', headerSplitColor: 'transparent', rowHoverBg: '#f8fafc', borderColor: '#eef2f8' },
    Statistic: { contentFontSize: 30 },
    Tag: { defaultBg: '#f1f5f9', borderRadiusSM: 7 },
    Segmented: { itemSelectedBg: '#ffffff' },
    Tooltip: { colorBgSpotlight: '#0f172a' },
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    ...shared,
    colorPrimary: brand.primaryDark,
    colorInfo: brand.primaryDark,
    colorSuccess: brand.successDark,
    colorWarning: brand.warningDark,
    colorError: brand.errorDark,
    colorLink: brand.primaryDark,
    colorBgLayout: '#080d1a',
    colorBgContainer: '#101827',
    colorBgElevated: '#18202f',
    colorBorder: '#273246',
    colorBorderSecondary: '#1c2536',
    colorText: '#eef4ff',
    colorTextSecondary: '#a3b1cc',
    colorTextTertiary: '#8492b0',
    colorTextQuaternary: '#64728f',
    boxShadowTertiary: '0 1px 2px rgba(0,0,0,.3), 0 6px 18px rgba(0,0,0,.35)',
  },
  components: {
    Layout: { headerBg: 'transparent', bodyBg: '#080d1a', footerBg: 'transparent', headerHeight: 68, siderBg: '#101827' },
    Card: { borderRadiusLG: 18, paddingLG: 24, colorBgContainer: '#101827' },
    Button: { fontWeight: 600, primaryShadow: '0 8px 20px rgba(96,165,250,.2)' },
    Input: { paddingBlock: 9, colorBgContainer: '#18202f' },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      horizontalItemSelectedColor: brand.primaryDark,
      activeBarBorderWidth: 0,
      itemSelectedBg: 'rgba(96,165,250,.14)',
      itemHoverBg: 'rgba(96,165,250,.08)',
      itemBorderRadius: 10,
      itemMarginInline: 8,
    },
    Table: { headerBg: '#18202f', headerSplitColor: 'transparent', rowHoverBg: '#18202f', borderColor: '#1c2536' },
    Statistic: { contentFontSize: 30 },
    Tag: { defaultBg: '#1c2536', borderRadiusSM: 7 },
    Segmented: { itemSelectedBg: '#18202f' },
  },
};
