import React, { useEffect, useRef } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import type { LogEntry } from '../context/SimulatorContext';
import { Terminal, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import * as S from './AlarmLog.styles';

const AlarmLog: React.FC = () => {
  const { logs } = useSimulator();
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Автоматический скролл вниз при добавлении новых логов
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getIcon = (type: LogEntry['type']) => {
    if (type === 'error') return <AlertOctagon size={13} />;
    if (type === 'warning') return <AlertTriangle size={13} />;
    return <Info size={13} />;
  };

  return (
    <S.LogContainer>
      <S.LogHeader>
        <Terminal size={14} />
        Журнал событий и тревог установки (SCADA Alarms)
      </S.LogHeader>
      
      <S.LogConsole>
        {logs.map(log => (
          <S.LogRow key={log.id} type={log.type}>
            <S.Timestamp>[{log.time}]</S.Timestamp>
            <S.IconWrapper>{getIcon(log.type)}</S.IconWrapper>
            <S.Message>{log.message}</S.Message>
          </S.LogRow>
        ))}
        <div ref={consoleEndRef} />
      </S.LogConsole>
    </S.LogContainer>
  );
};

export default AlarmLog;
