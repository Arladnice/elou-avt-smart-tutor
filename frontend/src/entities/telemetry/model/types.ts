export type SimulatorStatus = 'running' | 'paused' | 'esd' | 'accident' | 'success';

export type ValveId = 'V_1' | 'V_2' | 'V_3' | 'V_ELOU' | 'V_VT';

export type DefectId =
  | 'pump_fail'
  | 'coil_overheat'
  | 'valve_jam'
  | 'power_fail'
  | 'air_fail'
  | 'steam_fail'
  | 'elou_desalt_fail'
  | 'vt_vacuum_loss';

export type Valves = Record<ValveId, boolean>;
export type Defects = Record<DefectId, boolean>;

export interface Sensors {
  T_1: number;
  P_1: number;
  L_1: number;
  Sal_1: number;
  W_1: number;
  P_vac: number;
  T_2: number;
}

export interface Setpoints {
  T_1_Sp: number;
}

export interface InterlockRow {
  tag: string;
  logic: '1oo1' | '2oo2';
  mechanism: string;
  primary: boolean;
  bypassed: boolean;
  alarm: boolean;
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
  P_1: number;
  L_1: number;
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
  sensors: Sensors;
  setpoints: Setpoints;
  defects: Defects;
  riskLevel: number;
  /** Прогноз [T_1, P_1, L_1] на t+15 с от LSTM-модели бэкенда */
  predictions: number[];
  telemetryHistory: TelemetryPoint[];
  logs: LogEntry[];
  accidentReason: string;
  /** Задержка WebSocket в мс — Критерий 1 (производительность). Метрика потока, а не сессии */
  wsLatency: number;
  interlocks: InterlockRow[];
  dutyEngineerPhone: string;
  interlockOperationAuthorized: boolean;
}

export const INITIAL_VALVES: Valves = { V_1: true, V_2: false, V_3: true, V_ELOU: true, V_VT: true };

export const INITIAL_SENSORS: Sensors = { T_1: 280, P_1: 0.25, L_1: 50, Sal_1: 4.2, W_1: 0.15, P_vac: 0.04, T_2: 340 };

export const INITIAL_DEFECTS: Defects = {
  pump_fail: false,
  coil_overheat: false,
  valve_jam: false,
  power_fail: false,
  air_fail: false,
  steam_fail: false,
  elou_desalt_fail: false,
  vt_vacuum_loss: false,
};

export const INITIAL_INTERLOCKS: InterlockRow[] = [
  { tag: 'LIRSA 1a', logic: '1oo1', mechanism: 'Контактор КМ-2', primary: true, bypassed: false, alarm: false },
  { tag: 'LIRSA 2a', logic: '2oo2', mechanism: 'Контактор КМ-2', primary: true, bypassed: false, alarm: false },
  { tag: 'LIRSA 2д', logic: '2oo2', mechanism: 'Контактор КМ-2', primary: true, bypassed: false, alarm: false },
  { tag: 'LIRSA 3a', logic: '1oo1', mechanism: 'Контактор КМ-2', primary: true, bypassed: false, alarm: false },
  { tag: 'PIRSA 9a', logic: '1oo1', mechanism: 'Контактор КМ-2', primary: false, bypassed: false, alarm: false },
  { tag: 'TIRSA 10a', logic: '1oo1', mechanism: 'Контактор КМ-2', primary: false, bypassed: false, alarm: false },
  { tag: 'PIRSA 11a', logic: '1oo1', mechanism: 'Контактор КМ-2', primary: false, bypassed: false, alarm: false },
  { tag: 'TIRSA 12a', logic: '1oo1', mechanism: 'Контактор КМ-2', primary: false, bypassed: false, alarm: false },
  { tag: 'PIRSA 13a', logic: '1oo1', mechanism: 'Контактор КМ-2', primary: false, bypassed: false, alarm: false },
];
