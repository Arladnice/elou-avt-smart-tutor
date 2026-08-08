import styled, { css } from 'styled-components';

export const Container = styled.div<{ $isEmergency?: boolean; $fill?: boolean }>`
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.$isEmergency ? props.theme.colors.danger : props.theme.colors.border};
  border-radius: 5px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: ${props => props.$isEmergency ? `inset 3px 0 0 ${props.theme.colors.danger}` : 'none'};
  transition: ${props => props.theme.transitions.default};
  ${props => props.$fill && css`
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  `}
`;

export const Header = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  min-height: 40px;
  border-bottom: 1px solid ${props => props.$collapsed ? 'transparent' : props.theme.colors.border};
  cursor: pointer;
  user-select: none;
  transition: border-color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.surfaceLight};
  }

  @media (max-height: 950px) {
    padding: 0 12px;
    min-height: 32px;
  }
`;

export const TitleWrapper = styled.div`
  color: ${props => props.theme.colors.textMuted};
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1px;
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-height: 950px) {
    font-size: 11px;
    gap: 6px;
  }
`;

export const CollapseIcon = styled.span<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.textMuted};
  font-size: 10px;
  transition: transform 0.25s ease;
  transform: rotate(${props => props.$collapsed ? '0deg' : '90deg'});

  @media (max-height: 950px) {
    font-size: 9px;
  }
`;

export const Body = styled.div<{ $collapsed: boolean; $fill?: boolean }>`
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.25s ease, padding 0.3s ease;

  ${props => props.$collapsed
    ? css`
        max-height: 0;
        opacity: 0;
        padding: 0 12px;
      `
    : css`
        max-height: 600px;
        opacity: 1;
        padding: 8px 12px;
      `
  }

  @media (max-height: 950px) {
    ${props => !props.$collapsed && css`
      padding: 6px 10px;
    `}
  }

  ${props => props.$fill && !props.$collapsed && css`
    flex: 1;
    min-height: 0;
    max-height: none;
    overflow-y: auto;
  `}
`;


export const ExtraWrapper = styled.div`
  display: flex;
  align-items: center;
`;
