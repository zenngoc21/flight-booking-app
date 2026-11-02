
export interface DashboardOverview {
  totalRevenue: number;
  todayFlights: number;
  ticketsSold: number;
  totalCustomers: number;
}

export interface RevenueItem {
  _id: string;
  revenue: number;
}

export interface AirlineLoadItem {
  airline: string;
  totalSeats: number;
  bookedSeats: number;
  loadFactor: number;
}

export interface RecentBooking {
  _id: string;
  bookingCode: string;
  bookingStatus: string;
  paymentStatus: string;
  pricing: {
    total: number;
    currency: string;
  };
  passengers: Array<{
    firstName: string;
    lastName: string;
  }>;
  createdAt: string;
  user?: {
    fullName?: string;
    email?: string;
  };
  flight?: {
    flightNumber?: string;
    origin?: {
      code?: string;
    };
    destination?: {
      code?: string;
    };
    departureAt?: string;
  };
}

export interface DashboardData {
  overview: DashboardOverview;
  revenueChart: RevenueItem[];
  airlineLoad: AirlineLoadItem[];
  recentBookings: RecentBooking[];
}

export interface DashboardResponse {
  data: DashboardData;
}
