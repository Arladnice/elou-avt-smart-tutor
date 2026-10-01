import styled, { keyframes } from 'styled-components';

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
  background-color: #070b12;
  overflow: hidden;
  user-select: none;
  border-radius: 8px;
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
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(51, 65, 85, 0.7);
  border-radius: 6px;
  pointer-events: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
`;

export const ViewpointBtn = styled.button<{ $active?: boolean; $isCinematic?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: ${props => (props.$active ? 600 : 500)};
  color: ${props => (props.$active ? '#ffffff' : props.theme.colors.textMuted)};
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
    color: #ffffff;
    background: ${props => (props.$active ? undefined : 'rgba(51, 65, 85, 0.6)')};
  }

  ${props => props.$active && props.$isCinematic && `
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
  color: ${props => (props.$active ? '#10b981' : props.theme.colors.textMuted)};
  background: ${props => (props.$active ? 'rgba(16, 185, 129, 0.15)' : 'transparent')};
  border: 1px solid ${props => (props.$active ? 'rgba(16, 185, 129, 0.4)' : 'transparent')};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #10b981;
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
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(51, 65, 85, 0.7);
  border-radius: 6px;
  pointer-events: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
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
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 20px;
  color: #70a8d2;
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
  z-index: 15;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
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
  background: rgba(10, 16, 26, 0.88);
  backdrop-filter: blur(6px);
  border: 1px solid ${props => {
    if (props.$category === 'furnace') return '#f97316';
    if (props.$category === 'pump') return '#10b981';
    if (props.$category === 'valve') return '#38bdf8';
    return props.theme.colors.primary;
  }};
  border-radius: 6px;
  font-family: ${props => props.theme.fonts.mono};
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translate(-50%, -105%) scale(1.05);
    border-color: #ffffff;
  }
`;

export const BadgeTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
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
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(51, 65, 85, 0.5);
  border-radius: 4px;
  color: ${props => props.theme.colors.textMuted};
  font-size: 11px;
  pointer-events: none;
  z-index: 10;
`;

