import '../global.css';

import { Stack } from 'expo-router';
import QueryProvider from '../providers/QueryProvider';
import AppProviders from '../providers/AppProviders';

function AppNavigator() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#1D4ED8',
        headerTitleStyle: {
          fontWeight: '700',
        },
        contentStyle: {
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Flight Booking', headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Đăng nhập', headerBackTitle: 'Quay lại' }} />
      <Stack.Screen name="register" options={{ title: 'Đăng ký', headerBackTitle: 'Quay lại' }} />
      <Stack.Screen name="explore" options={{ title: 'Tìm chuyến bay' }} />
      <Stack.Screen name="flights/[id]" options={{ title: 'Chi tiết chuyến bay' }} />
      <Stack.Screen name="profile" options={{ title: 'Hồ sơ' }} />
      <Stack.Screen name="booking-history" options={{ title: 'Lịch sử đặt vé' }} />
      <Stack.Screen name="booking/success" options={{ title: 'Đặt vé thành công' }} />
      <Stack.Screen name="booking/failed" options={{ title: 'Thanh toán thất bại' }} />
      <Stack.Screen name="booking/ticket" options={{ title: 'Vé điện tử' }} />
      <Stack.Screen name="booking/detail" options={{ title: 'Chi tiết đặt vé' }} />
      <Stack.Screen name="tracker" options={{ title: 'Theo dõi chuyến bay' }} />
      <Stack.Screen name="notifications" options={{ title: 'Thông báo' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <QueryProvider>
        <AppNavigator />
      </QueryProvider>
    </AppProviders>
  );
}