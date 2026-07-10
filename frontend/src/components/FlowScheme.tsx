import React, { useEffect, useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Activity, Flame, TrendingUp } from 'lucide-react';
import * as S from './FlowScheme.styles';

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
      // Ограничиваем значение в диапазоне [0, 1], чтобы линия не выходила за рамки
      const clampedVal = Math.max(0, Math.min(1, normalizedVal));
      const py = y + h - clampedVal * h;
      return `${px},${py}`;
    });
    return `M ${points.join(' L ')}`;
  };

  return (
    <S.SchemeContainer>
      <S.SchemeHeader>
        <S.HeaderTitleContainer>
          <Activity size={14} />
          Мнемосхема процесса: ЭЛОУ-АВТ-1
        </S.HeaderTitleContainer>
        <S.HeaderStatusContainer>
          <TrendingUp size={12} color="#00e5ff" />
          <span>Спарклайны трендов активны</span>
          <S.OnlineBadge isOnline={isOnline}>
            {isOnline ? `Online (ping ${wsLatency}ms)` : 'Offline (Mock)'}
          </S.OnlineBadge>
        </S.HeaderStatusContainer>
      </S.SchemeHeader>
      
      <S.SVGCanvas viewBox="0 0 800 450">
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
        <S.PipeLine d="M 50,250 L 180,250" isActive={valves.V1} />
        <S.PipeFlow d="M 50,250 L 180,250" isActive={valves.V1} />

        {/* Из печи в колонну */}
        <S.PipeLine d="M 280,250 L 400,250" isActive={valves.V1} />
        <S.PipeFlow d="M 280,250 L 400,250" isActive={valves.V1} speed="1s" />

        {/* Сброс давления (вверху) */}
        <S.PipeLine d="M 460,80 L 460,40 L 700,40" isActive={valves.V2} />
        <S.PipeFlow d="M 460,80 L 460,40 L 700,40" isActive={valves.V2} speed="0.8s" />

        {/* Дренаж куба колонны (снизу) */}
        <S.PipeLine d="M 460,370 L 460,410 L 700,410" isActive={valves.V3} />
        <S.PipeFlow d="M 460,370 L 460,410 L 700,410" isActive={valves.V3} />

        {/* ОБОРУДОВАНИЕ */}
        {/* 1. Нагревательная Печь П-1 */}
        <g transform="translate(180, 160)">
          <rect x="0" y="0" width="100" height="150" rx="8" fill="url(#furnaceGrad)" stroke="#ff4444" strokeWidth="1.5" />
          <text x="50" y="30" fill="#ff4444" fontSize="11" fontWeight="700" textAnchor="middle">ПЕЧЬ П-1</text>
          
          {/* Пламя печи */}
          <S.FlameWrapper isActive={valves.V1} transform="translate(35, 112)">
            <Flame size={30} color={valves.V1 ? "#ff6600" : "#ff3333"} />
          </S.FlameWrapper>
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
        <S.ValveGroup isOpen={valves.V1} transform="translate(100, 250)" onClick={() => handleValveClick('V1')}>
          <polygon points="-12,-10 12,10 12,-10 -12,10" />
          <circle cx="0" cy="0" r="4" />
          <text x="0" y="-16" fill="#e1e7f0" fontSize="9" textAnchor="middle">V-1</text>
        </S.ValveGroup>

        {/* Клапан V-2 (Сброс давления) */}
        <S.ValveGroup isOpen={valves.V2} transform="translate(560, 40)" onClick={() => handleValveClick('V2')}>
          <polygon points="-12,-10 12,10 12,-10 -12,10" />
          <circle cx="0" cy="0" r="4" />
          <text x="0" y="-16" fill="#e1e7f0" fontSize="9" textAnchor="middle">V-2 (Сброс)</text>
        </S.ValveGroup>

        {/* Клапан V-3 (Дренаж) */}
        <S.ValveGroup isOpen={valves.V3} transform="translate(560, 410)" onClick={() => handleValveClick('V3')}>
          <polygon points="-12,-10 12,10 12,-10 -12,10" />
          <circle cx="0" cy="0" r="4" />
          <text x="0" y="-16" fill="#e1e7f0" fontSize="9" textAnchor="middle">V-3</text>
        </S.ValveGroup>

        {/* ИНФОРМАТОРЫ ДАТЧИКОВ И ИХ СПАРКЛАЙНЫ */}
        {/* Датчик T-1 (Температура печи) */}
        <g transform="translate(230, 230)">
          <S.SensorBox 
            isWarning={sensors.furnaceTemp > 310} 
            isDanger={sensors.furnaceTemp > 325}
          >
            <rect className="bg" x="-35" y="-10" width="70" height="28" rx="4" />
            <text className="value" x="0" y="8" textAnchor="middle">{sensors.furnaceTemp}°C</text>
            <text className="label" x="0" y="-15" textAnchor="middle">T-1 (ПЕЧЬ)</text>
          </S.SensorBox>
          
          {/* Спарклайн под датчиком */}
          <rect x="-35" y="22" width="70" height="15" fill="#090d14" rx="2" stroke="#1d2635" strokeWidth="0.5" />
          <S.SparklinePath 
            d={generateSparklineD(tempHistory, -35, 22, 70, 15, 240, 340)} 
            strokeColor={sensors.furnaceTemp > 310 ? "#ff3333" : "#00ff66"} 
          />
        </g>

        {/* Датчик P-1 (Давление в колонне) */}
        <g transform="translate(630, 90)">
          <S.SensorBox 
            isWarning={sensors.columnPres > 0.3} 
            isDanger={sensors.columnPres > 0.4}
          >
            <rect className="bg" x="-35" y="-10" width="70" height="28" rx="4" />
            <text className="value" x="0" y="8" textAnchor="middle">{sensors.columnPres} МПа</text>
            <text className="label" x="0" y="-15" textAnchor="middle">P-1 (КОЛОННА)</text>
          </S.SensorBox>
          
          {/* Спарклайн под датчиком */}
          <rect x="-35" y="22" width="70" height="15" fill="#090d14" rx="2" stroke="#1d2635" strokeWidth="0.5" />
          <S.SparklinePath 
            d={generateSparklineD(presHistory, -35, 22, 70, 15, 0.05, 0.5)} 
            strokeColor={sensors.columnPres > 0.3 ? "#ffcc00" : "#00ff66"} 
          />
        </g>

        {/* Датчик L-1 (Уровень в колонне) */}
        <g transform="translate(460, 310)">
          <S.SensorBox 
            isWarning={sensors.columnLevel > 85 || sensors.columnLevel < 15} 
            isDanger={sensors.columnLevel > 95 || sensors.columnLevel < 5}
          >
            <rect className="bg" x="-35" y="-10" width="70" height="28" rx="4" />
            <text className="value" x="0" y="8" textAnchor="middle">{sensors.columnLevel}%</text>
            <text className="label" x="0" y="-15" textAnchor="middle">L-1 (УРОВЕНЬ)</text>
          </S.SensorBox>
          
          {/* Спарклайн под датчиком */}
          <rect x="-35" y="22" width="70" height="15" fill="#090d14" rx="2" stroke="#1d2635" strokeWidth="0.5" />
          <S.SparklinePath 
            d={generateSparklineD(levelHistory, -35, 22, 70, 15, 0, 100)} 
            strokeColor={(sensors.columnLevel > 85 || sensors.columnLevel < 15) ? "#ffcc00" : "#00ff66"} 
          />
        </g>
      </S.SVGCanvas>
    </S.SchemeContainer>
  );
};

export default FlowScheme;
