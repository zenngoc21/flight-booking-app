import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { getMyBookings } from '../../services/api';
import { getSavedToken } from '../../services/authStorage';
import {
  cacheOfflineTicket,
  getOfflineTicket,
} from '../../services/offlineTickets';
import { getBookingItinerary } from '../../services/bookingItinerary';

export default function ETicketScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadTicket = async () => {
        setLoading(true);
        setError('');

        try {
          const token = await getSavedToken();

          if (token) {
            const response = await getMyBookings(token);
            const item = response.data.find(
              (booking) => booking._id === bookingId,
            );

            if (item) {
              if (
                item.paymentStatus !== 'paid' ||
                item.bookingStatus !== 'confirmed'
              ) {
                throw new Error(
                  'Vé chỉ được phát hành sau khi thanh toán đã xác nhận.',
                );
              }

              let cacheWarning = '';

              try {
                await cacheOfflineTicket(item);
              } catch {
                cacheWarning =
                  'Không thể lưu bản vé offline trên thiết bị. Bạn vẫn có thể xem vé trực tuyến.';
              }

              if (active) {
                setTicket(item);
                setOffline(false);
                setError(cacheWarning);
              }
              return;
            }
          }

          const cachedTicket = await getOfflineTicket(bookingId);

          if (cachedTicket && active) {
            setTicket(cachedTicket);
            setOffline(true);
            setError('');
          } else if (active) {
            setError('Không tìm thấy vé trực tuyến hoặc bản lưu offline.');
          }
        } catch (loadError) {
          const cachedTicket = await getOfflineTicket(bookingId);

          if (cachedTicket && active) {
            setTicket(cachedTicket);
            setOffline(true);
            setError('');
          } else if (active) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : 'Không thể tải vé.',
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void loadTicket();

      return () => {
        active = false;
      };
    }, [bookingId]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Đang tải vé...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Không mở được vé</Text>
        <Text style={styles.muted}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/booking-history')}
        >
          <Text style={styles.white}>Lịch sử đặt vé</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const itinerary = getBookingItinerary(ticket);
  const flight = itinerary[0]?.flight ?? ticket.flight;
  const qrData = JSON.stringify({
    type: 'FLIGHT_BOOKING_TICKET',
    bookingCode: ticket.bookingCode,
    bookingId: ticket._id,
    flights: itinerary.map((leg, index) => ({
      leg: index + 1,
      flightNumber: leg.flight.flightNumber,
      seats: leg.seats,
    })),
  });

  const alertOffline = () => {
    const message = error
      ? 'Không thể lưu vé trên thiết bị. Hãy giữ kết nối mạng để xem lại vé. QR chỉ chứa mã tham chiếu, việc xác thực cuối cùng cần hệ thống hãng bay.'
      : 'Đã lưu vé trên thiết bị. QR chỉ chứa mã tham chiếu, việc xác thực cuối cùng cần hệ thống hãng bay.';

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } else {
      Alert.alert(
        'Vé đã lưu',
        'Dữ liệu vé tối thiểu đã được lưu để xem offline. QR là mã tham chiếu, không thay thế xác nhận check-in của hãng bay.',
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.ticket}>
        <View style={styles.top}>
          <Text style={styles.brand}>SKYHAVEN AIR</Text>
          <Text style={styles.status}>
            ✓ {offline ? 'BẢN LƯU OFFLINE' : 'ĐÃ XÁC NHẬN'}
          </Text>
        </View>

        <Text style={styles.pnr}>{ticket.bookingCode}</Text>
        <Text style={styles.label}>MÃ ĐẶT CHỖ</Text>

        <View style={styles.route}>
          <View>
            <Text style={styles.airport}>
              {flight?.origin?.code || '---'}
            </Text>
            <Text style={styles.city}>{flight?.origin?.city || ''}</Text>
          </View>
          <Text style={styles.plane}>✈</Text>
          <View style={styles.destination}>
            <Text style={styles.airport}>
              {flight?.destination?.code || '---'}
            </Text>
            <Text style={styles.city}>
              {flight?.destination?.city || ''}
            </Text>
          </View>
        </View>

        <View style={styles.line} />
        <Text style={styles.field}>
          CHUYẾN BAY <Text style={styles.value}>{flight?.flightNumber || '--'}</Text>
        </Text>
        <Text style={styles.field}>
          HÃNG BAY <Text style={styles.value}>{flight?.airline?.name || '--'}</Text>
        </Text>
        <Text style={styles.field}>
          KHỞI HÀNH{' '}
          <Text style={styles.value}>
            {flight?.departureAt
              ? new Date(flight.departureAt).toLocaleString('vi-VN')
              : '--'}
          </Text>
        </Text>
        <Text style={styles.field}>
          HÀNH KHÁCH{' '}
          <Text style={styles.value}>
            {ticket.passengers
              ?.map((passenger: { firstName?: string; lastName?: string }) =>
                `${passenger.firstName || ''} ${passenger.lastName || ''}`.trim(),
              )
              .join(', ') || 'Theo hồ sơ đặt vé'}
          </Text>
        </Text>
        <Text style={styles.field}>
          GHẾ <Text style={styles.value}>{ticket.seats?.join(', ') || 'Chưa chỉ định'}</Text>
        </Text>

        {itinerary.slice(1).map((leg, index) => (
          <React.Fragment key={`${leg.flight.flightNumber}-${index}`}>
            <View style={styles.line} />
            <Text style={styles.field}>
              CHẶNG {index + 2}{' '}
              <Text style={styles.value}>
                {leg.flight.origin?.code || '---'} → {leg.flight.destination?.code || '---'}
              </Text>
            </Text>
            <Text style={styles.field}>
              CHUYẾN BAY{' '}
              <Text style={styles.value}>
                {leg.flight.flightNumber || '--'}
              </Text>
            </Text>
            <Text style={styles.field}>
              KHỞI HÀNH{' '}
              <Text style={styles.value}>
                {leg.flight.departureAt
                  ? new Date(leg.flight.departureAt).toLocaleString('vi-VN')
                  : '--'}
              </Text>
            </Text>
            <Text style={styles.field}>
              GHẾ <Text style={styles.value}>{leg.seats.join(', ') || 'Chưa chỉ định'}</Text>
            </Text>
          </React.Fragment>
        ))}

        <View style={styles.qrBox}>
          <QRCode
            value={qrData}
            size={190}
            backgroundColor="white"
            color="#0F172A"
          />
          <Text style={styles.qrCaption}>
            Mã tham chiếu đặt chỗ · Không chứa thông tin thẻ
          </Text>
        </View>

        {error ? <Text style={styles.warning}>{error}</Text> : null}
        <Text style={styles.disclaimer}>
          Mã QR này là mã tham chiếu của ứng dụng. Check-in và xác thực lên máy
          bay phụ thuộc hệ thống hãng bay.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={alertOffline}>
        <Text style={styles.white}>Thông tin vé offline</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondary}
        onPress={() => router.replace('/booking-history')}
      >
        <Text style={styles.dark}>Quay lại lịch sử đặt vé</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 36,
    backgroundColor: '#F3F6FB',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  ticket: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 1,
  },
  status: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  pnr: {
    fontSize: 32,
    fontWeight: '900',
    color: '#172B4D',
    marginTop: 22,
  },
  label: {
    fontSize: 10,
    color: '#64748B',
    letterSpacing: 1,
    fontWeight: '700',
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 22,
  },
  airport: {
    fontSize: 27,
    fontWeight: '900',
    color: '#172B4D',
  },
  city: {
    color: '#64748B',
    marginTop: 4,
  },
  destination: {
    alignItems: 'flex-end',
  },
  plane: {
    fontSize: 24,
    color: '#2563EB',
  },
  line: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  field: {
    fontSize: 11,
    color: '#64748B',
    marginVertical: 8,
    fontWeight: '700',
  },
  value: {
    fontSize: 13,
    color: '#172B4D',
    fontWeight: '700',
  },
  qrBox: {
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  qrCaption: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  warning: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 16,
  },
  disclaimer: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 16,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  white: {
    color: '#FFF',
    fontWeight: '800',
  },
  secondary: {
    marginTop: 10,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  dark: {
    color: '#334155',
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#172B4D',
  },
  muted: {
    color: '#64748B',
    marginTop: 10,
    textAlign: 'center',
  },
});
