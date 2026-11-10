import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={viVN}
        theme={{
          token: {
            colorPrimary: '#2878b9',
            colorInfo: '#2878b9',
            colorLink: '#2878b9',
            colorText: '#17364f',
            colorTextSecondary: '#71879a',
            colorBorder: '#e2eaf1',
            colorBgLayout: '#f3f7fb',
            borderRadius: 12,
            borderRadiusLG: 16,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
            controlHeight: 40,
          },
          components: {
            Layout: {
              bodyBg: 'transparent',
              headerBg: '#ffffff',
              siderBg: '#123b5d',
            },
            Menu: {
              darkItemBg: 'transparent',
              darkSubMenuItemBg: 'rgba(0, 0, 0, 0.12)',
              darkItemSelectedBg: 'rgba(96, 165, 220, 0.28)',
              darkItemHoverBg: 'rgba(255, 255, 255, 0.1)',
            },
            Table: {
              headerBg: '#f6f9fc',
              headerColor: '#526c80',
              borderColor: '#e8eef3',
            },
          },
        }}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
);