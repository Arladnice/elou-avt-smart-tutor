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
  if (kind === 'demulsifier' && d) {
    return <S.DemulsifierLine d={d} $isActive={isActive} />;
  }

  if (kind === 'gas' && d) {
    return <S.GasLine d={d} $isActive={isActive} />;
  }

  if ((kind === 'steam' || kind === 'drain' || kind === 'fuel' || kind === 'utility') && x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
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

  if (d) {
    return <S.PipeLine d={d} $isActive={isActive} $isCutOff={isCutOff} />;
  }

  return null;
};
