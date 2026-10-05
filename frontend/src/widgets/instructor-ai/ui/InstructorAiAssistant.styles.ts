import styled from 'styled-components';
import { Button, Card } from 'antd';

export const AssistantCard = styled(Card)<{ $severity: 'stable' | 'attention' | 'critical' }>`
  flex: 0 0 auto;
  min-height: 142px;
  height: auto;
  background: ${props => props.theme.colors.surface};
  border-color: ${props => {
    if (props.$severity === 'critical') return props.theme.colors.danger;
    if (props.$severity === 'attention') return props.theme.colors.warning;
    return props.theme.colors.border;
  }};

  .ant-card-head {
    min-height: 38px;
    padding: 0 14px;
    border-bottom-color: ${props => props.theme.colors.border};
  }

  .ant-card-head-title {
    color: ${props => props.theme.colors.text};
    font-size: 13px;
  }

  .ant-card-body {
    padding: 12px 14px;
    overflow: visible;
  }

  @media (max-height: 950px) {
    .ant-card-head {
      min-height: 32px;
    }

    .ant-card-body {
      padding: 10px 12px;
    }
  }

  @media (max-width: 1080px) {
    height: auto;
    min-height: 150px;
  }
`;

export const CardTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 7px;
`;

export const MethodBadge = styled.span`
  color: ${props => props.theme.colors.textMuted};
  font-size: 10px;
  font-weight: 500;
`;

export const TabActions = styled.div`
  display: flex;
  gap: 4px;
`;

export const TabButton = styled(Button)`
  && {
    height: 24px;
    padding: 0 8px;
    font-size: 10px;
  }
`;

export const InsightGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.9fr);
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

export const InsightBlock = styled.section`
  min-width: 0;
  padding-left: 12px;
  border-left: 2px solid ${props => props.theme.colors.border};
`;

export const BlockLabel = styled.div`
  margin-bottom: 4px;
  color: ${props => props.theme.colors.textMuted};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
`;

export const Summary = styled.div<{ $severity: 'stable' | 'attention' | 'critical' }>`
  color: ${props => {
    if (props.$severity === 'critical') return props.theme.colors.danger;
    if (props.$severity === 'attention') return props.theme.colors.warning;
    return props.theme.colors.success;
  }};
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
`;

export const Detail = styled.div`
  margin-top: 4px;
  color: ${props => props.theme.colors.text};
  font-size: 12px;
  line-height: 1.4;
`;

export const EvidenceList = styled.ul`
  margin: 6px 0 0;
  padding-left: 16px;
  color: ${props => props.theme.colors.text};
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;

  li {
    margin-bottom: 2px;
  }

  li::marker {
    color: ${props => props.theme.colors.primary};
  }
`;

export const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
`;

export const MetricItem = styled.div<{ $isAlert?: boolean }>`
  min-width: 0;
  padding: 9px;
  border: 1px solid ${props => props.$isAlert ? props.theme.colors.warning : props.theme.colors.border};
  border-radius: 4px;
  background: ${props => props.theme.colors.canvas};

  .label, .sub {
    display: block;
    color: ${props => props.theme.colors.textMuted};
    font-size: 9px;
  }

  .value {
    display: block;
    margin: 2px 0;
    color: ${props => props.$isAlert ? props.theme.colors.warning : props.theme.colors.text};
    font-family: ${props => props.theme.fonts.mono};
    font-size: 14px;
    font-weight: 700;
  }
`;

export const MetricsUnavailable = styled.div`
  color: ${props => props.theme.colors.textMuted};
  font-size: 11px;
`;
