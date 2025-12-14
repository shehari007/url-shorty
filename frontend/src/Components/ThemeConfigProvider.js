import React from 'react';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import { useTheme } from '../context';

const ThemeConfigProvider = ({ children }) => {
  const { isDarkMode } = useTheme();

  const lightTheme = {
    algorithm: theme.defaultAlgorithm,
    token: {
      colorPrimary: '#6366f1',
      colorInfo: '#6366f1',
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      borderRadius: 12,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      colorBgLayout: '#f8fafc',
      colorBgContainer: '#ffffff',
      colorBgBase: '#ffffff',
      colorText: '#1e293b',
      colorTextSecondary: '#64748b',
    },
    components: {
      Layout: {
        headerBg: 'rgba(255, 255, 255, 0.8)',
        headerPadding: '0 24px',
        bodyBg: '#f8fafc',
      },
      Card: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        borderRadiusLG: 16,
      },
      Button: {
        borderRadius: 10,
        controlHeight: 42,
        fontWeight: 500,
      },
      Input: {
        borderRadius: 10,
        controlHeight: 44,
      },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: 'rgba(99, 102, 241, 0.1)',
        itemSelectedColor: '#6366f1',
        itemHoverBg: 'rgba(99, 102, 241, 0.05)',
      },
      Modal: {
        contentBg: '#ffffff',
        headerBg: '#ffffff',
      },
      Drawer: {
        colorBgElevated: '#ffffff',
      },
    },
  };

  const darkTheme = {
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#818cf8',
      colorInfo: '#818cf8',
      colorSuccess: '#34d399',
      colorWarning: '#fbbf24',
      colorError: '#f87171',
      borderRadius: 12,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      colorBgLayout: '#030712',
      colorBgContainer: '#111827',
      colorBgBase: '#030712',
      colorBgElevated: '#1f2937',
      colorBorder: '#374151',
      colorBorderSecondary: '#1f2937',
      colorText: '#f9fafb',
      colorTextSecondary: '#9ca3af',
      colorTextTertiary: '#6b7280',
    },
    components: {
      Layout: {
        headerBg: 'rgba(17, 24, 39, 0.9)',
        headerPadding: '0 24px',
        bodyBg: '#030712',
        footerBg: '#030712',
      },
      Card: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        borderRadiusLG: 16,
        colorBgContainer: '#111827',
        colorBorderSecondary: '#1f2937',
      },
      Button: {
        borderRadius: 10,
        controlHeight: 42,
        fontWeight: 500,
        colorBgContainer: '#1f2937',
      },
      Input: {
        borderRadius: 10,
        controlHeight: 44,
        colorBgContainer: '#1f2937',
        colorBorder: '#374151',
        activeBorderColor: '#818cf8',
        hoverBorderColor: '#6366f1',
      },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: 'rgba(129, 140, 248, 0.15)',
        itemSelectedColor: '#818cf8',
        itemHoverBg: 'rgba(129, 140, 248, 0.1)',
        colorBgContainer: 'transparent',
        darkItemBg: 'transparent',
      },
      Modal: {
        contentBg: '#111827',
        headerBg: '#111827',
        titleColor: '#f9fafb',
      },
      Drawer: {
        colorBgElevated: '#111827',
      },
      Table: {
        colorBgContainer: '#111827',
        headerBg: '#1f2937',
        rowHoverBg: '#1f2937',
      },
      Skeleton: {
        gradientFromColor: '#1f2937',
        gradientToColor: '#374151',
      },
      Alert: {
        colorInfoBg: 'rgba(129, 140, 248, 0.1)',
        colorWarningBg: 'rgba(251, 191, 36, 0.1)',
        colorErrorBg: 'rgba(248, 113, 113, 0.1)',
        colorSuccessBg: 'rgba(52, 211, 153, 0.1)',
      },
      Statistic: {
        colorTextDescription: '#9ca3af',
      },
      Empty: {
        colorTextDescription: '#6b7280',
      },
    },
  };

  return (
    <ConfigProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <AntApp>
        {children}
      </AntApp>
    </ConfigProvider>
  );
};

export default ThemeConfigProvider;
