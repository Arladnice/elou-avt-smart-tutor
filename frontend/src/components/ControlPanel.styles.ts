import styled from 'styled-components';
import { Card } from 'antd';

export const PanelContainer = styled(Card)`
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
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;

    @media (max-height: 950px) {
      padding: 6px 10px;
      gap: 6px;
    }
  }
`;

export const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  @media (max-height: 950px) {
    gap: 2px;
  }
`;

export const Label = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};

  @media (max-height: 950px) {
    font-size: 11px;
  }
`;

export const SwitchRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${props => props.theme.colors.background};
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};

  @media (max-height: 950px) {
    padding: 3px 8px;
  }
`;

export const SwitchLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.theme.colors.textMuted};

  @media (max-height: 950px) {
    font-size: 11px;
  }

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

  @media (max-height: 950px) {
    gap: 4px;
  }
`;
