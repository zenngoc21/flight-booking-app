
export interface AirportInfo {
  code: string;
  city: string;
}

export interface AirlineInfo {
  name: string;
  code: string;
}

export interface FlightSeat {
  seatNumber: string;
  cabinClass: 'economy' | 'premium_economy' | 'business' | 'first';
  extraPrice: number;
  status: 'available' | 'booked';
}

export type FlightStatus =
  | 'scheduled'
  | 'cancelled'
  | 'completed';

export interface Flight {
  _id: string;
  flightNumber: string;
  airline: AirlineInfo;
  origin: AirportInfo;
  destination: AirportInfo;
  departureAt: string;
  arrivalAt: string;
  basePrice: number;
  currency: string;
  stops?: number;
  baggageAllowanceKg?: number;
  amenities?: string[];
  seats?: FlightSeat[];
  status: FlightStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface FlightPayload {
  flightNumber: string;
  airline: AirlineInfo;
  origin: AirportInfo;
  destination: AirportInfo;
  departureAt: string;
  arrivalAt: string;
  basePrice: number;
  currency: string;
  stops: number;
  baggageAllowanceKg: number;
  amenities: string[];
  status: FlightStatus;
}

export interface FlightListResponse {
  data: Flight[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FlightQuery {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  date?: string;
}
