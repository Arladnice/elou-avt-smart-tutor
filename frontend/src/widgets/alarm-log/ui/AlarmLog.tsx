import React, { useEffect, useRef, useState } from 'react';
import { useTelemetry, sendAlarmFeedback, type LogEntry } from '@/entities/telemetry';
import { useSession } from '@/entities/session';
import { AlertTriangle, Info, AlertOctagon, HelpCircle } from 'lucide-react';

import * as S from './AlarmLog.styles';

const AlarmLog: React.FC = () => {
  const { logs } = useTelemetry();
  const { role } = useSession();
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<Record<string, 'confirmed' | 'false_alarm'>>({});
  const consoleRef = useRef<HTMLDivElement>(null);

  // Оценку сработавших алармов принимает только инструктор (бэкенд отдаёт
  // оператору 403 на /api/alarm-feedback), поэтому оператору кнопки не показываем
  const canGiveFeedback = role === 'instructor';

  // Автоматический скролл вниз при добавлении новых логов
  useEffect(() => {
    const el = consoleRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs, filterSeverity]);

  const handleFeedback = async (logId: string | number, fbType: 'confirmed' | 'false_alarm') => {
    try {
      const key = String(logId);
      await sendAlarmFeedback(key, fbType);
      setFeedbackStatus(prev => ({ ...prev, [key]: fbType }));
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
          $active={filterSeverity === null} 
          onClick={() => setFilterSeverity(null)}
        >
          Все
        </S.FilterButton>
        <S.FilterButton 
          $active={filterSeverity === 'CRITICAL'} 
          $sevColor="#ff3333" 
          onClick={() => setFilterSeverity('CRITICAL')}
        >
          🔴 Критич.
        </S.FilterButton>
        <S.FilterButton 
          $active={filterSeverity === 'WARNING'} 
          $sevColor="#ffcc00" 
          onClick={() => setFilterSeverity('WARNING')}
        >
          🟡 Предупр.
        </S.FilterButton>
        <S.FilterButton 
          $active={filterSeverity === 'INFO'} 
          $sevColor="#00e5ff" 
          onClick={() => setFilterSeverity('INFO')}
        >
          🔵 Инфо
        </S.FilterButton>
        <S.FilterButton 
          $active={filterSeverity === 'NO_DATA'} 
          $sevColor="#7c8ba1" 
          onClick={() => setFilterSeverity('NO_DATA')}
        >
          ⚫ Off-line
        </S.FilterButton>
      </S.FilterWrapper>
      
      <S.LogConsole ref={consoleRef}>
        {filteredLogs.map(log => {
          const severity = getSeverity(log);
          const isAlarm = severity === 'CRITICAL' || severity === 'WARNING';
          const fb = feedbackStatus[String(log.id)];

          return (
            <S.LogRow key={log.id} $severity={severity}>
              <S.Timestamp>[{log.time}]</S.Timestamp>
              <S.IconWrapper>{getIcon(severity)}</S.IconWrapper>
              <S.Message>
                {log.message}
                {log.repeat_count && log.repeat_count > 1 ? (
                  <S.RepeatBadge $severity={severity}>×{log.repeat_count}</S.RepeatBadge>
                ) : null}

                {isAlarm && canGiveFeedback && (
                  fb ? (
                    <S.FeedbackBadge $fbType={fb}>
                      {fb === 'confirmed' ? '✅ Подтвержден' : '❌ Ложная тревога'}
                    </S.FeedbackBadge>
                  ) : (
                    <S.FeedbackWrapper>
                      <S.FeedbackActionBtn $fbType="confirm" title="Подтвердить реакцию ИИ" onClick={() => handleFeedback(log.id, 'confirmed')}>
                        ✅
                      </S.FeedbackActionBtn>
                      <S.FeedbackActionBtn $fbType="reject" title="Отметить как ложную тревогу" onClick={() => handleFeedback(log.id, 'false_alarm')}>
                        ❌
                      </S.FeedbackActionBtn>
                    </S.FeedbackWrapper>
                  )
                )}
              </S.Message>
            </S.LogRow>
          );
        })}
      </S.LogConsole>
    </S.LogContent>
  );
};


export default AlarmLog;

