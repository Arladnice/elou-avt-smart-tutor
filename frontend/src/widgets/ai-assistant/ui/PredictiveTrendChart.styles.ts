import styled from 'styled-components';

export const ChartWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 4px;
`;

export const ParamSelector = styled.div`
  display: flex;
  gap: 4px;
`;

export const ParamButton = styled.button<{ $active: boolean; $color: string }>`
  flex: 1;
  background: ${props => (props.$active ? `${props.$color}22` : 'transparent')};
  border: 1px solid ${props => (props.$active ? props.$color : props.theme.colors.border)};
  color: ${props => (props.$active ? props.$color : props.theme.colors.textMuted)};
  font-size: 10px;
  font-weight: 600;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  transition: ${props => props.theme.transitions.default};

  &:hover {
    color: ${props => props.$color};
    border-color: ${props => props.$color};
  }
`;

export const ForecastSummary = styled.div<{ $isAlert: boolean }>`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 10px;
  padding: 3px 6px;
  border-radius: 3px;
  background: ${props => (props.$isAlert ? 'rgba(255, 51, 51, 0.12)' : props.theme.colors.surfaceLight)};
  border: 1px solid ${props => (props.$isAlert ? props.theme.colors.danger : props.theme.colors.border)};

  .label {
    color: ${props => props.theme.colors.textMuted};
  }

  .value {
    font-family: ${props => props.theme.fonts.mono};
    font-weight: 700;
    color: ${props => (props.$isAlert ? props.theme.colors.danger : props.theme.colors.text)};
  }

  .alert {
    color: ${props => props.theme.colors.danger};
    font-weight: 600;
  }
`;

/* Recharts ResponsiveContainer тянет высоту в 100% от родителя,
   поэтому высота должна быть явной — min-height схлопывает график в 0. */
export const ChartArea = styled.div`
  flex: 0 0 auto;
  height: 150px;

  @media (max-height: 950px) {
    height: 120px;
  }
`;

export const Legend = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 9px;
  color: ${props => props.theme.colors.textMuted};
`;

export const LegendItem = styled.span<{ $color: string }>`
  color: ${props => props.$color};
  white-space: nowrap;
`;

export const EmptyState = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  border: 1px dashed ${props => props.theme.colors.border};
  border-radius: 4px;
  text-align: center;
  padding: 8px;
`;
