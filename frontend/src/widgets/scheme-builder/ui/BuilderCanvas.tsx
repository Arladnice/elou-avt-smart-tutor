import React, { useRef, useState } from 'react';
import { useTheme } from 'styled-components';
import type { MnemoschemeConfig } from '@/entities/mnemoscheme';
import { useTelemetry } from '@/entities/telemetry';
import { useSimulatorActions } from '@/entities/simulator';
import {
  PumpSymbol,
  FurnaceSymbol,
  ColumnSymbol,
  VesselSymbol,
  ValveSymbol,
  SensorSymbol,
  PipelineSymbol,
} from '@/entities/mnemoscheme';
import type { SelectedElementRef } from './PropertyInspector';
import * as S from './SchemeBuilder.styles';

export interface BuilderCanvasProps {
  scheme: MnemoschemeConfig;
  selectedElement: SelectedElementRef | null;
  mode: 'edit' | 'preview';
  gridSnap: number;
  onSelectElement: (ref: SelectedElementRef | null) => void;
  onUpdateElementPosition: (category: SelectedElementRef['category'], id: string, x: number, y: number) => void;
}

export const BuilderCanvas: React.FC<BuilderCanvasProps> = ({
  scheme,
  selectedElement,
  mode,
  gridSnap,
  onSelectElement,
  onUpdateElementPosition,
}) => {
  const theme = useTheme();
  const { sensors, valves, pumps, defects, telemetryHistory } = useTelemetry();
  const { toggleValve, togglePump } = useSimulatorActions();

  const [dragging, setDragging] = useState<{
    category: SelectedElementRef['category'];
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const snap = (val: number) => {
    if (gridSnap <= 1) return Math.round(val);
    return Math.round(val / gridSnap) * gridSnap;
  };

  const getSvgCoordinates = (event: React.MouseEvent<SVGSVGElement>): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = scheme.width / rect.width;
    const scaleY = scheme.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDownItem = (
    e: React.MouseEvent,
    category: SelectedElementRef['category'],
    id: string,
    currentX: number,
    currentY: number,
  ) => {
    e.stopPropagation();
    onSelectElement({ category, id });

    if (mode === 'edit') {
      const { x, y } = getSvgCoordinates(e as any);
      setDragging({
        category,
        id,
        startX: x,
        startY: y,
        initialX: currentX,
        initialY: currentY,
      });
    }
  };

  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || mode !== 'edit') return;
    const { x, y } = getSvgCoordinates(e);
    const deltaX = x - dragging.startX;
    const deltaY = y - dragging.startY;
    const newX = snap(dragging.initialX + deltaX);
    const newY = snap(dragging.initialY + deltaY);
    onUpdateElementPosition(dragging.category, dragging.id, newX, newY);
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  // Sparkline-истории для превью
  const sparklineWindow = telemetryHistory.slice(-15);
  const tempP1History = sparklineWindow.map(p => p.T_1);
  const tempP3History = sparklineWindow.map(p => p.T_3);
  const presP1History = sparklineWindow.map(p => p.P_1);
  const tempK2History = sparklineWindow.map(p => p.T_2);

  const getSensorHistory = (key: string) => {
    if (key === 'T_1') return tempP1History;
    if (key === 'T_3') return tempP3History;
    if (key === 'P_1') return presP1History;
    if (key === 'T_2') return tempK2History;
    return [];
  };

  // Расчет активности потоков для трубопроводов в режиме Live
  const powerFailed = defects.power_fail;
  const k1FeedActive = valves.V_1 && pumps.N_20 && !defects.pump_fail && !powerFailed;
  const k1ReliefActive = valves.V_2 && !defects.valve_jam;
  const k1LoopActive = valves.V_P3_OUT && valves.V_P3_RETURN && pumps.N_3 && !powerFailed;
  const k2FeedActive = valves.V_3 && valves.V_P1_IN && pumps.N_2 && !powerFailed;
  const k1BottomOutflowActive = k1LoopActive || k2FeedActive;
  const k2OutflowAvailable = !defects.k2_pump_fail && !powerFailed;
  const k2Outflow32Active = k2OutflowAvailable && valves.V_K2_OUT_32 && pumps.N_32;
  const k2Outflow4Active = k2OutflowAvailable && valves.V_K2_OUT_4 && pumps.N_4;

  const isPipeActive = (binding?: string) => {
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

  return (
    <S.CanvasArea>
      <S.CanvasSvg
        ref={svgRef}
        viewBox={`0 0 ${scheme.width} ${scheme.height}`}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onClick={() => onSelectElement(null)}
      >
        <defs>
          <linearGradient id="builder-scheme-panel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.colors.mnemonicPanelTop} />
            <stop offset="100%" stopColor={theme.colors.mnemonicPanelBottom} />
          </linearGradient>
          <pattern id="builder-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" className="grid-line" />
          </pattern>
        </defs>

        <rect className="scheme-background" x="0" y="0" width={scheme.width} height={scheme.height} />
        <rect className="scheme-grid" x="0" y="0" width={scheme.width} height={scheme.height} fill="url(#builder-grid)" opacity="0.4" />

        {/* Технологические зоны */}
        {scheme.zones.map(z => (
          <rect
            key={z.id}
            className="process-zone"
            x={z.x}
            y={z.y}
            width={z.width}
            height={z.height}
            rx="3"
          />
        ))}

        {/* Трубопроводы */}
        {scheme.pipes.map(pipe => {
          const isSelected = selectedElement?.category === 'pipes' && selectedElement?.id === pipe.id;
          const active = mode === 'preview' ? isPipeActive(pipe.flowBinding) : false;
          const isCut = mode === 'preview' && pipe.cutOffValve ? !valves[pipe.cutOffValve] : false;

          return (
            <g
              key={pipe.id}
              onClick={e => handlePointerDownItem(e, 'pipes', pipe.id, 0, 0)}
              style={{ cursor: mode === 'edit' ? 'pointer' : 'default' }}
            >
              <PipelineSymbol
                kind={pipe.kind}
                d={pipe.d}
                x1={pipe.x1}
                y1={pipe.y1}
                x2={pipe.x2}
                y2={pipe.y2}
                isActive={active}
                isCutOff={isCut}
              />
              {isSelected && pipe.d && (
                <path
                  d={pipe.d}
                  fill="none"
                  stroke={theme.colors.primary}
                  strokeWidth="6"
                  opacity="0.5"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        {/* Колонны */}
        {scheme.columns.map(col => {
          const isSelected = selectedElement?.category === 'columns' && selectedElement?.id === col.id;
          const levelVal = sensors[col.levelBinding] || 50;

          return (
            <g
              key={col.id}
              onMouseDown={e => handlePointerDownItem(e, 'columns', col.id, col.x, col.y)}
              style={{ cursor: mode === 'edit' ? 'move' : 'default' }}
            >
              <ColumnSymbol
                x={col.x}
                y={col.y}
                tag={col.tag}
                equipmentId={col.equipmentId}
                level={levelVal}
                isAlert={col.alertBindings.some(d => defects[d])}
                tagOffsetY={col.tagOffsetY}
                interactive={mode === 'preview'}
              />
              {isSelected && (
                <S.SelectionBox x={col.x} y={col.y - 14} width={130} height={314} rx="8" />
              )}
            </g>
          );
        })}

        {/* Печи */}
        {scheme.furnaces.map(fur => {
          const isSelected = selectedElement?.category === 'furnaces' && selectedElement?.id === fur.id;
          const flame = sensors[fur.flameBinding];

          return (
            <g
              key={fur.id}
              onMouseDown={e => handlePointerDownItem(e, 'furnaces', fur.id, fur.x, fur.y)}
              style={{ cursor: mode === 'edit' ? 'move' : 'default' }}
            >
              <FurnaceSymbol
                x={fur.x}
                y={fur.y}
                tag={fur.tag}
                equipmentId={fur.equipmentId}
                flameIsOn={Boolean(flame)}
                isAlert={fur.alertBindings.some(d => defects[d])}
                interactive={mode === 'preview'}
              />
              {isSelected && (
                <S.SelectionBox x={fur.x - 6} y={fur.y - 25} width={102} height={108} rx="9" />
              )}
            </g>
          );
        })}

        {/* Емкости */}
        {scheme.vessels.map(ves => {
          const isSelected = selectedElement?.category === 'vessels' && selectedElement?.id === ves.id;

          return (
            <g
              key={ves.id}
              onMouseDown={e => handlePointerDownItem(e, 'vessels', ves.id, ves.x, ves.y)}
              style={{ cursor: mode === 'edit' ? 'move' : 'default' }}
            >
              <VesselSymbol
                x={ves.x}
                y={ves.y}
                tag={ves.tag}
                equipmentId={ves.equipmentId}
                isAlert={ves.alertBindings.some(d => defects[d])}
                interactive={mode === 'preview'}
              />
              {isSelected && (
                <S.SelectionBox x={ves.x - 6} y={ves.y - 12} width={132} height={70} rx="12" />
              )}
            </g>
          );
        })}

        {/* Насосы */}
        {scheme.pumps.map(p => {
          const isSelected = selectedElement?.category === 'pumps' && selectedElement?.id === p.id;
          const running = pumps[p.equipmentId];
          const isAlert = p.alertBindings ? p.alertBindings.some(d => defects[d]) : false;

          return (
            <g
              key={p.id}
              onMouseDown={e => handlePointerDownItem(e, 'pumps', p.id, p.x, p.y)}
              style={{ cursor: mode === 'edit' ? 'move' : 'pointer' }}
            >
              <PumpSymbol
                x={p.x}
                y={p.y}
                tag={p.tag}
                equipmentId={p.equipmentId}
                direction={p.direction}
                tagOffsetX={p.tagOffsetX}
                tagOffsetY={p.tagOffsetY}
                isRunning={Boolean(running)}
                isAlert={Boolean(isAlert)}
                interactive={mode === 'preview'}
                onToggle={mode === 'preview' ? togglePump : undefined}
              />
              {isSelected && (
                <S.SelectionBox x={p.x - 42} y={p.y - 40} width={84} height={76} rx="8" />
              )}
            </g>
          );
        })}

        {/* Клапаны */}
        {scheme.valves.map(v => {
          const isSelected = selectedElement?.category === 'valves' && selectedElement?.id === v.id;
          const isOpen = Boolean(valves[v.valveId]);

          return (
            <g
              key={v.id}
              onMouseDown={e => handlePointerDownItem(e, 'valves', v.id, v.x, v.y)}
              style={{ cursor: mode === 'edit' ? 'move' : 'pointer' }}
            >
              <ValveSymbol
                valveId={v.valveId}
                equipmentId={v.equipmentId}
                x={v.x}
                y={v.y}
                rotate={v.rotate}
                vertical={v.vertical}
                hideLabel={v.hideLabel}
                label={v.label}
                isOpen={isOpen}
                interactive={mode === 'preview'}
                onToggle={mode === 'preview' ? toggleValve : undefined}
              />
              {isSelected && (
                <S.SelectionBox x={v.x - 22} y={v.y - 34} width={44} height={48} rx="6" />
              )}
            </g>
          );
        })}

        {/* Датчики */}
        {scheme.sensors.map(s => {
          const isSelected = selectedElement?.category === 'sensors' && selectedElement?.id === s.id;
          const val = sensors[s.sensorKey] ?? 0;

          return (
            <g
              key={s.id}
              onMouseDown={e => handlePointerDownItem(e, 'sensors', s.id, s.x, s.y)}
              style={{ cursor: mode === 'edit' ? 'move' : 'default' }}
            >
              <SensorSymbol
                x={s.x}
                y={s.y}
                tag={s.tag}
                value={typeof val === 'number' ? val : 0}
                unit={s.unit}
                decimals={s.unit === 'МПа' ? 3 : s.unit === '%' ? 1 : 1}
                showSparkline={s.showSparkline}
                history={getSensorHistory(s.sensorKey)}
                minLimit={s.minLimit}
                maxLimit={s.maxLimit}
                showLevelGauge={s.showLevelGauge}
                fullScaleMm={s.fullScaleMm}
              />
              {isSelected && (
                <S.SelectionBox
                  x={s.x - (s.showLevelGauge ? 66 : 46)}
                  y={s.y - 18}
                  width={s.showLevelGauge ? 132 : 92}
                  height={s.showSparkline || s.showLevelGauge ? 56 : 38}
                  rx="6"
                />
              )}
            </g>
          );
        })}

        {/* Метки / Аннотации */}
        {scheme.labels.map(lbl => {
          const isSelected = selectedElement?.category === 'labels' && selectedElement?.id === lbl.id;

          return (
            <g
              key={lbl.id}
              onMouseDown={e => handlePointerDownItem(e, 'labels', lbl.id, lbl.x, lbl.y)}
              style={{ cursor: mode === 'edit' ? 'move' : 'default' }}
            >
              <text
                x={lbl.x}
                y={lbl.y}
                className={lbl.className || 'utility-label'}
                textAnchor={lbl.textAnchor}
              >
                {lbl.text}
              </text>
              {isSelected && (
                <S.SelectionBox x={lbl.x - 4} y={lbl.y - 14} width={80} height={20} rx="4" />
              )}
            </g>
          );
        })}
      </S.CanvasSvg>
    </S.CanvasArea>
  );
};
