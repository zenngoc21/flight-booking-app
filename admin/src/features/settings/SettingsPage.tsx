import { useEffect } from 'react';
import { AxiosError } from 'axios';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Switch,
  message,
  Spin,
  Divider,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsService } from './settingsService';
import type { AdminSettings, UpdateSettingsPayload } from './settings.types';

const { TextArea } = Input;

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === 'string') {
      return responseMessage;
    }

    return error.message;
  }

  return error instanceof Error ? error.message : 'Lỗi không xác định.';
}

export default function SettingsPage() {
  const [form] = Form.useForm<AdminSettings>();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: settingsService.getSettings,
  });

  useEffect(() => {
    if (data) {
      form.setFieldsValue(data);
    }
  }, [data, form]);

  const updateMutation = useMutation({
    mutationFn: settingsService.updateSettings,
    onSuccess: (updatedSettings) => {
      message.success('Đã lưu cài đặt');
      form.setFieldsValue(updatedSettings);
      queryClient.invalidateQueries({
        queryKey: ['admin', 'settings'],
      });
    },
    onError: () => {
      message.error('Lưu cài đặt thất bại');
    },
  });

  const handleSubmit = (values: AdminSettings) => {
    const payload: UpdateSettingsPayload = {
      ...values,
      siteName: values.siteName.trim(),
      supportEmail: values.supportEmail?.trim() || '',
      supportPhone: values.supportPhone?.trim() || '',
      cancellationPolicy: values.cancellationPolicy?.trim() || '',
    };
    updateMutation.mutate(payload);
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4 }}>Cài đặt hệ thống</h1>
        <p style={{ color: '#888', margin: 0 }}>
          Quản lý thông tin và cấu hình chung của hệ thống đặt vé.
        </p>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Không thể tải cài đặt hệ thống"
          description={getErrorMessage(error)}
          style={{ marginBottom: 16 }}
        />
      )}

      {isLoading ? (
        <Card>
          <Spin tip="Đang tải cài đặt..." />
        </Card>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={isError}
          initialValues={{
            siteName: 'Flight Booking',
            supportEmail: '',
            supportPhone: '',
            currency: 'VND',
            timezone: 'Asia/Ho_Chi_Minh',
            bookingEnabled: true,
            maintenanceMode: false,
            cancellationPolicy: '',
          }}
        >
          <Card title="Thông tin hệ thống" style={{ marginBottom: 20 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Tên hệ thống"
                  name="siteName"
                  rules={[
                    { required: true, message: 'Vui lòng nhập tên hệ thống' },
                  ]}
                >
                  <Input placeholder="Flight Booking" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Email hỗ trợ"
                  name="supportEmail"
                  rules={[
                    {
                      type: 'email',
                      message: 'Email hỗ trợ không hợp lệ',
                    },
                  ]}
                >
                  <Input type="email" placeholder="support@example.com" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Số điện thoại hỗ trợ" name="supportPhone">
                  <Input placeholder="0123456789" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Đơn vị tiền tệ" name="currency">
                  <Select
                    options={[
                      { value: 'VND', label: 'VND — Việt Nam Đồng' },
                      { value: 'USD', label: 'USD — US Dollar' },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item label="Múi giờ" name="timezone">
                  <Select
                    options={[
                      {
                        value: 'Asia/Ho_Chi_Minh',
                        label: 'Asia/Ho_Chi_Minh (GMT+7)',
                      },
                      {
                        value: 'UTC',
                        label: 'UTC',
                      },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="Cấu hình đặt vé" style={{ marginBottom: 20 }}>
            <Form.Item
              label="Cho phép đặt vé"
              name="bookingEnabled"
              valuePropName="checked"
              extra="Tắt tùy chọn này để ngừng nhận đặt vé mới."
            >
              <Switch />
            </Form.Item>

            <Divider />

            <Form.Item
              label="Chế độ bảo trì"
              name="maintenanceMode"
              valuePropName="checked"
              extra="Bật chế độ này khi cần bảo trì hệ thống."
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="Chính sách hủy vé"
              name="cancellationPolicy"
            >
              <TextArea
                rows={4}
                placeholder="Nhập chính sách hủy và hoàn vé..."
              />
            </Form.Item>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateMutation.isPending}
              disabled={isError}
            >
              Lưu cài đặt
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
}