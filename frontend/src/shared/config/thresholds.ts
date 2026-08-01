/**
 * Технологические пороги установки. Значения согласованы с
 * backend/src/elou_tutor/domain/process_limits.py — при изменении там правим
 * здесь же, иначе подсказки ИИ и графики разойдутся с реальными
 * срабатываниями защит.
 */
export const PRES_WARNING = 0.4;
export const TEMP_WARNING = 310;
export const LEVEL_HIGH = 85;
export const LEVEL_LOW = 20;

/** Фаза пуска: первые 2 минуты низкий уровень в кубе — норма */
export const STARTUP_FILLING_TIME_LIMIT_SEC = 120;
/** Ниже этой температуры печь при пуске считается ещё прогревающейся */
export const STARTUP_HEATING_THRESHOLD_TEMP = 290;

/** Горизонт прогноза LSTM-модели бэкенда, секунды */
export const FORECAST_HORIZON_SEC = 15;
