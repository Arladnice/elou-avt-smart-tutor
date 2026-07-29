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

export interface ActiveSession {
  session_id: string;
  operator_name: string;
  scenario_id: string;
  connected_operators: number;
  connected_instructors: number;
  status: string;
  time_elapsed: number;
}

export const apiService = {
  /**
   * Performs authentication for an operator or instructor
   */
  async login(username: string, password: string, role: 'operator' | 'instructor'): Promise<LoginResponse> {
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
   * Fetches real-time active operator sessions for instructor view
   */
  async fetchActiveSessions(): Promise<ActiveSession[]> {
    const response = await fetch(`${BASE_URL}/sessions/active`);
    if (!response.ok) {
      throw new Error('Failed to fetch active sessions');
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

  /**
   * Sends instructor feedback for AI alarm (GAP-6: Closed Loop Feedback)
   */
  async sendAlarmFeedback(alarmId: string | number, feedback: 'confirmed' | 'false_alarm', instructorName: string = 'Инструктор', details: string = ''): Promise<{ status: string; message: string }> {
    const response = await fetch(`${BASE_URL}/alarm-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alarm_id: alarmId, feedback, instructor_name: instructorName, details }),
    });
    if (!response.ok) {
      throw new Error('Failed to send alarm feedback');
    }
    return response.json();
  },

  /**
   * Fetches all training scenarios from the central registry
   */
  async fetchScenarios(): Promise<ScenarioItem[]> {
    const response = await fetch(`${BASE_URL}/scenarios`);
    if (!response.ok) {
      throw new Error('Failed to fetch scenarios');
    }
    return response.json();
  },

  /**
   * Creates a new custom instructor scenario
   */
  async createScenario(payload: ScenarioItem): Promise<{ status: string; message: string; scenario_id: string }> {
    const response = await fetch(`${BASE_URL}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to create scenario');
    }
    return response.json();
  },

  /**
   * Imports a scenario JSON payload
   */
  async importScenario(payload: any): Promise<{ status: string; message: string; scenario_id: string }> {
    const response = await fetch(`${BASE_URL}/scenarios/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to import scenario');
    }
    return response.json();
  },

  /**
   * Deletes a custom scenario
   */
  async deleteScenario(scenarioId: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${BASE_URL}/scenarios/${scenarioId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to delete scenario');
    }
    return response.json();
  },
};

export interface ScenarioCondition {
  type: 'valve_is' | 'sensor_gte' | 'sensor_lte' | 'composite_and';
  target?: string;
  expected?: any;
  conditions?: ScenarioCondition[];
}

export interface ScenarioChecklistItem {
  id: string;
  title: string;
  hint_training: string;
  hint_exam: string;
  condition: ScenarioCondition;
}

export interface ScenarioInitialState {
  T_1: number;
  P_1: number;
  L_1: number;
  T_1_Sp: number;
  V_1: boolean;
  V_2: boolean;
  V_3: boolean;
}

export interface ScenarioItem {
  id: string;
  title: string;
  short_name: string;
  description?: string;
  is_custom?: boolean;
  initial_state: ScenarioInitialState;
  checklist: ScenarioChecklistItem[];
  golden_sequence: string[];
}


