import api from '../../services/api';
import type {
  CustomerListResponse,
  CustomerDetailResponse,
  CustomerBookingsResponse,
} from './customers.types';

export interface CustomerQuery {
  page: number;
  limit: number;
  search?: string;
}

export async function getCustomers(
  params: CustomerQuery
): Promise<CustomerListResponse> {
  const response = await api.get<CustomerListResponse>(
    '/admin/customers',
    { params }
  );

  return response.data;
}

export async function getCustomerById(
  id: string
): Promise<CustomerDetailResponse> {
  const response = await api.get<CustomerDetailResponse>(
    `/admin/customers/${id}`
  );

  return response.data;
}

export async function getCustomerBookings(
  id: string,
  page = 1,
  limit = 10
): Promise<CustomerBookingsResponse> {
  const response = await api.get<CustomerBookingsResponse>(
    `/admin/customers/${id}/bookings`,
    { params: { page, limit } }
  );

  return response.data;
}