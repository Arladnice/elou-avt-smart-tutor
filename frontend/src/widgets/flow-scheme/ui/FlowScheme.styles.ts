import styled from 'styled-components';

export const SchemeContainer = styled.div`
  background: linear-gradient(180deg, ${props => props.theme.colors.surfaceLight}, ${props => props.theme.colors.surface});
  border: 1px solid ${props => props.theme.colors.borderStrong};
  border-radius: 8px;
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
  padding: 11px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1px;
  color: ${props => props.theme.colors.textMuted};
`;

export const SchemeViewport = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  min-height: 380px;
  overflow: hidden;
`;

export const SVGCanvas = styled.svg<{ $isPanning: boolean }>`
  flex: 1;
  width: 100%;
  height: 100%;
  background-color: ${props => props.theme.colors.mnemonicCanvas};
  cursor: ${props => props.$isPanning ? 'grabbing' : 'grab'};
  touch-action: none;
  user-select: none;

  .scheme-background {
    fill: url(#scheme-panel);
  }

  .scheme-grid {
    fill: url(#engineering-grid);
    opacity: 0.42;
  }

  .grid-line {
    fill: none;
    stroke: ${props => props.theme.colors.mnemonicGrid};
    stroke-width: 0.45;
  }

  .process-zone {
    fill: ${props => props.theme.colors.mnemonicZone};
    stroke: ${props => props.theme.colors.mnemonicZoneBorder};
    stroke-width: 0.65;
  }

  .flow-arrow-head {
    fill: ${props => props.theme.colors.mnemonicFlow};
  }

  .raw-arrow-head {
    fill: ${props => props.theme.colors.mnemonicText};
  }

  .demulsifier-arrow-head {
    fill: ${props => props.theme.colors.demulsifierLine};
  }

  .fuel-arrow-head {
    fill: ${props => props.theme.colors.fuelLine};
  }

  .steam-arrow-head {
    fill: ${props => props.theme.colors.steamLine};
  }

  .drain-arrow-head {
    fill: ${props => props.theme.colors.drainLine};
  }

  .gas-arrow-head {
    fill: ${props => props.theme.colors.pipeIdle};
  }

  .cutoff-marker-head {
    fill: none;
    stroke: ${props => props.theme.colors.pipeIdle};
    stroke-width: 3;
    stroke-linecap: round;
  }

  .source-label,
  .equipment-tag,
  .column-tag,
  .valve-tag {
    fill: ${props => props.theme.colors.mnemonicText};
    font-family: ${props => props.theme.fonts.mono};
    font-weight: 700;
    text-anchor: middle;
  }

  .source-label {
    font-size: 12px;
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
    fill: ${props => props.theme.colors.mnemonicTextMuted};
    font-family: ${props => props.theme.fonts.mono};
    font-size: 10px;
  }

  .gas-release-label {
    fill: ${props => props.theme.colors.mnemonicTextMuted};
    font-family: ${props => props.theme.fonts.mono};
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.35px;
  }

  .sparkline-frame {
    fill: ${props => props.theme.colors.instrumentBackground};
    stroke: ${props => props.theme.colors.instrumentFrame};
    stroke-width: 1;
    rx: 3px;
  }
`;

// Стилизованные датчики
export const SensorBox = styled.g<{ $isWarning?: boolean; $isDanger?: boolean }>`
  rect.bg {
    fill: ${props => props.theme.colors.instrumentBackground};
    stroke: ${props => {
      if (props.$isDanger) return props.theme.colors.valveClosed;
      if (props.$isWarning) return props.theme.colors.warning;
      return props.theme.colors.instrumentFrame;
    }};
    stroke-width: 2.5;
    filter: drop-shadow(0 2px 2px ${props => props.theme.colors.metalShadow});
  }

  text.value {
    fill: ${props => {
      if (props.$isDanger) return props.theme.colors.instrumentDanger;
      if (props.$isWarning) return props.theme.colors.instrumentWarning;
      return props.theme.colors.instrumentValue;
    }};
    font-family: ${props => props.theme.fonts.mono};
    font-size: 13px;
    font-weight: 700;
  }

  text.label {
    fill: ${props => props.theme.colors.mnemonicText};
    font-size: 10px;
    font-weight: 700;
  }
`;

export const LevelGauge = styled.g<{ $isWarning: boolean; $isDanger: boolean }>`
  .level-gauge-frame {
    fill: url(#equipment-dark-metal);
    stroke: ${props => {
      if (props.$isDanger) return props.theme.colors.instrumentDanger;
      if (props.$isWarning) return props.theme.colors.instrumentWarning;
      return props.theme.colors.instrumentFrame;
    }};
    stroke-width: 1.5;
    filter: drop-shadow(0 1px 1px ${props => props.theme.colors.metalShadow});
  }

  .level-gauge-fill {
    fill: url(#level-glass);
    filter: drop-shadow(0 0 2px ${props => props.theme.colors.levelHighlight});
  }

  .level-gauge-tick {
    stroke: ${props => props.theme.colors.metalLight};
    stroke-width: 0.8;
    opacity: 0.7;
  }
`;

// Стилизованные интерактивные клапаны
export const ValveGroup = styled.g<{ $isOpen: boolean }>`
  cursor: pointer;
  outline: none;

  .valve-state-part {
    fill: ${props => props.$isOpen ? 'url(#pump-running-metal)' : 'url(#pump-stopped-metal)'};
    stroke: ${props => (props.$isOpen ? props.theme.colors.valveOpenBorder : props.theme.colors.valveClosedBorder)};
    stroke-width: 1.3;
    stroke-linejoin: round;
    transition: ${props => props.theme.transitions.default};
    filter: drop-shadow(0 1px 1px ${props => props.theme.colors.metalShadow});
  }

  .valve-body {
    stroke-width: 1.7;
  }

  .valve-stem {
    stroke: ${props => (props.$isOpen ? props.theme.colors.valveOpenBorder : props.theme.colors.valveClosedBorder)};
    stroke-width: 2;
  }

  .valve-wheel {
    fill: ${props => props.$isOpen ? props.theme.colors.valveOpen : props.theme.colors.valveClosed};
    stroke: ${props => (props.$isOpen ? props.theme.colors.valveOpen : props.theme.colors.valveClosed)};
    stroke-width: 2.2;
  }

  .valve-wheel-hub {
    fill: ${props => props.theme.colors.metalLight};
    stroke: ${props => props.$isOpen ? props.theme.colors.valveOpenBorder : props.theme.colors.valveClosedBorder};
    stroke-width: 0.8;
  }

  .valve-hitbox {
    fill: transparent;
    stroke: none;
    pointer-events: all;
  }

  &:hover .valve-state-part {
    filter: brightness(1.18) drop-shadow(0 0 3px ${props => props.theme.colors.metalLight});
  }

  &:focus-visible .valve-state-part {
    stroke: ${props => props.theme.colors.primary};
    stroke-width: 2.5;
  }
`;

// Интерактивные зоны оборудования: открывают фотореференс и инструкцию осмотра.
export const EquipmentGroup = styled.g<{ $isAlert: boolean; $isControllable?: boolean; $isRunning?: boolean }>`
  cursor: ${props => props.$isControllable ? 'pointer' : 'context-menu'};
  outline: none;

  .equipment-hitbox {
    fill: transparent;
    stroke: transparent;
    stroke-width: 2;
    pointer-events: all;
    transition: ${props => props.theme.transitions.default};
  }

  &:hover .equipment-hitbox,
  &:focus-visible .equipment-hitbox {
    fill: ${props => props.theme.colors.accentMuted};
    stroke: ${props => props.$isAlert ? props.theme.colors.valveClosed : props.theme.colors.mnemonicFlow};
  }

  .equipment-shadow {
    fill: ${props => props.theme.colors.metalShadow};
    pointer-events: none;
  }

  .pump-state-part,
  .pump-ring {
    fill: ${props => props.$isRunning && !props.$isAlert ? 'url(#pump-running-metal)' : 'url(#pump-stopped-metal)'};
    stroke: ${props => props.$isRunning && !props.$isAlert ? props.theme.colors.valveOpenBorder : props.theme.colors.valveClosedBorder};
    stroke-width: 1.4;
  }

  .pump-body {
    stroke-width: 1.8;
    filter: url(#equipment-shadow);
  }

  .pump-rotor {
    fill: ${props => props.$isRunning && !props.$isAlert ? props.theme.colors.valveOpenBorder : props.theme.colors.valveClosedBorder};
    stroke: ${props => props.theme.colors.mnemonicText};
    stroke-width: 1;
  }

  .pump-ring {
    stroke-width: 2;
  }

  .pump-hub {
    fill: ${props => props.theme.colors.levelDark};
    stroke: ${props => props.theme.colors.metalLight};
    stroke-width: 1;
  }

  .pump-bolt {
    fill: ${props => props.theme.colors.metalLight};
    stroke: ${props => props.theme.colors.metalEdge};
    stroke-width: 0.55;
  }

  .furnace-body {
    fill: url(#equipment-metal);
    stroke: ${props => props.$isAlert ? props.theme.colors.valveClosedBorder : props.theme.colors.metalEdge};
    stroke-width: 1.8;
    filter: url(#equipment-shadow);
  }

  .furnace-rim,
  .furnace-rib,
  .furnace-band,
  .furnace-side-pipe {
    fill: none;
    stroke: ${props => props.theme.colors.metalDark};
    stroke-width: 1.2;
  }

  .furnace-stack,
  .furnace-stack-cap,
  .furnace-base,
  .vessel-leg,
  .vessel-nozzle,
  .vessel-nozzle-cap,
  .column-nozzle,
  .column-nozzle-cap,
  .column-base,
  .column-side-nozzle {
    fill: url(#equipment-metal);
    stroke: ${props => props.theme.colors.metalEdge};
    stroke-width: 1;
  }

  .equipment-rivet {
    fill: ${props => props.theme.colors.metalLight};
    stroke: ${props => props.theme.colors.metalDark};
    stroke-width: 0.5;
  }

  .equipment-alert-badge circle {
    fill: ${props => props.theme.colors.levelDark};
    stroke: ${props => props.theme.colors.metalLight};
    stroke-width: 1.5;
    filter: drop-shadow(0 1px 2px ${props => props.theme.colors.metalShadow});
  }

  .equipment-alert-badge text {
    fill: ${props => props.theme.colors.metalLight};
    font-family: ${props => props.theme.fonts.main};
    font-size: 16px;
    font-weight: 800;
  }

  .furnace-window {
    fill: ${props => props.theme.colors.instrumentBackground};
    stroke: ${props => props.theme.colors.metalDark};
    stroke-width: 2;
  }

  .furnace-flame {
    fill: url(#flame-gradient);
    stroke: ${props => props.theme.colors.flameHigh};
    stroke-width: 0.8;
  }

  .vessel-body {
    fill: url(#equipment-metal);
    stroke: ${props => props.$isAlert ? props.theme.colors.valveClosedBorder : props.theme.colors.metalEdge};
    stroke-width: 1.8;
    filter: url(#equipment-shadow);
  }

  .vessel-seam {
    fill: none;
    stroke: ${props => props.theme.colors.metalDark};
    stroke-width: 1.1;
  }

  .vessel-leg-shade {
    fill: ${props => props.theme.colors.metalDark};
    opacity: 0.5;
  }

  .column-body {
    fill: url(#equipment-metal);
    stroke: ${props => props.$isAlert ? props.theme.colors.valveClosedBorder : props.theme.colors.metalEdge};
    stroke-width: 2;
    filter: url(#equipment-shadow);
  }

  .column-cap,
  .column-band,
  .column-side-pipe,
  .column-level-tick {
    fill: none;
    stroke: ${props => props.theme.colors.metalDark};
    stroke-width: 1.2;
  }

  .column-side-pipe {
    stroke-width: 2.5;
  }

  .column-level-frame {
    fill: url(#equipment-dark-metal);
    stroke: ${props => props.theme.colors.metalDark};
    stroke-width: 2;
  }

  .column-level-fill {
    fill: url(#level-glass);
    filter: drop-shadow(0 0 3px ${props => props.theme.colors.levelHighlight});
  }
`;

export const ZoomControls = styled.div`
  display: flex;
  align-items: center;
  flex: none;
  margin-left: 4px;
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.borderStrong};
  border-radius: 5px;
  background: linear-gradient(180deg, ${props => props.theme.colors.surfaceLight}, ${props => props.theme.colors.surface});
  box-shadow: 0 2px 8px ${props => props.theme.colors.shadow};
`;

export const ZoomButton = styled.button`
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-left: 1px solid ${props => props.theme.colors.border};
  background: transparent;
  color: ${props => props.theme.colors.text};
  text-transform: uppercase;
  box-shadow: inset 0 -1px 0 ${props => props.theme.colors.shadow};
  cursor: pointer;

  &:first-child {
    border-left: 0;
  }

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.primaryMuted};
    color: ${props => props.theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: -2px;
  }

  &:disabled {
    color: ${props => props.theme.colors.borderStrong};
    cursor: not-allowed;
  }
`;

export const ZoomValue = styled.span`
  display: grid;
  width: 46px;
  height: 30px;
  place-items: center;
  border-left: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  font-family: ${props => props.theme.fonts.mono};
  font-size: 11px;
  font-weight: 700;
`;

export const ZoomHint = styled.span`
  position: absolute;
  bottom: 14px;
  left: 14px;
  padding: 4px 7px;
  border-radius: 3px;
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  text-transform: uppercase;
  box-shadow: inset 0 -1px 0 ${props => props.theme.colors.shadow};
  font-size: 10px;
  pointer-events: none;

  @media (max-width: 900px) {
    display: none;
  }
`;

// Потоки трубопроводов
export const PipeLine = styled.path<{ $isActive?: boolean; $isCutOff?: boolean }>`
  stroke: ${props => {
    if (props.$isActive === false) return props.theme.colors.pipeIdle;
    if (props.$isActive) return props.theme.colors.mnemonicFlow;
    return props.theme.colors.mnemonicText;
  }};
  stroke-width: 4.5;
  stroke-dasharray: none;
  fill: none;
  pointer-events: none;
  marker-end: ${props => {
    if (props.$isActive === false && props.$isCutOff) return 'url(#cutoff-marker)';
    if (props.$isActive) return 'url(#flow-arrow)';
    if (props.$isActive === undefined) return 'url(#raw-arrow)';
    return 'none';
  }};
  filter: drop-shadow(0 1px 0 ${props => props.theme.colors.metalLight});
`;

export const DemulsifierLine = styled.path<{ $isActive?: boolean }>`
  stroke: ${props => props.$isActive === false ? props.theme.colors.pipeIdle : props.theme.colors.demulsifierLine};
  stroke-width: 3;
  stroke-dasharray: none;
  fill: none;
  pointer-events: none;
  marker-end: ${props => props.$isActive === false ? 'url(#cutoff-marker)' : 'url(#demulsifier-arrow)'};
  filter: drop-shadow(0 1px 0 ${props => props.theme.colors.metalLight});
`;

export const UtilityLine = styled.line<{ $kind?: 'steam' | 'fuel' | 'drain'; $isActive?: boolean }>`
  stroke: ${props => {
    if (props.$isActive === false) return props.theme.colors.pipeIdle;
    if (props.$kind === 'steam') return props.theme.colors.steamLine;
    if (props.$kind === 'fuel') return props.theme.colors.fuelLine;
    if (props.$kind === 'drain') return props.theme.colors.drainLine;
    return props.theme.colors.mnemonicTextMuted;
  }};
  stroke-width: 2.5;
  pointer-events: none;
  stroke-dasharray: ${props => {
    if (props.$isActive === false) return 'none';
    if (props.$kind === 'steam') return '7 5';
    return 'none';
  }};
  marker-end: ${props => {
    if (props.$isActive === false) return 'url(#cutoff-marker)';
    if (props.$kind === 'steam') return 'url(#steam-arrow)';
    if (props.$kind === 'fuel') return 'url(#fuel-arrow)';
    if (props.$kind === 'drain') return 'url(#drain-arrow)';
    return 'none';
  }};
  filter: drop-shadow(0 1px 0 ${props => props.theme.colors.metalLight});
`;

export const GasLine = styled.path<{ $isActive?: boolean }>`
  stroke: ${props => props.$isActive === true
    ? props.theme.colors.mnemonicFlow
    : props.theme.colors.pipeIdle};
  stroke-width: ${props => props.$isActive === true ? 4 : 3.2};
  stroke-dasharray: none;
  fill: none;
  pointer-events: none;
  marker-end: ${props => {
    if (props.$isActive === false) return 'url(#cutoff-marker)';
    if (props.$isActive === true) return 'url(#flow-arrow)';
    return 'url(#gas-arrow)';
  }};
  filter: drop-shadow(0 1px 0 ${props => props.theme.colors.metalLight});
  transition: ${props => props.theme.transitions.default};
`;

export const StaticValveGroup = styled.g`
  polygon {
    fill: ${props => props.theme.colors.surface};
    stroke: ${props => props.theme.colors.text};
    stroke-width: 2;
    stroke-linejoin: round;
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


