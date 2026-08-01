import { createContext, useContext } from 'react';
import type { SimulatorActions } from './types';

export const SimulatorActionsContext = createContext<SimulatorActions | undefined>(undefined);

/** Команды тренажёру. Идентичность функций стабильна — перерисовок не вызывает. */
export const useSimulatorActions = (): SimulatorActions => {
  const context = useContext(SimulatorActionsContext);
  if (!context) throw new Error('useSimulatorActions must be used within a SimulatorProvider');
  return context;
};
