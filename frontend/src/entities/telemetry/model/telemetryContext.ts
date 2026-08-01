import { createContext, useContext } from 'react';
import type { TelemetryState } from './types';

export const TelemetryContext = createContext<TelemetryState | undefined>(undefined);

/** Живая телеметрия установки. Обновляется раз в секунду — подписывайтесь только там, где это нужно. */
export const useTelemetry = (): TelemetryState => {
  const context = useContext(TelemetryContext);
  if (!context) throw new Error('useTelemetry must be used within a SimulatorProvider');
  return context;
};
