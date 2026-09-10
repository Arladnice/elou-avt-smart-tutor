import React from 'react';
import type { PipeKind, PipeRouting } from '../../model/types';
import { computePipePath } from '../../lib/pathUtils';
import * as S from './symbols.styles';

export interface PipelineSymbolProps {
  kind: PipeKind;
  d?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  routing?: PipeRouting;
  midX?: number;
  midY?: number;
  isActive?: boolean;
  isCutOff?: boolean;
}

export const PipelineSymbol: React.FC<PipelineSymbolProps> = ({
  kind,
  d,
  x1,
  y1,
  x2,
  y2,
  routing,
  midX,
  midY,
  isActive,
  isCutOff,
}) => {
  const lineD = computePipePath({ d, x1, y1, x2, y2, routing, midX, midY });

  if (kind === 'demulsifier' && lineD) {
    return <S.DemulsifierLine d={lineD} $isActive={isActive} />;
  }

  if (kind === 'gas' && lineD) {
    return <S.GasLine d={lineD} $isActive={isActive} />;
  }

  if (
    (kind === 'steam' || kind === 'drain' || kind === 'fuel' || kind === 'utility') &&
    lineD
  ) {
    return <S.UtilityLine d={lineD} $kind={kind} $isActive={isActive} />;
  }

  if (lineD) {
    return <S.PipeLine d={lineD} $isActive={isActive} $isCutOff={isCutOff} />;
  }

  return null;
};

