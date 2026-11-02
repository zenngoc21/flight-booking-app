
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getFlightById } from '../../services/api';
import type { Flight } from '../../types/flight';
import { BookingSettingsNotice } from '../../components/booking-settings-notice';
import { usePublicSettings } from '../../hooks/use-public-settings';

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency || 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price.toLocaleString('vi-VN')} ${currency}`;
  }
}

function formatDateTime(value: string, timeZone: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Chưa có thông tin';
  }

  return date.toLocaleString('vi-VN', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function FlightDetailScreen() {
  const router = useRouter();
  const settingsQuery = usePublicSettings();
  const settings = settingsQuery.data;
  const timeZone = settings?.timezone ?? 'Asia/Ho_Chi_Minh';
  const params = useLocalSearchParams<{
    id: string | string[];
    passengerCount?: string | string[];
    passengerTypes?: string | string[];
    cabinClass?: string | string[];
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const passengerCount = Array.isArray(params.passengerCount)
    ? params.passengerCount[0]
    : params.passengerCount;

  const flightQuery = useQuery({
    queryKey: ['flight-detail', id],
    queryFn: () => getFlightById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
    retry: 1,
  });

  const flight: Flight | undefined = flightQuery.data;

  return (
    <>
      <Stack.Screen options={{ title: 'Chi tiết chuyến bay' }} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Pressable
          onPress={() => router.replace('/explore')}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Quay lại tìm kiếm</Text>
        </Pressable>

        {flightQuery.isLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#246BFD" />
            <Text style={styles.stateText}>
              Đang tải thông tin chuyến bay...
            </Text>
          </View>
        )}

        {!id && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Thiếu mã chuyến bay</Text>
            <Text style={styles.errorText}>
              Vui lòng quay lại danh sách và chọn một chuyến bay.
            </Text>
          </View>
        )}

        {flightQuery.isError && !flightQuery.isLoading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Không tải được chi tiết chuyến bay
            </Text>
            <Text style={styles.errorText}>
              {flightQuery.error instanceof Error
                ? flightQuery.error.message
                : 'Có lỗi xảy ra khi kết nối máy chủ.'}
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() => void flightQuery.refetch()}
            >
              <Text style={styles.primaryButtonText}>Thử lại</Text>
            </Pressable>
          </View>
        )}

        {flight && (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>CHI TIẾT CHUYẾN BAY</Text>
              <Text style={styles.airlineName}>{flight.airline.name}</Text>
              <Text style={styles.muted}>
                {flight.flightNumber} · {flight.airline.code}
              </Text>

              <View style={styles.routeRow}>
                <View style={styles.routePoint}>
                  <Text style={styles.airportCode}>
                    {flight.origin.code}
                  </Text>
                  <Text style={styles.city}>{flight.origin.city}</Text>
                </View>

                <View style={styles.routeMiddle}>
                  <Text style={styles.plane}>✈</Text>
                  <View style={styles.routeLine} />
                  <Text style={styles.muted}>
                    {flight.stops === 0
                      ? 'Bay thẳng'
                      : `${flight.stops} điểm dừng`}
                  </Text>
                </View>

                <View style={[styles.routePoint, styles.routeEnd]}>
                  <Text style={styles.airportCode}>
                    {flight.destination.code}
                  </Text>
                  <Text style={styles.city}>
                    {flight.destination.city}
                  </Text>
                </View>
              </View>

              <View style={styles.pricePanel}>
                <Text style={styles.muted}>Giá vé cơ bản</Text>
                <Text style={styles.price}>
                  {formatPrice(
                    flight.basePrice,
                    flight.currency || settings?.currency || 'VND',
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Lịch trình bay</Text>

              <View style={styles.timelineItem}>
                <View style={styles.departureDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.infoLabel}>Khởi hành</Text>
                  <Text style={styles.dateTime}>
                    {formatDateTime(flight.departureAt, timeZone)}
                  </Text>
                  <Text style={styles.muted}>
                    {flight.origin.airport || flight.origin.city}
                  </Text>
                </View>
              </View>

              <View style={styles.timelineConnector} />

              <View style={styles.timelineItem}>
                <View style={styles.arrivalDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.infoLabel}>Đến nơi</Text>
                  <Text style={styles.dateTime}>
                    {formatDateTime(flight.arrivalAt, timeZone)}
                  </Text>
                  <Text style={styles.muted}>
                    {flight.destination.airport || flight.destination.city}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Thông tin vé</Text>

              <InfoRow
                label="Mã chuyến bay"
                value={flight.flightNumber}
              />
              <InfoRow
                label="Hãng hàng không"
                value={flight.airline.name}
              />
              <InfoRow
                label="Hành lý"
                value={`${flight.baggageAllowanceKg} kg`}
              />
              <InfoRow
                label="Số điểm dừng"
                value={
                  flight.stops === 0
                    ? 'Bay thẳng'
                    : `${flight.stops} điểm dừng`
                }
              />
              <InfoRow
                label="Trạng thái"
                value={
                  flight.status === 'scheduled'
                    ? 'Đang mở bán'
                    : flight.status === 'cancelled'
                      ? 'Đã hủy'
                      : 'Đã hoàn thành'
                }
              />
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Tiện ích</Text>

              {flight.amenities?.length ? (
                flight.amenities.map((amenity, index) => (
                  <View
                    key={`${amenity}-${index}`}
                    style={styles.amenityRow}
                  >
                    <Text style={styles.check}>✓</Text>
                    <Text style={styles.infoValue}>{amenity}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>
                  Chưa có thông tin tiện ích.
                </Text>
              )}
            </View>

            <Text style={styles.notice}>
              Giá hiển thị là giá cơ bản trong hệ thống. Tổng giá đặt vé
              có thể thay đổi theo lựa chọn ghế và dịch vụ bổ sung.
            </Text>

            <BookingSettingsNotice
              settings={settings}
              error={settingsQuery.isError ? 'Không tải được cài đặt.' : undefined}
            />

            {flight.status === 'scheduled' &&
              settings?.bookingEnabled !== false &&
              !settings?.maintenanceMode && (
              <Pressable
                style={styles.primaryButton}
                onPress={() => {
                  router.push({
                    pathname: '/booking/seats',
                    params: {
                      flightId: flight._id,
                      passengerCount,
                      passengerTypes: params.passengerTypes,
                      cabinClass: params.cabinClass,
                    },
                  });
                }}
              >
                <Text style={styles.primaryButtonText}>
                  Tiếp tục đặt vé
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FB',
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginBottom: 8,
  },
  backText: {
    color: '#175CD3',
    fontSize: 15,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  eyebrow: {
    color: '#246BFD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  airlineName: {
    color: '#172B4D',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 12,
  },
  muted: {
    color: '#667085',
    fontSize: 13,
    marginTop: 5,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
  },
  routePoint: {
    flex: 1,
    minWidth: 0,
  },
  routeEnd: {
    alignItems: 'flex-end',
  },
  airportCode: {
    color: '#172B4D',
    fontSize: 27,
    fontWeight: '800',
  },
  city: {
    color: '#667085',
    fontSize: 12,
    marginTop: 5,
  },
  routeMiddle: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  plane: {
    color: '#246BFD',
    fontSize: 22,
    marginBottom: 5,
  },
  routeLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#98A2B3',
  },
  pricePanel: {
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
    marginTop: 25,
    paddingTop: 17,
  },
  price: {
    color: '#175CD3',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 5,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  sectionTitle: {
    color: '#172B4D',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 15,
  },
  departureDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#246BFD',
    marginTop: 4,
    marginRight: 12,
  },
  arrivalDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#12B76A',
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineConnector: {
    width: 2,
    height: 25,
    backgroundColor: '#D0D5DD',
    marginLeft: 5,
    marginTop: 3,
  },
  infoLabel: {
    color: '#667085',
    fontSize: 13,
  },
  dateTime: {
    color: '#172B4D',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 15,
    marginTop: 15,
  },
  infoValue: {
    color: '#344054',
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'right',
  },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  check: {
    color: '#039855',
    fontSize: 17,
    fontWeight: '800',
  },
  notice: {
    color: '#93370D',
    backgroundColor: '#FFFAEB',
    borderRadius: 12,
    padding: 14,
    marginTop: 15,
    lineHeight: 20,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: '#246BFD',
    borderRadius: 12,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 15,
    alignItems: 'center',
  },
  stateText: {
    color: '#667085',
    marginTop: 12,
  },
  errorCard: {
    backgroundColor: '#FEF3F2',
    borderRadius: 15,
    padding: 18,
  },
  errorTitle: {
    color: '#B42318',
    fontSize: 17,
    fontWeight: '800',
  },
  errorText: {
    color: '#B42318',
    marginTop: 8,
    lineHeight: 20,
  },
});
