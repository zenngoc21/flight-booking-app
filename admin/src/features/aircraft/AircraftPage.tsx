import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

import api from '../../services/api';
import type { Flight, FlightSeat } from '../flights/flights.types';

const { Title, Text } = Typography;

interface FlightListResponse {
  data: Flight[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SeatFormValues {
  seatNumber: string;
  cabinClass: FlightSeat['cabinClass'];
  extraPrice: number;
}

const cabinOptions = [
  { label: 'Phổ thông', value: 'economy' },
  { label: 'Phổ thông đặc biệt', value: 'premium_economy' },
  { label: 'Thương gia', value: 'business' },
  { label: 'Hạng nhất', value: 'first' },
];

const EMPTY_SEATS: FlightSeat[] = [];

export default function AircraftPage() {
  const queryClient = useQueryClient();
  const [selectedFlightId, setSelectedFlightId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSeat, setEditingSeat] = useState<FlightSeat | null>(null);
  const [form] = Form.useForm<SeatFormValues>();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-seat-flights'],
    queryFn: async () => {
      const response = await api.get<FlightListResponse>(
        '/admin/flights',
        { params: { page: 1, limit: 100 } }
      );
      return response.data;
    },
  });

  const flights = useMemo(() => data?.data ?? [], [data?.data]);

  const selectedFlight = useMemo(
    () => flights.find((flight) => flight._id === selectedFlightId),
    [flights, selectedFlightId]
  );

  const seats = selectedFlight?.seats ?? EMPTY_SEATS;
  const seatStats = useMemo(
    () => ({
      total: seats.length,
      available: seats.filter((seat) => seat.status === 'available').length,
      booked: seats.filter((seat) => seat.status === 'booked').length,
    }),
    [seats],
  );
  const cabinStats = cabinOptions.map((cabin) => ({
    ...cabin,
    count: seats.filter((seat) => seat.cabinClass === cabin.value).length,
  }));


  const saveMutation = useMutation({
    mutationFn: async (nextSeats: FlightSeat[]) => {
      if (!selectedFlightId) {
        throw new Error('Vui lòng chọn chuyến bay');
      }

      return api.put(`/admin/flights/${selectedFlightId}`, {
        seats: nextSeats,
      });
    },
    onSuccess: async () => {
      message.success('Cập nhật danh sách ghế thành công');
      await queryClient.invalidateQueries({
        queryKey: ['admin-seat-flights'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['admin-flights'],
      });
      setModalOpen(false);
      setEditingSeat(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || 'Không thể cập nhật ghế'
      );
    },
  });

  const openAddModal = () => {
    setEditingSeat(null);
    form.resetFields();
    form.setFieldsValue({
      cabinClass: 'economy',
      extraPrice: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (seat: FlightSeat) => {
    setEditingSeat(seat);
    form.setFieldsValue({
      seatNumber: seat.seatNumber,
      cabinClass: seat.cabinClass,
      extraPrice: seat.extraPrice,
    });
    setModalOpen(true);
  };

  const handleSaveSeat = async (values: SeatFormValues) => {
    const seatNumber = values.seatNumber.trim().toUpperCase();

    const duplicate = seats.some(
      (seat) =>
        seat.seatNumber.toUpperCase() === seatNumber &&
        seat.seatNumber !== editingSeat?.seatNumber
    );

    if (duplicate) {
      message.error('Mã ghế này đã tồn tại trong chuyến bay');
      return;
    }

    let nextSeats: FlightSeat[];

    if (editingSeat) {
      nextSeats = seats.map((seat) =>
        seat.seatNumber === editingSeat.seatNumber
          ? {
              ...seat,
              seatNumber,
              cabinClass: values.cabinClass,
              extraPrice: values.extraPrice,
            }
          : seat
      );
    } else {
      nextSeats = [
        ...seats,
        {
          seatNumber,
          cabinClass: values.cabinClass,
          extraPrice: values.extraPrice,
          status: 'available',
        },
      ];
    }

    saveMutation.mutate(nextSeats);
  };

  const handleDeleteSeat = (seat: FlightSeat) => {
    if (seat.status === 'booked') {
      message.warning('Không thể xóa ghế đã được đặt');
      return;
    }

    Modal.confirm({
      title: 'Xác nhận xóa ghế?',
      content: `Bạn có chắc muốn xóa ghế ${seat.seatNumber}?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        const nextSeats = seats.filter(
          (item) => item.seatNumber !== seat.seatNumber
        );
        saveMutation.mutate(nextSeats);
      },
    });
  };

  const columns: ColumnsType<FlightSeat> = [
    {
      title: 'Mã ghế',
      dataIndex: 'seatNumber',
      key: 'seatNumber',
    },
    {
      title: 'Hạng ghế',
      dataIndex: 'cabinClass',
      key: 'cabinClass',
      render: (value: FlightSeat['cabinClass']) =>
        cabinOptions.find((item) => item.value === value)?.label ?? value,
    },
    {
      title: 'Phụ phí',
      dataIndex: 'extraPrice',
      key: 'extraPrice',
      render: (value: number) =>
        `${(value || 0).toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: FlightSeat['status']) =>
        value === 'booked' ? (
          <Tag color="green">Đã đặt</Tag>
        ) : (
          <Tag color="blue">Còn trống</Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, seat) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            disabled={seat.status === 'booked'}
            onClick={() => openEditModal(seat)}
          >
            Sửa
          </Button>

          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            disabled={seat.status === 'booked'}
            onClick={() => handleDeleteSeat(seat)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>Quản lý ghế</Title>
        <Text type="secondary">
          Quản lý sơ đồ ghế và hạng ghế theo từng chuyến bay.
        </Text>
      </div>

      <Card className="mb-5">
        <div className="mb-2 font-medium">Chọn chuyến bay</div>

        <Select
          showSearch
          allowClear
          className="w-full"
          style={{ maxWidth: 500 }}
          placeholder="Chọn mã chuyến bay"
          loading={isLoading}
          value={selectedFlightId}
          optionFilterProp="label"
          onChange={setSelectedFlightId}
          options={flights.map((flight) => ({
            value: flight._id,
            label: `${flight.flightNumber} - ${flight.origin.code} → ${flight.destination.code}`,
          }))}
        />
      </Card>

      {selectedFlight && (
        <Card
          title={
            <div>
              <div>Chuyến bay {selectedFlight.flightNumber}</div>
              <Text type="secondary" className="text-sm">
                {selectedFlight.origin.city} ({selectedFlight.origin.code})
                {' → '}
                {selectedFlight.destination.city} (
                {selectedFlight.destination.code})
              </Text>
            </div>
          }
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAddModal}
            >
              Thêm ghế
            </Button>
          }
        >
          <Space className="mb-4" wrap>
            <Tag color="blue">
              Tổng số ghế: {seatStats.total}
            </Tag>
            <Tag color="green">
              Còn trống: {seatStats.available}
            </Tag>
            <Tag color="orange">
              Đã đặt: {seatStats.booked}
            </Tag>
          </Space>
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h3 className="text-lg font-semibold">Sơ đồ ghế</h3>
      <p className="text-sm text-gray-500">
        Trạng thái ghế của chuyến bay {selectedFlight.flightNumber}
      </p>
    </div>

    <Space wrap>
      <span className="flex items-center gap-2 text-sm">
        <span className="h-3 w-3 rounded bg-blue-500" />
        Còn trống
      </span>

      <span className="flex items-center gap-2 text-sm">
        <span className="h-3 w-3 rounded bg-green-500" />
        Đã đặt
      </span>
    </Space>
  </div>

  {seats.length === 0 ? (
    <div className="py-8 text-center text-gray-500">
      Chuyến bay chưa có ghế nào.
    </div>
  ) : (
    <>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {seats.map((seat) => {
          const booked = seat.status === 'booked';

          return (
            <div
              key={seat.seatNumber}
              title={`${seat.seatNumber} - ${
                booked ? 'Đã đặt' : 'Còn trống'
              }`}
              className={`flex min-h-16 flex-col items-center justify-center rounded-lg border-2 p-2 ${
                booked
                  ? 'border-green-500 bg-green-100 text-green-800'
                  : 'border-blue-400 bg-blue-50 text-blue-800'
              }`}
            >
              <span className="font-bold">{seat.seatNumber}</span>

              <span className="mt-1 text-xs">
                {booked ? 'Đã đặt' : 'Trống'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-gray-200 pt-4">
        <h4 className="mb-3 font-medium">Phân loại hạng ghế</h4>

        <div className="flex flex-wrap gap-3">
          {cabinStats.map((cabin) => (
            <Tag key={cabin.value}>
              {cabin.label}: {cabin.count} ghế
            </Tag>
          ))}
        </div>
      </div>
    </>
  )}
</div>
          <Table
            rowKey="seatNumber"
            columns={columns}
            dataSource={seats}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Chuyến bay chưa có dữ liệu ghế' }}
          />
        </Card>
      )}

      {!selectedFlight && (
        <Card>
          <Text type="secondary">
            Vui lòng chọn chuyến bay để xem và quản lý ghế.
          </Text>
        </Card>
      )}

      <Modal
        title={editingSeat ? 'Chỉnh sửa ghế' : 'Thêm ghế mới'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingSeat(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveSeat}
        >
          <Form.Item
            label="Mã ghế"
            name="seatNumber"
            normalize={(value: string) => value.toUpperCase()}
            rules={[
              { required: true, message: 'Vui lòng nhập mã ghế' },
              {
                pattern: /^[1-9]\d{0,1}[A-F]$/,
                message: 'Mã ghế phải theo định dạng 1A–99F',
              },
            ]}
          >
            <Input
              placeholder="Ví dụ: 1A, 2B, 10F"
              disabled={!!editingSeat}
            />
          </Form.Item>

          <Form.Item
            label="Hạng ghế"
            name="cabinClass"
            rules={[{ required: true, message: 'Vui lòng chọn hạng ghế' }]}
          >
            <Select options={cabinOptions} />
          </Form.Item>

          <Form.Item
            label="Phụ phí (VNĐ)"
            name="extraPrice"
            rules={[{ required: true, message: 'Vui lòng nhập phụ phí' }]}
          >
            <InputNumber<number>
              className="w-full"
              min={0}
              step={50000}
              formatter={(value) =>
                `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }
              parser={(value: string | undefined): number =>
                Number(value?.replace(/,/g, '') || 0)
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}