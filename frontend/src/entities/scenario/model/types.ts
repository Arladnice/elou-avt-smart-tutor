export interface ScenarioCondition {
  type: 'valve_is' | 'sensor_gte' | 'sensor_lte' | 'composite_and';
  target?: string;
  expected?: boolean | number;
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
  P_1: number;
  L_1: number;
  T_1_Sp: number;
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
