import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  InfoRow,
  PremiumCard,
  PrimaryButton,
  RouteLine,
  SecondaryButton,
  SectionLabel,
  StateHero,
  TextLink,
  TicketDivider,
} from '@/components/premium-ui';
import { PremiumPalette } from '@/constants/theme';
import { getMyBookings, type BookingHistoryItem } from '../../services/api';
import { getSavedToken } from '../../services/authStorage';
import { cacheOfflineTicket } from '../../services/offlineTickets';
import { getBookingItinerary } from '../../services/bookingItinerary';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; (async () => {
    try {
      const token = await getSavedToken();
      if (!token) throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
      const result = await getMyBookings(token);
      const item = result.data.find(b => b._id === bookingId);
      if (!item) throw new Error('Không tìm thấy vé trong lịch sử đặt chỗ.');
      if (item.paymentStatus !== 'paid' || item.bookingStatus !== 'confirmed') throw new Error('Máy chủ chưa xác nhận thanh toán. Hãy tải lại sau ít giây.');
      let cacheWarning = '';
      try {
        await cacheOfflineTicket(item);
      } catch {
        cacheWarning = 'Vé đã xác nhận nhưng không thể lưu bản xem offline trên thiết bị.';
      }
      if (active) {
        setBooking(item);
        setError(cacheWarning);
      }
    } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Không thể xác minh vé.'); }
    finally { if (active) setLoading(false); }
  })(); return () => { active = false; }; }, [bookingId]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PremiumPalette.sky} />
        <Text style={s.muted}>Đang xác minh thanh toán từ máy chủ…</Text>
      </View>
    );
  }

  const itinerary = booking ? getBookingItinerary(booking) : [];

  return (
    <ScrollView contentContainerStyle={s.container}>
      <StateHero
        glyph={booking ? '✓' : '!'}
        tone={booking ? 'success' : 'warning'}
        title={booking ? 'Đặt vé thành công!' : 'Chưa thể xác nhận vé'}
        body={booking ? 'Thanh toán đã được máy chủ xác nhận.' : error}
      >
        {booking && error ? <Text style={s.warning}>{error}</Text> : null}
        {booking && !error ? <Text style={s.hint}>Vé đã được lưu để xem offline.</Text> : null}
      </StateHero>

      {booking && (
        <PremiumCard style={s.ticket}>
          <SectionLabel>MÃ ĐẶT CHỖ CHUNG</SectionLabel>
          <Text style={s.pnr}>{booking.bookingCode}</Text>
          {itinerary.map((leg, index) => (
            <View key={`${leg.flight.flightNumber}-${index}`} style={{ marginTop: 16 }}>
              <Text style={s.legLabel}>CHẶNG {index + 1} · {leg.flight.flightNumber}</Text>
              <RouteLine
                from={leg.flight.origin?.code}
                to={leg.flight.destination?.code}
                fromCity={leg.flight.origin?.city}
                toCity={leg.flight.destination?.city}
              />
              <InfoRow label="Ghế" value={leg.seats.join(', ') || 'Chưa chọn'} />
            </View>
          ))}
          <TicketDivider />
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Tổng đã thanh toán</Text>
            <Text style={s.total}>{Number(booking.pricing.total).toLocaleString('vi-VN')} {booking.pricing.currency}</Text>
          </View>
        </PremiumCard>
      )}

      <View style={s.actions}>
        {booking && (
          <PrimaryButton
            label="Xem vé điện tử & QR"
            onPress={() => router.push({ pathname: '/booking/ticket', params: { bookingId: booking._id } })}
          />
        )}
        <SecondaryButton label="Lịch sử đặt vé" onPress={() => router.replace('/booking-history')} />
        <TextLink label="Về trang chủ" onPress={() => router.replace('/')} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingBottom: 40, backgroundColor: PremiumPalette.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: PremiumPalette.canvas },
  muted: { color: PremiumPalette.muted, textAlign: 'center', marginTop: 12, lineHeight: 21 },
  hint: { color: PremiumPalette.muted, textAlign: 'center', marginTop: 10, fontSize: 12 },
  warning: { color: '#B45309', textAlign: 'center', marginTop: 10, lineHeight: 20, fontSize: 12 },
  ticket: { width: '100%', maxWidth: 520, marginTop: 24 },
  pnr: { fontSize: 30, fontWeight: '900', color: PremiumPalette.sky, letterSpacing: 2 },
  legLabel: { color: PremiumPalette.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  totalLabel: { color: PremiumPalette.muted, fontSize: 13 },
  total: { color: PremiumPalette.navy, fontSize: 20, fontWeight: '900' },
  actions: { width: '100%', maxWidth: 520, gap: 10, marginTop: 22 },
});
