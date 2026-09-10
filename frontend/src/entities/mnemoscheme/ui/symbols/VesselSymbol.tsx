import React from 'react';
import type { EquipmentId } from '../../model/types';
import * as S from './symbols.styles';

export interface VesselSymbolProps {
  x: number;
  y: number;
  tag: 'Е-1' | 'Е-2' | string;
  equipmentId: Extract<EquipmentId, 'VESSEL_E_1' | 'VESSEL_E_2'>;
  isAlert: boolean;
  onOpen?: (equipmentId: EquipmentId) => void;
  interactive?: boolean;
}

export const VesselSymbol: React.FC<VesselSymbolProps> = ({
  x,
  y,
  tag,
  equipmentId,
  isAlert,
  onOpen,
  interactive = true,
}) => {
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
      aria-label={`Правая кнопка открывает карточку ёмкости ${tag}`}
      $isAlert={isAlert}
      onContextMenu={handleContextMenu}
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
      {isAlert && (
        <g className="equipment-alert-badge" transform="translate(116, 0)" aria-hidden="true">
          <circle cx="0" cy="0" r="10" />
          <text x="0" y="5" textAnchor="middle">!</text>
        </g>
      )}
    </S.EquipmentGroup>
  );
};
