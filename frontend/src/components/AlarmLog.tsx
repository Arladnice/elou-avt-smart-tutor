import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useSimulator } from '../context/SimulatorContext';
import type { LogEntry } from '../context/SimulatorContext';
import { Terminal, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

const LogContainer = styled.footer`
  background-color: ${props => props.theme.colors.surface};
  border-top: 1px solid ${props => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  height: 180px;
  overflow: hidden;
`;

const LogHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${props => props.theme.colors.textMuted};
  background-color: #0b0f17;
`;

const LogConsole = styled.div`
  flex: 1;
  padding: 10px 16px;
  overflow-y: auto;
  font-family: ${props => props.theme.fonts.mono};
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background-color: #080b10;
`;

const LogRow = styled.div<{ type: LogEntry['type'] }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  line-height: 1.4;
  
  color: ${props => {
    if (props.type === 'error') return props.theme.colors.danger;
    if (props.type === 'warning') return props.theme.colors.warning;
    return props.theme.colors.text;
  }};
  
  transition: ${props => props.theme.transitions.default};
`;

const Timestamp = styled.span`
  color: ${props => props.theme.colors.textMuted};
  flex-shrink: 0;
  width: 50px;
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  margin-top: 2px;
  flex-shrink: 0;
`;

const Message = styled.span`
  word-break: break-word;
`;

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
    <LogContainer>
      <LogHeader>
        <Terminal size={14} />
        Журнал событий и тревог установки (SCADA Alarms)
      </LogHeader>
      
      <LogConsole>
        {logs.map(log => (
          <LogRow key={log.id} type={log.type}>
            <Timestamp>[{log.time}]</Timestamp>
            <IconWrapper>{getIcon(log.type)}</IconWrapper>
            <Message>{log.message}</Message>
          </LogRow>
        ))}
        <div ref={consoleEndRef} />
      </LogConsole>
    </LogContainer>
  );
};

export default AlarmLog;
