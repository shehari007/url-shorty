import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme } from 'antd';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorInfo: '#1677ff',
          borderRadius: 8,
          fontFamily: '-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          colorBgLayout: '#f5f7fb',
        },
        components: {
          Layout: {
            headerBg: '#ffffff',
            headerPadding: '0 24px',
            bodyBg: '#f5f7fb',
          },
          Card: {
            boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
            borderRadiusLG: 12,
          },
          Button: {
            borderRadius: 8,
          },
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </BrowserRouter>
);

reportWebVitals();
