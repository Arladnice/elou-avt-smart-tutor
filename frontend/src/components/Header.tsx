import React from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Play, RotateCcw, ShieldAlert, User, CheckCircle, ClipboardList } from 'lucide-react';
import * as S from './Header.styles';

const Header: React.FC = () => {
  const { status, timeElapsed, triggerEsd, resetSession, username, logoutUser, role, completeSession, scenarioId } = useSimulator();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getStatusText = () => {
    if (status === 'running') return 'Работа';
    if (status === 'esd') return 'Аварийный Останов';
    if (status === 'accident') return 'Авария';
    return 'Пауза';
  };

  const getScenarioTitle = (id: string) => {
    switch (id) {
      case 'startup': return 'Пуск установки ЭЛОУ-АВТ';
      case 'shutdown': return 'Аварийный останов печи П-1';
      case 'column_shutdown': return 'Останов колонны К-1';
      case 'overpressure_relief': return 'Ликвидация роста давления';
      case 'recirculation': return 'Перевод на рециркуляцию';
      default: return id;
    }
  };

  return (
    <S.HeaderContainer>
      <S.Title>КТК ЭЛОУ-АВТ // ИИ-Модуль</S.Title>
      
      <S.StatusIndicator status={status}>
        {getStatusText()}
      </S.StatusIndicator>

      <S.InfoPanel>
        <S.InfoItem>
          <User size={14} />
          Оператор: <strong>{username}</strong>
        </S.InfoItem>
        <S.InfoItem>
          <ClipboardList size={14} />
          Сценарий: <strong>{getScenarioTitle(scenarioId)}</strong>
        </S.InfoItem>
        <S.InfoItem>
          <Play size={14} />
          Сессия: <strong>{formatTime(timeElapsed)} / 05:00</strong>
        </S.InfoItem>
      </S.InfoPanel>

      <S.Actions>
        {role === 'operator' && status === 'running' && (
          <S.Button onClick={completeSession} variant="success">
            <CheckCircle size={12} />
            Завершить
          </S.Button>
        )}
        <S.Button onClick={resetSession} variant="primary">
          <RotateCcw size={12} />
          Сброс
        </S.Button>
        <S.Button onClick={triggerEsd} variant="danger" disabled={status === 'esd'}>
          <ShieldAlert size={12} />
          Авария (ESD)
        </S.Button>
        <S.Button onClick={logoutUser} variant="secondary">
          Выход
        </S.Button>
      </S.Actions>
    </S.HeaderContainer>
  );
};

export default Header;
