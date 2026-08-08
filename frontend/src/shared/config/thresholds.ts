/**
 * Технологические пороги установки. Значения согласованы с
 * backend/src/elou_tutor/domain/process_limits.py — при изменении там правим
 * здесь же, иначе подсказки ИИ и графики разойдутся с реальными
 * срабатываниями защит.
 *
 * Соответствие проверяется автоматически: thresholds.test.ts читает
 * питоновский модуль и сверяет каждую пару значений.
 */
export const PRES_WARNING = 0.4;
export const PRES_CRITICAL = 0.43;
export const TEMP_WARNING = 340;
export const TEMP_CRITICAL = 350;
export const LEVEL_HIGH = 85;
export const LEVEL_HIGH_CRITICAL = 90;
export const LEVEL_LOW = 18;
export const LEVEL_LOW_CRITICAL = 8;
export const K1_LEVEL_FULL_SCALE_MM = 2000;
export const K2_LEVEL_FULL_SCALE_MM = 4000;
export const SETPOINT_ACCEPTANCE_TOLERANCE = 2;
export const K2_LEVEL_HIGH = 85;
export const K2_LEVEL_HIGH_CRITICAL = 90;
export const K2_LEVEL_LOW = 20;
export const K2_LEVEL_LOW_INTERLOCK = 15;
export const K2_LEVEL_LOW_CRITICAL = 8;
export const K2_PRESSURE_NORMAL = 0.04;
export const K2_PRESSURE_WARNING = 0.098;
export const K2_PRESSURE_CRITICAL = 0.147;
export const K2_TEMP_WARNING = 360;
export const K2_TEMP_CRITICAL = 375;

/** Фаза пуска: первые 2 минуты низкий уровень в кубе — норма */
export const STARTUP_FILLING_TIME_LIMIT_SEC = 120;
/** Ниже этой температуры печь при пуске считается ещё прогревающейся */
export const STARTUP_HEATING_THRESHOLD_TEMP = 300;

/** Горизонт прогноза LSTM-модели бэкенда, секунды */
export const FORECAST_HORIZON_SEC = 15;
