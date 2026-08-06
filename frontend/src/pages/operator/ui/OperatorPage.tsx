import React from 'react';
import { Settings, ListTodo, Terminal, Brain, ShieldAlert } from 'lucide-react';
import { CollapsibleCard } from '@/shared/ui';
import { Header } from '@/widgets/header';
import { FlowScheme } from '@/widgets/flow-scheme';
import { ControlPanel } from '@/widgets/control-panel';
import { ScenarioChecklist, useScenarioInfo, EmergencyTitle } from '@/widgets/scenario-checklist';
import { AiAssistant } from '@/widgets/ai-assistant';
import { AlarmLog } from '@/widgets/alarm-log';
import { ScoreCard } from '@/widgets/score-card';
import { InterlockPanel } from '@/widgets/interlock-panel';
import * as S from './OperatorPage.styles';

/** Рабочее место оператора: мнемосхема, управление уставками, чек-лист, ИИ и журнал */
const OperatorPage: React.FC = () => {
  const { title: scenarioTitle, isEmergency } = useScenarioInfo();

  return (
    <>
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
              title="ПАЗ и деблокировки"
              icon={<ShieldAlert size={14} color="#ffcc00" />}
            >
              <InterlockPanel />
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
              >
                <AlarmLog />
              </CollapsibleCard>
            </S.SidebarLogWrapper>
          </S.Sidebar>
        </S.MainArea>
      </S.GridContainer>
      <ScoreCard />
    </>
  );
};

export default OperatorPage;
