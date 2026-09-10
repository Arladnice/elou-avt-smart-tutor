import React from 'react';
import type { EquipmentId } from '../../model/types';
import * as S from './symbols.styles';

export interface ColumnSymbolProps {
  x: number;
  y: number;
  tag: 'К-1' | 'К-2' | string;
  equipmentId: Extract<EquipmentId, 'K_1' | 'K_2'>;
  level: number;
  isAlert: boolean;
  tagOffsetY?: number;
  onOpen?: (equipmentId: EquipmentId) => void;
  interactive?: boolean;
}

export const ColumnSymbol: React.FC<ColumnSymbolProps> = ({
  x,
  y,
  tag,
  equipmentId,
  level,
  isAlert,
  tagOffsetY = 145,
  onOpen,
  interactive = true,
}) => {
  const handleContextMenu = (e: React.MouseEvent<SVGGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpen) onOpen(equipmentId);
  };

  const clampedLevel = Math.min(100, Math.max(0, level)) / 100;
  const levelHeight = clampedLevel * 160;

  return (
    <S.EquipmentGroup
      transform={`translate(${x}, ${y})`}
      data-scheme-interactive={interactive ? 'true' : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`Правая кнопка открывает карточку колонны ${tag}`}
      $isAlert={isAlert}
      onContextMenu={handleContextMenu}
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
        y={207 - levelHeight}
        width="7"
        height={levelHeight}
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
      {isAlert && (
        <g className="equipment-alert-badge" transform="translate(119, 12)" aria-hidden="true">
          <circle cx="0" cy="0" r="10" />
          <text x="0" y="5" textAnchor="middle">!</text>
        </g>
      )}
    </S.EquipmentGroup>
  );
};
