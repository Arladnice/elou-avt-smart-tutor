/** Завершённая учебная сессия из защищённой базы результатов (К8: ИБ) */
export interface TrainingRecord {
  id: number;
  operator_name: string;
  scenario_id: string;
  duration_sec: number;
  score: number;
  status: 'running' | 'paused' | 'esd' | 'accident' | 'success';
  integrity_valid: boolean;
  violations?: Array<{
    title: string;
    clause: string;
    text: string;
  }>;
  session_logs?: Array<{
    id: number;
    time: string;
    message: string;
    type: 'info' | 'warning' | 'error';
  }>;
}

/** Сессия оператора, подключённого к тренажёру прямо сейчас */
export interface ActiveSession {
  session_id: string;
  operator_name: string;
  scenario_id: string;
  connected_operators: number;
  connected_instructors: number;
  status: string;
  time_elapsed: number;
}
