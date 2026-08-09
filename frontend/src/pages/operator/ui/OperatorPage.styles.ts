import styled from 'styled-components';

export const GridContainer = styled.div`
  display: grid;
  grid-template-rows: clamp(48px, 5.5vh, 64px) 1fr; /* Шапка, Главный экран */
  grid-template-columns: 1fr;
  height: 100vh;
  width: 100%;
  min-width: 0;
  background-color: ${props => props.theme.colors.background};

  @media (max-height: 950px) {
    grid-template-rows: 48px 1fr;
  }
`;

export const MainArea = styled.main`
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(320px, 25vw, 480px);
  gap: clamp(8px, 0.55vw, 14px);
  width: min(100%, 3000px);
  margin: 0 auto;
  padding: clamp(8px, 0.55vw, 14px);
  box-sizing: border-box;
  overflow: hidden;
  height: 100%;
  min-height: 0;

  @media (max-height: 950px) {
    gap: 8px;
    padding: 8px;
  }

  @media (min-width: 2600px) {
    width: min(100%, 3320px);
    grid-template-columns: minmax(1120px, 1fr) clamp(560px, 20vw, 720px);
  }

  @media (max-width: 1450px) {
    grid-template-columns: minmax(0, 1fr) minmax(300px, 30vw);
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(520px, 62vh) auto;
    overflow-y: auto;
    height: 100%;
    min-height: 0;
    align-content: start;
  }
`;

export const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  gap: 8px;

  > div:last-child {
    flex: 0 0 clamp(180px, 24vh, 280px);
  }
`;
export const SidebarLogWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 0 0 clamp(180px, 24vh, 280px);
  min-height: 0;
  overflow: hidden;

  > div {
    flex: 1;
    min-height: 0;
  }

  @media (max-height: 950px) {
    flex-basis: clamp(160px, 22vh, 230px);
  }

  > section > div:first-child {
    min-height: 30px;
    padding: 0 12px;
    font-size: 11px;
  }

  > section > div:last-child {
    padding: 4px 8px;
  }
`;

export const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  height: 100%;
  min-width: 0;

  @media (max-height: 950px) {
    gap: 6px;
  }
  
`;

export const SidebarStatusBar = styled.div<{ $hasCritical: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 36px;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid ${props => props.$hasCritical ? props.theme.colors.danger : props.theme.colors.border};
  border-radius: 5px;
  background-color: ${props => props.$hasCritical ? props.theme.colors.dangerMuted : props.theme.colors.surface};
`;

export const StatusLabel = styled.span`
  color: ${props => props.theme.colors.text};
  font-size: 11px;
  font-weight: 700;
`;

export const AlarmCounters = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
`;

export const CriticalCounter = styled.span`
  color: ${props => props.theme.colors.danger};
`;

export const WarningCounter = styled.span`
  color: ${props => props.theme.colors.warning};
`;

export const FixedPanel = styled.section<{ $fill?: boolean }>`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 5px;
  background-color: ${props => props.theme.colors.surface};

  ${props => props.$fill && `height: 100%;`}
`;

export const FixedPanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.textMuted};
  font-size: 13px;
  font-weight: 600;

  @media (max-height: 950px) {
    min-height: 32px;
    padding: 0 12px;
    font-size: 11px;
  }
`;

export const FixedPanelBody = styled.div<{ $fill?: boolean }>`
  min-height: 0;
  padding: 8px 12px;
  ${props => props.$fill && `flex: 1; overflow-y: auto;`}

  @media (max-height: 950px) {
    padding: 6px 10px;
  }
`;

export const SidebarNavigation = styled.nav`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 5px;
  background-color: ${props => props.theme.colors.surface};
  flex-shrink: 0;
`;

export const SidebarTab = styled.button<{ $active: boolean }>`
  min-width: 0;
  min-height: 32px;
  padding: 4px 6px;
  border: 1px solid ${props => props.$active ? props.theme.colors.primary : 'transparent'};
  border-radius: 4px;
  background-color: ${props => props.$active ? props.theme.colors.primaryMuted : 'transparent'};
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.textMuted};
  font: inherit;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;

  &:hover {
    color: ${props => props.theme.colors.primary};
    background-color: ${props => props.theme.colors.primaryMuted};
  }
`;

export const SidebarWorkspace = styled.div`
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;

  /* Кастомный тонкий скроллбар для SCADA-интерфейса */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.borderStrong};
    border-radius: 2px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.primary};
  }
`;
