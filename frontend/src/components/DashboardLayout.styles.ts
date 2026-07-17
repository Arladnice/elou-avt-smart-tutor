import styled from 'styled-components';

export const GridContainer = styled.div`
  display: grid;
  grid-template-rows: 60px 1fr; /* Шапка, Главный экран */
  grid-template-columns: 1fr;
  height: 100vh;
  width: 100vw;
  background-color: ${props => props.theme.colors.background};

  @media (max-height: 950px) {
    grid-template-rows: 48px 1fr;
  }
`;

export const MainArea = styled.main`
  display: grid;
  grid-template-columns: minmax(0, 10fr) minmax(0, 4fr); /* Защита от распирания колонок */
  gap: 12px;
  padding: 12px;
  overflow: hidden;
  height: calc(100vh - 60px);

  @media (max-height: 950px) {
    gap: 8px;
    padding: 8px;
    height: calc(100vh - 48px);
  }
`;

export const LeftColumn = styled.div`
  display: grid;
  grid-template-rows: 1fr;
  height: 100%;
  overflow: hidden;

  @media (max-height: 780px) {
    grid-template-rows: 1fr 100px;
    gap: 8px;
  }
`;

export const LeftLogWrapper = styled.div`
  display: none;

  @media (max-height: 780px) {
    display: block;
    height: 100%;
    min-height: 0;
  }
`;

export const SidebarLogWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 100px;

  @media (max-height: 780px) {
    display: none;
  }
`;

export const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  height: 100%;

  @media (max-height: 950px) {
    gap: 6px;
  }
  
  /* Кастомный тонкий скроллбар для SCADA-интерфейса */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #222c3e;
    border-radius: 2px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #00e5ff;
  }
`;

