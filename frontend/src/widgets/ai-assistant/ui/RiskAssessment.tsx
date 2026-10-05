import React from 'react';
import { Progress } from 'antd';
import { useTheme } from 'styled-components';
import { useTelemetry } from '@/entities/telemetry';
import { useSession } from '@/entities/session';
import {
  LEVEL_HIGH,
  K2_LEVEL_LOW_INTERLOCK,
  PRES_WARNING,
  TEMP_WARNING,
  STARTUP_FILLING_TIME_LIMIT_SEC,
  STARTUP_HEATING_THRESHOLD_TEMP,
} from '@/shared/config';
import * as S from './AiAssistant.styles';

/** Постоянно видимая оценка риска и краткая технологическая рекомендация. */
const RiskAssessment: React.FC = () => {
  const theme = useTheme();
  const { riskLevel, sensors, status, timeElapsed, defects, valves, startupK2Prefill } = useTelemetry();
  const { scenarioId } = useSession();

  const isStartupFilling = scenarioId === 'startup' && timeElapsed <= STARTUP_FILLING_TIME_LIMIT_SEC;
  const isStartupHeating = scenarioId === 'startup' && sensors.T_1 < STARTUP_HEATING_THRESHOLD_TEMP;

  const getMessage = (): string => {
    if (status === 'esd') {
      return 'Сработала защита блокировки. Проанализируйте журнал тревог для выявления причин перегрузки.';
    }

    // 1. Приоритет: ликвидация аварии печи П-1 (прогар змеевика)
    if (defects?.coil_overheat) {
      const fuelClosed = !valves?.FUEL_P1;
      const coilIsolated = !valves?.V_P1_IN;
      const isLocalized = fuelClosed && coilIsolated && sensors.T_1 <= 240;
      if (isLocalized) {
        return `Аварийная ситуация локализована: подача топлива отсечена, змеевик изолирован, температура снижена до безопасного уровня (${sensors.T_1.toFixed(1)}°C).`;
      }
      return `АВАРИЙНАЯ СИТУАЦИЯ: Прогар змеевика П-1! Снизьте уставку Т-1, откройте сброс V-2 и отсеките подачу топлива FUEL_P1.`;
    }

    if (defects?.pump_fail) {
      if (valves?.V_3 || !valves?.V_1) {
        return 'Отказ насоса Н-20: подача сырья остановлена. Переведите контур на циркуляцию и контролируйте уровень.';
      }
      return 'АВАРИЙНАЯ СИТУАЦИЯ: Отказ сырьевого насоса Н-20! Запустите резерв или переведите установку на циркуляцию.';
    }

    if (defects?.valve_jam) {
      return 'АВАРИЙНАЯ СИТУАЦИЯ: Зависание клапана V-2! Активируйте систему ПАЗ (ESD) для стравливания избыточного давления.';
    }

    const k1LowCritical = sensors.L_1 <= 5 && !isStartupFilling;
    const isK2Prefill = startupK2Prefill || scenarioId === 'startup';
    const k2LowCritical = sensors.L_2 <= 8 && !isK2Prefill;
    const critical = riskLevel >= 75;

    if (k1LowCritical && critical) {
      return `КРИТИЧЕСКИЙ РИСК! Опасно низкий уровень куба К-1 (${sensors.L_1.toFixed(1)}%). Откройте V-1.`;
    }
    if (k2LowCritical && critical) {
      return `КРИТИЧЕСКИЙ РИСК! Опасно низкий уровень куба К-2 (${sensors.L_2.toFixed(1)}%). Пуск Н-4/Н-32 заблокирован ПАЗ; восстановите уровень выше ${K2_LEVEL_LOW_INTERLOCK}%.`;
    }
    if (critical && sensors.P_1 > PRES_WARNING) {
      return `КРИТИЧЕСКИЙ РИСК! Высокое давление в колонне К-1 (${sensors.P_1.toFixed(2)} МПа). Немедленно откройте V-2.`;
    }
    if (critical && sensors.T_1 > TEMP_WARNING && !isStartupHeating) {
      return `КРИТИЧЕСКИЙ РИСК! Высокая температура печи П-1 (${sensors.T_1.toFixed(0)}°C). Снизьте уставку Т-1.`;
    }
    if (critical && sensors.L_1 > LEVEL_HIGH) {
      return `КРИТИЧЕСКИЙ РИСК! Переполнение колонны К-1 (${sensors.L_1.toFixed(1)}%). Откройте V-3.`;
    }
    if (!isStartupFilling && sensors.L_1 < 20) {
      return `ПРЕДУПРЕЖДЕНИЕ: Низкий уровень куба К-1 (${sensors.L_1.toFixed(1)}%). Откройте V-1 и контролируйте заполнение.`;
    }
    if (!isK2Prefill && sensors.L_2 < 20) {
      return `ПРЕДУПРЕЖДЕНИЕ: Низкий уровень куба К-2 (${sensors.L_2.toFixed(1)}%). Не запускайте Н-4/Н-32 до восстановления уровня выше ${K2_LEVEL_LOW_INTERLOCK}%.`;
    }
    if (sensors.P_1 > PRES_WARNING) {
      return `ПРЕДУПРЕЖДЕНИЕ: Давление в колонне К-1 повышено (${sensors.P_1.toFixed(2)} МПа). Проверьте V-2.`;
    }
    if (sensors.T_1 > TEMP_WARNING && !isStartupHeating) {
      return `ПРЕДУПРЕЖДЕНИЕ: Температура печи П-1 выше нормы (${sensors.T_1.toFixed(0)}°C). Снизьте уставку Т-1.`;
    }
    if (riskLevel > 30) {
      return `ПРЕДУПРЕЖДЕНИЕ: Расчётный риск аварии составляет ${riskLevel.toFixed(1)}%. Проверьте журнал и показания установки.`;
    }
    return 'Параметры установки ЭЛОУ-АВТ стабильны. Режим работы: Оптимальный. Продолжайте наблюдение.';
  };

  const message = getMessage();

  const color = riskLevel > 70
    ? theme.colors.danger
    : riskLevel > 30
      ? theme.colors.warning
      : theme.colors.success;

  return (
    <S.AssessmentLayout>
      <S.ProgressWrapper>
        <Progress
          type="dashboard"
          percent={riskLevel}
          size={62}
          strokeColor={color}
          railColor={theme.colors.surfaceMuted}
          format={percent => <S.ProgressPercent color={color}>{percent}%</S.ProgressPercent>}
        />
        <S.RiskLabel>Риск аварии</S.RiskLabel>
      </S.ProgressWrapper>
      <S.ChatBubble $risk={riskLevel}>
        <S.AiMessage>{message}</S.AiMessage>
      </S.ChatBubble>
    </S.AssessmentLayout>
  );
};

export default RiskAssessment;
