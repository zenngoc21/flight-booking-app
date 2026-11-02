
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Popconfirm,
  message,
  DatePicker,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import {
  getFlights,
  createFlight,
  updateFlight,
  deleteFlight,
} from './flightsService';

import type {
  Flight,
  FlightPayload,
  FlightQuery,
} from './flights.types';

import FlightFormModal from './components/FlightFormModal';

const { Title, Text } = Typography;

const formatVND = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);

const statusConfig: Record<
  string,
  { color: string; label: string }
> = {
  scheduled: { color: 'processing', label: 'Đã lên lịch' },
  cancelled: { color: 'error', label: 'Đã hủy' },
  completed: { color: 'success', label: 'Đã hoàn thành' },
};

export default function FlightsPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>();
  const [date, setDate] = useState<string>();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);

  const queryParams: FlightQuery = {
    page,
    limit,
    search: search.trim() || undefined,
    status,
    date,
  };

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-flights', queryParams],
    queryFn: () => getFlights(queryParams),
    placeholderData: (previousData) => previousData,
  });

  const refreshFlights = () =>
    queryClient.invalidateQueries({
      queryKey: ['admin-flights'],
    });

  const createMutation = useMutation({
    mutationFn: createFlight,
    onSuccess: async () => {
      messageApi.success('Thêm chuyến bay thành công');
      setModalOpen(false);
      setEditingFlight(null);
      await refreshFlights();
    },
    onError: (error: any) => {
      messageApi.error(
        error.response?.data?.message || 'Không thể thêm chuyến bay'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<FlightPayload>;
    }) => updateFlight(id, payload),

    onSuccess: async () => {
      messageApi.success('Cập nhật chuyến bay thành công');
      setModalOpen(false);
      setEditingFlight(null);
      await refreshFlights();
    },

    onError: (error: any) => {
      messageApi.error(
        error.response?.data?.message || 'Không thể cập nhật chuyến bay'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFlight,

    onSuccess: async () => {
      messageApi.success('Xóa chuyến bay thành công');

      if (data?.data.length === 1 && page > 1) {
        setPage((current) => current - 1);
      }

      await refreshFlights();
    },

    onError: (error: any) => {
      messageApi.error(
        error.response?.data?.message ||
          'Không thể xóa chuyến bay'
      );
    },
  });

  const openCreateModal = () => {
    setEditingFlight(null);
    setModalOpen(true);
  };

  const openEditModal = (flight: Flight) => {
    setEditingFlight(flight);
    setModalOpen(true);
  };

  const handleSubmit = (payload: FlightPayload) => {
    if (editingFlight) {
      updateMutation.mutate({
        id: editingFlight._id,
        payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns: ColumnsType<Flight> = [
    {
      title: 'Mã chuyến bay',
      dataIndex: 'flightNumber',
      key: 'flightNumber',
      fixed: 'left',
      width: 130,
      render: (value: string) => (
        <Text strong>{value}</Text>
      ),
    },
    {
      title: 'Hãng hàng không',
      key: 'airline',
      width: 180,
      render: (_, record) => (
        <div>
          <div className="font-medium">
            {record.airline?.name || '—'}
          </div>
          <Text type="secondary" className="text-xs">
            {record.airline?.code || ''}
          </Text>
        </div>
      ),
    },
    {
      title: 'Hành trình',
      key: 'route',
      width: 180,
      render: (_, record) => (
        <div>
          <div className="font-medium">
            {record.origin?.code || '—'} → {record.destination?.code || '—'}
          </div>
          <Text type="secondary" className="text-xs">
            {record.origin?.city || ''} - {record.destination?.city || ''}
          </Text>
        </div>
      ),
    },
    {
      title: 'Khởi hành',
      dataIndex: 'departureAt',
      key: 'departureAt',
      width: 170,
      render: (value: string) =>
        value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Đến nơi',
      dataIndex: 'arrivalAt',
      key: 'arrivalAt',
      width: 170,
      render: (value: string) =>
        value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Giá vé',
      dataIndex: 'basePrice',
      key: 'basePrice',
      width: 150,
      render: (value: number) => formatVND(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (value: string) => {
        const config = statusConfig[value] || {
          color: 'default',
          label: value || 'Không rõ',
        };

        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 125,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            title="Chỉnh sửa"
            onClick={() => openEditModal(record)}
          />

          <Popconfirm
            title="Xóa chuyến bay?"
            description="Bạn có chắc chắn muốn xóa chuyến bay này?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteMutation.mutate(record._id)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="Xóa"
              loading={
                deleteMutation.isPending &&
                deleteMutation.variables === record._id
              }
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleTableChange = (
    pagination: TablePaginationConfig
  ) => {
    if (pagination.current) {
      setPage(pagination.current);
    }

    if (pagination.pageSize) {
      setLimit(pagination.pageSize);
      setPage(1);
    }
  };

  return (
    <div className="space-y-5">
      {contextHolder}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="!mb-1">
            Quản lý chuyến bay
          </Title>
          <Text type="secondary">
            Thêm, chỉnh sửa, tìm kiếm và quản lý lịch bay
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Thêm chuyến bay
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-5">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm mã chuyến bay, hãng, sân bay..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="w-full md:!w-72"
          />

          <Select
            allowClear
            placeholder="Lọc trạng thái"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            className="w-full md:!w-44"
            options={[
              { value: 'scheduled', label: 'Đã lên lịch' },
              { value: 'cancelled', label: 'Đã hủy' },
              { value: 'completed', label: 'Đã hoàn thành' },
            ]}
          />

          <DatePicker
            placeholder="Ngày khởi hành"
            format="DD/MM/YYYY"
            allowClear
            value={date ? dayjs(date) : null}
            onChange={(value) => {
              setDate(value ? value.format('YYYY-MM-DD') : undefined);
              setPage(1);
            }}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
          >
            Làm mới
          </Button>
        </div>

        <Table<Flight>
          rowKey="_id"
          columns={columns}
          dataSource={data?.data || []}
          loading={isLoading || isFetching}
          scroll={{ x: 1200 }}
          pagination={{
            current: data?.pagination.page || page,
            pageSize: data?.pagination.limit || limit,
            total: data?.pagination.total || 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `Tổng ${total} chuyến bay`,
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: 'Không tìm thấy chuyến bay',
          }}
        />
      </Card>

      <FlightFormModal
        open={modalOpen}
        editingFlight={editingFlight}
        loading={createMutation.isPending || updateMutation.isPending}
        onCancel={() => {
          setModalOpen(false);
          setEditingFlight(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
