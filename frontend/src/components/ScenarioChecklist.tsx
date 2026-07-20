import React from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import * as S from './ScenarioChecklist.styles';

interface TaskInfo {
  id: string;
  title: string;
  hint: string;
  isDone: boolean;
}

const scenarioNames: Record<string, string> = {
  startup: 'Пуск установки',
  shutdown: 'Аварийный останов печи П-1',
  column_shutdown: 'Останов колонны К-1',
  overpressure_relief: 'Ликвидация роста давления',
  recirculation: 'Перевод на рециркуляцию'
};

/**
 * Хук для получения информации о текущем сценарии.
 * Используется в DashboardLayout для формирования заголовка CollapsibleCard.
 */
export const useScenarioInfo = () => {
  const { scenarioId, defects } = useSimulator();
  const isEmergency = !!(
    defects?.pump_fail ||
    defects?.coil_overheat ||
    defects?.valve_jam ||
    defects?.power_fail ||
    defects?.air_fail ||
    defects?.steam_fail
  );

  const getEmergencyTitle = (): string => {
    const list: string[] = [];
    if (defects?.pump_fail) list.push('Отказ Н-1');
    if (defects?.coil_overheat) list.push('Прогар П-1');
    if (defects?.valve_jam) list.push('Зависание V-2');
    if (defects?.power_fail) list.push('Обесточивание');
    if (defects?.air_fail) list.push('Отказ КИПиА');
    if (defects?.steam_fail) list.push('Срыв отпарки');
    return `Авария: ${list.join(' + ')}`;
  };

  const title = isEmergency
    ? getEmergencyTitle()
    : `Задачи Сценария: ${scenarioNames[scenarioId] || 'Обучение'}`;

  return { title, isEmergency };
};

const ScenarioChecklist: React.FC = () => {
  const { scenarioId, valves, sensors, setpoints, defects, status } = useSimulator();

  // Определение шагов на основе текущего состояния симулятора
  const getTasks = (): TaskInfo[] => {
    const emergencyTasks: TaskInfo[] = [];

    // При отказе сырьевого насоса необходимо снизить нагрев печи
    if (defects?.pump_fail) {
      const limitTemp = scenarioId === 'startup' ? 240 : 245;
      emergencyTasks.push({
        id: 'pump_fail_recovery',
        title: 'Аварийное снижение нагрева печи П-1',
        hint: `Понизьте уставку и дождитесь снижения фактической температуры Т-1 ниже ${limitTemp}°C (сейчас факт: ${sensors?.T_1?.toFixed(1) ?? '...'}°C, уставка: ${setpoints?.T_1_Sp ?? '...'}°C) для предотвращения прогара сухого змеевика.`,
        isDone: (setpoints?.T_1_Sp ?? 280) < limitTemp && (sensors?.T_1 ?? 999) <= limitTemp,
      });
    }

    // При прогаре змеевика печи необходимо снизить нагрев и открыть сброс V-2
    if (defects?.coil_overheat) {
      const limitTemp = scenarioId === 'startup' ? 240 : 245;
      if (!emergencyTasks.some(t => t.id === 'pump_fail_recovery')) {
        emergencyTasks.push({
          id: 'coil_overheat_temp',
          title: 'Локализация пожара печи П-1 (снижение нагрева)',
          hint: `Понизьте уставку и дождитесь остывания фактической температуры Т-1 ниже ${limitTemp}°C (сейчас факт: ${sensors?.T_1?.toFixed(1) ?? '...'}°C, уставка: ${setpoints?.T_1_Sp ?? '...'}°C) для отсечки топлива.`,
          isDone: (setpoints?.T_1_Sp ?? 280) < limitTemp && (sensors?.T_1 ?? 999) <= limitTemp,
        });
      }
      emergencyTasks.push({
        id: 'coil_overheat_pressure',
        title: 'Сброс давления из колонны К-1',
        hint: 'Откройте регулирующий клапан сброса V-2 в положение ОТКРЫТО для стравливания газов.',
        isDone: valves.V_2,
      });
    }

    // При заклинивании V-2 необходим аварийный останов (ESD)
    if (defects?.valve_jam) {
      emergencyTasks.push({
        id: 'valve_jam_esd',
        title: 'Аварийный останов установки (ПАЗ)',
        hint: 'Нажмите красную кнопку аварийного останова (ESD) на панели управления для предотвращения взрыва колонны К-1.',
        isDone: status === 'esd',
      });
    }

    // При отказе электроснабжения (power_fail) останавливаются насосы и гаснет печь
    if (defects?.power_fail) {
      emergencyTasks.push({
        id: 'power_fail_action',
        title: 'Обесточивание: Перекрытие подачи сырья V-1',
        hint: 'При отказе электроснабжения остановились насосы и упала уставка печи. Убедитесь, что задвижка V-1 закрыта для предотвращения обратного тока и гидроудара.',
        isDone: !valves.V_1,
      });
    }

    // При отказе воздуха КИПиА (air_fail) клапаны V-1 и V-3 закрываются в безопасное положение
    if (defects?.air_fail) {
      const limitTemp = scenarioId === 'startup' ? 240 : 245;
      emergencyTasks.push({
        id: 'air_fail_action',
        title: 'Отказ КИПиА: Снижение нагрева П-1 / ПАЗ (ESD)',
        hint: `При потере пневмопитания регулирующие клапаны V-1 и V-3 перешли в закрытое положение (Fail-Closed), а V-2 заблокирован. Из-за прекращения подачи сырья немедленно снизьте уставку нагрева Т-1 ниже ${limitTemp}°C (сейчас факт: ${sensors?.T_1?.toFixed(1) ?? '...'}°C, уставка: ${setpoints?.T_1_Sp ?? '...'}°C) или нажмите кнопку ПАЗ (ESD).`,
        isDone: status === 'esd' || ((setpoints?.T_1_Sp ?? 280) < limitTemp && (sensors?.T_1 ?? 999) <= limitTemp),
      });
    }

    // При срыве подачи отпарного пара (steam_fail) нарушается стриппинг и растёт давление/уровень
    if (defects?.steam_fail) {
      emergencyTasks.push({
        id: 'steam_fail_pressure',
        title: 'Срыв пара: Сброс давления V-2',
        hint: 'Из-за нарушения отпарки в стриппинге растёт давление P-1. Откройте клапан сброса V-2 для стравливания паров на факел.',
        isDone: valves.V_2,
      });
      emergencyTasks.push({
        id: 'steam_fail_level',
        title: 'Срыв пара: Дренаж куба V-3',
        hint: 'Для компенсации роста уровня кубовой жидкости L-1 откройте клапан дренажа V-3.',
        isDone: valves.V_3,
      });
    }

    if (emergencyTasks.length > 0) {
      return emergencyTasks;
    }

    if (scenarioId === 'startup') {
      return [
        {
          id: 'v1_open',
          title: '1. Подача сырья в печь',
          hint: 'Убедитесь, что задвижка V-1 находится в положении ОТКРЫТО',
          isDone: valves.V_1,
        },
        {
          id: 'sp_up',
          title: '2. Разогрев змеевиков печи П-1',
          hint: `Поднимите уставку и дождитесь, пока фактическая температура Т-1 достигнет 285°C (сейчас: ${sensors?.T_1?.toFixed(1) ?? '...'}°C)`,
          isDone: (sensors?.T_1 ?? 0) >= 285,
        },
        {
          id: 'v3_open',
          title: '3. Регулирование дренажа колонны K-1',
          hint: `Откройте V-3 при уровне в кубе выше 20% (сейчас L-1: ${sensors?.L_1?.toFixed(1) ?? '...'}%)`,
          isDone: valves.V_3 && (sensors?.L_1 ?? 0) >= 20,
        },
      ];
    } else if (scenarioId === 'column_shutdown') {
      return [
        {
          id: 'sp_down',
          title: '1. Снижение нагрева печи П-1',
          hint: `Понизьте уставку и дождитесь остывания Т-1 ниже 245°C (сейчас: ${sensors?.T_1?.toFixed(1) ?? '...'}°C)`,
          isDone: (sensors?.T_1 ?? 999) <= 245,
        },
        {
          id: 'v1_close',
          title: '2. Перекрытие подачи сырья',
          hint: 'Переведите V-1 в положение ЗАКРЫТО',
          isDone: !valves.V_1,
        },
        {
          id: 'v3_close',
          title: '3. Прекращение дренажа куба K-1',
          hint: `Закройте клапан дренажа V-3 при уровне в кубе ниже 15% (сейчас: ${sensors?.L_1?.toFixed(1) ?? '...'}%)`,
          isDone: !valves.V_3 && (sensors?.L_1 ?? 100) < 15,
        },
      ];
    } else if (scenarioId === 'overpressure_relief') {
      return [
        {
          id: 'v2_open',
          title: '1. Сброс избыточного давления',
          hint: 'Откройте клапан V-2 для сброса газа на факел',
          isDone: valves.V_2,
        },
        {
          id: 'sp_down',
          title: '2. Снижение тепловой нагрузки',
          hint: `Понизьте уставку печи и дождитесь остывания Т-1 ниже 245°C (сейчас: ${sensors?.T_1?.toFixed(1) ?? '...'}°C)`,
          isDone: (sensors?.T_1 ?? 999) <= 245,
        },
      ];
    } else if (scenarioId === 'recirculation') {
      return [
        {
          id: 'sp_down',
          title: '1. Снижение нагрева сырья в печи П-1',
          hint: `Понизьте уставку и дождитесь снижения температуры Т-1 ниже 250°C (сейчас: ${sensors?.T_1?.toFixed(1) ?? '...'}°C)`,
          isDone: (sensors?.T_1 ?? 999) <= 250,
        },
        {
          id: 'v3_close',
          title: '2. Прекращение вывода кубового остатка',
          hint: 'Переведите клапан V-3 (Дренаж) в положение ЗАКРЫТО',
          isDone: !valves.V_3,
        },
        {
          id: 'v2_open',
          title: '3. Открытие сдувки на факел',
          hint: 'Переведите клапан V-2 (Сброс давления) в положение ОТКРЫТО',
          isDone: valves.V_2,
        },
      ];
    } else {
      // Сценарий shutdown (Останов)
      return [
        {
          id: 'sp_down',
          title: '1. Снижение нагрева печи П-1',
          hint: `Понизьте уставку и дождитесь остывания Т-1 ниже 245°C (сейчас: ${sensors?.T_1?.toFixed(1) ?? '...'}°C)`,
          isDone: (sensors?.T_1 ?? 999) <= 245,
        },
        {
          id: 'v2_open',
          title: '2. Сброс давления в колонне K-1',
          hint: 'Откройте регулирующий клапан V-2 для сдувки газа на факел',
          isDone: valves.V_2,
        },
        {
          id: 'v1_close',
          title: '3. Перекрытие подачи сырья',
          hint: `Переведите V-1 в положение ЗАКРЫТО и дождитесь дренажа куба (уровень < 15%, сейчас: ${sensors?.L_1?.toFixed(1) ?? '...'}%)`,
          isDone: !valves.V_1 && (sensors?.L_1 ?? 100) < 15,
        },
      ];
    }
  };

  const tasks = getTasks();

  // Вычисление статуса для каждого шага
  const getTaskStatus = (index: number, isDone: boolean): 'completed' | 'active' | 'pending' => {
    if (isDone) return 'completed';
    // Если предыдущие шаги выполнены, а этот нет - он активный
    const isPreviousDone = tasks.slice(0, index).every(t => t.isDone);
    if (isPreviousDone) return 'active';
    return 'pending';
  };

  return (
    <S.ChecklistContent>
      <S.TasksList>
        {tasks.map((task, index) => {
          const taskStatus = getTaskStatus(index, task.isDone);
          return (
            <S.TaskItem key={task.id} status={taskStatus}>
              <S.IconWrapper status={taskStatus}>
                {taskStatus === 'completed' && <CheckCircle2 size={16} className="completed" />}
                {taskStatus === 'active' && <PlayCircle size={16} className="pulsing" />}
                {taskStatus === 'pending' && <Circle size={16} />}
              </S.IconWrapper>
              <S.TaskDetails>
                <S.TaskTitle status={taskStatus}>{task.title}</S.TaskTitle>
                <S.TaskHint status={taskStatus}>{task.hint}</S.TaskHint>
              </S.TaskDetails>
            </S.TaskItem>
          );
        })}
      </S.TasksList>
    </S.ChecklistContent>
  );
};

export default ScenarioChecklist;

