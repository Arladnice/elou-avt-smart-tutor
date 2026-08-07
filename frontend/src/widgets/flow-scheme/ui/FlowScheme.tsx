import React, { useState } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { useSession } from '@/entities/session';
import { useSimulatorActions } from '@/entities/simulator';
import { useTelemetry, type ValveId } from '@/entities/telemetry';
import {
  K1_LEVEL_FULL_SCALE_MM,
  K2_LEVEL_FULL_SCALE_MM,
  K2_LEVEL_HIGH,
  K2_LEVEL_LOW,
  K2_LEVEL_LOW_CRITICAL,
  K2_PRESSURE_CRITICAL,
  K2_PRESSURE_WARNING,
  K2_TEMP_CRITICAL,
  K2_TEMP_WARNING,
} from '@/shared/config/thresholds';
import type { EquipmentId } from '../model/equipmentCatalog';
import EquipmentDrawer from './EquipmentDrawer';
import * as S from './FlowScheme.styles';

const generateSparklineD = (
  history: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
) => {
  if (history.length < 2) return '';
  const points = history.map((value, index) => {
    const pointX = x + (index / (history.length - 1)) * width;
    const range = maxValue - minValue;
    const normalized = range > 0 ? (value - minValue) / range : 0.5;
    const pointY = y + height - Math.max(0, Math.min(1, normalized)) * height;
    return `${pointX},${pointY}`;
  });
  return `M ${points.join(' L ')}`;
};

interface EquipmentInfoMarkerProps {
  equipmentId: EquipmentId;
  transform: string;
  onOpen: (equipmentId: EquipmentId) => void;
}

const EquipmentInfoMarker: React.FC<EquipmentInfoMarkerProps> = ({ equipmentId, transform, onOpen }) => {
  const openCard = (event: React.MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    onOpen(equipmentId);
  };

  const openCardFromKeyboard = (event: React.KeyboardEvent<SVGGElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    onOpen(equipmentId);
  };

  return (
    <S.EquipmentInfoGroup
      transform={transform}
      role="button"
      tabIndex={0}
      aria-label={`Открыть карточку ${equipmentId.replaceAll('_', '-')}`}
      onClick={openCard}
      onKeyDown={openCardFromKeyboard}
    >
      <circle cx="0" cy="0" r="6" />
      <text x="0" y="2.7" textAnchor="middle">i</text>
    </S.EquipmentInfoGroup>
  );
};

interface PumpSymbolProps {
  x: number;
  y: number;
  tag: string;
  equipmentId: EquipmentId;
  direction?: 'left' | 'right';
  tagOffsetX?: number;
  tagOffsetY?: number;
  isAlert: boolean;
  onOpen: (equipmentId: EquipmentId) => void;
}

const PumpSymbol: React.FC<PumpSymbolProps> = ({
  x,
  y,
  tag,
  equipmentId,
  direction = 'right',
  tagOffsetX = 0,
  tagOffsetY = -31,
  isAlert,
  onOpen,
}) => {
  const triangle = direction === 'left' ? '9,-8 9,8 -9,0' : '-9,-8 -9,8 9,0';
  return (
    <S.EquipmentGroup
      transform={`translate(${x}, ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`Открыть карточку насоса ${tag}`}
      $isAlert={isAlert}
      onClick={() => onOpen(equipmentId)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') onOpen(equipmentId);
      }}
    >
      <circle className="equipment-hitbox" cx="0" cy="0" r="28" />
      <circle cx="0" cy="0" r="22" className="pump-body" />
      <polygon points={triangle} className="pump-rotor" />
      <text x={tagOffsetX} y={tagOffsetY} className="equipment-tag">{tag}</text>
    </S.EquipmentGroup>
  );
};

interface FurnaceSymbolProps {
  x: number;
  y: number;
  tag: 'П-1' | 'П-3';
  equipmentId: Extract<EquipmentId, 'P_1' | 'P_3'>;
  isAlert: boolean;
  onOpen: (equipmentId: EquipmentId) => void;
}

const FurnaceSymbol: React.FC<FurnaceSymbolProps> = ({ x, y, tag, equipmentId, isAlert, onOpen }) => (
  <S.EquipmentGroup
    transform={`translate(${x}, ${y})`}
    role="button"
    tabIndex={0}
    aria-label={`Открыть карточку печи ${tag}`}
    $isAlert={isAlert}
    onClick={() => onOpen(equipmentId)}
    onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') onOpen(equipmentId);
    }}
  >
    <rect className="equipment-hitbox" x="-5" y="-5" width="100" height="82" rx="8" />
    <rect x="0" y="0" width="90" height="72" rx="7" className="furnace-body" />
    <path d="M18 57 L30 32 L42 54 L55 25 L70 58" className="furnace-coil" />
    <text x="45" y="-10" className="equipment-tag">{tag}</text>
  </S.EquipmentGroup>
);

interface VesselSymbolProps {
  x: number;
  y: number;
  tag: 'Е-1' | 'Е-2';
  equipmentId: Extract<EquipmentId, 'VESSEL_E_1' | 'VESSEL_E_2'>;
  isAlert: boolean;
  onOpen: (equipmentId: EquipmentId) => void;
}

const VesselSymbol: React.FC<VesselSymbolProps> = ({ x, y, tag, equipmentId, isAlert, onOpen }) => (
  <S.EquipmentGroup
    transform={`translate(${x}, ${y})`}
    role="button"
    tabIndex={0}
    aria-label={`Открыть карточку ёмкости ${tag}`}
    $isAlert={isAlert}
    onClick={() => onOpen(equipmentId)}
    onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') onOpen(equipmentId);
    }}
  >
    <rect className="equipment-hitbox" x="-5" y="-5" width="130" height="56" rx="25" />
    <rect x="0" y="0" width="120" height="46" rx="23" className="vessel-body" />
    <text x="60" y="28" className="equipment-tag">{tag}</text>
  </S.EquipmentGroup>
);

interface ColumnSymbolProps {
  x: number;
  y: number;
  tag: 'К-1' | 'К-2';
  equipmentId: Extract<EquipmentId, 'K_1' | 'K_2'>;
  level: number;
  isAlert: boolean;
  onOpen: (equipmentId: EquipmentId) => void;
}

const ColumnSymbol: React.FC<ColumnSymbolProps> = ({ x, y, tag, equipmentId, level, isAlert, onOpen }) => (
  <S.EquipmentGroup
    transform={`translate(${x}, ${y})`}
    role="button"
    tabIndex={0}
    aria-label={`Открыть карточку колонны ${tag}`}
    $isAlert={isAlert}
    onClick={() => onOpen(equipmentId)}
    onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') onOpen(equipmentId);
    }}
  >
    <rect className="equipment-hitbox" x="-5" y="-5" width="140" height="300" rx="48" />
    <rect x="0" y="0" width="130" height="290" rx="46" className="column-body" />
    <line x1="18" y1="62" x2="112" y2="62" className="column-tray" />
    <line x1="18" y1="214" x2="112" y2="214" className="column-tray" />
    <rect x="20" y="226" width="90" height="42" rx="4" className="level-frame" />
    <rect x="20" y={226 + (42 - (level / 100) * 42)} width="90" height={(level / 100) * 42} rx="4" className="level-fill" />
    <text x="65" y="145" className="column-tag">{tag}</text>
  </S.EquipmentGroup>
);

interface ValveSymbolProps {
  valveId: ValveId;
  equipmentId: Extract<EquipmentId, 'V_1' | 'V_2' | 'V_3' | 'V_ELOU' | 'V_VT'>;
  transform: string;
  label: string;
  isOpen: boolean;
  vertical?: boolean;
  onToggle: (valveId: ValveId) => void;
  onOpen: (equipmentId: EquipmentId) => void;
}

const ValveSymbol: React.FC<ValveSymbolProps> = ({
  valveId,
  equipmentId,
  transform,
  label,
  isOpen,
  vertical = false,
  onToggle,
  onOpen,
}) => (
  <S.ValveGroup $isOpen={isOpen} transform={transform} onClick={() => onToggle(valveId)}>
    <polygon points="-12,-9 0,0 -12,9 12,-9 0,0 12,9" />
    <circle cx="0" cy="0" r="3" />
    <text
      x={vertical ? 17 : 0}
      y="-15"
      className="valve-tag"
      transform={vertical ? 'rotate(-90)' : undefined}
    >
      {label}
    </text>
    <EquipmentInfoMarker equipmentId={equipmentId} transform="translate(15, 15)" onOpen={onOpen} />
  </S.ValveGroup>
);

const FlowScheme: React.FC = () => {
  const { sensors, valves, status, defects, telemetryHistory, wsLatency } = useTelemetry();
  const { isOnline } = useSession();
  const { toggleValve } = useSimulatorActions();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<EquipmentId | null>(null);

  const sparklineWindow = telemetryHistory.slice(-15);
  const tempHistory = sparklineWindow.map(point => point.T_1);
  const pressureHistory = sparklineWindow.map(point => point.P_1);
  const k1LevelHistory = sparklineWindow.map(point => point.L_1);
  const k2LevelHistory = sparklineWindow.map(point => point.L_2);

  const handleValveClick = (valveId: ValveId) => {
    if (status === 'running') toggleValve(valveId);
  };

  const powerFailed = defects.power_fail;
  const k1FeedActive = valves.V_1 && !defects.pump_fail && !powerFailed;
  const k1LoopActive = !powerFailed;
  const k2FeedActive = valves.V_3 && !powerFailed;
  const k2OutflowActive = !defects.k2_pump_fail && !powerFailed;

  return (
    <>
      <S.SchemeContainer>
        <S.SchemeHeader>
          <S.HeaderTitleContainer>
            <Activity size={14} />
            Технологическая мнемосхема ЭЛОУ-АВТ-6
          </S.HeaderTitleContainer>
          <S.HeaderStatusContainer>
            <TrendingUp size={12} />
            <span>Телеметрия 1 с</span>
            <S.OnlineBadge $isOnline={isOnline}>
              {isOnline ? `Online · ${wsLatency} мс` : 'Автономный режим'}
            </S.OnlineBadge>
          </S.HeaderStatusContainer>
        </S.SchemeHeader>

        <S.SVGCanvas viewBox="0 0 1260 620" role="img" aria-label="Технологическая схема ЭЛОУ, К-1, К-2, печей П-1 и П-3, ёмкостей Е-1 и Е-2">
          <defs>
            <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L8,4 L0,8 Z" className="flow-arrow-head" />
            </marker>
          </defs>

          <text x="18" y="78" className="source-label">ЭЛОУ</text>
          <S.PipeLine d="M 68,72 H 88" $isActive />
          <S.PipeFlow d="M 68,72 H 88" $isActive />
          <PumpSymbol
            x={116}
            y={72}
            tag="Н-20"
            equipmentId="N_20"
            isAlert={Boolean(defects.pump_fail || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />

          <S.PipeLine d="M 138,72 H 250 V 190 H 410" $isActive={k1FeedActive} />
          <S.PipeFlow d="M 138,72 H 250 V 190 H 410" $isActive={k1FeedActive} />
          <ValveSymbol
            valveId="V_1"
            equipmentId="V_1"
            transform="translate(310,190)"
            label="V-1"
            isOpen={valves.V_1}
            onToggle={handleValveClick}
            onOpen={setSelectedEquipmentId}
          />

          <ColumnSymbol
            x={410}
            y={120}
            tag="К-1"
            equipmentId="K_1"
            level={sensors.L_1}
            isAlert={Boolean(defects.steam_fail || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />

          <S.PipeLine d="M 475,120 V 70 H 620" $isActive />
          <S.PipeFlow d="M 475,120 V 70 H 620" $isActive />
          <S.StaticValveGroup transform="translate(570,70)">
            <polygon points="-12,-9 0,0 -12,9 12,-9 0,0 12,9" />
          </S.StaticValveGroup>
          <VesselSymbol
            x={620}
            y={47}
            tag="Е-1"
            equipmentId="VESSEL_E_1"
            isAlert={Boolean(defects.valve_jam || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />
          <S.PipeLine d="M 680,93 V 142" $isActive={valves.V_2} />
          <S.PipeFlow d="M 680,93 V 142" $isActive={valves.V_2} />
          <ValveSymbol
            valveId="V_2"
            equipmentId="V_2"
            transform="translate(680,118) rotate(90)"
            label="V-2"
            isOpen={valves.V_2}
            vertical
            onToggle={handleValveClick}
            onOpen={setSelectedEquipmentId}
          />
          <text x="694" y="142" className="utility-label">ДРЕНАЖ</text>

          <S.UtilityLine x1="605" y1="235" x2="540" y2="235" />
          <S.StaticValveGroup transform="translate(575,235)">
            <polygon points="-11,-8 0,0 -11,8 11,-8 0,0 11,8" />
          </S.StaticValveGroup>
          <text x="610" y="228" className="utility-label">ПАР</text>

          <S.PipeLine d="M 475,410 V 466 H 352" $isActive={k1LoopActive} />
          <S.PipeFlow d="M 475,410 V 466 H 352" $isActive={k1LoopActive} $speed="1s" />
          <PumpSymbol
            x={324}
            y={466}
            tag="Н-3"
            equipmentId="N_3"
            direction="left"
            isAlert={Boolean(defects.pump_fail || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />
          <S.PipeLine d="M 302,466 H 220" $isActive={k1LoopActive} />
          <S.PipeFlow d="M 302,466 H 220" $isActive={k1LoopActive} $speed="1s" />
          <S.StaticValveGroup transform="translate(258,466)">
            <polygon points="-12,-9 0,0 -12,9 12,-9 0,0 12,9" />
          </S.StaticValveGroup>
          <FurnaceSymbol
            x={130}
            y={430}
            tag="П-3"
            equipmentId="P_3"
            isAlert={Boolean(defects.coil_overheat || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />
          <S.PipeLine d="M 130,466 H 72 V 278 H 410" $isActive={k1LoopActive} />
          <S.PipeFlow d="M 130,466 H 72 V 278 H 410" $isActive={k1LoopActive} $speed="1s" />
          <S.StaticValveGroup transform="translate(290,278)">
            <polygon points="-12,-9 0,0 -12,9 12,-9 0,0 12,9" />
          </S.StaticValveGroup>
          <S.UtilityLine x1="175" y1="502" x2="175" y2="548" />
          <S.StaticValveGroup transform="translate(175,525) rotate(90)">
            <polygon points="-11,-8 0,0 -11,8 11,-8 0,0 11,8" />
          </S.StaticValveGroup>
          <text x="142" y="570" className="utility-label">ТОПЛИВО</text>
          <S.UtilityLine x1="130" y1="446" x2="92" y2="446" />
          <text x="48" y="440" className="utility-label">ПАР</text>

          <S.PipeLine d="M 475,466 H 555" $isActive={k2FeedActive} />
          <S.PipeFlow d="M 475,466 H 555" $isActive={k2FeedActive} />
          <PumpSymbol
            x={583}
            y={466}
            tag="Н-2"
            equipmentId="N_2"
            isAlert={powerFailed}
            onOpen={setSelectedEquipmentId}
          />
          <S.PipeLine d="M 605,466 H 650" $isActive={k2FeedActive} />
          <S.PipeFlow d="M 605,466 H 650" $isActive={k2FeedActive} />
          <FurnaceSymbol
            x={650}
            y={430}
            tag="П-1"
            equipmentId="P_1"
            isAlert={Boolean(defects.coil_overheat || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />
          <S.PipeLine d="M 740,466 H 820 V 250 H 900" $isActive={k2FeedActive} />
          <S.PipeFlow d="M 740,466 H 820 V 250 H 900" $isActive={k2FeedActive} />
          <ValveSymbol
            valveId="V_3"
            equipmentId="V_3"
            transform="translate(820,345) rotate(90)"
            label="V-3"
            isOpen={valves.V_3}
            vertical
            onToggle={handleValveClick}
            onOpen={setSelectedEquipmentId}
          />
          <S.UtilityLine x1="695" y1="502" x2="695" y2="548" />
          <S.StaticValveGroup transform="translate(695,525) rotate(90)">
            <polygon points="-11,-8 0,0 -11,8 11,-8 0,0 11,8" />
          </S.StaticValveGroup>
          <text x="662" y="570" className="utility-label">ТОПЛИВО</text>
          <S.UtilityLine x1="740" y1="446" x2="790" y2="446" />
          <S.StaticValveGroup transform="translate(765,446)">
            <polygon points="-11,-8 0,0 -11,8 11,-8 0,0 11,8" />
          </S.StaticValveGroup>
          <text x="798" y="440" className="utility-label">ПАР</text>

          <ColumnSymbol
            x={900}
            y={160}
            tag="К-2"
            equipmentId="K_2"
            level={sensors.L_2}
            isAlert={Boolean(defects.vt_vacuum_loss || defects.k2_pump_fail || defects.steam_fail || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />

          <S.PipeLine d="M 965,160 V 92 H 1095" $isActive={valves.V_VT} />
          <S.PipeFlow d="M 965,160 V 92 H 1095" $isActive={valves.V_VT} />
          <VesselSymbol
            x={1095}
            y={69}
            tag="Е-2"
            equipmentId="VESSEL_E_2"
            isAlert={Boolean(defects.vt_vacuum_loss || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />
          <S.PipeLine d="M 1155,115 V 164" $isActive={valves.V_VT} />
          <S.StaticValveGroup transform="translate(1155,139) rotate(90)">
            <polygon points="-11,-8 0,0 -11,8 11,-8 0,0 11,8" />
          </S.StaticValveGroup>
          <text x="1168" y="164" className="utility-label">ДРЕНАЖ</text>

          <S.UtilityLine x1="1245" y1="265" x2="1030" y2="265" />
          <ValveSymbol
            valveId="V_VT"
            equipmentId="V_VT"
            transform="translate(1140,265)"
            label="V-VT · ПАР"
            isOpen={valves.V_VT}
            onToggle={handleValveClick}
            onOpen={setSelectedEquipmentId}
          />

          <S.PipeLine d="M 965,450 V 492 H 1052" $isActive={k2OutflowActive} />
          <PumpSymbol
            x={1080}
            y={492}
            tag="Н-32"
            equipmentId="N_32"
            tagOffsetX={38}
            tagOffsetY={-20}
            isAlert={Boolean(defects.k2_pump_fail || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />
          <S.PipeLine d="M 1102,492 H 1245" $isActive={k2OutflowActive} />
          <S.PipeFlow d="M 1102,492 H 1245" $isActive={k2OutflowActive} />
          <S.StaticValveGroup transform="translate(1180,492)">
            <polygon points="-12,-9 0,0 -12,9 12,-9 0,0 12,9" />
          </S.StaticValveGroup>

          <S.PipeLine d="M 965,492 V 566 H 1052" $isActive={k2OutflowActive} />
          <PumpSymbol
            x={1080}
            y={566}
            tag="Н-4"
            equipmentId="N_4"
            tagOffsetX={36}
            tagOffsetY={-20}
            isAlert={Boolean(defects.k2_pump_fail || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />
          <S.PipeLine d="M 1102,566 H 1245" $isActive={k2OutflowActive} />
          <S.PipeFlow d="M 1102,566 H 1245" $isActive={k2OutflowActive} />
          <S.StaticValveGroup transform="translate(1180,566)">
            <polygon points="-12,-9 0,0 -12,9 12,-9 0,0 12,9" />
          </S.StaticValveGroup>

          <g transform="translate(92,170)">
            <S.SensorBox $isWarning={sensors.Sal_1 > 10} $isDanger={sensors.Sal_1 > 25}>
              <rect className="bg" x="-38" y="-10" width="76" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">{sensors.Sal_1} мг/л</text>
              <text className="label" x="0" y="-14" textAnchor="middle">Sal-1</text>
            </S.SensorBox>
          </g>
          <g transform="translate(180,170)">
            <S.SensorBox $isWarning={sensors.W_1 > 0.5} $isDanger={sensors.W_1 > 1.5}>
              <rect className="bg" x="-34" y="-10" width="68" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">{sensors.W_1}%</text>
              <text className="label" x="0" y="-14" textAnchor="middle">W-1</text>
            </S.SensorBox>
          </g>

          <g transform="translate(585,190)">
            <S.SensorBox $isWarning={sensors.P_1 > 0.3} $isDanger={sensors.P_1 > 0.4}>
              <rect className="bg" x="-42" y="-10" width="84" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">{sensors.P_1} МПа</text>
              <text className="label" x="0" y="-14" textAnchor="middle">P-1 · К-1</text>
            </S.SensorBox>
            <rect x="-42" y="20" width="84" height="12" className="sparkline-frame" />
            <S.SparklinePath d={generateSparklineD(pressureHistory, -42, 20, 84, 12, 0.05, 0.5)} $strokeColor={sensors.P_1 > 0.3 ? '#ffcc00' : '#00ff66'} />
          </g>
          <g transform="translate(585,330)">
            <S.SensorBox $isWarning={sensors.L_1 > 85 || sensors.L_1 < 15} $isDanger={sensors.L_1 > 95 || sensors.L_1 < 5}>
              <rect className="bg" x="-62" y="-10" width="124" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">
                {Math.round((sensors.L_1 / 100) * K1_LEVEL_FULL_SCALE_MM)} мм · {sensors.L_1}%
              </text>
              <text className="label" x="0" y="-14" textAnchor="middle">L-1 · К-1</text>
            </S.SensorBox>
            <rect x="-62" y="20" width="124" height="12" className="sparkline-frame" />
            <S.SparklinePath d={generateSparklineD(k1LevelHistory, -62, 20, 124, 12, 0, 100)} $strokeColor={(sensors.L_1 > 85 || sensors.L_1 < 15) ? '#ffcc00' : '#00ff66'} />
          </g>
          <g transform="translate(695,390)">
            <S.SensorBox $isWarning={sensors.T_1 > 310} $isDanger={sensors.T_1 > 325}>
              <rect className="bg" x="-42" y="-10" width="84" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">{sensors.T_1}°C</text>
              <text className="label" x="0" y="-14" textAnchor="middle">T-1 · П-1</text>
            </S.SensorBox>
            <rect x="-42" y="20" width="84" height="12" className="sparkline-frame" />
            <S.SparklinePath d={generateSparklineD(tempHistory, -42, 20, 84, 12, 240, 340)} $strokeColor={sensors.T_1 > 310 ? '#ff3333' : '#00ff66'} />
          </g>

          <g transform="translate(1160,205)">
            <S.SensorBox $isWarning={sensors.P_vac > K2_PRESSURE_WARNING} $isDanger={sensors.P_vac >= K2_PRESSURE_CRITICAL}>
              <rect className="bg" x="-48" y="-10" width="96" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">{sensors.P_vac.toFixed(3)} МПа</text>
              <text className="label" x="0" y="-14" textAnchor="middle">P-vac · К-2</text>
            </S.SensorBox>
          </g>
          <g transform="translate(1160,335)">
            <S.SensorBox $isWarning={sensors.T_2 > K2_TEMP_WARNING} $isDanger={sensors.T_2 >= K2_TEMP_CRITICAL}>
              <rect className="bg" x="-42" y="-10" width="84" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">{sensors.T_2.toFixed(1)}°C</text>
              <text className="label" x="0" y="-14" textAnchor="middle">T-2 · К-2</text>
            </S.SensorBox>
          </g>
          <g transform="translate(1160,410)">
            <S.SensorBox $isWarning={sensors.L_2 > K2_LEVEL_HIGH || sensors.L_2 < K2_LEVEL_LOW} $isDanger={sensors.L_2 < K2_LEVEL_LOW_CRITICAL}>
              <rect className="bg" x="-62" y="-10" width="124" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">
                {Math.round((sensors.L_2 / 100) * K2_LEVEL_FULL_SCALE_MM)} мм · {sensors.L_2.toFixed(1)}%
              </text>
              <text className="label" x="0" y="-14" textAnchor="middle">L-2 · К-2</text>
            </S.SensorBox>
            <rect x="-62" y="20" width="124" height="12" className="sparkline-frame" />
            <S.SparklinePath d={generateSparklineD(k2LevelHistory, -62, 20, 124, 12, 0, 100)} $strokeColor={(sensors.L_2 > K2_LEVEL_HIGH || sensors.L_2 < K2_LEVEL_LOW) ? '#ffcc00' : '#aa00ff'} />
          </g>
        </S.SVGCanvas>
      </S.SchemeContainer>
      <EquipmentDrawer equipmentId={selectedEquipmentId} onClose={() => setSelectedEquipmentId(null)} />
    </>
  );
};

export default FlowScheme;
