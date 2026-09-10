import React from 'react';
import type { EquipmentId } from '../../model/types';
import * as S from './symbols.styles';

export interface FurnaceSymbolProps {
  x: number;
  y: number;
  tag: 'П-1' | 'П-3' | string;
  equipmentId: 'P_1' | 'P_3' | string;
  flameIsOn: boolean;
  isAlert: boolean;
  onOpen?: (equipmentId: EquipmentId) => void;
  interactive?: boolean;
}

export const FurnaceSymbol: React.FC<FurnaceSymbolProps> = ({
  x,
  y,
  tag,
  equipmentId,
  flameIsOn,
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
      aria-label={`Правая кнопка открывает карточку печи ${tag}`}
      $isAlert={isAlert}
      onContextMenu={handleContextMenu}
    >
      <rect className="equipment-hitbox" x="-6" y="-25" width="102" height="108" rx="9" />
      <ellipse className="equipment-shadow" cx="45" cy="76" rx="46" ry="6" />
      <rect x="37" y="-19" width="16" height="11" rx="2" className="furnace-stack" />
      <rect x="33" y="-22" width="24" height="5" rx="1.5" className="furnace-stack-cap" />
      <rect x="7" y="67" width="76" height="7" rx="2" className="furnace-base" />
      <path d="M12 8 Q12 -5 45 -9 Q78 -5 78 8 V63 Q78 68 73 68 H17 Q12 68 12 63 Z" className="furnace-body" />
      <path d="M18 7 Q45 -5 72 7" className="furnace-rim" />
      <line x1="13" y1="18" x2="77" y2="18" className="furnace-band" />
      <line x1="13" y1="62" x2="77" y2="62" className="furnace-band" />
      <line x1="19" y1="20" x2="19" y2="61" className="furnace-rib" />
      <line x1="71" y1="20" x2="71" y2="61" className="furnace-rib" />
      <path d="M78 10 H87 V57 H78" className="furnace-side-pipe" />
      <circle cx="24" cy="14" r="1.2" className="equipment-rivet" />
      <circle cx="66" cy="14" r="1.2" className="equipment-rivet" />
      <circle cx="24" cy="57" r="1.2" className="equipment-rivet" />
      <circle cx="66" cy="57" r="1.2" className="equipment-rivet" />
      <rect x="27" y="28" width="36" height="34" rx="4" className="furnace-window" />
      <S.FlameWrapper $isActive={flameIsOn}>
        <path d="M45 58 C33 50 38 41 44 35 C44 43 50 44 51 50 C56 44 58 51 55 57 C52 62 47 63 45 58 Z" className="furnace-flame" />
      </S.FlameWrapper>
      <text x="45" y="25" className="equipment-tag">{tag}</text>
      {isAlert && (
        <g className="equipment-alert-badge" transform="translate(84, -10)" aria-hidden="true">
          <circle cx="0" cy="0" r="10" />
          <text x="0" y="5" textAnchor="middle">!</text>
        </g>
      )}
    </S.EquipmentGroup>
  );
};
