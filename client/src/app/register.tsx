
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { registerUser } from '../services/api';
import { saveAuthData } from '../services/authStorage';

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleRegister = async () => {
    // Kiểm tra dữ liệu đầu vào
    if (
      !fullName.trim() ||
      !email.trim() ||
      !password
    ) {
      showMessage(
        'Thiếu thông tin',
        'Vui lòng nhập họ tên, email và mật khẩu.',
      );
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      showMessage(
        'Email không hợp lệ',
        'Vui lòng nhập đúng định dạng email.',
      );
      return;
    }

    // Kiểm tra mật khẩu
    if (password.length < 8) {
      showMessage(
        'Mật khẩu không hợp lệ',
        'Mật khẩu cần ít nhất 8 ký tự.',
      );
      return;
    }

    try {
      setLoading(true);

      // Gửi yêu cầu đăng ký đến backend
      const result = await registerUser({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        ...(phone.trim()
          ? { phone: phone.trim() }
          : {}),
      });

      // Trường hợp backend chỉ tạo tài khoản,
      // chưa trả về token và user
      if (!result.token || !result.user) {
        showMessage(
          'Đăng ký thành công',
          'Tài khoản đã được tạo. Vui lòng đăng nhập.',
        );

        router.replace('/login');
        return;
      }

      // Lưu thông tin đăng nhập bằng bộ lưu trữ
      // hỗ trợ cả Web và Android/iOS
      await saveAuthData(result.token, result.user);

      // Chuyển về trang chủ sau khi đăng ký thành công
      router.replace('/');
    } catch (error) {
      showMessage(
        'Đăng ký thất bại',
        error instanceof Error
          ? error.message
          : 'Không thể kết nối máy chủ. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>✈</Text>

      <Text style={styles.title}>Tạo tài khoản</Text>

      <Text style={styles.subtitle}>
        Đăng ký để bắt đầu hành trình của bạn.
      </Text>

      <Text style={styles.label}>Họ và tên *</Text>
      <TextInput
        style={styles.input}
        placeholder="Nguyễn Văn A"
        placeholderTextColor="#9CA3AF"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!loading}
        returnKeyType="next"
      />

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

      <Text style={styles.label}>Số điện thoại</Text>
      <TextInput
        style={styles.input}
        placeholder="Nhập số điện thoại"
        placeholderTextColor="#9CA3AF"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        editable={!loading}
        returnKeyType="next"
      />

      <Text style={styles.label}>Mật khẩu *</Text>
      <TextInput
        style={styles.input}
        placeholder="Tạo mật khẩu (ít nhất 8 ký tự)"
        placeholderTextColor="#9CA3AF"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
        returnKeyType="done"
        onSubmitEditing={handleRegister}
      />

      <TouchableOpacity
        style={[
          styles.button,
          loading && styles.disabled,
        ]}
        onPress={handleRegister}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            Đăng ký
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Đã có tài khoản?{' '}
        </Text>

        <TouchableOpacity
          onPress={() => router.replace('/login')}
          disabled={loading}
        >
          <Text style={styles.link}>
            Đăng nhập
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
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 36,
  },
  logo: {
    fontSize: 44,
    color: '#2563EB',
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  label: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  button: {
    minHeight: 52,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
    color: '#4B5563',
  },
  link: {
    color: '#2563EB',
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 22,
  },
  backText: {
    color: '#64748B',
  },
});
