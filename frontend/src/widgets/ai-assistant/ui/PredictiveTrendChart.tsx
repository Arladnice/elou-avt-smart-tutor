import React, { useState } from 'react';
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
  color: string;
  precision: number;
}

const PARAMS: ParamConfig[] = [
  { key: 'T_1', label: 'T-1 Печь', unit: '°C', predictionIndex: 0, warningLevel: TEMP_WARNING, color: '#ff9900', precision: 1 },
  { key: 'P_1', label: 'P-1 Колонна', unit: 'МПа', predictionIndex: 1, warningLevel: PRES_WARNING, color: '#00e5ff', precision: 3 },
  { key: 'L_1', label: 'L-1 Уровень', unit: '%', predictionIndex: 2, warningLevel: LEVEL_HIGH, color: '#00ff66', precision: 1 },
];

interface ChartPoint {
  timeElapsed: number;
  fact?: number;
  forecast?: number;
}

const PredictiveTrendChart: React.FC = () => {
  const { telemetryHistory, predictions, sensors, timeElapsed } = useTelemetry();
  const [activeParam, setActiveParam] = useState<ParamKey>('T_1');

  const param = PARAMS.find(p => p.key === activeParam) ?? PARAMS[0];
  const predictedValue = predictions?.[param.predictionIndex];
  const currentValue = sensors[param.key];

  // Факт — история телеметрии; прогноз — пунктир от текущей точки к t+15с
  const data: ChartPoint[] = telemetryHistory.map(point => ({
    timeElapsed: point.timeElapsed,
    fact: point[param.key],
  }));

  const hasForecast = typeof predictedValue === 'number' && Number.isFinite(predictedValue);
  if (data.length > 0 && hasForecast) {
    // Линия прогноза стартует из последней фактической точки, чтобы не было разрыва
    data[data.length - 1].forecast = data[data.length - 1].fact;
    data.push({
      timeElapsed: timeElapsed + FORECAST_HORIZON_SEC,
      forecast: predictedValue,
    });
  }

  const delta = hasForecast ? predictedValue - currentValue : 0;
  const isApproachingLimit = hasForecast && predictedValue >= param.warningLevel;
  const trendSymbol = delta > 0.05 ? '↑' : delta < -0.05 ? '↓' : '→';

  const formatValue = (v: number) => v.toFixed(param.precision);

  // Аварийный предел показываем только при подходе к нему: иначе он растягивает
  // шкалу (напр. холодный пуск 40°C против предела 310°C) и тренд не читается.
  const values = data.flatMap(p => [p.fact, p.forecast].filter((v): v is number => typeof v === 'number'));
  const dataMax = values.length > 0 ? Math.max(...values) : 0;
  const dataMin = values.length > 0 ? Math.min(...values) : 0;
  const showLimitLine = dataMax >= param.warningLevel * 0.8;
  const padding = Math.max((dataMax - dataMin) * 0.15, param.warningLevel * 0.02);
  const yDomain: [number, number] = [
    dataMin - padding,
    Math.max(dataMax, showLimitLine ? param.warningLevel : dataMax) + padding,
  ];

  if (data.length < 2) {
    return (
      <S.ChartWrapper>
        <S.ParamSelector>
          {PARAMS.map(p => (
            <S.ParamButton key={p.key} $active={p.key === activeParam} $color={p.color} onClick={() => setActiveParam(p.key)}>
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
          <S.ParamButton key={p.key} $active={p.key === activeParam} $color={p.color} onClick={() => setActiveParam(p.key)}>
            {p.label}
          </S.ParamButton>
        ))}
      </S.ParamSelector>

      <S.ForecastSummary $isAlert={isApproachingLimit}>
        <span className="label">Прогноз ИИ (LSTM) на +{FORECAST_HORIZON_SEC} с:</span>
        <span className="value">
          {hasForecast ? `${formatValue(predictedValue)} ${param.unit}` : '—'} {trendSymbol}
        </span>
        {isApproachingLimit && <span className="alert">выход за предел {param.warningLevel} {param.unit}</span>}
      </S.ForecastSummary>

      <S.ChartArea>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="#1d2635" strokeDasharray="2 4" />
            <XAxis
              dataKey="timeElapsed"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: '#7c8ba1', fontSize: 9 }}
              stroke="#222c3e"
              tickFormatter={(v: number) => `${v}с`}
            />
            <YAxis
              tick={{ fill: '#7c8ba1', fontSize: 9 }}
              stroke="#222c3e"
              domain={yDomain}
              tickFormatter={(v: number) => formatValue(v)}
            />
            <Tooltip
              contentStyle={{
                background: '#111620',
                border: '1px solid #222c3e',
                borderRadius: 4,
                fontSize: 11,
              }}
              labelStyle={{ color: '#7c8ba1' }}
              labelFormatter={label => `t = ${label} с`}
              formatter={(value, name) => [
                `${formatValue(Number(value))} ${param.unit}`,
                name === 'fact' ? 'Факт' : 'Прогноз ИИ',
              ]}
            />
            {showLimitLine && (
              <ReferenceLine
                y={param.warningLevel}
                stroke="#ff3333"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{ value: `Предел ${param.warningLevel}`, fill: '#ff3333', fontSize: 9, position: 'insideTopRight' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="fact"
              name="fact"
              stroke={param.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="forecast"
              stroke={isApproachingLimit ? '#ff3333' : '#aa00ff'}
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, fill: isApproachingLimit ? '#ff3333' : '#aa00ff' }}
              isAnimationActive={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </S.ChartArea>

      <S.Legend>
        <S.LegendItem $color={param.color}>— Факт</S.LegendItem>
        <S.LegendItem $color={isApproachingLimit ? '#ff3333' : '#aa00ff'}>‑ ‑ Прогноз LSTM</S.LegendItem>
        {showLimitLine && <S.LegendItem $color="#ff3333">‑ ‑ Аварийный предел</S.LegendItem>}
      </S.Legend>
    </S.ChartWrapper>
  );
};

export default PredictiveTrendChart;
