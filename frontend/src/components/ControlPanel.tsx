import React from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Slider, Switch } from 'antd';
import { Thermometer, Radio, Minus, Plus } from 'lucide-react';
import * as S from './ControlPanel.styles';

const ControlPanel: React.FC = () => {
  const { setpoints, valves, toggleValve, changeSetpoint, status } = useSimulator();
  const [localTemp, setLocalTemp] = React.useState(setpoints.T_1_Sp);

  React.useEffect(() => {
    setLocalTemp(setpoints.T_1_Sp);
  }, [setpoints.T_1_Sp]);

  const handleStepTemp = (delta: number) => {
    if (status !== 'running') return;
    const newTemp = Math.min(340, Math.max(100, localTemp + delta));
    setLocalTemp(newTemp);
    changeSetpoint(newTemp);
  };

  return (
    <S.PanelContent>
      {/* Управление температурой печи */}
      <S.ControlGroup>
        <S.Label>
          <Thermometer size={14} color="#ff4444" />
          Уставка Т-1 (Температура печи П-1):
        </S.Label>
        <S.SliderRow>
          <S.TempButton
            disabled={status !== 'running' || localTemp <= 100}
            onClick={() => handleStepTemp(-1)}
            title="Уменьшить на 1°C"
          >
            <Minus size={14} /> -1°C
          </S.TempButton>
          <S.SliderWrapper>
            <Slider
              min={100}
              max={340}
              value={localTemp}
              onChange={(v) => setLocalTemp(v)}
              onAfterChange={(v) => changeSetpoint(v)}
              disabled={status !== 'running'}
              tooltip={{ formatter: (v) => `${v}°C` }}
            />
          </S.SliderWrapper>
          <S.TempButton
            disabled={status !== 'running' || localTemp >= 340}
            onClick={() => handleStepTemp(1)}
            title="Увеличить на 1°C"
          >
            <Plus size={14} /> +1°C
          </S.TempButton>
        </S.SliderRow>
        <S.SliderLabels>
          <span>100°C</span>
          <strong>Выбранная: {localTemp}°C</strong>
          <span>340°C</span>
        </S.SliderLabels>
      </S.ControlGroup>

      {/* Управление клапанами (Задвижками) */}
      <S.ControlGroup>
        <S.Label>
          <Radio size={14} color="#00e5ff" />
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

