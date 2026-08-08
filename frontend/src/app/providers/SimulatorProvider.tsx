import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { setUnauthorizedHandler } from '@/shared/api';
import { formatTime } from '@/shared/lib';
import { fetchScenarios, type ScenarioItem } from '@/entities/scenario';
import {
  TelemetryContext,
  TELEMETRY_HISTORY_LIMIT,
  INITIAL_VALVES,
  INITIAL_SENSORS,
  INITIAL_DEFECTS,
  INITIAL_INTERLOCKS,
  stepMockPhysics,
  evaluateMockRisk,
  detectMockAccident,
  type TelemetryState,
  type TelemetryPoint,
  type LogEntry,
  type SimulatorStatus,
  type Sensors,
  type Setpoints,
  type Valves,
  type Defects,
  type ValveId,
  type DefectId,
  type InterlockRow,
} from '@/entities/telemetry';
import {
  SessionContext,
  type SessionState,
  type ScoreCardData,
  type UserRole,
  type TrainingMode,
} from '@/entities/session';
import { SimulatorActionsContext, type SimulatorActions } from '@/entities/simulator';

/** Сценарии, которые на самом деле являются инъекцией неисправности поверх базового сценария */
const DEFECT_SCENARIOS: DefectId[] = ['pump_fail', 'coil_overheat', 'valve_jam', 'power_fail', 'air_fail', 'steam_fail'];

let logSequence = 0;

/** Уникальный id записи журнала: одной метки времени мало — в одну миллисекунду попадает несколько логов */
const makeLog = (type: LogEntry['type'], message: string, time = '00:00'): LogEntry => ({
  id: `local_${Date.now()}_${++logSequence}`,
  time,
  type,
  message,
});

/**
 * Пакет телеметрии приходит через JSON.parse, поэтому каждое поле-объект в нём
 * ссылочно новое, даже когда содержимое не изменилось. Без сравнения по значению
 * setState срабатывает вхолостую и контекст сессии обновляется раз в секунду —
 * ровно то, ради устранения чего он и отделён от телеметрии.
 */
const sameStringList = (a: string[], b: string[] | undefined): boolean =>
  Array.isArray(b) && a.length === b.length && a.every((item, i) => item === b[i]);

/**
 * Владеет WebSocket-соединением, резервной физикой и всем состоянием тренажёра,
 * раздавая его тремя контекстами: телеметрия (раз в секунду), сессия (редко)
 * и действия (стабильные). Разделение нужно, чтобы поток датчиков не
 * перерисовывал панели, которым он не нужен.
 */
export const SimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Сессия и пользователь ---
  const [username, setUsername] = useState(() => {
    const savedName = sessionStorage.getItem('ktk_username');
    const savedToken = sessionStorage.getItem('ktk_token');
    if (savedName && !savedToken) {
      sessionStorage.removeItem('ktk_username');
      return '';
    }
    return savedName || '';
  });
  const [role, setRole] = useState<UserRole>(() => (sessionStorage.getItem('ktk_role') as UserRole | null) || 'operator');
  const [operatorName, setOperatorName] = useState('Оператор');
  const [scenarioId, setScenarioId] = useState('startup');
  const [activeSessionId, setActiveSessionId] = useState(() => sessionStorage.getItem('ktk_session_id') || 'default_session');
  const [isOnline, setIsOnline] = useState(false);
  // Токен выдаёт только сервер, поэтому его отсутствие при активной сессии = демо-вход
  const [isDemoMode, setIsDemoMode] = useState(() => !!sessionStorage.getItem('ktk_username') && !sessionStorage.getItem('ktk_token'));
  const [wsLatency, setWsLatency] = useState(0);
  const [mode, setMode] = useState<TrainingMode>('training');
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [scoreCard, setScoreCard] = useState<ScoreCardData | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookActive, setWebhookActive] = useState(false);
  const [mutes, setMutes] = useState<string[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [interlocks, setInterlocks] = useState<InterlockRow[]>(INITIAL_INTERLOCKS);
  const [dutyEngineerPhone, setDutyEngineerPhone] = useState('24-45');
  const [interlockOperationAuthorized, setInterlockOperationAuthorized] = useState(false);

  // --- Телеметрия ---
  const [status, setStatus] = useState<SimulatorStatus>('running');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [valves, setValves] = useState<Valves>(INITIAL_VALVES);
  const [setpoints, setSetpoints] = useState<Setpoints>({ T_1_Sp: 280 });
  const [sensors, setSensors] = useState<Sensors>(INITIAL_SENSORS);
  const [defects, setDefects] = useState<Defects>(INITIAL_DEFECTS);
  const [riskLevel, setRiskLevel] = useState(5);
  const [predictions, setPredictions] = useState<number[]>([280, 0.25, 50]);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', time: '00:00', type: 'info', message: 'Система инициализирована в локальном режиме.' },
  ]);
  const [accidentReason, setAccidentReason] = useState('');

  const wsRef = useRef<WebSocket | null>(null);

  /**
   * Зеркало изменяемого состояния для обработчиков действий. Благодаря ему
   * все команды объявлены с пустым списком зависимостей и не пересоздаются —
   * иначе контекст действий менялся бы на каждом пакете телеметрии.
   */
  const stateRef = useRef({ isOnline, valves, timeElapsed, scenarioId });
  stateRef.current = { isOnline, valves, timeElapsed, scenarioId };

  // -------------------------------------------------------------
  // ДЕЙСТВИЯ
  // -------------------------------------------------------------
  const sendWsAction = useCallback((actionPayload: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(actionPayload));
    }
  }, []);

  const appendLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, makeLog(type, message, formatTime(stateRef.current.timeElapsed))]);
  }, []);

  const reloadScenarios = useCallback(async () => {
    try {
      setScenarios(await fetchScenarios());
    } catch {
      console.warn('Не удалось загрузить список сценариев с бэкенда.');
    }
  }, []);

  // Реестр сценариев закрыт авторизацией, поэтому грузим его после входа:
  // запрос на этапе логина ушёл бы без токена и вернул 401, оставив UI
  // с одношаговым fallback-чек-листом вместо реальных задач сценария.
  useEffect(() => {
    if (!username) return;
    reloadScenarios();
  }, [username, reloadScenarios]);

  const resetSession = useCallback(() => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'reset' });
      return;
    }
    setStatus('running');
    setTimeElapsed(0);
    setValves(INITIAL_VALVES);
    setSetpoints({ T_1_Sp: 280 });
    setSensors(INITIAL_SENSORS);
    setDefects(INITIAL_DEFECTS);
    setRiskLevel(5);
    setPredictions([280, 0.25, 50]);
    setTelemetryHistory([]);
    setLogs([{ id: '1', time: '00:00', type: 'info', message: 'Система перезапущена локально.' }]);
    setScoreCard(null);
    setAccidentReason('');
    setIsPaused(false);
    setSpeedMultiplier(1.0);
    setHasSnapshot(false);
    setInterlocks(INITIAL_INTERLOCKS);
    setInterlockOperationAuthorized(false);
  }, [sendWsAction]);

  const loginUser = useCallback((name: string, userRole: UserRole) => {
    setUsername(name);
    setRole(userRole);
    setIsDemoMode(!sessionStorage.getItem('ktk_token'));
    sessionStorage.setItem('ktk_username', name);
    sessionStorage.setItem('ktk_role', userRole);
    setActiveSessionId(sessionStorage.getItem('ktk_session_id') || 'default_session');
  }, []);

  const logoutUser = useCallback(() => {
    setUsername('');
    setRole('operator');
    setIsDemoMode(false);
    sessionStorage.removeItem('ktk_username');
    sessionStorage.removeItem('ktk_role');
    sessionStorage.removeItem('ktk_token');
    sessionStorage.removeItem('ktk_session_id');
    setActiveSessionId('default_session');
  }, []);

  const switchSession = useCallback((newSessionId: string) => {
    sessionStorage.setItem('ktk_session_id', newSessionId);
    setActiveSessionId(newSessionId);
  }, []);

  const selectScenario = useCallback((scenId: string) => {
    setScoreCard(null);
    const isDefectScenario = (DEFECT_SCENARIOS as string[]).includes(scenId);

    if (isDefectScenario) {
      const baseScenario = scenId === 'valve_jam' ? 'overpressure_relief' : 'startup';
      setScenarioId(baseScenario);
      if (stateRef.current.isOnline) {
        sendWsAction({ type: 'change_scenario', scenario_id: baseScenario });
        sendWsAction({ type: 'trigger_defect', defect_id: scenId, state: true });
      } else {
        resetSession();
        setDefects(prev => ({ ...prev, [scenId]: true }));
      }
      return;
    }

    setScenarioId(scenId);
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'change_scenario', scenario_id: scenId });
    } else {
      resetSession();
    }
  }, [sendWsAction, resetSession]);

  const selectMode = useCallback((newMode: TrainingMode) => {
    setMode(newMode);
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'change_mode', mode: newMode });
    }
  }, [sendWsAction]);

  const toggleValve = useCallback((valveId: ValveId) => {
    const { isOnline: online, valves: currentValves } = stateRef.current;
    if (online) {
      sendWsAction({ type: 'toggle_valve', valve_id: valveId, state: !currentValves[valveId] });
      return;
    }
    const nextState = !currentValves[valveId];
    setValves(prev => ({ ...prev, [valveId]: nextState }));
    appendLog('info', `Локальный клик: Клапан ${valveId} -> ${nextState ? 'ОТКРЫТ' : 'ЗАКРЫТ'}`);
  }, [sendWsAction, appendLog]);

  const changeSetpoint = useCallback((temp: number) => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'change_setpoint', value: temp });
    } else {
      setSetpoints({ T_1_Sp: temp });
    }
  }, [sendWsAction]);

  const triggerEsd = useCallback(() => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'trigger_esd' });
    } else {
      setStatus('esd');
      appendLog('error', 'АВАРИЙНЫЙ ОСТАНОВ (ESD) запущен оператором локально.');
    }
  }, [sendWsAction, appendLog]);

  const callDispatcher = useCallback(() => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'call_dispatcher' });
    } else {
      appendLog('warning', "Звонок 'Руководитель подразделения / Диспетчер ЦУП: тел. 24-45'");
    }
  }, [sendWsAction, appendLog]);

  const callDutyEngineer = useCallback(() => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'call_duty_engineer' });
    } else {
      setInterlockOperationAuthorized(true);
      appendLog('warning', 'Получено учебное разрешение дежурного инженера на одну операцию деблокировки ПАЗ.');
    }
  }, [sendWsAction, appendLog]);

  const toggleInterlockBypass = useCallback((tag: string, state: boolean) => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'toggle_interlock_bypass', tag, state });
      return;
    }
    setInterlockOperationAuthorized(authorized => {
      if (!authorized) {
        appendLog('warning', 'Сначала позвоните дежурному инженеру перед изменением деблокировки.');
        return authorized;
      }
      setInterlocks(rows => rows.map(row => (row.tag === tag ? { ...row, bypassed: state } : row)));
      appendLog(state ? 'error' : 'warning', `Деблокировка ${tag}: ${state ? 'ВКЛЮЧЕНА' : 'СНЯТА'}.`);
      return false;
    });
  }, [sendWsAction, appendLog]);

  const triggerDefect = useCallback((defectId: DefectId, state: boolean) => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'trigger_defect', defect_id: defectId, state });
    } else {
      setDefects(prev => ({ ...prev, [defectId]: state }));
      appendLog('error', `Локальная неисправность: ${defectId} -> ${state ? 'АКТИВНА' : 'НЕАКТИВНА'}`);
    }
  }, [sendWsAction, appendLog]);

  const changeSpeed = useCallback((multiplier: number) => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'change_speed', multiplier });
    } else {
      setSpeedMultiplier(multiplier);
      appendLog('info', `Локально: Скорость изменена на ${multiplier}x`);
    }
  }, [sendWsAction, appendLog]);

  const togglePause = useCallback((paused: boolean) => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'toggle_pause', paused });
    } else {
      setIsPaused(paused);
      appendLog('info', `Локально: Симуляция ${paused ? 'ПРИОСТАНОВЛЕНА' : 'ВОЗОБНОВЛЕНА'}`);
    }
  }, [sendWsAction, appendLog]);

  const saveState = useCallback(() => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'save_state' });
    } else {
      setHasSnapshot(true);
      appendLog('info', 'Локально: Сделан снимок состояния (снапшот).');
    }
  }, [sendWsAction, appendLog]);

  const loadState = useCallback(() => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'load_state' });
    } else {
      appendLog('warning', 'Локально: Произведен откат к снапшоту.');
    }
  }, [sendWsAction, appendLog]);

  const completeSession = useCallback(() => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'complete' });
    } else {
      setStatus('success');
      setScoreCard({
        score: 100,
        grade: 'A',
        duration: stateRef.current.timeElapsed,
        errors: [],
        recommendations: ['Сценарий успешно выполнен в локальном режиме.'],
      });
    }
  }, [sendWsAction]);

  const configureWebhook = useCallback((url: string, active: boolean) => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'configure_webhook', url, active });
    } else {
      setWebhookUrl(url);
      setWebhookActive(active);
    }
  }, [sendWsAction]);

  const toggleMute = useCallback((fingerprint: string, state: boolean) => {
    if (stateRef.current.isOnline) {
      sendWsAction({ type: 'toggle_mute', fingerprint, state });
    } else {
      setMutes(prev => (state ? [...prev, fingerprint] : prev.filter(f => f !== fingerprint)));
    }
  }, [sendWsAction]);

  // Токен бэкенда живёт 2 часа: получив 401 от любого REST-вызова,
  // возвращаем пользователя на экран входа вместо молчаливого отказа запросов.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      // В демо-режиме токена нет изначально — 401 к нему не относится
      if (!sessionStorage.getItem('ktk_token')) return;
      logoutUser();
    });
    return () => setUnauthorizedHandler(null);
  }, [logoutUser]);

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
      const token = sessionStorage.getItem('ktk_token') || '';
      if (!token) {
        setIsOnline(false);
        return;
      }
      // Сценарий читается из ref, а не из состояния: иначе он попал бы в
      // зависимости эффекта и любая смена сценария пересоздавала бы соединение.
      // Переподключению нужен актуальный сценарий, поэтому ref, а не замыкание.
      const wsUrl = `${wsBase}/ws?role=${role}&username=${encodeURIComponent(username)}&scenario=${stateRef.current.scenarioId}&token=${token}&session_id=${activeSessionId}`;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsOnline(true);
        setLogs(prev => [...prev, makeLog('info', 'Установлено соединение с сервером КТК ЭЛОУ-АВТ.')]);
        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 3000);
      };

      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          // Битый пакет не должен ронять обработчик и рвать соединение
          console.warn('Получен некорректный пакет телеметрии, кадр пропущен.');
          return;
        }

        if (data.type === 'pong') {
          setWsLatency(Date.now() - data.timestamp);
          return;
        }
        if (data.type === 'error') {
          setLogs(prev => [...prev, makeLog('warning', `Сервер отклонил команду: ${data.message}`)]);
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
        setAccidentReason(data.accidentReason);
        // Карточка оценки приходит в каждом пакете после завершения сессии и не
        // меняется — обновляем только при реальном изменении содержимого
        setScoreCard(prev =>
          JSON.stringify(prev) === JSON.stringify(data.scoreCard ?? null) ? prev : data.scoreCard,
        );
        if (data.speedMultiplier !== undefined) setSpeedMultiplier(data.speedMultiplier);
        if (data.isPaused !== undefined) setIsPaused(data.isPaused);
        if (data.hasSnapshot !== undefined) setHasSnapshot(data.hasSnapshot);
        if (data.webhookUrl !== undefined) setWebhookUrl(data.webhookUrl);
        if (data.webhookActive !== undefined) setWebhookActive(data.webhookActive);
        if (data.mutes !== undefined) {
          setMutes(prev => (sameStringList(prev, data.mutes) ? prev : data.mutes));
        }
        if (Array.isArray(data.interlocks)) setInterlocks(data.interlocks);
        if (data.dutyEngineerPhone) setDutyEngineerPhone(data.dutyEngineerPhone);
        if (data.interlockOperationAuthorized !== undefined) {
          setInterlockOperationAuthorized(Boolean(data.interlockOperationAuthorized));
        }
        if (data.mode) setMode(data.mode);
        if (data.operatorName) setOperatorName(data.operatorName);
        if (data.scenarioId) setScenarioId(data.scenarioId);
      };

      ws.onerror = () => {
        // Ошибка обрабатывается в onclose
      };

      ws.onclose = (event) => {
        setIsOnline(false);
        if (pingInterval) clearInterval(pingInterval);

        if (event.code === 4003 || event.code === 4001) {
          sessionStorage.removeItem('ktk_token');
          sessionStorage.removeItem('ktk_username');
          sessionStorage.removeItem('ktk_role');
          sessionStorage.removeItem('ktk_session_id');
          setUsername('');
          setRole('operator');
          return;
        }

        setLogs(prev => {
          const lastLog = prev[prev.length - 1];
          // Дедупликация сообщения о потере связи
          if (lastLog?.message.includes('Потеряно соединение')) return prev;
          return [...prev, makeLog('warning', 'Потеряно соединение с сервером. Попытка переподключения через 3 секунды...')];
        });

        if (isMounted) {
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        }
      };
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      if (pingInterval) clearInterval(pingInterval);
      if (ws) {
        const currentWs = ws;
        currentWs.onclose = null;
        currentWs.onerror = null;
        if (currentWs.readyState === WebSocket.CONNECTING) {
          currentWs.onopen = () => currentWs.close();
        } else {
          currentWs.close();
        }
      }
    };
    // scenarioId намеренно не в зависимостях: смена сценария — это команда в
    // уже открытый сокет, а не новое соединение. Пересоздание рвало сессию, и
    // сервер на подключении оператора сбрасывал её вместе с вброшенной
    // неисправностью. Смена session_id — наоборот, другой поток телеметрии,
    // и переподключение для неё обязательно.
  }, [username, role, activeSessionId]);

  // -------------------------------------------------------------
  // ЛОКАЛЬНЫЙ РЕЗЕРВНЫЙ СИМУЛЯТОР (MOCK-FALLBACK)
  // -------------------------------------------------------------
  useEffect(() => {
    if (isOnline || status !== 'running') return;
    const timer = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [status, isOnline]);

  useEffect(() => {
    if (isOnline || status !== 'running') return;
    const interval = setInterval(() => {
      setSensors(prev => stepMockPhysics(prev, valves, setpoints, defects));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, valves, setpoints, defects, isOnline]);

  // Проверка аварийных пределов в mock-режиме
  useEffect(() => {
    if (isOnline || status !== 'running') return;
    setRiskLevel(evaluateMockRisk(sensors));
    const reason = detectMockAccident(sensors);
    if (reason) {
      setStatus('accident');
      setAccidentReason(reason);
    }
  }, [sensors, status, isOnline]);

  // -------------------------------------------------------------
  // ИСТОРИЯ ТЕЛЕМЕТРИИ (общая для спарклайнов и предиктивного графика)
  // -------------------------------------------------------------
  useEffect(() => {
    if (status !== 'running') return;

    setTelemetryHistory(prev => {
      const lastPoint = prev[prev.length - 1];
      // Защита от дублей: WS может прислать пакет без смены секунды симуляции
      if (lastPoint?.timeElapsed === timeElapsed) return prev;
      const point: TelemetryPoint = {
        timeElapsed,
        T_1: sensors.T_1,
        P_1: sensors.P_1,
        L_1: sensors.L_1,
        L_2: sensors.L_2,
      };
      // Откат таймера = сброс сессии или смена сценария (в т.ч. со стороны сервера):
      // старые точки нельзя смешивать с новыми, иначе ось времени идёт вспять
      if (lastPoint && timeElapsed < lastPoint.timeElapsed) return [point];
      return [...prev.slice(-(TELEMETRY_HISTORY_LIMIT - 1)), point];
    });
  }, [sensors, timeElapsed, status]);

  // -------------------------------------------------------------
  // ЗНАЧЕНИЯ КОНТЕКСТОВ
  // -------------------------------------------------------------
  const telemetryValue = useMemo<TelemetryState>(() => ({
    status,
    timeElapsed,
    valves,
    sensors,
    setpoints,
    defects,
    riskLevel,
    predictions,
    telemetryHistory,
    logs,
    accidentReason,
    wsLatency,
    interlocks,
    dutyEngineerPhone,
    interlockOperationAuthorized,
  }), [status, timeElapsed, valves, sensors, setpoints, defects, riskLevel, predictions, telemetryHistory, logs, accidentReason, wsLatency, interlocks, dutyEngineerPhone, interlockOperationAuthorized]);

  const sessionValue = useMemo<SessionState>(() => ({
    username,
    role,
    operatorName,
    scenarioId,
    activeSessionId,
    isOnline,
    isDemoMode,
    mode,
    speedMultiplier,
    isPaused,
    hasSnapshot,
    scoreCard,
    webhookUrl,
    webhookActive,
    mutes,
    scenarios,
  }), [username, role, operatorName, scenarioId, activeSessionId, isOnline, isDemoMode, mode, speedMultiplier, isPaused, hasSnapshot, scoreCard, webhookUrl, webhookActive, mutes, scenarios]);

  // Все команды стабильны, поэтому объект действий создаётся один раз
  const actionsValue = useMemo<SimulatorActions>(() => ({
    loginUser,
    logoutUser,
    selectScenario,
    switchSession,
    selectMode,
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
    toggleMute,
    callDispatcher,
    callDutyEngineer,
    toggleInterlockBypass,
    reloadScenarios,
  }), [
    loginUser, logoutUser, selectScenario, switchSession, selectMode, toggleValve, changeSetpoint,
    triggerEsd, triggerDefect, resetSession, completeSession, changeSpeed, togglePause, saveState,
    loadState, configureWebhook, toggleMute, callDispatcher, callDutyEngineer,
    toggleInterlockBypass, reloadScenarios,
  ]);

  return (
    <SimulatorActionsContext.Provider value={actionsValue}>
      <SessionContext.Provider value={sessionValue}>
        <TelemetryContext.Provider value={telemetryValue}>
          {children}
        </TelemetryContext.Provider>
      </SessionContext.Provider>
    </SimulatorActionsContext.Provider>
  );
};
