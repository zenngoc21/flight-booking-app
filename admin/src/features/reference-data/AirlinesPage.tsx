import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
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
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

import { referenceDataService } from './referenceDataService';
import type { Airline } from './referenceData.types';
import type { AirlinePayload } from './referenceDataService';

const { Title } = Typography;

export default function AirlinesPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAirline, setEditingAirline] = useState<Airline | null>(null);
  const [form] = Form.useForm<AirlinePayload>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'airlines'],
    queryFn: referenceDataService.getAirlines,
  });

  const refreshAirlines = () =>
    queryClient.invalidateQueries({
      queryKey: ['admin', 'airlines'],
    });

  const createMutation = useMutation({
    mutationFn: referenceDataService.createAirline,
    onSuccess: async () => {
      messageApi.success('Thêm hãng hàng không thành công.');
      setModalOpen(false);
      form.resetFields();
      await refreshAirlines();
    },
    onError: (error: any) => {
      messageApi.error(
        error?.response?.data?.message || 'Không thể thêm hãng hàng không.'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<AirlinePayload>;
    }) => referenceDataService.updateAirline(id, payload),
    onSuccess: async () => {
      messageApi.success('Cập nhật hãng hàng không thành công.');
      setModalOpen(false);
      setEditingAirline(null);
      form.resetFields();
      await refreshAirlines();
    },
    onError: (error: any) => {
      messageApi.error(
        error?.response?.data?.message || 'Không thể cập nhật hãng hàng không.'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: referenceDataService.deleteAirline,
    onSuccess: async () => {
      messageApi.success('Xóa hãng hàng không thành công.');
      await refreshAirlines();
    },
    onError: (error: any) => {
      messageApi.error(
        error?.response?.data?.message ||
          'Không thể xóa hãng hàng không.'
      );
    },
  });

  const openCreateModal = () => {
    setEditingAirline(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalOpen(true);
  };

  const openEditModal = (airline: Airline) => {
    setEditingAirline(airline);
    form.setFieldsValue({
      name: airline.name,
      code: airline.code,
      logoUrl: airline.logoUrl || '',
      status: airline.status || 'active',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: AirlinePayload) => {
    const payload: AirlinePayload = {
      ...values,
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      logoUrl: values.logoUrl?.trim() || '',
    };

    if (editingAirline) {
      updateMutation.mutate({
        id: editingAirline._id,
        payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns: ColumnsType<Airline> = [
    {
      title: 'Logo',
      dataIndex: 'logoUrl',
      key: 'logoUrl',
      render: (logoUrl: string | undefined, record) =>
        logoUrl ? (
          <Avatar src={logoUrl} />
        ) : (
          <Avatar>{record.code?.slice(0, 2)}</Avatar>
        ),
    },
    {
      title: 'Mã hãng',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Tên hãng hàng không',
      dataIndex: 'name',
      key: 'name',
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
      render: (status: Airline['status']) =>
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
            title="Xóa hãng hàng không"
            description={`Bạn có chắc muốn xóa hãng ${record.name} (${record.code})?`}
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
        message="Không thể tải danh sách hãng hàng không."
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
            Hãng hàng không
          </Title>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Thêm hãng
          </Button>
        </Space>

        <Table<Airline>
          rowKey="_id"
          columns={columns}
          dataSource={data ?? []}
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={editingAirline ? 'Cập nhật hãng hàng không' : 'Thêm hãng hàng không'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingAirline(null);
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
            label="Mã hãng"
            name="code"
            rules={[
              { required: true, message: 'Vui lòng nhập mã hãng.' },
              { max: 10, message: 'Mã hãng tối đa 10 ký tự.' },
            ]}
          >
            <Input
              placeholder="Ví dụ: VN"
              maxLength={10}
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>

          <Form.Item
            label="Tên hãng hàng không"
            name="name"
            rules={[
              { required: true, message: 'Vui lòng nhập tên hãng.' },
            ]}
          >
            <Input placeholder="Ví dụ: Vietnam Airlines" />
          </Form.Item>

          <Form.Item label="URL logo" name="logoUrl">
            <Input placeholder="https://example.com/logo.png" />
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