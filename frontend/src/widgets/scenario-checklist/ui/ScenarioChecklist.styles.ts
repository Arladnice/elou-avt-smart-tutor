import styled, { keyframes } from 'styled-components';

export const pulse = keyframes`
  0%, 100% { opacity: 0.72; }
  50% { opacity: 1; }
`;

export const ChecklistContent = styled.div`
  display: flex;
  flex-direction: column;
  color: ${props => props.theme.colors.text};
`;

export const EmergencyTitle = styled.span`
  color: ${props => props.theme.colors.danger};
  font-weight: bold;
  animation: ${pulse} 2s infinite ease-in-out;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

export const TasksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-height: 950px) {
    gap: 4px;
  }
`;

export const TaskItem = styled.div<{ $status: 'completed' | 'active' | 'pending' }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background-color: ${props => {
    if (props.$status === 'completed') return props.theme.colors.successMuted;
    if (props.$status === 'active') return props.theme.colors.primaryMuted;
    return 'transparent';
  }};
  border: 1px solid ${props => {
    if (props.$status === 'completed') return props.theme.colors.success;
    if (props.$status === 'active') return props.theme.colors.primary;
    return props.theme.colors.border;
  }};
  border-radius: 6px;
  padding: 8px 12px;
  transition: ${props => props.theme.transitions.default};

  @media (max-height: 950px) {
    padding: 6px 10px;
    gap: 8px;
  }

  &:hover {
    border-color: ${props => {
      if (props.$status === 'completed') return props.theme.colors.success;
      if (props.$status === 'active') return props.theme.colors.accent;
      return props.theme.colors.borderStrong;
    }};
  }
`;

export const IconWrapper = styled.div<{ $status: 'completed' | 'active' | 'pending' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  color: ${props => {
    if (props.$status === 'completed') return props.theme.colors.success;
    if (props.$status === 'active') return props.theme.colors.accent;
    return props.theme.colors.textMuted;
  }};

  svg.pulsing {
    animation: ${pulse} 1.5s infinite ease-in-out;
  }
  
  svg.completed {
  }
`;

export const TaskDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const TaskTitle = styled.span<{ $status: 'completed' | 'active' | 'pending' }>`
  font-size: 14px;
  font-weight: 600;
  color: ${props => {
    if (props.$status === 'completed') return props.theme.colors.success;
    if (props.$status === 'active') return props.theme.colors.text;
    return props.theme.colors.text;
  }};
  text-decoration: ${props => props.$status === 'completed' ? 'line-through' : 'none'};
  opacity: ${props => props.$status === 'pending' ? 0.85 : 1};

  @media (max-height: 950px) {
    font-size: 13px;
  }
`;

export const TaskHint = styled.span<{ $status: 'completed' | 'active' | 'pending' }>`
  font-size: 12.5px;
  color: ${props => {
    if (props.$status === 'completed') return props.theme.colors.textMuted;
    if (props.$status === 'active') return props.theme.colors.text;
    return props.theme.colors.textMuted;
  }};
  line-height: 1.45;

  @media (max-height: 950px) {
    font-size: 11.5px;
  }
`;

