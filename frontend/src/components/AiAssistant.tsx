import React, { useState, useRef, useEffect } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Progress, Input, Button } from 'antd';
import { Brain, MessageSquare, Send, Zap } from 'lucide-react';
import { apiService } from '../services/api';
import * as S from './AiAssistant.styles';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const AiAssistant: React.FC = () => {
  const { riskLevel, sensors, valves, status, setpoints, defects, scenarioId } = useSimulator();
  const [activeTab, setActiveTab] = useState<'risk' | 'chat'>('risk');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Привет! Я твой ИИ-ассистент установки ЭЛОУ-АВТ. Я знаю все технологические регламенты и правила безопасности (ГОСТ). Спроси меня: "как ликвидировать перегрев П-1", "что делать при отказе насоса Н-1" или "как снизить давление в колонне К-1".'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоматическая прокрутка чата вниз при добавлении сообщений
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, activeTab]);

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

  // Отправка запроса в чат
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      const telemetryContext = {
        sensors,
        valves,
        setpoints,
        defects,
        status,
        scenarioId,
        riskLevel
      };
      
      const res = await apiService.sendAiChat(updatedMessages, telemetryContext);
      setMessages(prev => [...prev, { role: 'assistant', content: res.content }]);
    } catch (e) {
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: 'Ошибка связи с ИИ-ассистентом. Пожалуйста, убедитесь, что бэкенд-сервер доступен.' }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestionText: string) => {
    handleSendMessage(suggestionText);
  };

  const suggestions = [
    'Отказ насоса Н-1',
    'Превышение давления в К-1',
    'Как избежать перегрева П-1?',
    'Рекомендации регламента'
  ];

  return (
    <S.AssistantContainer 
      title={
        <>
          <Brain size={14} color="#00e5ff" />
          Интеллектуальный ИИ-Помощник (Smart-MVP)
        </>
      }
      bordered={false}
    >
      <S.TabsHeader>
        <S.TabButton active={activeTab === 'risk'} onClick={() => setActiveTab('risk')}>
          <Zap size={12} />
          Оценка Рисков
        </S.TabButton>
        <S.TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>
          <MessageSquare size={12} />
          Диалог с ИИ (Qwen/RAG)
        </S.TabButton>
      </S.TabsHeader>

      {activeTab === 'risk' ? (
        <S.AssessmentLayout>
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
        </S.AssessmentLayout>
      ) : (
        <S.ChatContainer>
          <S.MessagesBox>
            {messages.map((m, idx) => (
              <S.MessageRow key={idx} isUser={m.role === 'user'}>
                <S.MessageBubble isUser={m.role === 'user'}>
                  {m.content}
                </S.MessageBubble>
              </S.MessageRow>
            ))}
            {isTyping && (
              <S.MessageRow isUser={false}>
                <S.MessageBubble isUser={false}>
                  <S.TypingIndicator>ИИ печатает ответ...</S.TypingIndicator>
                </S.MessageBubble>
              </S.MessageRow>
            )}
            <div ref={messagesEndRef} />
          </S.MessagesBox>

          <S.SuggestionsBox>
            {suggestions.map((s, idx) => (
              <S.SuggestionChip key={idx} onClick={() => handleSuggestionClick(s)}>
                {s}
              </S.SuggestionChip>
            ))}
          </S.SuggestionsBox>

          <S.InputWrapper>
            <Input 
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onPressEnter={() => handleSendMessage(inputValue)}
              placeholder="Спросите ИИ о правилах безопасности..."
              disabled={isTyping}
              size="small"
            />
            <Button 
              type="primary" 
              onClick={() => handleSendMessage(inputValue)}
              disabled={isTyping || !inputValue.trim()}
              icon={<Send size={12} />}
              size="small"
            />
          </S.InputWrapper>
        </S.ChatContainer>
      )}
    </S.AssistantContainer>
  );
};

export default AiAssistant;
