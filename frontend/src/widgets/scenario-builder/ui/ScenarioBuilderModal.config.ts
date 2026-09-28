import type { ScenarioCondition } from '@/entities/scenario';

/** Пресеты условий завершения шага — то, что оператор выбирает в выпадающем списке */
export type ConditionPreset =
  | 'V_1_CLOSE' | 'V_1_OPEN'
  | 'V_2_OPEN' | 'V_2_CLOSE'
  | 'V_3_OPEN' | 'V_3_CLOSE'
  | 'T_1_LTE' | 'T_1_GTE'
  | 'L_1_LTE' | 'L_1_GTE'
  | 'L_2_LTE' | 'L_2_GTE';

/** Строка чек-листа в том виде, в каком её отдаёт Form.List */
export interface ChecklistFormRow {
  id?: string;
  title: string;
  hint_training?: string;
  hint_exam?: string;
  conditionType: ConditionPreset;
  /** Порог для условий по датчикам; для условий по клапанам не используется */
  targetVal?: number;
}

/** Значения формы визуального конструктора */
export interface ScenarioFormValues {
  id: string;
  title: string;
  short_name: string;
  description?: string;
  T_1?: number;
  P_1?: number;
  L_1?: number;
  L_2?: number;
  T_1_Sp?: number;
  V_1?: boolean;
  V_2?: boolean;
  V_3?: boolean;
  checklist?: ChecklistFormRow[];
  golden_sequence?: string[];
}

/** Пресеты по клапанам разворачиваются в условие «клапан в положении» */
export const VALVE_PRESETS: Record<string, { target: string; expected: boolean }> = {
  V_1_CLOSE: { target: 'V_1', expected: false },
  V_1_OPEN: { target: 'V_1', expected: true },
  V_2_OPEN: { target: 'V_2', expected: true },
  V_2_CLOSE: { target: 'V_2', expected: false },
  V_3_OPEN: { target: 'V_3', expected: true },
  V_3_CLOSE: { target: 'V_3', expected: false },
};

/** Пресеты по датчикам: тип сравнения, параметр и порог по умолчанию */
export const SENSOR_PRESETS: Record<string, { type: 'sensor_lte' | 'sensor_gte'; target: string; fallback: number }> = {
  T_1_LTE: { type: 'sensor_lte', target: 'T_1', fallback: 245.0 },
  T_1_GTE: { type: 'sensor_gte', target: 'T_1', fallback: 285.0 },
  L_1_LTE: { type: 'sensor_lte', target: 'L_1', fallback: 25.0 },
  L_1_GTE: { type: 'sensor_gte', target: 'L_1', fallback: 20.0 },
  L_2_LTE: { type: 'sensor_lte', target: 'L_2', fallback: 18.0 },
  L_2_GTE: { type: 'sensor_gte', target: 'L_2', fallback: 50.0 },
};

/** Разворачивает выбранный в форме пресет в условие реестра сценариев */
export const presetToCondition = (row: ChecklistFormRow): ScenarioCondition => {
  const valve = VALVE_PRESETS[row.conditionType];
  if (valve) {
    return { type: 'valve_is', target: valve.target, expected: valve.expected };
  }
  const sensor = SENSOR_PRESETS[row.conditionType];
  if (sensor) {
    return { type: sensor.type, target: sensor.target, expected: row.targetVal ?? sensor.fallback };
  }
  return { type: 'valve_is', target: 'V_1', expected: false };
};

/** Опции выпадающего списка условий завершения шага чек-листа */
export const CONDITION_OPTIONS = [
  { value: 'V_1_CLOSE', label: 'V-1 Закрыт (Перекрытие сырья)' },
  { value: 'V_1_OPEN', label: 'V-1 Открыт (Подача сырья)' },
  { value: 'V_2_OPEN', label: 'V-2 Открыт (Сброс на факел)' },
  { value: 'V_2_CLOSE', label: 'V-2 Закрыт (Отсечка сброса)' },
  { value: 'V_3_OPEN', label: 'V-3 Открыт (Дренаж куба)' },
  { value: 'V_3_CLOSE', label: 'V-3 Закрыт (Закрытие дренажа)' },
  { value: 'T_1_LTE', label: 'Температура Т-1 <= X °C' },
  { value: 'T_1_GTE', label: 'Температура Т-1 >= X °C' },
  { value: 'L_1_LTE', label: 'Уровень L-1 <= X %' },
  { value: 'L_1_GTE', label: 'Уровень L-1 >= X %' },
  { value: 'L_2_LTE', label: 'Уровень L-2 <= X %' },
  { value: 'L_2_GTE', label: 'Уровень L-2 >= X %' },
];

/** Опции для эталонной последовательности действий (LCS) */
export const GOLDEN_SEQUENCE_OPTIONS = [
  { value: 'V1_OPEN', label: 'V1_OPEN (Открыть сырье)' },
  { value: 'V1_CLOSE', label: 'V1_CLOSE (Перекрыть сырье)' },
  { value: 'V2_OPEN', label: 'V2_OPEN (Открыть сброс газа)' },
  { value: 'V2_CLOSE', label: 'V2_CLOSE (Закрыть сброс газа)' },
  { value: 'V3_OPEN', label: 'V3_OPEN (Открыть дренаж куба)' },
  { value: 'V3_CLOSE', label: 'V3_CLOSE (Прекратить дренаж)' },
  { value: 'SP_UP', label: 'SP_UP (Поднять температуру)' },
  { value: 'SP_DOWN', label: 'SP_DOWN (Снизить температуру)' },
  { value: 'ESD', label: 'ESD (Аварийный останов ПАЗ)' },
];

/** Начальные значения формы визуального конструктора */
export const FORM_INITIAL_VALUES: Partial<ScenarioFormValues> = {
  T_1: 280,
  P_1: 0.35,
  L_1: 50,
  L_2: 50,
  T_1_Sp: 280,
  V_1: true,
  V_2: false,
  V_3: true,
  checklist: [
    {
      id: 'step_1',
      title: '1. Перекрытие подачи сырья V-1',
      hint_training: 'Переведите клапан V-1 в положение ЗАКРЫТО',
      hint_exam: 'Отсечь подачу сырья в печь П-1.',
      conditionType: 'V_1_CLOSE',
    },
  ],
  golden_sequence: ['V1_CLOSE'],
};
