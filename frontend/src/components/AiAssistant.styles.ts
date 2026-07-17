import styled from 'styled-components';

export const AssistantContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 2;
  min-height: 160px;
  color: ${props => props.theme.colors.text};
`;

export const TabsHeader = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 6px;
  gap: 12px;
  
  @media (max-height: 950px) {
    margin-bottom: 4px;
    gap: 8px;
  }
`;

export const TabButton = styled.button<{ active: boolean }>`
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.active ? '#00e5ff' : 'transparent'};
  color: ${props => props.active ? '#00e5ff' : props.theme.colors.textMuted};
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    color: #00e5ff;
  }
  
  @media (max-height: 950px) {
    font-size: 10px;
    padding: 2px 6px;
  }
`;

export const ModeSelector = styled.div`
  display: flex;
  margin-left: auto;
  align-items: center;
  gap: 4px;
  background: ${props => props.theme.colors.surfaceLight || '#131b26'};
  padding: 2px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
`;

export const ModeOption = styled.button<{ active: boolean }>`
  background: ${props => props.active ? '#00e5ff22' : 'transparent'};
  border: 1px solid ${props => props.active ? '#00e5ff' : 'transparent'};
  color: ${props => props.active ? '#00e5ff' : props.theme.colors.textMuted};
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #00e5ff;
  }
`;

export const AssessmentLayout = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  flex: 1;

  @media (max-height: 950px) {
    gap: 8px;
  }
`;

export const ProgressWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  @media (max-height: 950px) {
    gap: 2px;
  }
`;

export const RiskLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${props => props.theme.colors.textMuted};

  @media (max-height: 950px) {
    font-size: 9px;
  }
`;

export const ChatBubble = styled.div<{ risk: number }>`
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

  @media (max-height: 950px) {
    padding: 4px 8px;
  }

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

export const AiMessage = styled.p`
  font-size: 12px;
  line-height: 1.4;
  color: ${props => props.theme.colors.text};
  font-weight: 500;

  @media (max-height: 950px) {
    font-size: 11px;
    line-height: 1.35;
  }
`;

export const ProgressPercent = styled.span<{ color: string }>`
  color: ${props => props.color};
  font-weight: bold;
  font-size: 14px;

  @media (max-height: 950px) {
    font-size: 12px;
  }
`;

/* ИНТЕРАКТИВНЫЙ ИИ ЧАТ */
export const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

export const MessagesBox = styled.div`
  flex: 1;
  height: 280px;
  max-height: 280px;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 6px;
  background-color: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  
  /* Кастомный видимый скроллбар внутри чата */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #00e5ff;
  }
  
  @media (max-height: 950px) {
    height: 220px;
    max-height: 220px;
    gap: 6px;
    margin-bottom: 6px;
  }
`;

export const MessageRow = styled.div<{ isUser: boolean }>`
  display: flex;
  justify-content: ${props => props.isUser ? 'flex-end' : 'flex-start'};
`;

export const MessageBubble = styled.div<{ isUser: boolean }>`
  max-width: 85%;
  background-color: ${props => props.isUser ? 'rgba(0, 229, 255, 0.1)' : '#161c28'};
  border: 1px solid ${props => props.isUser ? '#00e5ff' : props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 11px;
  line-height: 1.4;
  word-break: break-word;
  white-space: pre-wrap;

  p {
    margin: 0;
  }
`;

export const SuggestionsBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
  
  @media (max-height: 950px) {
    gap: 4px;
    margin-bottom: 4px;
  }
`;

export const SuggestionChip = styled.button`
  background-color: #111827;
  border: 1px solid ${props => props.theme.colors.border};
  color: #00e5ff;
  border-radius: 12px;
  padding: 3px 10px;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(0, 229, 255, 0.08);
    border-color: #00e5ff;
  }
`;

export const InputWrapper = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;

  .ant-input {
    flex: 1;
    background-color: #0f172a;
    border-color: #334155;
    color: #f8fafc;

    &:hover, &:focus {
      border-color: #00e5ff;
    }
  }

  .ant-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

export const TypingIndicator = styled.div`
  color: ${props => props.theme.colors.textMuted};
  font-size: 10px;
  font-style: italic;
  margin-left: 4px;
  margin-bottom: 2px;
`;
