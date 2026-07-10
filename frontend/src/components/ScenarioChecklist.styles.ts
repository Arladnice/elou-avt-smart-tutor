import styled, { keyframes } from 'styled-components';
import { Card } from 'antd';

export const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

export const ChecklistContainer = styled(Card)`
  background-color: ${props => props.theme.colors.surface};
  border-color: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  border-radius: 6px;
  overflow: hidden;

  .ant-card-head {
    border-bottom: 1px solid ${props => props.theme.colors.border};
    padding: 0 16px;
    min-height: 40px;
  }

  .ant-card-head-title {
    color: ${props => props.theme.colors.textMuted};
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
  }

  .ant-card-body {
    padding: 8px 12px;
  }
`;

export const TasksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const TaskItem = styled.div<{ status: 'completed' | 'active' | 'pending' }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background-color: ${props => {
    if (props.status === 'completed') return 'rgba(0, 255, 102, 0.03)';
    if (props.status === 'active') return 'rgba(0, 229, 255, 0.03)';
    return 'transparent';
  }};
  border: 1px solid ${props => {
    if (props.status === 'completed') return 'rgba(0, 255, 102, 0.15)';
    if (props.status === 'active') return 'rgba(0, 229, 255, 0.2)';
    return props.theme.colors.border;
  }};
  border-radius: 4px;
  padding: 6px 10px;
  transition: all 0.3s ease;

  &:hover {
    border-color: ${props => {
      if (props.status === 'completed') return props.theme.colors.success;
      if (props.status === 'active') return props.theme.colors.accent;
      return '#3a475d';
    }};
  }
`;

export const IconWrapper = styled.div<{ status: 'completed' | 'active' | 'pending' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  color: ${props => {
    if (props.status === 'completed') return props.theme.colors.success;
    if (props.status === 'active') return props.theme.colors.accent;
    return props.theme.colors.textMuted;
  }};

  svg.pulsing {
    animation: ${pulse} 1.5s infinite ease-in-out;
    filter: drop-shadow(0 0 4px ${props => props.theme.colors.accent});
  }
  
  svg.completed {
    filter: drop-shadow(0 0 4px ${props => props.theme.colors.success});
  }
`;

export const TaskDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const TaskTitle = styled.span<{ status: 'completed' | 'active' | 'pending' }>`
  font-size: 12px;
  font-weight: 600;
  color: ${props => {
    if (props.status === 'completed') return props.theme.colors.success;
    if (props.status === 'active') return props.theme.colors.text;
    return props.theme.colors.textMuted;
  }};
  text-decoration: ${props => props.status === 'completed' ? 'line-through' : 'none'};
  opacity: ${props => props.status === 'pending' ? 0.6 : 1};
`;

export const TaskHint = styled.span<{ status: 'completed' | 'active' | 'pending' }>`
  font-size: 10px;
  color: ${props => {
    if (props.status === 'active') return props.theme.colors.textMuted;
    return 'rgba(124, 139, 161, 0.5)';
  }};
  line-height: 1.3;
`;
