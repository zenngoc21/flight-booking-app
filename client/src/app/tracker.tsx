import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  getMyBookings,
  type BookingHistoryItem,
} from '../services/api';
import { getSavedToken } from '../services/authStorage';

export default function FlightTrackerScreen() {
  const router = useRouter();
  const [items, setItems] = useState<BookingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const token = await getSavedToken();

      if (!token) {
        throw new Error('Đăng nhập để theo dõi chuyến bay đã đặt.');
      }

      const response = await getMyBookings(token);
      setItems(
        response.data.filter(
          (booking) =>
            booking.flight &&
            booking.bookingStatus === 'confirmed' &&
            booking.paymentStatus === 'paid',
        ),
      );
      setError('');
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không tải được dữ liệu.',
      );
    } finally {
      setCurrentTime(Date.now());
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const getEstimatedStatus = (booking: BookingHistoryItem) => {
    const departureTime = booking.flight?.departureAt
      ? new Date(booking.flight.departureAt).getTime()
      : 0;

    if (!departureTime || currentTime === null) {
      return 'Chưa có dữ liệu trạng thái';
    }

    if (currentTime > departureTime + 6 * 60 * 60 * 1000) {
      return 'Đã khởi hành (ước tính)';
    }

    if (currentTime >= departureTime - 45 * 60 * 1000) {
      return 'Chuẩn bị khởi hành';
    }

    return 'Đúng lịch theo giờ đặt vé';
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void load()} />
      }
    >
      <Text style={styles.title}>Theo dõi chuyến bay</Text>
      <Text style={styles.subtitle}>
        Thông tin hiển thị dựa trên giờ bay trong booking. Trạng thái cổng/gate
        và delay trực tiếp cần API hãng bay hoặc nguồn dữ liệu real-time.
      </Text>

      {loading && <ActivityIndicator />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && items.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chưa có chuyến bay để theo dõi</Text>
          <Text style={styles.subtitle}>
            Các vé đã thanh toán và xác nhận sẽ xuất hiện tại đây.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/booking-history')}
          >
            <Text style={styles.buttonText}>Mở lịch sử đặt vé</Text>
          </TouchableOpacity>
        </View>
      )}

      {items.map((booking) => (
        <TouchableOpacity
          key={booking._id}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: '/booking/detail',
              params: { bookingId: booking._id },
            })
          }
        >
          <View style={styles.route}>
            <Text style={styles.airportCode}>{booking.flight?.origin.code}</Text>
            <Text style={styles.plane}>✈</Text>
            <Text style={styles.airportCode}>
              {booking.flight?.destination.code}
            </Text>
          </View>
          <Text style={styles.cardTitle}>
            {booking.flight?.airline.name} · {booking.flight?.flightNumber}
          </Text>
          <Text style={styles.subtitle}>
            {booking.flight?.departureAt
              ? new Date(booking.flight.departureAt).toLocaleString('vi-VN')
              : 'Chưa có giờ bay'}
          </Text>
          <Text style={styles.status}>
            ● {getEstimatedStatus(booking)}
          </Text>
          <Text style={styles.subtitle}>
            Gate và delay thực tế chưa được kết nối với nguồn hãng bay.
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F3F6FB',
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#172B4D',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  airportCode: {
    fontSize: 26,
    fontWeight: '900',
    color: '#172B4D',
  },
  plane: {
    fontSize: 20,
    color: '#2563EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#172B4D',
    marginTop: 12,
  },
  status: {
    color: '#15803D',
    fontWeight: '800',
    marginTop: 12,
  },
  error: {
    color: '#B91C1C',
    marginTop: 14,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '800',
  },
});
