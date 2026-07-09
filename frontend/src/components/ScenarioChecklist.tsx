import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useSimulator } from '../context/SimulatorContext';
import { Card } from 'antd';
import { ListTodo, CheckCircle2, Circle, PlayCircle } from 'lucide-react';

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

const ChecklistContainer = styled(Card)`
  background-color: ${props => props.theme.colors.surface};
  border-color: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  border-radius: 6px;
  overflow: hidden;

  .ant-card-head {
    border-bottom: 1px solid ${props => props.theme.colors.border};
    padding: 0 16px;
    min-height: 40px;
  }

  .ant-card-head-title {
    color: ${props => props.theme.colors.textMuted};
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
  }

  .ant-card-body {
    padding: 8px 12px;
  }
`;

const TasksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TaskItem = styled.div<{ status: 'completed' | 'active' | 'pending' }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background-color: ${props => {
    if (props.status === 'completed') return 'rgba(0, 255, 102, 0.03)';
    if (props.status === 'active') return 'rgba(0, 229, 255, 0.03)';
    return 'transparent';
  }};
  border: 1px solid ${props => {
    if (props.status === 'completed') return 'rgba(0, 255, 102, 0.15)';
    if (props.status === 'active') return 'rgba(0, 229, 255, 0.2)';
    return props.theme.colors.border;
  }};
  border-radius: 4px;
  padding: 6px 10px;
  transition: all 0.3s ease;

  &:hover {
    border-color: ${props => {
      if (props.status === 'completed') return props.theme.colors.success;
      if (props.status === 'active') return props.theme.colors.accent;
      return '#3a475d';
    }};
  }
`;

const IconWrapper = styled.div<{ status: 'completed' | 'active' | 'pending' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  color: ${props => {
    if (props.status === 'completed') return props.theme.colors.success;
    if (props.status === 'active') return props.theme.colors.accent;
    return props.theme.colors.textMuted;
  }};

  svg.pulsing {
    animation: ${pulse} 1.5s infinite ease-in-out;
    filter: drop-shadow(0 0 4px ${props => props.theme.colors.accent});
  }
  
  svg.completed {
    filter: drop-shadow(0 0 4px ${props => props.theme.colors.success});
  }
`;

const TaskDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TaskTitle = styled.span<{ status: 'completed' | 'active' | 'pending' }>`
  font-size: 12px;
  font-weight: 600;
  color: ${props => {
    if (props.status === 'completed') return props.theme.colors.success;
    if (props.status === 'active') return props.theme.colors.text;
    return props.theme.colors.textMuted;
  }};
  text-decoration: ${props => props.status === 'completed' ? 'line-through' : 'none'};
  opacity: ${props => props.status === 'pending' ? 0.6 : 1};
`;

const TaskHint = styled.span<{ status: 'completed' | 'active' | 'pending' }>`
  font-size: 10px;
  color: ${props => {
    if (props.status === 'active') return props.theme.colors.textMuted;
    return 'rgba(124, 139, 161, 0.5)';
  }};
  line-height: 1.3;
`;

interface TaskInfo {
  id: string;
  title: string;
  hint: string;
  isDone: boolean;
}

const ScenarioChecklist: React.FC = () => {
  const { scenarioId, valves, setpoints } = useSimulator();

  // Определение шагов на основе текущего состояния симулятора
  const getTasks = (): TaskInfo[] => {
    if (scenarioId === 'startup') {
      return [
        {
          id: 'v1_open',
          title: '1. Подача сырья в печь',
          hint: 'Убедитесь, что задвижка V-1 находится в положении ОТКРЫТО',
          isDone: valves.V1,
        },
        {
          id: 'sp_up',
          title: '2. Разогрев змеевиков печи П-1',
          hint: 'Повысьте уставку температуры печи Т-1 с 280°C до более высокой температуры (например, 300-340°C)',
          isDone: setpoints.furnaceTempSp > 280,
        },
        {
          id: 'v3_open',
          title: '3. Регулирование дренажа колонны K-1',
          hint: 'Убедитесь, что дренажный клапан V-3 открыт для балансировки уровня',
          isDone: valves.V3,
        },
      ];
    } else {
      // Сценарий shutdown (Останов)
      return [
        {
          id: 'sp_down',
          title: '1. Снижение нагрева печи П-1',
          hint: 'Понизьте уставку температуры печи Т-1 до минимального значения (240°C)',
          isDone: setpoints.furnaceTempSp <= 240,
        },
        {
          id: 'v2_open',
          title: '2. Сброс давления в колонне K-1',
          hint: 'Откройте регулирующий клапан V-2 для сдувки газа на факел',
          isDone: valves.V2,
        },
        {
          id: 'v1_close',
          title: '3. Перекрытие подачи сырья',
          hint: 'Переведите задвижку V-1 на входе в положение ЗАКРЫТО',
          isDone: !valves.V1,
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
    <ChecklistContainer
      title={
        <>
          <ListTodo size={14} color="#00e5ff" />
          Задачи Сценария: {scenarioId === 'startup' ? 'Пуск установки' : 'Останов установки'}
        </>
      }
      bordered={false}
    >
      <TasksList>
        {tasks.map((task, index) => {
          const taskStatus = getTaskStatus(index, task.isDone);
          return (
            <TaskItem key={task.id} status={taskStatus}>
              <IconWrapper status={taskStatus}>
                {taskStatus === 'completed' && <CheckCircle2 size={16} className="completed" />}
                {taskStatus === 'active' && <PlayCircle size={16} className="pulsing" />}
                {taskStatus === 'pending' && <Circle size={16} />}
              </IconWrapper>
              <TaskDetails>
                <TaskTitle status={taskStatus}>{task.title}</TaskTitle>
                <TaskHint status={taskStatus}>{task.hint}</TaskHint>
              </TaskDetails>
            </TaskItem>
          );
        })}
      </TasksList>
    </ChecklistContainer>
  );
};

export default ScenarioChecklist;
