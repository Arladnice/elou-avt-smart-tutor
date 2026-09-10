import React from 'react';
import type { ValveId } from '@/entities/telemetry';
import type { EquipmentId } from '../../model/types';
import * as S from './symbols.styles';

export interface ValveSymbolProps {
  valveId: ValveId | string;
  equipmentId?: EquipmentId;
  kind?: 'valve' | 'mixer';
  x: number;
  y: number;
  rotate?: number;
  label: string;
  isOpen: boolean;
  vertical?: boolean;
  hideLabel?: boolean;
  onToggle?: (valveId: ValveId | string) => void;
  onOpen?: (equipmentId: EquipmentId) => void;
  interactive?: boolean;
}

const ValveGlyph: React.FC = () => (
  <>
    <rect className="valve-state-part valve-flange" x="-18" y="-9" width="6" height="18" rx="1" />
    <rect className="valve-state-part valve-flange" x="12" y="-9" width="6" height="18" rx="1" />
    <path className="valve-state-part valve-body" d="M-12 -7 H-6 L0 -2 L6 -7 H12 V7 H6 L0 2 L-6 7 H-12 Z" />
    <rect className="valve-state-part valve-neck" x="-5" y="-13" width="10" height="8" rx="1" />
    <path className="valve-state-part valve-bonnet" d="M-7 -13 H7 L5 -18 H-5 Z" />
    <line className="valve-stem" x1="0" y1="-17" x2="0" y2="-25" />
    <ellipse className="valve-wheel" cx="0" cy="-27" rx="10" ry="3" />
    <circle className="valve-wheel-hub" cx="0" cy="-27" r="1.8" />
  </>
);

const MixerGlyph: React.FC = () => (
  <>
    <rect className="valve-state-part valve-flange" x="-18" y="-7" width="4" height="14" rx="1" />
    <rect className="valve-state-part valve-flange" x="14" y="-7" width="4" height="14" rx="1" />
    <rect className="valve-state-part valve-flange" x="-5" y="-22" width="10" height="4" rx="1" />
    <path className="valve-state-part valve-body" d="M-14 -18 H14 V10 C14 16 8 20 0 20 C-8 20 -14 16 -14 10 Z" />
    <line className="valve-stem" x1="-12" y1="-16" x2="12" y2="10" />
    <line className="valve-stem" x1="12" y1="-16" x2="-12" y2="10" />
  </>
);

export const ValveSymbol: React.FC<ValveSymbolProps> = ({
  valveId,
  equipmentId,
  kind = 'valve',
  x,
  y,
  rotate = 0,
  label,
  isOpen,
  vertical = false,
  hideLabel = false,
  onToggle,
  onOpen,
  interactive = true,
}) => {
  const finalRotate = rotate !== 0 ? rotate : vertical ? 90 : 0;
  const transform = finalRotate !== 0 ? `translate(${x}, ${y}) rotate(${finalRotate})` : `translate(${x}, ${y})`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (interactive && onToggle) onToggle(valveId);
  };

  const handleContextMenu = (e: React.MouseEvent<SVGGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (equipmentId && onOpen) onOpen(equipmentId);
  };

  return (
    <S.ValveGroup
      $isOpen={isOpen}
      transform={transform}
      data-scheme-interactive={interactive ? 'true' : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`Переключить ${kind === 'mixer' ? 'смеситель' : 'клапан'} ${label}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={e => {
        if (!interactive) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle?.(valveId);
        }
      }}
    >
      <rect className="valve-hitbox" x="-22" y="-32" width="44" height="56" />
      {kind === 'mixer' ? <MixerGlyph /> : <ValveGlyph />}
      {!hideLabel && (
        <text
          x={vertical ? -24 : 0}
          y={vertical ? -39 : kind === 'mixer' ? -26 : -34}
          className="valve-tag"
          transform={vertical ? 'rotate(-90)' : undefined}
        >
          {label}
        </text>
      )}
    </S.ValveGroup>
  );
};
