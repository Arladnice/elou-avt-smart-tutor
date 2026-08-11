import React from 'react';
import { useTelemetry, type PumpId, type ValveId } from '@/entities/telemetry';
import { useSimulatorActions } from '@/entities/simulator';
import { Slider, Switch } from 'antd';
import { Thermometer, Radio, Minus, Plus } from 'lucide-react';
import * as S from './ControlPanel.styles';

const PUMP_LABELS: Array<[PumpId, string]> = [
  ['N_20', 'Н-20'], ['N_2', 'Н-2'], ['N_3', 'Н-3'], ['N_4', 'Н-4'], ['N_32', 'Н-32'],
];

const PROCESS_VALVES: Array<[ValveId, string]> = [
  ['FUEL_P1', 'Топливо П-1'], ['FUEL_P3', 'Топливо П-3'],
  ['V_STEAM_K1', 'Пар К-1'], ['V_STEAM_K2', 'Пар К-2'],
  ['V_K2_RELIEF', 'Газовый сброс К-2'], ['V_E1_DRAIN', 'Дренаж Е-1'],
  ['V_E2_DRAIN', 'Дренаж Е-2'],
];

const ControlPanel: React.FC = () => {
  const { setpoints, valves, pumps, status, trainingAcceleration } = useTelemetry();
  const { toggleValve, togglePump, changeSetpoint, changeFeedRate } = useSimulatorActions();
  const [localTemps, setLocalTemps] = React.useState({ P1: setpoints.T_1_Sp, P3: setpoints.T_3_Sp });
  const [localFeedRate, setLocalFeedRate] = React.useState(setpoints.F_in_Sp);

  React.useEffect(() => {
    setLocalTemps({ P1: setpoints.T_1_Sp, P3: setpoints.T_3_Sp });
  }, [setpoints.T_1_Sp, setpoints.T_3_Sp]);

  React.useEffect(() => {
    setLocalFeedRate(setpoints.F_in_Sp);
  }, [setpoints.F_in_Sp]);

  const handleStepTemp = (furnace: 'P1' | 'P3', delta: number) => {
    if (status !== 'running') return;
    const newTemp = Math.min(340, Math.max(100, localTemps[furnace] + delta));
    setLocalTemps(prev => ({ ...prev, [furnace]: newTemp }));
    changeSetpoint(furnace === 'P1' ? 'T_1_Sp' : 'T_3_Sp', newTemp);
  };

  const renderFurnaceSetpoint = (furnace: 'P1' | 'P3', label: string) => {
    const value = localTemps[furnace];
    const setpointName = furnace === 'P1' ? 'T_1_Sp' : 'T_3_Sp';
    return (
      <S.ControlGroup>
        <S.Label><Thermometer size={14} color="#ff4444" />{label}</S.Label>
        <S.SliderRow>
          <S.TempButton disabled={status !== 'running' || value <= 100} onClick={() => handleStepTemp(furnace, -1)}>
            <Minus size={14} /> -1°C
          </S.TempButton>
          <S.SliderWrapper>
            <Slider min={100} max={340} value={value}
              onChange={(next) => setLocalTemps(prev => ({ ...prev, [furnace]: next }))}
              onChangeComplete={(next) => changeSetpoint(setpointName, next)}
              disabled={status !== 'running'} tooltip={{ formatter: (next) => `${next}°C` }} />
          </S.SliderWrapper>
          <S.TempButton disabled={status !== 'running' || value >= 340} onClick={() => handleStepTemp(furnace, 1)}>
            <Plus size={14} /> +1°C
          </S.TempButton>
        </S.SliderRow>
        <S.SliderLabels><span>100°C</span><strong>Выбранная: {value}°C</strong><span>340°C</span></S.SliderLabels>
      </S.ControlGroup>
    );
  };

  return (
    <S.PanelContent>
      <S.TrainingNotice>
        <strong>Учебное ускорение включено:</strong>{' '}
        {Object.entries(trainingAcceleration).map(([name, factor]) => `${name} ×${factor}`).join(' · ')}.
        Физические пороги ПАЗ не изменены.
      </S.TrainingNotice>
      {renderFurnaceSetpoint('P1', 'Уставка температуры печи П-1:')}
      {renderFurnaceSetpoint('P3', 'Уставка температуры печи П-3:')}

      <S.ControlGroup>
        <S.Label><Radio size={14} />Расход сырья Н-20: {localFeedRate}%</S.Label>
        <Slider min={0} max={100} step={5} value={localFeedRate}
          onChange={setLocalFeedRate} onChangeComplete={changeFeedRate} disabled={status !== 'running'}
          tooltip={{ formatter: value => `${value}%` }} />
      </S.ControlGroup>

      <S.ControlGroup>
        <S.Label><Radio size={14} />Горячая циркуляция:</S.Label>
        <S.SwitchColumn>
          {(['HC_P1', 'HC_P3'] as const).map((valveId) => (
            <S.SwitchRow key={valveId}>
              <S.SwitchLabel>{valveId === 'HC_P1' ? 'Печь П-1' : 'Печь П-3'}</S.SwitchLabel>
              <Switch checked={valves[valveId]} onChange={() => toggleValve(valveId)}
                disabled={status !== 'running'} checkedChildren="ВКЛ" unCheckedChildren="ВЫКЛ" />
            </S.SwitchRow>
          ))}
        </S.SwitchColumn>
      </S.ControlGroup>

      <S.ControlGroup>
        <S.Label><Radio size={14} />Команды насосов:</S.Label>
        <S.SwitchGrid>
          {PUMP_LABELS.map(([pumpId, label]) => (
            <S.SwitchRow key={pumpId}>
              <S.SwitchLabel>{label}</S.SwitchLabel>
              <Switch checked={pumps[pumpId]} onChange={() => togglePump(pumpId)}
                disabled={status !== 'running'} checkedChildren="ПУСК" unCheckedChildren="СТОП" />
            </S.SwitchRow>
          ))}
        </S.SwitchGrid>
      </S.ControlGroup>

      <S.ControlGroup>
        <S.Label><Radio size={14} />Топливо, пар и технологические дренажи:</S.Label>
        <S.SwitchGrid>
          {PROCESS_VALVES.map(([valveId, label]) => (
            <S.SwitchRow key={valveId}>
              <S.SwitchLabel>{label}</S.SwitchLabel>
              <Switch checked={valves[valveId]} onChange={() => toggleValve(valveId)}
                disabled={status !== 'running'} checkedChildren="ОТКР" unCheckedChildren="ЗАКР" />
            </S.SwitchRow>
          ))}
        </S.SwitchGrid>
      </S.ControlGroup>

      {/* Управление клапанами (Задвижками) */}
      <S.ControlGroup>
        <S.Label>
          <Radio size={14} />
          Дистанционные задвижки (Клапаны):
        </S.Label>
        <S.SwitchColumn>
          <S.SwitchRow>
            <S.SwitchLabel>Вход печи <strong>V-1</strong></S.SwitchLabel>
            <Switch
              checked={valves.V_1}
              onChange={() => toggleValve('V_1')}
              disabled={status !== 'running'}
              checkedChildren="ОТКР"
              unCheckedChildren="ЗАКР"
            />
          </S.SwitchRow>

          <S.SwitchRow>
            <S.SwitchLabel>Сброс давления колонны <strong>V-2</strong></S.SwitchLabel>
            <Switch
              checked={valves.V_2}
              onChange={() => toggleValve('V_2')}
              disabled={status !== 'running'}
              checkedChildren="ОТКР"
              unCheckedChildren="ЗАКР"
            />
          </S.SwitchRow>

          <S.SwitchRow>
            <S.SwitchLabel>Дренаж куба колонны <strong>V-3</strong></S.SwitchLabel>
            <Switch
              checked={valves.V_3}
              onChange={() => toggleValve('V_3')}
              disabled={status !== 'running'}
              checkedChildren="ОТКР"
              unCheckedChildren="ЗАКР"
            />
          </S.SwitchRow>
        </S.SwitchColumn>
      </S.ControlGroup>
    </S.PanelContent>
  );
};

export default ControlPanel;

