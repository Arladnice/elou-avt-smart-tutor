import styled from 'styled-components';

export const PanelContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: ${props => props.theme.colors.text};

  @media (max-height: 950px) {
    gap: 6px;
  }
`;

export const TrainingNotice = styled.div`
  padding: 7px 9px;
  color: ${props => props.theme.colors.warning};
  background: ${props => props.theme.colors.warningMuted};
  border: 1px solid ${props => props.theme.colors.warning};
  border-radius: 4px;
  font-size: 10px;
  line-height: 1.35;
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
  background-color: ${props => props.theme.colors.canvas};
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

export const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
`;

export const SliderWrapper = styled.div`
  flex: 1;
  padding: 0 4px;
`;

export const TempButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background-color: ${props => props.theme.colors.surfaceLight};
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: ${props => props.theme.transitions.default};
  white-space: nowrap;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.primaryMuted};
    border-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
  }

  &:active:not(:disabled) {
    transform: scale(0.96);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-height: 950px) {
    padding: 3px 6px;
    font-size: 11px;
  }
`;

export const SliderLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
`;

export const SwitchColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-height: 950px) {
    gap: 4px;
  }
`;

export const SwitchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;

  ${SwitchRow} {
    min-width: 0;
  }

  ${SwitchLabel} {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
