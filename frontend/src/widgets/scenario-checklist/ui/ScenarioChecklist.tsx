import React from 'react';
import { useTelemetry, type Pumps, type Sensors, type Setpoints, type Valves } from '@/entities/telemetry';
import { useSession } from '@/entities/session';
import type { ScenarioCondition } from '@/entities/scenario';
import { CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import * as S from './ScenarioChecklist.styles';

interface TaskInfo {
  id: string;
  title: string;
  hint: string;
  isDone: boolean;
}

/** Проверка условия завершения шага чек-листа по текущему состоянию установки */
const evalCondition = (
  cond: ScenarioCondition | undefined,
  valves: Valves,
  pumps: Pumps,
  sensors: Sensors,
  setpoints: Setpoints,
): boolean => {
  if (!cond) return false;
  const valve = valves[cond.target as keyof Valves];
  const sensor = sensors[cond.target as keyof Sensors];

  if (cond.type === 'valve_is') {
    return valve === cond.expected;
  }
  if (cond.type === 'pump_is') {
    return pumps[cond.target as keyof Pumps] === cond.expected;
  }
  if (cond.type === 'sensor_gte') {
    return Number(sensor ?? 0) >= Number(cond.expected) - (cond.tolerance ?? 0);
  }
  if (cond.type === 'sensor_lte') {
    return Number(sensor ?? 999) <= Number(cond.expected) + (cond.tolerance ?? 0);
  }
  const setpoint = setpoints[cond.target as keyof Setpoints];
  if (cond.type === 'setpoint_gte') {
    return (setpoint ?? 0) >= Number(cond.expected) - (cond.tolerance ?? 0);
  }
  if (cond.type === 'setpoint_lte') {
    return (setpoint ?? 999) <= Number(cond.expected) + (cond.tolerance ?? 0);
  }
  if (cond.type === 'composite_and') {
    return (cond.conditions || []).every(c => evalCondition(c, valves, pumps, sensors, setpoints));
  }
  return false;
};

const ScenarioChecklist: React.FC = () => {
  const { valves, pumps, sensors, setpoints, defects, status } = useTelemetry();
  const { scenarioId, mode, scenarios } = useSession();
  const isExam = mode === 'exam';

  // Определение шагов на основе текущего состояния симулятора
  const getTasks = (): TaskInfo[] => {
    const emergencyTasks: TaskInfo[] = [];

    // При возникновении нештатных ситуаций (дефектов) — выдаем приоритетные аварийные задачи
    if (defects?.pump_fail) {
      emergencyTasks.push({
        id: 'pump_fail_recovery',
        title: 'Отказ сырьевого насоса Н-1',
        hint: 'Снизьте уставку печи ниже 200°C для предотвращения сухого прогара змеевиков печи П-1.',
        isDone: (setpoints?.T_1_Sp ?? 280) <= 200,
      });
    }

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

    if (defects?.valve_jam) {
      emergencyTasks.push({
        id: 'valve_jam_esd',
        title: 'Аварийный останов установки (ПАЗ)',
        hint: 'Нажмите красную кнопку аварийного останова (ESD) на панели управления для предотвращения взрыва колонны К-1.',
        isDone: status === 'esd',
      });
    }

    if (defects?.power_fail) {
      emergencyTasks.push({
        id: 'power_fail_action',
        title: 'Обесточивание: Перекрытие подачи сырья V-1',
        hint: 'При отказе электроснабжения остановились насосы и упала уставка печи. Убедитесь, что задвижка V-1 закрыта для предотвращения обратного тока и гидроудара.',
        isDone: !valves.V_1,
      });
    }

    if (defects?.air_fail) {
      const limitTemp = 245;
      emergencyTasks.push({
        id: 'air_fail_action',
        title: 'Отказ воздуха КИПиА: Снижение нагрева печи П-1 / ПАЗ',
        hint: 'При отказе сжатого воздуха арматура отсеклась. Снизьте уставку печи П-1 ниже 245°C или активируйте кнопкой ESD.',
        isDone: status === 'esd' || ((setpoints?.T_1_Sp ?? 280) < limitTemp && (sensors?.T_1 ?? 999) <= limitTemp),
      });
    }

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

    // Динамический расчёт шагов из центрального реестра сценариев
    const activeScenario = scenarios.find(s => s.id === scenarioId);
    if (activeScenario && activeScenario.checklist) {
      return activeScenario.checklist.map(item => ({
        id: item.id,
        title: item.title,
        hint: isExam ? item.hint_exam : item.hint_training,
        isDone: evalCondition(item.condition, valves, pumps, sensors, setpoints),
      }));
    }

    // Fallback для неизвестного сценария
    return [
      {
        id: 'v1_close',
        title: '1. Перекрытие подачи сырья V-1',
        hint: 'Переведите клапан V-1 в положение ЗАКРЫТО',
        isDone: !valves.V_1,
      },
    ];
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
            <S.TaskItem key={task.id} $status={taskStatus}>
              <S.IconWrapper $status={taskStatus}>
                {taskStatus === 'completed' && <CheckCircle2 size={16} className="completed" />}
                {taskStatus === 'active' && <PlayCircle size={16} className="pulsing" />}
                {taskStatus === 'pending' && <Circle size={16} />}
              </S.IconWrapper>
              <S.TaskDetails>
                <S.TaskTitle $status={taskStatus}>{task.title}</S.TaskTitle>
                <S.TaskHint $status={taskStatus}>{task.hint}</S.TaskHint>
              </S.TaskDetails>
            </S.TaskItem>

          );
        })}
      </S.TasksList>
    </S.ChecklistContent>
  );
};

export default ScenarioChecklist;

