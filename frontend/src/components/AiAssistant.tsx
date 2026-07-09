import React from 'react';
import styled from 'styled-components';
import { useSimulator } from '../context/SimulatorContext';
import { Progress, Card } from 'antd';
import { Brain } from 'lucide-react';

const AssistantContainer = styled(Card)`
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
    display: flex;
    align-items: center;
    gap: 16px;
    height: calc(100% - 40px);
  }
`;

const ProgressWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const RiskLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${props => props.theme.colors.textMuted};
`;

const ChatBubble = styled.div<{ risk: number }>`
  flex: 1;
  background-color: ${props => props.theme.colors.background};
  border: 1px solid ${props => {
    if (props.risk > 70) return props.theme.colors.danger;
    if (props.risk > 30) return props.theme.colors.warning;
    return props.theme.colors.border;
  }};
  border-radius: 6px;
  padding: 6px 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  box-shadow: ${props => {
    if (props.risk > 70) return '0 0 8px rgba(255, 51, 51, 0.15)';
    if (props.risk > 30) return '0 0 8px rgba(255, 204, 0, 0.15)';
    return 'none';
  }};

  &::before {
    content: '';
    position: absolute;
    left: -6px;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
    width: 10px;
    height: 10px;
    background-color: ${props => props.theme.colors.background};
    border-left: 1px solid ${props => {
      if (props.risk > 70) return props.theme.colors.danger;
      if (props.risk > 30) return props.theme.colors.warning;
      return props.theme.colors.border;
    }};
    border-bottom: 1px solid ${props => {
      if (props.risk > 70) return props.theme.colors.danger;
      if (props.risk > 30) return props.theme.colors.warning;
      return props.theme.colors.border;
    }};
  }
`;

const AiMessage = styled.p`
  font-size: 12px;
  line-height: 1.4;
  color: ${props => props.theme.colors.text};
  font-weight: 500;
`;

const AiAssistant: React.FC = () => {
  const { riskLevel, sensors, valves, status } = useSimulator();

  const getAiMessage = () => {
    if (status === 'esd') {
      return 'Сработала защита блокировки. Сессия остановлена. Проанализируйте журнал тревог для выявления причин перегрузки.';
    }

    if (riskLevel > 80) {
      return 'КРИТИЧЕСКИЙ РИСК! Давление или температура превысили предельные уставки. Немедленно снизьте температуру печи или откройте клапан сброса V-2!';
    }
    
    if (!valves.V1 && sensors.furnaceTemp > 300) {
      return 'Внимание: отсутствует подача холодного сырья (клапан V-1 закрыт), при этом печь нагрета. Зафиксирован быстрый нагрев печи и рост давления. Откройте V-1 или снизьте уставку температуры!';
    }

    if (sensors.columnPres > 0.3) {
      return 'ИИ прогнозирует рост давления в колонне K-1. Рекомендуется кратковременно открыть клапан сброса V-2 для нормализации параметров.';
    }

    if (sensors.columnLevel > 80) {
      return 'Уровень в колонне приближается к верхнему пределу. Откройте клапан дренажа V-3 или уменьшите подачу сырья V-1.';
    }

    if (sensors.columnLevel < 20) {
      return 'Уровень в колонне слишком низкий. Увеличьте подачу сырья V-1 или прикройте клапан дренажа V-3.';
    }

    return 'Параметры установки ЭЛОУ-АВТ стабильны. Режим работы: Оптимальный. Продолжайте наблюдение.';
  };

  const getProgressColor = () => {
    if (riskLevel > 70) return '#ff3333';
    if (riskLevel > 30) return '#ffcc00';
    return '#00ff66';
  };

  return (
    <AssistantContainer 
      title={
        <>
          <Brain size={14} color="#00e5ff" />
          ИИ-Ассистент (Оценка Рисков)
        </>
      }
      bordered={false}
    >
      <ProgressWrapper>
        <Progress 
          type="dashboard" 
          percent={riskLevel} 
          width={75}
          strokeColor={getProgressColor()}
          trailColor="#1b2332"
          format={percent => (
            <span style={{ color: getProgressColor(), fontWeight: 'bold', fontSize: '14px' }}>
              {percent}%
            </span>
          )}
        />
        <RiskLabel>Риск аварии</RiskLabel>
      </ProgressWrapper>

      <ChatBubble risk={riskLevel}>
        <AiMessage>{getAiMessage()}</AiMessage>
      </ChatBubble>
    </AssistantContainer>
  );
};

export default AiAssistant;
