import styled from 'styled-components';

export const EquipmentGroup = styled.g<{ $isAlert?: boolean; $isControllable?: boolean; $isRunning?: boolean }>`
  cursor: ${props => props.$isControllable ? 'pointer' : 'default'};
  transition: opacity 0.2s ease;

  .equipment-hitbox {
    fill: transparent;
    pointer-events: all;
  }

  .equipment-shadow {
    fill: ${props => props.theme.colors.shadow};
    opacity: 0.35;
    filter: drop-shadow(0 2px 4px ${props => props.theme.colors.shadow});
  }

  .equipment-tag {
    font-family: ${props => props.theme.fonts.mono};
    font-size: 11px;
    font-weight: 700;
    fill: ${props => props.theme.colors.text};
    text-anchor: middle;
    pointer-events: none;
  }

  .column-tag {
    font-family: ${props => props.theme.fonts.mono};
    font-size: 13px;
    font-weight: 800;
    fill: ${props => props.theme.colors.text};
    text-anchor: middle;
    pointer-events: none;
  }

  .pump-state-part {
    fill: ${props => props.$isRunning ? 'url(#pump-running-metal)' : 'url(#pump-stopped-metal)'};
    stroke: ${props => {
      if (props.$isAlert) return props.theme.colors.valveClosedBorder;
      return props.$isRunning ? props.theme.colors.valveOpenBorder : props.theme.colors.valveClosedBorder;
    }};
    stroke-width: 1.5;
    transition: fill 0.3s ease, stroke 0.3s ease;
  }

  .pump-ring {
    fill: ${props => props.theme.colors.metalDark};
    stroke: ${props => props.theme.colors.metalLight};
    stroke-width: 1.2;
  }

  .pump-rotor {
    fill: ${props => props.theme.colors.metalLight};
  }

  .pump-hub {
    fill: ${props => props.theme.colors.metalDark};
    stroke: ${props => props.theme.colors.borderStrong};
    stroke-width: 1;
  }

  .pump-bolt {
    fill: ${props => props.theme.colors.borderStrong};
  }

  .furnace-stack {
    fill: url(#equipment-metal);
    stroke: ${props => props.theme.colors.metalEdge};
    stroke-width: 1.2;
  }

  .furnace-stack-cap,
  .furnace-base,
  .column-base,
  .column-nozzle,
  .column-nozzle-cap,
  .column-side-nozzle,
  .vessel-leg,
  .vessel-nozzle,
  .vessel-nozzle-cap {
    fill: ${props => props.theme.colors.metalDark};
    stroke: ${props => props.theme.colors.borderStrong};
    stroke-width: 1.2;
  }

  .furnace-body {
    fill: url(#equipment-metal);
    stroke: ${props => props.$isAlert ? props.theme.colors.valveClosedBorder : props.theme.colors.metalEdge};
    stroke-width: 1.8;
    filter: url(#equipment-shadow);
  }

  .furnace-rim,
  .furnace-band,
  .furnace-rib,
  .furnace-side-pipe {
    fill: none;
    stroke: ${props => props.theme.colors.metalDark};
    stroke-width: 1.2;
  }

  .furnace-side-pipe {
    stroke-width: 2.2;
  }

  .furnace-window {
    fill: ${props => props.theme.colors.metalDark};
    stroke: ${props => props.theme.colors.metalLight};
    stroke-width: 1.2;
  }

  .equipment-rivet {
    fill: ${props => props.theme.colors.borderStrong};
  }

  .equipment-alert-badge circle {
    fill: ${props => props.theme.colors.valveClosedBorder};
    stroke: ${props => props.theme.colors.surface};
    stroke-width: 1.5;
  }

  .equipment-alert-badge text {
    fill: ${props => props.theme.colors.text};
    font-family: ${props => props.theme.fonts.mono};
    font-size: 11px;
    font-weight: 800;
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

export const FlameWrapper = styled.g<{ $isActive: boolean }>`
  opacity: ${props => props.$isActive ? 0.8 : 0.2};
  transition: opacity 0.5s ease;
`;

export const ValveGroup = styled.g<{ $isOpen: boolean }>`
  cursor: pointer;

  .valve-hitbox {
    fill: transparent;
    pointer-events: all;
  }

  .valve-state-part {
    fill: ${props => props.$isOpen ? props.theme.colors.valveOpen : props.theme.colors.valveClosed};
    stroke: ${props => props.$isOpen ? props.theme.colors.valveOpenBorder : props.theme.colors.valveClosedBorder};
    stroke-width: 1.4;
    transition: fill 0.3s ease, stroke 0.3s ease;
  }

  .valve-stem {
    stroke: ${props => props.$isOpen ? props.theme.colors.valveOpenBorder : props.theme.colors.valveClosedBorder};
    stroke-width: 1.8;
  }

  .valve-wheel {
    fill: ${props => props.$isOpen ? props.theme.colors.valveOpen : props.theme.colors.valveClosed};
    stroke: ${props => props.$isOpen ? props.theme.colors.valveOpenBorder : props.theme.colors.valveClosedBorder};
    stroke-width: 1.2;
  }

  .valve-wheel-hub {
    fill: ${props => props.theme.colors.metalLight};
  }

  .valve-tag {
    font-family: ${props => props.theme.fonts.mono};
    font-size: 10px;
    font-weight: 700;
    fill: ${props => props.theme.colors.text};
    text-anchor: middle;
    pointer-events: none;
  }

  &:hover .valve-state-part {
    filter: brightness(1.2);
  }

  &:focus-visible {
    outline: none;
    .valve-wheel {
      stroke: ${props => props.theme.colors.primary};
      stroke-width: 2;
    }
  }
`;

export const SensorBox = styled.g<{ $isWarning?: boolean; $isDanger?: boolean }>`
  rect.bg {
    fill: ${props => {
      if (props.$isDanger) return props.theme.colors.dangerMuted;
      if (props.$isWarning) return props.theme.colors.warningMuted;
      return props.theme.colors.surface;
    }};
    stroke: ${props => {
      if (props.$isDanger) return props.theme.colors.danger;
      if (props.$isWarning) return props.theme.colors.warning;
      return props.theme.colors.border;
    }};
    stroke-width: 1.2;
    transition: fill 0.3s ease, stroke 0.3s ease;
  }

  text.value {
    font-family: ${props => props.theme.fonts.mono};
    font-size: 11px;
    font-weight: 700;
    fill: ${props => {
      if (props.$isDanger) return props.theme.colors.danger;
      if (props.$isWarning) return props.theme.colors.warning;
      return props.theme.colors.primary;
    }};
  }

  text.label {
    font-family: ${props => props.theme.fonts.mono};
    font-size: 9px;
    font-weight: 600;
    fill: ${props => props.theme.colors.textMuted};
  }
`;

export const SparklinePath = styled.path<{ $strokeColor: string }>`
  fill: none;
  stroke: ${props => props.$strokeColor};
  stroke-width: 1.2;
`;

export const LevelGauge = styled.g<{ $isWarning?: boolean; $isDanger?: boolean }>`
  .level-gauge-frame {
    fill: ${props => props.theme.colors.surfaceLight};
    stroke: ${props => {
      if (props.$isDanger) return props.theme.colors.danger;
      if (props.$isWarning) return props.theme.colors.warning;
      return props.theme.colors.border;
    }};
    stroke-width: 1;
  }

  .level-gauge-fill {
    fill: ${props => {
      if (props.$isDanger) return props.theme.colors.danger;
      if (props.$isWarning) return props.theme.colors.warning;
      return props.theme.colors.levelCyan;
    }};
    transition: width 0.3s ease, fill 0.3s ease;
  }

  .level-gauge-tick {
    stroke: ${props => props.theme.colors.borderStrong};
    stroke-width: 1;
  }
`;

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

export const UtilityLine = styled.line<{ $kind?: 'steam' | 'fuel' | 'drain' | 'utility'; $isActive?: boolean }>`
  stroke: ${props => {
    if (props.$isActive === false) return props.theme.colors.pipeIdle;
    if (props.$kind === 'steam' || props.$kind === 'utility') return props.theme.colors.steamLine;
    if (props.$kind === 'fuel') return props.theme.colors.fuelLine;
    if (props.$kind === 'drain') return props.theme.colors.drainLine;
    return props.theme.colors.mnemonicTextMuted;
  }};
  stroke-width: 2.5;
  pointer-events: none;
  stroke-dasharray: ${props => {
    if (props.$isActive === false) return 'none';
    if (props.$kind === 'steam' || props.$kind === 'utility') return '7 5';
    return 'none';
  }};
  marker-end: ${props => {
    if (props.$isActive === false) return 'url(#cutoff-marker)';
    if (props.$kind === 'steam' || props.$kind === 'utility') return 'url(#steam-arrow)';
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
