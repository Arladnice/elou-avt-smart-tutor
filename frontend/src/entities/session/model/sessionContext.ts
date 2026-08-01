import { createContext, useContext } from 'react';
import type { SessionState } from './types';

export const SessionContext = createContext<SessionState | undefined>(undefined);

/** Состояние сессии и пользователя. Не вызывает перерисовку на каждом пакете телеметрии. */
export const useSession = (): SessionState => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within a SimulatorProvider');
  return context;
};
