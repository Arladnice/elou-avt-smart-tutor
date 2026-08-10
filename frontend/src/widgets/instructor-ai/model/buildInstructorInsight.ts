import type { TrainingRecord } from '@/entities/training-record';
import type { LogEntry, Sensors, SimulatorStatus } from '@/entities/telemetry';
import {
  K2_LEVEL_HIGH,
  K2_LEVEL_LOW,
  LEVEL_HIGH,
  LEVEL_LOW,
  PRES_WARNING,
  TEMP_WARNING,
} from '@/shared/config';

export type InsightSeverity = 'stable' | 'attention' | 'critical';

export interface InstructorInsight {
  severity: InsightSeverity;
  summary: string;
  evidence: string[];
  intervention: string;
  recommendedScenarioId: string | null;
  recommendedScenarioTitle: string;
  recommendationReason: string;
}

interface InstructorInsightInput {
  sensors: Sensors;
  predictions: number[];
  riskLevel: number;
  status: SimulatorStatus;
  logs: LogEntry[];
  history: TrainingRecord[];
  scenarioId: string;
  startupK2Prefill?: boolean;
}

const SCENARIO_TITLES: Record<string, string> = {
  startup: 'Пуск установки ЭЛОУ-АВТ',
  shutdown: 'Аварийный останов печей П-1 и П-3',
  column_shutdown: 'Останов колонны К-1',
  overpressure_relief: 'Ликвидация роста давления',
  recirculation: 'Перевод установки на рециркуляцию',
};

interface RiskDriver {
  severity: InsightSeverity;
  summary: string;
  evidence: string;
  intervention: string;
  scenarioId: string;
}

const severityRank: Record<InsightSeverity, number> = {
  stable: 0,
  attention: 1,
  critical: 2,
};

const finitePrediction = (predictions: number[], index: number): number | null => {
  const value = predictions[index];
  return Number.isFinite(value) ? value : null;
};

const weakestHistoricalScenario = (history: TrainingRecord[]): { id: string; score: number } | null => {
  const scores = new Map<string, { total: number; count: number }>();
  for (const record of history) {
    const current = scores.get(record.scenario_id) ?? { total: 0, count: 0 };
    current.total += record.score;
    current.count += 1;
    scores.set(record.scenario_id, current);
  }

  let weakest: { id: string; score: number } | null = null;
  for (const [id, aggregate] of scores) {
    const score = aggregate.total / aggregate.count;
    if (!weakest || score < weakest.score) weakest = { id, score };
  }
  return weakest;
};

/**
 * Формирует объяснимую поддержку решения инструктора из прогноза t+15,
 * технологических порогов, журнала тревог и результатов прошлых сессий.
 */
export const buildInstructorInsight = ({
  sensors,
  predictions,
  riskLevel,
  status,
  logs,
  history,
  scenarioId,
  startupK2Prefill = false,
}: InstructorInsightInput): InstructorInsight => {
  const predictedTemperature = finitePrediction(predictions, 0);
  const predictedPressure = finitePrediction(predictions, 1);
  const predictedLevel = finitePrediction(predictions, 2);
  const drivers: RiskDriver[] = [];

  const maxTemperature = Math.max(sensors.T_1, predictedTemperature ?? sensors.T_1);
  if (maxTemperature >= TEMP_WARNING) {
    const severity: InsightSeverity = maxTemperature >= TEMP_WARNING + 10 ? 'critical' : 'attention';
    drivers.push({
      severity,
      summary: 'Обнаружена угроза перегрева печи П-1.',
      evidence: `Т-1: ${sensors.T_1.toFixed(1)} °C, прогноз t+15: ${predictedTemperature?.toFixed(1) ?? 'нет данных'} °C.`,
      intervention: 'Попросить оператора снизить тепловую нагрузку и проверить подачу сырья; контролировать динамику Т-1.',
      scenarioId: 'shutdown',
    });
  }

  const maxPressure = Math.max(sensors.P_1, predictedPressure ?? sensors.P_1);
  if (maxPressure >= PRES_WARNING) {
    const severity: InsightSeverity = maxPressure >= PRES_WARNING + 0.015 ? 'critical' : 'attention';
    drivers.push({
      severity,
      summary: 'Обнаружена угроза роста давления в колонне К-1.',
      evidence: `P-1: ${sensors.P_1.toFixed(3)} МПа, прогноз t+15: ${predictedPressure?.toFixed(3) ?? 'нет данных'} МПа.`,
      intervention: 'Попросить оператора проверить тракт сброса и положение V-2; при дальнейшем росте перейти к аварийному алгоритму.',
      scenarioId: 'overpressure_relief',
    });
  }

  const forecastLevel = predictedLevel ?? sensors.L_1;
  if (Math.max(sensors.L_1, forecastLevel) >= LEVEL_HIGH) {
    drivers.push({
      severity: Math.max(sensors.L_1, forecastLevel) >= LEVEL_HIGH + 5 ? 'critical' : 'attention',
      summary: 'Уровень в колонне К-1 приближается к переполнению.',
      evidence: `L-1: ${sensors.L_1.toFixed(1)} %, прогноз t+15: ${predictedLevel?.toFixed(1) ?? 'нет данных'} %.`,
      intervention: 'Попросить оператора стабилизировать материальный баланс и проверить дренаж V-3.',
      scenarioId: 'column_shutdown',
    });
  } else if (Math.min(sensors.L_1, forecastLevel) <= LEVEL_LOW && scenarioId !== 'startup') {
    drivers.push({
      severity: Math.min(sensors.L_1, forecastLevel) <= 8 ? 'critical' : 'attention',
      summary: 'Выявлен риск осушения колонны К-1.',
      evidence: `L-1: ${sensors.L_1.toFixed(1)} %, прогноз t+15: ${predictedLevel?.toFixed(1) ?? 'нет данных'} %.`,
      intervention: 'Попросить оператора восстановить подачу и исключить нагрев при недостаточном уровне.',
      scenarioId: 'startup',
    });
  }

  if (sensors.L_2 >= K2_LEVEL_HIGH || (!startupK2Prefill && sensors.L_2 <= K2_LEVEL_LOW)) {
    drivers.push({
      severity: sensors.L_2 >= 90 || sensors.L_2 <= 8 ? 'critical' : 'attention',
      summary: 'Уровень куба К-2 вышел из нормальной зоны.',
      evidence: `L-2: ${sensors.L_2.toFixed(1)} %.`,
      intervention: 'Попросить оператора проверить откачку Н-4/Н-32 и материальный баланс блока ВТ.',
      scenarioId: 'recirculation',
    });
  }

  const primaryDriver = drivers.sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0];
  const recentAlarms = logs.slice(-20).filter(log => log.type !== 'info');
  const riskSeverity: InsightSeverity = status === 'accident' || status === 'esd' || riskLevel >= 75
    ? 'critical'
    : riskLevel >= 30 || recentAlarms.length > 0
      ? 'attention'
      : 'stable';
  const severity = primaryDriver && severityRank[primaryDriver.severity] > severityRank[riskSeverity]
    ? primaryDriver.severity
    : riskSeverity;

  const weakest = weakestHistoricalScenario(history);
  const recommendedScenarioId = primaryDriver?.scenarioId ?? weakest?.id ?? null;
  const recommendedScenarioTitle = recommendedScenarioId
    ? SCENARIO_TITLES[recommendedScenarioId] ?? recommendedScenarioId
    : 'Текущий сценарий';
  const recommendationReason = primaryDriver
    ? 'Рекомендация сформирована по ведущему фактору текущего риска.'
    : weakest
      ? `Это самый слабый сценарий по истории: средний результат ${weakest.score.toFixed(0)} баллов.`
      : 'Недостаточно завершённых сессий для персональной рекомендации.';

  const evidence = primaryDriver ? [primaryDriver.evidence] : [
    `Риск аварии: ${riskLevel.toFixed(1)} %; Т-1 ${sensors.T_1.toFixed(1)} °C; P-1 ${sensors.P_1.toFixed(3)} МПа.`,
  ];
  if (recentAlarms.length > 0) {
    evidence.push(`За последние 20 событий: ${recentAlarms.length} предупреждений и аварийных сообщений.`);
  }

  return {
    severity,
    summary: primaryDriver?.summary
      ?? (severity === 'critical'
        ? 'Требуется немедленное внимание инструктора.'
        : severity === 'attention'
          ? 'Есть признаки отклонения; требуется наблюдение за действиями оператора.'
          : 'Процесс стабилен, вмешательство инструктора не требуется.'),
    evidence,
    intervention: primaryDriver?.intervention
      ?? (severity === 'critical'
        ? 'Остановить развитие сценария, запросить у оператора доклад и проверить выполнение аварийного алгоритма.'
        : severity === 'attention'
          ? 'Наблюдать динамику и попросить оператора объяснить выбранные действия.'
          : 'Продолжать наблюдение без подсказки оператору.'),
    recommendedScenarioId,
    recommendedScenarioTitle,
    recommendationReason,
  };
};
