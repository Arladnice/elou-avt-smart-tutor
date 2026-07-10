import styled, { keyframes } from 'styled-components';

export const pulse = keyframes`
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
`;

export const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding: 0 20px;
`;

export const Title = styled.h1`
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

export const StatusIndicator = styled.div<{ status: 'running' | 'paused' | 'esd' | 'accident' | 'success' }>`
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
      if (props.status === 'accident') return props.theme.colors.danger;
      return props.theme.colors.offline;
    }};
    box-shadow: 0 0 8px ${props => {
      if (props.status === 'running') return props.theme.colors.success;
      if (props.status === 'esd') return props.theme.colors.danger;
      if (props.status === 'accident') return props.theme.colors.danger;
      return 'transparent';
    }};
    animation: ${props => (props.status === 'running' || props.status === 'esd' || props.status === 'accident' ? pulse : 'none')} 1.5s infinite;
  }
`;

export const InfoPanel = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

export const InfoItem = styled.div`
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

export const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const Button = styled.button<{ variant?: 'primary' | 'danger' | 'secondary' | 'success' }>`
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
        &:hover:not(:disabled) {
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
        &:hover:not(:disabled) {
          background-color: ${props.theme.colors.primary};
          color: white;
        }
      `;
    }
    if (props.variant === 'success') {
      return `
        background-color: rgba(0, 255, 102, 0.1);
        color: #00ff66;
        border-color: #00ff66;
        &:hover:not(:disabled) {
          background-color: #00ff66;
          color: #0b0f17;
          box-shadow: 0 0 12px #00ff66;
        }
      `;
    }
    return `
      background-color: ${props.theme.colors.background};
      color: ${props.theme.colors.textMuted};
      border-color: ${props.theme.colors.border};
      &:hover:not(:disabled) {
        background-color: ${props.theme.colors.surfaceLight};
        color: ${props.theme.colors.text};
      }
    `;
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
