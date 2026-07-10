import styled from 'styled-components';
import { Card } from 'antd';

export const PanelContainer = styled(Card)`
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
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
`;

export const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const Label = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

export const SwitchRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${props => props.theme.colors.background};
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
`;

export const SwitchLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.theme.colors.textMuted};

  strong {
    color: ${props => props.theme.colors.text};
  }
`;

export const SliderWrapper = styled.div`
  padding: 0 8px;
`;

export const SliderLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #7c8ba1;
`;

export const SwitchColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
