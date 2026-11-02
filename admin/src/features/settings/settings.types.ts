export interface AdminSettings {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  currency: 'VND' | 'USD';
  timezone: string;
  bookingEnabled: boolean;
  maintenanceMode: boolean;
  cancellationPolicy: string;
}

export type UpdateSettingsPayload = AdminSettings;