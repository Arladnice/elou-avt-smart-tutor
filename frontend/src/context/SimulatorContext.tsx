import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  severity?: 'CRITICAL' | 'WARNING' | 'INFO' | 'NO_DATA';
  repeat_count?: number;
  fingerprint?: string;
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
    V_1: boolean;
    V_2: boolean;
    V_3: boolean;
  };
  sensors: {
    T_1: number;
    P_1: number;
    L_1: number;
  };
  setpoints: {
    T_1_Sp: number;
  };
  defects: {
    pump_fail: boolean;
    coil_overheat: boolean;
    valve_jam: boolean;
    power_fail: boolean;
    air_fail: boolean;
    steam_fail: boolean;
  };
  riskLevel: number;
  predictions: number[]; // Прогнозируемые параметры [temp, pres, level] на t+15 с
  logs: LogEntry[];
  scoreCard: ScoreCardData | null;
  accidentReason: string;
  
  // Пользователь и сессия
  username: string;
  role: 'operator' | 'instructor';
  operatorName: string;
  scenarioId: string;
  isOnline: boolean;
  wsLatency: number; // Задержка в мс для Критерия 1 (производительность)
  
  speedMultiplier: number;
  isPaused: boolean;
  hasSnapshot: boolean;
  
  webhookUrl: string;
  webhookActive: boolean;
  mutes: string[];
  
  loginUser: (name: string, role: 'operator' | 'instructor') => void;
  logoutUser: () => void;
  selectScenario: (scenId: string) => void;
  toggleValve: (valveId: 'V_1' | 'V_2' | 'V_3') => void;
  changeSetpoint: (temp: number) => void;
  triggerEsd: () => void;
  triggerDefect: (defectId: 'pump_fail' | 'coil_overheat' | 'valve_jam' | 'power_fail' | 'air_fail' | 'steam_fail', state: boolean) => void;
  resetSession: () => void;
  completeSession: () => void;
  changeSpeed: (multiplier: number) => void;
  togglePause: (paused: boolean) => void;
  saveState: () => void;
  loadState: () => void;
  configureWebhook: (url: string, active: boolean) => void;
  toggleMute: (fingerprint: string, state: boolean) => void;
}

const SimulatorContext = createContext<SimulatorContextType | undefined>(undefined);

export const SimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState(() => sessionStorage.getItem('ktk_username') || '');
  const [role, setRole] = useState<'operator' | 'instructor'>(() => (sessionStorage.getItem('ktk_role') as 'operator' | 'instructor' | null) || 'operator');
  const [operatorName, setOperatorName] = useState('Оператор');
  const [scenarioId, setScenarioId] = useState('startup');
  
  const [status, setStatus] = useState<SimulatorContextType['status']>('running');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [valves, setValves] = useState({ V_1: true, V_2: false, V_3: true });
  const [setpoints, setSetpoints] = useState({ T_1_Sp: 280 });
  const [sensors, setSensors] = useState({ T_1: 280, P_1: 0.25, L_1: 50 });
  const [defects, setDefects] = useState({ pump_fail: false, coil_overheat: false, valve_jam: false, power_fail: false, air_fail: false, steam_fail: false });
  const [riskLevel, setRiskLevel] = useState(5);
  const [predictions, setPredictions] = useState<number[]>([280, 0.25, 50]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', time: '00:00', type: 'info', message: 'Система инициализирована в локальном режиме.' },
  ]);
  const [scoreCard, setScoreCard] = useState<ScoreCardData | null>(null);
  const [accidentReason, setAccidentReason] = useState('');
  
  const [isOnline, setIsOnline] = useState(false);
  const [wsLatency, setWsLatency] = useState(0);
  
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookActive, setWebhookActive] = useState(false);
  const [mutes, setMutes] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const latencyTimerRef = useRef<number | null>(null);

  // -------------------------------------------------------------
  // ПОДКЛЮЧЕНИЕ К WEBSOCKET (С BACKEND API)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!username) return;
    
    let isMounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsBase = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}`;
      const wsUrl = `${wsBase}/ws?role=${role}&username=${encodeURIComponent(username)}&scenario=${scenarioId}`;
      
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsOnline(true);
        setLogs(prev => [
          ...prev, 
          { id: Date.now().toString(), time: '00:00', type: 'info', message: 'Установлено соединение с сервером КТК ЭЛОУ-АВТ.' }
        ]);
        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
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
        if (data.speedMultiplier !== undefined) setSpeedMultiplier(data.speedMultiplier);
        if (data.isPaused !== undefined) setIsPaused(data.isPaused);
        if (data.hasSnapshot !== undefined) setHasSnapshot(data.hasSnapshot);
        if (data.webhookUrl !== undefined) setWebhookUrl(data.webhookUrl);
        if (data.webhookActive !== undefined) setWebhookActive(data.webhookActive);
        if (data.mutes !== undefined) setMutes(data.mutes);
        if (data.operatorName) {
          setOperatorName(data.operatorName);
        }
        if (data.scenarioId) {
          setScenarioId(data.scenarioId);
        }
      };

      ws.onerror = () => {
        // Ошибка обрабатывается в onclose
      };

      ws.onclose = () => {
        setIsOnline(false);
        if (pingInterval) clearInterval(pingInterval);
        
        setLogs(prev => {
          const lastLog = prev[prev.length - 1];
          // Дедупликация сообщения о потере связи
          if (lastLog?.message.includes('Потеряно соединение')) return prev;
          return [
            ...prev, 
            { id: Date.now().toString(), time: '00:00', type: 'warning', message: 'Потеряно соединение с сервером. Попытка переподключения через 3 секунды...' }
          ];
        });

        // Пытаемся переподключиться
        if (isMounted) {
          reconnectTimer = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      if (pingInterval) clearInterval(pingInterval);
      if (ws) ws.close();
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
        let nextTemp = prev.T_1;
        let nextPres = prev.P_1;
        let nextLevel = prev.L_1;

        const F_in = valves.V_1 && !defects.pump_fail ? 1.0 : 0.0;

        // Печь с автоматической компенсацией охлаждения сырья (feedforward)
        const Q_heat = (setpoints.T_1_Sp - nextTemp) * 0.15 + F_in * (setpoints.T_1_Sp - 60.0) * 0.06 + (defects.coil_overheat ? 5.0 : 0.0);
        const Q_cool = F_in * (nextTemp - 60.0) * 0.06;
        nextTemp += Q_heat - Q_cool + (Math.random() - 0.5) * 0.5;

        // Колонна (давление)
        nextPres += (nextTemp - 260) * 0.0012 + (nextLevel - 50) * 0.0005;
        if (valves.V_2 && !defects.valve_jam) {
          nextPres -= nextPres * 0.15;
        }
        nextPres = Math.max(0.05, nextPres);

        // Колонна (уровень)
        nextLevel += F_in * 0.6;
        if (valves.V_3) {
          nextLevel -= 0.55 * Math.sqrt(nextLevel / 100.0);
        }
        nextLevel = Math.max(0, Math.min(100, nextLevel));

        return {
          T_1: Math.round(nextTemp * 100) / 100,
          P_1: Math.round(nextPres * 1000) / 1000,
          L_1: Math.round(nextLevel * 100) / 100,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, valves, setpoints, defects, isOnline]);

  // Проверка аварийных пределов в mock-режиме
  useEffect(() => {
    if (isOnline || status !== 'running') return;

    let newRisk = 5;
    if (sensors.T_1 > 310) newRisk += 30;
    if (sensors.P_1 > 0.4) newRisk += 40;
    if (sensors.L_1 > 85 || sensors.L_1 < 15) newRisk += 25;
    
    newRisk = Math.min(100, newRisk);
    setRiskLevel(newRisk);

    if (sensors.P_1 >= 0.48) {
      setStatus('accident');
      setAccidentReason('Критическое превышение давления в колонне К-1 (более 0.48 МПа). Взрыв колонны!');
    } else if (sensors.T_1 >= 380) {
      setStatus('accident');
      setAccidentReason('Критический перегрев печи П-1 (выше 380°C). Прогар змеевика и пожар!');
    }
  }, [sensors, status, isOnline]);

  // -------------------------------------------------------------
  // УПРАВЛЯЮЩИЕ ФУНКЦИИ
  // -------------------------------------------------------------
  const sendWsAction = (actionPayload: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      latencyTimerRef.current = Date.now();
      wsRef.current.send(JSON.stringify(actionPayload));
    }
  };

  const loginUser = (name: string, userRole: 'operator' | 'instructor') => {
    setUsername(name);
    setRole(userRole);
    sessionStorage.setItem('ktk_username', name);
    sessionStorage.setItem('ktk_role', userRole);
  };

  const logoutUser = () => {
    setUsername('');
    setRole('operator');
    sessionStorage.removeItem('ktk_username');
    sessionStorage.removeItem('ktk_role');
    sessionStorage.removeItem('ktk_token');
  };

  const selectScenario = (scenId: string) => {
    setScenarioId(scenId);
    if (isOnline) {
      sendWsAction({ type: 'change_scenario', scenario_id: scenId });
    } else {
      resetSession();
    }
  };

  const toggleValve = (valveId: 'V_1' | 'V_2' | 'V_3') => {
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
      setSetpoints({ T_1_Sp: temp });
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

  const triggerDefect = (defectId: 'pump_fail' | 'coil_overheat' | 'valve_jam' | 'power_fail' | 'air_fail' | 'steam_fail', state: boolean) => {
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

  const changeSpeed = (multiplier: number) => {
    if (isOnline) {
      sendWsAction({ type: 'change_speed', multiplier });
    } else {
      setSpeedMultiplier(multiplier);
      setLogs(l => [
        ...l,
        { id: Date.now().toString(), time: '00:00', type: 'info', message: `Локально: Скорость изменена на ${multiplier}x` }
      ]);
    }
  };

  const togglePause = (paused: boolean) => {
    if (isOnline) {
      sendWsAction({ type: 'toggle_pause', paused });
    } else {
      setIsPaused(paused);
      setLogs(l => [
        ...l,
        { id: Date.now().toString(), time: '00:00', type: 'info', message: `Локально: Симуляция ${paused ? 'ПРИОСТАНОВЛЕНА' : 'ВОЗОБНОВЛЕНА'}` }
      ]);
    }
  };

  const saveState = () => {
    if (isOnline) {
      sendWsAction({ type: 'save_state' });
    } else {
      setHasSnapshot(true);
      setLogs(l => [
        ...l,
        { id: Date.now().toString(), time: '00:00', type: 'info', message: 'Локально: Сделан снимок состояния (снапшот).' }
      ]);
    }
  };

  const loadState = () => {
    if (isOnline) {
      sendWsAction({ type: 'load_state' });
    } else {
      setLogs(l => [
        ...l,
        { id: Date.now().toString(), time: '00:00', type: 'warning', message: 'Локально: Произведен откат к снапшоту.' }
      ]);
    }
  };

  const completeSession = () => {
    if (isOnline) {
      sendWsAction({ type: 'complete' });
    } else {
      setStatus('success');
      setScoreCard({
        score: 100,
        grade: 'A',
        duration: timeElapsed,
        errors: [],
        recommendations: ['Сценарий успешно выполнен в локальном режиме.']
      });
    }
  };

  const resetSession = () => {
    if (isOnline) {
      sendWsAction({ type: 'reset' });
    } else {
      setStatus('running');
      setTimeElapsed(0);
      setValves({ V_1: true, V_2: false, V_3: true });
      setSetpoints({ T_1_Sp: 280 });
      setSensors({ T_1: 280, P_1: 0.25, L_1: 50 });
      setDefects({ pump_fail: false, coil_overheat: false, valve_jam: false, power_fail: false, air_fail: false, steam_fail: false });
      setRiskLevel(5);
      setPredictions([280, 0.25, 50]);
      setLogs([{ id: '1', time: '00:00', type: 'info', message: 'Система перезапущена локально.' }]);
      setScoreCard(null);
      setAccidentReason('');
      setIsPaused(false);
      setSpeedMultiplier(1.0);
      setHasSnapshot(false);
    }
  };

  const configureWebhook = (url: string, active: boolean) => {
    if (isOnline) {
      sendWsAction({ type: 'configure_webhook', url, active });
    } else {
      setWebhookUrl(url);
      setWebhookActive(active);
    }
  };

  const toggleMute = (fingerprint: string, state: boolean) => {
    if (isOnline) {
      sendWsAction({ type: 'toggle_mute', fingerprint, state });
    } else {
      setMutes(prev => state ? [...prev, fingerprint] : prev.filter(f => f !== fingerprint));
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
      operatorName,
      scenarioId,
      isOnline,
      wsLatency,
      speedMultiplier,
      isPaused,
      hasSnapshot,
      webhookUrl,
      webhookActive,
      mutes,
      loginUser,
      logoutUser,
      selectScenario,
      toggleValve,
      changeSetpoint,
      triggerEsd,
      triggerDefect,
      resetSession,
      completeSession,
      changeSpeed,
      togglePause,
      saveState,
      loadState,
      configureWebhook,
      toggleMute
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
