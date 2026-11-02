import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';

import {
  getCustomers,
  getCustomerById,
  getCustomerBookings,
} from './customersService';

import type {
  Customer,
  CustomerBooking,
} from './customers.types';

const { Title, Text } = Typography;

function formatDate(value?: string) {
  if (!value) return '—';

  return new Date(value).toLocaleString('vi-VN');
}

function formatMoney(value?: number, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function bookingStatusTag(status: string) {
  const config: Record<string, { color: string; label: string }> = {
    pending: { color: 'gold', label: 'Chờ xác nhận' },
    confirmed: { color: 'green', label: 'Đã xác nhận' },
    cancelled: { color: 'red', label: 'Đã hủy' },
    expired: { color: 'default', label: 'Hết hạn' },
  };

  const item = config[status] ?? {
    color: 'default',
    label: status,
  };

  return <Tag color={item.color}>{item.label}</Tag>;
}

function paymentStatusTag(status: string) {
  const config: Record<string, { color: string; label: string }> = {
    pending: { color: 'gold', label: 'Chờ thanh toán' },
    paid: { color: 'green', label: 'Đã thanh toán' },
    failed: { color: 'red', label: 'Thất bại' },
    refunded: { color: 'purple', label: 'Đã hoàn tiền' },
  };

  const item = config[status] ?? {
    color: 'default',
    label: status,
  };

  return <Tag color={item.color}>{item.label}</Tag>;
}

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search],
    queryFn: () =>
      getCustomers({
        page,
        limit: 10,
        search: search || undefined,
      }),
  });

  const { data: customerDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-customer-detail', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      const response = await getCustomerById(selectedCustomerId);
      return response.data;
    },
    enabled: !!selectedCustomerId,
  });

  const { data: bookingHistory, isLoading: bookingsLoading } = useQuery({
    queryKey: ['admin-customer-bookings', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      return getCustomerBookings(selectedCustomerId, 1, 10);
    },
    enabled: !!selectedCustomerId,
  });

  const columns: ColumnsType<Customer> = [
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, customer) => (
        <div>
          <div className="font-medium">{customer.fullName}</div>
          <Text type="secondary">{customer.email}</Text>
        </div>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone?: string) => phone || '—',
    },
    {
      title: 'Số booking',
      dataIndex: 'bookingCount',
      key: 'bookingCount',
      align: 'center',
    },
    {
      title: 'Ngày tham gia',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: formatDate,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      render: (_, customer) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => setSelectedCustomerId(customer._id)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  const bookingColumns: ColumnsType<CustomerBooking> = [
    {
      title: 'Mã booking',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
    },
    {
      title: 'Chuyến bay',
      key: 'flight',
      render: (_, booking) =>
        booking.flight
          ? `${booking.flight.flightNumber} · ${
              booking.flight.origin?.code ?? '—'
            } → ${booking.flight.destination?.code ?? '—'}`
          : '—',
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: formatDate,
    },
    {
      title: 'Tổng tiền',
      key: 'total',
      render: (_, booking) =>
        formatMoney(
          booking.pricing?.total,
          booking.pricing?.currency || 'VND'
        ),
    },
    {
      title: 'Booking',
      dataIndex: 'bookingStatus',
      key: 'bookingStatus',
      render: bookingStatusTag,
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: paymentStatusTag,
    },
  ];

  const customers = data?.data ?? [];
  const bookings = bookingHistory?.data ?? [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>Quản lý khách hàng</Title>
        <Text type="secondary">
          Xem danh sách khách hàng và lịch sử đặt vé.
        </Text>
      </div>

      <Card className="mb-5">
        <Space.Compact className="w-full" style={{ maxWidth: 520 }}>
          <Input
            value={searchInput}
            placeholder="Tìm theo tên, email hoặc số điện thoại"
            prefix={<SearchOutlined />}
            onChange={(event) => setSearchInput(event.target.value)}
            onPressEnter={() => {
              setPage(1);
              setSearch(searchInput.trim());
            }}
          />
          <Button
            type="primary"
            onClick={() => {
              setPage(1);
              setSearch(searchInput.trim());
            }}
          >
            Tìm kiếm
          </Button>
        </Space.Compact>
      </Card>

      <Card>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={customers}
          loading={isLoading}
          pagination={{
            current: data?.pagination.page ?? page,
            pageSize: data?.pagination.limit ?? 10,
            total: data?.pagination.total ?? 0,
            showSizeChanger: false,
            onChange: (nextPage) => setPage(nextPage),
          }}
          locale={{ emptyText: 'Chưa có khách hàng' }}
        />
      </Card>

      <Modal
        title="Thông tin khách hàng"
        open={!!selectedCustomerId}
        onCancel={() => setSelectedCustomerId(null)}
        footer={[
          <Button
            key="close"
            onClick={() => setSelectedCustomerId(null)}
          >
            Đóng
          </Button>,
        ]}
        width={1000}
        destroyOnHidden
      >
        {detailLoading ? (
          <div className="py-8 text-center">Đang tải thông tin...</div>
        ) : customerDetail ? (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Họ và tên">
                {customerDetail.fullName}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {customerDetail.email}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {customerDetail.phone || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tham gia">
                {formatDate(customerDetail.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng booking">
                {customerDetail.bookingCount}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} className="mt-6">
              Lịch sử đặt vé
            </Title>

            <Table
              rowKey="_id"
              columns={bookingColumns}
              dataSource={bookings}
              loading={bookingsLoading}
              pagination={false}
              scroll={{ x: 850 }}
              locale={{ emptyText: 'Khách hàng chưa có booking' }}
            />
          </>
        ) : (
          <div>Không tìm thấy thông tin khách hàng.</div>
        )}
      </Modal>
    </div>
  );
}