import styled, { keyframes } from 'styled-components';

export const flowAnimation = keyframes`
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
`;

export const SchemeContainer = styled.div`
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const SchemeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${props => props.theme.colors.textMuted};
`;

export const SVGCanvas = styled.svg`
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 380px;
  background-color: #0b0f17;
`;

// Стилизованные датчики
export const SensorBox = styled.g<{ isWarning?: boolean; isDanger?: boolean }>`
  rect.bg {
    fill: #131924;
    stroke: ${props => {
      if (props.isDanger) return props.theme.colors.danger;
      if (props.isWarning) return props.theme.colors.warning;
      return props.theme.colors.border;
    }};
    stroke-width: 1.5;
    filter: ${props => (props.isDanger || props.isWarning ? `drop-shadow(0 0 4px ${props.isDanger ? props.theme.colors.danger : props.theme.colors.warning})` : 'none')};
  }

  text.value {
    fill: ${props => {
      if (props.isDanger) return props.theme.colors.danger;
      if (props.isWarning) return props.theme.colors.warning;
      return props.theme.colors.accent;
    }};
    font-family: ${props => props.theme.fonts.mono};
    font-size: 13px;
    font-weight: 700;
  }

  text.label {
    fill: ${props => props.theme.colors.textMuted};
    font-size: 10px;
    font-weight: 500;
  }
`;

// Стилизованные интерактивные клапаны
export const ValveGroup = styled.g<{ isOpen: boolean }>`
  cursor: pointer;

  polygon {
    fill: ${props => (props.isOpen ? 'rgba(0, 255, 102, 0.1)' : 'rgba(255, 51, 51, 0.1)')};
    stroke: ${props => (props.isOpen ? props.theme.colors.success : props.theme.colors.danger)};
    stroke-width: 2;
    transition: ${props => props.theme.transitions.default};
  }

  circle {
    fill: ${props => (props.isOpen ? props.theme.colors.success : props.theme.colors.danger)};
    filter: drop-shadow(0 0 6px ${props => (props.isOpen ? props.theme.colors.success : props.theme.colors.danger)});
    transition: ${props => props.theme.transitions.default};
  }

  &:hover polygon {
    stroke-width: 3;
  }
`;

// Потоки трубопроводов
export const PipeLine = styled.path<{ isActive?: boolean }>`
  stroke: ${props => (isActivePipe(props.isActive) ? '#1a365d' : '#222c3e')};
  stroke-width: 4;
  fill: none;
`;

function isActivePipe(isActive?: boolean): boolean {
  return !!isActive;
}

export const PipeFlow = styled.path<{ isActive?: boolean; speed?: string }>`
  stroke: ${props => (isActivePipe(props.isActive) ? props.theme.colors.accent : 'transparent')};
  stroke-width: 2;
  stroke-dasharray: 8, 16;
  fill: none;
  animation: ${flowAnimation} ${props => props.speed || '1.5s'} linear infinite;
`;

export const SparklinePath = styled.path<{ strokeColor: string }>`
  fill: none;
  stroke: ${props => props.strokeColor};
  stroke-width: 1.2;
`;

// Новые чистые контейнеры для стилизации вместо inline-стилей

export const HeaderTitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const HeaderStatusContainer = styled.div`
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const OnlineBadge = styled.span<{ isOnline: boolean }>`
  color: ${props => props.isOnline ? '#00ff66' : '#7c8ba1'};
  margin-left: 10px;
`;

export const FlameWrapper = styled.g<{ isActive: boolean }>`
  opacity: ${props => props.isActive ? 0.8 : 0.2};
  transition: opacity 0.5s ease;
`;
