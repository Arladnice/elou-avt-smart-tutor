import React from 'react';
import Header from './Header';
import FlowScheme from './FlowScheme';
import ControlPanel from './ControlPanel';
import ScenarioChecklist, { useScenarioInfo } from './ScenarioChecklist';
import AiAssistant from './AiAssistant';
import AlarmLog from './AlarmLog';
import CollapsibleCard from './CollapsibleCard';
import { Settings, ListTodo, Terminal, Brain } from 'lucide-react';
import * as S from './DashboardLayout.styles';
import { EmergencyTitle } from './ScenarioChecklist.styles';

const DashboardLayout: React.FC = () => {
  const { title: scenarioTitle, isEmergency } = useScenarioInfo();

  return (
    <S.GridContainer>
      <Header />
      <S.MainArea>
        <S.LeftColumn>
          <FlowScheme />
          <S.LeftLogWrapper>
            <CollapsibleCard
              title="Журнал событий и тревог"
              icon={<Terminal size={14} />}
            >
              <AlarmLog />
            </CollapsibleCard>
          </S.LeftLogWrapper>
        </S.LeftColumn>
        <S.Sidebar>
          <CollapsibleCard
            title="Панель управления уставками"
            icon={<Settings size={14} />}
          >
            <ControlPanel />
          </CollapsibleCard>
          <CollapsibleCard
            title={
              isEmergency ? (
                <EmergencyTitle>
                  {scenarioTitle}
                </EmergencyTitle>
              ) : (
                scenarioTitle
              )
            }
            icon={<ListTodo size={14} color={isEmergency ? '#ff4d4f' : '#00e5ff'} />}
            isEmergency={isEmergency}
          >
            <ScenarioChecklist />
          </CollapsibleCard>
          <CollapsibleCard
            title="Интеллектуальный ИИ-Помощник (Smart-MVP)"
            icon={<Brain size={14} color="#00e5ff" />}
          >
            <AiAssistant />
          </CollapsibleCard>
          <S.SidebarLogWrapper>
            <CollapsibleCard
              title="Журнал событий и тревог (SCADA)"
              icon={<Terminal size={14} />}
              defaultCollapsed
            >
              <AlarmLog />
            </CollapsibleCard>
          </S.SidebarLogWrapper>
        </S.Sidebar>
      </S.MainArea>
    </S.GridContainer>
  );
};

export default DashboardLayout;

