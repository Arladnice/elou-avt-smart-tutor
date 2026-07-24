import styled from 'styled-components';

export const LogContent = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: ${props => props.theme.colors.text};
`;


export const FilterWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  text-transform: none;
  font-family: inherit;
  margin-bottom: 8px;
`;

export const FilterButton = styled.button<{ active: boolean; sevColor?: string }>`
  background-color: ${props => props.active ? 'rgba(0, 229, 255, 0.15)' : 'transparent'};
  border: 1px solid ${props => props.active ? '#00e5ff' : 'transparent'};
  color: ${props => props.active ? '#00e5ff' : props.sevColor || props.theme.colors.textMuted};
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(0, 229, 255, 0.08);
    border-color: rgba(0, 229, 255, 0.5);
  }
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

  @media (max-height: 950px) {
    padding: 6px 12px;
    font-size: 11px;
    gap: 4px;
  }
`;

export const LogRow = styled.div<{ severity: string }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  line-height: 1.4;
  
  color: ${props => {
    if (props.severity === 'CRITICAL') return props.theme.colors.danger;
    if (props.severity === 'WARNING') return props.theme.colors.warning;
    if (props.severity === 'NO_DATA') return props.theme.colors.textMuted;
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

export const RepeatBadge = styled.span<{ severity: string }>`
  background-color: ${props => {
    if (props.severity === 'CRITICAL') return 'rgba(255, 51, 51, 0.15)';
    if (props.severity === 'WARNING') return 'rgba(255, 204, 0, 0.15)';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  color: inherit;
  border: 1px solid currentColor;
  border-radius: 4px;
  padding: 0px 4px;
  font-size: 9px;
  font-weight: 700;
  margin-left: 6px;
  display: inline-block;
  vertical-align: middle;
`;

export const FeedbackWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  vertical-align: middle;
`;

export const FeedbackActionBtn = styled.button<{ fbType: 'confirm' | 'reject' }>`
  background-color: ${props => props.fbType === 'confirm' ? 'rgba(82, 196, 26, 0.15)' : 'rgba(255, 77, 79, 0.15)'};
  border: 1px solid ${props => props.fbType === 'confirm' ? '#52c41a' : '#ff4d4f'};
  color: ${props => props.fbType === 'confirm' ? '#52c41a' : '#ff4d4f'};
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.85;
    transform: scale(1.03);
  }
`;

export const FeedbackBadge = styled.span<{ fbType: 'confirmed' | 'false_alarm' }>`
  font-size: 10px;
  font-weight: 600;
  margin-left: 8px;
  padding: 1px 5px;
  border-radius: 3px;
  color: ${props => props.fbType === 'confirmed' ? '#52c41a' : '#ff4d4f'};
  background-color: ${props => props.fbType === 'confirmed' ? 'rgba(82, 196, 26, 0.12)' : 'rgba(255, 77, 79, 0.12)'};
  border: 1px solid ${props => props.fbType === 'confirmed' ? 'rgba(82, 196, 26, 0.4)' : 'rgba(255, 77, 79, 0.4)'};
`;

