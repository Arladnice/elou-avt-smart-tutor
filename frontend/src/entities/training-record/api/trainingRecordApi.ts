import { BASE_URL, authHeaders, authorizedFetch } from '@/shared/api';
import type { TrainingRecord, ActiveSession } from '../model/types';

/** История завершённых тренировок: доступна любой авторизованной роли */
export const fetchTrainingRecords = async (): Promise<TrainingRecord[]> => {
  const response = await authorizedFetch(`${BASE_URL}/sessions`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error('Failed to fetch training sessions');
  }
  return response.json();
};

/** Онлайн-сессии операторов для панели инструктора */
export const fetchActiveSessions = async (): Promise<ActiveSession[]> => {
  const response = await authorizedFetch(`${BASE_URL}/sessions/active`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error('Failed to fetch active sessions');
  }
  return response.json();
};

/** Очистка базы результатов обучения (только инструктор) */
export const clearTrainingRecords = async (): Promise<void> => {
  const response = await authorizedFetch(`${BASE_URL}/sessions/clear`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to clear sessions');
  }
};
