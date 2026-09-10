import React, { useRef, useState } from 'react';
import { useTheme } from 'styled-components';
import type { MnemoschemeConfig } from '@/entities/mnemoscheme';
import { translateSvgPath } from '@/entities/mnemoscheme';
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
  zoom: number;
  pan: { x: number; y: number };
  onSetZoom: (updater: number | ((prev: number) => number)) => void;
  onSetPan: (updater: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  onSelectElement: (ref: SelectedElementRef | null) => void;
  onUpdateElementPosition: (category: SelectedElementRef['category'], id: string, x: number, y: number) => void;
  onUpdateItem: (category: SelectedElementRef['category'], id: string, patch: Record<string, any>) => void;
  onCommitHistory?: () => void;
}

export const BuilderCanvas: React.FC<BuilderCanvasProps> = ({
  scheme,
  selectedElement,
  mode,
  gridSnap,
  zoom,
  pan,
  onSetZoom,
  onSetPan,
  onSelectElement,
  onUpdateElementPosition,
  onUpdateItem,
  onCommitHistory,
}) => {
  const theme = useTheme();
  const { sensors, valves, pumps, defects, telemetryHistory } = useTelemetry();
  const { toggleValve, togglePump } = useSimulatorActions();

  // Состояние перетаскивания узлов схемы (оборудование, датчики, метки)
  const [dragging, setDragging] = useState<{
    category: SelectedElementRef['category'];
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  // Состояние перетаскивания трубы целиком
  const [pipeDragging, setPipeDragging] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialX1?: number;
    initialY1?: number;
    initialX2?: number;
    initialY2?: number;
    initialD?: string;
  } | null>(null);

  // Состояние перетаскивания конца прямолинейной трубы (ручки)
  const [pipeHandleDragging, setPipeHandleDragging] = useState<{
    id: string;
    handle: 'start' | 'end';
  } | null>(null);

  // Состояние панорамирования холста (перемещение рабочей области)
  const [panning, setPanning] = useState<{
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const hasMovedRef = useRef<boolean>(false);

  const snap = (val: number) => {
    if (gridSnap <= 1) return Math.round(val);
    return Math.round(val / gridSnap) * gridSnap;
  };

  const getSvgCoordinates = (event: React.MouseEvent<SVGSVGElement>): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const currentViewWidth = scheme.width / zoom;
    const currentViewHeight = scheme.height / zoom;
    const scaleX = currentViewWidth / rect.width;
    const scaleY = currentViewHeight / rect.height;
    return {
      x: pan.x + (event.clientX - rect.left) * scaleX,
      y: pan.y + (event.clientY - rect.top) * scaleY,
    };
  };

  const handleItemClick = (
    e: React.MouseEvent,
    category: SelectedElementRef['category'],
    id: string,
  ) => {
    e.stopPropagation();
    onSelectElement({ category, id });
  };

  const handlePointerDownItem = (
    e: React.MouseEvent,
    category: SelectedElementRef['category'],
    id: string,
    currentX: number,
    currentY: number,
  ) => {
    if (e.button !== 0) return;
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

  const handlePointerDownPipe = (e: React.MouseEvent, pipe: any) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelectElement({ category: 'pipes', id: pipe.id });

    if (mode === 'edit') {
      const { x, y } = getSvgCoordinates(e as any);
      setPipeDragging({
        id: pipe.id,
        startX: x,
        startY: y,
        initialX1: pipe.x1,
        initialY1: pipe.y1,
        initialX2: pipe.x2,
        initialY2: pipe.y2,
        initialD: pipe.d,
      });
    }
  };

  const handlePointerDownPipeHandle = (
    e: React.MouseEvent,
    id: string,
    handle: 'start' | 'end',
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setPipeHandleDragging({ id, handle });
  };

  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement>) => {
    hasMovedRef.current = true;
    // 1. Панорамирование
    if (panning) {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = (scheme.width / zoom) / rect.width;
      const scaleY = (scheme.height / zoom) / rect.height;
      const deltaX = (e.clientX - panning.startClientX) * scaleX;
      const deltaY = (e.clientY - panning.startClientY) * scaleY;
      onSetPan({
        x: Math.round(panning.startPanX - deltaX),
        y: Math.round(panning.startPanY - deltaY),
      });
      return;
    }

    if (mode !== 'edit') return;

    // 2. Редактирование конца прямолинейной трубы через ручку
    if (pipeHandleDragging) {
      const { x, y } = getSvgCoordinates(e);
      const snappedX = snap(x);
      const snappedY = snap(y);
      if (pipeHandleDragging.handle === 'start') {
        onUpdateItem('pipes', pipeHandleDragging.id, { x1: snappedX, y1: snappedY });
      } else {
        onUpdateItem('pipes', pipeHandleDragging.id, { x2: snappedX, y2: snappedY });
      }
      return;
    }

    // 3. Перетаскивание трубы целиком
    if (pipeDragging) {
      const { x, y } = getSvgCoordinates(e);
      const deltaX = snap(x - pipeDragging.startX);
      const deltaY = snap(y - pipeDragging.startY);

      if (pipeDragging.initialD) {
        const newD = translateSvgPath(pipeDragging.initialD, deltaX, deltaY);
        onUpdateItem('pipes', pipeDragging.id, { d: newD });
      } else if (pipeDragging.initialX1 !== undefined) {
        onUpdateItem('pipes', pipeDragging.id, {
          x1: pipeDragging.initialX1 + deltaX,
          y1: pipeDragging.initialY1! + deltaY,
          x2: pipeDragging.initialX2! + deltaX,
          y2: pipeDragging.initialY2! + deltaY,
        });
      }
      return;
    }

    // 4. Перетаскивание оборудования / датчиков / меток
    if (dragging) {
      const { x, y } = getSvgCoordinates(e);
      const deltaX = x - dragging.startX;
      const deltaY = y - dragging.startY;
      const newX = snap(dragging.initialX + deltaX);
      const newY = snap(dragging.initialY + deltaY);
      onUpdateElementPosition(dragging.category, dragging.id, newX, newY);
    }
  };

  const handlePointerUp = () => {
    if (dragging || pipeDragging || pipeHandleDragging) {
      onCommitHistory?.();
    }
    setDragging(null);
    setPipeDragging(null);
    setPipeHandleDragging(null);
    setPanning(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    hasMovedRef.current = false;
    // Панорамирование при нажатии колесика мыши (button 1) или клике по фону (button 0)
    const target = e.target as SVGElement;
    const isBackgroundClick =
      target === svgRef.current ||
      target.classList?.contains('scheme-background') ||
      target.classList?.contains('scheme-grid');

    if (e.button === 1 || (e.button === 0 && (isBackgroundClick || e.altKey))) {
      setPanning({
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      });
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }
    const target = e.target as SVGElement;
    if (
      target === svgRef.current ||
      target.classList?.contains('scheme-background') ||
      target.classList?.contains('scheme-grid')
    ) {
      onSelectElement(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    onSetZoom(prev => {
      const next = Math.max(0.4, Math.min(3.0, Math.round(prev * zoomFactor * 100) / 100));
      return next;
    });
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

  const isGridVisible = gridSnap > 1;
  const gridSize = gridSnap > 1 ? gridSnap : 20;

  // Расчет viewBox с учетом масштабирования и панорамирования
  const viewWidth = scheme.width / zoom;
  const viewHeight = scheme.height / zoom;
  const viewBoxStr = `${pan.x} ${pan.y} ${viewWidth} ${viewHeight}`;

  return (
    <S.CanvasArea>
      <S.CanvasSvg
        ref={svgRef}
        viewBox={viewBoxStr}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onClick={handleCanvasClick}
      >
        <defs>
          <linearGradient id="builder-scheme-panel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.colors.mnemonicPanelTop} />
            <stop offset="100%" stopColor={theme.colors.mnemonicPanelBottom} />
          </linearGradient>
          <pattern id="builder-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} className="grid-line" />
          </pattern>
        </defs>

        <rect
          className="scheme-background"
          fill="url(#builder-scheme-panel)"
          x={pan.x - 3000}
          y={pan.y - 3000}
          width={scheme.width + 6000}
          height={scheme.height + 6000}
        />
        {isGridVisible && (
          <rect
            className="scheme-grid"
            fill="url(#builder-grid)"
            x={pan.x - 3000}
            y={pan.y - 3000}
            width={scheme.width + 6000}
            height={scheme.height + 6000}
            opacity={theme.mode === 'light' ? 0.75 : 0.55}
          />
        )}

        {/* Граница стандартного технологического планшета */}
        <rect
          x="0"
          y="0"
          width={scheme.width}
          height={scheme.height}
          fill="none"
          stroke={theme.colors.border}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.6"
          pointerEvents="none"
        />

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
              onMouseDown={e => handlePointerDownPipe(e, pipe)}
              onClick={e => handleItemClick(e, 'pipes', pipe.id)}
              style={{ cursor: mode === 'edit' ? 'move' : 'default' }}
            >
              {/* Невидимый хитбокс увеличенной ширины для легкого выделения и перетаскивания мышью */}
              {pipe.d && (
                <path
                  d={pipe.d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="20"
                  pointerEvents="stroke"
                />
              )}
              {pipe.x1 !== undefined && (
                <line
                  x1={pipe.x1}
                  y1={pipe.y1}
                  x2={pipe.x2}
                  y2={pipe.y2}
                  stroke="transparent"
                  strokeWidth="20"
                  pointerEvents="stroke"
                />
              )}

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

              {/* Подсветка выделения */}
              {isSelected && pipe.d && (
                <path
                  d={pipe.d}
                  fill="none"
                  stroke={theme.colors.primary}
                  strokeWidth="7"
                  opacity="0.6"
                  pointerEvents="none"
                />
              )}
              {isSelected && pipe.x1 !== undefined && (
                <line
                  x1={pipe.x1}
                  y1={pipe.y1}
                  x2={pipe.x2}
                  y2={pipe.y2}
                  stroke={theme.colors.primary}
                  strokeWidth="7"
                  opacity="0.6"
                  pointerEvents="none"
                />
              )}

              {/* Маркеры (ручки) концов прямолинейной трубы для растягивания и привязки */}
              {isSelected && mode === 'edit' && pipe.x1 !== undefined && (
                <>
                  <S.PipeHandle
                    cx={pipe.x1}
                    cy={pipe.y1}
                    r="6"
                    onMouseDown={e => handlePointerDownPipeHandle(e, pipe.id, 'start')}
                  />
                  <S.PipeHandle
                    cx={pipe.x2}
                    cy={pipe.y2}
                    r="6"
                    onMouseDown={e => handlePointerDownPipeHandle(e, pipe.id, 'end')}
                  />
                </>
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
              onClick={e => handleItemClick(e, 'columns', col.id)}
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
              onClick={e => handleItemClick(e, 'furnaces', fur.id)}
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
              onClick={e => handleItemClick(e, 'vessels', ves.id)}
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
              onClick={e => {
                e.stopPropagation();
                if (mode === 'edit') {
                  onSelectElement({ category: 'pumps', id: p.id });
                }
              }}
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
              onClick={e => {
                e.stopPropagation();
                if (mode === 'edit') {
                  onSelectElement({ category: 'valves', id: v.id });
                }
              }}
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
          const hitWidth = s.showLevelGauge ? 132 : 92;
          const hitHeight = s.showSparkline || s.showLevelGauge ? 56 : 38;
          const hitX = s.x - (s.showLevelGauge ? 66 : 46);
          const hitY = s.y - 18;

          return (
            <g
              key={s.id}
              onMouseDown={e => handlePointerDownItem(e, 'sensors', s.id, s.x, s.y)}
              onClick={e => handleItemClick(e, 'sensors', s.id)}
              style={{ cursor: mode === 'edit' ? 'move' : 'default' }}
            >
              {/* Прозрачный хитбокс для гарантированного захвата клика мышью */}
              <rect
                x={hitX}
                y={hitY}
                width={hitWidth}
                height={hitHeight}
                fill="transparent"
                pointerEvents="all"
              />
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
                  x={hitX}
                  y={hitY}
                  width={hitWidth}
                  height={hitHeight}
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
              onClick={e => handleItemClick(e, 'labels', lbl.id)}
              style={{ cursor: mode === 'edit' ? 'move' : 'default' }}
            >
              {/* Прозрачный хитбокс для надежного клика по тексту */}
              <rect
                x={lbl.x - 12}
                y={lbl.y - 18}
                width={100}
                height={26}
                fill="transparent"
                pointerEvents="all"
              />
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
