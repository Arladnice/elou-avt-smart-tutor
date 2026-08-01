import { BASE_URL, JSON_HEADERS, authHeaders, authorizedFetch } from '@/shared/api';
import type { ScenarioItem } from '../model/types';

/** Реестр учебных сценариев: доступен любой авторизованной роли */
export const fetchScenarios = async (): Promise<ScenarioItem[]> => {
  const response = await authorizedFetch(`${BASE_URL}/scenarios`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error('Failed to fetch scenarios');
  }
  return response.json();
};

/** Создание пользовательского сценария (только инструктор) */
export const createScenario = async (payload: ScenarioItem): Promise<{ status: string; message: string; scenario_id: string }> => {
  const response = await authorizedFetch(`${BASE_URL}/scenarios`, {
    method: 'POST',
    headers: authHeaders(JSON_HEADERS),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to create scenario');
  }
  return response.json();
};

/** Импорт сценария из произвольного JSON (только инструктор) */
export const importScenario = async (payload: unknown): Promise<{ status: string; message: string; scenario_id: string }> => {
  const response = await authorizedFetch(`${BASE_URL}/scenarios/import`, {
    method: 'POST',
    headers: authHeaders(JSON_HEADERS),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to import scenario');
  }
  return response.json();
};

/** Удаление пользовательского сценария (только инструктор) */
export const deleteScenario = async (scenarioId: string): Promise<{ status: string; message: string }> => {
  const response = await authorizedFetch(`${BASE_URL}/scenarios/${encodeURIComponent(scenarioId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to delete scenario');
  }
  return response.json();
};
