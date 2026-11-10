import {
  DashboardOutlined,
  UserOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  SettingOutlined,
  BankOutlined,
  LogoutOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';

import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearAuth } from '../../lib/auth';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const items: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Tổng quan',
    },
    {
      key: '/flights',
      icon: <CalendarOutlined />,
      label: 'Quản lý chuyến bay',
    },
    {
      key: '/bookings',
      icon: <ShoppingOutlined />,
      label: 'Quản lý đặt vé',
    },
    {
      key: '/aircraft',
      icon: <BankOutlined />,
      label: 'Máy bay & sơ đồ ghế',
    },
    {
      key: '/customers',
      icon: <UserOutlined />,
      label: 'Khách hàng',
    },
    {
      key: '/reference-data',
      icon: <DatabaseOutlined />,
      label: 'Dữ liệu tham chiếu',
      children: [
        {
          key: '/airlines',
          icon: <GlobalOutlined />,
          label: 'Hãng bay',
        },
        {
          key: '/airports',
          icon: <EnvironmentOutlined />,
          label: 'Sân bay',
        },
      ],
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
    },
  ];

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={250}
      theme="dark"
      className="admin-sidebar !min-h-screen"
    >
      <div className="admin-brand flex items-center justify-center">
        <span className="text-white font-bold text-lg">
          {collapsed ? 'SH' : '✈ SKYHAVEN ADMIN'}
        </span>
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={
          ['/airlines', '/airports'].includes(location.pathname)
            ? ['/reference-data']
            : []
        }
        items={items}
        onClick={handleClick}
        className="!mt-4 !border-none"
      />

      <div className="absolute bottom-4 left-0 right-0 px-3">
        <Menu
          theme="dark"
          mode="inline"
          selectable={false}
          items={[
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              label: 'Đăng xuất',
            },
          ]}
          onClick={handleLogout}
        />
      </div>
    </Sider>
  );
}