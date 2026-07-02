import React, { createContext, useContext, useState, useEffect } from 'react';

export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'warning' | 'error';
  message: string;
}

interface SimulatorContextType {
  status: 'running' | 'paused' | 'esd' | 'success';
  timeElapsed: number; // Время сессии в секундах
  valves: {
    V1: boolean; // Входной клапан печи
    V2: boolean; // Клапан сброса давления колонны
    V3: boolean; // Выход дизельной фракции
  };
  sensors: {
    furnaceTemp: number; // Температура печи, °C
    columnPres: number;  // Давление в колонне, МПа
    columnLevel: number; // Уровень в колонне, %
  };
  setpoints: {
    furnaceTempSp: number; // Уставка температуры, °C
  };
  riskLevel: number; // Риск аварии в %
  logs: LogEntry[];
  toggleValve: (valveId: 'V1' | 'V2' | 'V3') => void;
  changeSetpoint: (temp: number) => void;
  triggerEsd: () => void;
  resetSession: () => void;
}

const SimulatorContext = createContext<SimulatorContextType | undefined>(undefined);

export const SimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SimulatorContextType['status']>('running');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [valves, setValves] = useState({ V1: true, V2: false, V3: true });
  const [setpoints, setSetpoints] = useState({ furnaceTempSp: 280 });
  const [sensors, setSensors] = useState({ furnaceTemp: 280, columnPres: 0.25, columnLevel: 50 });
  const [riskLevel, setRiskLevel] = useState(5);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', time: '00:00', type: 'info', message: 'Система инициализирована. Режим работы: Стабильный.' },
    { id: '2', time: '00:00', type: 'info', message: 'Входной клапан V-1 открыт. Подача сырья в норме.' },
  ]);

  // Таймер времени сессии
  useEffect(() => {
    if (status !== 'running') return;
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Математическая имитация технологического процесса (1-й и 2-й уровни КТК)
  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      setSensors(prev => {
        let nextTemp = prev.furnaceTemp;
        let nextPres = prev.columnPres;
        let nextLevel = prev.columnLevel;

        // 1. Имитация печи
        if (valves.V1) {
          // Если подача сырья идет, температура стремится к уставке
          nextTemp += (setpoints.furnaceTempSp - nextTemp) * 0.1 + (Math.random() - 0.5) * 0.5;
        } else {
          // Если клапан V1 закрыт (нет охлаждения холодным сырьем), печь перегревается
          nextTemp += 2.5 + (Math.random() - 0.5) * 0.2;
        }

        // 2. Имитация давления в колонне
        // Давление растет от температуры печи и уровня в колонне
        nextPres += (nextTemp - 280) * 0.001 + (nextLevel - 50) * 0.0005;
        
        // Если клапан сброса V2 открыт, давление падает
        if (valves.V2) {
          nextPres -= 0.015;
        }
        nextPres = Math.max(0.05, nextPres); // Давление не может быть отрицательным

        // 3. Имитация уровня в колонне
        if (valves.V1) nextLevel += 0.5; // Подача наполняет колонну
        if (valves.V3) nextLevel -= 0.6; // Дренаж сливает

        nextLevel = Math.max(0, Math.min(100, nextLevel));

        return {
          furnaceTemp: Math.round(nextTemp * 100) / 100,
          columnPres: Math.round(nextPres * 100) / 100,
          columnLevel: Math.round(nextLevel * 100) / 100,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, valves, setpoints]);

  // Логика ИИ-модуля (3-й уровень КТК): оценка рисков, ошибки и генерация логов/подсказок
  useEffect(() => {
    if (status !== 'running') return;

    let newRisk = 5;
    const formatTime = (sec: number) => {
      const mins = Math.floor(sec / 60).toString().padStart(2, '0');
      const secs = (sec % 60).toString().padStart(2, '0');
      return `${mins}:${secs}`;
    };

    const addLog = (type: LogEntry['type'], message: string) => {
      setLogs(prev => {
        const timeStr = formatTime(timeElapsed);
        // Избегаем дублирования одинаковых сообщений в логе подряд
        if (prev.length > 0 && prev[prev.length - 1].message === message) return prev;
        return [...prev, { id: Date.now().toString(), time: timeStr, type, message }];
      });
    };

    // Анализ параметров
    if (sensors.furnaceTemp > 310) {
      newRisk += 30;
      addLog('warning', `Критическая температура печи: ${sensors.furnaceTemp}°C. Опасность коксования труб.`);
    }

    if (sensors.columnPres > 0.4) {
      newRisk += 40;
      addLog('error', `Опасное давление в колонне: ${sensors.columnPres} МПа! Требуется сброс давления.`);
    } else if (sensors.columnPres > 0.3) {
      newRisk += 15;
      addLog('warning', `Повышенное давление в колонне: ${sensors.columnPres} МПа.`);
    }

    if (sensors.columnLevel > 85) {
      newRisk += 25;
      addLog('warning', `Высокий уровень в колонне: ${sensors.columnLevel}%. Риск уноса жидкости.`);
    } else if (sensors.columnLevel < 15) {
      newRisk += 20;
      addLog('warning', `Низкий уровень в колонне: ${sensors.columnLevel}%. Риск срыва насосов.`);
    }

    // Если закрыты оба клапана V1 и V2 при высокой температуре - риск взрыва
    if (!valves.V1 && !valves.V2 && sensors.furnaceTemp > 300) {
      newRisk = 100;
      addLog('error', 'ВНИМАНИЕ: Нет подачи сырья, клапан сброса закрыт! Экстренный рост давления!');
    }

    // Ограничение риска
    newRisk = Math.min(100, Math.max(0, newRisk));
    setRiskLevel(newRisk);

    // Логика аварийного завершения
    if (newRisk >= 100) {
      setStatus('esd');
      addLog('error', 'АВАРИЯ: Сработала автоматическая блокировка по критическому давлению!');
    }
  }, [sensors, valves, timeElapsed, status]);

  const toggleValve = (valveId: 'V1' | 'V2' | 'V3') => {
    if (status !== 'running') return;
    setValves(prev => {
      const nextState = !prev[valveId];
      const timeStr = `${Math.floor(timeElapsed / 60).toString().padStart(2, '0')}:${(timeElapsed % 60).toString().padStart(2, '0')}`;
      
      setLogs(l => [
        ...l, 
        { 
          id: Date.now().toString(), 
          time: timeStr, 
          type: 'info', 
          message: `Оператор переключил клапан ${valveId} в состояние: ${nextState ? 'ОТКРЫТ' : 'ЗАКРЫТ'}.` 
        }
      ]);
      return { ...prev, [valveId]: nextState };
    });
  };

  const changeSetpoint = (temp: number) => {
    if (status !== 'running') return;
    setSetpoints({ furnaceTempSp: temp });
  };

  const triggerEsd = () => {
    setStatus('esd');
    setRiskLevel(0);
    setLogs(prev => [
      ...prev,
      { 
        id: Date.now().toString(), 
        time: `${Math.floor(timeElapsed / 60).toString().padStart(2, '0')}:${(timeElapsed % 60).toString().padStart(2, '0')}`, 
        type: 'error', 
        message: 'АВАРИЙНЫЙ ОСТАНОВ (ESD) запущен вручную оператором!' 
      }
    ]);
  };

  const resetSession = () => {
    setStatus('running');
    setTimeElapsed(0);
    setValves({ V1: true, V2: false, V3: true });
    setSetpoints({ furnaceTempSp: 280 });
    setSensors({ furnaceTemp: 280, columnPres: 0.25, columnLevel: 50 });
    setRiskLevel(5);
    setLogs([
      { id: '1', time: '00:00', type: 'info', message: 'Система перезапущена. Режим работы: Стабильный.' },
      { id: '2', time: '00:00', type: 'info', message: 'Входной клапан V-1 открыт. Подача сырья в норме.' },
    ]);
  };

  return (
    <SimulatorContext.Provider value={{
      status,
      timeElapsed,
      valves,
      sensors,
      setpoints,
      riskLevel,
      logs,
      toggleValve,
      changeSetpoint,
      triggerEsd,
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
