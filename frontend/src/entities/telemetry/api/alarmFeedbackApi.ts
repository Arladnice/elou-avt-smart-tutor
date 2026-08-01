import { BASE_URL, JSON_HEADERS, authHeaders, authorizedFetch } from '@/shared/api';

/**
 * Оценка сработавшего аларма инструктором (GAP-6: Closed Loop Feedback).
 * Требует роль инструктора — оператору бэкенд отвечает 403.
 * Поле instructor_name бэкендом игнорируется: актор берётся из токена.
 */
export const sendAlarmFeedback = async (
  alarmId: string | number,
  feedback: 'confirmed' | 'false_alarm',
  details: string = '',
): Promise<{ status: string; message: string }> => {
  const response = await authorizedFetch(`${BASE_URL}/alarm-feedback`, {
    method: 'POST',
    headers: authHeaders(JSON_HEADERS),
    body: JSON.stringify({ alarm_id: alarmId, feedback, details }),
  });
  if (!response.ok) {
    throw new Error('Failed to send alarm feedback');
  }
  return response.json();
};
