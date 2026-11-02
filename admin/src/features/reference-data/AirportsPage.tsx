import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

import { referenceDataService } from './referenceDataService';
import type { Airport } from './referenceData.types';
import type { AirportPayload } from './referenceDataService';

const { Title } = Typography;

export default function AirportsPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);
  const [form] = Form.useForm<AirportPayload>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'airports'],
    queryFn: referenceDataService.getAirports,
  });

  const refreshAirports = () =>
    queryClient.invalidateQueries({
      queryKey: ['admin', 'airports'],
    });

  const createMutation = useMutation({
    mutationFn: referenceDataService.createAirport,
    onSuccess: async () => {
      messageApi.success('Thêm sân bay thành công.');
      setModalOpen(false);
      form.resetFields();
      await refreshAirports();
    },
    onError: (error: any) => {
      messageApi.error(
        error?.response?.data?.message || 'Không thể thêm sân bay.'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<AirportPayload>;
    }) => referenceDataService.updateAirport(id, payload),
    onSuccess: async () => {
      messageApi.success('Cập nhật sân bay thành công.');
      setModalOpen(false);
      setEditingAirport(null);
      form.resetFields();
      await refreshAirports();
    },
    onError: (error: any) => {
      messageApi.error(
        error?.response?.data?.message || 'Không thể cập nhật sân bay.'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: referenceDataService.deleteAirport,
    onSuccess: async () => {
      messageApi.success('Xóa sân bay thành công.');
      await refreshAirports();
    },
    onError: (error: any) => {
      messageApi.error(
        error?.response?.data?.message || 'Không thể xóa sân bay.'
      );
    },
  });

  const openCreateModal = () => {
    setEditingAirport(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalOpen(true);
  };

  const openEditModal = (airport: Airport) => {
    setEditingAirport(airport);
    form.setFieldsValue({
      code: airport.code,
      city: airport.city,
      airport: airport.airport,
      country: airport.country || '',
      status: airport.status || 'active',
    });
    setModalOpen(true);
  };

  const handleSubmit = (values: AirportPayload) => {
    const payload: AirportPayload = {
      ...values,
      code: values.code.trim().toUpperCase(),
      city: values.city.trim(),
      airport: values.airport.trim(),
      country: values.country?.trim() || '',
    };

    if (editingAirport) {
      updateMutation.mutate({
        id: editingAirport._id,
        payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns: ColumnsType<Airport> = [
    {
      title: 'Mã sân bay',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Thành phố',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: 'Tên sân bay',
      dataIndex: 'airport',
      key: 'airport',
    },
    {
      title: 'Quốc gia',
      dataIndex: 'country',
      key: 'country',
      render: (value: string | undefined) => value || '—',
    },
    {
      title: 'Số chuyến bay',
      dataIndex: 'flightCount',
      key: 'flightCount',
      render: (value: number | undefined) => value ?? 0,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: Airport['status']) =>
        status === 'inactive' ? (
          <Tag color="red">Ngừng hoạt động</Tag>
        ) : (
          <Tag color="green">Đang hoạt động</Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Sửa
          </Button>

          <Popconfirm
            title="Xóa sân bay"
            description={`Bạn có chắc muốn xóa ${record.airport} (${record.code})?`}
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (isError) {
    return (
      <Alert
        type="error"
        message="Không thể tải danh sách sân bay."
      />
    );
  }

  return (
    <>
      {contextHolder}

      <Card>
        <Space
          style={{
            width: '100%',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            Sân bay
          </Title>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Thêm sân bay
          </Button>
        </Space>

        <Table<Airport>
          rowKey="_id"
          columns={columns}
          dataSource={data ?? []}
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingAirport ? 'Cập nhật sân bay' : 'Thêm sân bay'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingAirport(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Mã sân bay"
            name="code"
            rules={[
              { required: true, message: 'Vui lòng nhập mã sân bay.' },
              { len: 3, message: 'Mã sân bay phải có 3 ký tự.' },
            ]}
          >
            <Input
              placeholder="Ví dụ: SGN"
              maxLength={3}
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>

          <Form.Item
            label="Thành phố"
            name="city"
            rules={[
              { required: true, message: 'Vui lòng nhập thành phố.' },
            ]}
          >
            <Input placeholder="Ví dụ: Hồ Chí Minh" />
          </Form.Item>

          <Form.Item
            label="Tên sân bay"
            name="airport"
            rules={[
              { required: true, message: 'Vui lòng nhập tên sân bay.' },
            ]}
          >
            <Input placeholder="Ví dụ: Sân bay Tân Sơn Nhất" />
          </Form.Item>

          <Form.Item label="Quốc gia" name="country">
            <Input placeholder="Ví dụ: Việt Nam" />
          </Form.Item>

          <Form.Item label="Trạng thái" name="status">
            <Select
              options={[
                { label: 'Đang hoạt động', value: 'active' },
                { label: 'Ngừng hoạt động', value: 'inactive' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}