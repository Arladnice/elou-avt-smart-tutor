import React, { useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { App } from 'antd';
import { apiService } from '../services/api';
import * as S from './Login.styles';

const Login: React.FC = () => {
  const { message } = App.useApp();
  const { loginUser } = useSimulator();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'operator' | 'instructor'>('operator');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      message.error('Пожалуйста, введите ваше имя');
      return;
    }
    if (!password) {
      message.error('Пожалуйста, введите пароль');
      return;
    }

    try {
      // Отправляем REST-запрос на бэкенд для авторизации через централизованный сервис
      const data = await apiService.login(name.trim(), password, role);
      sessionStorage.setItem('ktk_token', data.token);
      // Генерируем уникальный session_id для изоляции сессии данного пользователя
      const sessionId = `${data.username}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem('ktk_session_id', sessionId);
      loginUser(data.username, data.role);
      message.success(`Вход выполнен успешно! Добро пожаловать, ${data.username}.`);
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message === 'AUTH_INVALID_PASSWORD') {
        message.error('Неверный пароль! Пароль по умолчанию для демо: 12345');
      } else if (error.message === 'NETWORK_ERROR') {
        console.warn('Сервер недоступен, выполняем локальный вход.');
        loginUser(name.trim(), role);
        message.warning('Бэкенд недоступен. Выполнен вход в автономном режиме.');
      } else {
        message.error(error.message || 'Ошибка авторизации');
      }
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
        variant="borderless"
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
            <S.Label>Пароль (демо: 12345):</S.Label>
            <S.StyledInput 
              type="password"
              placeholder="Введите пароль (12345)" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
            />
          </S.FormGroup>

          <S.FormGroup>
            <S.Label>Технологическая роль:</S.Label>
            <S.StyledSelect 
              value={role} 
              onChange={v => setRole(v as 'operator' | 'instructor')}
              options={[
                { value: 'operator', label: 'Оператор (SCADA-управление)' },
                { value: 'instructor', label: 'Инструктор (Контроль и сбои)' }
              ]}
              styles={S.selectStyles}
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
