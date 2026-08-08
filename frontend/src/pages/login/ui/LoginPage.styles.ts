import styled from 'styled-components';
import { Brain, User } from 'lucide-react';
import { Button, Card, Input, Select } from 'antd';

export const Container = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  padding: 32px;
  background:
    linear-gradient(90deg, ${props => props.theme.colors.border} 1px, transparent 1px),
    linear-gradient(${props => props.theme.colors.border} 1px, transparent 1px),
    ${props => props.theme.colors.background};
  background-size: 48px 48px;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${props => props.theme.mode === 'light'
      ? 'rgba(233, 237, 241, 0.84)'
      : 'rgba(16, 21, 27, 0.84)'};
    pointer-events: none;
  }
`;

export const ThemeControl = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 2;
`;

export const LoginCard = styled(Card)`
  z-index: 1;
  width: min(440px, 100%);
  overflow: hidden;
  color: ${props => props.theme.colors.text};
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.borderStrong};
  border-radius: 6px;
  box-shadow: 0 18px 44px ${props => props.theme.colors.shadow};

  .ant-card-head {
    min-height: 78px;
    background: ${props => props.theme.colors.surfaceLight};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    text-align: left;
  }

  .ant-card-head-title {
    padding-left: 14px;
    color: ${props => props.theme.colors.text};
    border-left: 4px solid ${props => props.theme.colors.primary};
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.2px;
  }

  .ant-card-body { padding: 28px; }
`;

export const HeaderSubtitle = styled.p`
  margin-top: 4px;
  color: ${props => props.theme.colors.textMuted};
  font-size: 11px;
  font-weight: 400;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 17px;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const Label = styled.label`
  color: ${props => props.theme.colors.text};
  font-size: 12px;
  font-weight: 600;
`;

export const StyledButton = styled(Button)`
  && {
    height: 42px;
    margin-top: 6px;
    color: #ffffff;
    background: ${props => props.theme.colors.primary};
    border-color: ${props => props.theme.colors.primary};
    border-radius: 4px;
    font-weight: 600;

    &:hover {
      color: #ffffff;
      background: ${props => props.theme.colors.accent};
      border-color: ${props => props.theme.colors.accent};
    }
  }
`;

export const InfoBlock = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 20px;
  padding: 12px;
  color: ${props => props.theme.colors.textMuted};
  background: ${props => props.theme.colors.surfaceLight};
  border-left: 3px solid ${props => props.theme.colors.accent};
`;

export const InfoText = styled.div`
  color: ${props => props.theme.colors.textMuted};
  font-size: 11px;
  line-height: 1.5;

  strong { color: ${props => props.theme.colors.text}; }
`;

export const StyledInput = styled(Input)`
  && {
    height: 40px;
    color: ${props => props.theme.colors.text};
    background: ${props => props.theme.colors.canvas};
    border-color: ${props => props.theme.colors.border};

    .ant-input {
      color: ${props => props.theme.colors.text};
      background: transparent;
    }

    &:focus,
    &:focus-within {
      border-color: ${props => props.theme.colors.primary};
      box-shadow: 0 0 0 3px ${props => props.theme.colors.focusRing};
    }
  }

  .ant-input-prefix { margin-right: 8px; }
`;

export const StyledSelect = styled(Select)`
  width: 100%;
  height: 40px;
`;

export const UserIcon = styled(User)`
  color: ${props => props.theme.colors.textMuted};
`;

export const BrainIcon = styled(Brain)`
  flex-shrink: 0;
  color: ${props => props.theme.colors.accent};
`;
