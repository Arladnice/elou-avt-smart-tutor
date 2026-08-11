import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useTheme } from 'styled-components';
import { useTelemetry } from '@/entities/telemetry';
import { useSession } from '@/entities/session';
import {
  PRES_WARNING,
  TEMP_WARNING,
  LEVEL_HIGH,
  STARTUP_FILLING_TIME_LIMIT_SEC,
  STARTUP_HEATING_THRESHOLD_TEMP,
} from '@/shared/config';
import { Progress, Input, Button } from 'antd';
import { MessageSquare, Send, Zap, LineChart } from 'lucide-react';
import { sendAiChat } from '../api/aiApi';
import { LazyFallback } from '@/shared/ui';

/**
 * График тянет recharts — самую тяжёлую зависимость приложения. Вкладка
 * прогноза открывается не всегда, поэтому чанк грузится при первом заходе.
 */
const PredictiveTrendChart = lazy(() => import('./PredictiveTrendChart'));
import * as S from './AiAssistant.styles';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AiAssistantProps {
  /** При вынесенной постоянной оценке риска оставляет только рабочие вкладки. */
  hideRiskTab?: boolean;
  /** Прогноз тренда вынесен в отдельное окно боковой панели. */
  hideTrendTab?: boolean;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ hideRiskTab = false, hideTrendTab = false }) => {
  const theme = useTheme();
  const { riskLevel, sensors, valves, status, setpoints, defects, timeElapsed, predictions } = useTelemetry();
  const { scenarioId, mode: simMode } = useSession();
  const [activeTab, setActiveTab] = useState<'risk' | 'trend' | 'chat'>(
    hideRiskTab ? (hideTrendTab ? 'chat' : 'trend') : 'risk',
  );
  const [mode, setMode] = useState<'auto' | 'rag' | 'llm'>('rag');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Система поддержки готова. Я знаю актуальные сценарии, мнемосхему, ПАЗ и нештатные ситуации. Спросите, например, как пустить Н-2 или что делать при срыве вакуума ВТ.'
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

  // Является ли текущее состояние фазой начального заполнения при пуске
  const isStartupFilling = scenarioId === 'startup' && timeElapsed <= STARTUP_FILLING_TIME_LIMIT_SEC;
  // Печь ещё прогревается при пуске (ниже рабочего диапазона)
  const isStartupHeating = scenarioId === 'startup' && sensors.T_1 < STARTUP_HEATING_THRESHOLD_TEMP;

  // Определяем тренд уровня по прогнозу LSTM (predictions[2] = прогноз L_1 на t+15с)
  const predictedLevel = predictions?.[2] ?? sensors.L_1;
  const isLevelRising = predictedLevel > sensors.L_1 + 0.5;
  const isLevelFalling = predictedLevel < sensors.L_1 - 0.5;

  const getAiMessage = () => {
    // 1. Статусы завершения
    if (status === 'esd') {
      return 'Сработала защита блокировки. Сессия остановлена. Проанализируйте журнал тревог для выявления причин перегрузки.';
    }

    // 2. Активные дефекты (приоритет: инъецированные неисправности)
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

    // 3. Критический уровень риска (>75%)
    if (riskLevel > 75) {
      if (sensors.P_1 > PRES_WARNING) {
        return `КРИТИЧЕСКИЙ РИСК! Высокое давление в колонне К-1 (${sensors.P_1.toFixed(2)} МПа, порог ${PRES_WARNING} МПа). Немедленно откройте клапан аварийного сброса V-2!`;
      }
      if (sensors.T_1 > TEMP_WARNING && !isStartupHeating) {
        return `КРИТИЧЕСКИЙ РИСК! Высокая температура печи П-1 (${sensors.T_1.toFixed(0)}°C, порог ${TEMP_WARNING}°C). Снизьте уставку нагрева Т-1 во избежание прогара змеевика!`;
      }
      if (sensors.L_1 > LEVEL_HIGH) {
        return `КРИТИЧЕСКИЙ РИСК! Переполнение колонны К-1 (${sensors.L_1.toFixed(0)}%). Срочно откройте дренаж V-3!`;
      }
      if (sensors.L_1 < 10 && !isStartupFilling) {
        return `КРИТИЧЕСКИЙ РИСК! Опасно низкий уровень куба К-1 (${sensors.L_1.toFixed(0)}%). Откройте входную задвижку V-1 для подачи сырья!`;
      }
      return 'КРИТИЧЕСКИЙ РИСК! Физические параметры превысили предельные нормы безопасности. Проверьте показания КИПиА и арматуру.';
    }
    
    // 4. Предупреждения (с учётом сценария и тренда)
    if (!valves.V_1 && sensors.T_1 > 300 && !isStartupHeating) {
      return 'Внимание: отсутствует подача холодного сырья (клапан V-1 закрыт), при этом печь нагрета. Зафиксирован быстрый нагрев печи и рост давления. Откройте V-1 или снизьте уставку температуры!';
    }

    if (sensors.P_1 > PRES_WARNING) {
      return `Прогнозная модель фиксирует рост давления в колонне К-1 (${sensors.P_1.toFixed(2)} МПа). Рекомендуется кратковременно открыть клапан сброса V-2 для нормализации параметров.`;
    }

    if (sensors.L_1 > 80 && isLevelRising) {
      return `Уровень в колонне приближается к верхнему пределу (${sensors.L_1.toFixed(0)}%, тренд ↑). Откройте клапан дренажа V-3 или уменьшите подачу сырья V-1.`;
    }

    // При startup — низкий уровень нормален в первые 2 минуты
    if (sensors.L_1 < 20 && !isStartupFilling && isLevelFalling) {
      return `Уровень в колонне снижается (${sensors.L_1.toFixed(0)}%, тренд ↓). Увеличьте подачу сырья V-1 или прикройте клапан дренажа V-3.`;
    }

    // 5. Контекстные подсказки для startup
    if (scenarioId === 'startup') {
      if (timeElapsed < 5) {
        return 'Сценарий ПУСК: Откройте входной клапан V-1 для подачи сырья, затем повысьте уставку температуры печи П-1.';
      }
      if (isStartupFilling && sensors.L_1 < 20 && valves.V_1) {
        return `Идёт заполнение колонны К-1 сырьём (${sensors.L_1.toFixed(0)}%). Процесс штатный. Дождитесь набора уровня ≥20%.`;
      }
      if (isStartupHeating && valves.V_1) {
        return `Печь П-1 прогревается (${sensors.T_1.toFixed(0)}°C → уставка ${setpoints.T_1_Sp.toFixed(0)}°C). Процесс штатный. Дождитесь выхода на рабочий режим.`;
      }
    }

    return 'Параметры установки ЭЛОУ-АВТ стабильны. Режим работы: Оптимальный. Продолжайте наблюдение.';
  };

  const getProgressColor = () => {
    if (riskLevel > 70) return theme.colors.danger;
    if (riskLevel > 30) return theme.colors.warning;
    return theme.colors.success;
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
      
      const res = await sendAiChat(updatedMessages, telemetryContext, mode);
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

  const suggestions = defects?.pump_fail
    ? ['Что делать при отказе Н-1?', 'Как снизить уставки обеих печей?', 'Нужно ли закрывать V-1?', 'Порядок действий по сценарию']
    : defects?.coil_overheat
      ? ['Прогар змеевика П-1: что делать?', 'Какие клапаны изолировать?', 'Как перекрыть топливо П-1?', 'Порядок действий по сценарию']
      : defects?.air_fail
        ? ['Отказ воздуха КИПиА: что делать?', 'Как снизить уставки обеих печей?', 'Что происходит с V-1 и V-3?', 'Порядок действий по сценарию']
        : defects?.vt_vacuum_loss
          ? ['Срыв вакуума ВТ: что делать?', 'Как перевести на горячую циркуляцию?', 'Что делать с паром К-2?', 'Порядок действий по сценарию']
          : defects?.k2_pump_fail
            ? ['Отказ Н-4/Н-32: что делать?', 'Как перевести на рециркуляцию?', 'Что делать с К-2?', 'Порядок действий по сценарию']
            : ['Как пустить Н-2?', 'Пуск установки: порядок действий', 'Срыв вакуума ВТ: что делать?', 'ПАЗ: пороги и деблокировки'];

  return (
    <S.AssistantContent>
      <S.TabsHeader>
        {!hideRiskTab && (
          <S.TabButton $active={activeTab === 'risk'} onClick={() => setActiveTab('risk')}>
            <Zap size={12} />
            Оценка рисков
          </S.TabButton>
        )}
        {!hideTrendTab && (
          <S.TabButton $active={activeTab === 'trend'} onClick={() => setActiveTab('trend')}>
            <LineChart size={12} />
            Прогноз тренда
          </S.TabButton>
        )}
        <S.TabButton $active={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>
          <MessageSquare size={12} />
          Диалог с помощником
        </S.TabButton>
        {activeTab === 'chat' && (
          <S.ModeSelector>
            <S.ModeOption $active={mode === 'rag'} onClick={() => setMode('rag')} title="Мгновенный ответ из регламента по текущей телеметрии (0 мс)">
              ⚡ RAG (0с)
            </S.ModeOption>
            <S.ModeOption $active={mode === 'auto'} onClick={() => setMode('auto')} title="Мгновенная справка RAG + попытка дополнения от LLM">
              🔮 Auto
            </S.ModeOption>
            <S.ModeOption $active={mode === 'llm'} onClick={() => setMode('llm')} title="Запрос только к нейросети LM Studio">
              🤖 LLM
            </S.ModeOption>
          </S.ModeSelector>
        )}
      </S.TabsHeader>

      {simMode === 'exam' && (
        <S.StyledAlert
          type="warning"
          showIcon
          title="Экзаменационный режим"
          description="Автоматические подсказки отключены. Использование ИИ-чата списывает -15% балла."
        />
      )}


      {activeTab === 'risk' ? (
        <S.AssessmentLayout>
          <S.ProgressWrapper>
            <Progress 
              type="dashboard" 
              percent={riskLevel} 
              size={62}
              strokeColor={getProgressColor()}
              railColor={theme.colors.surfaceMuted}
              format={percent => (
                <S.ProgressPercent color={getProgressColor()}>
                  {percent}%
                </S.ProgressPercent>
              )}
            />

            <S.RiskLabel>Риск аварии</S.RiskLabel>
          </S.ProgressWrapper>

          <S.ChatBubble $risk={riskLevel}>
            <S.AiMessage>{getAiMessage()}</S.AiMessage>
          </S.ChatBubble>
        </S.AssessmentLayout>
      ) : activeTab === 'trend' ? (
        <Suspense fallback={<LazyFallback label="Загрузка графика" inline />}>
          <PredictiveTrendChart />
        </Suspense>
      ) : (
        <S.ChatContainer>
          <S.MessagesBox ref={messagesBoxRef}>
            {messages.map((m, idx) => (
              <S.MessageRow key={idx} $isUser={m.role === 'user'}>
                <S.MessageBubble $isUser={m.role === 'user'}>
                  {m.content}
                </S.MessageBubble>
              </S.MessageRow>
            ))}
            {isTyping && (
              <S.MessageRow $isUser={false}>
                <S.MessageBubble $isUser={false}>
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
            <Input.TextArea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onPressEnter={event => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage(inputValue);
                }
              }}
              placeholder="Введите вопрос по регламенту..."
              disabled={isTyping}
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
            <Button 
              type="primary" 
              onClick={() => handleSendMessage(inputValue)}
              disabled={isTyping || !inputValue.trim()}
              icon={<Send size={12} />}
              size="middle"
            />
          </S.InputWrapper>
        </S.ChatContainer>
      )}
    </S.AssistantContent>
  );
};

export default AiAssistant;
