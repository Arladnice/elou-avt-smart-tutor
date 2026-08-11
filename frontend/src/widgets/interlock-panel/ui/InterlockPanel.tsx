import React, { useMemo } from 'react';
import { Switch } from 'antd';
import { PhoneCall } from 'lucide-react';
import { useTelemetry } from '@/entities/telemetry';
import { useSimulatorActions } from '@/entities/simulator';
import * as S from './InterlockPanel.styles';

const getVisualState = (row: { paz_active: boolean; trip: boolean; signal: boolean }) => {
  if (row.paz_active) return 'paz';
  if (row.trip) return 'bypassed';
  if (row.signal) return 'signal';
  return 'normal';
};

const getStatusLabel = (state: ReturnType<typeof getVisualState>) => {
  if (state === 'paz') return 'ПАЗ активен';
  if (state === 'bypassed') return 'ПАЗ деблокирован';
  if (state === 'signal') return 'Сигнализация';
  return 'Норма';
};

const InterlockPanel: React.FC = () => {
  const {
    interlocks,
    dutyEngineerPhone,
    interlockOperationAuthorized,
    status,
  } = useTelemetry();
  const { callDutyEngineer, toggleInterlockBypass } = useSimulatorActions();

  const interlockCards = useMemo(() => interlocks.map(row => {
    const visualState = getVisualState(row);
    const canToggle = interlockOperationAuthorized && status === 'running';

    return (
      <S.InterlockCard key={row.tag} $state={visualState}>
        <S.CardHeader>
          <S.ObjectGroup>
            <S.ObjectName>{row.tag}</S.ObjectName>
            <S.StatusBadge $state={visualState}>{getStatusLabel(visualState)}</S.StatusBadge>
          </S.ObjectGroup>
          <S.BypassControl>
            <span>Деблокировка</span>
            <Switch
              size="small"
              checked={row.bypassed}
              disabled={!canToggle || (row.trip && !row.bypassed)}
              checkedChildren="Вкл"
              unCheckedChildren="—"
              onChange={state => toggleInterlockBypass(row.tag, state)}
            />
          </S.BypassControl>
        </S.CardHeader>
        <S.Sensors>
          <S.FactLabel>Датчики</S.FactLabel>
          <S.SensorValues>{row.sensors.join(' · ')}</S.SensorValues>
        </S.Sensors>
        <S.FactsGrid>
          <S.Fact>
            <S.FactLabel>Конфигурация</S.FactLabel>
            <S.FactValue>{row.logic}</S.FactValue>
          </S.Fact>
          <S.Fact>
            <S.FactLabel>Сигнализация</S.FactLabel>
            <S.FactValue>{row.signalization}</S.FactValue>
          </S.Fact>
          <S.Fact>
            <S.FactLabel>Авария</S.FactLabel>
            <S.FactValue>{row.trip_threshold}</S.FactValue>
          </S.Fact>
        </S.FactsGrid>
      </S.InterlockCard>
    );
  }), [interlocks, interlockOperationAuthorized, status, toggleInterlockBypass]);

  return (
    <S.Panel>
      <S.ContactBar>
        <S.ContactText>
          <strong>Дежурный инженер: тел. {dutyEngineerPhone}</strong>
          <span>Звонок обязателен перед каждой установкой или снятием деблокировки.</span>
        </S.ContactText>
        <S.CallButton
          size="small"
          icon={<PhoneCall size={14} />}
          disabled={status !== 'running'}
          onClick={callDutyEngineer}
        >
          Позвонить
        </S.CallButton>
      </S.ContactBar>
      <S.Authorization $active={interlockOperationAuthorized}>
        {interlockOperationAuthorized
          ? 'Разрешена одна операция деблокировки.'
          : 'Операции заблокированы до подтверждения звонка.'}
      </S.Authorization>
      <S.InterlockList>{interlockCards}</S.InterlockList>
      <S.Note>
        ПАЗ нельзя деблокировать при активном срабатывании. Звонок дежурному инженеру
        разрешает одну операцию установки или снятия деблокировки и фиксируется в журнале.
      </S.Note>
    </S.Panel>
  );
};

export default InterlockPanel;
