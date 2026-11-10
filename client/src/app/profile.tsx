import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  clearAuthData,
  getSavedUser,
  type CurrentUser,
} from '../services/authStorage';
import { usePublicSettings } from '../hooks/use-public-settings';

export default function ProfileScreen() {
  const router = useRouter();
  const { data: settings } = usePublicSettings();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadProfile = async () => {
        try {
          const savedUser = await getSavedUser();

          if (!active) return;

          setUser(savedUser);

          if (!savedUser) {
            router.replace('/login');
          }
        } catch (error) {
          console.error('Không thể tải hồ sơ:', error);
          showMessage('Lỗi', 'Không thể tải thông tin tài khoản.');
        } finally {
          if (active) setLoading(false);
        }
      };

      void loadProfile();

      return () => {
        active = false;
      };
    }, [router]),
  );

  const handleLogout = async () => {
    try {
      await clearAuthData();
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
      showMessage('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2878B9" />
        <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Vui lòng đăng nhập để xem hồ sơ.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.buttonText}>Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
    >
      <View style={styles.profileHero}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {user.fullName?.trim().charAt(0).toUpperCase() || 'S'}
          </Text>
        </View>
        <Text style={styles.title}>Hồ sơ khách hàng</Text>
        <Text style={styles.subtitle}>
          Quản lý thông tin tài khoản của bạn.
        </Text>
      </View>

      <Text style={styles.label}>Họ và tên</Text>
      <TextInput
        style={styles.input}
        value={user.fullName ?? ''}
        editable={false}
      />

      <Text style={styles.label}>Email tài khoản</Text>
      <TextInput
        style={[styles.input, styles.readOnly]}
        value={user.email ?? ''}
        editable={false}
      />
      <Text style={styles.hint}>
        Email được liên kết với tài khoản đăng nhập.
      </Text>

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

      <Text style={styles.label}>Số điện thoại</Text>
      <TextInput
        style={styles.input}
        value={user.phone ?? 'Chưa cập nhật'}
        editable={false}
      />

      <TouchableOpacity style={styles.button} onPress={() => router.push('/tracker')}>
        <Text style={styles.buttonText}>Theo dõi chuyến bay</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/notifications')}>
        <Text style={styles.buttonText}>Thông báo</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/booking-history')}
      >
        <Text style={styles.buttonText}>
          Xem lịch sử đặt vé
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.backText}>← Về trang chủ</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: '#F5F8FC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#62798B',
  },
  profileHero: {
    alignItems: 'center',
    backgroundColor: '#123B5D',
    borderRadius: 26,
    padding: 26,
    marginBottom: 24,
    shadowColor: '#123B5D',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 5,
  },
  avatarCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4FC',
    borderWidth: 3,
    borderColor: '#D6AD60',
    marginBottom: 12,
  },
  avatarInitial: {
    color: '#123B5D',
    fontSize: 30,
    fontWeight: '800',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    color: '#EAF4FC',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#526C80',
    marginBottom: 8,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#DCE8F1',
    borderRadius: 13,
    paddingHorizontal: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#123B5D',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  readOnly: {
    backgroundColor: '#F8FAFC',
  },
  hint: {
    color: '#62798B',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 18,
  },
  supportCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    borderColor: '#DCE8F1',
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  supportTitle: {
    color: '#123B5D',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
  },
  supportText: {
    color: '#62798B',
    fontSize: 13,
    marginTop: 3,
  },
  button: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: '#123B5D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 11,
    shadowColor: '#123B5D',
    shadowOpacity: 0.1,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 22,
  },
  backText: {
    color: '#62798B',
  },
});
