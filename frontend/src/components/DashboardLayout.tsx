import React from 'react';
import Header from './Header';
import FlowScheme from './FlowScheme';
import ControlPanel from './ControlPanel';
import ScenarioChecklist from './ScenarioChecklist';
import AiAssistant from './AiAssistant';
import AlarmLog from './AlarmLog';
import * as S from './DashboardLayout.styles';

const DashboardLayout: React.FC = () => {
  return (
    <S.GridContainer>
      <Header />
      <S.MainArea>
        <S.LeftColumn>
          <FlowScheme />
          <S.LeftLogWrapper>
            <AlarmLog />
          </S.LeftLogWrapper>
        </S.LeftColumn>
        <S.Sidebar>
          <ControlPanel />
          <ScenarioChecklist />
          <AiAssistant />
          <S.SidebarLogWrapper>
            <AlarmLog />
          </S.SidebarLogWrapper>
        </S.Sidebar>
      </S.MainArea>
    </S.GridContainer>
  );
};

export default DashboardLayout;
