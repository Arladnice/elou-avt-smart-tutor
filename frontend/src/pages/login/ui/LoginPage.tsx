import React, { useState, useEffect, useCallback } from 'react';
import { login } from '@/entities/session';
import { useSimulatorActions } from '@/entities/simulator';
import { App, Spin } from 'antd';
import { ThemeToggle } from '@/shared/ui';
import { Sparkles, Zap, GraduationCap } from 'lucide-react';

import * as S from './LoginPage.styles';

const DEMO_PASSWORD = 'Ktk_2026!';

const getRandomOperator = () => {
  // Пул из 7 учётных записей операторов в БД (operator_1 .. operator_7)
  const opNumber = Math.floor(Math.random() * 7) + 1;
  return `operator_${opNumber}`;
};

const Login: React.FC = () => {
  const { message } = App.useApp();
  const { loginUser } = useSimulatorActions();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'operator' | 'instructor'>('operator');
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoLogging, setIsAutoLogging] = useState(false);

  const performLogin = useCallback(async (
    targetUser: string,
    targetPass: string,
    targetRole: 'operator' | 'instructor',
    isAuto = false
  ) => {
    setIsLoading(true);
    if (isAuto) setIsAutoLogging(true);

    try {
      // Отправляем REST-запрос на бэкенд для авторизации через централизованный сервис
      const data = await login(targetUser.trim(), targetPass, targetRole);
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
        if (targetRole === 'instructor') {
          message.error('Сервер КТК недоступен. Вход инструктора требует проверки учётных данных на сервере.');
          setIsAutoLogging(false);
          return;
        }
        console.warn('Сервер недоступен, выполняем локальный вход оператора (демо-режим).');
        loginUser(targetUser.trim(), 'operator');
        message.warning('Бэкенд недоступен. Запущен автономный демо-режим оператора.');
      } else {
        message.error(error.message || 'Ошибка авторизации');
      }
      setIsAutoLogging(false);
    } finally {
      setIsLoading(false);
    }
  }, [loginUser, message]);

  // Обработка автоматического входа по QR-ссылке (?demo=operator или ?demo=instructor)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demoParam = params.get('demo') || params.get('role');
    if (demoParam === 'operator' || demoParam === 'jury') {
      const opUser = getRandomOperator();
      setName(opUser);
      setPassword(DEMO_PASSWORD);
      setRole('operator');
      performLogin(opUser, DEMO_PASSWORD, 'operator', true);
    } else if (demoParam === 'instructor') {
      setName('instructor_1');
      setPassword(DEMO_PASSWORD);
      setRole('instructor');
      performLogin('instructor_1', DEMO_PASSWORD, 'instructor', true);
    }
  }, [performLogin]);

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
    await performLogin(name, password, role);
  };

  const handleQuickDemo = (targetRole: 'operator' | 'instructor') => {
    const opUser = targetRole === 'operator' ? getRandomOperator() : 'instructor_1';
    setName(opUser);
    setPassword(DEMO_PASSWORD);
    setRole(targetRole);
    performLogin(opUser, DEMO_PASSWORD, targetRole);
  };

  return (
    <S.Container>
      <S.ThemeControl><ThemeToggle /></S.ThemeControl>
      <S.LoginCard
        title={
          <>
            <div>КТК ЭЛОУ-АВТ</div>
            <S.HeaderSubtitle>Компьютерный тренажёр технологического персонала</S.HeaderSubtitle>
          </>
        }
        variant="borderless"
      >
        {isAutoLogging ? (
          <S.AutoLoginOverlay>
            <Spin size="large" />
            <S.AutoLoginText>
              Авторизация сессии жюри (демо-доступ)...
            </S.AutoLoginText>
          </S.AutoLoginOverlay>
        ) : (
          <>
            <S.DemoSection>
              <S.DemoTitle>
                <Sparkles size={14} />
                <span>Быстрый демо-доступ (для жюри и экспертов)</span>
              </S.DemoTitle>
              <S.DemoButtonGroup>
                <S.DemoButton
                  type="default"
                  icon={<Zap size={14} />}
                  onClick={() => handleQuickDemo('operator')}
                  loading={isLoading && role === 'operator'}
                >
                  Войти: Оператор
                </S.DemoButton>
                <S.DemoButton
                  type="default"
                  icon={<GraduationCap size={14} />}
                  onClick={() => handleQuickDemo('instructor')}
                  loading={isLoading && role === 'instructor'}
                >
                  Войти: Инструктор
                </S.DemoButton>
              </S.DemoButtonGroup>
              <S.CredentialsHint>
                <div>
                  <S.KeyIcon size={11} />
                  Тестовые данные: Операторы <code>operator_1</code> .. <code>operator_7</code>, Инструктор <code>instructor_1</code>, пароль <code>Ktk_2026!</code>
                </div>
              </S.CredentialsHint>
            </S.DemoSection>

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
                    { value: 'operator', label: 'Оператор — управление установкой' },
                    { value: 'instructor', label: 'Инструктор — управление обучением' }
                  ]}
                />
              </S.FormGroup>

              <S.StyledButton type="primary" htmlType="submit" loading={isLoading}>
                Войти в систему
              </S.StyledButton>
            </S.Form>

            <S.InfoBlock>
              <S.BrainIcon size={22} />
              <S.InfoText>
                <strong>Учебная система:</strong> анализирует телеметрию, предупреждает об отклонениях и фиксирует действия оператора в протоколе сессии.
              </S.InfoText>
            </S.InfoBlock>
          </>
        )}
      </S.LoginCard>
    </S.Container>
  );
};

export default Login;

