import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  getMyBookings,
  type BookingHistoryItem,
} from '../services/api';
import { getSavedToken } from '../services/authStorage';
import { usePublicSettings } from '../hooks/use-public-settings';

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency || 'VND',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(value: string, timeZone: string) {
  return new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  });
}

function getStatusLabel(status: BookingHistoryItem['bookingStatus']) {
  switch (status) {
    case 'confirmed':
      return 'Đã xác nhận';
    case 'cancelled':
      return 'Đã hủy';
    case 'expired':
      return 'Đã hết hạn';
    default:
      return 'Chờ thanh toán';
  }
}

function getPaymentStatusLabel(status: BookingHistoryItem['paymentStatus']) {
  switch (status) {
    case 'paid':
      return 'Đã thanh toán';
    case 'failed':
      return 'Thanh toán thất bại';
    case 'refunded':
      return 'Đã hoàn tiền';
    default:
      return 'Chờ thanh toán';
  }
}

export default function BookingHistoryScreen() {
  const router = useRouter();
  const { data: settings } = usePublicSettings();
  const timeZone = settings?.timezone ?? 'Asia/Ho_Chi_Minh';
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string>();

  const loadBookings = useCallback(async (
    isActive: () => boolean = () => true,
  ) => {
    if (isActive()) {
      setLoading(true);
      setError(undefined);
    }
    try {
      const token = await getSavedToken();
      if (!isActive()) return;

      setIsAuthenticated(Boolean(token));

      if (!token) {
        setBookings([]);
        return;
      }

      const result = await getMyBookings(token);
      if (isActive()) setBookings(result.data);
    } catch (cause) {
      if (isActive()) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Không thể tải lịch sử đặt vé.',
        );
      }
    } finally {
      if (isActive()) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadBookings(() => active);

      return () => {
        active = false;
      };
    }, [loadBookings]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2878B9" />
        <Text style={styles.description}>Đang tải lịch sử đặt vé...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text style={styles.icon}>🎫</Text>
        <Text style={styles.title}>Lịch sử đặt vé</Text>
        <Text style={styles.description}>
          Vui lòng đăng nhập để xem các chuyến bay bạn đã đặt.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Đăng nhập</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Lịch sử đặt vé</Text>
      <Text style={styles.description}>
        Các chuyến bay bạn đã đặt sẽ xuất hiện tại đây.
      </Text>

      {error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => void loadBookings()}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Image
            source={require('../../assets/images/illustrations/empty-booking.png')}
            style={styles.emptyIllustration}
            resizeMode="contain"
            accessibilityLabel="Minh họa chưa có vé máy bay"
          />
          <Text style={styles.emptyTitle}>Chưa có dữ liệu đặt vé</Text>
          <Text style={styles.emptyDescription}>
            Hãy tìm chuyến bay và hoàn tất đặt chỗ để xem thông tin vé tại đây.
          </Text>
        </View>
      ) : (
        bookings.map((booking) => (
          <View key={booking._id} style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingCode}>{booking.bookingCode}</Text>
              <Text style={styles.status}>
                {getStatusLabel(booking.bookingStatus)}
              </Text>
            </View>

            {booking.flight ? (
              <>
                <Text style={styles.airline}>
                  Chiều đi · {booking.flight.airline.name} · {booking.flight.flightNumber}
                </Text>
                <Text style={styles.route}>
                  {booking.flight.origin.city} ({booking.flight.origin.code})
                  {'  →  '}
                  {booking.flight.destination.city} (
                  {booking.flight.destination.code})
                </Text>
                <Text style={styles.detail}>
                  Khởi hành: {formatDate(booking.flight.departureAt, timeZone)}
                </Text>
              </>
            ) : (
              <Text style={styles.detail}>
                Thông tin chuyến bay không còn khả dụng.
              </Text>
            )}

            <Text style={styles.detail}>
              Ghế chiều đi: {booking.seats.join(', ')}
            </Text>
            {booking.returnFlight && (
              <>
                <Text style={styles.airline}>
                  Chiều về · {booking.returnFlight.airline.name} · {booking.returnFlight.flightNumber}
                </Text>
                <Text style={styles.route}>
                  {booking.returnFlight.origin.city} ({booking.returnFlight.origin.code})
                  {'  →  '}
                  {booking.returnFlight.destination.city} (
                  {booking.returnFlight.destination.code})
                </Text>
                <Text style={styles.detail}>
                  Khởi hành: {formatDate(booking.returnFlight.departureAt, timeZone)}
                </Text>
                <Text style={styles.detail}>
                  Ghế chiều về: {booking.returnSeats?.join(', ') || '--'}
                </Text>
              </>
            )}
            <Text style={styles.detail}>
              Đặt lúc: {formatDate(booking.createdAt, timeZone)}
            </Text>
            
<View style={styles.cardFooter}>
  <View>
    <Text style={styles.detail}>
      {getPaymentStatusLabel(booking.paymentStatus)}
    </Text>

    <Text style={styles.price}>
      {formatPrice(
        booking.pricing.total,
        booking.pricing.currency || settings?.currency || 'VND',
      )}
    </Text>
  </View>

  {booking.bookingStatus === 'pending' &&
    booking.paymentStatus === 'pending' && (
      <Pressable
        style={styles.payButton}
        onPress={() =>
          router.push({
            pathname: '/booking/payment',
            params: {
              bookingId: booking._id,
            },
          })
        }
      >
        <Text style={styles.payButtonText}>
          Thanh toán ngay
        </Text>
      </Pressable>
    )}
</View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <Pressable style={styles.retryButton} onPress={() => router.push({ pathname: '/booking/detail', params: { bookingId: booking._id } })}>
                <Text style={styles.retryText}>Chi tiết</Text>
              </Pressable>
              {booking.bookingStatus === 'confirmed' && booking.paymentStatus === 'paid' && (
                <Pressable style={styles.payButton} onPress={() => router.push({ pathname: '/booking/ticket', params: { bookingId: booking._id } })}>
                  <Text style={styles.payButtonText}>Vé điện tử / QR</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <Pressable style={[styles.button, { flex: 1 }]} onPress={() => router.push('/tracker')}><Text style={styles.buttonText}>Theo dõi bay</Text></Pressable>
        <Pressable style={[styles.button, { flex: 1 }]} onPress={() => router.push('/notifications')}><Text style={styles.buttonText}>Thông báo</Text></Pressable>
      </View>
      <Pressable
        style={styles.button}
        onPress={() => router.push('/explore')}
      >
        <Text style={styles.buttonText}>Tìm chuyến bay</Text>
      </Pressable>

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace('/profile')}
      >
        <Text style={styles.backText}>← Quay lại hồ sơ</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  content: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    backgroundColor: '#F5F8FC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 52,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#123B5D',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 13,
    color: '#62798B',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  emptyCard: {
    padding: 26,
    borderWidth: 1,
    borderColor: '#DCE8F1',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#123B5D',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  emptyIllustration: {
    width: 180,
    height: 125,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  emptyDescription: {
    color: '#62798B',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
  },
  bookingCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#DCE8F1',
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    shadowColor: '#123B5D',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  bookingCode: {
    color: '#2878B9',
    fontWeight: '700',
  },
  status: {
    color: '#475467',
    fontSize: 12,
  },
  airline: {
    color: '#526C80',
    fontWeight: '600',
  },
  route: {
    color: '#123B5D',
    fontWeight: '700',
    marginTop: 8,
  },
  detail: {
    color: '#62798B',
    fontSize: 13,
    marginTop: 8,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#DCE8F1',
    marginTop: 12,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  price: {
    color: '#2878B9',
    fontWeight: '800',
  },
  button: {
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: '#2878B9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  backText: {
    color: '#62798B',
  },
  errorText: {
    color: '#B42318',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    padding: 8,
  },
  retryText: {
    color: '#2878B9',
    fontWeight: '700',
  },
  payButton: {
  backgroundColor: '#2878B9',
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 8,
},

payButtonText: {
  color: '#FFFFFF',
  fontWeight: '700',
  fontSize: 13,
},
});
