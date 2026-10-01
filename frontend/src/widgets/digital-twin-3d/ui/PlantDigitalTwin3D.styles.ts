import styled, { css, keyframes } from 'styled-components';

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 24px rgba(16, 185, 129, 0.8);
  }
`;

const cinematicStrobe = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

export const TwinWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 580px;
  background-color: ${props => props.theme.mode === 'dark' ? '#090e17' : '#f1f5f9'};
  overflow: hidden;
  user-select: none;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
  transition: background-color 0.25s ease;
`;

export const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  touch-action: none;
`;

export const TopControlsBar = styled.div`
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  pointer-events: none;
  z-index: 10;
  flex-wrap: wrap;
`;

export const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: ${props => props.theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.88)'};
  backdrop-filter: blur(12px);
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(51, 65, 85, 0.7)' : 'rgba(203, 213, 225, 0.85)'};
  border-radius: 6px;
  pointer-events: auto;
  box-shadow: 0 6px 20px ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.08)'};
`;

export const ViewpointBtn = styled.button<{ $active?: boolean; $isCinematic?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: ${props => (props.$active ? 600 : 500)};
  color: ${props => {
    if (props.$active) return '#ffffff';
    return props.theme.mode === 'dark' ? props.theme.colors.textMuted : props.theme.colors.text;
  }};
  background: ${props => {
    if (props.$active && props.$isCinematic) return 'linear-gradient(135deg, #7c3aed, #4f46e5)';
    if (props.$active) return props.theme.colors.primary;
    return 'transparent';
  }};
  border: 1px solid ${props => (props.$active ? 'rgba(255, 255, 255, 0.2)' : 'transparent')};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => (props.$active ? '#ffffff' : props.theme.colors.primary)};
    background: ${props => (props.$active ? undefined : props.theme.mode === 'dark' ? 'rgba(51, 65, 85, 0.6)' : 'rgba(241, 245, 249, 0.9)')};
  }

  ${props => props.$active && props.$isCinematic && css`
    animation: ${cinematicStrobe} 2s infinite ease-in-out;
  `}
`;

export const ToggleBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: ${props => (props.$active ? '#059669' : props.theme.colors.textMuted)};
  background: ${props => (props.$active ? 'rgba(16, 185, 129, 0.15)' : 'transparent')};
  border: 1px solid ${props => (props.$active ? 'rgba(16, 185, 129, 0.4)' : 'transparent')};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #059669;
    background: rgba(16, 185, 129, 0.1);
  }
`;

export const BottomBar = styled.div`
  position: absolute;
  bottom: 14px;
  left: 14px;
  right: 14px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  pointer-events: none;
  z-index: 10;
`;

export const LegendContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 14px;
  background: ${props => props.theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)'};
  backdrop-filter: blur(12px);
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(51, 65, 85, 0.7)' : 'rgba(203, 213, 225, 0.85)'};
  border-radius: 6px;
  pointer-events: auto;
  box-shadow: 0 6px 20px ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.08)'};
  flex-wrap: wrap;
`;

export const LegendItem = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};

  &::before {
    content: '';
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background-color: ${props => props.$color};
    box-shadow: 0 0 6px ${props => props.$color};
  }
`;

export const HoverPill = styled.div`
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 16px;
  background: ${props => props.theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.94)'};
  backdrop-filter: blur(8px);
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 20px;
  color: ${props => props.theme.colors.primary};
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
  z-index: 15;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  animation: ${pulseGlow} 2s infinite ease-in-out;
`;

export const HotspotOverlayContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
`;

export const HotspotBadge = styled.div<{ $left: number; $top: number; $category?: string }>`
  position: absolute;
  left: ${props => props.$left}px;
  top: ${props => props.$top}px;
  transform: translate(-50%, -100%);
  padding: 4px 8px;
  background: ${props => props.theme.mode === 'dark' ? 'rgba(10, 16, 26, 0.9)' : 'rgba(255, 255, 255, 0.95)'};
  backdrop-filter: blur(6px);
  border: 1px solid ${props => {
    if (props.$category === 'furnace') return '#f97316';
    if (props.$category === 'pump') return '#10b981';
    if (props.$category === 'valve') return '#0284c7';
    return props.theme.colors.primary;
  }};
  border-radius: 6px;
  font-family: ${props => props.theme.fonts.mono};
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;
  box-shadow: 0 4px 14px ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.12)'};
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translate(-50%, -105%) scale(1.05);
    border-color: ${props => props.theme.colors.primary};
  }
`;

export const BadgeTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const BadgeValue = styled.div`
  font-size: 10px;
  color: ${props => props.theme.colors.textMuted};
  margin-top: 1px;
`;

export const HintOverlay = styled.div`
  position: absolute;
  top: 68px;
  right: 14px;
  padding: 6px 12px;
  background: ${props => props.theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.88)'};
  backdrop-filter: blur(8px);
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(203, 213, 225, 0.7)'};
  border-radius: 4px;
  color: ${props => props.theme.colors.textMuted};
  font-size: 11px;
  pointer-events: none;
  z-index: 10;
`;

/* Боковая панель: Навигатор технологических блоков (как на скриншоте 2 КАТКИ) */

export const NavigatorToggleBtn = styled.button<{ $isOpen: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$isOpen ? '#ffffff' : props.theme.colors.text};
  background: ${props => props.$isOpen ? props.theme.colors.primary : 'transparent'};
  border: 1px solid ${props => props.$isOpen ? 'transparent' : props.theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$isOpen ? props.theme.colors.primary : props.theme.colors.surfaceMuted};
  }
`;

export const NavigatorDrawer = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 64px;
  left: 14px;
  bottom: 56px;
  width: 320px;
  max-height: calc(100% - 120px);
  background: ${props => props.theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)'};
  backdrop-filter: blur(14px);
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(51, 65, 85, 0.8)' : 'rgba(203, 213, 225, 0.9)'};
  border-radius: 8px;
  box-shadow: 0 12px 32px ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.12)'};
  display: flex;
  flex-direction: column;
  z-index: 20;
  overflow: hidden;
  transform: ${props => props.$isOpen ? 'translateX(0)' : 'translateX(-340px)'};
  opacity: ${props => props.$isOpen ? 1 : 0};
  pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
`;

export const NavigatorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-size: 12px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
`;

export const NavigatorBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 8px 24px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const UnitSection = styled.div`
  border-radius: 6px;
  background: ${props => props.theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.6)'};
  border: 1px solid ${props => props.theme.colors.border};
  overflow: hidden;
`;

export const UnitSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  background: ${props => props.theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(226, 232, 240, 0.6)'};

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

export const UnitNodeList = styled.div`
  display: flex;
  flex-direction: column;
  padding: 4px;
  gap: 2px;
`;

export const UnitNodeItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  font-size: 11px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: ${props => props.theme.colors.textMuted};
  text-align: left;
  cursor: pointer;
  width: 100%;
  transition: all 0.15s ease;

  &:hover {
    color: ${props => props.theme.colors.text};
    background: ${props => props.theme.mode === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 1)'};
  }

  span.node-tag {
    font-family: ${props => props.theme.fonts.mono};
    font-weight: 700;
    color: ${props => props.theme.colors.primary};
    white-space: nowrap;
    flex-shrink: 0;
    min-width: 32px;
  }
`;

export const DrawerTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const DrawerCloseBtn = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.colors.textMuted};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.15s ease;

  &:hover {
    color: ${props => props.theme.colors.text};
    background: ${props => props.theme.colors.surfaceMuted};
  }
`;

export const NodeLabelGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  flex: 1;

  span:not(.node-tag) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const NodeInfoBtn = styled.div`
  padding: 2px 4px;
  cursor: pointer;
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: all 0.15s ease;

  &:hover {
    opacity: 1;
    color: ${props => props.theme.colors.primary};
  }
`;

