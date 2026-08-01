import type { ScenarioItem } from '@/entities/scenario';

export type UserRole = 'operator' | 'instructor';
export type TrainingMode = 'training' | 'exam';

/** Шаг хронологии действий оператора за сессию */
export interface TimelineStep {
  index: number;
  /** Имя действия в том же виде, что в эталонной последовательности (V_1_CLOSE, SP_UP, ...) */
  action: string;
  at_second: number;
}

/**
 * Нарушение регламента. Бэкенд локализует его во времени тремя способами:
 * — привязка к действию: at_second и action_index заполнены, шаг подсвечиваем;
 * — проверка финального состояния: at_second = длительность сессии, action_index = null;
 * — момент неизвестен: все поля null.
 */
export interface ScoreCardError {
  clause: string;
  title: string;
  text: string;
  category?: string;
  at_second?: number | null;
  /** Индекс в ScoreCardData.timeline; null для проверок итогового состояния */
  action_index?: number | null;
  action?: string | null;
}

/** Итоговая карточка оценки квалификации оператора */
export interface ScoreCardData {
  score: number;
  grade: string;
  duration: number;
  errors: ScoreCardError[];
  recommendations: string[];
  recommended_scenario_id?: string;
  timeline?: TimelineStep[];
}

/**
 * Состояние учебной сессии и пользователя. Меняется редко (вход, смена
 * сценария/режима, ping), поэтому вынесено отдельно от потока телеметрии —
 * панель инструктора не перерисовывается на каждом пакете датчиков.
 */
export interface SessionState {
  username: string;
  role: UserRole;
  operatorName: string;
  scenarioId: string;
  activeSessionId: string;
  isOnline: boolean;
  /** Вход выполнен без проверки пароля на сервере (сервер был недоступен) */
  isDemoMode: boolean;
  /** Задержка WebSocket в мс — Критерий 1 (производительность) */
  wsLatency: number;
  mode: TrainingMode;
  speedMultiplier: number;
  isPaused: boolean;
  hasSnapshot: boolean;
  scoreCard: ScoreCardData | null;
  webhookUrl: string;
  webhookActive: boolean;
  mutes: string[];
  scenarios: ScenarioItem[];
}
