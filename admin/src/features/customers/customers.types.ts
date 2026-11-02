import type {
  BookingStatus,
  PaymentStatus,
  BookingFlight,
} from '../bookings/bookings.types';

export interface Customer {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'user';
  bookingCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerBooking {
  _id: string;
  bookingCode: string;
  flight: BookingFlight | null;
  passengers: Array<{
    firstName: string;
    lastName: string;
  }>;
  seats: string[];
  pricing: {
    total: number;
    currency: string;
  };
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface CustomerListResponse {
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerDetailResponse {
  data: Customer;
}

export interface CustomerBookingsResponse {
  data: CustomerBooking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}