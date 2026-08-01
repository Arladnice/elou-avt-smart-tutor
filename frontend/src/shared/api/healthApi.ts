import { BASE_URL, authHeaders } from './client';

/** Метрики состояния сервера (USE-метрики), эндпоинт открыт без авторизации */
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

export const fetchSystemMetrics = async (): Promise<SystemMetrics> => {
  const response = await fetch(`${BASE_URL}/health/metrics`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error('Failed to fetch system metrics');
  }
  return response.json();
};
