
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
  ImageBackground,
} from 'react-native';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getMyBookings,
  getBookingPaymentInfo,
  createVnpayPayment,
  type BookingPaymentInfo,
} from '../../services/api';
import { usePublicSettings } from '../../hooks/use-public-settings';
import { getSavedToken } from '../../services/authStorage';
import { getRemainingSeconds } from '../../services/bookingTime';

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  } catch {
    return `${Number(value || 0).toLocaleString('vi-VN')} ${currency}`;
  }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds,
  ).padStart(2, '0')}`;
}

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export default function PaymentScreen() {
  const router = useRouter();
  const { data: settings } = usePublicSettings();
  const { bookingId, gatewayStatus } = useLocalSearchParams<{
    bookingId: string;
    gatewayStatus?: string;
  }>();

  const [booking, setBooking] = useState<BookingPaymentInfo | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');
  const [checkingExpiry, setCheckingExpiry] = useState(false);
  const [expiryCheckError, setExpiryCheckError] = useState('');

  const applyPaymentStatus = useCallback(
    (latestBooking: BookingPaymentInfo) => {
      setBooking(latestBooking);

      if (latestBooking.paymentStatus === 'paid') {
        if (latestBooking.bookingStatus === 'confirmed') {
          router.replace({
            pathname: '/booking/success',
            params: { bookingId: latestBooking.id },
          } as any);
        } else {
          showMessage(
            'Cần đối soát giao dịch',
            'VNPay đã ghi nhận thanh toán nhưng booking chưa thể xác nhận. Vui lòng liên hệ hỗ trợ và cung cấp mã đặt vé.',
          );
        }
        return true;
      }

      if (
        latestBooking.paymentStatus === 'failed' ||
        latestBooking.bookingStatus === 'cancelled'
      ) {
        router.replace({
          pathname: '/booking/failed',
          params: { bookingId: latestBooking.id },
        } as any);
        return true;
      }

      return false;
    },
    [router],
  );

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      setError('Không tìm thấy mã booking.');
      setLoading(false);
      return;
    }

    try {
      const result = await getBookingPaymentInfo(bookingId);

      applyPaymentStatus(result);
      setRemaining(getRemainingSeconds(result.expiresAt));
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải thông tin booking.',
      );
    } finally {
      setLoading(false);
    }
  }, [applyPaymentStatus, bookingId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadBooking();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadBooking, gatewayStatus]);

  useEffect(() => {
    if (!booking?.expiresAt || booking.bookingStatus !== 'pending') {
      return;
    }

    const timer = setInterval(() => {
      setRemaining(getRemainingSeconds(booking.expiresAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [booking?.expiresAt, booking?.bookingStatus]);

  // The bookings endpoint marks overdue pending bookings as expired.
  useEffect(() => {
    if (
      remaining === 0 &&
      booking?.bookingStatus === 'pending' &&
      booking.paymentStatus === 'pending'
    ) {
      let active = true;

      const refreshExpiredBooking = async () => {
        setCheckingExpiry(true);
        setExpiryCheckError('');

        try {
          const token = await getSavedToken();

          if (!token) {
            throw new Error('Phiên đăng nhập đã hết hạn.');
          }

          const result = await getMyBookings(token);
          const latestBooking = result.data.find(
            (item) => item._id === booking.id,
          );

          if (active && latestBooking) {
            setBooking((current) =>
              current
                ? {
                    ...current,
                    bookingStatus: latestBooking.bookingStatus,
                    paymentStatus: latestBooking.paymentStatus,
                  }
                : current,
            );
          } else if (active) {
            setExpiryCheckError(
              'Không tìm thấy trạng thái mới của booking trong lịch sử.',
            );
          }
        } catch (checkError) {
          if (active) {
            setExpiryCheckError(
              checkError instanceof Error
                ? checkError.message
                : 'Không thể cập nhật trạng thái booking.',
            );
          }
        } finally {
          if (active) {
            setCheckingExpiry(false);
          }
        }
      };

      void refreshExpiredBooking();

      return () => {
        active = false;
      };
    }

    return undefined;
  }, [
    remaining,
    booking?.bookingStatus,
    booking?.paymentStatus,
    booking?.id,
  ]);

  const handleVnpayPayment = async () => {
    if (!booking || paying) return;
    setPaymentNotice('');

    if (booking.bookingStatus !== 'pending') {
      showMessage('Thông báo', 'Booking không còn chờ thanh toán.');
      return;
    }

    if (remaining <= 0) {
      await loadBooking();
      showMessage('Hết hạn', 'Booking đã hết thời gian thanh toán.');
      return;
    }

    let paymentWindow: Window | null = null;
    if (Platform.OS === 'web') {
      paymentWindow = window.open('about:blank', '_blank');
      if (!paymentWindow) {
        showMessage(
          'Cần cho phép cửa sổ bật lên',
          'Trình duyệt đang chặn cửa sổ thanh toán. Hãy cho phép cửa sổ bật lên cho trang này rồi thử lại.',
        );
        return;
      }
    }

    try {
      setPaying(true);
      const redirectUrl =
        Platform.OS === 'web'
          ? process.env.EXPO_PUBLIC_VNPAY_WEB_RETURN_URL ||
            new URL('/booking/payment', window.location.origin).toString()
          : process.env.EXPO_PUBLIC_VNPAY_CLIENT_RETURN_URL ||
            ExpoLinking.createURL('booking/payment');
      const { data } = await createVnpayPayment(booking.id, redirectUrl);

      if (Platform.OS === 'web') {
        if (!paymentWindow || paymentWindow.closed) {
          throw new Error('Cửa sổ thanh toán đã bị đóng trước khi mở VNPay.');
        }
        paymentWindow.location.href = data.paymentUrl;

        const deadline =
          Date.now() +
          Math.min(5 * 60 * 1000, Math.max(60 * 1000, (remaining + 30) * 1000));
        let latestBooking = booking;
        while (Date.now() < deadline) {
          latestBooking = await getBookingPaymentInfo(booking.id);
          if (applyPaymentStatus(latestBooking)) {
            if (!paymentWindow.closed) paymentWindow.close();
            return;
          }
          if (paymentWindow.closed) break;
          await wait(3000);
        }

        latestBooking = await getBookingPaymentInfo(booking.id);
        setBooking(latestBooking);
        if (
          latestBooking.paymentStatus === 'pending' &&
          latestBooking.bookingStatus === 'pending'
        ) {
          showMessage(
            'Đang chờ xác nhận',
            'Trang thanh toán VNPay được mở ở cửa sổ riêng. Nếu bạn đã hoàn tất giao dịch, hãy giữ trang này mở để hệ thống cập nhật trạng thái.',
          );
        } else {
          applyPaymentStatus(latestBooking);
        }
        return;
      }

      const authSessionPromise = WebBrowser.openAuthSessionAsync(
        data.paymentUrl,
        redirectUrl,
      );
      const result = await authSessionPromise;
      const statusCheckAttempts = result.type === 'success' ? 12 : 1;
      let latestBooking: BookingPaymentInfo | null = null;

      for (let attempt = 0; attempt < statusCheckAttempts; attempt += 1) {
        latestBooking = await getBookingPaymentInfo(booking.id);
        if (
          latestBooking.paymentStatus !== 'pending' ||
          latestBooking.bookingStatus !== 'pending'
        ) {
          break;
        }
        if (attempt + 1 < statusCheckAttempts) {
          await wait(1500);
        }
      }

      if (latestBooking) {
        if (applyPaymentStatus(latestBooking)) return;
        if (result.type === 'success') {
          setPaymentNotice(
            'Bạn đã quay lại từ VNPay. Máy chủ chưa xác nhận giao dịch; hãy kiểm tra lại trạng thái sau ít giây.',
          );
        } else {
          setPaymentNotice(
            'Bạn đã đóng trang VNPay. Nếu đã thanh toán, hãy kiểm tra lại trạng thái sau ít giây.',
          );
        }
        setBooking(latestBooking);
      } else {
        await loadBooking();
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Không thể khởi tạo giao dịch VNPay.';

      if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
      showMessage('Thanh toán VNPay', message);
      await loadBooking();
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2878B9" />
        <Text style={styles.muted}>Đang tải thông tin thanh toán...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || 'Không tìm thấy booking.'}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/booking-history' as any)}
        >
          <Text style={styles.primaryButtonText}>Về lịch sử đặt vé</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const flight = booking.flight;
  const returnFlight = booking.returnFlight;
  const outboundPricing = booking.pricing.outbound;
  const returnPricing = booking.pricing.return;
  const isPending =
    booking.bookingStatus === 'pending' &&
    booking.paymentStatus === 'pending';

  const isPaid = booking.paymentStatus === 'paid';
  const isExpired = booking.bookingStatus === 'expired';
  const isFailed = booking.paymentStatus === 'failed';
  const currency =
    booking.pricing.currency || settings?.currency || 'VND';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <ImageBackground
        source={require('../../../assets/images/banners/hero-banner.jpg')}
        resizeMode="cover"
        style={styles.paymentHero}
        imageStyle={styles.paymentHeroArtwork}
      >
        <View style={styles.paymentHeroShade} />
        <Text style={styles.paymentHeroLabel}>THANH TOÁN AN TOÀN</Text>
        <Text style={styles.title}>Hoàn tất hành trình</Text>
        <Text style={styles.subtitle}>
          Kiểm tra thông tin và thanh toán
          {returnFlight ? ' cả hai chặng khứ hồi' : ' chuyến bay'} một lần.
        </Text>
        <View style={styles.sandboxBadge}>
          <Text style={styles.sandboxBadgeText}>VNPAY · SANDBOX</Text>
        </View>
      </ImageBackground>

      <View style={styles.card}>
        <Text style={styles.label}>MÃ ĐẶT VÉ</Text>
        <Text style={styles.bookingCode}>{booking.bookingCode}</Text>

        <View style={styles.divider} />

        <View style={styles.route}>
          <View>
            <Text style={styles.airport}>
              {flight?.origin?.code || '--'}
            </Text>
            <Text style={styles.muted}>
              {flight?.origin?.city || ''}
            </Text>
          </View>

          <Text style={styles.arrow}>✈</Text>

          <View style={styles.destination}>
            <Text style={styles.airport}>
              {flight?.destination?.code || '--'}
            </Text>
            <Text style={styles.muted}>
              {flight?.destination?.city || ''}
            </Text>
          </View>
        </View>

        <Text style={styles.info}>
          Chiều đi: {flight?.flightNumber || '--'}
        </Text>
        <Text style={styles.info}>
          Hãng bay: {flight?.airline?.name || '--'}
        </Text>
        <Text style={styles.info}>
          Ghế chiều đi: {booking.seats.join(', ')}
        </Text>
        {returnFlight && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Chuyến bay chiều về</Text>
            <View style={styles.route}>
              <View>
                <Text style={styles.airport}>
                  {returnFlight.origin?.code || '--'}
                </Text>
                <Text style={styles.muted}>
                  {returnFlight.origin?.city || ''}
                </Text>
              </View>
              <Text style={styles.arrow}>✈</Text>
              <View style={styles.destination}>
                <Text style={styles.airport}>
                  {returnFlight.destination?.code || '--'}
                </Text>
                <Text style={styles.muted}>
                  {returnFlight.destination?.city || ''}
                </Text>
              </View>
            </View>
            <Text style={styles.info}>
              Chuyến bay: {returnFlight.flightNumber || '--'}
            </Text>
            <Text style={styles.info}>
              Hãng bay: {returnFlight.airline?.name || '--'}
            </Text>
            <Text style={styles.info}>
              Ghế chiều về: {booking.returnSeats?.join(', ') || '--'}
            </Text>
          </>
        )}
        <Text style={styles.info}>
          Hành khách: {booking.passengers.length}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>

        {outboundPricing ? (
          <>
            <View style={styles.priceRow}>
              <Text>Vé chiều đi</Text>
              <Text>{formatMoney(outboundPricing.baseFare, currency)}</Text>
            </View>
            {returnPricing && (
              <View style={styles.priceRow}>
                <Text>Vé chiều về</Text>
                <Text>{formatMoney(returnPricing.baseFare, currency)}</Text>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text>Ghế chiều đi</Text>
              <Text>{formatMoney(outboundPricing.seatFee, currency)}</Text>
            </View>
            {returnPricing && (
              <View style={styles.priceRow}>
                <Text>Ghế chiều về</Text>
                <Text>{formatMoney(returnPricing.seatFee, currency)}</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.priceRow}>
              <Text>Giá vé cơ bản</Text>
              <Text>{formatMoney(booking.pricing.baseFare, currency)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text>Phụ phí ghế</Text>
              <Text>{formatMoney(booking.pricing.seatFee, currency)}</Text>
            </View>
          </>
        )}

        <View style={styles.priceRow}>
          <Text>Hành lý ký gửi</Text>
          <Text>{formatMoney(booking.pricing.baggageFee, currency)}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text>Bảo hiểm</Text>
          <Text>{formatMoney(booking.pricing.protectionFee, currency)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.priceRow}>
          <Text style={styles.totalLabel}>Tổng thanh toán</Text>
          <Text style={styles.total}>
            {formatMoney(booking.pricing.total, currency)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Trạng thái booking</Text>

        <Text style={styles.info}>
          Đặt vé: {booking.bookingStatus}
        </Text>
        <Text style={styles.info}>
          Thanh toán: {booking.paymentStatus}
        </Text>

        {isPending && (
          <>
            <Text style={styles.timerLabel}>Thời gian còn lại</Text>
            <Text
              style={[
                styles.timer,
                remaining <= 60 && styles.timerWarning,
              ]}
            >
              {formatTime(remaining)}
            </Text>
            <Text style={styles.muted}>
              {remaining > 0
                ? 'Vui lòng hoàn tất thanh toán trước khi hết giờ.'
                : 'Booking đã hết thời gian thanh toán.'}
            </Text>
            {remaining === 0 && (
              <Text style={styles.muted}>
                {checkingExpiry
                  ? 'Đang kiểm tra trạng thái hết hạn...'
                  : expiryCheckError ||
                    'Đã hết thời gian. Hãy tải lại trạng thái booking.'}
              </Text>
            )}
          </>
        )}

        {isPaid && booking.bookingStatus === 'confirmed' && (
          <Text style={styles.success}>
            ✓ Thanh toán thành công. Vé của bạn đã được xác nhận.
          </Text>
        )}

        {isPaid && booking.bookingStatus !== 'confirmed' && (
          <Text style={styles.error}>
            VNPay đã ghi nhận thanh toán nhưng booking chưa thể xác nhận. Vui lòng liên hệ hỗ trợ và cung cấp mã đặt vé này để được đối soát hoặc hoàn tiền.
          </Text>
        )}

        {isExpired && (
          <Text style={styles.error}>
            Booking đã hết thời gian thanh toán.
          </Text>
        )}

        {!isExpired && isFailed && (
          <Text style={styles.error}>
            Thanh toán thất bại. Booking đã bị hủy.
          </Text>
        )}

        {booking.bookingStatus === 'cancelled' && !isFailed && !isPaid && (
          <Text style={styles.error}>Booking đã bị hủy.</Text>
        )}
      </View>

      {isPending && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thanh toán VNPay Sandbox</Text>
          <Text style={styles.muted}>
            Cổng VNPay Sandbox sẽ mở trong trình duyệt. Sau khi thanh toán, hãy quay lại ứng dụng để kiểm tra trạng thái. Giao dịch thử nghiệm không trừ tiền thật.
          </Text>
          {!!paymentNotice && (
            <>
              <Text style={styles.info}>{paymentNotice}</Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => void loadBooking()}
              >
                <Text style={styles.secondaryButtonText}>
                  Kiểm tra lại trạng thái
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (paying || remaining <= 0) && styles.disabled,
            ]}
            disabled={paying || remaining <= 0}
            onPress={handleVnpayPayment}
          >
            {paying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {returnFlight
                  ? 'Thanh toán cả hai chặng qua VNPay'
                  : 'Thanh toán qua VNPay'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.replace('/booking-history' as any)}
      >
        <Text style={styles.secondaryButtonText}>
          Xem lịch sử đặt vé
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  paymentHero: {
    minHeight: 205,
    borderRadius: 22,
    overflow: 'hidden',
    padding: 20,
    justifyContent: 'center',
    marginBottom: 16,
  },
  paymentHeroArtwork: {
    borderRadius: 22,
  },
  paymentHeroShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(12, 39, 62, 0.66)',
  },
  paymentHeroLabel: {
    color: '#E9CC8E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  sandboxBadge: {
    alignSelf: 'flex-start',
    borderColor: 'rgba(234, 244, 252, 0.55)',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  sandboxBadgeText: {
    color: '#EAF4FC',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F7FAFC',
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    color: '#EAF4FC',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DCE8F1',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#62798B',
  },
  bookingCode: {
    fontSize: 21,
    fontWeight: '800',
    color: '#2878B9',
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#DCE8F1',
    marginVertical: 15,
  },
  route: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  airport: {
    fontSize: 25,
    fontWeight: '800',
    color: '#123B5D',
  },
  destination: {
    alignItems: 'flex-end',
  },
  arrow: {
    fontSize: 23,
    color: '#2878B9',
  },
  muted: {
    color: '#62798B',
    fontSize: 13,
    marginTop: 4,
  },
  info: {
    color: '#526C80',
    marginTop: 9,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#123B5D',
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 7,
    gap: 12,
  },
  totalLabel: {
    fontWeight: '800',
    color: '#123B5D',
  },
  total: {
    fontSize: 19,
    fontWeight: '800',
    color: '#2878B9',
  },
  timerLabel: {
    textAlign: 'center',
    color: '#62798B',
    marginTop: 20,
  },
  timer: {
    textAlign: 'center',
    fontSize: 39,
    fontWeight: '900',
    color: '#D97706',
    marginVertical: 8,
  },
  timerWarning: {
    color: '#DC2626',
  },
  success: {
    color: '#15803D',
    fontWeight: '700',
    marginTop: 12,
  },
  error: {
    color: '#DC2626',
    fontWeight: '600',
    marginVertical: 12,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2878B9',
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 16,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    padding: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2878B9',
    fontWeight: '700',
  },
});
