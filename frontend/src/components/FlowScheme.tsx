import React, { useEffect, useState } from 'react';
import styledComponents, { keyframes } from 'styled-components';
import { useSimulator } from '../context/SimulatorContext';
import { Activity, Flame, TrendingUp } from 'lucide-react';

const flowAnimation = keyframes`
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
`;

const SchemeContainer = styledComponents.div`
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const SchemeHeader = styledComponents.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${props => props.theme.colors.textMuted};
`;

const SVGCanvas = styledComponents.svg`
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 380px;
  background-color: #0b0f17;
`;

// Стилизованные датчики
const SensorBox = styledComponents.g<{ isWarning?: boolean; isDanger?: boolean }>`
  rect.bg {
    fill: #131924;
    stroke: ${props => {
      if (props.isDanger) return props.theme.colors.danger;
      if (props.isWarning) return props.theme.colors.warning;
      return props.theme.colors.border;
    }};
    stroke-width: 1.5;
    filter: ${props => (props.isDanger || props.isWarning ? `drop-shadow(0 0 4px ${props.isDanger ? props.theme.colors.danger : props.theme.colors.warning})` : 'none')};
  }

  text.value {
    fill: ${props => {
      if (props.isDanger) return props.theme.colors.danger;
      if (props.isWarning) return props.theme.colors.warning;
      return props.theme.colors.accent;
    }};
    font-family: ${props => props.theme.fonts.mono};
    font-size: 13px;
    font-weight: 700;
  }

  text.label {
    fill: ${props => props.theme.colors.textMuted};
    font-size: 10px;
    font-weight: 500;
  }
`;

// Стилизованные интерактивные клапаны
const ValveGroup = styledComponents.g<{ isOpen: boolean }>`
  cursor: pointer;

  polygon {
    fill: ${props => (props.isOpen ? 'rgba(0, 255, 102, 0.1)' : 'rgba(255, 51, 51, 0.1)')};
    stroke: ${props => (props.isOpen ? props.theme.colors.success : props.theme.colors.danger)};
    stroke-width: 2;
    transition: ${props => props.theme.transitions.default};
  }

  circle {
    fill: ${props => (props.isOpen ? props.theme.colors.success : props.theme.colors.danger)};
    filter: drop-shadow(0 0 6px ${props => (props.isOpen ? props.theme.colors.success : props.theme.colors.danger)});
    transition: ${props => props.theme.transitions.default};
  }

  &:hover polygon {
    stroke-width: 3;
  }
`;

// Потоки трубопроводов
const PipeLine = styledComponents.path<{ isActive?: boolean }>`
  stroke: ${props => (props.isActive ? '#1a365d' : '#222c3e')};
  stroke-width: 4;
  fill: none;
`;

const PipeFlow = styledComponents.path<{ isActive?: boolean; speed?: string }>`
  stroke: ${props => (props.isActive ? props.theme.colors.accent : 'transparent')};
  stroke-width: 2;
  stroke-dasharray: 8, 16;
  fill: none;
  animation: ${flowAnimation} ${props => props.speed || '1.5s'} linear infinite;
`;

const SparklinePath = styledComponents.path<{ strokeColor: string }>`
  fill: none;
  stroke: ${props => props.strokeColor};
  stroke-width: 1.2;
`;

const FlowScheme: React.FC = () => {
  const { sensors, valves, toggleValve, status, isOnline, wsLatency } = useSimulator();

  // Локальная история для sparklines (К2: тренды и "инженерная интуиция")
  const [tempHistory, setTempHistory] = useState<number[]>([]);
  const [presHistory, setPresHistory] = useState<number[]>([]);
  const [levelHistory, setLevelHistory] = useState<number[]>([]);

  useEffect(() => {
    if (status !== 'running') return;
    
    setTempHistory(prev => [...prev.slice(-14), sensors.furnaceTemp]);
    setPresHistory(prev => [...prev.slice(-14), sensors.columnPres]);
    setLevelHistory(prev => [...prev.slice(-14), sensors.columnLevel]);
  }, [sensors, status]);

  const handleValveClick = (valveId: 'V1' | 'V2' | 'V3') => {
    if (status !== 'running') return;
    toggleValve(valveId);
  };

  // Метод генерации пути SVG для sparkline внутри прямоугольника
  // x: старт, y: старт, w: ширина, h: высота
  const generateSparklineD = (history: number[], x: number, y: number, w: number, h: number, minVal: number, maxVal: number) => {
    if (history.length < 2) return '';
    const points = history.map((val, idx) => {
      const px = x + (idx / (history.length - 1)) * w;
      // Нормируем y в пределах высоты прямоугольника
      const range = maxVal - minVal;
      const normalizedVal = range > 0 ? (val - minVal) / range : 0.5;
      const py = y + h - normalizedVal * h;
      return `${px},${py}`;
    });
    return `M ${points.join(' L ')}`;
  };

  return (
    <SchemeContainer>
      <SchemeHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={14} />
          Мнемосхема процесса: ЭЛОУ-АВТ-1
        </div>
        <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={12} color="#00e5ff" />
          <span>Спарклайны трендов активны</span>
          <span style={{ color: isOnline ? '#00ff66' : '#7c8ba1', marginLeft: '10px' }}>
            {isOnline ? `Online (ping ${wsLatency}ms)` : 'Offline (Mock)'}
          </span>
        </div>
      </SchemeHeader>
      
      <SVGCanvas viewBox="0 0 800 450">
        {/* ОПРЕДЕЛЕНИЯ ДЛЯ ГРАДИЕНТОВ И СВЕЧЕНИЯ */}
        <defs>
          <linearGradient id="furnaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2b1515" />
            <stop offset="50%" stopColor="#3d1e1e" />
            <stop offset="100%" stopColor="#1a0f0f" />
          </linearGradient>
          <linearGradient id="columnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#172237" />
            <stop offset="50%" stopColor="#1e2c47" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#111a2b" />
          </linearGradient>
        </defs>

        {/* ТРУБОПРОВОДЫ */}
        {/* Вход сырья */}
        <PipeLine d="M 50,250 L 180,250" isActive={valves.V1} />
        <PipeFlow d="M 50,250 L 180,250" isActive={valves.V1} />

        {/* Из печи в колонну */}
        <PipeLine d="M 280,250 L 400,250" isActive={valves.V1} />
        <PipeFlow d="M 280,250 L 400,250" isActive={valves.V1} speed="1s" />

        {/* Сброс давления (вверху) */}
        <PipeLine d="M 460,80 L 460,40 L 700,40" isActive={valves.V2} />
        <PipeFlow d="M 460,80 L 460,40 L 700,40" isActive={valves.V2} speed="0.8s" />

        {/* Дренаж куба колонны (снизу) */}
        <PipeLine d="M 460,370 L 460,410 L 700,410" isActive={valves.V3} />
        <PipeFlow d="M 460,370 L 460,410 L 700,410" isActive={valves.V3} />

        {/* ОБОРУДОВАНИЕ */}
        {/* 1. Нагревательная Печь П-1 */}
        <g transform="translate(180, 160)">
          <rect x="0" y="0" width="100" height="150" rx="8" fill="url(#furnaceGrad)" stroke="#ff4444" strokeWidth="1.5" />
          <text x="50" y="30" fill="#ff4444" fontSize="11" fontWeight="700" textAnchor="middle">ПЕЧЬ П-1</text>
          
          {/* Пламя печи */}
          <g transform="translate(35, 80)">
            <Flame size={30} color={valves.V1 ? "#ff6600" : "#ff3333"} style={{ opacity: valves.V1 ? 0.8 : 0.2 }} />
          </g>
        </g>

        {/* 2. Ректификационная Колонна К-1 */}
        <g transform="translate(400, 80)">
          <rect x="0" y="0" width="120" height="290" rx="20" fill="url(#columnGrad)" stroke="#3e537a" strokeWidth="2" />
          <text x="60" y="25" fill="#e1e7f0" fontSize="12" fontWeight="700" textAnchor="middle">КОЛОННА К-1</text>
          
          {/* Индикатор уровня жидкости */}
          <rect x="15" y="60" width="90" height="200" fill="#131924" rx="4" stroke="#222c3e" />
          {/* Динамическая высота жидкости */}
          <rect 
            x="15" 
            y={60 + (200 - (sensors.columnLevel / 100) * 200)} 
            width="90" 
            height={(sensors.columnLevel / 100) * 200} 
            fill="rgba(0, 229, 255, 0.15)" 
            rx="4" 
          />
          <text x="60" y="160" fill="rgba(0, 229, 255, 0.4)" fontSize="11" fontWeight="700" textAnchor="middle">
            {sensors.columnLevel}%
          </text>
        </g>

        {/* ИНТЕРАКТИВНЫЕ КЛАПАНЫ */}
        {/* Клапан V-1 (Вход в печь) */}
        <ValveGroup isOpen={valves.V1} transform="translate(100, 250)" onClick={() => handleValveClick('V1')}>
          <polygon points="-12,-10 12,10 12,-10 -12,10" />
          <circle cx="0" cy="0" r="4" />
          <text x="0" y="-16" fill="#e1e7f0" fontSize="9" textAnchor="middle">V-1</text>
        </ValveGroup>

        {/* Клапан V-2 (Сброс давления) */}
        <ValveGroup isOpen={valves.V2} transform="translate(560, 40)" onClick={() => handleValveClick('V2')}>
          <polygon points="-12,-10 12,10 12,-10 -12,10" />
          <circle cx="0" cy="0" r="4" />
          <text x="0" y="-16" fill="#e1e7f0" fontSize="9" textAnchor="middle">V-2 (Сброс)</text>
        </ValveGroup>

        {/* Клапан V-3 (Дренаж) */}
        <ValveGroup isOpen={valves.V3} transform="translate(560, 410)" onClick={() => handleValveClick('V3')}>
          <polygon points="-12,-10 12,10 12,-10 -12,10" />
          <circle cx="0" cy="0" r="4" />
          <text x="0" y="-16" fill="#e1e7f0" fontSize="9" textAnchor="middle">V-3</text>
        </ValveGroup>

        {/* ИНФОРМАТОРЫ ДАТЧИКОВ И ИХ СПАРКЛАЙНЫ */}
        {/* Датчик T-1 (Температура печи) */}
        <g transform="translate(230, 230)">
          <SensorBox 
            isWarning={sensors.furnaceTemp > 310} 
            isDanger={sensors.furnaceTemp > 325}
          >
            <rect className="bg" x="-35" y="-10" width="70" height="28" rx="4" />
            <text className="value" x="0" y="8" textAnchor="middle">{sensors.furnaceTemp}°C</text>
            <text className="label" x="0" y="-15" textAnchor="middle">T-1 (ПЕЧЬ)</text>
          </SensorBox>
          
          {/* Спарклайн под датчиком */}
          <rect x="-35" y="22" width="70" height="15" fill="#090d14" rx="2" stroke="#1d2635" strokeWidth="0.5" />
          <SparklinePath 
            d={generateSparklineD(tempHistory, -35, 22, 70, 15, 240, 340)} 
            strokeColor={sensors.furnaceTemp > 310 ? "#ff3333" : "#00ff66"} 
          />
        </g>

        {/* Датчик P-1 (Давление в колонне) */}
        <g transform="translate(630, 90)">
          <SensorBox 
            isWarning={sensors.columnPres > 0.3} 
            isDanger={sensors.columnPres > 0.4}
          >
            <rect className="bg" x="-35" y="-10" width="70" height="28" rx="4" />
            <text className="value" x="0" y="8" textAnchor="middle">{sensors.columnPres} МПа</text>
            <text className="label" x="0" y="-15" textAnchor="middle">P-1 (КОЛОННА)</text>
          </SensorBox>
          
          {/* Спарклайн под датчиком */}
          <rect x="-35" y="22" width="70" height="15" fill="#090d14" rx="2" stroke="#1d2635" strokeWidth="0.5" />
          <SparklinePath 
            d={generateSparklineD(presHistory, -35, 22, 70, 15, 0.05, 0.5)} 
            strokeColor={sensors.columnPres > 0.3 ? "#ffcc00" : "#00ff66"} 
          />
        </g>

        {/* Датчик L-1 (Уровень в колонне) */}
        <g transform="translate(460, 310)">
          <SensorBox 
            isWarning={sensors.columnLevel > 85 || sensors.columnLevel < 15} 
            isDanger={sensors.columnLevel > 95 || sensors.columnLevel < 5}
          >
            <rect className="bg" x="-35" y="-10" width="70" height="28" rx="4" />
            <text className="value" x="0" y="8" textAnchor="middle">{sensors.columnLevel}%</text>
            <text className="label" x="0" y="-15" textAnchor="middle">L-1 (УРОВЕНЬ)</text>
          </SensorBox>
          
          {/* Спарклайн под датчиком */}
          <rect x="-35" y="22" width="70" height="15" fill="#090d14" rx="2" stroke="#1d2635" strokeWidth="0.5" />
          <SparklinePath 
            d={generateSparklineD(levelHistory, -35, 22, 70, 15, 0, 100)} 
            strokeColor={(sensors.columnLevel > 85 || sensors.columnLevel < 15) ? "#ffcc00" : "#00ff66"} 
          />
        </g>
      </SVGCanvas>
    </SchemeContainer>
  );
};

export default FlowScheme;
