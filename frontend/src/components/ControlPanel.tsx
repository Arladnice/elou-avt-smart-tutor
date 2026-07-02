import React from 'react';
import styled from 'styled-components';
import { useSimulator } from '../context/SimulatorContext';
import { Slider, Switch, Card } from 'antd';
import { Settings, Thermometer, Radio } from 'lucide-react';

const PanelContainer = styled(Card)`
  background-color: ${props => props.theme.colors.surface} !important;
  border-color: ${props => props.theme.colors.border} !important;
  color: ${props => props.theme.colors.text} !important;
  border-radius: 6px !important;
  overflow: hidden;

  .ant-card-head {
    border-bottom: 1px solid ${props => props.theme.colors.border} !important;
    padding: 0 16px !important;
    min-height: 40px !important;
  }

  .ant-card-head-title {
    color: ${props => props.theme.colors.textMuted} !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0 !important;
  }

  .ant-card-body {
    padding: 16px !important;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const SwitchRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${props => props.theme.colors.background};
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
`;

const SwitchLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.theme.colors.textMuted};

  strong {
    color: ${props => props.theme.colors.text};
  }
`;

const ControlPanel: React.FC = () => {
  const { setpoints, valves, toggleValve, changeSetpoint, status } = useSimulator();

  const handleTempChange = (value: number) => {
    changeSetpoint(value);
  };

  return (
    <PanelContainer 
      title={
        <>
          <Settings size={14} />
          Панель Управления Уставками
        </>
      }
      bordered={false}
    >
      {/* Управление температурой печи */}
      <ControlGroup>
        <Label>
          <Thermometer size={14} color="#ff4444" />
          Уставка Т-1 (Температура печи П-1):
        </Label>
        <div style={{ padding: '0 8px' }}>
          <Slider
            min={240}
            max={340}
            value={setpoints.furnaceTempSp}
            onChange={handleTempChange}
            disabled={status !== 'running'}
            tooltip={{ formatter: (v) => `${v}°C` }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7c8ba1' }}>
          <span>240°C</span>
          <strong>Текущая: {setpoints.furnaceTempSp}°C</strong>
          <span>340°C</span>
        </div>
      </ControlGroup>

      {/* Управление клапанами (Задвижками) */}
      <ControlGroup>
        <Label>
          <Radio size={14} color="#00e5ff" />
          Дистанционные задвижки (Клапаны):
        </Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SwitchRow>
            <SwitchLabel>Вход печи <strong>V-1</strong></SwitchLabel>
            <Switch
              checked={valves.V1}
              onChange={() => toggleValve('V1')}
              disabled={status !== 'running'}
              checkedChildren="ОТКР"
              unCheckedChildren="ЗАКР"
            />
          </SwitchRow>

          <SwitchRow>
            <SwitchLabel>Сброс давления колонны <strong>V-2</strong></SwitchLabel>
            <Switch
              checked={valves.V2}
              onChange={() => toggleValve('V2')}
              disabled={status !== 'running'}
              checkedChildren="ОТКР"
              unCheckedChildren="ЗАКР"
            />
          </SwitchRow>

          <SwitchRow>
            <SwitchLabel>Дренаж куба колонны <strong>V-3</strong></SwitchLabel>
            <Switch
              checked={valves.V3}
              onChange={() => toggleValve('V3')}
              disabled={status !== 'running'}
              checkedChildren="ОТКР"
              unCheckedChildren="ЗАКР"
            />
          </SwitchRow>
        </div>
      </ControlGroup>
    </PanelContainer>
  );
};

export default ControlPanel;
