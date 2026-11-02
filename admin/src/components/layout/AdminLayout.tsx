import { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';

import Sidebar from './Sidebar';
import Header from './Header';

const { Content } = Layout;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout className="min-h-screen">
      <Sidebar collapsed={collapsed} />

      <Layout>
        <Header
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />

        <Content className="p-4 md:p-6">
          <div className="min-h-[calc(100vh-112px)]">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}