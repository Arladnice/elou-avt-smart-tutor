import styled from 'styled-components';
import type { LogEntry } from '../context/SimulatorContext';

export const LogContainer = styled.footer`
  background-color: ${props => props.theme.colors.surface};
  border-top: 1px solid ${props => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

export const LogHeader = styled.div`
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

export const LogConsole = styled.div`
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

export const LogRow = styled.div<{ type: LogEntry['type'] }>`
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

export const Timestamp = styled.span`
  color: ${props => props.theme.colors.textMuted};
  flex-shrink: 0;
  width: 50px;
`;

export const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  margin-top: 2px;
  flex-shrink: 0;
`;

export const Message = styled.span`
  word-break: break-word;
`;
