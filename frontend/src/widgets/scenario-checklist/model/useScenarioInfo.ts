import { useTelemetry } from '@/entities/telemetry';
import { useSession } from '@/entities/session';

const scenarioNames: Record<string, string> = {
  startup: 'Пуск установки',
  shutdown: 'Аварийный останов печей П-1 и П-3',
  column_shutdown: 'Останов колонны К-1',
  overpressure_relief: 'Ликвидация роста давления',
  recirculation: 'Перевод на рециркуляцию',
  elou_salt_breakthrough: 'Проскок солей и воды из ЭЛОУ',
  vt_vacuum_failure: 'Срыв вакуума вакуумного блока ВТ',
};

/**
 * Хук для получения информации о текущем сценарии.
 * Используется в DashboardLayout для формирования заголовка CollapsibleCard.
 */
export const useScenarioInfo = () => {
  const { defects } = useTelemetry();
  const { scenarioId, mode } = useSession();
  const isEmergency = !!(
    defects?.pump_fail ||
    defects?.coil_overheat ||
    defects?.valve_jam ||
    defects?.power_fail ||
    defects?.air_fail ||
    defects?.steam_fail ||
    defects?.elou_desalt_fail ||
    defects?.vt_vacuum_loss ||
    defects?.k2_pump_fail
  );

  const getEmergencyTitle = (): string => {
    const list: string[] = [];
    if (defects?.pump_fail) list.push('Отказ Н-1');
    if (defects?.coil_overheat) list.push('Прогар П-1');
    if (defects?.valve_jam) list.push('Зависание V-2');
    if (defects?.power_fail) list.push('Обесточивание');
    if (defects?.air_fail) list.push('Отказ КИПиА');
    if (defects?.steam_fail) list.push('Срыв отпарки');
    if (defects?.elou_desalt_fail) list.push('Проскок ЭЛОУ');
    if (defects?.vt_vacuum_loss) list.push('Срыв вакуума ВТ');
    if (defects?.k2_pump_fail) list.push('Отказ Н-4/Н-32');
    return `Авария: ${list.join(' + ')}`;
  };

  const title = isEmergency
    ? getEmergencyTitle()
    : `${mode === 'exam' ? '🎯 [ЭКЗАМЕН] ' : ''}Задачи Сценария: ${scenarioNames[scenarioId] || 'Обучение'}`;

  return { title, isEmergency };
};
