import React, { useState } from 'react';
import type { EquipmentId } from '@/entities/mnemoscheme/model/types';
import type { PumpId, ValveId } from '@/entities/telemetry';
import {
  FolderTree,
  X,
  ChevronRight,
  Info,
  Search,
  ChevronsUpDown,
} from 'lucide-react';
import { PLANT_HIERARCHY } from '../model/PlantDigitalTwin3D.config';
import * as S from './PlantDigitalTwin3D.styles';

interface PlantNavigatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onFocusCoordinates: (pos: [number, number, number], target: [number, number, number]) => void;
  onOpenEquipment: (id: EquipmentId) => void;
  pumps: Record<string, boolean>;
  valves: Record<string, boolean>;
}

export const PlantNavigatorDrawer: React.FC<PlantNavigatorDrawerProps> = ({
  isOpen,
  onClose,
  onFocusCoordinates,
  onOpenEquipment,
  pumps,
  valves,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({
    'unit-elou': true,
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const toggleUnit = (unitId: string, pos: [number, number, number], target: [number, number, number]) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
    onFocusCoordinates(pos, target);
  };

  const areAllExpanded = PLANT_HIERARCHY.every(u => expandedUnits[u.id]);
  const toggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedUnits({});
    } else {
      const all: Record<string, boolean> = {};
      PLANT_HIERARCHY.forEach(u => { all[u.id] = true; });
      setExpandedUnits(all);
    }
  };

  const filteredHierarchy = PLANT_HIERARCHY.map(unit => {
    if (!searchQuery.trim()) return unit;
    const q = searchQuery.toLowerCase().trim();
    const unitMatches = unit.label.toLowerCase().includes(q) || unit.tag.toLowerCase().includes(q);
    const matchingChildren = unit.children?.filter(child =>
      child.label.toLowerCase().includes(q) || child.tag.toLowerCase().includes(q)
    );
    if (unitMatches) return unit;
    if (matchingChildren && matchingChildren.length > 0) {
      return { ...unit, children: matchingChildren };
    }
    return null;
  }).filter(Boolean) as typeof PLANT_HIERARCHY;

  return (
    <S.NavigatorDrawer $isOpen={isOpen}>
      <S.NavigatorHeader>
        <S.DrawerTitleGroup>
          <FolderTree size={14} />
          <span>Структура установки ЭЛОУ-АВТ-6</span>
        </S.DrawerTitleGroup>
        <S.HeaderActionsGroup>
          <S.HeaderActionBtn
            type="button"
            onClick={toggleExpandAll}
            title={areAllExpanded ? 'Свернуть все' : 'Развернуть все'}
            aria-label="Свернуть/развернуть"
          >
            <ChevronsUpDown size={13} />
          </S.HeaderActionBtn>
          <S.DrawerCloseBtn
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X size={15} />
          </S.DrawerCloseBtn>
        </S.HeaderActionsGroup>
      </S.NavigatorHeader>

      <S.NavigatorSearch>
        <Search size={13} />
        <S.SearchInput
          placeholder="Поиск аппарата (К-1, П-1, Н-82...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <S.HeaderActionBtn
            type="button"
            onClick={() => setSearchQuery('')}
            title="Очистить"
          >
            <X size={12} />
          </S.HeaderActionBtn>
        )}
      </S.NavigatorSearch>

      <S.NavigatorBody>
        {filteredHierarchy.map(unit => {
          const isExpanded = Boolean(expandedUnits[unit.id] || searchQuery.trim());
          return (
            <S.UnitSection key={unit.id}>
              <S.UnitSectionHeader
                $isExpanded={isExpanded}
                onClick={() => toggleUnit(unit.id, unit.cameraPosition, unit.cameraTarget)}
                title="Нажмите для открытия/фокусировки"
              >
                <span>{unit.label}</span>
                <S.UnitChevron $isExpanded={isExpanded}>
                  <ChevronRight size={13} />
                </S.UnitChevron>
              </S.UnitSectionHeader>

              {isExpanded && unit.children && (
                <S.UnitNodeList>
                  {unit.children.map(child => {
                    const isSelected = selectedNodeId === child.id;
                    let statusBadge = null;
                    if (child.type === 'pump' && child.equipmentId) {
                      const isRunning = Boolean(pumps[child.equipmentId as PumpId]);
                      statusBadge = (
                        <S.NodeStatusTag $type="pump" $active={isRunning}>
                          {isRunning ? 'Пуск' : 'Стоп'}
                        </S.NodeStatusTag>
                      );
                    } else if (child.type === 'valve' && child.equipmentId) {
                      const isOpen = Boolean(valves[child.equipmentId as ValveId]);
                      statusBadge = (
                        <S.NodeStatusTag $type="valve" $active={isOpen}>
                          {isOpen ? 'Откр' : 'Закр'}
                        </S.NodeStatusTag>
                      );
                    }

                    return (
                      <S.UnitNodeItem
                        key={child.id}
                        type="button"
                        $isSelected={isSelected}
                        onClick={() => {
                          setSelectedNodeId(child.id);
                          onFocusCoordinates(child.cameraPosition, child.cameraTarget);
                        }}
                        title={`Фокус на ${child.label}`}
                      >
                        <S.NodeLabelGroup>
                          <span className="node-tag">{child.tag}</span>
                          <span title={child.label}>{child.label}</span>
                        </S.NodeLabelGroup>
                        <S.NodeActionsGroup>
                          {statusBadge}
                          {child.equipmentId && (
                            <S.NodeInfoBtn
                              role="button"
                              tabIndex={0}
                              title="Паспорт оборудования"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEquipment(child.equipmentId as EquipmentId);
                              }}
                            >
                              <Info size={12} />
                            </S.NodeInfoBtn>
                          )}
                        </S.NodeActionsGroup>
                      </S.UnitNodeItem>
                    );
                  })}
                </S.UnitNodeList>
              )}
            </S.UnitSection>
          );
        })}
      </S.NavigatorBody>
    </S.NavigatorDrawer>
  );
};
