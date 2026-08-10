import React, { useMemo, useState } from 'react';
import { Activity, BrainCircuit } from 'lucide-react';
import { useSession } from '@/entities/session';
import { useTelemetry } from '@/entities/telemetry';
import type { TrainingRecord } from '@/entities/training-record';
import type { SystemMetrics } from '@/shared/api';
import { buildInstructorInsight } from '../model/buildInstructorInsight';
import * as S from './InstructorAiAssistant.styles';

interface InstructorAiAssistantProps {
  history: TrainingRecord[];
  metrics: SystemMetrics | null;
}

/** Объяснимая поддержка решения инструктора без зависимости от внешней LLM. */
const InstructorAiAssistant: React.FC<InstructorAiAssistantProps> = ({ history, metrics }) => {
  const [activeTab, setActiveTab] = useState<'assistant' | 'metrics'>('assistant');
  const { sensors, predictions, riskLevel, status, logs, startupK2Prefill } = useTelemetry();
  const { scenarioId } = useSession();
  const insight = useMemo(() => buildInstructorInsight({
    sensors,
    predictions,
    riskLevel,
    status,
    logs,
    history,
    scenarioId,
    startupK2Prefill,
  }), [history, logs, predictions, riskLevel, scenarioId, sensors, startupK2Prefill, status]);

  return (
    <S.AssistantCard
      $severity={insight.severity}
      title={
        <S.CardTitle>
          {activeTab === 'assistant' ? <BrainCircuit size={15} /> : <Activity size={15} />}
          {activeTab === 'assistant' ? 'ИИ-помощник инструктора' : 'Состояние серверных служб'}
          {activeTab === 'assistant' && <S.MethodBadge>прогноз t+15 + правила</S.MethodBadge>}
        </S.CardTitle>
      }
      extra={
        <S.TabActions>
          <S.TabButton
            type={activeTab === 'assistant' ? 'primary' : 'default'}
            onClick={() => setActiveTab('assistant')}
          >
            ИИ
          </S.TabButton>
          <S.TabButton
            type={activeTab === 'metrics' ? 'primary' : 'default'}
            onClick={() => setActiveTab('metrics')}
          >
            Службы
          </S.TabButton>
        </S.TabActions>
      }
      size="small"
    >
      {activeTab === 'assistant' ? <S.InsightGrid>
        <S.InsightBlock>
          <S.BlockLabel>Оценка ситуации</S.BlockLabel>
          <S.Summary $severity={insight.severity}>{insight.summary}</S.Summary>
          <S.EvidenceList>
            {insight.evidence.map(item => <li key={item}>{item}</li>)}
          </S.EvidenceList>
        </S.InsightBlock>

        <S.InsightBlock>
          <S.BlockLabel>Действие инструктора</S.BlockLabel>
          <S.Detail>{insight.intervention}</S.Detail>
        </S.InsightBlock>

        <S.InsightBlock>
          <S.BlockLabel>Следующая тренировка</S.BlockLabel>
          <S.Summary $severity="stable">{insight.recommendedScenarioTitle}</S.Summary>
          <S.Detail>{insight.recommendationReason}</S.Detail>
        </S.InsightBlock>
      </S.InsightGrid> : metrics ? (
        <S.MetricsGrid>
          <S.MetricItem $isAlert={metrics.cpu_percent > 85}>
            <span className="label">CPU</span>
            <span className="value">{metrics.cpu_percent.toFixed(1)}%</span>
          </S.MetricItem>
          <S.MetricItem $isAlert={metrics.memory_percent > 85}>
            <span className="label">Память</span>
            <span className="value">{metrics.memory_percent.toFixed(1)}%</span>
            <span className="sub">{metrics.memory_used_mb.toFixed(0)} МБ</span>
          </S.MetricItem>
          <S.MetricItem>
            <span className="label">WS-соединения</span>
            <span className="value">{metrics.active_ws_connections}</span>
            <span className="sub">событий: {metrics.processed_events_total}</span>
          </S.MetricItem>
          <S.MetricItem $isAlert={metrics.avg_ping_latency_ms > 100}>
            <span className="label">Отклик</span>
            <span className="value">{metrics.avg_ping_latency_ms.toFixed(0)} мс</span>
            <span className="sub">БД: {metrics.db_size_kb.toFixed(0)} КБ</span>
          </S.MetricItem>
        </S.MetricsGrid>
      ) : (
        <S.MetricsUnavailable>Метрики недоступны — нет связи с сервером КТК.</S.MetricsUnavailable>
      )}
    </S.AssistantCard>
  );
};

export default InstructorAiAssistant;
