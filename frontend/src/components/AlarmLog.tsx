import React, { useEffect, useRef, useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import type { LogEntry } from '../context/SimulatorContext';
import { AlertTriangle, Info, AlertOctagon, HelpCircle } from 'lucide-react';
import { apiService } from '../services/api';
import * as S from './AlarmLog.styles';

const AlarmLog: React.FC = () => {
  const { logs } = useSimulator();
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<Record<number, 'confirmed' | 'false_alarm'>>({});
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Автоматический скролл вниз при добавлении новых логов
  useEffect(() => {
    const el = consoleRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs, filterSeverity]);

  const handleFeedback = async (logId: number, fbType: 'confirmed' | 'false_alarm') => {
    try {
      await apiService.sendAlarmFeedback(String(logId), fbType);
      setFeedbackStatus(prev => ({ ...prev, [logId]: fbType }));
    } catch (e) {
      console.error('Ошибка отправки фидбека аларма:', e);
    }
  };

  const getSeverity = (log: LogEntry): 'CRITICAL' | 'WARNING' | 'INFO' | 'NO_DATA' => {
    if (log.severity) return log.severity;
    if (log.type === 'error') return 'CRITICAL';
    if (log.type === 'warning') return 'WARNING';
    return 'INFO';
  };

  const getIcon = (severity: string) => {
    if (severity === 'CRITICAL') return <AlertOctagon size={13} />;
    if (severity === 'WARNING') return <AlertTriangle size={13} />;
    if (severity === 'NO_DATA') return <HelpCircle size={13} />;
    return <Info size={13} />;
  };

  const filteredLogs = logs.filter(log => {
    if (!filterSeverity) return true;
    return getSeverity(log) === filterSeverity;
  });

  return (
    <S.LogContent>
      <S.FilterWrapper>
        <S.FilterButton 
          active={filterSeverity === null} 
          onClick={() => setFilterSeverity(null)}
        >
          Все
        </S.FilterButton>
        <S.FilterButton 
          active={filterSeverity === 'CRITICAL'} 
          sevColor="#ff3333" 
          onClick={() => setFilterSeverity('CRITICAL')}
        >
          🔴 Критич.
        </S.FilterButton>
        <S.FilterButton 
          active={filterSeverity === 'WARNING'} 
          sevColor="#ffcc00" 
          onClick={() => setFilterSeverity('WARNING')}
        >
          🟡 Предупр.
        </S.FilterButton>
        <S.FilterButton 
          active={filterSeverity === 'INFO'} 
          sevColor="#00e5ff" 
          onClick={() => setFilterSeverity('INFO')}
        >
          🔵 Инфо
        </S.FilterButton>
        <S.FilterButton 
          active={filterSeverity === 'NO_DATA'} 
          sevColor="#7c8ba1" 
          onClick={() => setFilterSeverity('NO_DATA')}
        >
          ⚫ Off-line
        </S.FilterButton>
      </S.FilterWrapper>
      
      <S.LogConsole ref={consoleRef}>
        {filteredLogs.map(log => {
          const severity = getSeverity(log);
          const isAlarm = severity === 'CRITICAL' || severity === 'WARNING';
          const fb = feedbackStatus[log.id];

          return (
            <S.LogRow key={log.id} severity={severity}>
              <S.Timestamp>[{log.time}]</S.Timestamp>
              <S.IconWrapper>{getIcon(severity)}</S.IconWrapper>
              <S.Message>
                {log.message}
                {log.repeat_count && log.repeat_count > 1 ? (
                  <S.RepeatBadge severity={severity}>×{log.repeat_count}</S.RepeatBadge>
                ) : null}
                {isAlarm && (
                  fb ? (
                    <S.FeedbackBadge fbType={fb}>
                      {fb === 'confirmed' ? '✅ Подтвержден' : '❌ Ложная тревога'}
                    </S.FeedbackBadge>
                  ) : (
                    <S.FeedbackWrapper>
                      <S.FeedbackActionBtn fbType="confirm" title="Подтвердить реакцию ИИ" onClick={() => handleFeedback(log.id, 'confirmed')}>
                        ✅
                      </S.FeedbackActionBtn>
                      <S.FeedbackActionBtn fbType="reject" title="Отметить как ложную тревогу" onClick={() => handleFeedback(log.id, 'false_alarm')}>
                        ❌
                      </S.FeedbackActionBtn>
                    </S.FeedbackWrapper>
                  )
                )}
              </S.Message>
            </S.LogRow>
          );
        })}
        <div ref={consoleEndRef} />
      </S.LogConsole>
    </S.LogContent>
  );
};


export default AlarmLog;

