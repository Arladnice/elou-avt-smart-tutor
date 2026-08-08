import styled from 'styled-components';

export const ToggleButton = styled.button`
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: ${props => props.theme.colors.textMuted};
  background: ${props => props.theme.colors.surfaceLight};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
  transition: ${props => props.theme.transitions.default};

  &:hover {
    color: ${props => props.theme.colors.primary};
    background: ${props => props.theme.colors.primaryMuted};
    border-color: ${props => props.theme.colors.primary};
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px ${props => props.theme.colors.focusRing};
  }
`;
