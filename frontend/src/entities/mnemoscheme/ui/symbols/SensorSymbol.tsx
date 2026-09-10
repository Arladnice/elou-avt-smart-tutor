import React from 'react';
import { useTheme } from 'styled-components';
import * as S from './symbols.styles';

export interface SensorSymbolProps {
  x: number;
  y: number;
  tag: string;
  value: number;
  unit: string;
  decimals?: number;
  isWarning?: boolean;
  isDanger?: boolean;
  showSparkline?: boolean;
  history?: number[];
  minLimit?: number;
  maxLimit?: number;
  showLevelGauge?: boolean;
  fullScaleMm?: number;
  displayMm?: boolean;
}

const LEVEL_GAUGE_TICKS = [0.2, 0.4, 0.6, 0.8];

const generateSparklineD = (
  history: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
) => {
  if (history.length < 2) return '';
  const points = history.map((val, index) => {
    const pointX = x + (index / (history.length - 1)) * width;
    const range = maxValue - minValue;
    const normalized = range > 0 ? (val - minValue) / range : 0.5;
    const pointY = y + height - Math.max(0, Math.min(1, normalized)) * height;
    return `${pointX},${pointY}`;
  });
  return `M ${points.join(' L ')}`;
};

export const SensorSymbol: React.FC<SensorSymbolProps> = ({
  x,
  y,
  tag,
  value,
  unit,
  decimals = 1,
  isWarning = false,
  isDanger = false,
  showSparkline = false,
  history = [],
  minLimit = 0,
  maxLimit = 100,
  showLevelGauge = false,
  fullScaleMm,
}) => {
  const theme = useTheme();

  const formattedValue = decimals === 0 ? value.toFixed(0) : decimals === 3 ? value.toFixed(3) : value.toFixed(decimals);

  let displayStr = `${formattedValue} ${unit}`;
  if (showLevelGauge && fullScaleMm) {
    const mmValue = Math.round((value / 100) * fullScaleMm);
    displayStr = `${mmValue} мм · ${value.toFixed(decimals)}%`;
  }

  const boxWidth = showLevelGauge ? 124 : 84;
  const halfWidth = boxWidth / 2;

  const normalizedLevel = Math.min(100, Math.max(0, value)) / 100;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <S.SensorBox $isWarning={isWarning} $isDanger={isDanger}>
        <rect className="bg" x={-halfWidth} y="-10" width={boxWidth} height="26" rx="4" />
        <text className="value" x="0" y="7" textAnchor="middle">
          {displayStr}
        </text>
        <text className="label" x="0" y="-14" textAnchor="middle">
          {tag}
        </text>
      </S.SensorBox>

      {showSparkline && (
        <>
          <rect x={-halfWidth} y="20" width={boxWidth} height="12" className="sparkline-frame" />
          <S.SparklinePath
            d={generateSparklineD(history, -halfWidth, 20, boxWidth, 12, minLimit, maxLimit)}
            $strokeColor={isWarning || isDanger ? theme.colors.warning : theme.colors.primary}
          />
        </>
      )}

      {showLevelGauge && (
        <S.LevelGauge $isWarning={isWarning} $isDanger={isDanger}>
          <rect className="level-gauge-frame" x={-halfWidth} y="20" width={boxWidth} height="13" rx="3" />
          <rect
            className="level-gauge-fill"
            x={-halfWidth + 4}
            y="25"
            width={(boxWidth - 8) * normalizedLevel}
            height="5"
            rx="2"
          />
          {LEVEL_GAUGE_TICKS.map(tick => (
            <line
              key={tick}
              className="level-gauge-tick"
              x1={-halfWidth + boxWidth * tick}
              y1="22"
              x2={-halfWidth + boxWidth * tick}
              y2="25"
            />
          ))}
        </S.LevelGauge>
      )}
    </g>
  );
};
