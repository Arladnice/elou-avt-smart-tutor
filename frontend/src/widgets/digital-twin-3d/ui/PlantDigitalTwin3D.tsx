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
  X,
  ChevronRight,
  Info,
} from 'lucide-react';
import { CAMERA_PRESETS, PLANT_HIERARCHY } from '../model/PlantDigitalTwin3D.config';
import type { CameraPreset } from '../model/types';
import { useThreeTwin } from '../model/useThreeTwin';
import * as S from './PlantDigitalTwin3D.styles';

interface PlantDigitalTwin3DProps {
  onOpenEquipment?: (equipmentId: EquipmentId) => void;
}

export const PlantDigitalTwin3D: React.FC<PlantDigitalTwin3DProps> = ({ onOpenEquipment }) => {
  const theme = useTheme();
  const { sensors, valves, pumps, setpoints, status } = useTelemetry();
  const { togglePump, toggleValve } = useSimulatorActions();

  const [activePreset, setActivePreset] = useState<CameraPreset>('overview');
  const [showXRay, setShowXRay] = useState(true);
  const [showFlows, setShowFlows] = useState(true);
  const [showHUD, setShowHUD] = useState(true);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);

  const handleOpenEquipmentSafe = (id: EquipmentId) => {
    if (onOpenEquipment) {
      onOpenEquipment(id);
    }
  };

  const {
    containerRef,
    projectedHotspots,
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
    onTogglePump: (pId: PumpId) => togglePump(pId),
    onToggleValve: (vId: ValveId) => toggleValve(vId),
    onOpenEquipment: handleOpenEquipmentSafe,
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

      {/* Выдвижная боковая панель «Навигатор установки» (как на скриншоте 2 КАТКИ) */}
      <S.NavigatorDrawer $isOpen={isNavigatorOpen}>
        <S.NavigatorHeader>
          <S.DrawerTitleGroup>
            <FolderTree size={14} />
            <span>Структура установки ЭЛОУ-АВТ-6</span>
          </S.DrawerTitleGroup>
          <S.DrawerCloseBtn
            type="button"
            onClick={() => setIsNavigatorOpen(false)}
            aria-label="Закрыть"
          >
            <X size={15} />
          </S.DrawerCloseBtn>
        </S.NavigatorHeader>

        <S.NavigatorBody>
          {PLANT_HIERARCHY.map(unit => (
            <S.UnitSection key={unit.id}>
              <S.UnitSectionHeader
                onClick={() => focusOnCoordinates(unit.cameraPosition, unit.cameraTarget)}
                title="Навести камеру на блок"
              >
                <span>{unit.label}</span>
                <ChevronRight size={13} />
              </S.UnitSectionHeader>

              {unit.children && (
                <S.UnitNodeList>
                  {unit.children.map(child => (
                    <S.UnitNodeItem
                      key={child.id}
                      type="button"
                      onClick={() => focusOnCoordinates(child.cameraPosition, child.cameraTarget)}
                      title={`Фокус на ${child.label}`}
                    >
                      <S.NodeLabelGroup>
                        <span className="node-tag">{child.tag}</span>
                        <span>{child.label}</span>
                      </S.NodeLabelGroup>
                      {child.equipmentId && (
                        <S.NodeInfoBtn
                          role="button"
                          tabIndex={0}
                          title="Паспорт оборудования"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEquipmentSafe(child.equipmentId as EquipmentId);
                          }}
                        >
                          <Info size={12} />
                        </S.NodeInfoBtn>
                      )}
                    </S.UnitNodeItem>
                  ))}
                </S.UnitNodeList>
              )}
            </S.UnitSection>
          ))}
        </S.NavigatorBody>
      </S.NavigatorDrawer>


      <S.HintOverlay>
        ЛКМ — вращение · ПКМ — панорама · Колесо — зум · Клик — переключение
      </S.HintOverlay>

      {/* Проекция 2D HUD меток над 3D оборудованием */}
      {showHUD && (
        <S.HotspotOverlayContainer>
          {projectedHotspots.map(hs => {
            if (!hs.visible) return null;
            return (
              <S.HotspotBadge
                key={hs.id}
                $left={hs.screenX}
                $top={hs.screenY}
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
                {hs.liveValue && <S.BadgeValue>{hs.liveValue}</S.BadgeValue>}
              </S.HotspotBadge>
            );
          })}
        </S.HotspotOverlayContainer>
      )}

      {/* Всплывающая подсказка при наведении на 3D объект */}
      {hoveredName && <S.HoverPill>{hoveredName}</S.HoverPill>}

      {/* Нижняя легенда потоков */}
      <S.BottomBar>
        <S.LegendContainer>
          <S.LegendItem $color="#10b981">Сырая нефть / Продукт</S.LegendItem>
          <S.LegendItem $color="#f59e0b">Газ / Светлые фракции</S.LegendItem>
          <S.LegendItem $color="#0ea5e9">Промывочная вода</S.LegendItem>
          <S.LegendItem $color="#e2e8f0">Водяной пар</S.LegendItem>
          <S.LegendItem $color="#64748b">Дренаж / Гудрон</S.LegendItem>
        </S.LegendContainer>
      </S.BottomBar>
    </S.TwinWrapper>
  );
};
