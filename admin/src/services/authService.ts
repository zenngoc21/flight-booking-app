import api from './api';
import type { AdminUser } from '../lib/auth';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AdminUser;
}

export async function loginAdmin(
  payload: LoginPayload
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>(
    '/admin/login',
    payload
  );

  return response.data;
}

export async function getAdminProfile() {
  const response = await api.get('/admin/me');
  return response.data;
}