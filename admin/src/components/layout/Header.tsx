import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  BellOutlined,
} from '@ant-design/icons';

import { Avatar, Button, Dropdown, Layout, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';

import { clearAuth, getAdminUser } from '../../lib/auth';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Header({
  collapsed,
  onToggle,
}: HeaderProps) {
  const navigate = useNavigate();
  const admin = getAdminUser();

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'Tài khoản Admin',
      icon: <UserOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  return (
    <AntHeader className="admin-topbar !px-5 flex items-center justify-between">
      <Space>
        <Button
          type="text"
          icon={
            collapsed
              ? <MenuUnfoldOutlined />
              : <MenuFoldOutlined />
          }
          onClick={onToggle}
        />

        <Text strong className="hidden sm:inline">
          Hệ thống quản trị chuyến bay
        </Text>
      </Space>

      <Space size="large">
        <Button type="text" icon={<BellOutlined />} />

        <Dropdown
          menu={{
            items: menuItems,
            onClick: handleMenuClick,
          }}
          placement="bottomRight"
        >
          <Space className="cursor-pointer">
            <Avatar icon={<UserOutlined />} />

            <div className="hidden sm:block">
              <div className="font-medium text-sm">
                {admin?.fullName || 'Administrator'}
              </div>

              <Text type="secondary" className="text-xs">
                {admin?.role || 'admin'}
              </Text>
            </div>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
}