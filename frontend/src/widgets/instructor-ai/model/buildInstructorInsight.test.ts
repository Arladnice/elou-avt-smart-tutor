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

  it('не переключает статус в attention при паузе и возобновлении симуляции', () => {
    const insight = buildInstructorInsight({
      ...baseInput,
      logs: [
        { id: '1', time: '00:05', type: 'warning', message: 'ИНСТРУКТОР: Симуляция ПРИОСТАНОВЛЕНА.' },
        { id: '2', time: '00:08', type: 'info', message: 'ИНСТРУКТОР: Симуляция ВОЗОБНОВЛЕНА.' },
      ],
    });

    expect(insight.severity).toBe('stable');
    expect(insight.summary).toContain('стабилен');
    expect(insight.evidence[0]).toContain('Риск аварии');
  });

  it('остаётся в stable, если параметры процесса в норме, несмотря на давние устранённые алармы', () => {
    const insight = buildInstructorInsight({
      ...baseInput,
      riskLevel: 5,
      logs: [
        { id: '1', time: '00:02', type: 'warning', message: 'Предупреждение: Температура печи П-1 (365.5°C) выше нормы' },
        { id: '2', time: '00:05', type: 'info', message: 'Оператор стабилизировал подачу топлива' },
        { id: '3', time: '00:06', type: 'info', message: 'Клапан V-1 открыт на 100%' },
        { id: '4', time: '00:07', type: 'info', message: 'Телеметрия стабильна' },
      ],
    });

    expect(insight.severity).toBe('stable');
    expect(insight.summary).toContain('стабилен');
  });

  it('реагирует вниманием, если технологический аларм произошёл только что', () => {
    const insight = buildInstructorInsight({
      ...baseInput,
      riskLevel: 15,
      logs: [
        { id: '1', time: '00:05', type: 'warning', message: 'Предупреждение: Давление в колонне К-1 (0.450 МПа) приближается к предельному!' },
      ],
    });

    expect(insight.severity).toBe('attention');
    expect(insight.summary).toContain('отклонения');
  });
});
