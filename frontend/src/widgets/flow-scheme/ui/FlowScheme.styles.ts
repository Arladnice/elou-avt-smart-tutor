import styled, { keyframes } from 'styled-components';

export const flowAnimation = keyframes`
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
`;

export const SchemeContainer = styled.div`
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 5px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

export const SchemeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1px;
  color: ${props => props.theme.colors.textMuted};
`;

export const SVGCanvas = styled.svg`
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 380px;
  background-color: ${props => props.theme.colors.canvas};

  .flow-arrow-head {
    fill: ${props => props.theme.colors.accent};
  }

  .source-label,
  .equipment-tag,
  .column-tag,
  .valve-tag {
    fill: ${props => props.theme.colors.text};
    font-family: ${props => props.theme.fonts.mono};
    font-weight: 700;
    text-anchor: middle;
  }

  .source-label {
    font-size: 15px;
    text-anchor: start;
  }

  .equipment-tag,
  .valve-tag {
    font-size: 11px;
  }

  .column-tag {
    font-size: 17px;
  }

  .utility-label {
    fill: ${props => props.theme.colors.textMuted};
    font-family: ${props => props.theme.fonts.mono};
    font-size: 10px;
  }

  .gas-release-label {
    fill: ${props => props.theme.colors.textMuted};
    font-family: ${props => props.theme.fonts.mono};
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.35px;
  }

  .sparkline-frame {
    fill: ${props => props.theme.colors.surface};
    stroke: ${props => props.theme.colors.border};
    stroke-width: 0.5;
    rx: 2px;
  }
`;

// Стилизованные датчики
export const SensorBox = styled.g<{ $isWarning?: boolean; $isDanger?: boolean }>`
  rect.bg {
    fill: ${props => props.theme.colors.surface};
    stroke: ${props => {
      if (props.$isDanger) return props.theme.colors.danger;
      if (props.$isWarning) return props.theme.colors.warning;
      return props.theme.colors.border;
    }};
    stroke-width: 1.5;
  }

  text.value {
    fill: ${props => {
      if (props.$isDanger) return props.theme.colors.danger;
      if (props.$isWarning) return props.theme.colors.warning;
      return props.theme.colors.text;
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
export const ValveGroup = styled.g<{ $isOpen: boolean }>`
  cursor: pointer;

  polygon {
    fill: ${props => (props.$isOpen ? props.theme.colors.successMuted : props.theme.colors.surfaceLight)};
    stroke: ${props => (props.$isOpen ? props.theme.colors.success : props.theme.colors.borderStrong)};
    stroke-width: 2;
    transition: ${props => props.theme.transitions.default};
  }

  > circle {
    fill: ${props => (props.$isOpen ? props.theme.colors.success : props.theme.colors.borderStrong)};
    transition: ${props => props.theme.transitions.default};
  }

  &:hover polygon {
    stroke-width: 3;
  }
`;

export const EquipmentInfoGroup = styled.g`
  cursor: help;
  outline: none;

  circle {
    fill: ${props => props.theme.colors.surfaceLight};
    stroke: ${props => props.theme.colors.borderStrong};
    stroke-width: 1;
    transition: ${props => props.theme.transitions.default};
  }

  text {
    fill: ${props => props.theme.colors.textMuted};
    font-size: 7px;
    font-weight: 700;
    pointer-events: none;
  }

  &:hover circle,
  &:focus-visible circle {
    fill: ${props => props.theme.colors.accentMuted};
    stroke: ${props => props.theme.colors.accent};
  }
`;

// Интерактивные зоны оборудования: открывают фотореференс и инструкцию осмотра.
export const EquipmentGroup = styled.g<{ $isAlert: boolean }>`
  cursor: pointer;
  outline: none;

  .equipment-hitbox {
    fill: transparent;
    stroke: transparent;
    stroke-width: 2;
    transition: ${props => props.theme.transitions.default};
  }

  &:hover .equipment-hitbox,
  &:focus-visible .equipment-hitbox {
    fill: ${props => props.theme.colors.accentMuted};
    stroke: ${props => props.$isAlert ? props.theme.colors.danger : props.theme.colors.accent};
  }

  .pump-body {
    fill: ${props => props.theme.colors.surfaceMuted};
    stroke: ${props => props.$isAlert ? props.theme.colors.danger : props.theme.colors.text};
    stroke-width: 2;
  }

  .pump-rotor {
    fill: ${props => props.$isAlert ? props.theme.colors.danger : props.theme.colors.accentMuted};
    stroke: ${props => props.$isAlert ? props.theme.colors.danger : props.theme.colors.text};
    stroke-width: 1.5;
  }

  .furnace-body {
    fill: ${props => props.$isAlert ? props.theme.colors.dangerMuted : props.theme.colors.warningMuted};
    stroke: ${props => props.$isAlert ? props.theme.colors.danger : props.theme.colors.warning};
    stroke-width: 2;
  }

  .furnace-coil {
    fill: none;
    stroke: ${props => props.$isAlert ? props.theme.colors.danger : props.theme.colors.warning};
    stroke-width: 3;
    stroke-linejoin: round;
  }

  .vessel-body {
    fill: ${props => props.theme.colors.surfaceMuted};
    stroke: ${props => props.$isAlert ? props.theme.colors.danger : props.theme.colors.accent};
    stroke-width: 2;
  }

  .column-body {
    fill: ${props => props.theme.colors.surfaceMuted};
    stroke: ${props => props.$isAlert ? props.theme.colors.danger : props.theme.colors.borderStrong};
    stroke-width: 2;
  }

  .column-tray {
    stroke: ${props => props.theme.colors.text};
    stroke-width: 2;
  }

  .level-frame {
    fill: ${props => props.theme.colors.surface};
    stroke: ${props => props.theme.colors.border};
  }

  .level-fill {
    fill: ${props => props.theme.colors.accent};
  }
`;

// Потоки трубопроводов
export const PipeLine = styled.path<{ $isActive?: boolean }>`
  stroke: ${props => (isActivePipe(props.$isActive) ? props.theme.colors.borderStrong : props.theme.colors.border)};
  stroke-width: 4;
  fill: none;
`;

function isActivePipe(isActive?: boolean): boolean {
  return !!isActive;
}

export const PipeFlow = styled.path<{ $isActive?: boolean; $speed?: string }>`
  stroke: ${props => (isActivePipe(props.$isActive) ? props.theme.colors.accent : 'transparent')};
  stroke-width: 2;
  stroke-dasharray: 8, 16;
  fill: none;
  marker-end: ${props => (isActivePipe(props.$isActive) ? 'url(#flow-arrow)' : 'none')};
  animation: ${flowAnimation} ${props => props.$speed || '1.5s'} linear infinite;
`;

export const UtilityLine = styled.line`
  stroke: ${props => props.theme.colors.textMuted};
  stroke-width: 2;
  stroke-dasharray: 7 5;
`;

export const StaticValveGroup = styled.g`
  polygon {
    fill: ${props => props.theme.colors.surface};
    stroke: ${props => props.theme.colors.text};
    stroke-width: 2;
  }
`;

export const SparklinePath = styled.path<{ $strokeColor: string }>`
  fill: none;
  stroke: ${props => props.$strokeColor};
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

export const OnlineBadge = styled.span<{ $isOnline: boolean }>`
  color: ${props => props.$isOnline ? props.theme.colors.success : props.theme.colors.offline};
  margin-left: 10px;
`;

export const FlameWrapper = styled.g<{ $isActive: boolean }>`
  opacity: ${props => props.$isActive ? 0.8 : 0.2};
  transition: opacity 0.5s ease;
`;

export const BlockFidelityBadge = styled.g<{ $level: 'aggregated' | 'detailed' }>`
  rect {
    fill: ${props => props.$level === 'detailed' ? props.theme.colors.accentMuted : props.theme.colors.warningMuted};
    stroke: ${props => props.$level === 'detailed' ? props.theme.colors.accent : props.theme.colors.warning};
    stroke-width: 1;
    rx: 3;
  }
  text {
    fill: ${props => props.$level === 'detailed' ? props.theme.colors.accent : props.theme.colors.warning};
    font-size: 8px;
    font-weight: 700;
    text-anchor: middle;
  }
`;


