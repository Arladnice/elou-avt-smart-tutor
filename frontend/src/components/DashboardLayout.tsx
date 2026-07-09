import React from 'react';
import styled from 'styled-components';
import Header from './Header';
import FlowScheme from './FlowScheme';
import ControlPanel from './ControlPanel';
import ScenarioChecklist from './ScenarioChecklist';
import AiAssistant from './AiAssistant';
import AlarmLog from './AlarmLog';

const GridContainer = styled.div`
  display: grid;
  grid-template-rows: 60px 1fr 110px; /* Шапка, Главный экран, Журнал логов */
  grid-template-columns: 1fr;
  height: 100vh;
  width: 100vw;
  background-color: ${props => props.theme.colors.background};
`;

const MainArea = styled.main`
  display: grid;
  grid-template-columns: minmax(0, 10fr) minmax(0, 4fr); /* Защита от распирания колонок */
  gap: 12px;
  padding: 12px 12px 0 12px;
  overflow: hidden;
`;

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  height: 100%;
  
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

const DashboardLayout: React.FC = () => {
  return (
    <GridContainer>
      <Header />
      <MainArea>
        <FlowScheme />
        <Sidebar>
          <ControlPanel />
          <ScenarioChecklist />
          <AiAssistant />
        </Sidebar>
      </MainArea>
      <AlarmLog />
    </GridContainer>
  );
};

export default DashboardLayout;
