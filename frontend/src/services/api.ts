/**
 * Базовый URL для REST API.
 * При деплое на HF Spaces — автоматически определяется из window.location.origin.
 * Локально — берётся из переменной VITE_API_URL (.env.development).
 */
const BASE_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

export interface Session {
  id: number;
  operator_name: string;
  scenario_id: string;
  duration_sec: number;
  score: number;
  status: 'running' | 'esd' | 'accident' | 'success';
  integrity_valid: boolean;
  violations?: Array<{
    title: string;
    clause: string;
    text: string;
  }>;
  session_logs?: Array<{
    id: number;
    time: string;
    message: string;
    type: 'info' | 'warning' | 'error';
  }>;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: 'operator' | 'instructor';
}

export const apiService = {
  /**
   * Performs authentication for an operator or instructor
   */
  async login(username: string, role: 'operator' | 'instructor'): Promise<LoginResponse> {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, role }),
    });

    if (!response.ok) {
      throw new Error('Server auth error');
    }

    return response.json();
  },

  /**
   * Fetches the history of training sessions
   */
  async fetchSessions(): Promise<Session[]> {
    const response = await fetch(`${BASE_URL}/sessions`);
    if (!response.ok) {
      throw new Error('Failed to fetch training sessions');
    }
    return response.json();
  },

  /**
   * Clears the training sessions database
   */
  async clearSessions(): Promise<void> {
    const response = await fetch(`${BASE_URL}/sessions/clear`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to clear sessions');
    }
  },
};
