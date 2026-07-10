import React from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Slider, Switch } from 'antd';
import { Settings, Thermometer, Radio } from 'lucide-react';
import * as S from './ControlPanel.styles';

const ControlPanel: React.FC = () => {
  const { setpoints, valves, toggleValve, changeSetpoint, status } = useSimulator();
  const [localTemp, setLocalTemp] = React.useState(setpoints.furnaceTempSp);

  React.useEffect(() => {
    setLocalTemp(setpoints.furnaceTempSp);
  }, [setpoints.furnaceTempSp]);

  return (
    <S.PanelContainer 
      title={
        <>
          <Settings size={14} />
          Панель Управления Уставками
        </>
      }
      bordered={false}
    >
      {/* Управление температурой печи */}
      <S.ControlGroup>
        <S.Label>
          <Thermometer size={14} color="#ff4444" />
          Уставка Т-1 (Температура печи П-1):
        </S.Label>
        <S.SliderWrapper>
          <Slider
            min={240}
            max={340}
            value={localTemp}
            onChange={(v) => setLocalTemp(v)}
            onAfterChange={(v) => changeSetpoint(v)}
            disabled={status !== 'running'}
            tooltip={{ formatter: (v) => `${v}°C` }}
          />
        </S.SliderWrapper>
        <S.SliderLabels>
          <span>240°C</span>
          <strong>Текущая: {localTemp}°C</strong>
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
              checked={valves.V1}
              onChange={() => toggleValve('V1')}
              disabled={status !== 'running'}
              checkedChildren="ОТКР"
              unCheckedChildren="ЗАКР"
            />
          </S.SwitchRow>

          <S.SwitchRow>
            <S.SwitchLabel>Сброс давления колонны <strong>V-2</strong></S.SwitchLabel>
            <Switch
              checked={valves.V2}
              onChange={() => toggleValve('V2')}
              disabled={status !== 'running'}
              checkedChildren="ОТКР"
              unCheckedChildren="ЗАКР"
            />
          </S.SwitchRow>

          <S.SwitchRow>
            <S.SwitchLabel>Дренаж куба колонны <strong>V-3</strong></S.SwitchLabel>
            <Switch
              checked={valves.V3}
              onChange={() => toggleValve('V3')}
              disabled={status !== 'running'}
              checkedChildren="ОТКР"
              unCheckedChildren="ЗАКР"
            />
          </S.SwitchRow>
        </S.SwitchColumn>
      </S.ControlGroup>
    </S.PanelContainer>
  );
};

export default ControlPanel;
