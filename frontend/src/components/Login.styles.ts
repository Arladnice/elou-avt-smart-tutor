import styled, { keyframes } from 'styled-components';
import { Card, Button, Input, Select } from 'antd';
import { Brain, User } from 'lucide-react';

export const glow = keyframes`
  0% { box-shadow: 0 0 10px rgba(0, 229, 255, 0.1); }
  50% { box-shadow: 0 0 20px rgba(0, 229, 255, 0.25); }
  100% { box-shadow: 0 0 10px rgba(0, 229, 255, 0.1); }
`;

export const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background-color: ${props => props.theme.colors.background};
`;

export const LoginCard = styled(Card)`
  width: 420px;
  background-color: ${props => props.theme.colors.surface};
  border-color: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  animation: ${glow} 3s infinite ease-in-out;
  border-radius: 8px;

  .ant-card-head {
    border-bottom: 1px solid ${props => props.theme.colors.border};
    text-align: center;
  }

  .ant-card-head-title {
    color: ${props => props.theme.colors.text};
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .ant-card-body {
    padding: 24px;
  }
`;

export const HeaderSubtitle = styled.p`
  color: ${props => props.theme.colors.textMuted};
  font-size: 11px;
  text-transform: uppercase;
  margin-top: 4px;
  font-family: ${props => props.theme.fonts.mono};
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const Label = styled.label`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${props => props.theme.colors.textMuted};
`;

export const StyledButton = styled(Button)`
  background: rgba(0, 229, 255, 0.1);
  border-color: ${props => props.theme.colors.accent};
  color: ${props => props.theme.colors.accent};
  font-weight: 700;
  text-transform: uppercase;
  height: 40px;
  letter-spacing: 0.5px;
  margin-top: 10px;

  &:hover {
    background: ${props => props.theme.colors.accent};
    color: #0b0f17;
    box-shadow: 0 0 15px ${props => props.theme.colors.accent};
  }
`;

export const InfoBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: #141b27;
  border: 1px dashed ${props => props.theme.colors.border};
  border-radius: 4px;
  padding: 10px;
  margin-top: 15px;
`;

export const InfoText = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  line-height: 1.4;

  strong {
    color: ${props => props.theme.colors.text};
  }
`;

export const StyledInput = styled(Input)`
  background-color: #0a0e14 !important;
  border-color: #222c3e !important;
  color: #e1e7f0 !important;
  height: 38px !important;

  .ant-input {
    background-color: #0a0e14 !important;
    color: #e1e7f0 !important;
  }
  
  .ant-input-prefix {
    margin-right: 8px;
  }
`;

export const StyledSelect = styled(Select)`
  width: 100%;
  height: 38px;
`;

export const dropdownStyles = {
  backgroundColor: '#111620',
  color: '#e1e7f0'
};

export const UserIcon = styled(User)`
  color: #7c8ba1;
`;

export const BrainIcon = styled(Brain)`
  flex-shrink: 0;
`;
