export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'expired';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export interface Passenger {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  passengerType?: 'adult' | 'child' | 'infant';
  email: string;
  phone: string;
}

export interface BookingUser {
  _id: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface BookingFlight {
  _id: string;
  flightNumber: string;
  airline?: {
    name?: string;
    code?: string;
  };
  origin?: {
    code?: string;
    city?: string;
  };
  destination?: {
    code?: string;
    city?: string;
  };
  departureAt?: string;
  arrivalAt?: string;
  status?: string;
}

export interface BookingLeg {
  flight: BookingFlight | null;
  seats: string[];
  baggage?: {
    checkedBagCount: number;
    checkedBagPrice: number;
  };
}

export interface Booking {
  _id: string;
  bookingCode: string;
  user: BookingUser | null;
  flight: BookingFlight | null;
  returnFlight?: BookingFlight | null;
  legs?: BookingLeg[];
  passengers: Passenger[];
  seats: string[];
  returnSeats?: string[];
  baggage: {
    checkedBagCount: number;
    checkedBagPrice: number;
  };
  protection: {
    enabled: boolean;
    price: number;
  };
  pricing: {
    baseFare: number;
    seatFee: number;
    baggageFee: number;
    protectionFee: number;
    total: number;
    currency: string;
    outbound?: {
      baseFare: number;
      seatFee: number;
      baggageFee: number;
      protectionFee: number;
      total: number;
    } | null;
    return?: {
      baseFare: number;
      seatFee: number;
      baggageFee: number;
      protectionFee: number;
      total: number;
    } | null;
    legs?: Array<{
      baseFare: number;
      seatFee: number;
      baggageFee: number;
      protectionFee: number;
      total: number;
    }>;
  };
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  expiresAt?: string;
  paidAt?: string | null;
  failedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingListResponse {
  data: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BookingQuery {
  page: number;
  limit: number;
  search?: string;
  bookingStatus?: string;
  paymentStatus?: string;
}