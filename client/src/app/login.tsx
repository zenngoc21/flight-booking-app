
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { loginUser } from '../services/api';
import { saveAuthData } from '../services/authStorage';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    // Kiểm tra dữ liệu đầu vào
    if (!normalizedEmail || !password) {
      showMessage(
        'Thiếu thông tin',
        'Vui lòng nhập email và mật khẩu.',
      );
      return;
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      showMessage(
        'Email không hợp lệ',
        'Vui lòng nhập đúng định dạng email.',
      );
      return;
    }

    try {
      setLoading(true);

      console.log('Đang gửi yêu cầu đăng nhập...');

      // Gọi API đăng nhập
      const result = await loginUser({
        email: normalizedEmail,
        password,
      });

      console.log('API đăng nhập thành công');

      // Kiểm tra phản hồi từ backend
      if (!result.token || !result.user) {
        throw new Error(
          'Máy chủ không trả về token hoặc thông tin người dùng.',
        );
      }

      // Lưu phiên đăng nhập cho Web và Android/iOS
      await saveAuthData(result.token, result.user);

      console.log('Đã lưu phiên đăng nhập.');

      // Chuyển về trang chủ
      router.replace('/');
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);

      showMessage(
        'Đăng nhập thất bại',
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <ImageBackground
          source={require('../../assets/images/backgrounds/login-bg.jpg')}
          resizeMode="cover"
          style={styles.authHero}
          imageStyle={styles.authHeroArtwork}
        >
          <View style={styles.authHeroShade} />
          <Text style={styles.logo}>✈</Text>
          <Text style={styles.title}>Chào mừng trở lại!</Text>
          <Text style={styles.subtitle}>
            Đăng nhập để tiếp tục hành trình của bạn.
          </Text>
        </ImageBackground>

        <View style={styles.formCard}>
        <Text style={styles.label}>Email *</Text>

        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          returnKeyType="next"
        />

        <Text style={styles.label}>Mật khẩu *</Text>

        <TextInput
          style={styles.input}
          placeholder="Nhập mật khẩu"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          onSubmitEditing={handleLogin}
          returnKeyType="done"
        />

        <TouchableOpacity
          style={[
            styles.button,
            loading && styles.disabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Đăng nhập
            </Text>
          )}
        </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Chưa có tài khoản?{' '}
          </Text>

          <TouchableOpacity
            onPress={() => router.push('/register')}
            disabled={loading}
          >
            <Text style={styles.link}>
              Đăng ký ngay
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/')}
          disabled={loading}
        >
          <Text style={styles.backText}>
            ← Về trang chủ
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 36,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  authHero: {
    minHeight: 220,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    marginBottom: 18,
  },
  authHeroArtwork: {
    borderRadius: 22,
  },
  authHeroShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(11, 40, 63, 0.28)',
  },
  formCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE8F1',
    shadowColor: '#123B5D',
    shadowOpacity: 0.06,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  logo: {
    fontSize: 48,
    color: '#D6AD60',
    textAlign: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#EAF4FC',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#123B5D',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#DCE8F1',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    fontSize: 16,
    color: '#123B5D',
    backgroundColor: '#FFFFFF',
  },
  button: {
    minHeight: 52,
    backgroundColor: '#2878B9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#526C80',
  },
  link: {
    color: '#2878B9',
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 24,
  },
  backText: {
    color: '#62798B',
  },
});
