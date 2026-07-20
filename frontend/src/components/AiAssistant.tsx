import React, { useState, useRef, useEffect } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Progress, Input, Button } from 'antd';
import { MessageSquare, Send, Zap } from 'lucide-react';
import { apiService } from '../services/api';
import * as S from './AiAssistant.styles';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const AiAssistant: React.FC = () => {
  const { riskLevel, sensors, valves, status, setpoints, defects, scenarioId } = useSimulator();
  const [activeTab, setActiveTab] = useState<'risk' | 'chat'>('risk');
  const [mode, setMode] = useState<'auto' | 'rag' | 'llm'>('rag');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Привет! Я твой ИИ-ассистент установки ЭЛОУ-АВТ. Я знаю все технологические регламенты и правила безопасности (ГОСТ). Спроси меня: "как ликвидировать перегрев П-1", "что делать при отказе насоса Н-1" или "как снизить давление в колонне К-1".'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingSeconds, setTypingSeconds] = useState(0);
  const messagesBoxRef = useRef<HTMLDivElement>(null);

  // Автоматическая прокрутка только внутри контейнера чата (без сдвига всей страницы)
  useEffect(() => {
    const box = messagesBoxRef.current;
    if (box) {
      box.scrollTop = box.scrollHeight;
    }
  }, [messages, isTyping, activeTab]);

  // Таймер ожидания при генерации ответа
  useEffect(() => {
    if (!isTyping) { setTypingSeconds(0); return; }
    const timer = setInterval(() => setTypingSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isTyping]);

  const getAiMessage = () => {
    if (status === 'esd') {
      return 'Сработала защита блокировки. Сессия остановлена. Проанализируйте журнал тревог для выявления причин перегрузки.';
    }

    if (defects?.power_fail) {
      return 'АВАРИЯ: Полное обесточивание установки (power_fail)! Все насосы остановлены, подача топлива в печь П-1 прекращена. Убедитесь в закрытии V-1 и зафиксируйте останов системы.';
    }
    if (defects?.air_fail) {
      return 'АВАРИЯ: Отказ воздуха КИПиА (air_fail)! Пневматические клапаны V-1 и V-3 перешли в безопасное закрытое положение (Fail-Closed), V-2 заблокирован. Контролируйте параметры и при угрозе взрыва нажмите ПАЗ (ESD).';
    }
    if (defects?.steam_fail) {
      return 'АВАРИЯ: Срыв подачи отпарного пара в стриппинге (steam_fail)! Нарушено равновесие, растёт давление P-1 и уровень L-1. Откройте сброс V-2 и дренаж V-3!';
    }
    if (defects?.pump_fail) {
      return 'АВАРИЯ: Отказ сырьевого насоса Н-1! Прекращена подача сырья в печь. Немедленно снизьте уставку нагрева Т-1 для предотвращения прогара сухого змеевика!';
    }
    if (defects?.coil_overheat) {
      return 'АВАРИЯ: Прогар змеевика печи П-1! Зафиксировано неуправляемое горение. Снизьте уставку Т-1 и откройте клапан сброса давления V-2!';
    }
    if (defects?.valve_jam) {
      return 'АВАРИЯ: Заклинивание регулирующего клапана сброса V-2! При росте давления немедленно активируйте аварийный останов (ПАЗ / ESD)!';
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
      
      const res = await apiService.sendAiChat(updatedMessages, telemetryContext, mode);
      setMessages(prev => [...prev, { role: 'assistant', content: res.content }]);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : '';
      const displayMsg = errorMsg.includes('Превышено время')
        ? errorMsg
        : 'Ошибка связи с ИИ-ассистентом. Пожалуйста, убедитесь, что бэкенд-сервер доступен.';
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: displayMsg }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestionText: string) => {
    handleSendMessage(suggestionText);
  };

  const suggestions = [
    defects?.power_fail ? 'Что делать при обесточивании?' : 'Отказ насоса Н-1',
    defects?.air_fail ? 'Действия при отказе КИПиА' : 'Превышение давления в К-1',
    defects?.steam_fail ? 'Как устранить срыв пара?' : 'Как избежать перегрева П-1?',
    'Рекомендации регламента'
  ];

  return (
    <S.AssistantContent>
      <S.TabsHeader>
        <S.TabButton active={activeTab === 'risk'} onClick={() => setActiveTab('risk')}>
          <Zap size={12} />
          Оценка Рисков
        </S.TabButton>
        <S.TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>
          <MessageSquare size={12} />
          Диалог с ИИ
        </S.TabButton>
        {activeTab === 'chat' && (
          <S.ModeSelector>
            <S.ModeOption active={mode === 'rag'} onClick={() => setMode('rag')} title="Мгновенный ответ из регламента по текущей телеметрии (0 мс)">
              ⚡ RAG (0с)
            </S.ModeOption>
            <S.ModeOption active={mode === 'auto'} onClick={() => setMode('auto')} title="Мгновенная справка RAG + попытка дополнения от LLM">
              🔮 Auto
            </S.ModeOption>
            <S.ModeOption active={mode === 'llm'} onClick={() => setMode('llm')} title="Запрос только к нейросети LM Studio">
              🤖 LLM
            </S.ModeOption>
          </S.ModeSelector>
        )}
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
          <S.MessagesBox ref={messagesBoxRef}>
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
                  <S.TypingIndicator>
                    {typingSeconds < 10
                      ? 'ИИ генерирует ответ...'
                      : `ИИ генерирует ответ (${typingSeconds} сек)... Локальная модель может отвечать до 3 мин.`
                    }
                  </S.TypingIndicator>
                </S.MessageBubble>
              </S.MessageRow>
            )}
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
    </S.AssistantContent>
  );
};

export default AiAssistant;
