import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Form,
  Input,
  Typography,
  message,
} from 'antd';
import {
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

import { loginAdmin } from '../../services/authService';
import { saveAuth } from '../../lib/auth';

const { Title, Text } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<LoginForm>();
  const [messageApi, contextHolder] = message.useMessage();

  const loginMutation = useMutation({
    mutationFn: loginAdmin,

    onSuccess: (data) => {
      saveAuth(data.token, data.user);

      messageApi.success('Đăng nhập thành công');

      navigate('/dashboard', { replace: true });
    },

    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message ||
        'Không thể kết nối đến máy chủ';

      messageApi.error(errorMessage);
    },
  });

  const handleSubmit = (values: LoginForm) => {
    loginMutation.mutate(values);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      {contextHolder}

      <Card
        className="w-full max-w-md shadow-xl"
        styles={{ body: { padding: 32 } }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white text-3xl mb-4">
            <SafetyCertificateOutlined />
          </div>

          <Title level={2} className="!mb-2">
            SkyHaven Admin
          </Title>

          <Text type="secondary">
            Đăng nhập vào hệ thống quản trị
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="admin@example.com"
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
            />
          </Form.Item>

          <Form.Item className="!mb-0">
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loginMutation.isPending}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-6">
          <Text type="secondary" className="text-xs">
            SkyHaven Flight Booking · Admin Portal
          </Text>
        </div>
      </Card>
    </div>
  );
}