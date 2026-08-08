import React, { useMemo, useState } from 'react';
import { Settings, ListTodo, Terminal, Brain, ShieldAlert } from 'lucide-react';
import { useTelemetry, type LogEntry } from '@/entities/telemetry';
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
  const { logs } = useTelemetry();
  const [activePanel, setActivePanel] = useState<'tasks' | 'control' | 'interlocks' | 'support'>('tasks');

  const alarmCounts = useMemo(() => {
    const getSeverity = (log: LogEntry) => {
      if (log.severity) return log.severity;
      if (log.type === 'error') return 'CRITICAL';
      if (log.type === 'warning') return 'WARNING';
      return 'INFO';
    };

    return logs.reduce(
      (counts, log) => {
        const severity = getSeverity(log);
        if (severity === 'CRITICAL') counts.critical += 1;
        if (severity === 'WARNING') counts.warning += 1;
        return counts;
      },
      { critical: 0, warning: 0 },
    );
  }, [logs]);

  return (
    <>
      <S.GridContainer>
        <Header />
        <S.MainArea>
          <S.LeftColumn>
            <FlowScheme />
          </S.LeftColumn>
          <S.Sidebar>
            <S.SidebarStatusBar $hasCritical={alarmCounts.critical > 0}>
              <S.StatusLabel>Оперативная сводка</S.StatusLabel>
              <S.AlarmCounters>
                <S.CriticalCounter>Критические: {alarmCounts.critical}</S.CriticalCounter>
                <S.WarningCounter>Предупреждения: {alarmCounts.warning}</S.WarningCounter>
              </S.AlarmCounters>
            </S.SidebarStatusBar>

            <S.SidebarNavigation aria-label="Разделы рабочей панели">
              <S.SidebarTab $active={activePanel === 'tasks'} onClick={() => setActivePanel('tasks')}>
                <ListTodo size={14} />
                Задачи
              </S.SidebarTab>
              <S.SidebarTab $active={activePanel === 'control'} onClick={() => setActivePanel('control')}>
                <Settings size={14} />
                Управление
              </S.SidebarTab>
              <S.SidebarTab $active={activePanel === 'interlocks'} onClick={() => setActivePanel('interlocks')}>
                <ShieldAlert size={14} />
                ПАЗ
              </S.SidebarTab>
              <S.SidebarTab $active={activePanel === 'support'} onClick={() => setActivePanel('support')}>
                <Brain size={14} />
                Поддержка
              </S.SidebarTab>
            </S.SidebarNavigation>

            <S.SidebarWorkspace>
              {activePanel === 'tasks' && (
                <CollapsibleCard
                  title={
                    isEmergency ? <EmergencyTitle>{scenarioTitle}</EmergencyTitle> : scenarioTitle
                  }
                  icon={<ListTodo size={14} />}
                  isEmergency={isEmergency}
                  fill
                >
                  <ScenarioChecklist />
                </CollapsibleCard>
              )}
              {activePanel === 'control' && (
                <CollapsibleCard title="Панель управления уставками" icon={<Settings size={14} />} fill>
                  <ControlPanel />
                </CollapsibleCard>
              )}
              {activePanel === 'interlocks' && (
                <CollapsibleCard title="ПАЗ и деблокировки" icon={<ShieldAlert size={14} />} fill>
                  <InterlockPanel />
                </CollapsibleCard>
              )}
              {activePanel === 'support' && (
                <CollapsibleCard title="Система поддержки оператора" icon={<Brain size={14} />} fill>
                  <AiAssistant />
                </CollapsibleCard>
              )}
            </S.SidebarWorkspace>

            <S.SidebarLogWrapper>
              <CollapsibleCard
                title="Журнал событий и тревог"
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
