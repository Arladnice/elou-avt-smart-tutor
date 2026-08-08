import styled from 'styled-components';

export const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  padding: 0 18px;
  background: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.borderStrong};
  box-shadow: 0 1px 3px ${props => props.theme.colors.shadow};

  @media (max-height: 950px) {
    gap: 10px;
    padding: 0 10px;
  }
`;

export const Title = styled.h1`
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: max-content;
  color: ${props => props.theme.colors.text};
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.2px;

  &::before {
    content: '';
    width: 4px;
    height: 18px;
    align-self: center;
    background: ${props => props.theme.colors.primary};
  }

  span {
    color: ${props => props.theme.colors.textMuted};
    font-size: 12px;
    font-weight: 500;
  }

  @media (max-height: 950px) {
    gap: 7px;
    font-size: 12px;

    span { font-size: 10px; }
    &::before { height: 14px; }
  }
`;

export const DemoBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  color: ${props => props.theme.colors.warning};
  background: ${props => props.theme.colors.warningMuted};
  border: 1px solid ${props => props.theme.colors.warning};
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
`;

export const StatusIndicator = styled.div<{ $status: 'running' | 'paused' | 'esd' | 'accident' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 9px;
  color: ${props => props.theme.colors.text};
  background: ${props => props.theme.colors.surfaceLight};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => {
      if (props.$status === 'running') return props.theme.colors.success;
      if (props.$status === 'esd' || props.$status === 'accident') return props.theme.colors.danger;
      return props.theme.colors.offline;
    }};
  }

  @media (max-height: 950px) {
    padding: 3px 7px;
    font-size: 9px;
  }
`;

export const InfoPanel = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex: 1;
  min-width: 0;

  @media (max-height: 950px) { gap: 10px; }
`;

export const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: ${props => props.theme.colors.textMuted};
  font-size: 12px;
  white-space: nowrap;

  strong {
    max-width: 220px;
    overflow: hidden;
    color: ${props => props.theme.colors.text};
    font-family: ${props => props.theme.fonts.mono};
    font-weight: 600;
    text-overflow: ellipsis;
  }

  @media (max-height: 950px) {
    gap: 4px;
    font-size: 9.5px;
  }
`;

export const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: max-content;
`;

export const Button = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 11px;
  color: ${props => {
    if (props.$variant === 'danger') return props.theme.colors.danger;
    if (props.$variant === 'success') return props.theme.colors.success;
    if (props.$variant === 'primary') return props.theme.colors.primary;
    return props.theme.colors.textMuted;
  }};
  background: ${props => {
    if (props.$variant === 'danger') return props.theme.colors.dangerMuted;
    if (props.$variant === 'success') return props.theme.colors.successMuted;
    if (props.$variant === 'primary') return props.theme.colors.primaryMuted;
    return props.theme.colors.surfaceLight;
  }};
  border: 1px solid ${props => {
    if (props.$variant === 'danger') return props.theme.colors.danger;
    if (props.$variant === 'success') return props.theme.colors.success;
    if (props.$variant === 'primary') return props.theme.colors.primary;
    return props.theme.colors.border;
  }};
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  transition: ${props => props.theme.transitions.default};

  &:hover:not(:disabled) {
    color: ${props => props.theme.colors.surface};
    background: ${props => {
      if (props.$variant === 'danger') return props.theme.colors.danger;
      if (props.$variant === 'success') return props.theme.colors.success;
      if (props.$variant === 'primary') return props.theme.colors.primary;
      return props.theme.colors.textMuted;
    }};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  @media (max-height: 950px) {
    min-height: 28px;
    padding: 4px 8px;
    font-size: 9px;
  }
`;
