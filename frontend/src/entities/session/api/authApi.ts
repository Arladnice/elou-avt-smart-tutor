import { BASE_URL } from '@/shared/api';
import type { UserRole } from '../model/types';

export interface LoginResponse {
  token: string;
  username: string;
  role: UserRole;
}

/**
 * Аутентификация оператора или инструктора. Не идёт через authorizedFetch:
 * 401 здесь означает неверный пароль, а не протухшую сессию.
 */
export const login = async (username: string, password: string, role: UserRole): Promise<LoginResponse> => {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });
  } catch {
    throw new Error('NETWORK_ERROR');
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('AUTH_INVALID_PASSWORD');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || 'AUTH_ERROR');
  }

  return response.json();
};
