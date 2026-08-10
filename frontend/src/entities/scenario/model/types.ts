export interface ScenarioCondition {
  type: 'valve_is' | 'pump_is' | 'sensor_gte' | 'sensor_lte' | 'setpoint_gte' | 'setpoint_lte' | 'composite_and';
  target?: string;
  expected?: boolean | number;
  /** Допуск зачёта измеряемого параметра, например ±2°C для температуры */
  tolerance?: number;
  conditions?: ScenarioCondition[];
}

export interface ScenarioChecklistItem {
  id: string;
  title: string;
  hint_training: string;
  hint_exam: string;
  condition: ScenarioCondition;
}

export interface ScenarioInitialState {
  T_1: number;
  T_3?: number;
  P_1: number;
  L_1: number;
  L_2?: number;
  T_1_Sp: number;
  T_3_Sp?: number;
  V_1: boolean;
  V_2: boolean;
  V_3: boolean;
}

export interface ScenarioItem {
  id: string;
  title: string;
  short_name: string;
  description?: string;
  is_custom?: boolean;
  initial_state: ScenarioInitialState;
  checklist: ScenarioChecklistItem[];
  golden_sequence: string[];
}
