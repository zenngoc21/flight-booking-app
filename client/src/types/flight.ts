
export type CabinClass =
  | 'economy'
  | 'premium_economy'
  | 'business'
  | 'first';

export type FlightStatus =
  | 'scheduled'
  | 'cancelled'
  | 'completed';

export type SeatStatus = 'available' | 'booked';

export interface FlightSeat {
  seatNumber: string;
  cabinClass: CabinClass;
  extraPrice: number;
  status: SeatStatus;
}

export interface Airline {
  name: string;
  code: string;
  logoUrl?: string;
}

export interface Airport {
  code: string;
  city: string;
  airport?: string;
}

export interface Flight {
  _id: string;
  flightNumber: string;
  airline: Airline;
  origin: Airport;
  destination: Airport;
  departureAt: string;
  arrivalAt: string;
  basePrice: number;
  currency: string;
  stops: number;
  baggageAllowanceKg: number;
  amenities: string[];
  seats?: FlightSeat[];
  status: FlightStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type FlightSort = 'best' | 'cheapest' | 'fastest';

export type FlightStops = 'any' | 'direct';

export interface FlightSearchParams {
  from: string;
  to: string;
  date: string;
  sort: FlightSort;
  stops: FlightStops;
  maxPrice?: number;
  returnDate?: string;
  cabinClass?: CabinClass;
  airlines?: string[];
}

export interface FlightSearchResponse {
  source: 'database' | 'cache';
  count: number;
  data: Flight[];
}

export interface FlightDetailResponse {
  data: Flight;
}
