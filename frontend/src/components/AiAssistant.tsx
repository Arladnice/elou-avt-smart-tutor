import React from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Progress } from 'antd';
import { Brain } from 'lucide-react';
import * as S from './AiAssistant.styles';

const AiAssistant: React.FC = () => {
  const { riskLevel, sensors, valves, status } = useSimulator();

  const getAiMessage = () => {
    if (status === 'esd') {
      return 'Сработала защита блокировки. Сессия остановлена. Проанализируйте журнал тревог для выявления причин перегрузки.';
    }

    if (riskLevel > 80) {
      return 'КРИТИЧЕСКИЙ РИСК! Давление или температура превысили предельные уставки. Немедленно снизьте температуру печи или откройте клапан сброса V-2!';
    }
    
    if (!valves.V_1 && sensors.T_1 > 300) {
      return 'Внимание: отсутствует подача холодного сырья (клапан V-1 закрыт), при этом печь нагрета. Зафиксирован быстрый нагрев печи и рост давления. Откройте V-1 или снизьте уставку температуры!';
    }

    if (sensors.P_1 > 0.3) {
      return 'ИИ прогнозирует рост давления в колонне K-1. Рекомендуется кратковременно открыть клапан сброса V-2 для нормализации параметров.';
    }

    if (sensors.L_1 > 80) {
      return 'Уровень в колонне приближается к верхнему пределу. Откройте клапан дренажа V-3 или уменьшите подачу сырья V-1.';
    }

    if (sensors.L_1 < 20) {
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
    <S.AssistantContainer 
      title={
        <>
          <Brain size={14} color="#00e5ff" />
          ИИ-Ассистент (Оценка Рисков)
        </>
      }
      bordered={false}
    >
      <S.ProgressWrapper>
        <Progress 
          type="dashboard" 
          percent={riskLevel} 
          width={62}
          strokeColor={getProgressColor()}
          trailColor="#1b2332"
          format={percent => (
            <S.ProgressPercent color={getProgressColor()}>
              {percent}%
            </S.ProgressPercent>
          )}
        />
        <S.RiskLabel>Риск аварии</S.RiskLabel>
      </S.ProgressWrapper>

      <S.ChatBubble risk={riskLevel}>
        <S.AiMessage>{getAiMessage()}</S.AiMessage>
      </S.ChatBubble>
    </S.AssistantContainer>
  );
};

export default AiAssistant;
