
import type {
  Flight,
  FlightDetailResponse,
  FlightSearchParams,
  FlightSearchResponse,
} from '../types/flight';

const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL;

function getFlightsApiUrl() {
  if (!RAW_API_URL) {
    throw new Error(
      'Thiếu EXPO_PUBLIC_API_URL trong file .env của client.',
    );
  }

  // Chấp nhận cả http://localhost:5000 và http://localhost:5000/api.
  const baseUrl = RAW_API_URL.replace(/\/+$/, '').replace(/\/api$/i, '');

  return `${baseUrl}/api/flights`;
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  let result: any;

  try {
    result = await response.json();
  } catch {
    throw new Error(`Server trả về dữ liệu không hợp lệ (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(
      result?.message || `Yêu cầu thất bại (${response.status}).`,
    );
  }

  return result as T;
}

export async function searchFlights(
  params: FlightSearchParams,
): Promise<FlightSearchResponse> {
  const query = new URLSearchParams({
    from: params.from.trim().toUpperCase(),
    to: params.to.trim().toUpperCase(),
    date: params.date,
    sort: params.sort,
    stops: params.stops,
    cabinClass: params.cabinClass ?? 'economy',
  });

  if (params.maxPrice !== undefined) {
    query.set('maxPrice', String(params.maxPrice));
  }

  if (params.airlines?.length) {
    query.set('airlines', params.airlines.join(','));
  }

  const url = `${getFlightsApiUrl()}/search?${query.toString()}`;

  return requestJson<FlightSearchResponse>(url);
}

export async function getFlightById(id: string): Promise<Flight> {
  const url = `${getFlightsApiUrl()}/${encodeURIComponent(id)}`;
  const result = await requestJson<FlightDetailResponse>(url);

  return result.data;
}
