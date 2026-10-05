import React, { useState } from 'react';
import { useTelemetry } from '@/entities/telemetry';
import { useSession } from '@/entities/session';
import { useSimulatorActions } from '@/entities/simulator';
import { formatTime } from '@/shared/lib';
import { ThemeToggle, JuryQrModal } from '@/shared/ui';
import { Play, RotateCcw, ShieldAlert, User, CheckCircle, ClipboardList, FlaskConical, QrCode } from 'lucide-react';
import * as S from './Header.styles';

const Header: React.FC = () => {
  const { status, timeElapsed, defects } = useTelemetry();
  const { username, role, scenarioId, isDemoMode } = useSession();
  const { triggerEsd, resetSession, logoutUser, completeSession } = useSimulatorActions();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const getStatusText = () => {
    if (status === 'running') return 'Работа';
    if (status === 'esd') return 'Аварийный Останов';
    if (status === 'accident') return 'Авария';
    return 'Пауза';
  };

  const getScenarioTitle = (id: string) => {
    switch (id) {
      case 'startup': return 'Пуск установки ЭЛОУ-АВТ';
      case 'shutdown': return 'Аварийный останов печей П-1 и П-3';
      case 'column_shutdown': return 'Останов колонны К-1';
      case 'overpressure_relief': return 'Ликвидация роста давления';
      case 'recirculation': return 'Перевод на рециркуляцию';
      case 'pump_fail': return 'Отказ сырьевого насоса Н-20';
      case 'coil_overheat': return 'Прогар змеевика печи П-1';
      case 'valve_jam': return 'Зависание клапана сброса V-2';
      case 'power_fail': return 'Отказ электроснабжения';
      case 'air_fail': return 'Отказ воздуха КИПиА';
      case 'steam_fail': return 'Срыв подачи отпарного пара';
      case 'elou_salt_breakthrough': return 'Проскок солей и воды из ЭЛОУ';
      case 'vt_vacuum_failure': return 'Срыв вакуума вакуумного блока ВТ';
      default: return id;
    }
  };

  const getEmergencySuffix = () => {
    if (!defects) return '';
    const list: string[] = [];
    if (defects.coil_overheat) list.push('Прогар П-1');
    if (defects.pump_fail) list.push('Отказ Н-20');
    if (defects.valve_jam) list.push('Зависание V-2');
    if (defects.power_fail) list.push('Обесточивание');
    if (defects.air_fail) list.push('Отказ КИПиА');
    if (defects.steam_fail) list.push('Срыв отпарки');
    if (defects.elou_desalt_fail) list.push('Проскок ЭЛОУ');
    if (defects.vt_vacuum_loss) list.push('Срыв вакуума ВТ');
    if (defects.k2_pump_fail) list.push('Отказ Н-4/Н-32');
    if (list.length === 0) return '';
    return ` (Авария: ${list.join(' + ')})`;
  };

  return (
    <S.HeaderContainer>
      <S.Title>КТК ЭЛОУ-АВТ <span>Рабочее место оператора</span></S.Title>
      
      <S.StatusIndicator $status={status}>
        {getStatusText()}
      </S.StatusIndicator>

      {isDemoMode && (
        <S.DemoBadge title="Сервер КТК недоступен: вход выполнен без проверки учётных данных, результаты не сохраняются и не аттестуются">
          <FlaskConical size={12} />
          Демо-режим — без аттестации
        </S.DemoBadge>
      )}

      <S.InfoPanel>
        <S.InfoItem>
          <User size={14} />
          Оператор: <strong>{username}</strong>
        </S.InfoItem>
        <S.InfoItem>
          <ClipboardList size={14} />
          Сценарий: <strong>{getScenarioTitle(scenarioId)}{getEmergencySuffix()}</strong>
        </S.InfoItem>
        <S.InfoItem>
          <Play size={14} />
          Сессия: <strong>{formatTime(timeElapsed)} / 05:00</strong>
        </S.InfoItem>
      </S.InfoPanel>

      <S.Actions>
        {role === 'operator' && status === 'running' && (
          <S.Button onClick={completeSession} $variant="success">
            <CheckCircle size={12} />
            Завершить
          </S.Button>
        )}
        <S.Button onClick={resetSession} $variant="primary">
          <RotateCcw size={12} />
          Сброс
        </S.Button>
        <S.Button onClick={triggerEsd} $variant="danger" disabled={status === 'esd'}>
          <ShieldAlert size={12} />
          Авария (ESD)
        </S.Button>
        <S.Button
          onClick={() => setIsQrModalOpen(true)}
          $variant="secondary"
          title="Открыть QR-код для прямого подключения жюри с мобильных устройств"
        >
          <QrCode size={12} />
          Демо QR
        </S.Button>
        <ThemeToggle />
        <S.Button onClick={logoutUser} $variant="secondary">
          Выход
        </S.Button>
      </S.Actions>

      <JuryQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </S.HeaderContainer>
  );
};

export default Header;
