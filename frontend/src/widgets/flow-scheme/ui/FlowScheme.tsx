import React, { useRef, useState } from 'react';
import { App, Button, Select, Tooltip } from 'antd';
import { useTheme } from 'styled-components';
import { Activity, Maximize2, TrendingUp, ZoomIn, ZoomOut, Sliders } from 'lucide-react';
import { useSession } from '@/entities/session';
import { useSimulatorActions } from '@/entities/simulator';
import { useTelemetry, type PumpId, type ValveId } from '@/entities/telemetry';
import {
  useMnemoscheme,
  PumpSymbol,
  FurnaceSymbol,
  ColumnSymbol,
  VesselSymbol,
  ValveSymbol,
  SensorSymbol,
  PipelineSymbol,
} from '@/entities/mnemoscheme';
import {
  K2_LEVEL_LOW_INTERLOCK,
  PRES_CRITICAL,
  PRES_WARNING,
  LEVEL_HIGH,
  LEVEL_HIGH_CRITICAL,
  LEVEL_LOW,
  LEVEL_LOW_CRITICAL,
  TEMP_CRITICAL,
  TEMP_WARNING,
  K2_PRESSURE_CRITICAL,
  K2_PRESSURE_WARNING,
  K2_TEMP_CRITICAL,
  K2_TEMP_WARNING,
} from '@/shared/config/thresholds';
import type { EquipmentId } from '../model/equipmentCatalog';
import EquipmentDrawer from './EquipmentDrawer';
import * as S from './FlowScheme.styles';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const getPumpLabel = (pumpId: PumpId): string => `Н-${pumpId.slice(2)}`;

interface SchemeViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const FlowScheme: React.FC = () => {
  const theme = useTheme();
  const { message } = App.useApp();
  const { sensors, valves, pumps, status, defects, telemetryHistory, wsLatency } = useTelemetry();
  const { isOnline } = useSession();
  const { toggleValve, togglePump } = useSimulatorActions();
  const { activeScheme, presets, activePresetId, selectPreset, openBuilder } = useMnemoscheme();

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<EquipmentId | null>(null);

  const schemeWidth = activeScheme.width || 1260;
  const schemeHeight = activeScheme.height || 620;

  const defaultViewBox: SchemeViewBox = {
    x: 0,
    y: 0,
    width: schemeWidth,
    height: schemeHeight,
  };

  const [viewBox, setViewBox] = useState<SchemeViewBox>(defaultViewBox);
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; viewBox: SchemeViewBox } | null>(null);

  const constrainViewBox = (vb: SchemeViewBox): SchemeViewBox => ({
    ...vb,
    x: clamp(vb.x, 0, schemeWidth - vb.width),
    y: clamp(vb.y, 0, schemeHeight - vb.height),
  });

  const sparklineWindow = telemetryHistory.slice(-15);
  const tempP1History = sparklineWindow.map(point => point.T_1);
  const tempP3History = sparklineWindow.map(point => point.T_3);
  const pressureHistory = sparklineWindow.map(point => point.P_1);
  const k2TempHistory = sparklineWindow.map(point => point.T_2);

  const getSensorHistory = (sensorKey: string) => {
    if (sensorKey === 'T_1') return tempP1History;
    if (sensorKey === 'T_3') return tempP3History;
    if (sensorKey === 'P_1') return pressureHistory;
    if (sensorKey === 'T_2') return k2TempHistory;
    return [];
  };

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

  const isPipeFlowActive = (binding?: string) => {
    if (!binding) return false;
    if (binding === 'k1Feed') return k1FeedActive;
    if (binding === 'k1Relief') return k1ReliefActive;
    if (binding === 'k1Loop') return k1LoopActive;
    if (binding === 'k2Feed') return k2FeedActive;
    if (binding === 'k1BottomOutflow') return k1BottomOutflowActive;
    if (binding === 'k2Outflow32') return k2Outflow32Active;
    if (binding === 'k2Outflow4') return k2Outflow4Active;
    if (binding === 'demulsifier') return valves.V_ELOU;
    if (binding === 'e1Drain') return valves.V_E1_DRAIN;
    if (binding === 'e2Drain') return valves.V_E2_DRAIN;
    if (binding === 'steamK1') return valves.V_STEAM_K1;
    if (binding === 'steamK2') return valves.V_STEAM_K2;
    if (binding === 'fuelP1') return valves.FUEL_P1;
    if (binding === 'fuelP3') return valves.FUEL_P3;
    return false;
  };

  const zoomPercent = Math.round((schemeWidth / viewBox.width) * 100);

  const scaleViewBox = (scale: number, focusX = schemeWidth / 2, focusY = schemeHeight / 2) => {
    setViewBox(current => {
      const currentZoom = schemeWidth / current.width;
      const nextZoom = clamp(currentZoom * scale, MIN_ZOOM, MAX_ZOOM);
      const nextWidth = schemeWidth / nextZoom;
      const nextHeight = schemeHeight / nextZoom;
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

  const getSensorThresholdState = (sensorKey: string, val: number) => {
    if (sensorKey === 'Sal_1') return { isWarning: val > 10, isDanger: val > 25 };
    if (sensorKey === 'W_1') return { isWarning: val > 0.5, isDanger: val > 1.5 };
    if (sensorKey === 'P_1') return { isWarning: val > PRES_WARNING, isDanger: val > PRES_CRITICAL };
    if (sensorKey === 'L_1') {
      return {
        isWarning: val > LEVEL_HIGH || val < LEVEL_LOW,
        isDanger: val > LEVEL_HIGH_CRITICAL || val < LEVEL_LOW_CRITICAL,
      };
    }
    if (sensorKey === 'T_1' || sensorKey === 'T_3') {
      return { isWarning: val > TEMP_WARNING, isDanger: val > TEMP_CRITICAL };
    }
    if (sensorKey === 'P_vac') {
      return { isWarning: val > K2_PRESSURE_WARNING, isDanger: val >= K2_PRESSURE_CRITICAL };
    }
    if (sensorKey === 'T_2') {
      return { isWarning: val > K2_TEMP_WARNING, isDanger: val >= K2_TEMP_CRITICAL };
    }
    if (sensorKey === 'L_2') {
      return {
        isWarning: val > LEVEL_HIGH || val < LEVEL_LOW,
        isDanger: val > LEVEL_HIGH_CRITICAL || val < LEVEL_LOW_CRITICAL,
      };
    }
    return { isWarning: false, isDanger: false };
  };

  return (
    <>
      <S.SchemeContainer>
        <S.SchemeHeader>
          <S.HeaderLeftGroup>
            <S.HeaderTitleContainer>
              <Activity size={14} />
              {activeScheme.name}
            </S.HeaderTitleContainer>

            <S.PresetSelectorWrapper>
              <span>Схема:</span>
              <Select
                size="small"
                value={activePresetId}
                style={{ width: 230 }}
                onChange={selectPreset}
                options={presets.map(p => ({
                  value: p.id,
                  label: p.isBuiltin ? `🔒 ${p.name}` : `✏️ ${p.name}`,
                }))}
              />
            </S.PresetSelectorWrapper>

            <Tooltip title="Открыть интерактивный конструктор мнемосхем">
              <Button
                size="small"
                icon={<Sliders size={13} />}
                onClick={openBuilder}
              >
                Конструктор
              </Button>
            </Tooltip>
          </S.HeaderLeftGroup>

          <S.HeaderStatusContainer>
            <TrendingUp size={12} />
            <span>Телеметрия 1 с</span>
            <S.OnlineBadge $isOnline={isOnline}>
              {isOnline ? `Online · ${wsLatency} мс` : 'Автономный режим'}
            </S.OnlineBadge>
            <S.ZoomControls aria-label="Управление масштабом мнемосхемы">
              <S.ZoomButton
                type="button"
                title="Уменьшить масштаб"
                aria-label="Уменьшить масштаб"
                onClick={() => scaleViewBox(1 / 1.25)}
                disabled={zoomPercent <= 100}
              >
                <ZoomOut size={15} />
              </S.ZoomButton>
              <S.ZoomValue aria-live="polite">{zoomPercent}%</S.ZoomValue>
              <S.ZoomButton
                type="button"
                title="Увеличить масштаб"
                aria-label="Увеличить масштаб"
                onClick={() => scaleViewBox(1.25)}
                disabled={zoomPercent >= MAX_ZOOM * 100}
              >
                <ZoomIn size={15} />
              </S.ZoomButton>
              <S.ZoomButton
                type="button"
                title="Показать всю схему"
                aria-label="Показать всю схему"
                onClick={() => setViewBox(defaultViewBox)}
              >
                <Maximize2 size={14} />
              </S.ZoomButton>
            </S.ZoomControls>
          </S.HeaderStatusContainer>
        </S.SchemeHeader>

        <S.SchemeViewport>
          <S.SVGCanvas
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            role="img"
            aria-label={`Мнемосхема ${activeScheme.name}`}
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
              <pattern id="engineering-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" className="grid-line" />
              </pattern>
            </defs>

            <rect className="scheme-background" x="0" y="0" width={schemeWidth} height={schemeHeight} />
            <rect className="scheme-grid" x="0" y="0" width={schemeWidth} height={schemeHeight} />

            {/* Технологические зоны */}
            {activeScheme.zones.map(zone => (
              <rect
                key={zone.id}
                className="process-zone"
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                rx="3"
              />
            ))}

            {/* Трубопроводы */}
            {activeScheme.pipes.map(pipe => {
              const active = isPipeFlowActive(pipe.flowBinding);
              const cutOff = pipe.cutOffValve ? !valves[pipe.cutOffValve] : false;
              return (
                <PipelineSymbol
                  key={pipe.id}
                  kind={pipe.kind}
                  d={pipe.d}
                  x1={pipe.x1}
                  y1={pipe.y1}
                  x2={pipe.x2}
                  y2={pipe.y2}
                  routing={pipe.routing}
                  midX={pipe.midX}
                  midY={pipe.midY}
                  isActive={active}
                  isCutOff={cutOff}
                />
              );
            })}

            {/* Колонны */}
            {activeScheme.columns.map(col => {
              const lvl = sensors[col.levelBinding] || 50;
              const isAlert = col.alertBindings.some(d => defects[d]);
              return (
                <ColumnSymbol
                  key={col.id}
                  x={col.x}
                  y={col.y}
                  tag={col.tag}
                  equipmentId={col.equipmentId}
                  level={lvl}
                  isAlert={isAlert}
                  tagOffsetY={col.tagOffsetY}
                  onOpen={setSelectedEquipmentId}
                />
              );
            })}

            {/* Печи */}
            {activeScheme.furnaces.map(fur => {
              const flame = sensors[fur.flameBinding];
              const isAlert = fur.alertBindings.some(d => defects[d]);
              return (
                <FurnaceSymbol
                  key={fur.id}
                  x={fur.x}
                  y={fur.y}
                  tag={fur.tag as any}
                  equipmentId={fur.equipmentId as any}
                  flameIsOn={Boolean(flame)}
                  isAlert={isAlert}
                  onOpen={setSelectedEquipmentId}
                />
              );
            })}

            {/* Емкости */}
            {activeScheme.vessels.map(ves => {
              const isAlert = ves.alertBindings.some(d => defects[d]);
              return (
                <VesselSymbol
                  key={ves.id}
                  x={ves.x}
                  y={ves.y}
                  tag={ves.tag as any}
                  equipmentId={ves.equipmentId as any}
                  isAlert={isAlert}
                  onOpen={setSelectedEquipmentId}
                />
              );
            })}

            {/* Насосы */}
            {activeScheme.pumps.map(p => {
              const running = pumps[p.equipmentId];
              const isAlert = p.alertBindings ? p.alertBindings.some(d => defects[d]) : false;
              return (
                <PumpSymbol
                  key={p.id}
                  x={p.x}
                  y={p.y}
                  tag={p.tag}
                  equipmentId={p.equipmentId}
                  direction={p.direction}
                  tagOffsetX={p.tagOffsetX}
                  tagOffsetY={p.tagOffsetY}
                  isRunning={Boolean(running)}
                  isAlert={Boolean(isAlert)}
                  onOpen={setSelectedEquipmentId}
                  onToggle={handlePumpClick}
                />
              );
            })}

            {/* Клапаны */}
            {activeScheme.valves.map(v => {
              const isOpen = Boolean(valves[v.valveId]);
              return (
                <ValveSymbol
                  key={v.id}
                  valveId={v.valveId}
                  equipmentId={v.equipmentId}
                  x={v.x}
                  y={v.y}
                  rotate={v.rotate}
                  vertical={v.vertical}
                  hideLabel={v.hideLabel}
                  label={v.label}
                  isOpen={isOpen}
                  onToggle={handleValveClick}
                  onOpen={setSelectedEquipmentId}
                />
              );
            })}

            {/* Датчики */}
            {activeScheme.sensors.map(s => {
              const rawVal = sensors[s.sensorKey];
              const val = typeof rawVal === 'number' ? rawVal : 0;
              const { isWarning, isDanger } = getSensorThresholdState(s.sensorKey, val);
              return (
                <SensorSymbol
                  key={s.id}
                  x={s.x}
                  y={s.y}
                  tag={s.tag}
                  value={val}
                  unit={s.unit}
                  decimals={s.unit === 'МПа' ? 3 : s.unit === '%' ? 1 : 1}
                  isWarning={isWarning}
                  isDanger={isDanger}
                  showSparkline={s.showSparkline}
                  history={getSensorHistory(s.sensorKey)}
                  minLimit={s.minLimit}
                  maxLimit={s.maxLimit}
                  showLevelGauge={s.showLevelGauge}
                  fullScaleMm={s.fullScaleMm}
                />
              );
            })}

            {/* Метки */}
            {activeScheme.labels.map(lbl => {
              let text = lbl.text;
              if (text.includes('{sensors.L_E1.toFixed(0)}')) {
                text = text.replace('{sensors.L_E1.toFixed(0)}', sensors.L_E1.toFixed(0));
              }
              if (text.includes('{sensors.L_E2.toFixed(0)}')) {
                text = text.replace('{sensors.L_E2.toFixed(0)}', sensors.L_E2.toFixed(0));
              }

              return (
                <text
                  key={lbl.id}
                  x={lbl.x}
                  y={lbl.y}
                  className={lbl.className || 'utility-label'}
                  textAnchor={lbl.textAnchor}
                >
                  {text}
                </text>
              );
            })}
          </S.SVGCanvas>
          <S.ZoomHint>Колесо — масштаб · перетаскивание — перемещение</S.ZoomHint>
        </S.SchemeViewport>
      </S.SchemeContainer>

      <EquipmentDrawer equipmentId={selectedEquipmentId} onClose={() => setSelectedEquipmentId(null)} />
    </>
  );
};

export default FlowScheme;
