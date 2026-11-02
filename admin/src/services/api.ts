import axios from 'axios';
import { clearAuth, getToken } from '../lib/auth';

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const apiUrl = new URL(baseUrl);
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

  if (
    typeof window !== 'undefined' &&
    localHosts.has(apiUrl.hostname) &&
    !localHosts.has(window.location.hostname)
  ) {
    apiUrl.hostname = window.location.hostname;
  }

  return apiUrl.toString().replace(/\/+$/, '');
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Tự động gửi JWT trong mỗi request.
api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Khi token hết hạn hoặc không hợp lệ, xóa phiên đăng nhập.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;