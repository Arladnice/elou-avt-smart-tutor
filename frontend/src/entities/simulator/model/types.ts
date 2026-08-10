import type { DefectId, PumpId, ValveId } from '@/entities/telemetry';
import type { TrainingMode, UserRole } from '@/entities/session';

/**
 * Команды тренажёру. Все функции имеют стабильную идентичность (актуальное
 * состояние читается из ref внутри провайдера), поэтому подписка на действия
 * никогда не вызывает перерисовку — можно брать их где угодно без опаски.
 */
export interface SimulatorActions {
  loginUser: (name: string, role: UserRole) => void;
  logoutUser: () => void;
  selectScenario: (scenarioId: string) => void;
  switchSession: (sessionId: string) => void;
  selectMode: (mode: TrainingMode) => void;
  toggleValve: (valveId: ValveId) => void;
  togglePump: (pumpId: PumpId) => void;
  changeSetpoint: (name: 'T_1_Sp' | 'T_3_Sp', temp: number) => void;
  changeFeedRate: (percent: number) => void;
  triggerEsd: () => void;
  triggerDefect: (defectId: DefectId, state: boolean) => void;
  resetSession: () => void;
  completeSession: () => void;
  changeSpeed: (multiplier: number) => void;
  togglePause: (paused: boolean) => void;
  saveState: () => void;
  loadState: () => void;
  configureWebhook: (url: string, active: boolean) => void;
  toggleMute: (fingerprint: string, state: boolean) => void;
  callDispatcher: () => void;
  callDutyEngineer: () => void;
  toggleInterlockBypass: (tag: string, state: boolean) => void;
  reloadScenarios: () => Promise<void>;
}
