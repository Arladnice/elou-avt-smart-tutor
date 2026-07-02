import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useSimulator } from '../context/SimulatorContext';
import { Play, RotateCcw, ShieldAlert, User } from 'lucide-react';

const pulse = keyframes`
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
`;

const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding: 0 20px;
`;

const Title = styled.h1`
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 16px;
    background-color: ${props => props.theme.colors.accent};
  }
`;

const StatusIndicator = styled.div<{ status: 'running' | 'paused' | 'esd' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  background-color: ${props => props.theme.colors.background};
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};

  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => {
      if (props.status === 'running') return props.theme.colors.success;
      if (props.status === 'esd') return props.theme.colors.danger;
      return props.theme.colors.offline;
    }};
    box-shadow: 0 0 8px ${props => {
      if (props.status === 'running') return props.theme.colors.success;
      if (props.status === 'esd') return props.theme.colors.danger;
      return 'transparent';
    }};
    animation: ${props => (props.status === 'running' || props.status === 'esd' ? pulse : 'none')} 1.5s infinite;
  }
`;

const InfoPanel = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${props => props.theme.colors.textMuted};

  strong {
    color: ${props => props.theme.colors.text};
    font-family: ${props => props.theme.fonts.mono};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Button = styled.button<{ variant?: 'primary' | 'danger' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: ${props => props.theme.transitions.default};

  ${props => {
    if (props.variant === 'danger') {
      return `
        background-color: rgba(255, 51, 51, 0.15);
        color: ${props.theme.colors.danger};
        border-color: ${props.theme.colors.danger};
        &:hover {
          background-color: ${props.theme.colors.danger};
          color: white;
          box-shadow: 0 0 12px ${props.theme.colors.danger};
        }
      `;
    }
    if (props.variant === 'primary') {
      return `
        background-color: rgba(0, 112, 243, 0.15);
        color: ${props.theme.colors.primary};
        border-color: ${props.theme.colors.primary};
        &:hover {
          background-color: ${props.theme.colors.primary};
          color: white;
        }
      `;
    }
    return `
      background-color: ${props.theme.colors.background};
      color: ${props.theme.colors.textMuted};
      border-color: ${props.theme.colors.border};
      &:hover {
        background-color: ${props.theme.colors.surfaceLight};
        color: ${props.theme.colors.text};
      }
    `;
  }}
`;

const Header: React.FC = () => {
  const { status, timeElapsed, triggerEsd, resetSession } = useSimulator();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getStatusText = () => {
    if (status === 'running') return 'Работа';
    if (status === 'esd') return 'Аварийный Останов';
    return 'Пауза';
  };

  return (
    <HeaderContainer>
      <Title>КТК ЭЛОУ-АВТ // ИИ-Модуль</Title>
      
      <StatusIndicator status={status}>
        {getStatusText()}
      </StatusIndicator>

      <InfoPanel>
        <InfoItem>
          <User size={14} />
          Оператор: <strong>Денис Арлаков</strong>
        </InfoItem>
        <InfoItem>
          <Play size={14} />
          Сессия: <strong>{formatTime(timeElapsed)}</strong>
        </InfoItem>
      </InfoPanel>

      <Actions>
        <Button onClick={resetSession} variant="primary">
          <RotateCcw size={12} />
          Сброс
        </Button>
        <Button onClick={triggerEsd} variant="danger" disabled={status === 'esd'}>
          <ShieldAlert size={12} />
          Авария (ESD)
        </Button>
      </Actions>
    </HeaderContainer>
  );
};

export default Header;
