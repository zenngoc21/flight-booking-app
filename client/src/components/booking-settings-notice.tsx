import { StyleSheet, Text, View } from 'react-native';
import type { PublicSettings } from '../services/api';

export function BookingSettingsNotice({
  settings,
  error,
}: {
  settings: PublicSettings | undefined;
  error?: string;
}) {
  if (!settings && error) {
    return (
      <View style={[styles.container, styles.errorContainer]} accessibilityRole="alert">
        <Text style={[styles.message, styles.errorMessage]}>
          Không tải được cài đặt hệ thống. Trạng thái đặt vé sẽ được máy chủ kiểm tra.
        </Text>
      </View>
    );
  }

  if (!settings?.maintenanceMode && settings?.bookingEnabled !== false) {
    return null;
  }

  const message = settings.maintenanceMode
    ? 'Hệ thống đang bảo trì. Vui lòng quay lại sau.'
    : 'Hiện tại hệ thống chưa nhận đặt vé mới.';

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.message}>{message}</Text>
      {Boolean(settings.supportEmail || settings.supportPhone) && (
        <Text style={styles.contact}>
          Hỗ trợ: {[settings.supportPhone, settings.supportEmail]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  message: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  errorMessage: {
    color: '#991B1B',
  },
  contact: {
    color: '#78350F',
    fontSize: 12,
    marginTop: 6,
  },
});
