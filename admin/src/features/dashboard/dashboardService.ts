
import api from '../../services/api';
import type { DashboardResponse } from './dashboard.types';

export async function getDashboard(): Promise<DashboardResponse> {
  const response = await api.get<DashboardResponse>('/admin/dashboard');

  return response.data;
}
