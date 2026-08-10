import React, { useRef, useState } from 'react';
import { useTheme } from 'styled-components';
import { Activity, Maximize2, TrendingUp, ZoomIn, ZoomOut } from 'lucide-react';
import { useSession } from '@/entities/session';
import { useSimulatorActions } from '@/entities/simulator';
import { useTelemetry, type ValveId } from '@/entities/telemetry';
import {
  K1_LEVEL_FULL_SCALE_MM,
  K2_LEVEL_FULL_SCALE_MM,
  K2_LEVEL_HIGH,
  K2_LEVEL_HIGH_CRITICAL,
  K2_LEVEL_LOW,
  K2_LEVEL_LOW_INTERLOCK,
  K2_LEVEL_LOW_CRITICAL,
  K2_PRESSURE_CRITICAL,
  K2_PRESSURE_WARNING,
  K2_TEMP_CRITICAL,
  K2_TEMP_WARNING,
  LEVEL_HIGH,
  LEVEL_HIGH_CRITICAL,
  LEVEL_LOW,
  LEVEL_LOW_CRITICAL,
  PRES_CRITICAL,
  PRES_WARNING,
  TEMP_CRITICAL,
  TEMP_WARNING,
} from '@/shared/config/thresholds';
import type { EquipmentId } from '../model/equipmentCatalog';
import EquipmentDrawer from './EquipmentDrawer';
import * as S from './FlowScheme.styles';

const SCHEME_WIDTH = 1260;
const SCHEME_HEIGHT = 620;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface SchemeViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_VIEW_BOX: SchemeViewBox = {
  x: 0,
  y: 0,
  width: SCHEME_WIDTH,
  height: SCHEME_HEIGHT,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const constrainViewBox = (viewBox: SchemeViewBox): SchemeViewBox => ({
  ...viewBox,
  x: clamp(viewBox.x, 0, SCHEME_WIDTH - viewBox.width),
  y: clamp(viewBox.y, 0, SCHEME_HEIGHT - viewBox.height),
});

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
      data-scheme-interactive="true"
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
      data-scheme-interactive="true"
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
  flameIsOn: boolean;
  isAlert: boolean;
  onOpen: (equipmentId: EquipmentId) => void;
}

const FurnaceSymbol: React.FC<FurnaceSymbolProps> = ({ x, y, tag, equipmentId, flameIsOn, isAlert, onOpen }) => (
  <S.EquipmentGroup
    transform={`translate(${x}, ${y})`}
    data-scheme-interactive="true"
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
    <text x="45" y="17" className="equipment-tag">{tag}</text>
    <text x="45" y="-10" textAnchor="middle" className="utility-label">ПЛАМЯ: {flameIsOn ? 'ЕСТЬ' : 'НЕТ'}</text>
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
    data-scheme-interactive="true"
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
  tagOffsetY?: number;
  onOpen: (equipmentId: EquipmentId) => void;
}

const ColumnSymbol: React.FC<ColumnSymbolProps> = ({ x, y, tag, equipmentId, level, isAlert, tagOffsetY = 145, onOpen }) => (
  <S.EquipmentGroup
    transform={`translate(${x}, ${y})`}
    data-scheme-interactive="true"
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
    <text x="65" y={tagOffsetY} className="column-tag">{tag}</text>
  </S.EquipmentGroup>
);

interface ValveSymbolProps {
  valveId: ValveId;
  equipmentId?: Extract<EquipmentId, 'V_1' | 'V_2' | 'V_3' | 'V_ELOU' | 'V_VT'>;
  transform: string;
  label: string;
  isOpen: boolean;
  vertical?: boolean;
  hideLabel?: boolean;
  onToggle: (valveId: ValveId) => void;
  onOpen: (equipmentId: EquipmentId) => void;
}

const ValveGlyph: React.FC = () => (
  <>
    <polygon points="-12,-9 0,0 -12,9" />
    <polygon points="12,-9 0,0 12,9" />
  </>
);

const ValveSymbol: React.FC<ValveSymbolProps> = ({
  valveId,
  equipmentId,
  transform,
  label,
  isOpen,
  vertical = false,
  hideLabel = false,
  onToggle,
  onOpen,
}) => (
  <S.ValveGroup
    $isOpen={isOpen}
    transform={transform}
    data-scheme-interactive="true"
    role="button"
    tabIndex={0}
    aria-label={`Переключить клапан ${label}`}
    onClick={() => onToggle(valveId)}
    onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onToggle(valveId);
      }
    }}
  >
    <rect className="valve-hitbox" x="-16" y="-13" width="32" height="26" />
    <ValveGlyph />
    {!hideLabel && (
      <text
        x={vertical ? -22 : 0}
        y={vertical ? -34 : -15}
        className="valve-tag"
        transform={vertical ? 'rotate(-90)' : undefined}
      >
        {label}
      </text>
    )}
    {equipmentId && (
      <EquipmentInfoMarker
        equipmentId={equipmentId}
        transform={vertical ? 'translate(15, 15) rotate(-90)' : 'translate(15, 15)'}
        onOpen={onOpen}
      />
    )}
  </S.ValveGroup>
);

const FlowScheme: React.FC = () => {
  const theme = useTheme();
  const { sensors, valves, pumps, status, defects, telemetryHistory, wsLatency } = useTelemetry();
  const { isOnline } = useSession();
  const { toggleValve } = useSimulatorActions();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<EquipmentId | null>(null);
  const [viewBox, setViewBox] = useState<SchemeViewBox>(DEFAULT_VIEW_BOX);
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; viewBox: SchemeViewBox } | null>(null);

  const sparklineWindow = telemetryHistory.slice(-15);
  const tempHistory = sparklineWindow.map(point => point.T_1);
  const pressureHistory = sparklineWindow.map(point => point.P_1);
  const k1LevelHistory = sparklineWindow.map(point => point.L_1);
  const k2LevelHistory = sparklineWindow.map(point => point.L_2);

  const handleValveClick = (valveId: ValveId) => {
    if (status === 'running') toggleValve(valveId);
  };

  const powerFailed = defects.power_fail;
  const k1FeedActive = valves.V_1 && pumps.N_20 && !defects.pump_fail && !powerFailed;
  const k1ReliefActive = valves.V_2 && !defects.valve_jam;
  const k1LoopActive = valves.V_P3_OUT && valves.V_P3_RETURN && pumps.N_3 && !powerFailed;
  const k2FeedActive = valves.V_3 && valves.V_P1_IN && pumps.N_2 && !powerFailed;
  const k2OutflowAvailable = !defects.k2_pump_fail && !powerFailed && sensors.L_2 > K2_LEVEL_LOW_INTERLOCK;
  const k2Outflow32Active = k2OutflowAvailable && valves.V_K2_OUT_32 && pumps.N_32;
  const k2Outflow4Active = k2OutflowAvailable && valves.V_K2_OUT_4 && pumps.N_4;
  const zoomPercent = Math.round((SCHEME_WIDTH / viewBox.width) * 100);

  const scaleViewBox = (scale: number, focusX = SCHEME_WIDTH / 2, focusY = SCHEME_HEIGHT / 2) => {
    setViewBox(current => {
      const currentZoom = SCHEME_WIDTH / current.width;
      const nextZoom = clamp(currentZoom * scale, MIN_ZOOM, MAX_ZOOM);
      const nextWidth = SCHEME_WIDTH / nextZoom;
      const nextHeight = SCHEME_HEIGHT / nextZoom;
      const focusRatioX = (focusX - current.x) / current.width;
      const focusRatioY = (focusY - current.y) / current.height;

      return constrainViewBox({
        x: focusX - focusRatioX * nextWidth,
        y: focusY - focusRatioY * nextHeight,
        width: nextWidth,
        height: nextHeight,
      });
    });
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const focusX = viewBox.x + ((event.clientX - bounds.left) / bounds.width) * viewBox.width;
    const focusY = viewBox.y + ((event.clientY - bounds.top) / bounds.height) * viewBox.height;
    scaleViewBox(event.deltaY < 0 ? 1.18 : 1 / 1.18, focusX, focusY);
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest('[data-scheme-interactive="true"]')) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { clientX: event.clientX, clientY: event.clientY, viewBox };
    setIsPanning(true);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragStart = dragStartRef.current;
    if (!dragStart) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const deltaX = ((event.clientX - dragStart.clientX) / bounds.width) * dragStart.viewBox.width;
    const deltaY = ((event.clientY - dragStart.clientY) / bounds.height) * dragStart.viewBox.height;
    setViewBox(constrainViewBox({ ...dragStart.viewBox, x: dragStart.viewBox.x - deltaX, y: dragStart.viewBox.y - deltaY }));
  };

  const stopPanning = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragStartRef.current && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
    setIsPanning(false);
  };

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

        <S.SchemeViewport>
          <S.SVGCanvas
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            role="img"
            aria-label="Технологическая схема ЭЛОУ, К-1, К-2, печей П-1 и П-3, ёмкостей Е-1 и Е-2, линий сброса газа"
            $isPanning={isPanning}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopPanning}
            onPointerCancel={stopPanning}
          >
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

          <S.PipeLine d="M 74,24 V 72" $isActive={valves.V_ELOU} />
          <S.PipeFlow d="M 74,24 V 72" $isActive={valves.V_ELOU} />
          <ValveSymbol
            valveId="V_ELOU"
            equipmentId="V_ELOU"
            transform="translate(74,48) rotate(90)"
            label="V-ELOU"
            isOpen={valves.V_ELOU}
            vertical
            hideLabel
            onToggle={handleValveClick}
            onOpen={setSelectedEquipmentId}
          />
          <text x="74" y="17" className="valve-tag">V-ELOU</text>
          <text x="148" y="16" className="utility-label">ДЕЭМУЛЬГАТОР</text>
          <text x="148" y="30" className="utility-label">В ЭЛОУ</text>

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
            isAlert={Boolean(defects.steam_fail || defects.valve_jam || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />

          <S.PipeLine d="M 475,120 V 70 H 620" />
          <S.PipeLine d="M 475,70 V 28 H 585" $isActive={k1ReliefActive} />
          <S.PipeFlow d="M 475,120 V 28 H 585" $isActive={k1ReliefActive} />
          <ValveSymbol
            valveId="V_2"
            equipmentId="V_2"
            transform="translate(475,48) rotate(90)"
            label="V-2"
            isOpen={valves.V_2}
            vertical
            onToggle={handleValveClick}
            onOpen={setSelectedEquipmentId}
          />
          <text x="505" y="18" className="gas-release-label">СБРОС ГАЗА</text>
          <VesselSymbol
            x={620}
            y={47}
            tag="Е-1"
            equipmentId="VESSEL_E_1"
            isAlert={Boolean(defects.valve_jam || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />
          <text x="750" y="108" className="utility-label">Ур. Е-1: {sensors.L_E1.toFixed(0)}%</text>
          <S.UtilityLine x1="680" y1="93" x2="680" y2="142" />
          <ValveSymbol valveId="V_E1_DRAIN" transform="translate(680,118) rotate(90)" label="ДРЕН Е-1"
            isOpen={valves.V_E1_DRAIN} vertical hideLabel onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="694" y="123" className="utility-label">ДРЕН Е-1</text>
          <text x="694" y="142" className="utility-label">ДРЕНАЖ</text>

          <S.UtilityLine x1="605" y1="235" x2="540" y2="235" />
          <ValveSymbol valveId="V_STEAM_K1" transform="translate(575,235)" label="ПАР К-1"
            isOpen={valves.V_STEAM_K1} onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="610" y="228" className="utility-label">ПАР</text>

          <S.PipeLine d="M 475,410 V 466 H 352" $isActive={k1LoopActive} />
          <S.PipeFlow d="M 475,410 V 466 H 352" $isActive={k1LoopActive} $speed="1s" />
          <PumpSymbol
            x={324}
            y={466}
            tag="Н-3"
            equipmentId="N_3"
            direction="left"
            isAlert={powerFailed}
            onOpen={setSelectedEquipmentId}
          />
          <S.PipeLine d="M 302,466 H 220" $isActive={k1LoopActive} />
          <S.PipeFlow d="M 302,466 H 220" $isActive={k1LoopActive} $speed="1s" />
          <ValveSymbol valveId="V_P3_OUT" transform="translate(258,466)" label="V-П3-1"
            isOpen={valves.V_P3_OUT} onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <FurnaceSymbol
            x={130}
            y={430}
            tag="П-3"
            equipmentId="P_3"
            flameIsOn={sensors.Flame_P3}
            isAlert={powerFailed}
            onOpen={setSelectedEquipmentId}
          />
          <S.PipeLine d="M 130,466 H 72 V 278 H 410" $isActive={k1LoopActive} />
          <S.PipeFlow d="M 130,466 H 72 V 278 H 410" $isActive={k1LoopActive} $speed="1s" />
          <ValveSymbol valveId="V_P3_RETURN" transform="translate(290,278)" label="V-П3-2"
            isOpen={valves.V_P3_RETURN} onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <S.UtilityLine x1="175" y1="502" x2="175" y2="548" />
          <ValveSymbol valveId="FUEL_P3" transform="translate(175,525) rotate(90)" label="ТОПЛ. П-3"
            isOpen={valves.FUEL_P3} vertical hideLabel onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="205" y="530" className="utility-label">ТОПЛ. П-3</text>
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
          <ValveSymbol valveId="V_P1_IN" transform="translate(625,466)" label="V-П1"
            isOpen={valves.V_P1_IN} onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <FurnaceSymbol
            x={650}
            y={430}
            tag="П-1"
            equipmentId="P_1"
            flameIsOn={sensors.Flame_P1}
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
          <ValveSymbol valveId="FUEL_P1" transform="translate(695,525) rotate(90)" label="ТОПЛ. П-1"
            isOpen={valves.FUEL_P1} vertical hideLabel onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="725" y="530" className="utility-label">ТОПЛ. П-1</text>
          <text x="662" y="570" className="utility-label">ТОПЛИВО</text>
          <S.UtilityLine x1="740" y1="446" x2="790" y2="446" />
          <text x="798" y="440" className="utility-label">ПАР</text>

          <ColumnSymbol
            x={900}
            y={160}
            tag="К-2"
            equipmentId="K_2"
            level={sensors.L_2}
            isAlert={Boolean(defects.vt_vacuum_loss || defects.k2_pump_fail || defects.steam_fail || powerFailed)}
            tagOffsetY={112}
            onOpen={setSelectedEquipmentId}
          />

          <S.PipeLine d="M 965,160 V 92 H 1095" />
          <S.PipeLine d="M 965,92 V 28 H 1080" />
          <ValveSymbol valveId="V_K2_RELIEF" transform="translate(965,56) rotate(90)" label="СБРОС К-2"
            isOpen={valves.V_K2_RELIEF} vertical onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="995" y="18" className="gas-release-label">СБРОС ГАЗА</text>
          <VesselSymbol
            x={1095}
            y={69}
            tag="Е-2"
            equipmentId="VESSEL_E_2"
            isAlert={Boolean(defects.vt_vacuum_loss || powerFailed)}
            onOpen={setSelectedEquipmentId}
          />
          <text x="1240" y="130" textAnchor="end" className="utility-label">Ур. Е-2: {sensors.L_E2.toFixed(0)}%</text>
          <S.PipeLine d="M 1155,115 V 164" $isActive={valves.V_E2_DRAIN} />
          <ValveSymbol valveId="V_E2_DRAIN" transform="translate(1155,139) rotate(90)" label="ДРЕН Е-2"
            isOpen={valves.V_E2_DRAIN} vertical hideLabel onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="1168" y="144" className="utility-label">ДРЕН Е-2</text>
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

          <S.UtilityLine x1="1030" y1="300" x2="900" y2="300" />
          <ValveSymbol valveId="V_STEAM_K2" transform="translate(1040,300)" label="ПАР К-2"
            isOpen={valves.V_STEAM_K2} hideLabel onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="1040" y="278" textAnchor="middle" className="utility-label">ПАР К-2</text>

          <S.PipeLine d="M 965,450 V 492 H 1052" $isActive={k2Outflow32Active} />
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
          <S.PipeLine d="M 1102,492 H 1245" $isActive={k2Outflow32Active} />
          <S.PipeFlow d="M 1102,492 H 1245" $isActive={k2Outflow32Active} />
          <ValveSymbol valveId="V_K2_OUT_32" transform="translate(1180,492)" label="V-Н32"
            isOpen={valves.V_K2_OUT_32} onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />

          <S.PipeLine d="M 965,492 V 566 H 1052" $isActive={k2Outflow4Active} />
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
          <S.PipeLine d="M 1102,566 H 1245" $isActive={k2Outflow4Active} />
          <S.PipeFlow d="M 1102,566 H 1245" $isActive={k2Outflow4Active} />
          <ValveSymbol valveId="V_K2_OUT_4" transform="translate(1180,566)" label="V-Н4"
            isOpen={valves.V_K2_OUT_4} onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />

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
            <S.SensorBox $isWarning={sensors.P_1 > PRES_WARNING} $isDanger={sensors.P_1 > PRES_CRITICAL}>
              <rect className="bg" x="-42" y="-10" width="84" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">{sensors.P_1} МПа</text>
              <text className="label" x="0" y="-14" textAnchor="middle">P-1 · К-1</text>
            </S.SensorBox>
            <rect x="-42" y="20" width="84" height="12" className="sparkline-frame" />
            <S.SparklinePath d={generateSparklineD(pressureHistory, -42, 20, 84, 12, 0.05, 0.5)} $strokeColor={sensors.P_1 > PRES_WARNING ? theme.colors.warning : theme.colors.primary} />
          </g>
          <g transform="translate(615,330)">
            <S.SensorBox $isWarning={sensors.L_1 > LEVEL_HIGH || sensors.L_1 < LEVEL_LOW} $isDanger={sensors.L_1 > LEVEL_HIGH_CRITICAL || sensors.L_1 < LEVEL_LOW_CRITICAL}>
              <rect className="bg" x="-62" y="-10" width="124" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">
                {Math.round((sensors.L_1 / 100) * K1_LEVEL_FULL_SCALE_MM)} мм · {sensors.L_1}%
              </text>
              <text className="label" x="0" y="-14" textAnchor="middle">L-1 · К-1</text>
            </S.SensorBox>
            <rect x="-62" y="20" width="124" height="12" className="sparkline-frame" />
            <S.SparklinePath d={generateSparklineD(k1LevelHistory, -62, 20, 124, 12, 0, 100)} $strokeColor={(sensors.L_1 > LEVEL_HIGH || sensors.L_1 < LEVEL_LOW) ? theme.colors.warning : theme.colors.primary} />
          </g>
          <g transform="translate(695,390)">
            <S.SensorBox $isWarning={sensors.T_1 > TEMP_WARNING} $isDanger={sensors.T_1 > TEMP_CRITICAL}>
              <rect className="bg" x="-42" y="-10" width="84" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">{sensors.T_1}°C</text>
              <text className="label" x="0" y="-14" textAnchor="middle">T-1 · П-1</text>
            </S.SensorBox>
            <rect x="-42" y="20" width="84" height="12" className="sparkline-frame" />
            <S.SparklinePath d={generateSparklineD(tempHistory, -42, 20, 84, 12, 240, 380)} $strokeColor={sensors.T_1 > TEMP_WARNING ? theme.colors.warning : theme.colors.primary} />
          </g>
          <g transform="translate(175,390)">
            <S.SensorBox $isWarning={sensors.T_3 > TEMP_WARNING} $isDanger={sensors.T_3 > TEMP_CRITICAL}>
              <rect className="bg" x="-42" y="-10" width="84" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">{sensors.T_3}°C</text>
              <text className="label" x="0" y="-14" textAnchor="middle">T-3 · П-3</text>
            </S.SensorBox>
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
            <S.SensorBox $isWarning={sensors.L_2 > K2_LEVEL_HIGH || sensors.L_2 < K2_LEVEL_LOW} $isDanger={sensors.L_2 > K2_LEVEL_HIGH_CRITICAL || sensors.L_2 < K2_LEVEL_LOW_CRITICAL}>
              <rect className="bg" x="-62" y="-10" width="124" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">
                {Math.round((sensors.L_2 / 100) * K2_LEVEL_FULL_SCALE_MM)} мм · {sensors.L_2.toFixed(1)}%
              </text>
              <text className="label" x="0" y="-14" textAnchor="middle">L-2 · К-2</text>
            </S.SensorBox>
            <rect x="-62" y="20" width="124" height="12" className="sparkline-frame" />
            <S.SparklinePath d={generateSparklineD(k2LevelHistory, -62, 20, 124, 12, 0, 100)} $strokeColor={(sensors.L_2 > K2_LEVEL_HIGH || sensors.L_2 < K2_LEVEL_LOW) ? theme.colors.warning : theme.colors.primary} />
          </g>
          </S.SVGCanvas>
          <S.ZoomControls aria-label="Управление масштабом мнемосхемы">
            <S.ZoomButton type="button" title="Уменьшить масштаб" aria-label="Уменьшить масштаб" onClick={() => scaleViewBox(1 / 1.25)} disabled={zoomPercent <= 100}>
              <ZoomOut size={15} />
            </S.ZoomButton>
            <S.ZoomValue aria-live="polite">{zoomPercent}%</S.ZoomValue>
            <S.ZoomButton type="button" title="Увеличить масштаб" aria-label="Увеличить масштаб" onClick={() => scaleViewBox(1.25)} disabled={zoomPercent >= MAX_ZOOM * 100}>
              <ZoomIn size={15} />
            </S.ZoomButton>
            <S.ZoomButton type="button" title="Показать всю схему" aria-label="Показать всю схему" onClick={() => setViewBox(DEFAULT_VIEW_BOX)}>
              <Maximize2 size={14} />
            </S.ZoomButton>
          </S.ZoomControls>
          <S.ZoomHint>Колесо — масштаб · перетаскивание — перемещение</S.ZoomHint>
        </S.SchemeViewport>
      </S.SchemeContainer>
      <EquipmentDrawer equipmentId={selectedEquipmentId} onClose={() => setSelectedEquipmentId(null)} />
    </>
  );
};

export default FlowScheme;
