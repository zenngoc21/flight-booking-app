const TOKEN_KEY = 'skyhaven_admin_token';
const USER_KEY = 'skyhaven_admin_user';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminUser(): AdminUser | null {
  const value = localStorage.getItem(USER_KEY);

  if (!value) return null;

  try {
    return JSON.parse(value) as AdminUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function saveAuth(token: string, user: AdminUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}