
import { useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  DatePicker,
  Row,
  Col,
} from 'antd';
import dayjs from 'dayjs';

import type {
  Flight,
  FlightPayload,
} from '../flights.types';

interface Props {
  open: boolean;
  editingFlight: Flight | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (values: FlightPayload) => void;
}

interface FormValues {
  flightNumber: string;
  airlineName: string;
  airlineCode: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  departureAt: dayjs.Dayjs;
  arrivalAt: dayjs.Dayjs;
  basePrice: number;
  currency: string;
  stops: number;
  baggageAllowanceKg: number;
  amenities: string;
  status: Flight['status'];
}

export default function FlightFormModal({
  open,
  editingFlight,
  loading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;

    if (editingFlight) {
      form.setFieldsValue({
        flightNumber: editingFlight.flightNumber,
        airlineName: editingFlight.airline?.name,
        airlineCode: editingFlight.airline?.code,
        originCode: editingFlight.origin?.code,
        originCity: editingFlight.origin?.city,
        destinationCode: editingFlight.destination?.code,
        destinationCity: editingFlight.destination?.city,
        departureAt: dayjs(editingFlight.departureAt),
        arrivalAt: dayjs(editingFlight.arrivalAt),
        basePrice: editingFlight.basePrice,
        currency: editingFlight.currency || 'VND',
        stops: editingFlight.stops ?? 0,
        baggageAllowanceKg: editingFlight.baggageAllowanceKg ?? 20,
        amenities: editingFlight.amenities?.join(', ') || '',
        status: editingFlight.status,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        currency: 'VND',
        stops: 0,
        baggageAllowanceKg: 20,
        status: 'scheduled',
        departureAt: dayjs().add(1, 'day'),
        arrivalAt: dayjs().add(1, 'day').add(2, 'hour'),
      });
    }
  }, [open, editingFlight, form]);

  const handleFinish = (values: FormValues) => {
    if (!values.arrivalAt.isAfter(values.departureAt)) {
      form.setFields([
        {
          name: 'arrivalAt',
          errors: ['Thời gian đến phải sau thời gian khởi hành'],
        },
      ]);
      return;
    }

    onSubmit({
      flightNumber: values.flightNumber.trim().toUpperCase(),
      airline: {
        name: values.airlineName.trim(),
        code: values.airlineCode.trim().toUpperCase(),
      },
      origin: {
        code: values.originCode.trim().toUpperCase(),
        city: values.originCity.trim(),
      },
      destination: {
        code: values.destinationCode.trim().toUpperCase(),
        city: values.destinationCity.trim(),
      },
      departureAt: values.departureAt.toISOString(),
      arrivalAt: values.arrivalAt.toISOString(),
      basePrice: values.basePrice,
      currency: values.currency,
      stops: values.stops,
      baggageAllowanceKg: values.baggageAllowanceKg,
      amenities: values.amenities
        ? values.amenities
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
      status: values.status,
    });
  };

  return (
    <Modal
      title={editingFlight ? 'Chỉnh sửa chuyến bay' : 'Thêm chuyến bay'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Lưu chuyến bay"
      cancelText="Hủy"
      width={760}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        className="mt-5"
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="flightNumber"
              label="Mã chuyến bay"
              rules={[{ required: true, message: 'Nhập mã chuyến bay' }]}
            >
              <Input placeholder="VN123" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'scheduled', label: 'Đã lên lịch' },
                  { value: 'cancelled', label: 'Đã hủy' },
                  { value: 'completed', label: 'Đã hoàn thành' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <div className="font-semibold mb-3">Hãng hàng không</div>

        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Form.Item
              name="airlineName"
              label="Tên hãng"
              rules={[{ required: true, message: 'Nhập tên hãng' }]}
            >
              <Input placeholder="Vietnam Airlines" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="airlineCode"
              label="Mã hãng"
              rules={[{ required: true, message: 'Nhập mã hãng' }]}
            >
              <Input placeholder="VN" />
            </Form.Item>
          </Col>
        </Row>

        <div className="font-semibold mb-3">Điểm khởi hành</div>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="originCode"
              label="Mã sân bay"
              rules={[{ required: true }]}
            >
              <Input maxLength={3} placeholder="SGN" />
            </Form.Item>
          </Col>

          <Col xs={24} md={16}>
            <Form.Item
              name="originCity"
              label="Thành phố"
              rules={[{ required: true }]}
            >
              <Input placeholder="TP. Hồ Chí Minh" />
            </Form.Item>
          </Col>
        </Row>

        <div className="font-semibold mb-3">Điểm đến</div>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="destinationCode"
              label="Mã sân bay"
              rules={[{ required: true }]}
            >
              <Input maxLength={3} placeholder="HAN" />
            </Form.Item>
          </Col>

          <Col xs={24} md={16}>
            <Form.Item
              name="destinationCity"
              label="Thành phố"
              rules={[{ required: true }]}
            >
              <Input placeholder="Hà Nội" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="departureAt"
              label="Thời gian khởi hành"
              rules={[{ required: true }]}
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                className="w-full"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="arrivalAt"
              label="Thời gian đến"
              rules={[{ required: true }]}
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                className="w-full"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="basePrice"
              label="Giá vé (VND)"
              rules={[{ required: true, message: 'Nhập giá vé' }]}
            >
              <InputNumber<number>
                min={1}
                className="w-full"
                formatter={(value) =>
                  `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                }
                parser={(value) => Number(value?.replace(/,/g, '') || 0)}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="currency"
              label="Đơn vị tiền"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'VND', label: 'VND' },
                  { value: 'USD', label: 'USD' },
                ]}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="stops"
              label="Số điểm dừng"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={10} className="w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="baggageAllowanceKg"
              label="Hành lý (kg)"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </Col>

          <Col xs={24} md={16}>
            <Form.Item
              name="amenities"
              label="Tiện ích (ngăn cách bằng dấu phẩy)"
            >
              <Input placeholder="WiFi, Suất ăn, Giải trí" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
