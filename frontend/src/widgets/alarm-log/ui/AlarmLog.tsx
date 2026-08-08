import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from 'styled-components';
import { useTelemetry, type LogEntry } from '@/entities/telemetry';
import { AlertTriangle, Info, AlertOctagon, HelpCircle } from 'lucide-react';

import * as S from './AlarmLog.styles';

const AlarmLog: React.FC = () => {
  const theme = useTheme();
  const { logs } = useTelemetry();
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Автоматический скролл вниз при добавлении новых логов
  useEffect(() => {
    const el = consoleRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs, filterSeverity]);


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
          $sevColor={theme.colors.danger}
          onClick={() => setFilterSeverity('CRITICAL')}
        >
          Критические
        </S.FilterButton>
        <S.FilterButton 
          $active={filterSeverity === 'WARNING'} 
          $sevColor={theme.colors.warning}
          onClick={() => setFilterSeverity('WARNING')}
        >
          Предупреждения
        </S.FilterButton>
        <S.FilterButton 
          $active={filterSeverity === 'INFO'} 
          $sevColor={theme.colors.primary}
          onClick={() => setFilterSeverity('INFO')}
        >
          Информация
        </S.FilterButton>
        <S.FilterButton 
          $active={filterSeverity === 'NO_DATA'} 
          $sevColor={theme.colors.offline}
          onClick={() => setFilterSeverity('NO_DATA')}
        >
          Нет данных
        </S.FilterButton>
      </S.FilterWrapper>
      
      <S.LogConsole ref={consoleRef}>
        {filteredLogs.map(log => {
          const severity = getSeverity(log);
          return (
            <S.LogRow key={log.id} $severity={severity}>
              <S.Timestamp>[{log.time}]</S.Timestamp>
              <S.IconWrapper>{getIcon(severity)}</S.IconWrapper>
              <S.Message>
                {log.message}
                {log.repeat_count && log.repeat_count > 1 ? (
                  <S.RepeatBadge $severity={severity}>×{log.repeat_count}</S.RepeatBadge>
                ) : null}
              </S.Message>
            </S.LogRow>
          );
        })}
      </S.LogConsole>
    </S.LogContent>
  );
};


export default AlarmLog;

