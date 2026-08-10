import React, { useMemo } from 'react';
import { PhoneCall } from 'lucide-react';
import { useTelemetry } from '@/entities/telemetry';
import { useSimulatorActions } from '@/entities/simulator';
import { getInterlockColumns } from '../model/InterlockPanel.config';
import * as S from './InterlockPanel.styles';

const InterlockPanel: React.FC = () => {
  const {
    interlocks,
    dutyEngineerPhone,
    interlockOperationAuthorized,
    status,
  } = useTelemetry();
  const { callDutyEngineer, toggleInterlockBypass } = useSimulatorActions();

  const columns = useMemo(
    () => getInterlockColumns({
      canOperate: interlockOperationAuthorized,
      disabled: status !== 'running',
      onToggle: toggleInterlockBypass,
    }),
    [interlockOperationAuthorized, status, toggleInterlockBypass],
  );

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
      <S.InterlockTable
        rowKey="tag"
        columns={columns}
        dataSource={interlocks}
        pagination={false}
        size="small"
        tableLayout="fixed"
        rowClassName={row => (row.primary ? 'primary-interlock' : '')}
      />
      <S.Note>
        Первые четыре позиции выделены как приоритетные для учебной отработки.
        Деблокировка фиксируется в журнале и не отменяет обязанность контролировать параметры процесса.
      </S.Note>
    </S.Panel>
  );
};

export default InterlockPanel;
