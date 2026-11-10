import '../global.css';

import { Stack } from 'expo-router';
import QueryProvider from '../providers/QueryProvider';
import AppProviders from '../providers/AppProviders';
import FloatingAIChatButton from '../components/FloatingAIChatButton';
import { View } from 'react-native';


function AppNavigator() {
  return (
  <View style={{ flex: 1 }}>
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#123B5D',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 16,
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: {
          backgroundColor: '#F7FAFC',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Flight Booking', headerShown: false }}
      />

      <Stack.Screen name="login" options={{ title: 'Đăng nhập' }} />
      <Stack.Screen name="register" options={{ title: 'Đăng ký' }} />
      <Stack.Screen name="explore" options={{ title: 'Tìm chuyến bay' }} />
      <Stack.Screen name="flights/[id]" options={{ title: 'Chi tiết chuyến bay' }} />
      <Stack.Screen name="profile" options={{ title: 'Hồ sơ' }} />
      <Stack.Screen name="booking-history" options={{ title: 'Lịch sử đặt vé' }} />
      <Stack.Screen name="booking/success" options={{ title: 'Đặt vé thành công' }} />
      <Stack.Screen name="booking/failed" options={{ title: 'Thanh toán thất bại' }} />
      <Stack.Screen name="booking/ticket" options={{ title: 'Vé điện tử' }} />
      <Stack.Screen name="booking/detail" options={{ title: 'Chi tiết đặt vé' }} />
      <Stack.Screen name="booking/seats" options={{ title: 'Chọn ghế' }} />
      <Stack.Screen name="booking/passenger" options={{ title: 'Thông tin hành khách' }} />
      <Stack.Screen name="tracker" options={{ title: 'Theo dõi chuyến bay' }} />
      <Stack.Screen name="notifications" options={{ title: 'Thông báo' }} />

      <Stack.Screen
        name="ai-assistant"
        options={{
          title: 'AI Flight Assistant',
          headerStyle: { backgroundColor: '#123B5D' },
          headerTintColor: '#FFFFFF',
        }}
      />
    </Stack>

    <FloatingAIChatButton />
  </View>
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