
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BookingSettingsNotice } from '../components/booking-settings-notice';
import { usePublicSettings } from '../hooks/use-public-settings';

const destinations = [
  {
    city: 'Hồ Chí Minh',
    code: 'SGN',
    country: 'Việt Nam',
    emoji: '🏙️',
  },
  {
    city: 'Hà Nội',
    code: 'HAN',
    country: 'Việt Nam',
    emoji: '🏯',
  },
  {
    city: 'Hong Kong',
    code: 'HKG',
    country: 'Trung Quốc',
    emoji: '🌃',
  },
  {
    city: 'Singapore',
    code: 'SIN',
    country: 'Singapore',
    emoji: '🌴',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const settingsQuery = usePublicSettings();
  const settings = settingsQuery.data;

  const openSearch = () => {
    // Chuyển đến màn hình tìm kiếm.
    // Nếu route tìm kiếm của bạn có tên khác,
    // hãy sửa đường dẫn bên dưới cho khớp.
    router.push('/explore');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <BookingSettingsNotice
          settings={settings}
          error={settingsQuery.isError ? 'Không tải được cài đặt.' : undefined}
        />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào! 👋</Text>
            <Text style={styles.headerTitle}>
              Bạn muốn đi đâu?
            </Text>
          </View>

          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push('/profile')}
            accessibilityLabel="Mở hồ sơ"
          >
            <Text style={styles.avatarText}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerLabel}>
              {(settings?.siteName || 'KHÁM PHÁ THẾ GIỚI').toUpperCase()}
            </Text>

            <Text style={styles.bannerTitle}>
              Chuyến đi mới,{'\n'}trải nghiệm mới
            </Text>

            <Text style={styles.bannerDescription}>
              Bắt đầu hành trình của bạn ngay hôm nay.
            </Text>
          </View>

          <Text style={styles.bannerPlane}>✈️</Text>
        </View>

        {/* Search card */}
        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>
            Tìm chuyến bay
          </Text>

          <View style={styles.routeBox}>
            <View style={styles.airport}>
              <Text style={styles.fieldLabel}>ĐIỂM KHỞI HÀNH</Text>
              <Text style={styles.airportCode}>SGN</Text>
              <Text style={styles.airportCity}>
                Hồ Chí Minh
              </Text>
            </View>

            <View style={styles.swapCircle}>
              <Text style={styles.swapText}>⇄</Text>
            </View>

            <View style={[styles.airport, styles.destinationAirport]}>
              <Text style={styles.fieldLabel}>ĐIỂM ĐẾN</Text>
              <Text style={styles.airportCode}>HKG</Text>
              <Text style={styles.airportCity}>Hong Kong</Text>
            </View>
          </View>

          <View style={styles.dateBox}>
            <Text style={styles.dateIcon}>📅</Text>
            <View>
              <Text style={styles.fieldLabel}>NGÀY KHỞI HÀNH</Text>
              <Text style={styles.dateText}>
                Chọn ngày bay trong màn hình tìm kiếm
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.searchButton}
            onPress={openSearch}
            activeOpacity={0.85}
          >
            <Text style={styles.searchButtonText}>
              ✈  Tìm chuyến bay
            </Text>
          </TouchableOpacity>
        </View>

        {/* Destinations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Điểm đến nổi bật
          </Text>

          <Text style={styles.sectionSubtitle}>
            Khám phá hành trình tiếp theo
          </Text>
        </View>

        <View style={styles.destinationGrid}>
          {destinations.map((item) => (
            <TouchableOpacity
              key={item.code}
              style={styles.destinationCard}
              onPress={openSearch}
              activeOpacity={0.8}
            >
              <View style={styles.destinationImage}>
                <Text style={styles.destinationEmoji}>
                  {item.emoji}
                </Text>
              </View>

              <Text style={styles.destinationCity}>
                {item.city}
              </Text>

              <Text style={styles.destinationCountry}>
                {item.country}
              </Text>

              <Text style={styles.destinationCode}>
                {item.code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Booking history */}
        <TouchableOpacity
          style={styles.historyCard}
          onPress={() => router.push('/booking-history')}
          activeOpacity={0.8}
        >
          <View style={styles.historyIcon}>
            <Text style={{ fontSize: 24 }}>🎫</Text>
          </View>

          <View style={styles.historyTextContainer}>
            <Text style={styles.historyTitle}>
              Lịch sử đặt vé
            </Text>
            <Text style={styles.historyDescription}>
              Theo dõi các chuyến bay đã đặt của bạn
            </Text>
          </View>

          <Text style={styles.historyArrow}>›</Text>
        </TouchableOpacity>

        {settings &&
          Boolean(settings.supportEmail || settings.supportPhone) && (
          <View style={styles.supportCard}>
            <Text style={styles.supportTitle}>Hỗ trợ khách hàng</Text>
            {settings.supportPhone ? (
              <Text style={styles.supportText}>
                Điện thoại: {settings.supportPhone}
              </Text>
            ) : null}
            {settings.supportEmail ? (
              <Text style={styles.supportText}>
                Email: {settings.supportEmail}
              </Text>
            ) : null}
          </View>
        )}

        <Text style={styles.footer}>
          {settings?.siteName || 'Flight Booking'} · Đồng hành cùng mọi hành trình
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  greeting: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 5,
  },
  headerTitle: {
    color: '#142B4A',
    fontSize: 25,
    fontWeight: '800',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCEBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  banner: {
    backgroundColor: '#1769D2',
    borderRadius: 22,
    padding: 20,
    minHeight: 180,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 22,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerLabel: {
    color: '#CFE5FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 31,
  },
  bannerDescription: {
    color: '#E6F1FF',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
    maxWidth: 220,
  },
  bannerPlane: {
    fontSize: 55,
    marginLeft: 4,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 17,
    marginBottom: 27,
    borderWidth: 1,
    borderColor: '#E6ECF4',
  },
  sectionTitle: {
    color: '#142B4A',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 16,
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFF',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2EAF5',
  },
  airport: {
    flex: 1,
  },
  destinationAirport: {
    alignItems: 'flex-end',
  },
  fieldLabel: {
    color: '#7A8BA3',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  airportCode: {
    color: '#1769D2',
    fontSize: 27,
    fontWeight: '800',
  },
  airportCity: {
    color: '#334155',
    fontSize: 12,
    marginTop: 3,
  },
  swapCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E0ECFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  swapText: {
    color: '#1769D2',
    fontSize: 22,
    fontWeight: '700',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 6,
  },
  dateIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  dateText: {
    color: '#334155',
    fontSize: 12,
  },
  searchButton: {
    backgroundColor: '#1769D2',
    borderRadius: 13,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    color: '#718096',
    fontSize: 13,
    marginTop: -8,
  },
  destinationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  destinationCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E6ECF4',
  },
  destinationImage: {
    height: 85,
    borderRadius: 12,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  destinationEmoji: {
    fontSize: 39,
  },
  destinationCity: {
    color: '#142B4A',
    fontSize: 14,
    fontWeight: '800',
  },
  destinationCountry: {
    color: '#7A8BA3',
    fontSize: 12,
    marginTop: 4,
  },
  destinationCode: {
    color: '#1769D2',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E6ECF4',
  },
  historyIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  historyTitle: {
    color: '#142B4A',
    fontSize: 15,
    fontWeight: '800',
  },
  historyDescription: {
    color: '#718096',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 17,
  },
  historyArrow: {
    color: '#1769D2',
    fontSize: 30,
    marginLeft: 8,
  },
  footer: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 25,
  },
  supportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderColor: '#E2EAF5',
    borderWidth: 1,
    marginBottom: 18,
    padding: 15,
  },
  supportTitle: {
    color: '#142B4A',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  supportText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 3,
  },
});
