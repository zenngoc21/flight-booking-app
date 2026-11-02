
import api from '../../services/api';
import type {
  Flight,
  FlightPayload,
  FlightListResponse,
  FlightQuery,
} from './flights.types';

export async function getFlights(
  params: FlightQuery
): Promise<FlightListResponse> {
  const response = await api.get<FlightListResponse>(
    '/admin/flights',
    { params }
  );

  return response.data;
}

export async function getFlightById(id: string): Promise<Flight> {
  const response = await api.get<{ data: Flight }>(
    `/admin/flights/${id}`
  );

  return response.data.data;
}

export async function createFlight(
  payload: FlightPayload
): Promise<Flight> {
  const response = await api.post<{ data: Flight }>(
    '/admin/flights',
    payload
  );

  return response.data.data;
}

export async function updateFlight(
  id: string,
  payload: Partial<FlightPayload>
): Promise<Flight> {
  const response = await api.put<{ data: Flight }>(
    `/admin/flights/${id}`,
    payload
  );

  return response.data.data;
}

export async function deleteFlight(id: string): Promise<void> {
  await api.delete(`/admin/flights/${id}`);
}
