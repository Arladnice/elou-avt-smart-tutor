import React, { useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { App } from 'antd';
import { apiService } from '../services/api';
import * as S from './Login.styles';

const Login: React.FC = () => {
  const { message } = App.useApp();
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
      // Отправляем REST-запрос на бэкенд для авторизации через централизованный сервис
      const data = await apiService.login(name.trim(), role);
      sessionStorage.setItem('ktk_token', data.token);
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
    <S.Container>
      <S.LoginCard
        title={
          <>
            <div>КТК ЭЛОУ-АВТ // ТРЕНАЖЕР</div>
            <S.HeaderSubtitle>Интеллектуальная система обучения персонала</S.HeaderSubtitle>
          </>
        }
        bordered={false}
      >
        <S.Form onSubmit={handleSubmit}>
          <S.FormGroup>
            <S.Label>Имя пользователя / ФИО:</S.Label>
            <S.StyledInput 
              placeholder="Введите ваше имя" 
              value={name} 
              onChange={e => setName(e.target.value)}
              prefix={<S.UserIcon size={14} />}
            />
          </S.FormGroup>

          <S.FormGroup>
            <S.Label>Технологическая роль:</S.Label>
            <S.StyledSelect 
              value={role} 
              onChange={v => setRole(v as any)}
              options={[
                { value: 'operator', label: 'Оператор (SCADA-управление)' },
                { value: 'instructor', label: 'Инструктор (Контроль и сбои)' }
              ]}
              dropdownStyle={S.dropdownStyles}
            />
          </S.FormGroup>

          <S.StyledButton type="primary" htmlType="submit">
            Запустить терминал
          </S.StyledButton>
        </S.Form>

        <S.InfoBlock>
          <S.BrainIcon size={24} color="#00e5ff" />
          <S.InfoText>
            <strong>ИИ-ассистент:</strong> Анализирует телеметрию в реальном времени, прогнозирует риски аварий и локализует отклонения от техрегламента по ГОСТ.
          </S.InfoText>
        </S.InfoBlock>
      </S.LoginCard>
    </S.Container>
  );
};

export default Login;
