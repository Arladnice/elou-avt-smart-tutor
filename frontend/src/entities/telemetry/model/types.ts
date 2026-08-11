export type SimulatorStatus = 'running' | 'paused' | 'esd' | 'accident' | 'success';

export type ValveId =
  | 'V_1'
  | 'V_2'
  | 'V_3'
  | 'V_ELOU'
  | 'V_VT'
  | 'V_P3_OUT'
  | 'V_P3_RETURN'
  | 'V_P1_IN'
  | 'V_K2_OUT_32'
  | 'V_K2_OUT_4'
  | 'HC_P1'
  | 'HC_P3'
  | 'FUEL_P1'
  | 'FUEL_P3'
  | 'V_STEAM_K1'
  | 'V_STEAM_K2'
  | 'V_K2_RELIEF'
  | 'V_E1_DRAIN'
  | 'V_E2_DRAIN';

export type PumpId = 'N_20' | 'N_2' | 'N_3' | 'N_4' | 'N_32';

export type DefectId =
  | 'pump_fail'
  | 'coil_overheat'
  | 'valve_jam'
  | 'power_fail'
  | 'air_fail'
  | 'steam_fail'
  | 'elou_desalt_fail'
  | 'vt_vacuum_loss'
  | 'k2_pump_fail';

export type Valves = Record<ValveId, boolean>;
export type Pumps = Record<PumpId, boolean>;
export type Defects = Record<DefectId, boolean>;

export interface Sensors {
  T_1: number;
  T_3: number;
  P_1: number;
  L_1: number;
  Sal_1: number;
  W_1: number;
  P_vac: number;
  T_2: number;
  L_2: number;
  L_E1: number;
  L_E2: number;
  Flame_P1: boolean;
  Flame_P3: boolean;
  F_in: number;
}

export interface Setpoints {
  T_1_Sp: number;
  T_3_Sp: number;
  F_in_Sp: number;
}

export interface InterlockRow {
  tag: string;
  sensors: string[];
  logic: '1oo1' | '2oo2' | '2oo3';
  signalization: string;
  trip_threshold: string;
  mechanism: string;
  bypassed: boolean;
  signal: boolean;
  trip: boolean;
  paz_active: boolean;
}

export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  severity?: 'CRITICAL' | 'WARNING' | 'INFO' | 'NO_DATA';
  repeat_count?: number;
  fingerprint?: string;
}

/** Точка истории телеметрии для трендов и предиктивного графика */
export interface TelemetryPoint {
  timeElapsed: number;
  T_1: number;
  T_2: number;
  T_3: number;
  P_1: number;
  L_1: number;
  L_2: number;
}

/** Глубина хранения истории телеметрии (точек = секунд симуляции) */
export const TELEMETRY_HISTORY_LIMIT = 30;

/**
 * Живой поток данных установки: приходит с бэкенда раз в секунду.
 * Держится отдельным контекстом, чтобы перерисовка мнемосхемы не задевала
 * панели, которым нужны только сессия и действия.
 */
export interface TelemetryState {
  status: SimulatorStatus;
  timeElapsed: number;
  valves: Valves;
  pumps: Pumps;
  sensors: Sensors;
  setpoints: Setpoints;
  defects: Defects;
  riskLevel: number;
  /** Прогноз [T_1, P_1, L_1] на t+15 с от LSTM-модели бэкенда */
  predictions: number[];
  telemetryHistory: TelemetryPoint[];
  logs: LogEntry[];
  /** Контрольные точки, подтверждённые бэкендом в текущей сессии. */
  completedChecklistSteps: string[];
  accidentReason: string;
  /** Задержка WebSocket в мс — Критерий 1 (производительность). Метрика потока, а не сессии */
  wsLatency: number;
  interlocks: InterlockRow[];
  dutyEngineerPhone: string;
  interlockOperationAuthorized: boolean;
  /** К-2 в холодном пуске ещё штатно заполняется; минимум уровня пока не аварийный. */
  startupK2Prefill: boolean;
  trainingAcceleration: Record<string, number>;
}

export const INITIAL_VALVES: Valves = {
  V_1: true, V_2: false, V_3: true, V_ELOU: true, V_VT: true,
  V_P3_OUT: true, V_P3_RETURN: true, V_P1_IN: true,
  V_K2_OUT_32: true, V_K2_OUT_4: true, HC_P1: false, HC_P3: false,
  FUEL_P1: true, FUEL_P3: true, V_STEAM_K1: true, V_STEAM_K2: true,
  V_K2_RELIEF: false, V_E1_DRAIN: false, V_E2_DRAIN: false,
};

export const INITIAL_PUMPS: Pumps = { N_20: true, N_2: true, N_3: true, N_4: true, N_32: true };

export const INITIAL_SENSORS: Sensors = {
  T_1: 280, T_3: 280, P_1: 0.25, L_1: 50, Sal_1: 4.2, W_1: 0.15,
  P_vac: 0.04, T_2: 350, L_2: 50, L_E1: 50, L_E2: 50,
  Flame_P1: true, Flame_P3: true,
  F_in: 100,
};

export const INITIAL_DEFECTS: Defects = {
  pump_fail: false,
  coil_overheat: false,
  valve_jam: false,
  power_fail: false,
  air_fail: false,
  steam_fail: false,
  elou_desalt_fail: false,
  vt_vacuum_loss: false,
  k2_pump_fail: false,
};

/**
 * Стартовое состояние панели ПАЗ до первого пакета телеметрии и в демо-режиме.
 *
 * Позиции названы так же, как в техрегламенте, и совпадают с
 * INTERLOCK_DEFINITIONS на бэкенде: иначе до подключения оператор видит один
 * набор обозначений, а после — другой.
 */
export const INITIAL_INTERLOCKS: InterlockRow[] = [
  { tag: 'Е-1', sensors: ['LRCSA 603', 'LRSA 603B'], logic: '2oo2', signalization: '≤20%', trip_threshold: '<15%', mechanism: 'Останов Н-6/Н-6А', bypassed: false, signal: false, trip: false, paz_active: false },
  { tag: 'К1', sensors: ['PRSA 204'], logic: '1oo1', signalization: '≥4,5 кгс/см²', trip_threshold: '>4,8 кгс/см²', mechanism: 'Отсечка топлива и пара К-1', bypassed: false, signal: false, trip: false, paz_active: false },
  { tag: 'К1 (куб)', sensors: ['LRCSA 602', 'LRSA 602A', 'LRSA 602B'], logic: '2oo3', signalization: '≤20%', trip_threshold: '<15%', mechanism: 'ПАЗ по низкому уровню куба К-1', bypassed: false, signal: false, trip: false, paz_active: false },
  { tag: 'Е-2', sensors: ['LRCSA 609', 'LRSA 609B'], logic: '2oo2', signalization: '≤20%', trip_threshold: '<15%', mechanism: 'Запрет Н-7/Н-7А', bypassed: false, signal: false, trip: false, paz_active: false },
  { tag: 'К2', sensors: ['PRSA 213'], logic: '1oo1', signalization: '≥1,0 кгс/см²', trip_threshold: '>1,5 кгс/см²', mechanism: 'Отсечка топлива и пара К-2', bypassed: false, signal: false, trip: false, paz_active: false },
  { tag: 'К2 (куб)', sensors: ['LRCSA 604', 'LRSA 604A', 'LRSA 604B'], logic: '2oo3', signalization: '≤20%', trip_threshold: '<15%', mechanism: 'Запрет Н-4/Н-32', bypassed: false, signal: false, trip: false, paz_active: false },
];
