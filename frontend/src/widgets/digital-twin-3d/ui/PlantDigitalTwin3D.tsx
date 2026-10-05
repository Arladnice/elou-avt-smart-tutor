import React, { useState } from 'react';
import { useTheme } from 'styled-components';
import { useTelemetry, type PumpId, type ValveId } from '@/entities/telemetry';
import { useSimulatorActions } from '@/entities/simulator';
import type { EquipmentId } from '@/entities/mnemoscheme/model/types';
import {
  Globe,
  Zap,
  Flame,
  RotateCcw,
  Video,
  Eye,
  Droplets,
  Tag,
  FolderTree,
} from 'lucide-react';
import { CAMERA_PRESETS, TWIN_HOTSPOTS } from '../model/PlantDigitalTwin3D.config';
import type { CameraPreset } from '../model/types';
import { useThreeTwin } from '../model/useThreeTwin';
import { PlantNavigatorDrawer } from './PlantNavigatorDrawer';
import * as S from './PlantDigitalTwin3D.styles';

interface PlantDigitalTwin3DProps {
  onOpenEquipment?: (equipmentId: EquipmentId) => void;
  onFpsUpdate?: (fps: number) => void;
}

export const PlantDigitalTwin3D: React.FC<PlantDigitalTwin3DProps> = ({
  onOpenEquipment,
  onFpsUpdate,
}) => {
  const theme = useTheme();
  const { sensors, valves, pumps, setpoints, status } = useTelemetry();
  const { togglePump, toggleValve } = useSimulatorActions();

  const [activePreset, setActivePreset] = useState<CameraPreset>('overview');
  const [showXRay, setShowXRay] = useState(true);
  const [showFlows, setShowFlows] = useState(true);
  const [showHUD, setShowHUD] = useState(true);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);

  const handleSelectMedium = (medium: string) => {
    setSelectedMedium(prev => (prev === medium ? null : medium));
  };

  const handleOpenEquipmentSafe = (id: EquipmentId) => {
    if (onOpenEquipment) {
      onOpenEquipment(id);
    }
  };

  const {
    containerRef,
    registerBadgeRef,
    hoveredName,
    handlePointerMove,
    handleClick,
    focusOnCoordinates,
  } = useThreeTwin({
    sensors,
    valves,
    pumps,
    setpoints,
    status,
    activePreset,
    themeMode: theme.mode,
    showXRay,
    showFlows,
    showHUD,
    selectedMedium,
    onTogglePump: (pId: PumpId) => togglePump(pId),
    onToggleValve: (vId: ValveId) => toggleValve(vId),
    onOpenEquipment: handleOpenEquipmentSafe,
    onFpsUpdate,
  });

  const getPresetIcon = (id: CameraPreset) => {
    switch (id) {
      case 'overview': return <Globe size={13} />;
      case 'elou': return <Zap size={13} />;
      case 'furnaces_at': return <Flame size={13} />;
      case 'vt': return <RotateCcw size={13} />;
      case 'cinematic': return <Video size={13} />;
      default: return <Globe size={13} />;
    }
  };

  return (
    <S.TwinWrapper>
      {/* 3D WebGL Canvas */}
      <S.CanvasContainer
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      />

      {/* Верхняя плавающая панель режимов и камер */}
      <S.TopControlsBar>
        <S.ControlGroup aria-label="Навигация и ракурсы">
          <S.NavigatorToggleBtn
            type="button"
            $isOpen={isNavigatorOpen}
            title="Открыть структуру установки и технологические узлы"
            onClick={() => setIsNavigatorOpen(!isNavigatorOpen)}
          >
            <FolderTree size={13} />
            Структура
          </S.NavigatorToggleBtn>

          {CAMERA_PRESETS.map(preset => (
            <S.ViewpointBtn
              key={preset.id}
              type="button"
              $active={activePreset === preset.id}
              $isCinematic={preset.id === 'cinematic'}
              title={preset.description}
              onClick={() => setActivePreset(preset.id)}
            >
              {getPresetIcon(preset.id)}
              {preset.label}
            </S.ViewpointBtn>
          ))}
        </S.ControlGroup>

        <S.ControlGroup aria-label="Визуальные фильтры">
          <S.ToggleBtn
            type="button"
            $active={showXRay}
            title="Прозрачность корпусов для просмотра уровней"
            onClick={() => setShowXRay(!showXRay)}
          >
            <Eye size={13} />
            X-Ray Уровни
          </S.ToggleBtn>

          <S.ToggleBtn
            type="button"
            $active={showFlows}
            title="Анимация движения потоков в трубопроводах"
            onClick={() => setShowFlows(!showFlows)}
          >
            <Droplets size={13} />
            Потоки сред
          </S.ToggleBtn>

          <S.ToggleBtn
            type="button"
            $active={showHUD}
            title="Голографические бирки КИПиА"
            onClick={() => setShowHUD(!showHUD)}
          >
            <Tag size={13} />
            Телеметрия
          </S.ToggleBtn>
        </S.ControlGroup>
      </S.TopControlsBar>

      {/* Выдвижная боковая панель «Навигатор установки» (аккордеон + поиск + живые статусы) */}
      <PlantNavigatorDrawer
        isOpen={isNavigatorOpen}
        onClose={() => setIsNavigatorOpen(false)}
        onFocusCoordinates={focusOnCoordinates}
        onOpenEquipment={handleOpenEquipmentSafe}
        pumps={pumps}
        valves={valves}
      />




      {/* Проекция 2D HUD меток над 3D оборудованием */}
      {showHUD && (
        <S.HotspotOverlayContainer>
          {TWIN_HOTSPOTS.map(hs => {
            const liveValue = hs.valueGetter ? hs.valueGetter(sensors as any, setpoints as any) : undefined;
            return (
              <S.HotspotBadge
                key={hs.id}
                ref={(el) => registerBadgeRef(hs.id, el)}
                $category={hs.category}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hs.pumpId) togglePump(hs.pumpId);
                  else if (hs.valveId) toggleValve(hs.valveId);
                  else if (hs.equipmentId) handleOpenEquipmentSafe(hs.equipmentId);
                }}
              >
                <S.BadgeTitle>
                  {hs.label}
                  {hs.sublabel && <span>· {hs.sublabel}</span>}
                </S.BadgeTitle>
                {liveValue && <S.BadgeValue>{liveValue}</S.BadgeValue>}
              </S.HotspotBadge>
            );
          })}
        </S.HotspotOverlayContainer>
      )}

      {/* Всплывающая подсказка при наведении на 3D объект */}
      {hoveredName && <S.HoverPill>{hoveredName}</S.HoverPill>}

      {/* Нижняя легенда потоков с фильтрацией сред */}
      <S.BottomBar>
        <S.LegendContainer>
          <S.LegendItem
            type="button"
            $color="#10b981"
            $active={selectedMedium === 'crude'}
            onClick={() => handleSelectMedium('crude')}
            title="Фильтровать: показать только сырую нефть и продукты"
          >
            Сырая нефть / Продукт
          </S.LegendItem>
          <S.LegendItem
            type="button"
            $color="#f59e0b"
            $active={selectedMedium === 'gas'}
            onClick={() => handleSelectMedium('gas')}
            title="Фильтровать: показать только газовые линии и пары"
          >
            Газ / Светлые фракции
          </S.LegendItem>
          <S.LegendItem
            type="button"
            $color="#0ea5e9"
            $active={selectedMedium === 'water'}
            onClick={() => handleSelectMedium('water')}
            title="Фильтровать: показать только промывочную воду"
          >
            Промывочная вода
          </S.LegendItem>
          <S.LegendItem
            type="button"
            $color="#e2e8f0"
            $active={selectedMedium === 'steam'}
            onClick={() => handleSelectMedium('steam')}
            title="Фильтровать: показать только водяной пар"
          >
            Водяной пар
          </S.LegendItem>
          <S.LegendItem
            type="button"
            $color="#64748b"
            $active={selectedMedium === 'drain'}
            onClick={() => handleSelectMedium('drain')}
            title="Фильтровать: показать только гудрон и дренаж"
          >
            Дренаж / Гудрон
          </S.LegendItem>
          {selectedMedium && (
            <S.LegendResetBtn
              type="button"
              onClick={() => setSelectedMedium(null)}
              title="Сбросить фильтр сред (показать все)"
            >
              Сбросить фильтр
            </S.LegendResetBtn>
          )}
        </S.LegendContainer>

        <S.HintOverlay>
          ЛКМ — вращение · ПКМ — панорама · Колесо — зум · Клик — переключение
        </S.HintOverlay>
      </S.BottomBar>
    </S.TwinWrapper>
  );
};
