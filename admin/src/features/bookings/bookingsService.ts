import api from '../../services/api';
import type {
  Booking,
  BookingListResponse,
  BookingQuery,
} from './bookings.types';

export async function getBookings(
  params: BookingQuery
): Promise<BookingListResponse> {
  const response = await api.get<BookingListResponse>(
    '/admin/bookings',
    { params }
  );

  return response.data;
}

export async function getBookingById(
  id: string
): Promise<{ data: Booking }> {
  const response = await api.get<{ data: Booking }>(
    `/admin/bookings/${id}`
  );

  return response.data;
}