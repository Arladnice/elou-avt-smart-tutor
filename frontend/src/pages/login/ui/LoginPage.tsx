import React, { useState } from 'react';
import { login } from '@/entities/session';
import { useSimulatorActions } from '@/entities/simulator';
import { App } from 'antd';

import * as S from './LoginPage.styles';

const Login: React.FC = () => {
  const { message } = App.useApp();
  const { loginUser } = useSimulatorActions();
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
      const data = await login(name.trim(), password, role);
      sessionStorage.setItem('ktk_token', data.token);
      // Генерируем уникальный session_id для изоляции сессии данного пользователя
      const sessionId = `${data.username}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem('ktk_session_id', sessionId);
      loginUser(data.username, data.role);
      message.success(`Вход выполнен успешно! Добро пожаловать, ${data.username}.`);
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message === 'AUTH_INVALID_PASSWORD') {
        message.error('Неверный логин или пароль');
      } else if (error.message === 'NETWORK_ERROR') {
        // Автономный режим — только тренировка оператора на локальной физике.
        // Роль инструктора даёт управление чужими сессиями и инъекции отказов,
        // поэтому без проверки пароля на сервере она не выдаётся.
        if (role === 'instructor') {
          message.error('Сервер КТК недоступен. Вход инструктора требует проверки учётных данных на сервере.');
          return;
        }
        console.warn('Сервер недоступен, выполняем локальный вход оператора (демо-режим).');
        loginUser(name.trim(), 'operator');
        message.warning('Бэкенд недоступен. Демо-режим оператора: результаты не сохраняются и не аттестуются.');
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
            <S.Label>Пароль:</S.Label>
            <S.StyledInput 
              type="password"
              placeholder="Введите пароль" 
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
