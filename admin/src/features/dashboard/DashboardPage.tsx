
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Card,
  Col,
  Row,
  Skeleton,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import {
  DollarOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import { getDashboard } from './dashboardService';
import type {
  RecentBooking,
  RevenueItem,
} from './dashboard.types';

const { Title, Text } = Typography;

const formatVND = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN');

const formatRevenueChart = (items: RevenueItem[]) => {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    const key = date.toISOString().slice(0, 10);

    const item = items.find((entry) => entry._id === key);

    return {
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      revenue: item?.revenue || 0,
    };
  });
};

const bookingColumns: ColumnsType<RecentBooking> = [
  {
    title: 'Mã đặt vé',
    dataIndex: 'bookingCode',
    key: 'bookingCode',
    render: (value: string) => (
      <Text strong>{value}</Text>
    ),
  },
  {
    title: 'Khách hàng',
    key: 'customer',
    render: (_, record) => {
  if (record.user?.fullName) {
    return record.user.fullName;
  }

  const passenger = record.passengers?.[0];

  if (passenger) {
    return `${passenger.lastName} ${passenger.firstName}`;
  }

  return 'Chưa có thông tin';
    },
  },
  {
    title: 'Chuyến bay',
    key: 'flight',
    render: (_, record) =>
      record.flight?.flightNumber || '—',
  },
  {
    title: 'Hành trình',
    key: 'route',
    render: (_, record) =>
      `${record.flight?.origin?.code || '—'} → ${record.flight?.destination?.code || '—'}`,
  },
  {
    title: 'Tổng tiền',
    key: 'total',
    render: (_, record) =>
      formatVND(record.pricing?.total || 0),
  },
  {
    title: 'Thanh toán',
    dataIndex: 'paymentStatus',
    key: 'paymentStatus',
    render: (status: string) => {
      const color =
        status === 'paid'
          ? 'success'
          : status === 'refunded'
            ? 'purple'
            : status === 'failed'
              ? 'error'
              : 'warning';

      return (
        <Tag color={color}>
          {status?.toUpperCase() || 'UNKNOWN'}
        </Tag>
      );
    },
  },
  {
    title: 'Ngày đặt',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (value: string) => formatDate(value),
  },
];

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboard,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const dashboard = data?.data;
  const overview = dashboard?.overview;

  const revenueData = formatRevenueChart(
    dashboard?.revenueChart || []
  );

  const airlineData = (dashboard?.airlineLoad || []).map(
    (item) => ({
      name: item.airline || 'Chưa xác định',
      value: Number(item.loadFactor.toFixed(1)),
    })
  );

  const bookings = dashboard?.recentBookings || [];

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton active />
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((item) => (
            <Col xs={24} sm={12} xl={6} key={item}>
              <Card><Skeleton active paragraph={false} /></Card>
            </Col>
          ))}
        </Row>
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <Alert
        type="error"
        showIcon
        message="Không thể tải dữ liệu Dashboard"
        description={
          (error as Error)?.message ||
          'Vui lòng kiểm tra Backend và API Admin Dashboard.'
        }
        action={
          <a onClick={() => refetch()}>
            Thử lại
          </a>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="!mb-1">
            Tổng quan hệ thống
          </Title>
          <Text type="secondary">
            Theo dõi tình hình hoạt động của SkyHaven
          </Text>
        </div>

        <Text type="secondary">
          Cập nhật tự động mỗi phút
        </Text>
      </div>

      {/* Statistic cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Tổng doanh thu"
              value={overview?.totalRevenue || 0}
              formatter={(value) => formatVND(Number(value))}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1677ff', fontSize: 22 }}
            />
            <Text type="secondary" className="text-xs">
              Booking đã thanh toán
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Chuyến bay hôm nay"
              value={overview?.todayFlights || 0}
              prefix={<CalendarOutlined />}
              valueStyle={{ fontSize: 22 }}
            />
            <Text type="secondary" className="text-xs">
              Theo ngày khởi hành
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Vé đã bán"
              value={overview?.ticketsSold || 0}
              prefix={<ShoppingOutlined />}
              valueStyle={{ fontSize: 22 }}
            />
            <Text type="secondary" className="text-xs">
              Hành khách thuộc booking đã thanh toán
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Khách hàng"
              value={overview?.totalCustomers || 0}
              prefix={<UserOutlined />}
              valueStyle={{ fontSize: 22 }}
            />
            <Text type="secondary" className="text-xs">
              Tài khoản khách hàng
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card title="Doanh thu 7 ngày gần nhất">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={revenueData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis
                    tickFormatter={(value) =>
                      `${(value / 1_000_000).toFixed(0)}tr`
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatVND(Number(value)),
                      'Doanh thu',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Doanh thu"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card title="Tỷ lệ lấp đầy theo hãng">
            <div className="h-[320px]">
              {airlineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={airlineData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={95}
                      label={({ value }) => `${value}%`}
                    >
                      {airlineData.map((item) => (
                        <Cell key={item.name} />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) => [
                        `${value}%`,
                        'Tỷ lệ lấp đầy',
                      ]}
                    />

                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Chưa có dữ liệu ghế máy bay
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent bookings */}
      <Card title="Đặt vé gần đây">
        <Table<RecentBooking>
          rowKey="_id"
          columns={bookingColumns}
          dataSource={bookings}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{
            emptyText: 'Chưa có dữ liệu đặt vé',
          }}
        />
      </Card>
    </div>
  );
}
