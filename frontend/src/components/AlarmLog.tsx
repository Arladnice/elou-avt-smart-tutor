import React, { useEffect, useRef, useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import type { LogEntry } from '../context/SimulatorContext';
import { Terminal, AlertTriangle, Info, AlertOctagon, HelpCircle } from 'lucide-react';
import * as S from './AlarmLog.styles';

const AlarmLog: React.FC = () => {
  const { logs } = useSimulator();
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Автоматический скролл вниз при добавлении новых логов
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <S.LogContainer>
      <S.LogHeader>
        <S.HeaderTitle>
          <Terminal size={14} />
          Журнал событий и тревог установки (SCADA Alarms)
        </S.HeaderTitle>
        
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
      </S.LogHeader>
      
      <S.LogConsole>
        {filteredLogs.map(log => {
          const severity = getSeverity(log);
          return (
            <S.LogRow key={log.id} severity={severity}>
              <S.Timestamp>[{log.time}]</S.Timestamp>
              <S.IconWrapper>{getIcon(severity)}</S.IconWrapper>
              <S.Message>
                {log.message}
                {log.repeat_count && log.repeat_count > 1 ? (
                  <S.RepeatBadge severity={severity}>×{log.repeat_count}</S.RepeatBadge>
                ) : null}
              </S.Message>
            </S.LogRow>
          );
        })}
        <div ref={consoleEndRef} />
      </S.LogConsole>
    </S.LogContainer>
  );
};

export default AlarmLog;
