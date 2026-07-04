import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useSimulator } from '../context/SimulatorContext';
import { Brain, User } from 'lucide-react';
import { Input, Select, Button, Card, message } from 'antd';

const glow = keyframes`
  0% { box-shadow: 0 0 10px rgba(0, 229, 255, 0.1); }
  50% { box-shadow: 0 0 20px rgba(0, 229, 255, 0.25); }
  100% { box-shadow: 0 0 10px rgba(0, 229, 255, 0.1); }
`;

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background-color: ${props => props.theme.colors.background};
`;

const LoginCard = styled(Card)`
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

const HeaderSubtitle = styled.p`
  color: ${props => props.theme.colors.textMuted};
  font-size: 11px;
  text-transform: uppercase;
  margin-top: 4px;
  font-family: ${props => props.theme.fonts.mono};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${props => props.theme.colors.textMuted};
`;

const StyledButton = styled(Button)`
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

const InfoBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: #141b27;
  border: 1px dashed ${props => props.theme.colors.border};
  border-radius: 4px;
  padding: 10px;
  margin-top: 15px;
`;

const InfoText = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  line-height: 1.4;

  strong {
    color: ${props => props.theme.colors.text};
  }
`;

const Login: React.FC = () => {
  const { loginUser } = useSimulator();
  const [name, setName] = useState('');
  const [role, setRole] = useState<'operator' | 'instructor'>('operator');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      message.error('Пожалуйста, введите ваше имя');
      return;
    }

    try {
      // Отправляем REST-запрос на бэкенд для авторизации
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name.trim(), role })
      });
      
      if (!response.ok) {
        throw new Error('Ошибка сервера при авторизации');
      }
      
      const data = await response.json();
      localStorage.setItem('ktk_token', data.token);
      loginUser(data.username, data.role);
      message.success(`Вход выполнен успешно! Добро пожаловать, ${data.username}.`);
    } catch {
      // Fallback при отсутствии связи с сервером
      console.warn('Сервер недоступен, выполняем локальный вход.');
      loginUser(name.trim(), role);
      message.warning('Бэкенд недоступен. Выполнен вход в автономном режиме.');
    }
  };

  return (
    <Container>
      <LoginCard
        title={
          <>
            <div>КТК ЭЛОУ-АВТ // ТРЕНАЖЕР</div>
            <HeaderSubtitle>Интеллектуальная система обучения персонала</HeaderSubtitle>
          </>
        }
        bordered={false}
      >
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Имя пользователя / ФИО:</Label>
            <Input 
              placeholder="Введите ваше имя" 
              value={name} 
              onChange={e => setName(e.target.value)}
              prefix={<User size={14} style={{ color: '#7c8ba1' }} />}
              style={{
                backgroundColor: '#0a0e14',
                borderColor: '#222c3e',
                color: '#e1e7f0',
                height: 38
              }}
            />
          </FormGroup>

          <FormGroup>
            <Label>Технологическая роль:</Label>
            <Select 
              value={role} 
              onChange={v => setRole(v as any)}
              style={{ width: '100%', height: 38 }}
              options={[
                { value: 'operator', label: 'Оператор (SCADA-управление)' },
                { value: 'instructor', label: 'Инструктор (Контроль и сбои)' }
              ]}
              dropdownStyle={{
                backgroundColor: '#111620',
                color: '#e1e7f0'
              }}
            />
          </FormGroup>

          <StyledButton type="primary" htmlType="submit">
            Запустить терминал
          </StyledButton>
        </Form>

        <InfoBlock>
          <Brain size={24} color="#00e5ff" style={{ flexShrink: 0 }} />
          <InfoText>
            <strong>ИИ-ассистент:</strong> Анализирует телеметрию в реальном времени, прогнозирует риски аварий и локализует отклонения от техрегламента по ГОСТ.
          </InfoText>
        </InfoBlock>
      </LoginCard>
    </Container>
  );
};

export default Login;
