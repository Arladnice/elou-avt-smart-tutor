import React, { useRef, useState } from 'react';
import { App } from 'antd';
import { useTheme } from 'styled-components';
import { Activity, Maximize2, TrendingUp, ZoomIn, ZoomOut } from 'lucide-react';
import { useSession } from '@/entities/session';
import { useSimulatorActions } from '@/entities/simulator';
import { useTelemetry, type PumpId, type ValveId } from '@/entities/telemetry';
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

const getPumpLabel = (pumpId: PumpId): string => `Н-${pumpId.slice(2)}`;

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

interface HorizontalLevelGaugeProps {
  x: number;
  y: number;
  width: number;
  level: number;
  isWarning: boolean;
  isDanger: boolean;
}

const LEVEL_GAUGE_TICKS = [0.2, 0.4, 0.6, 0.8];

const HorizontalLevelGauge: React.FC<HorizontalLevelGaugeProps> = ({
  x,
  y,
  width,
  level,
  isWarning,
  isDanger,
}) => {
  const normalizedLevel = Math.min(100, Math.max(0, level)) / 100;

  return (
    <S.LevelGauge $isWarning={isWarning} $isDanger={isDanger}>
      <rect className="level-gauge-frame" x={x} y={y} width={width} height="13" rx="3" />
      <rect className="level-gauge-fill" x={x + 4} y={y + 5} width={(width - 8) * normalizedLevel} height="5" rx="2" />
      {LEVEL_GAUGE_TICKS.map(tick => (
        <line
          key={tick}
          className="level-gauge-tick"
          x1={x + width * tick}
          y1={y + 2}
          x2={x + width * tick}
          y2={y + 5}
        />
      ))}
    </S.LevelGauge>
  );
};

const openEquipmentCardFromContextMenu = (
  event: React.MouseEvent<SVGGElement>,
  equipmentId: EquipmentId,
  onOpen: (equipmentId: EquipmentId) => void,
) => {
  event.preventDefault();
  event.stopPropagation();
  onOpen(equipmentId);
};

const openEquipmentCardFromKeyboard = (
  event: React.KeyboardEvent<SVGGElement>,
  equipmentId: EquipmentId,
  onOpen: (equipmentId: EquipmentId) => void,
) => {
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
  event.preventDefault();
  event.stopPropagation();
  onOpen(equipmentId);
};

interface PumpSymbolProps {
  x: number;
  y: number;
  tag: string;
  equipmentId: PumpId;
  direction?: 'left' | 'right';
  tagOffsetX?: number;
  tagOffsetY?: number;
  isRunning: boolean;
  isAlert: boolean;
  onOpen: (equipmentId: EquipmentId) => void;
  onToggle: (pumpId: PumpId) => void;
}

const PumpSymbol: React.FC<PumpSymbolProps> = ({
  x,
  y,
  tag,
  equipmentId,
  direction = 'right',
  tagOffsetX = 0,
  tagOffsetY = -42,
  isRunning,
  isAlert,
  onOpen,
  onToggle,
}) => {
  const glyphTransform = direction === 'left' ? 'scale(-1 1)' : undefined;
  return (
    <S.EquipmentGroup
      transform={`translate(${x}, ${y})`}
      data-scheme-interactive="true"
      role="button"
      tabIndex={0}
      aria-label={`Переключить насос ${tag}; правая кнопка открывает карточку оборудования`}
      $isAlert={isAlert}
      $isControllable
      $isRunning={isRunning}
      onClick={() => onToggle(equipmentId)}
      onContextMenu={event => openEquipmentCardFromContextMenu(event, equipmentId, onOpen)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle(equipmentId);
        }
        openEquipmentCardFromKeyboard(event, equipmentId, onOpen);
      }}
    >
      <rect className="equipment-hitbox" x="-40" y="-38" width="80" height="72" rx="8" />
      <ellipse className="equipment-shadow" cx="0" cy="31" rx="31" ry="5" />
      <g transform={glyphTransform}>
        <rect className="pump-state-part pump-base" x="-29" y="23" width="58" height="7" rx="1.5" />
        <path className="pump-state-part pump-support" d="M-20 23 L-15 11 H-7 L-9 23 Z M9 23 L7 11 H15 L20 23 Z" />
        <rect className="pump-state-part pump-inlet" x="-36" y="-9" width="17" height="18" rx="2" />
        <rect className="pump-state-part pump-flange" x="-40" y="-12" width="6" height="24" rx="1" />
        <rect className="pump-state-part pump-nozzle" x="18" y="-8" width="17" height="16" rx="2" />
        <rect className="pump-state-part pump-outlet-neck" x="-6" y="-28" width="15" height="13" rx="2" />
        <rect className="pump-state-part pump-outlet-flange" x="-11" y="-33" width="25" height="6" rx="1" />
        <path className="pump-state-part pump-body" d="M-20 14 C-30 4 -25 -15 -11 -20 C2 -25 18 -20 23 -8 C29 6 20 21 5 24 C-6 27 -15 22 -20 14 Z" />
        <circle className="pump-ring" cx="-3" cy="1" r="14" />
        <path className="pump-rotor" d="M-8 -8 C4 -9 11 -2 10 8 C4 3 -2 2 -10 6 C-12 1 -11 -5 -8 -8 Z" />
        <circle className="pump-hub" cx="-3" cy="1" r="4" />
        <circle className="pump-bolt" cx="-3" cy="-10" r="1.3" />
        <circle className="pump-bolt" cx="7" cy="-4" r="1.3" />
        <circle className="pump-bolt" cx="7" cy="7" r="1.3" />
        <circle className="pump-bolt" cx="-13" cy="7" r="1.3" />
        <circle className="pump-bolt" cx="-13" cy="-4" r="1.3" />
      </g>
      <text x={tagOffsetX} y={tagOffsetY} className="equipment-tag">{tag}</text>
    </S.EquipmentGroup>
  );
};

interface EquipmentAlertBadgeProps {
  transform: string;
}

const EquipmentAlertBadge: React.FC<EquipmentAlertBadgeProps> = ({ transform }) => (
  <g className="equipment-alert-badge" transform={transform} aria-hidden="true">
    <circle cx="0" cy="0" r="10" />
    <text x="0" y="5" textAnchor="middle">!</text>
  </g>
);

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
    aria-label={`Правая кнопка открывает карточку печи ${tag}`}
    $isAlert={isAlert}
    onContextMenu={event => openEquipmentCardFromContextMenu(event, equipmentId, onOpen)}
    onKeyDown={event => openEquipmentCardFromKeyboard(event, equipmentId, onOpen)}
  >
    <rect className="equipment-hitbox" x="-6" y="-25" width="102" height="108" rx="9" />
    <ellipse className="equipment-shadow" cx="45" cy="76" rx="46" ry="6" />
    <rect x="37" y="-19" width="16" height="11" rx="2" className="furnace-stack" />
    <rect x="33" y="-22" width="24" height="5" rx="1.5" className="furnace-stack-cap" />
    <rect x="7" y="67" width="76" height="7" rx="2" className="furnace-base" />
    <path d="M12 8 Q12 -5 45 -9 Q78 -5 78 8 V63 Q78 68 73 68 H17 Q12 68 12 63 Z" className="furnace-body" />
    <path d="M18 7 Q45 -5 72 7" className="furnace-rim" />
    <line x1="13" y1="18" x2="77" y2="18" className="furnace-band" />
    <line x1="13" y1="62" x2="77" y2="62" className="furnace-band" />
    <line x1="19" y1="20" x2="19" y2="61" className="furnace-rib" />
    <line x1="71" y1="20" x2="71" y2="61" className="furnace-rib" />
    <path d="M78 10 H87 V57 H78" className="furnace-side-pipe" />
    <circle cx="24" cy="14" r="1.2" className="equipment-rivet" />
    <circle cx="66" cy="14" r="1.2" className="equipment-rivet" />
    <circle cx="24" cy="57" r="1.2" className="equipment-rivet" />
    <circle cx="66" cy="57" r="1.2" className="equipment-rivet" />
    <rect x="27" y="28" width="36" height="34" rx="4" className="furnace-window" />
    <S.FlameWrapper $isActive={flameIsOn}>
      <path d="M45 58 C33 50 38 41 44 35 C44 43 50 44 51 50 C56 44 58 51 55 57 C52 62 47 63 45 58 Z" className="furnace-flame" />
    </S.FlameWrapper>
    <text x="45" y="25" className="equipment-tag">{tag}</text>
    {isAlert && <EquipmentAlertBadge transform="translate(84, -10)" />}
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
    aria-label={`Правая кнопка открывает карточку ёмкости ${tag}`}
    $isAlert={isAlert}
    onContextMenu={event => openEquipmentCardFromContextMenu(event, equipmentId, onOpen)}
    onKeyDown={event => openEquipmentCardFromKeyboard(event, equipmentId, onOpen)}
  >
    <rect className="equipment-hitbox" x="-6" y="-12" width="132" height="70" rx="25" />
    <ellipse className="equipment-shadow" cx="60" cy="54" rx="57" ry="5" />
    <rect x="23" y="44" width="9" height="10" rx="1" className="vessel-leg" />
    <rect x="88" y="44" width="9" height="10" rx="1" className="vessel-leg" />
    <path d="M23 4 H97 C109 4 118 13 118 24 C118 35 109 44 97 44 H23 C11 44 2 35 2 24 C2 13 11 4 23 4 Z" className="vessel-body" />
    <path d="M23 6 C15 11 12 17 12 24 C12 31 15 37 23 42" className="vessel-seam" />
    <path d="M97 6 C105 11 108 17 108 24 C108 31 105 37 97 42" className="vessel-seam" />
    <rect x="82" y="-3" width="11" height="7" rx="2" className="vessel-nozzle" />
    <rect x="80" y="-6" width="15" height="4" rx="1" className="vessel-nozzle-cap" />
    <rect x="25" y="44" width="5" height="10" className="vessel-leg-shade" />
    <rect x="90" y="44" width="5" height="10" className="vessel-leg-shade" />
    <text x="60" y="29" className="equipment-tag">{tag}</text>
    {isAlert && <EquipmentAlertBadge transform="translate(116, 0)" />}
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
    aria-label={`Правая кнопка открывает карточку колонны ${tag}`}
    $isAlert={isAlert}
    onContextMenu={event => openEquipmentCardFromContextMenu(event, equipmentId, onOpen)}
    onKeyDown={event => openEquipmentCardFromKeyboard(event, equipmentId, onOpen)}
  >
    <rect className="equipment-hitbox" x="5" y="-14" width="122" height="314" rx="42" />
    <ellipse className="equipment-shadow" cx="65" cy="294" rx="54" ry="7" />
    <rect x="54" y="-8" width="22" height="9" rx="2" className="column-nozzle" />
    <rect x="50" y="-11" width="30" height="5" rx="1.5" className="column-nozzle-cap" />
    <rect x="18" y="281" width="94" height="8" rx="2" className="column-base" />
    <path d="M22 26 Q22 3 65 0 Q108 3 108 26 V259 Q108 281 65 283 Q22 281 22 259 Z" className="column-body" />
    <path d="M29 22 Q65 4 101 22" className="column-cap" />
    <line x1="23" y1="52" x2="107" y2="52" className="column-band" />
    <line x1="23" y1="226" x2="107" y2="226" className="column-band" />
    <rect x="43" y="40" width="17" height="174" rx="6" className="column-level-frame" />
    <rect
      x="48"
      y={207 - (Math.min(100, Math.max(0, level)) / 100) * 160}
      width="7"
      height={(Math.min(100, Math.max(0, level)) / 100) * 160}
      rx="3"
      className="column-level-fill"
    />
    <line x1="61" y1="62" x2="66" y2="62" className="column-level-tick" />
    <line x1="61" y1="94" x2="66" y2="94" className="column-level-tick" />
    <line x1="61" y1="126" x2="66" y2="126" className="column-level-tick" />
    <line x1="61" y1="158" x2="66" y2="158" className="column-level-tick" />
    <line x1="61" y1="190" x2="66" y2="190" className="column-level-tick" />
    <path d="M108 35 H121 V201 H109" className="column-side-pipe" />
    <rect x="106" y="70" width="9" height="12" rx="2" className="column-side-nozzle" />
    <rect x="106" y="176" width="9" height="12" rx="2" className="column-side-nozzle" />
    <circle cx="29" cy="70" r="1.3" className="equipment-rivet" />
    <circle cx="101" cy="70" r="1.3" className="equipment-rivet" />
    <circle cx="29" cy="244" r="1.3" className="equipment-rivet" />
    <circle cx="101" cy="244" r="1.3" className="equipment-rivet" />
    <text x="78" y={tagOffsetY} className="column-tag">{tag}</text>
    {isAlert && <EquipmentAlertBadge transform="translate(119, 12)" />}
  </S.EquipmentGroup>
);

interface ValveSymbolProps {
  valveId: ValveId;
  equipmentId?: Extract<EquipmentId, 'V_1' | 'V_2' | 'V_3' | 'V_ELOU'>;
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
    <rect className="valve-state-part valve-flange" x="-18" y="-9" width="6" height="18" rx="1" />
    <rect className="valve-state-part valve-flange" x="12" y="-9" width="6" height="18" rx="1" />
    <path className="valve-state-part valve-body" d="M-12 -7 H-6 L0 -2 L6 -7 H12 V7 H6 L0 2 L-6 7 H-12 Z" />
    <rect className="valve-state-part valve-neck" x="-5" y="-13" width="10" height="8" rx="1" />
    <path className="valve-state-part valve-bonnet" d="M-7 -13 H7 L5 -18 H-5 Z" />
    <line className="valve-stem" x1="0" y1="-17" x2="0" y2="-25" />
    <ellipse className="valve-wheel" cx="0" cy="-27" rx="10" ry="3" />
    <circle className="valve-wheel-hub" cx="0" cy="-27" r="1.8" />
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
      if (equipmentId) openEquipmentCardFromKeyboard(event, equipmentId, onOpen);
    }}
    onContextMenu={event => {
      event.preventDefault();
      if (equipmentId) openEquipmentCardFromContextMenu(event, equipmentId, onOpen);
    }}
  >
    <rect className="valve-hitbox" x="-20" y="-32" width="40" height="44" />
    <ValveGlyph />
    {!hideLabel && (
      <text
        x={vertical ? -24 : 0}
        y={vertical ? -39 : -34}
        className="valve-tag"
        transform={vertical ? 'rotate(-90)' : undefined}
      >
        {label}
      </text>
    )}
  </S.ValveGroup>
);

const FlowScheme: React.FC = () => {
  const theme = useTheme();
  const { message } = App.useApp();
  const { sensors, valves, pumps, status, defects, telemetryHistory, wsLatency } = useTelemetry();
  const { isOnline } = useSession();
  const { toggleValve, togglePump } = useSimulatorActions();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<EquipmentId | null>(null);
  const [viewBox, setViewBox] = useState<SchemeViewBox>(DEFAULT_VIEW_BOX);
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; viewBox: SchemeViewBox } | null>(null);

  const sparklineWindow = telemetryHistory.slice(-15);
  const tempHistory = sparklineWindow.map(point => point.T_1);
  const tempP3History = sparklineWindow.map(point => point.T_3);
  const pressureHistory = sparklineWindow.map(point => point.P_1);
  const k2TempHistory = sparklineWindow.map(point => point.T_2);

  const handleValveClick = (valveId: ValveId) => {
    if (status === 'running') toggleValve(valveId);
  };

  const handlePumpClick = (pumpId: PumpId) => {
    if (status !== 'running') return;

    const isStarting = !pumps[pumpId];
    const isK2OutflowPump = pumpId === 'N_4' || pumpId === 'N_32';
    if (isStarting && defects.power_fail) {
      message.warning(`Пуск ${getPumpLabel(pumpId)} заблокирован: отсутствует электроснабжение.`);
      return;
    }
    if (isStarting && isK2OutflowPump && defects.k2_pump_fail) {
      message.warning(`Пуск ${getPumpLabel(pumpId)} заблокирован: активен отказ насосов К-2.`);
      return;
    }
    if (isStarting && isK2OutflowPump && sensors.L_2 <= K2_LEVEL_LOW_INTERLOCK) {
      message.warning(
        `Пуск ${getPumpLabel(pumpId)} заблокирован ПАЗ: уровень L-2 должен быть выше ${K2_LEVEL_LOW_INTERLOCK}%.`,
      );
      return;
    }

    togglePump(pumpId);
  };

  const powerFailed = defects.power_fail;
  const k1FeedActive = valves.V_1 && pumps.N_20 && !defects.pump_fail && !powerFailed;
  const k1ReliefActive = valves.V_2 && !defects.valve_jam;
  const k1LoopActive = valves.V_P3_OUT && valves.V_P3_RETURN && pumps.N_3 && !powerFailed;
  const k2FeedActive = valves.V_3 && valves.V_P1_IN && pumps.N_2 && !powerFailed;
  const k1BottomOutflowActive = k1LoopActive || k2FeedActive;
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
            <linearGradient id="scheme-panel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.colors.mnemonicPanelTop} />
              <stop offset="100%" stopColor={theme.colors.mnemonicPanelBottom} />
            </linearGradient>
            <linearGradient id="equipment-metal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={theme.colors.metalDark} />
              <stop offset="18%" stopColor={theme.colors.surfaceMuted} />
              <stop offset="48%" stopColor={theme.colors.metalMid} />
              <stop offset="72%" stopColor={theme.colors.metalLight} />
              <stop offset="100%" stopColor={theme.colors.metalDark} />
            </linearGradient>
            <linearGradient id="pump-running-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={theme.colors.valveOpenBorder} />
              <stop offset="32%" stopColor={theme.colors.valveOpen} />
              <stop offset="52%" stopColor={theme.colors.metalLight} />
              <stop offset="70%" stopColor={theme.colors.valveOpen} />
              <stop offset="100%" stopColor={theme.colors.valveOpenBorder} />
            </linearGradient>
            <linearGradient id="pump-stopped-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={theme.colors.valveClosedBorder} />
              <stop offset="32%" stopColor={theme.colors.valveClosed} />
              <stop offset="52%" stopColor={theme.colors.metalLight} />
              <stop offset="70%" stopColor={theme.colors.valveClosed} />
              <stop offset="100%" stopColor={theme.colors.valveClosedBorder} />
            </linearGradient>
            <linearGradient id="equipment-dark-metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.colors.metalDark} />
              <stop offset="50%" stopColor={theme.colors.levelDark} />
              <stop offset="100%" stopColor={theme.colors.metalMid} />
            </linearGradient>
            <linearGradient id="level-glass" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={theme.colors.levelCyan} />
              <stop offset="48%" stopColor={theme.colors.levelHighlight} />
              <stop offset="100%" stopColor={theme.colors.mnemonicFlow} />
            </linearGradient>
            <linearGradient id="flame-gradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={theme.colors.flameLow} />
              <stop offset="55%" stopColor={theme.colors.flameMid} />
              <stop offset="100%" stopColor={theme.colors.flameHigh} />
            </linearGradient>
            <pattern id="engineering-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" className="grid-line" />
            </pattern>
            <filter id="equipment-shadow" x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={theme.colors.mnemonicText} floodOpacity="0.35" />
            </filter>
            <marker id="flow-arrow" markerWidth="12" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L12,5 L0,10 Z" className="flow-arrow-head" />
            </marker>
            <marker id="raw-arrow" markerWidth="12" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L12,5 L0,10 Z" className="raw-arrow-head" />
            </marker>
            <marker id="demulsifier-arrow" markerWidth="12" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L12,5 L0,10 Z" className="demulsifier-arrow-head" />
            </marker>
            <marker id="fuel-arrow" markerWidth="12" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L12,5 L0,10 Z" className="fuel-arrow-head" />
            </marker>
            <marker id="steam-arrow" markerWidth="12" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L12,5 L0,10 Z" className="steam-arrow-head" />
            </marker>
            <marker id="drain-arrow" markerWidth="12" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L12,5 L0,10 Z" className="drain-arrow-head" />
            </marker>
            <marker id="gas-arrow" markerWidth="12" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L12,5 L0,10 Z" className="gas-arrow-head" />
            </marker>
            <marker id="cutoff-marker" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M2,2 L12,12 M12,2 L2,12" className="cutoff-marker-head" />
            </marker>
          </defs>

          <rect className="scheme-background" x="0" y="0" width={SCHEME_WIDTH} height={SCHEME_HEIGHT} />
          <rect className="scheme-grid" x="0" y="0" width={SCHEME_WIDTH} height={SCHEME_HEIGHT} />
          <rect className="process-zone" x="12" y="8" width="384" height="596" rx="3" />
          <rect className="process-zone" x="400" y="8" width="386" height="596" rx="3" />
          <rect className="process-zone" x="790" y="8" width="458" height="596" rx="3" />

          <text x="18" y="110" className="source-label">ЭЛОУ</text>
          <S.PipeLine d="M 60,104 H 120" />
          <PumpSymbol
            x={150}
            y={104}
            tag="Н-20"
            equipmentId="N_20"
            isRunning={pumps.N_20}
            isAlert={Boolean(defects.pump_fail || powerFailed)}
            onOpen={setSelectedEquipmentId}
            onToggle={handlePumpClick}
          />

          <S.DemulsifierLine d="M 82,28 V 94" $isActive={valves.V_ELOU} />
          <ValveSymbol
            valveId="V_ELOU"
            equipmentId="V_ELOU"
            transform="translate(82,64) rotate(90)"
            label="V-ELOU"
            isOpen={valves.V_ELOU}
            vertical
            hideLabel
            onToggle={handleValveClick}
            onOpen={setSelectedEquipmentId}
          />
          <text x="82" y="19" className="valve-tag">V-ELOU</text>
          <text x="216" y="34" className="utility-label">ДЕЭМУЛЬГАТОР</text>
          <text x="216" y="49" className="utility-label">В ЭЛОУ</text>

          <S.PipeLine d="M 180,104 H 250 V 190 H 410" $isActive={k1FeedActive} $isCutOff={!valves.V_1} />
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

          <S.GasLine d="M 475,70 H 620" $isActive={k1ReliefActive || undefined} />
          <S.GasLine d="M 475,120 V 28 H 585" $isActive={k1ReliefActive} />
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
          <S.UtilityLine $kind="drain" $isActive={valves.V_E1_DRAIN} x1="680" y1="93" x2="680" y2="142" />
          <ValveSymbol valveId="V_E1_DRAIN" transform="translate(680,118) rotate(90)" label="ДРЕН Е-1"
            isOpen={valves.V_E1_DRAIN} vertical hideLabel onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="704" y="132" className="utility-label">ДРЕН Е-1</text>
          <text x="704" y="151" className="utility-label">ДРЕНАЖ</text>

          <S.UtilityLine $kind="steam" $isActive={valves.V_STEAM_K1} x1="605" y1="235" x2="540" y2="235" />
          <ValveSymbol valveId="V_STEAM_K1" transform="translate(575,235)" label="ПАР К-1"
            isOpen={valves.V_STEAM_K1} onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="532" y="228" textAnchor="end" className="utility-label">ПАР</text>

          <S.PipeLine d="M 475,410 V 466" $isActive={k1BottomOutflowActive} />
          <S.PipeLine d="M 475,466 H 352" $isActive={k1LoopActive} />
          <PumpSymbol
            x={324}
            y={466}
            tag="Н-3"
            equipmentId="N_3"
            direction="left"
            isRunning={pumps.N_3}
            isAlert={powerFailed}
            onOpen={setSelectedEquipmentId}
            onToggle={handlePumpClick}
          />
          <S.PipeLine d="M 302,466 H 220" $isActive={k1LoopActive} $isCutOff={!valves.V_P3_OUT} />
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
          <S.PipeLine d="M 130,466 H 72 V 278 H 410" $isActive={k1LoopActive} $isCutOff={!valves.V_P3_RETURN} />
          <ValveSymbol valveId="V_P3_RETURN" transform="translate(290,278)" label="V-П3-2"
            isOpen={valves.V_P3_RETURN} onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <S.UtilityLine $kind="fuel" $isActive={valves.FUEL_P3} x1="175" y1="502" x2="175" y2="548" />
          <ValveSymbol valveId="FUEL_P3" transform="translate(175,525) rotate(90)" label="ТОПЛ. П-3"
            isOpen={valves.FUEL_P3} vertical hideLabel onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="215" y="536" className="utility-label">ТОПЛ. П-3</text>
          <text x="175" y="575" textAnchor="middle" className="utility-label">ТОПЛИВО</text>
          <S.UtilityLine $kind="steam" x1="130" y1="446" x2="92" y2="446" />
          <text x="48" y="440" className="utility-label">ПАР</text>

          <S.PipeLine d="M 475,466 H 555" $isActive={k2FeedActive} />
          <PumpSymbol
            x={583}
            y={466}
            tag="Н-2"
            equipmentId="N_2"
            isRunning={pumps.N_2}
            isAlert={powerFailed}
            onOpen={setSelectedEquipmentId}
            onToggle={handlePumpClick}
          />
          <S.PipeLine d="M 605,466 H 650" $isActive={k2FeedActive} $isCutOff={!valves.V_P1_IN} />
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
          <S.PipeLine d="M 740,466 H 820 V 250 H 900" $isActive={k2FeedActive} $isCutOff={!valves.V_3} />
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
          <S.UtilityLine $kind="fuel" $isActive={valves.FUEL_P1} x1="695" y1="502" x2="695" y2="548" />
          <ValveSymbol valveId="FUEL_P1" transform="translate(695,525) rotate(90)" label="ТОПЛ. П-1"
            isOpen={valves.FUEL_P1} vertical hideLabel onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="735" y="536" className="utility-label">ТОПЛ. П-1</text>
          <text x="695" y="575" textAnchor="middle" className="utility-label">ТОПЛИВО</text>
          <S.UtilityLine $kind="steam" x1="740" y1="446" x2="790" y2="446" />
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

          <S.GasLine d="M 965,92 H 1095" $isActive={valves.V_K2_RELIEF || undefined} />
          <S.GasLine d="M 965,160 V 28 H 1080" $isActive={valves.V_K2_RELIEF} />
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
          <S.UtilityLine $kind="drain" $isActive={valves.V_E2_DRAIN} x1="1155" y1="115" x2="1155" y2="164" />
          <ValveSymbol valveId="V_E2_DRAIN" transform="translate(1155,139) rotate(90)" label="ДРЕН Е-2"
            isOpen={valves.V_E2_DRAIN} vertical hideLabel onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="1180" y="154" className="utility-label">ДРЕН Е-2</text>
          <text x="1180" y="173" className="utility-label">ДРЕНАЖ</text>

          <S.UtilityLine $kind="steam" $isActive={valves.V_STEAM_K2} x1="1245" y1="265" x2="1008" y2="265" />
          <ValveSymbol valveId="V_STEAM_K2" transform="translate(1140,265)" label="ПАР К-2"
            isOpen={valves.V_STEAM_K2} hideLabel onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />
          <text x="1140" y="232" textAnchor="middle" className="utility-label">ОТПАРНОЙ ПАР К-2</text>

          <S.PipeLine d="M 965,450 V 492 H 1052" $isActive={k2Outflow32Active} />
          <PumpSymbol
            x={1080}
            y={492}
            tag="Н-32"
            equipmentId="N_32"
            tagOffsetY={-39}
            isRunning={pumps.N_32}
            isAlert={Boolean(defects.k2_pump_fail || powerFailed)}
            onOpen={setSelectedEquipmentId}
            onToggle={handlePumpClick}
          />
          <S.PipeLine d="M 1102,492 H 1245" $isActive={k2Outflow32Active} $isCutOff={!valves.V_K2_OUT_32} />
          <ValveSymbol valveId="V_K2_OUT_32" transform="translate(1180,492)" label="V-Н32"
            isOpen={valves.V_K2_OUT_32} onToggle={handleValveClick} onOpen={setSelectedEquipmentId} />

          <S.PipeLine d="M 965,492 V 566 H 1052" $isActive={k2Outflow4Active} />
          <PumpSymbol
            x={1080}
            y={566}
            tag="Н-4"
            equipmentId="N_4"
            tagOffsetY={-39}
            isRunning={pumps.N_4}
            isAlert={Boolean(defects.k2_pump_fail || powerFailed)}
            onOpen={setSelectedEquipmentId}
            onToggle={handlePumpClick}
          />
          <S.PipeLine d="M 1102,566 H 1245" $isActive={k2Outflow4Active} $isCutOff={!valves.V_K2_OUT_4} />
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
            <HorizontalLevelGauge
              x={-62}
              y={20}
              width={124}
              level={sensors.L_1}
              isWarning={sensors.L_1 > LEVEL_HIGH || sensors.L_1 < LEVEL_LOW}
              isDanger={sensors.L_1 > LEVEL_HIGH_CRITICAL || sensors.L_1 < LEVEL_LOW_CRITICAL}
            />
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
            <rect x="-42" y="20" width="84" height="12" className="sparkline-frame" />
            <S.SparklinePath d={generateSparklineD(tempP3History, -42, 20, 84, 12, 240, 380)} $strokeColor={sensors.T_3 > TEMP_WARNING ? theme.colors.warning : theme.colors.primary} />
          </g>

          <g transform="translate(1100,205)">
            <S.SensorBox $isWarning={sensors.P_vac > K2_PRESSURE_WARNING} $isDanger={sensors.P_vac >= K2_PRESSURE_CRITICAL}>
              <rect className="bg" x="-48" y="-10" width="96" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">{sensors.P_vac.toFixed(3)} МПа</text>
              <text className="label" x="0" y="-14" textAnchor="middle">P-vac · К-2</text>
            </S.SensorBox>
          </g>
          <g transform="translate(1100,335)">
            <S.SensorBox $isWarning={sensors.T_2 > K2_TEMP_WARNING} $isDanger={sensors.T_2 >= K2_TEMP_CRITICAL}>
              <rect className="bg" x="-42" y="-10" width="84" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">{sensors.T_2.toFixed(1)}°C</text>
              <text className="label" x="0" y="-14" textAnchor="middle">T-2 · К-2</text>
            </S.SensorBox>
            <rect x="-42" y="20" width="84" height="12" className="sparkline-frame" />
            <S.SparklinePath d={generateSparklineD(k2TempHistory, -42, 20, 84, 12, 180, 420)} $strokeColor={sensors.T_2 > K2_TEMP_WARNING ? theme.colors.warning : theme.colors.primary} />
          </g>
          <g transform="translate(1100,410)">
            <S.SensorBox $isWarning={sensors.L_2 > K2_LEVEL_HIGH || sensors.L_2 < K2_LEVEL_LOW} $isDanger={sensors.L_2 > K2_LEVEL_HIGH_CRITICAL || sensors.L_2 < K2_LEVEL_LOW_CRITICAL}>
              <rect className="bg" x="-62" y="-10" width="124" height="26" rx="4" />
              <text className="value" x="0" y="7" textAnchor="middle">
                {Math.round((sensors.L_2 / 100) * K2_LEVEL_FULL_SCALE_MM)} мм · {sensors.L_2.toFixed(1)}%
              </text>
              <text className="label" x="0" y="-14" textAnchor="middle">L-2 · К-2</text>
            </S.SensorBox>
            <HorizontalLevelGauge
              x={-62}
              y={20}
              width={124}
              level={sensors.L_2}
              isWarning={sensors.L_2 > K2_LEVEL_HIGH || sensors.L_2 < K2_LEVEL_LOW}
              isDanger={sensors.L_2 > K2_LEVEL_HIGH_CRITICAL || sensors.L_2 < K2_LEVEL_LOW_CRITICAL}
            />
          </g>
          </S.SVGCanvas>
          <S.ZoomHint>Колесо — масштаб · перетаскивание — перемещение</S.ZoomHint>
        </S.SchemeViewport>
      </S.SchemeContainer>
      <EquipmentDrawer equipmentId={selectedEquipmentId} onClose={() => setSelectedEquipmentId(null)} />
    </>
  );
};

export default FlowScheme;
