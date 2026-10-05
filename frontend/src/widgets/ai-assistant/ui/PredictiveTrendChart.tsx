import React, { useState } from 'react';
import { useTheme } from 'styled-components';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useTelemetry } from '@/entities/telemetry';
import { FORECAST_HORIZON_SEC, PRES_WARNING, TEMP_WARNING, LEVEL_HIGH } from '@/shared/config';
import * as S from './PredictiveTrendChart.styles';

type ParamKey = 'T_1' | 'P_1' | 'L_1';

interface ParamConfig {
  key: ParamKey;
  label: string;
  unit: string;
  /** Индекс параметра в массиве predictions, приходящем с бэкенда */
  predictionIndex: number;
  /** Верхний аварийный порог (согласован с config.py бэкенда) */
  warningLevel: number;
  precision: number;
}

const PARAMS: ParamConfig[] = [
  { key: 'T_1', label: 'T-1 Печь', unit: '°C', predictionIndex: 0, warningLevel: TEMP_WARNING, precision: 1 },
  { key: 'P_1', label: 'P-1 Колонна', unit: 'МПа', predictionIndex: 1, warningLevel: PRES_WARNING, precision: 3 },
  { key: 'L_1', label: 'L-1 Уровень', unit: '%', predictionIndex: 2, warningLevel: LEVEL_HIGH, precision: 1 },
];

interface ChartPoint {
  timeElapsed: number;
  fact?: number;
  forecast?: number;
}

const PredictiveTrendChart: React.FC = () => {
  const theme = useTheme();
  const { telemetryHistory, predictions, sensors, timeElapsed } = useTelemetry();
  const [activeParam, setActiveParam] = useState<ParamKey>('T_1');

  const param = PARAMS.find(p => p.key === activeParam) ?? PARAMS[0];
  const getParamColor = (key: ParamKey) => key === 'T_1'
    ? theme.colors.warning
    : key === 'P_1' ? theme.colors.primary : theme.colors.success;
  const paramColor = getParamColor(param.key);
  const predictedValue = predictions?.[param.predictionIndex];
  const currentValue = sensors[param.key];

  // Факт — история телеметрии; прогноз — пунктир от текущей точки к t+15с
  const hasForecast = typeof predictedValue === 'number' && Number.isFinite(predictedValue);

  const data = React.useMemo<ChartPoint[]>(() => {
    const points: ChartPoint[] = telemetryHistory.map(point => ({
      timeElapsed: point.timeElapsed,
      fact: point[param.key],
    }));

    if (points.length > 0 && hasForecast) {
      // Линия прогноза стартует из последней фактической точки для визуальной непрерывности
      const lastPoint = points[points.length - 1];
      lastPoint.forecast = lastPoint.fact;
      points.push({
        timeElapsed: (lastPoint.timeElapsed ?? timeElapsed) + FORECAST_HORIZON_SEC,
        forecast: predictedValue,
      });
    }
    return points;
  }, [telemetryHistory, param.key, hasForecast, timeElapsed, predictedValue]);

  const delta = hasForecast ? predictedValue - currentValue : 0;
  const isApproachingLimit = hasForecast && predictedValue >= param.warningLevel;
  const trendSymbol = delta > 0.05 ? '↑' : delta < -0.05 ? '↓' : '→';

  const formatValue = (v: number) => v.toFixed(param.precision);

  // Ступенчатое округление границ Y-оси, исключающее дрожание масштаба при секундных обновлениях
  const yDomain = React.useMemo<[number, number]>(() => {
    const values = data.flatMap(p => [p.fact, p.forecast].filter((v): v is number => typeof v === 'number'));
    if (values.length === 0) return [0, 100];
    const dataMax = Math.max(...values);
    const dataMin = Math.min(...values);
    const showLimit = dataMax >= param.warningLevel * 0.8;
    const padding = Math.max((dataMax - dataMin) * 0.15, param.warningLevel * 0.02);
    const rawMin = Math.max(0, dataMin - padding);
    const rawMax = Math.max(dataMax, showLimit ? param.warningLevel : dataMax) + padding;

    const step = param.warningLevel > 100 ? 10 : param.warningLevel > 10 ? 2 : 0.05;
    return [
      Math.floor(rawMin / step) * step,
      Math.ceil(rawMax / step) * step,
    ];
  }, [data, param.warningLevel]);

  const showLimitLine = React.useMemo(() => {
    const values = data.flatMap(p => [p.fact, p.forecast].filter((v): v is number => typeof v === 'number'));
    return values.length > 0 && Math.max(...values) >= param.warningLevel * 0.8;
  }, [data, param.warningLevel]);

  // Стабильный тултип: строго 1 строка данных, исключает ложный «прогноз» в точке склейки и устраняет мерцание
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const factEntry = payload.find((p: any) => p.dataKey === 'fact' && typeof p.value === 'number');
    const forecastEntry = payload.find((p: any) => p.dataKey === 'forecast' && typeof p.value === 'number');
    const pointData = payload[0]?.payload as ChartPoint | undefined;

    // Точка в будущем (прогноз LSTM на +15 с)
    const isFuturePoint = (pointData && pointData.fact === undefined && typeof pointData.forecast === 'number')
      || (typeof label === 'number' && label > timeElapsed);

    const isCurrentPoint = !isFuturePoint && ((pointData && pointData.forecast !== undefined) || label === timeElapsed);

    return (
      <S.TooltipBox>
        <div className="time">
          t = {label} с {isCurrentPoint ? '(сейчас)' : isFuturePoint ? `(+${FORECAST_HORIZON_SEC} с)` : ''}
        </div>
        {!isFuturePoint && (factEntry || pointData?.fact !== undefined) && (
          <div className="item" style={{ color: paramColor }}>
            <span>Факт:</span>
            <strong>{formatValue(Number(factEntry?.value ?? pointData?.fact))} {param.unit}</strong>
          </div>
        )}
        {isFuturePoint && (
          <div className="item" style={{ color: isApproachingLimit ? theme.colors.danger : theme.colors.accent }}>
            <span>Прогноз LSTM:</span>
            <strong>{formatValue(Number(forecastEntry?.value ?? pointData?.forecast ?? predictedValue))} {param.unit}</strong>
          </div>
        )}
      </S.TooltipBox>
    );
  };

  if (data.length < 2) {
    return (
      <S.ChartWrapper>
        <S.ParamSelector>
          {PARAMS.map(p => (
            <S.ParamButton key={p.key} $active={p.key === activeParam} $color={getParamColor(p.key)} onClick={() => setActiveParam(p.key)}>
              {p.label}
            </S.ParamButton>
          ))}
        </S.ParamSelector>
        <S.EmptyState>Накопление истории телеметрии для построения тренда…</S.EmptyState>
      </S.ChartWrapper>
    );
  }

  return (
    <S.ChartWrapper>
      <S.ParamSelector>
        {PARAMS.map(p => (
          <S.ParamButton key={p.key} $active={p.key === activeParam} $color={getParamColor(p.key)} onClick={() => setActiveParam(p.key)}>
            {p.label}
          </S.ParamButton>
        ))}
      </S.ParamSelector>

      <S.ForecastSummary $isAlert={isApproachingLimit}>
        <span className="label">Прогноз модели на +{FORECAST_HORIZON_SEC} с:</span>
        <span className="value">
          {hasForecast ? `${formatValue(predictedValue)} ${param.unit}` : '—'} {trendSymbol}
        </span>
        {isApproachingLimit && <span className="alert">выход за предел {param.warningLevel} {param.unit}</span>}
      </S.ForecastSummary>

      <S.ChartArea>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={theme.colors.border} strokeDasharray="2 4" />
            <XAxis
              dataKey="timeElapsed"
              type="number"
              domain={['dataMin', 'dataMax']}
              allowDuplicatedCategory={false}
              tick={{ fill: theme.colors.textMuted, fontSize: 9 }}
              stroke={theme.colors.border}
              tickFormatter={(v: number) => `${v}с`}
            />
            <YAxis
              tick={{ fill: theme.colors.textMuted, fontSize: 9 }}
              stroke={theme.colors.border}
              domain={yDomain}
              tickFormatter={(v: number) => formatValue(v)}
            />
            <Tooltip
              isAnimationActive={false}
              content={<CustomTooltip />}
            />
            {showLimitLine && (
              <ReferenceLine
                y={param.warningLevel}
                stroke={theme.colors.danger}
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{ value: `Предел ${param.warningLevel}`, fill: theme.colors.danger, fontSize: 9, position: 'insideTopRight' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="fact"
              name="fact"
              stroke={paramColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: paramColor, fill: theme.colors.surface, strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="forecast"
              stroke={isApproachingLimit ? theme.colors.danger : theme.colors.accent}
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, fill: isApproachingLimit ? theme.colors.danger : theme.colors.accent }}
              activeDot={{ r: 5, stroke: isApproachingLimit ? theme.colors.danger : theme.colors.accent, fill: theme.colors.surface, strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </S.ChartArea>

      <S.Legend>
        <S.LegendItem $color={paramColor}>— Факт</S.LegendItem>
        <S.LegendItem $color={isApproachingLimit ? theme.colors.danger : theme.colors.accent}>‑ ‑ Прогноз LSTM</S.LegendItem>
        {showLimitLine && <S.LegendItem $color={theme.colors.danger}>‑ ‑ Аварийный предел</S.LegendItem>}
      </S.Legend>
    </S.ChartWrapper>
  );
};

export default PredictiveTrendChart;
