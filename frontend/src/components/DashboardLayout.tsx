import React from 'react';
import styled from 'styled-components';
import Header from './Header';
import FlowScheme from './FlowScheme';
import ControlPanel from './ControlPanel';
import AiAssistant from './AiAssistant';
import AlarmLog from './AlarmLog';

const GridContainer = styled.div`
  display: grid;
  grid-template-rows: 60px 1fr 180px; /* Шапка, Главный экран, Журнал логов */
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
  display: grid;
  grid-template-rows: 1.2fr 1fr; /* Панель управления и Панель ИИ */
  gap: 12px;
  overflow: hidden;
`;

const DashboardLayout: React.FC = () => {
  return (
    <GridContainer>
      <Header />
      <MainArea>
        <FlowScheme />
        <Sidebar>
          <ControlPanel />
          <AiAssistant />
        </Sidebar>
      </MainArea>
      <AlarmLog />
    </GridContainer>
  );
};

export default DashboardLayout;
