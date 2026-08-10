import { describe, expect, it } from 'vitest';
import { INITIAL_SENSORS } from '@/entities/telemetry';
import { buildInstructorInsight } from './buildInstructorInsight';

const baseInput = {
  sensors: INITIAL_SENSORS,
  predictions: [282, 0.26, 51],
  riskLevel: 5,
  status: 'running' as const,
  logs: [],
  history: [],
  scenarioId: 'startup',
};

describe('buildInstructorInsight', () => {
  it('не считает пустую К-2 аварийным фактором во время холодного пуска', () => {
    const insight = buildInstructorInsight({
      ...baseInput,
      sensors: { ...INITIAL_SENSORS, L_1: 50, L_2: 0 },
      startupK2Prefill: true,
    });

    expect(insight.severity).toBe('stable');
    expect(insight.summary).not.toContain('К-2');
  });

  it('не требует вмешательства при стабильном процессе', () => {
    const insight = buildInstructorInsight(baseInput);

    expect(insight.severity).toBe('stable');
    expect(insight.summary).toContain('стабилен');
  });

  it('предупреждает инструктора по прогнозу роста давления', () => {
    const insight = buildInstructorInsight({
      ...baseInput,
      predictions: [282, 0.46, 51],
      riskLevel: 48,
    });

    expect(insight.severity).toBe('critical');
    expect(insight.summary).toContain('давления');
    expect(insight.recommendedScenarioId).toBe('overpressure_relief');
  });

  it('выбирает самый слабый сценарий по истории при стабильном процессе', () => {
    const insight = buildInstructorInsight({
      ...baseInput,
      history: [
        { id: 1, operator_name: 'Оператор', scenario_id: 'startup', duration_sec: 90, score: 92, status: 'success', integrity_valid: true },
        { id: 2, operator_name: 'Оператор', scenario_id: 'shutdown', duration_sec: 80, score: 61, status: 'success', integrity_valid: true },
      ],
    });

    expect(insight.recommendedScenarioId).toBe('shutdown');
    expect(insight.recommendationReason).toContain('61');
  });
});
