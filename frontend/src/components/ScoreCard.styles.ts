import styled from 'styled-components';
import { List, Button } from 'antd';

export const CardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 10px 0;
`;

export const GradeBadge = styled.div<{ grade: string }>`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  font-weight: 900;
  color: white;
  background-color: ${props => {
    if (props.grade === 'A') return props.theme.colors.success;
    if (props.grade === 'B') return '#0070f3';
    if (props.grade === 'C') return props.theme.colors.warning;
    return props.theme.colors.danger;
  }};
  box-shadow: 0 0 20px ${props => {
    if (props.grade === 'A') return 'rgba(0, 255, 102, 0.4)';
    if (props.grade === 'B') return 'rgba(0, 112, 243, 0.4)';
    if (props.grade === 'C') return 'rgba(255, 204, 0, 0.4)';
    return 'rgba(255, 51, 51, 0.4)';
  }};
  border: 4px solid #111620;
`;

export const StatRow = styled.div`
  display: flex;
  justify-content: space-around;
  width: 100%;
  background: #141b27;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border};
`;

export const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  span.label {
    font-size: 10px;
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
  }

  span.val {
    font-family: ${props => props.theme.fonts.mono};
    font-size: 16px;
    font-weight: 700;
    color: ${props => props.theme.colors.text};
  }
`;

export const SectionTitle = styled.h3`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${props => props.theme.colors.text};
  align-self: flex-start;
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  width: 100%;
  padding-bottom: 4px;
`;

export const StyledList = styled(List)`
  width: 100%;
  max-height: 180px;
  overflow-y: auto;
  
  .ant-list-item {
    padding: 8px 12px;
    border-color: ${props => props.theme.colors.border};
    background-color: #0b0f17;
    margin-bottom: 6px;
    border-radius: 4px;
  }
`;

export const ErrorTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${props => props.theme.colors.danger};
`;

export const ErrorClause = styled.span`
  background: rgba(255, 51, 51, 0.15);
  color: ${props => props.theme.colors.danger};
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 8px;
  text-transform: uppercase;
`;

export const ErrorText = styled.p`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  margin-top: 4px;
  line-height: 1.4;
`;

export const RecItem = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.text};
  line-height: 1.4;
  padding: 6px 12px;
  background: rgba(0, 229, 255, 0.05);
  border-left: 3px solid ${props => props.theme.colors.accent};
  border-radius: 0 4px 4px 0;
  margin-bottom: 6px;
  width: 100%;
`;

export const FooterButtons = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
  margin-top: 15px;
`;

// New semantic wrappers to clean up inline styles

export const ModalTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e1e7f0;
  font-size: 15px;
`;

export const CenterTextContainer = styled.div`
  text-align: center;
`;

export const HeaderTitle = styled.h2<{ color: string }>`
  font-size: 16px;
  font-weight: bold;
  color: ${props => props.color};
`;

export const HeaderSubtitle = styled.p`
  font-size: 11px;
  color: #7c8ba1;
  margin-top: 2px;
`;

export const ErrorItemContainer = styled.div`
  width: 100%;
`;

export const ErrorItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const FullWidthContainer = styled.div`
  width: 100%;
`;

export const StyledRepeatButton = styled(Button)`
  flex: 1;
  height: 38px;
  background-color: rgba(0, 229, 255, 0.1);
  border-color: #00e5ff;
  color: #00e5ff;
  font-weight: 600;
  text-transform: uppercase;

  &:hover, &:focus {
    background-color: #00e5ff !important;
    border-color: #00e5ff !important;
    color: #0b0f17 !important;
  }
`;

export const StyledExitButton = styled(Button)`
  height: 38px;
  background-color: #0a0e14;
  border-color: #222c3e;
  color: #7c8ba1;
  font-weight: 600;
  text-transform: uppercase;

  &:hover, &:focus {
    background-color: #222c3e !important;
    border-color: #222c3e !important;
    color: #e1e7f0 !important;
  }
`;
