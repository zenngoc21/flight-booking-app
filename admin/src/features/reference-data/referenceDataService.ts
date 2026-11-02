import api from '../../services/api';
import type {
  Airline,
  Airport,
  ListResponse,
} from './referenceData.types';

export interface AirlinePayload {
  name: string;
  code: string;
  logoUrl?: string;
  status?: 'active' | 'inactive';
}

export interface AirportPayload {
  code: string;
  city: string;
  airport: string;
  country?: string;
  status?: 'active' | 'inactive';
}

export const referenceDataService = {
  async getAirlines(): Promise<Airline[]> {
    const response = await api.get<ListResponse<Airline>>(
      '/admin/airlines'
    );
    return response.data.data;
  },

  async createAirline(payload: AirlinePayload): Promise<Airline> {
    const response = await api.post<{ data: Airline }>(
      '/admin/airlines',
      payload
    );
    return response.data.data;
  },

  async updateAirline(
    id: string,
    payload: Partial<AirlinePayload>
  ): Promise<Airline> {
    const response = await api.put<{ data: Airline }>(
      `/admin/airlines/${id}`,
      payload
    );
    return response.data.data;
  },

  async deleteAirline(id: string): Promise<void> {
    await api.delete(`/admin/airlines/${id}`);
  },

  async getAirports(): Promise<Airport[]> {
    const response = await api.get<ListResponse<Airport>>(
      '/admin/airports'
    );
    return response.data.data;
  },

  async createAirport(payload: AirportPayload): Promise<Airport> {
    const response = await api.post<{ data: Airport }>(
      '/admin/airports',
      payload
    );
    return response.data.data;
  },

  async updateAirport(
    id: string,
    payload: Partial<AirportPayload>
  ): Promise<Airport> {
    const response = await api.put<{ data: Airport }>(
      `/admin/airports/${id}`,
      payload
    );
    return response.data.data;
  },

  async deleteAirport(id: string): Promise<void> {
    await api.delete(`/admin/airports/${id}`);
  },
};