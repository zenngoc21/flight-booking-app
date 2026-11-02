export interface Airline {
  _id: string;
  name: string;
  code: string;
  logoUrl?: string;
  status?: 'active' | 'inactive';
  flightCount?: number;
}

export interface Airport {
  _id: string;
  code: string;
  city: string;
  airport: string;
  country?: string;
  status?: 'active' | 'inactive';
  flightCount?: number;
}

export interface ListResponse<T> {
  success?: boolean;
  data: T[];
}