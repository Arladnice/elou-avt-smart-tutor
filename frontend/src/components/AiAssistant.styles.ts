import styled from 'styled-components';
import { Card } from 'antd';

export const AssistantContainer = styled(Card)`
  background-color: ${props => props.theme.colors.surface};
  border-color: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;

  .ant-card-head {
    border-bottom: 1px solid ${props => props.theme.colors.border};
    padding: 0 16px;
    min-height: 40px;

    @media (max-height: 950px) {
      padding: 0 12px;
      min-height: 32px;
    }
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

    @media (max-height: 950px) {
      font-size: 11px;
      padding: 6px 0;
      gap: 6px;
    }
  }

  .ant-card-body {
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 16px;
    height: calc(100% - 40px);

    @media (max-height: 950px) {
      padding: 6px 10px;
      gap: 8px;
      height: calc(100% - 32px);
    }
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
