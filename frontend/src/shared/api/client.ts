/**
 * Транспортный слой REST API. Доменных типов здесь нет — слайсы entities
 * строят свои запросы поверх этих примитивов.
 *
 * BASE_URL: при деплое на HF Spaces определяется из window.location.origin,
 * локально берётся из VITE_API_URL (.env.development).
 */
export const BASE_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

export const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Заголовки авторизованного запроса. Токен выдаётся при входе и живёт
 * в sessionStorage; в автономном (демо) режиме его нет — запрос уйдёт без него
 * и получит отказ сервера, что корректно.
 */
export const authHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
  const token = sessionStorage.getItem('ktk_token');
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
};

/**
 * Обработчик протухшего токена: регистрируется провайдером симулятора и
 * возвращает пользователя на экран входа. Токен на бэкенде живёт 2 часа,
 * поэтому 401 в середине сессии — штатная ситуация, а не сбой.
 */
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

export const AUTH_EXPIRED = 'AUTH_EXPIRED';
export const AUTH_FORBIDDEN = 'AUTH_FORBIDDEN';

/**
 * Выполняет авторизованный запрос и единообразно разбирает отказы доступа:
 * 401 — токен невалиден/протух (разлогиниваем), 403 — роли не хватает.
 */
export const authorizedFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
  const response = await fetch(url, init);

  if (response.status === 401) {
    onUnauthorized?.();
    throw new Error(AUTH_EXPIRED);
  }
  if (response.status === 403) {
    throw new Error(AUTH_FORBIDDEN);
  }

  return response;
};
