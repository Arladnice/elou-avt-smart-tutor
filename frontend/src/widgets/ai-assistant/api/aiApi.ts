import { BASE_URL, JSON_HEADERS, authHeaders, authorizedFetch } from '@/shared/api';
import type { SimulatorStatus } from '@/entities/telemetry';

/** Срез телеметрии, который отправляется ИИ вместе с историей диалога */
export interface AiTelemetryContext {
  sensors: { T_1: number; P_1: number; L_1: number };
  valves: { V_1: boolean; V_2: boolean; V_3: boolean };
  setpoints: { T_1_Sp: number };
  defects: { pump_fail: boolean; coil_overheat: boolean; valve_jam: boolean };
  status: SimulatorStatus;
  scenarioId: string;
  riskLevel: number;
}

export type AiMode = 'auto' | 'rag' | 'llm';

/**
 * Запрос к ИИ-ассистенту. Таймаут увеличен: локальная LLM при ~2 tok/s
 * отвечает до нескольких минут, обрывать её раньше времени бессмысленно.
 */
export const sendAiChat = async (
  messages: Array<{ role: string; content: string }>,
  telemetry: AiTelemetryContext,
  mode: AiMode = 'auto',
): Promise<{ content: string; mode_used?: string }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  try {
    const response = await authorizedFetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: authHeaders(JSON_HEADERS),
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
};
