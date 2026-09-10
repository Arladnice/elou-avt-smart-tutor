import styled from 'styled-components';

export const BuilderModalContent = styled.div`
  display: flex;
  flex-direction: column;
  height: 84vh;
  min-height: 620px;
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  overflow: hidden;
  border-radius: 6px;
`;

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.surfaceLight};
  gap: 12px;
  flex-wrap: wrap;
`;

export const ToolbarGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const SchemeTitleBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.colors.primary};
`;

export const ModeButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${props => (props.$active ? props.theme.colors.primary : props.theme.colors.border)};
  background-color: ${props => (props.$active ? props.theme.colors.primary : props.theme.colors.surface)};
  color: ${props => (props.$active ? props.theme.colors.surface : props.theme.colors.text)};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
`;

export const ActionButton = styled.button<{ $variant?: 'danger' | 'primary' | 'default' }>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid ${props => {
    if (props.$variant === 'danger') return props.theme.colors.danger;
    if (props.$variant === 'primary') return props.theme.colors.primary;
    return props.theme.colors.border;
  }};
  background-color: ${props => {
    if (props.$variant === 'danger') return 'transparent';
    if (props.$variant === 'primary') return props.theme.colors.primary;
    return props.theme.colors.surface;
  }};
  color: ${props => {
    if (props.$variant === 'danger') return props.theme.colors.danger;
    if (props.$variant === 'primary') return props.theme.colors.surface;
    return props.theme.colors.text;
  }};
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    opacity: 0.88;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export const BuilderWorkspace = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

export const PaletteSidebar = styled.div`
  width: 240px;
  min-width: 240px;
  flex-shrink: 0;
  box-sizing: border-box;
  border-right: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.surface};
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
`;

export const PaletteSectionTitle = styled.div`
  padding: 8px 12px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  background-color: ${props => props.theme.colors.surfaceLight};
  color: ${props => props.theme.colors.textMuted};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  border-top: 1px solid ${props => props.theme.colors.border};

  &:first-child {
    border-top: none;
  }
`;

export const PaletteItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: ${props => props.theme.colors.surfaceLight};
    color: ${props => props.theme.colors.primary};
  }
`;

export const PaletteItemLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const PaletteItemTitle = styled.span`
  font-weight: 500;
`;

export const PaletteItemSub = styled.span`
  font-size: 10px;
  color: ${props => props.theme.colors.textMuted};
`;

export const CanvasArea = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  background-color: ${props => props.theme.colors.mnemonicCanvas};
  display: flex;
  flex-direction: column;
`;

export const CanvasSvg = styled.svg`
  width: 100%;
  height: 100%;
  background-color: ${props => props.theme.colors.mnemonicCanvas};
  user-select: none;

  .scheme-background {
    fill: url(#builder-scheme-panel);
  }

  .scheme-grid {
    fill: url(#builder-grid);
    pointer-events: none;
  }

  .grid-line {
    fill: none;
    stroke: ${props => props.theme.colors.mnemonicGrid};
    stroke-width: ${props => (props.theme.mode === 'light' ? 0.9 : 0.65)};
  }

  .process-zone {
    fill: ${props => props.theme.colors.mnemonicZone};
    stroke: ${props => props.theme.colors.mnemonicZoneBorder};
    stroke-width: 0.65;
    pointer-events: none;
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

export const SelectionBox = styled.rect`
  fill: none;
  stroke: ${props => props.theme.colors.primary};
  stroke-width: 1.5;
  stroke-dasharray: 4 2;
  pointer-events: none;
`;

export const InspectorSidebar = styled.div`
  width: 290px;
  min-width: 290px;
  flex-shrink: 0;
  box-sizing: border-box;
  border-left: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.surface};
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px 14px;
  gap: 14px;
`;

export const InspectorTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  padding-bottom: 8px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
`;

export const FormLabel = styled.label`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const FormInput = styled.input`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 6px 8px;
  background-color: ${props => props.theme.colors.surfaceLight};
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  border-radius: 4px;
  font-size: 12px;

  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
  }
`;

export const FormSelect = styled.select`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 6px 8px;
  background-color: ${props => props.theme.colors.surfaceLight};
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  border-radius: 4px;
  font-size: 12px;

  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
  }
`;

export const CoordinateRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
`;

export const EmptySelectionNotice = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: ${props => props.theme.colors.textMuted};
  font-size: 12px;
  text-align: center;
  gap: 8px;
  padding: 20px;
`;

export const DeleteActionWrapper = styled.div`
  margin-top: auto;
  padding-top: 16px;
  width: 100%;
  box-sizing: border-box;
`;

export const FullWidthActionButton = styled(ActionButton)`
  width: 100%;
  justify-content: center;
`;

export const ZoomBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-family: ${props => props.theme.fonts.mono};
  color: ${props => props.theme.colors.textMuted};
  min-width: 38px;
  text-align: center;
  user-select: none;
`;

export const PipeHandle = styled.circle`
  fill: ${props => props.theme.colors.surface};
  stroke: ${props => props.theme.colors.primary};
  stroke-width: 2.5;
  cursor: grab;
  transition: fill 0.15s ease, stroke 0.15s ease, stroke-width 0.15s ease;

  &:hover {
    fill: ${props => props.theme.colors.primary};
    stroke: #ffffff;
    stroke-width: 3.5;
  }

  &:active {
    cursor: grabbing;
  }
`;

export const SnapPortGroup = styled.g`
  pointer-events: none;
`;

export const SnapPortRing = styled.circle`
  fill: none;
  stroke: #10b981;
  stroke-width: 2.5;
  stroke-dasharray: 4 3;
`;

export const SnapPortDot = styled.circle`
  fill: #10b981;
  stroke: #ffffff;
  stroke-width: 2;
`;

export const SnapPortLabel = styled.text`
  font-family: ${props => props.theme.fonts.mono};
  font-size: 11px;
  font-weight: 700;
  fill: #10b981;
  text-anchor: middle;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
`;

export const PipeMidHandle = styled.circle<{ $axis?: 'x' | 'y' }>`
  fill: #3b82f6;
  stroke: #ffffff;
  stroke-width: 2;
  cursor: ${props => (props.$axis === 'x' ? 'ew-resize' : 'ns-resize')};
  transition: r 0.15s ease, fill 0.15s ease;

  &:hover {
    fill: #60a5fa;
    r: 7;
  }
`;

export const RoutingButtonGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 4px;
`;

export const RoutingButton = styled.button<{ $isActive?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 4px;
  border-radius: 4px;
  background: ${props => (props.$isActive ? props.theme.colors.primary : props.theme.colors.surfaceLight)};
  color: ${props => (props.$isActive ? '#ffffff' : props.theme.colors.text)};
  border: 1px solid ${props => (props.$isActive ? props.theme.colors.primary : props.theme.colors.border)};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${props => (props.$isActive ? props.theme.colors.primary : props.theme.colors.surfaceMuted)};
    border-color: ${props => props.theme.colors.primary};
  }
`;

export const RoutingGlyph = styled.span`
  font-family: ${props => props.theme.fonts.mono};
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
`;


