import api from '../../services/api';
import type {
  AdminSettings,
  UpdateSettingsPayload,
} from './settings.types';

interface SettingsResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const settingsService = {
  async getSettings(): Promise<AdminSettings> {
    const response = await api.get<SettingsResponse<AdminSettings>>(
      '/admin/settings'
    );
    return response.data.data;
  },

  async updateSettings(
    payload: UpdateSettingsPayload
  ): Promise<AdminSettings> {
    const response = await api.put<SettingsResponse<AdminSettings>>(
      '/admin/settings',
      payload
    );
    return response.data.data;
  },
};