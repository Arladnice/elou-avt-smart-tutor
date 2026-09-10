import React from 'react';
import type { PipeKind } from '../../model/types';
import * as S from './symbols.styles';

export interface PipelineSymbolProps {
  kind: PipeKind;
  d?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
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
  isActive,
  isCutOff,
}) => {
  const lineD =
    d ||
    (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined
      ? `M ${x1},${y1} L ${x2},${y2}`
      : undefined);

  if (kind === 'demulsifier' && lineD) {
    return <S.DemulsifierLine d={lineD} $isActive={isActive} />;
  }

  if (kind === 'gas' && lineD) {
    return <S.GasLine d={lineD} $isActive={isActive} />;
  }

  if (
    (kind === 'steam' || kind === 'drain' || kind === 'fuel' || kind === 'utility') &&
    x1 !== undefined &&
    y1 !== undefined &&
    x2 !== undefined &&
    y2 !== undefined
  ) {
    return (
      <S.UtilityLine
        $kind={kind}
        $isActive={isActive}
        x1={x1.toString()}
        y1={y1.toString()}
        x2={x2.toString()}
        y2={y2.toString()}
      />
    );
  }

  if (lineD) {
    return <S.PipeLine d={lineD} $isActive={isActive} $isCutOff={isCutOff} />;
  }

  return null;
};

