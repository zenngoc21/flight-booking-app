
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
};

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'currentUser';

// Lưu dữ liệu theo nền tảng
async function saveItem(
  key: string,
  value: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

// Đọc dữ liệu theo nền tảng
async function getItem(
  key: string,
): Promise<string | null> {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

// Xóa dữ liệu theo nền tảng
async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// Lưu token và thông tin người dùng
export async function saveAuthData(
  token: string,
  user: CurrentUser,
): Promise<void> {
  await saveItem(TOKEN_KEY, token);
  await saveItem(USER_KEY, JSON.stringify(user));
}

// Lấy token để gọi API được bảo vệ
export async function getSavedToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

// Lấy thông tin người dùng đã đăng nhập
export async function getSavedUser(): Promise<CurrentUser | null> {
  const value = await getItem(USER_KEY);

  if (!value) {
    return null;
  }

  try {
    const user: unknown = JSON.parse(value);

    if (
      typeof user !== 'object' ||
      user === null ||
      !('email' in user) ||
      !('fullName' in user) ||
      typeof user.email !== 'string' ||
      typeof user.fullName !== 'string'
    ) {
      return null;
    }

    return user as CurrentUser;
  } catch {
    return null;
  }
}

// Đăng xuất và xóa phiên đăng nhập
export async function clearAuthData(): Promise<void> {
  await removeItem(TOKEN_KEY);
  await removeItem(USER_KEY);
}