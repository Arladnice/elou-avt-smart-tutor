import React, { lazy, Suspense, useMemo, useState } from 'react';
import { Settings, ListTodo, Terminal, Brain, ShieldAlert, LineChart } from 'lucide-react';
import { useTelemetry, type LogEntry } from '@/entities/telemetry';
import { CollapsibleCard, LazyFallback } from '@/shared/ui';
import { Header } from '@/widgets/header';
import { FlowScheme } from '@/widgets/flow-scheme';
import { ControlPanel } from '@/widgets/control-panel';
import { ScenarioChecklist, useScenarioInfo, EmergencyTitle } from '@/widgets/scenario-checklist';
import { AiAssistant, RiskAssessment } from '@/widgets/ai-assistant';
import { AlarmLog } from '@/widgets/alarm-log';
import { ScoreCard } from '@/widgets/score-card';
import { InterlockPanel } from '@/widgets/interlock-panel';
import * as S from './OperatorPage.styles';

const PredictiveTrendChart = lazy(() => import('@/widgets/ai-assistant/ui/PredictiveTrendChart'));

/** Рабочее место оператора: мнемосхема, управление уставками, чек-лист, ИИ и журнал */
const OperatorPage: React.FC = () => {
  const { title: scenarioTitle, isEmergency } = useScenarioInfo();
  const { logs } = useTelemetry();
  const [activePanel, setActivePanel] = useState<'tasks' | 'control' | 'interlocks' | 'support' | 'trend'>('tasks');

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
            <S.SidebarLogWrapper>
              <S.FixedPanel $fill>
                <S.FixedPanelHeader><Terminal size={14} /> Журнал событий и тревог</S.FixedPanelHeader>
                <S.FixedPanelBody $fill><AlarmLog /></S.FixedPanelBody>
              </S.FixedPanel>
            </S.SidebarLogWrapper>
          </S.LeftColumn>
          <S.Sidebar>
            <S.SidebarStatusBar $hasCritical={alarmCounts.critical > 0}>
              <S.StatusLabel>Оперативная сводка</S.StatusLabel>
              <S.AlarmCounters>
                <S.CriticalCounter>Критические: {alarmCounts.critical}</S.CriticalCounter>
                <S.WarningCounter>Предупреждения: {alarmCounts.warning}</S.WarningCounter>
              </S.AlarmCounters>
            </S.SidebarStatusBar>

            <CollapsibleCard title="Оценка рисков" icon={<Brain size={14} />}>
              <RiskAssessment />
            </CollapsibleCard>

            <S.SidebarNavigation aria-label="Разделы рабочей панели">
              <S.SidebarTab $active={activePanel === 'tasks'} onClick={() => setActivePanel('tasks')}>
                <ListTodo size={14} /> Задачи
              </S.SidebarTab>
              <S.SidebarTab $active={activePanel === 'control'} onClick={() => setActivePanel('control')}>
                <Settings size={14} /> Управление
              </S.SidebarTab>
              <S.SidebarTab $active={activePanel === 'interlocks'} onClick={() => setActivePanel('interlocks')}>
                <ShieldAlert size={14} /> ПАЗ
              </S.SidebarTab>
              <S.SidebarTab $active={activePanel === 'support'} onClick={() => setActivePanel('support')}>
                <Brain size={14} /> Консультант AI
              </S.SidebarTab>
              <S.SidebarTab $active={activePanel === 'trend'} onClick={() => setActivePanel('trend')}>
                <LineChart size={14} /> Прогноз
              </S.SidebarTab>
            </S.SidebarNavigation>

            <S.SidebarWorkspace>
              {activePanel === 'tasks' && (
                <S.FixedPanel $fill>
                  <S.FixedPanelHeader><ListTodo size={14} /> {isEmergency ? <EmergencyTitle>{scenarioTitle}</EmergencyTitle> : scenarioTitle}</S.FixedPanelHeader>
                  <S.FixedPanelBody $fill><ScenarioChecklist /></S.FixedPanelBody>
                </S.FixedPanel>
              )}
              {activePanel === 'control' && (
                <S.FixedPanel $fill>
                  <S.FixedPanelHeader><Settings size={14} /> Панель управления уставками</S.FixedPanelHeader>
                  <S.FixedPanelBody $fill><ControlPanel /></S.FixedPanelBody>
                </S.FixedPanel>
              )}
              {activePanel === 'interlocks' && (
                <S.FixedPanel $fill>
                  <S.FixedPanelHeader><ShieldAlert size={14} /> ПАЗ и деблокировки</S.FixedPanelHeader>
                  <S.FixedPanelBody $fill><InterlockPanel /></S.FixedPanelBody>
                </S.FixedPanel>
              )}
              <S.PersistedPanel $visible={activePanel === 'support'}>
                <S.FixedPanel $fill>
                  <S.FixedPanelHeader><Brain size={14} /> Система поддержки оператора</S.FixedPanelHeader>
                  <S.FixedPanelBody $fill><AiAssistant hideRiskTab hideTrendTab /></S.FixedPanelBody>
                </S.FixedPanel>
              </S.PersistedPanel>
              {activePanel === 'trend' && (
                <S.FixedPanel $fill>
                  <S.FixedPanelHeader><LineChart size={14} /> Прогноз тренда</S.FixedPanelHeader>
                  <S.FixedPanelBody $fill>
                    <Suspense fallback={<LazyFallback label="Загрузка графика" inline />}>
                      <PredictiveTrendChart />
                    </Suspense>
                  </S.FixedPanelBody>
                </S.FixedPanel>
              )}
            </S.SidebarWorkspace>

          </S.Sidebar>
        </S.MainArea>
      </S.GridContainer>
      <ScoreCard />
    </>
  );
};

export default OperatorPage;
