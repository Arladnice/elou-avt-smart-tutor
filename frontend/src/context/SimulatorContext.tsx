import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'warning' | 'error';
  message: string;
}

export interface ScoreCardData {
  score: number;
  grade: string;
  duration: number;
  errors: Array<{ clause: string; title: string; text: string }>;
  recommendations: string[];
}

interface SimulatorContextType {
  status: 'running' | 'paused' | 'esd' | 'accident' | 'success';
  timeElapsed: number;
  valves: {
    V1: boolean;
    V2: boolean;
    V3: boolean;
  };
  sensors: {
    furnaceTemp: number;
    columnPres: number;
    columnLevel: number;
  };
  setpoints: {
    furnaceTempSp: number;
  };
  defects: {
    pump_fail: boolean;
    coil_overheat: boolean;
    valve_jam: boolean;
  };
  riskLevel: number;
  predictions: number[]; // Прогнозируемые параметры [temp, pres, level] на t+15 с
  logs: LogEntry[];
  scoreCard: ScoreCardData | null;
  accidentReason: string;
  
  // Пользователь и сессия
  username: string;
  role: 'operator' | 'instructor';
  scenarioId: string;
  isOnline: boolean;
  wsLatency: number; // Задержка в мс для Критерия 1 (производительность)
  
  loginUser: (name: string, role: 'operator' | 'instructor') => void;
  logoutUser: () => void;
  selectScenario: (scenId: string) => void;
  toggleValve: (valveId: 'V1' | 'V2' | 'V3') => void;
  changeSetpoint: (temp: number) => void;
  triggerEsd: () => void;
  triggerDefect: (defectId: 'pump_fail' | 'coil_overheat' | 'valve_jam', state: boolean) => void;
  resetSession: () => void;
}

const SimulatorContext = createContext<SimulatorContextType | undefined>(undefined);

export const SimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState(() => localStorage.getItem('ktk_username') || '');
  const [role, setRole] = useState<'operator' | 'instructor'>(() => (localStorage.getItem('ktk_role') as any) || 'operator');
  const [scenarioId, setScenarioId] = useState('startup');
  
  const [status, setStatus] = useState<SimulatorContextType['status']>('running');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [valves, setValves] = useState({ V1: true, V2: false, V3: true });
  const [setpoints, setSetpoints] = useState({ furnaceTempSp: 280 });
  const [sensors, setSensors] = useState({ furnaceTemp: 280, columnPres: 0.25, columnLevel: 50 });
  const [defects, setDefects] = useState({ pump_fail: false, coil_overheat: false, valve_jam: false });
  const [riskLevel, setRiskLevel] = useState(5);
  const [predictions, setPredictions] = useState<number[]>([280, 0.25, 50]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', time: '00:00', type: 'info', message: 'Система инициализирована в локальном режиме.' },
  ]);
  const [scoreCard, setScoreCard] = useState<ScoreCardData | null>(null);
  const [accidentReason, setAccidentReason] = useState('');
  
  const [isOnline, setIsOnline] = useState(false);
  const [wsLatency, setWsLatency] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const latencyTimerRef = useRef<number | null>(null);

  // -------------------------------------------------------------
  // ПОДКЛЮЧЕНИЕ К WEBSOCKET (С BACKEND API)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!username) return;
    
    const host = window.location.hostname || 'localhost';
    const wsUrl = `ws://${host}:8000/ws?role=${role}&username=${encodeURIComponent(username)}&scenario=${scenarioId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    let pingInterval: any = null;

    ws.onopen = () => {
      setIsOnline(true);
      setLogs(prev => [
        ...prev, 
        { id: Date.now().toString(), time: '00:00', type: 'info', message: 'Установлено соединение с сервером КТК ЭЛОУ-АВТ.' }
      ]);
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, 3000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        const latency = Date.now() - data.timestamp;
        setWsLatency(latency);
        return;
      }
      setStatus(data.status);
      setTimeElapsed(data.timeElapsed);
      setValves(data.valves);
      setSensors(data.sensors);
      setSetpoints(data.setpoints);
      setDefects(data.defects);
      setRiskLevel(data.riskLevel);
      setPredictions(data.predictions);
      setLogs(data.logs);
      setScoreCard(data.scoreCard);
      setAccidentReason(data.accidentReason);
    };

    ws.onerror = () => {
      setIsOnline(false);
    };

    ws.onclose = () => {
      setIsOnline(false);
      if (pingInterval) clearInterval(pingInterval);
      setLogs(prev => [
        ...prev, 
        { id: Date.now().toString(), time: '00:00', type: 'warning', message: 'Потеряно соединение с сервером. Тренажер переведен в автономный mock-режим.' }
      ]);
    };

    return () => {
      ws.close();
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [username, role, scenarioId]);

  // -------------------------------------------------------------
  // ЛОКАЛЬНЫЙ РЕЗЕРВНЫЙ СИМУЛЯТОР (MOCK-FALLBACK)
  // -------------------------------------------------------------
  useEffect(() => {
    if (isOnline || status !== 'running') return;

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [status, isOnline]);

  useEffect(() => {
    if (isOnline || status !== 'running') return;

    const interval = setInterval(() => {
      setSensors(prev => {
        let nextTemp = prev.furnaceTemp;
        let nextPres = prev.columnPres;
        let nextLevel = prev.columnLevel;

        const F_in = valves.V1 && !defects.pump_fail ? 1.0 : 0.0;

        // Печь с автоматической компенсацией охлаждения сырья (feedforward)
        const Q_heat = (setpoints.furnaceTempSp - nextTemp) * 0.15 + F_in * (setpoints.furnaceTempSp - 60.0) * 0.06 + (defects.coil_overheat ? 5.0 : 0.0);
        const Q_cool = F_in * (nextTemp - 60.0) * 0.06;
        nextTemp += Q_heat - Q_cool + (Math.random() - 0.5) * 0.5;

        // Колонна (давление)
        nextPres += (nextTemp - 260) * 0.0012 + (nextLevel - 50) * 0.0005;
        if (valves.V2 && !defects.valve_jam) {
          nextPres -= nextPres * 0.05;
        }
        nextPres = Math.max(0.02, nextPres);

        // Колонна (уровень)
        nextLevel += F_in * 0.6;
        if (valves.V3) {
          nextLevel -= 0.55 * Math.sqrt(nextLevel / 100.0);
        }
        nextLevel = Math.max(0, Math.min(100, nextLevel));

        return {
          furnaceTemp: Math.round(nextTemp * 100) / 100,
          columnPres: Math.round(nextPres * 1000) / 1000,
          columnLevel: Math.round(nextLevel * 100) / 100,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, valves, setpoints, defects, isOnline]);

  // Проверка аварийных пределов в mock-режиме
  useEffect(() => {
    if (isOnline || status !== 'running') return;

    let newRisk = 5;
    if (sensors.furnaceTemp > 310) newRisk += 30;
    if (sensors.columnPres > 0.4) newRisk += 40;
    if (sensors.columnLevel > 85 || sensors.columnLevel < 15) newRisk += 25;
    
    newRisk = Math.min(100, newRisk);
    setRiskLevel(newRisk);

    if (sensors.columnPres >= 0.48) {
      setStatus('accident');
      setAccidentReason('Критическое превышение давления в колонне К-1 (более 0.48 МПа). Взрыв колонны!');
    } else if (sensors.furnaceTemp >= 380) {
      setStatus('accident');
      setAccidentReason('Критический перегрев печи П-1 (выше 380°C). Прогар змеевика и пожар!');
    }
  }, [sensors, status, isOnline]);

  // -------------------------------------------------------------
  // УПРАВЛЯЮЩИЕ ФУНКЦИИ
  // -------------------------------------------------------------
  const sendWsAction = (actionPayload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      latencyTimerRef.current = Date.now();
      wsRef.current.send(JSON.stringify(actionPayload));
    }
  };

  const loginUser = (name: string, userRole: 'operator' | 'instructor') => {
    setUsername(name);
    setRole(userRole);
    localStorage.setItem('ktk_username', name);
    localStorage.setItem('ktk_role', userRole);
  };

  const logoutUser = () => {
    setUsername('');
    setRole('operator');
    localStorage.removeItem('ktk_username');
    localStorage.removeItem('ktk_role');
  };

  const selectScenario = (scenId: string) => {
    setScenarioId(scenId);
    resetSession();
  };

  const toggleValve = (valveId: 'V1' | 'V2' | 'V3') => {
    if (isOnline) {
      sendWsAction({ type: 'toggle_valve', valve_id: valveId, state: !valves[valveId] });
    } else {
      setValves(prev => {
        const nextState = !prev[valveId];
        const timeStr = `${Math.floor(timeElapsed / 60).toString().padStart(2, '0')}:${(timeElapsed % 60).toString().padStart(2, '0')}`;
        setLogs(l => [
          ...l, 
          { id: Date.now().toString(), time: timeStr, type: 'info', message: `Локальный клик: Клапан ${valveId} -> ${nextState ? 'ОТКРЫТ' : 'ЗАКРЫТ'}` }
        ]);
        return { ...prev, [valveId]: nextState };
      });
    }
  };

  const changeSetpoint = (temp: number) => {
    if (isOnline) {
      sendWsAction({ type: 'change_setpoint', value: temp });
    } else {
      setSetpoints({ furnaceTempSp: temp });
    }
  };

  const triggerEsd = () => {
    if (isOnline) {
      sendWsAction({ type: 'trigger_esd' });
    } else {
      setStatus('esd');
      setLogs(l => [
        ...l, 
        { id: Date.now().toString(), time: '00:00', type: 'error', message: 'АВАРИЙНЫЙ ОСТАНОВ (ESD) запущен оператором локально.' }
      ]);
    }
  };

  const triggerDefect = (defectId: 'pump_fail' | 'coil_overheat' | 'valve_jam', state: boolean) => {
    if (isOnline) {
      sendWsAction({ type: 'trigger_defect', defect_id: defectId, state });
    } else {
      setDefects(prev => ({ ...prev, [defectId]: state }));
      const timeStr = `${Math.floor(timeElapsed / 60).toString().padStart(2, '0')}:${(timeElapsed % 60).toString().padStart(2, '0')}`;
      setLogs(l => [
        ...l, 
        { id: Date.now().toString(), time: timeStr, type: 'error', message: `Локальная неисправность: ${defectId} -> ${state ? 'АКТИВНА' : 'НЕАКТИВНА'}` }
      ]);
    }
  };

  const resetSession = () => {
    if (isOnline) {
      sendWsAction({ type: 'reset' });
    } else {
      setStatus('running');
      setTimeElapsed(0);
      setValves({ V1: true, V2: false, V3: true });
      setSetpoints({ furnaceTempSp: 280 });
      setSensors({ furnaceTemp: 280, columnPres: 0.25, columnLevel: 50 });
      setDefects({ pump_fail: false, coil_overheat: false, valve_jam: false });
      setRiskLevel(5);
      setPredictions([280, 0.25, 50]);
      setLogs([{ id: '1', time: '00:00', type: 'info', message: 'Система перезапущена локально.' }]);
      setScoreCard(null);
      setAccidentReason('');
    }
  };

  return (
    <SimulatorContext.Provider value={{
      status,
      timeElapsed,
      valves,
      sensors,
      setpoints,
      defects,
      riskLevel,
      predictions,
      logs,
      scoreCard,
      accidentReason,
      username,
      role,
      scenarioId,
      isOnline,
      wsLatency,
      loginUser,
      logoutUser,
      selectScenario,
      toggleValve,
      changeSetpoint,
      triggerEsd,
      triggerDefect,
      resetSession
    }}>
      {children}
    </SimulatorContext.Provider>
  );
};

export const useSimulator = () => {
  const context = useContext(SimulatorContext);
  if (!context) throw new Error('useSimulator must be used within a SimulatorProvider');
  return context;
};
