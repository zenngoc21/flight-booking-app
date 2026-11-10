import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { PrimaryButton, SecondaryButton, StateHero } from '@/components/premium-ui';

export default function PaymentFailedScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();

  return (
    <ScrollView contentContainerStyle={s.box}>
      <StateHero
        glyph="!"
        tone="danger"
        title="Thanh toán chưa thành công"
        body="Giao dịch chưa được xác nhận. Không thử thanh toán liên tục; hãy kiểm tra trạng thái booking trên máy chủ trước khi thử lại."
      >
        <View style={s.actions}>
          {bookingId ? (
            <PrimaryButton
              label="Kiểm tra trạng thái booking"
              onPress={() => router.replace({ pathname: '/booking/payment', params: { bookingId } })}
            />
          ) : null}
          <SecondaryButton label="Mở lịch sử đặt vé" onPress={() => router.replace('/booking-history')} />
        </View>
      </StateHero>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  box: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F7FAFC' },
  actions: { width: '100%', maxWidth: 420, gap: 10, marginTop: 26 },
});
