import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  //message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { getBookingById, getBookings } from './bookingsService';
import type {
  Booking,
  BookingStatus,
  PaymentStatus,
} from './bookings.types';

const { Title, Text } = Typography;

const formatMoney = (value: number, currency = 'VND') =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
  }).format(value);

const formatDate = (value?: string) => {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('vi-VN');
};

const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: 'Chờ thanh toán',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  expired: 'Đã hết hạn',
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán thất bại',
  refunded: 'Đã hoàn tiền',
};

function BookingStatusTag({ status }: { status: BookingStatus }) {
  const colors: Record<BookingStatus, string> = {
    pending: 'processing',
    confirmed: 'success',
    cancelled: 'error',
    expired: 'default',
  };

  return (
    <Tag color={colors[status]}>
      {bookingStatusLabels[status]}
    </Tag>
  );
}

function PaymentStatusTag({ status }: { status: PaymentStatus }) {
  const colors: Record<PaymentStatus, string> = {
    pending: 'processing',
    paid: 'success',
    failed: 'error',
    refunded: 'warning',
  };

  return (
    <Tag color={colors[status]}>
      {paymentStatusLabels[status]}
    </Tag>
  );
}

export default function BookingsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  );

  const bookingsQuery = useQuery({
    queryKey: [
      'admin-bookings',
      page,
      search,
      bookingStatus,
      paymentStatus,
    ],
    queryFn: () =>
      getBookings({
        page,
        limit: 10,
        search: search || undefined,
        bookingStatus: bookingStatus || undefined,
        paymentStatus: paymentStatus || undefined,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['admin-booking-detail', selectedBookingId],
    queryFn: () => getBookingById(selectedBookingId!),
    enabled: Boolean(selectedBookingId),
  });

  const bookings = bookingsQuery.data?.data ?? [];
  const pagination = bookingsQuery.data?.pagination;
  const selectedBooking = detailQuery.data?.data;
  const selectedLegs = selectedBooking?.legs?.length
    ? selectedBooking.legs
    : selectedBooking
      ? [
          { flight: selectedBooking.flight, seats: selectedBooking.seats },
          ...(selectedBooking.returnFlight
            ? [{
                flight: selectedBooking.returnFlight,
                seats: selectedBooking.returnSeats ?? [],
              }]
            : []),
        ]
      : [];

  const columns: ColumnsType<Booking> = [
    {
      title: 'Mã booking',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      render: (value: string) => (
        <Text strong>{value}</Text>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div>{record.user?.fullName || 'Chưa có tên'}</div>
          <Text type="secondary">
            {record.user?.email || '—'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Chuyến bay',
      key: 'flight',
      render: (_, record) => (
        <div>
          {(record.legs?.length
            ? record.legs.map((leg) => leg.flight)
            : [record.flight, record.returnFlight].filter(Boolean)
          ).map((flight, index) => (
            <div key={flight?._id ?? index}>
              <div>Chặng {index + 1}: {flight?.flightNumber || '—'}</div>
              <Text type="secondary">
                {flight?.origin?.code || '—'} → {flight?.destination?.code || '—'}
              </Text>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Số khách',
      key: 'passengers',
      render: (_, record) => record.passengers?.length ?? 0,
    },
    {
      title: 'Tổng tiền',
      key: 'total',
      render: (_, record) =>
        formatMoney(
          record.pricing?.total ?? 0,
          record.pricing?.currency || 'VND'
        ),
    },
    {
      title: 'Trạng thái booking',
      dataIndex: 'bookingStatus',
      key: 'bookingStatus',
      render: (value: BookingStatus) => (
        <BookingStatusTag status={value} />
      ),
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (value: PaymentStatus) => (
        <PaymentStatusTag status={value} />
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => setSelectedBookingId(record._id)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>Quản lý đặt vé</Title>
        <Text type="secondary">
          Theo dõi đơn đặt vé, hành khách và tình trạng thanh toán.
        </Text>
      </div>

      <Card className="mb-4">
        <Space wrap size="middle">
          <Input.Search
            placeholder="Tìm theo mã booking"
            allowClear
            value={searchInput}
            style={{ width: 260 }}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => {
              setPage(1);
              setSearch(value.trim());
            }}
          />

          <Select
            placeholder="Trạng thái booking"
            allowClear
            value={bookingStatus || undefined}
            style={{ width: 190 }}
            onChange={(value) => {
              setPage(1);
              setBookingStatus(value || '');
            }}
            options={[
              { label: 'Chờ thanh toán', value: 'pending' },
              { label: 'Đã xác nhận', value: 'confirmed' },
              { label: 'Đã hủy', value: 'cancelled' },
              { label: 'Đã hết hạn', value: 'expired' },
            ]}
          />

          <Select
            placeholder="Trạng thái thanh toán"
            allowClear
            value={paymentStatus || undefined}
            style={{ width: 200 }}
            onChange={(value) => {
              setPage(1);
              setPaymentStatus(value || '');
            }}
            options={[
              { label: 'Chờ thanh toán', value: 'pending' },
              { label: 'Đã thanh toán', value: 'paid' },
              { label: 'Thất bại', value: 'failed' },
              { label: 'Đã hoàn tiền', value: 'refunded' },
            ]}
          />

          <Button
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setBookingStatus('');
              setPaymentStatus('');
              setPage(1);
            }}
          >
            Xóa bộ lọc
          </Button>
        </Space>
      </Card>

      <Card>
        {bookingsQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message="Không thể tải danh sách booking"
            description={
              bookingsQuery.error instanceof Error
                ? bookingsQuery.error.message
                : 'Vui lòng kiểm tra API và quyền Admin.'
            }
            action={
              <Button onClick={() => bookingsQuery.refetch()}>
                Thử lại
              </Button>
            }
          />
        ) : (
          <>
            <Table<Booking>
              rowKey="_id"
              columns={columns}
              dataSource={bookings}
              loading={bookingsQuery.isLoading}
              pagination={false}
              scroll={{ x: 1200 }}
              locale={{
                emptyText: 'Chưa có đơn đặt vé',
              }}
            />

            <div className="mt-5 flex justify-end">
              <Pagination
                current={page}
                pageSize={pagination?.limit ?? 10}
                total={pagination?.total ?? 0}
                showSizeChanger={false}
                showTotal={(total) => `Tổng ${total} booking`}
                onChange={(nextPage) => setPage(nextPage)}
              />
            </div>
          </>
        )}
      </Card>

      <Modal
        title="Chi tiết booking"
        open={Boolean(selectedBookingId)}
        onCancel={() => setSelectedBookingId(null)}
        footer={[
          <Button
            key="close"
            onClick={() => setSelectedBookingId(null)}
          >
            Đóng
          </Button>,
        ]}
        width={850}
        destroyOnHidden
      >
        {detailQuery.isLoading ? (
          <div className="py-10 text-center">
            <Spin />
          </div>
        ) : detailQuery.isError ? (
          <Alert
            type="error"
            message="Không thể tải chi tiết booking"
          />
        ) : selectedBooking ? (
          <div className="space-y-5">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Mã booking">
                {selectedBooking.bookingCode}
              </Descriptions.Item>

              <Descriptions.Item label="Ngày tạo">
                {formatDate(selectedBooking.createdAt)}
              </Descriptions.Item>

              <Descriptions.Item label="Khách hàng">
                {selectedBooking.user?.fullName || '—'}
              </Descriptions.Item>

              <Descriptions.Item label="Email">
                {selectedBooking.user?.email || '—'}
              </Descriptions.Item>

              {selectedLegs.map((leg, index) => (
                <Descriptions.Item key={`leg-${index}`} label={`Chặng ${index + 1}`}>
                  <div>{leg.flight?.flightNumber || '—'}</div>
                  <div>
                    {leg.flight?.origin?.code || '—'} → {leg.flight?.destination?.code || '—'}
                  </div>
                  <Text type="secondary">
                    {formatDate(leg.flight?.departureAt)} · Ghế {leg.seats.join(', ') || '—'}
                  </Text>
                </Descriptions.Item>
              ))}

              <Descriptions.Item label="Trạng thái booking">
                <BookingStatusTag
                  status={selectedBooking.bookingStatus}
                />
              </Descriptions.Item>

              <Descriptions.Item label="Thanh toán">
                <PaymentStatusTag
                  status={selectedBooking.paymentStatus}
                />
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Title level={5}>Hành khách</Title>

              <Table
                rowKey={(_, index) => String(index)}
                size="small"
                pagination={false}
                dataSource={selectedBooking.passengers}
                columns={[
                  {
                    title: 'Họ',
                    dataIndex: 'lastName',
                  },
                  {
                    title: 'Tên',
                    dataIndex: 'firstName',
                  },
                  {
                    title: 'Giới tính',
                    dataIndex: 'gender',
                  },
                  {
                    title: 'Loại khách',
                    dataIndex: 'passengerType',
                    render: (value: Booking['passengers'][number]['passengerType']) =>
                      value === 'infant' ? 'Trẻ sơ sinh' :
                        value === 'child' ? 'Trẻ em' : 'Người lớn',
                  },
                  {
                    title: 'Email',
                    dataIndex: 'email',
                  },
                  {
                    title: 'Điện thoại',
                    dataIndex: 'phone',
                  },
                ]}
                scroll={{ x: 650 }}
              />
            </div>

            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Hành lý ký gửi">
                {selectedLegs.map((leg) =>
                  `${leg.baggage?.checkedBagCount ?? 0} kiện`,
                ).join(' · ')}
              </Descriptions.Item>

              <Descriptions.Item label="Bảo vệ chuyến bay">
                {selectedBooking.protection?.enabled
                  ? 'Có'
                  : 'Không'}
              </Descriptions.Item>

              <Descriptions.Item label="Phí bảo vệ">
                {formatMoney(
                  selectedBooking.pricing.protectionFee,
                  selectedBooking.pricing.currency
                )}
              </Descriptions.Item>

              {selectedBooking.pricing.outbound ? (
                <>
                  <Descriptions.Item label="Vé chiều đi">
                    {formatMoney(
                      selectedBooking.pricing.outbound.baseFare,
                      selectedBooking.pricing.currency
                    )}
                  </Descriptions.Item>
                  {selectedBooking.pricing.return && (
                    <Descriptions.Item label="Vé chiều về">
                      {formatMoney(
                        selectedBooking.pricing.return.baseFare,
                        selectedBooking.pricing.currency
                      )}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Ghế chiều đi">
                    {formatMoney(
                      selectedBooking.pricing.outbound.seatFee,
                      selectedBooking.pricing.currency
                    )}
                  </Descriptions.Item>
                  {selectedBooking.pricing.return && (
                    <Descriptions.Item label="Ghế chiều về">
                      {formatMoney(
                        selectedBooking.pricing.return.seatFee,
                        selectedBooking.pricing.currency
                      )}
                    </Descriptions.Item>
                  )}
                </>
              ) : (
                <>
                  <Descriptions.Item label="Giá vé cơ bản">
                    {formatMoney(
                      selectedBooking.pricing.baseFare,
                      selectedBooking.pricing.currency
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Phí ghế">
                    {formatMoney(
                      selectedBooking.pricing.seatFee,
                      selectedBooking.pricing.currency
                    )}
                  </Descriptions.Item>
                </>
              )}

              <Descriptions.Item label="Phí hành lý">
                {formatMoney(
                  selectedBooking.pricing.baggageFee,
                  selectedBooking.pricing.currency
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Tổng tiền">
                <Text strong>
                  {formatMoney(
                    selectedBooking.pricing.total,
                    selectedBooking.pricing.currency
                  )}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}