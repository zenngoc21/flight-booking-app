import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { PremiumCard, StatusPill, screenPadding, type StatusTone } from '@/components/premium-ui';
import { PremiumPalette } from '@/constants/theme';
import { getMyBookings, type BookingHistoryItem } from '../services/api';
import { getSavedToken } from '../services/authStorage';

function describe(b: BookingHistoryItem): { title: string; glyph: string; tone: StatusTone; pill: string } {
  const paid = b.paymentStatus === 'paid' && b.bookingStatus === 'confirmed';
  const pending = b.paymentStatus === 'pending' && b.bookingStatus === 'pending';
  if (paid) return { title: 'Đặt vé đã xác nhận', glyph: '✓', tone: 'success', pill: 'Đã xác nhận' };
  if (pending) return { title: 'Bạn cần hoàn tất thanh toán', glyph: '₫', tone: 'warning', pill: 'Chờ thanh toán' };
  if (b.bookingStatus === 'expired') return { title: 'Booking đã hết hạn', glyph: '⌛', tone: 'neutral', pill: 'Hết hạn' };
  return { title: 'Cập nhật đặt chỗ', glyph: 'i', tone: 'info', pill: 'Cập nhật' };
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<BookingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const token = await getSavedToken();
          if (!token) throw new Error('Đăng nhập để xem thông báo booking.');
          const r = await getMyBookings(token);
          if (active) setItems(r.data);
        } catch (e) {
          if (active) setError(e instanceof Error ? e.message : 'Không tải được thông báo.');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <ScrollView contentContainerStyle={[s.container, screenPadding]}>
      <Text style={s.title}>Thông báo</Text>
      <Text style={s.sub}>
        Thông báo được tổng hợp từ trạng thái booking hiện tại. Push notification và đánh dấu đã đọc cần backend/Expo Notifications bổ sung.
      </Text>
      {loading && <ActivityIndicator color={PremiumPalette.sky} style={{ marginTop: 20 }} />}
      {!!error && <Text style={s.error}>{error}</Text>}
      {items.map((b) => {
        const d = describe(b);
        return (
          <TouchableOpacity
            key={b._id}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/booking/detail', params: { bookingId: b._id } })}
          >
            <PremiumCard style={s.card}>
              <View style={[s.glyphWrap, { backgroundColor: PremiumPalette.cloud }]}>
                <Text style={s.glyph}>{d.glyph}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <StatusPill label={d.pill} tone={d.tone} />
                <Text style={s.cardTitle}>{d.title}</Text>
                <Text style={s.meta}>
                  {b.bookingCode} · {b.flight ? `${b.flight.origin.code} → ${b.flight.destination.code}` : 'Thông tin chuyến bay'}
                </Text>
                <Text style={s.meta}>
                  {b.flight?.departureAt ? new Date(b.flight.departureAt).toLocaleString('vi-VN') : 'Chưa có giờ khởi hành'}
                </Text>
              </View>
            </PremiumCard>
          </TouchableOpacity>
        );
      })}
      {!loading && !error && !items.length && <Text style={s.sub}>Bạn chưa có thông báo nào.</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: PremiumPalette.canvas, flexGrow: 1 },
  title: { fontSize: 26, fontWeight: '900', color: PremiumPalette.navy },
  sub: { fontSize: 13, color: PremiumPalette.muted, lineHeight: 19, marginTop: 6 },
  card: { marginTop: 12, flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  glyphWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 20, fontWeight: '900', color: PremiumPalette.navy },
  cardTitle: { fontSize: 15, fontWeight: '800', color: PremiumPalette.navy, marginTop: 8 },
  meta: { fontSize: 12, color: PremiumPalette.muted, lineHeight: 18, marginTop: 3 },
  error: { color: '#B91C1C', marginTop: 12 },
});
