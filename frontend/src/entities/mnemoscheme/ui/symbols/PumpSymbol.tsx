import React from 'react';
import type { PumpId } from '@/entities/telemetry';
import type { EquipmentId } from '../../model/types';
import * as S from './symbols.styles';

export interface PumpSymbolProps {
  x: number;
  y: number;
  tag: string;
  equipmentId: PumpId;
  direction?: 'left' | 'right';
  tagOffsetX?: number;
  tagOffsetY?: number;
  isRunning: boolean;
  isAlert: boolean;
  onOpen?: (equipmentId: EquipmentId) => void;
  onToggle?: (pumpId: PumpId) => void;
  interactive?: boolean;
}

export const PumpSymbol: React.FC<PumpSymbolProps> = ({
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
  interactive = true,
}) => {
  const glyphTransform = direction === 'left' ? 'scale(-1 1)' : undefined;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (interactive && onToggle) onToggle(equipmentId);
  };

  const handleContextMenu = (e: React.MouseEvent<SVGGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpen) onOpen(equipmentId);
  };

  return (
    <S.EquipmentGroup
      transform={`translate(${x}, ${y})`}
      data-scheme-interactive={interactive ? 'true' : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`Переключить насос ${tag}; правая кнопка открывает карточку оборудования`}
      $isAlert={isAlert}
      $isControllable={interactive}
      $isRunning={isRunning}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={e => {
        if (!interactive) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle?.(equipmentId);
        }
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
