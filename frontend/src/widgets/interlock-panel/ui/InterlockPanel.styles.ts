import { Button } from 'antd';
import styled from 'styled-components';

type InterlockVisualState = 'normal' | 'signal' | 'paz' | 'bypassed';

export const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const ContactBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid ${props => props.theme.colors.warning};
  border-radius: 6px;
  background: ${props => props.theme.colors.warningMuted};
`;

export const ContactText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  color: ${props => props.theme.colors.text};
  font-size: 12px;

  span {
    color: ${props => props.theme.colors.textMuted};
    font-size: 10px;
  }
`;

export const CallButton = styled(Button)`
  flex: 0 0 auto;
`;

export const Authorization = styled.div<{ $active: boolean }>`
  color: ${props => (props.$active ? props.theme.colors.success : props.theme.colors.warning)};
  font-size: 11px;
`;

export const InterlockList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const InterlockCard = styled.article<{ $state: InterlockVisualState }>`
  padding: 10px 12px;
  border: 1px solid ${props => {
    if (props.$state === 'paz') return props.theme.colors.danger;
    if (props.$state === 'signal') return props.theme.colors.warning;
    return props.theme.colors.border;
  }};
  border-left-width: 4px;
  border-radius: 6px;
  background: ${props => props.theme.colors.surface};
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 9px;
`;

export const ObjectGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

export const ObjectName = styled.strong`
  color: ${props => props.theme.colors.text};
  font-size: 15px;
`;

export const StatusBadge = styled.span<{ $state: InterlockVisualState }>`
  padding: 3px 7px;
  border-radius: 4px;
  color: ${props => {
    if (props.$state === 'paz') return props.theme.colors.danger;
    if (props.$state === 'signal' || props.$state === 'bypassed') return props.theme.colors.warning;
    return props.theme.colors.success;
  }};
  background: ${props => {
    if (props.$state === 'paz') return props.theme.colors.dangerMuted;
    if (props.$state === 'signal' || props.$state === 'bypassed') return props.theme.colors.warningMuted;
    return props.theme.colors.successMuted;
  }};
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
`;

export const BypassControl = styled.label`
  display: flex;
  align-items: center;
  gap: 7px;
  color: ${props => props.theme.colors.textMuted};
  font-size: 11px;
  white-space: nowrap;
`;

export const Sensors = styled.div`
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 8px;
  margin-bottom: 9px;
`;

export const SensorValues = styled.span`
  color: ${props => props.theme.colors.text};
  font-size: 12px;
  line-height: 1.4;
`;

export const FactsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

export const Fact = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

export const FactLabel = styled.span`
  color: ${props => props.theme.colors.textMuted};
  font-size: 10px;
`;

export const FactValue = styled.span`
  color: ${props => props.theme.colors.text};
  font-size: 12px;
  line-height: 1.3;
  overflow-wrap: anywhere;
`;

export const Note = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.textMuted};
  font-size: 10px;
  line-height: 1.4;
`;
