import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  InfoRow,
  PremiumCard,
  PrimaryButton,
  RouteLine,
  SectionLabel,
  StatusPill,
  TextLink,
  TicketDivider,
  screenPadding,
  type StatusTone,
} from '@/components/premium-ui';
import { PremiumPalette } from '@/constants/theme';
import { getMyBookings, type BookingHistoryItem } from '../../services/api';
import { getSavedToken } from '../../services/authStorage';
import { getBookingItinerary } from '../../services/bookingItinerary';

const bookingLabel: Record<string, { label: string; tone: StatusTone }> = {
  confirmed: { label: 'Đã xác nhận', tone: 'success' },
  pending: { label: 'Chờ xử lý', tone: 'warning' },
  cancelled: { label: 'Đã hủy', tone: 'danger' },
  expired: { label: 'Đã hết hạn', tone: 'neutral' },
};
const paymentLabel: Record<string, { label: string; tone: StatusTone }> = {
  paid: { label: 'Đã thanh toán', tone: 'success' },
  pending: { label: 'Chờ thanh toán', tone: 'warning' },
  failed: { label: 'Thanh toán thất bại', tone: 'danger' },
  refunded: { label: 'Đã hoàn tiền', tone: 'info' },
};

export default function BookingDetailScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      try {
        const token = await getSavedToken();
        if (!token) throw new Error('Vui lòng đăng nhập.');
        const result = await getMyBookings(token);
        const found = result.data.find((item) => item._id === bookingId);
        if (!found) throw new Error('Không tìm thấy booking.');
        if (active) setBooking(found);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Không thể tải booking.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [bookingId]));

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={PremiumPalette.sky} />
        <Text style={s.muted}>Đang tải booking…</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>{error}</Text>
        <TextLink label="Quay lại" onPress={() => router.replace('/booking-history')} />
      </View>
    );
  }

  const itinerary = getBookingItinerary(booking);
  const bs = bookingLabel[booking.bookingStatus] ?? { label: booking.bookingStatus, tone: 'neutral' as StatusTone };
  const ps = paymentLabel[booking.paymentStatus] ?? { label: booking.paymentStatus, tone: 'neutral' as StatusTone };

  return (
    <ScrollView contentContainerStyle={[s.container, screenPadding]}>
      <PremiumCard>
        <SectionLabel>MÃ ĐẶT CHỖ CHUNG</SectionLabel>
        <Text style={s.pnr}>{booking.bookingCode}</Text>
        <View style={s.pills}>
          <StatusPill label={bs.label} tone={bs.tone} />
          <StatusPill label={ps.label} tone={ps.tone} />
        </View>

        {itinerary.map((leg, index) => (
          <View key={`${leg.flight.flightNumber}-${index}`} style={{ marginTop: 22 }}>
            <Text style={s.legLabel}>CHẶNG {index + 1} · {leg.flight.flightNumber || '--'}</Text>
            <RouteLine
              from={leg.flight.origin?.code}
              to={leg.flight.destination?.code}
              fromCity={leg.flight.origin?.city}
              toCity={leg.flight.destination?.city}
            />
            <View style={{ marginTop: 10 }}>
              <InfoRow
                label="Khởi hành"
                value={leg.flight.departureAt ? new Date(leg.flight.departureAt).toLocaleString('vi-VN') : '--'}
              />
              <InfoRow label="Ghế" value={leg.seats.join(', ') || 'Chưa chọn'} />
            </View>
          </View>
        ))}

        <TicketDivider />
        <InfoRow
          label="Hành khách"
          value={booking.passengers.map((passenger) => `${passenger.firstName} ${passenger.lastName}`).join(', ')}
        />
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Tổng cộng</Text>
          <Text style={s.total}>{Number(booking.pricing.total).toLocaleString('vi-VN')} {booking.pricing.currency}</Text>
        </View>
      </PremiumCard>

      <View style={s.actions}>
        {booking.paymentStatus === 'paid' && booking.bookingStatus === 'confirmed' && (
          <PrimaryButton
            label="Mở vé điện tử / QR"
            onPress={() => router.push({ pathname: '/booking/ticket', params: { bookingId: booking._id } })}
          />
        )}
        {booking.bookingStatus === 'pending' && booking.paymentStatus === 'pending' && (
          <PrimaryButton
            label="Tiếp tục thanh toán"
            onPress={() => router.push({ pathname: '/booking/payment', params: { bookingId: booking._id } })}
          />
        )}
      </View>
      <Text style={s.note}>
        Hủy/đổi vé chỉ khả dụng khi backend cung cấp API và chính sách tương ứng. Ứng dụng không tự đổi trạng thái booking ở phía client.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: PremiumPalette.canvas, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: PremiumPalette.canvas },
  muted: { color: PremiumPalette.muted, textAlign: 'center', marginTop: 10 },
  pnr: { fontSize: 30, fontWeight: '900', color: PremiumPalette.sky, letterSpacing: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  legLabel: { color: PremiumPalette.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 12 },
  totalLabel: { color: PremiumPalette.muted, fontSize: 13 },
  total: { color: PremiumPalette.navy, fontSize: 22, fontWeight: '900' },
  actions: { gap: 10, marginTop: 16 },
  note: { fontSize: 12, color: PremiumPalette.muted, lineHeight: 18, marginTop: 18 },
});
