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
  status: 'running' | 'paused' | 'esd' | 'accident' | 'success';
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

export interface TelemetryContext {
  sensors: {
    T_1: number;
    P_1: number;
    L_1: number;
  };
  valves: {
    V_1: boolean;
    V_2: boolean;
    V_3: boolean;
  };
  setpoints: {
    T_1_Sp: number;
  };
  defects: {
    pump_fail: boolean;
    coil_overheat: boolean;
    valve_jam: boolean;
  };
  status: 'running' | 'paused' | 'esd' | 'accident' | 'success';
  scenarioId: string;
  riskLevel: number;
}

export interface SystemMetrics {
  cpu_percent: number;
  memory_used_mb: number;
  memory_percent: number;
  db_size_kb: number;
  active_ws_connections: number;
  processed_events_total: number;
  avg_ping_latency_ms: number;
  is_ollama_available: boolean;
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

  /**
   * Sends chat message list and telemetry context to AI chatbot
   */
  async sendAiChat(messages: Array<{ role: string; content: string }>, telemetry: TelemetryContext, mode: 'auto' | 'rag' | 'llm' = 'auto'): Promise<{ content: string; mode_used?: string }> {
    // Увеличенный таймаут для ожидания генерации локальной LLM (~2-4 мин при ~2 tok/s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 минут

    try {
      const response = await fetch(`${BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, telemetry, mode }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error('Failed to send message to AI chatbot');
      }
      return response.json();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new Error('Превышено время ожидания ответа от ИИ (5 мин). Попробуйте повторить вопрос.');
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Fetches server performance & monitoring metrics (USE metrics)
   */
  async fetchSystemMetrics(): Promise<SystemMetrics> {
    const response = await fetch(`${BASE_URL}/health/metrics`);
    if (!response.ok) {
      throw new Error('Failed to fetch system metrics');
    }
    return response.json();
  },
};
