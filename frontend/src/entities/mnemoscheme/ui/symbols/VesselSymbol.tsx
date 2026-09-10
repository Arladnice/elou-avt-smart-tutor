import React from 'react';
import type { EquipmentId } from '../../model/types';
import * as S from './symbols.styles';

export interface VesselSymbolProps {
  x: number;
  y: number;
  tag: 'Е-1' | 'Е-2' | string;
  equipmentId: EquipmentId;
  orientation?: 'horizontal' | 'vertical';
  isAlert: boolean;
  onOpen?: (equipmentId: EquipmentId) => void;
  interactive?: boolean;
}

export const VesselSymbol: React.FC<VesselSymbolProps> = ({
  x,
  y,
  tag,
  equipmentId,
  orientation = 'horizontal',
  isAlert,
  onOpen,
  interactive = true,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (interactive && onOpen) onOpen(equipmentId);
  };

  const handleContextMenu = (e: React.MouseEvent<SVGGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpen) onOpen(equipmentId);
  };

  const isVertical = orientation === 'vertical';

  return (
    <S.EquipmentGroup
      transform={`translate(${x}, ${y})`}
      data-scheme-interactive={interactive ? 'true' : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`Клик открывает карточку аппарата ${tag}`}
      $isAlert={isAlert}
      $isControllable={interactive}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={e => {
        if (!interactive) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.(equipmentId);
        }
      }}
    >
      {isVertical ? (
        <>
          <rect className="equipment-hitbox" x="-6" y="-10" width="52" height="106" rx="16" />
          <ellipse className="equipment-shadow" cx="20" cy="94" rx="22" ry="4" />
          <rect x="6" y="80" width="7" height="14" rx="1" className="vessel-leg" />
          <rect x="27" y="80" width="7" height="14" rx="1" className="vessel-leg" />
          <path
            d="M6 18 C6 8 12 2 20 2 C28 2 34 8 34 18 V68 C34 78 28 84 20 84 C12 84 6 78 6 68 Z"
            className="vessel-body"
          />
          <path d="M7 18 Q20 22 33 18" className="vessel-seam" />
          <path d="M7 68 Q20 72 33 68" className="vessel-seam" />
          <line x1="7" y1="48" x2="33" y2="48" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
          <rect x="0" y="47" width="6" height="6" rx="1" className="vessel-nozzle" />
          <rect x="34" y="12" width="6" height="6" rx="1" className="vessel-nozzle" />
          <rect x="17" y="84" width="6" height="6" rx="1" className="vessel-nozzle" />
          <text x="20" y="-8" className="equipment-tag">{tag}</text>
          {isAlert && (
            <g className="equipment-alert-badge" transform="translate(36, 0)" aria-hidden="true">
              <circle cx="0" cy="0" r="10" />
              <text x="0" y="5" textAnchor="middle">!</text>
            </g>
          )}
        </>
      ) : (
        <>
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
          {isAlert && (
            <g className="equipment-alert-badge" transform="translate(116, 0)" aria-hidden="true">
              <circle cx="0" cy="0" r="10" />
              <text x="0" y="5" textAnchor="middle">!</text>
            </g>
          )}
        </>
      )}
    </S.EquipmentGroup>
  );
};
