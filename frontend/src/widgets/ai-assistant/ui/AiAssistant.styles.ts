import styled from 'styled-components';
import { Alert } from 'antd';

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

export const TabButton = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.textMuted};
  font-size: 13px;
  font-weight: 600;
  padding: 7px 10px;
  white-space: nowrap;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primary};
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
  background: ${props => props.theme.colors.surfaceLight};
  padding: 2px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
`;

export const ModeOption = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? props.theme.colors.primaryMuted : 'transparent'};
  border: 1px solid ${props => props.$active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.textMuted};

  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  white-space: nowrap;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primary};
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

export const ChatBubble = styled.div<{ $risk: number }>`
  flex: 1;
  background-color: ${props => props.theme.colors.background};
  border: 1px solid ${props => {
    if (props.$risk > 70) return props.theme.colors.danger;
    if (props.$risk > 30) return props.theme.colors.warning;
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
    if (props.$risk > 70) return `inset 3px 0 0 ${props.theme.colors.danger}`;
    if (props.$risk > 30) return `inset 3px 0 0 ${props.theme.colors.warning}`;
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
      if (props.$risk > 70) return props.theme.colors.danger;
      if (props.$risk > 30) return props.theme.colors.warning;
      return props.theme.colors.border;
    }};
    border-bottom: 1px solid ${props => {
      if (props.$risk > 70) return props.theme.colors.danger;
      if (props.$risk > 30) return props.theme.colors.warning;
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
  height: 320px;
  max-height: 320px;
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
    background: ${props => props.theme.colors.surfaceMuted};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.borderStrong};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.primary};
  }
  
  @media (max-height: 950px) {
    height: 220px;
    max-height: 220px;
    gap: 6px;
    margin-bottom: 6px;
  }
`;

export const MessageRow = styled.div<{ $isUser: boolean }>`
  display: flex;
  justify-content: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
`;

export const MessageBubble = styled.div<{ $isUser: boolean }>`
  max-width: 85%;
  background-color: ${props => props.$isUser ? props.theme.colors.primaryMuted : props.theme.colors.surfaceLight};
  border: 1px solid ${props => props.$isUser ? props.theme.colors.primary : props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 14px;
  line-height: 1.45;
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
  background-color: ${props => props.theme.colors.surfaceLight};
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.primary};
  border-radius: 12px;
  padding: 7px 12px;
  font-size: 12px;
  white-space: nowrap;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.primaryMuted};
    border-color: ${props => props.theme.colors.primary};
  }
`;

export const InputWrapper = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;

  .ant-input {
    flex: 1;
    background-color: ${props => props.theme.colors.canvas};
    border-color: ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.text};
    font-size: 14px;

    &:hover, &:focus {
      border-color: ${props => props.theme.colors.primary};
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

export const StyledAlert = styled(Alert)`
  margin-bottom: 8px;
  font-size: 11px;
  padding: 6px 12px;
`;
