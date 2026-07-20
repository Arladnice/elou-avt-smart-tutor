import React, { useEffect, useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Activity, Flame, TrendingUp } from 'lucide-react';
import * as S from './FlowScheme.styles';

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

const FlowScheme: React.FC = () => {
  const { sensors, valves, toggleValve, status, isOnline, wsLatency, defects } = useSimulator();

  // Локальная история для sparklines (К2: тренды и "инженерная интуиция")
  const [tempHistory, setTempHistory] = useState<number[]>([]);
  const [presHistory, setPresHistory] = useState<number[]>([]);
  const [levelHistory, setLevelHistory] = useState<number[]>([]);

  useEffect(() => {
    if (status !== 'running') return;
    
    setTempHistory(prev => [...prev.slice(-14), sensors.T_1]);
    setPresHistory(prev => [...prev.slice(-14), sensors.P_1]);
    setLevelHistory(prev => [...prev.slice(-14), sensors.L_1]);
  }, [sensors, status]);

  const handleValveClick = (valveId: 'V_1' | 'V_2' | 'V_3') => {
    if (status !== 'running') return;
    toggleValve(valveId);
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
        <S.PipeLine d="M 50,250 L 180,250" isActive={valves.V_1} />
        <S.PipeFlow d="M 50,250 L 180,250" isActive={valves.V_1} />

        {/* Сырьевой насос Н-1 */}
        <g transform="translate(45, 250)">
          <circle 
            cx="0" 
            cy="0" 
            r="12" 
            fill="#131924" 
            stroke={(defects?.pump_fail || defects?.power_fail) ? "#ff4d4f" : "#e1e7f0"} 
            strokeWidth={(defects?.pump_fail || defects?.power_fail) ? "2" : "1.5"} 
          />
          <polygon points="-4,-6 -4,6 6,0" fill={(defects?.pump_fail || defects?.power_fail) ? "#ff4d4f" : "#e1e7f0"} />
          <text 
            x="0" 
            y="-18" 
            fill={(defects?.pump_fail || defects?.power_fail) ? "#ff4d4f" : "#e1e7f0"} 
            fontSize="9" 
            textAnchor="middle" 
            fontWeight="bold"
          >
            {defects?.power_fail ? "Н-1 (0В)" : "Н-1"}
          </text>
        </g>

        {/* Из печи в колонну */}
        <S.PipeLine d="M 280,250 L 400,250" isActive={valves.V_1} />
        <S.PipeFlow d="M 280,250 L 400,250" isActive={valves.V_1} speed="1s" />

        {/* Сброс давления (вверху) */}
        <S.PipeLine d="M 460,80 L 460,40 L 700,40" isActive={valves.V_2} />
        <S.PipeFlow d="M 460,80 L 460,40 L 700,40" isActive={valves.V_2} speed="0.8s" />

        {/* Дренаж куба колонны (снизу) */}
        <S.PipeLine d="M 460,370 L 460,410 L 700,410" isActive={valves.V_3} />
        <S.PipeFlow d="M 460,370 L 460,410 L 700,410" isActive={valves.V_3} />

        {/* ОБОРУДОВАНИЕ */}
        {/* 1. Нагревательная Печь П-1 */}
        <g transform="translate(180, 160)">
          <rect x="0" y="0" width="100" height="150" rx="8" fill="url(#furnaceGrad)" stroke={(defects?.coil_overheat || defects?.power_fail) ? "#ff4444" : "#ff4444"} strokeWidth={(defects?.coil_overheat || defects?.power_fail) ? "2.5" : "1.5"} />
          <text x="50" y="30" fill="#ff4444" fontSize="11" fontWeight="700" textAnchor="middle">
            {defects?.power_fail ? "ПЕЧЬ (0В)" : "ПЕЧЬ П-1"}
          </text>
          
          {/* Пламя печи */}
          <S.FlameWrapper isActive={valves.V_1 && !defects?.power_fail} transform="translate(35, 112)">
            <Flame size={30} color={(valves.V_1 && !defects?.power_fail) ? "#ff6600" : "#ff3333"} />
          </S.FlameWrapper>
        </g>

        {/* 2. Ректификационная Колонна К-1 */}
        <g transform="translate(400, 80)">
          <rect x="0" y="0" width="120" height="290" rx="20" fill="url(#columnGrad)" stroke={defects?.steam_fail ? "#ff4d4f" : "#3e537a"} strokeWidth={defects?.steam_fail ? "2.5" : "2"} />
          <text x="60" y="25" fill={defects?.steam_fail ? "#ff4d4f" : "#e1e7f0"} fontSize="11" fontWeight="700" textAnchor="middle">
            {defects?.steam_fail ? "К-1 (СРЫВ ПАРА)" : "КОЛОННА К-1"}
          </text>
          
          {/* Индикатор уровня жидкости */}
          <rect x="15" y="60" width="90" height="200" fill="#131924" rx="4" stroke="#222c3e" />
          {/* Динамическая высота жидкости */}
          <rect 
            x="15" 
            y={60 + (200 - (sensors.L_1 / 100) * 200)} 
            width="90" 
            height={(sensors.L_1 / 100) * 200} 
            fill="rgba(0, 229, 255, 0.15)" 
            rx="4" 
          />
          <text x="60" y="160" fill="rgba(0, 229, 255, 0.4)" fontSize="11" fontWeight="700" textAnchor="middle">
            {sensors.L_1}%
          </text>
        </g>

        {/* ИНТЕРАКТИВНЫЕ КЛАПАНЫ */}
        {/* Клапан V-1 (Вход в печь) */}
        <S.ValveGroup isOpen={valves.V_1} transform="translate(100, 250)" onClick={() => handleValveClick('V_1')}>
          <polygon points="-12,-10 12,10 12,-10 -12,10" />
          <circle cx="0" cy="0" r="4" fill={defects?.air_fail ? "#ffcc00" : undefined} />
          <text x="0" y="-16" fill={defects?.air_fail ? "#ffcc00" : "#e1e7f0"} fontSize="9" textAnchor="middle">
            {defects?.air_fail ? "V-1 (КИПиА)" : "V-1"}
          </text>
        </S.ValveGroup>

        {/* Клапан V-2 (Сброс давления) */}
        <S.ValveGroup isOpen={valves.V_2} transform="translate(560, 40)" onClick={() => handleValveClick('V_2')}>
          <polygon points="-12,-10 12,10 12,-10 -12,10" />
          <circle cx="0" cy="0" r="4" fill={defects?.air_fail ? "#ffcc00" : undefined} />
          <text x="0" y="-16" fill={defects?.air_fail ? "#ffcc00" : "#e1e7f0"} fontSize="9" textAnchor="middle">
            {defects?.air_fail ? "V-2 (КИПиА)" : "V-2 (Сброс)"}
          </text>
        </S.ValveGroup>

        {/* Клапан V-3 (Дренаж) */}
        <S.ValveGroup isOpen={valves.V_3} transform="translate(560, 410)" onClick={() => handleValveClick('V_3')}>
          <polygon points="-12,-10 12,10 12,-10 -12,10" />
          <circle cx="0" cy="0" r="4" fill={defects?.air_fail ? "#ffcc00" : undefined} />
          <text x="0" y="-16" fill={defects?.air_fail ? "#ffcc00" : "#e1e7f0"} fontSize="9" textAnchor="middle">
            {defects?.air_fail ? "V-3 (КИПиА)" : "V-3"}
          </text>
        </S.ValveGroup>

        {/* ИНФОРМАТОРЫ ДАТЧИКОВ И ИХ СПАРКЛАЙНЫ */}
        {/* Датчик T-1 (Температура печи) */}
        <g transform="translate(230, 230)">
          <S.SensorBox 
            isWarning={sensors.T_1 > 310} 
            isDanger={sensors.T_1 > 325}
          >
            <rect className="bg" x="-35" y="-10" width="70" height="28" rx="4" />
            <text className="value" x="0" y="8" textAnchor="middle">{sensors.T_1}°C</text>
            <text className="label" x="0" y="-15" textAnchor="middle">T-1 (ПЕЧЬ)</text>
          </S.SensorBox>
          
          {/* Спарклайн под датчиком */}
          <rect x="-35" y="22" width="70" height="15" fill="#090d14" rx="2" stroke="#1d2635" strokeWidth="0.5" />
          <S.SparklinePath 
            d={generateSparklineD(tempHistory, -35, 22, 70, 15, 240, 340)} 
            strokeColor={sensors.T_1 > 310 ? "#ff3333" : "#00ff66"} 
          />
        </g>

        {/* Датчик P-1 (Давление в колонне) */}
        <g transform="translate(630, 90)">
          <S.SensorBox 
            isWarning={sensors.P_1 > 0.3} 
            isDanger={sensors.P_1 > 0.4}
          >
            <rect className="bg" x="-35" y="-10" width="70" height="28" rx="4" />
            <text className="value" x="0" y="8" textAnchor="middle">{sensors.P_1} МПа</text>
            <text className="label" x="0" y="-15" textAnchor="middle">P-1 (КОЛОННА)</text>
          </S.SensorBox>
          
          {/* Спарклайн под датчиком */}
          <rect x="-35" y="22" width="70" height="15" fill="#090d14" rx="2" stroke="#1d2635" strokeWidth="0.5" />
          <S.SparklinePath 
            d={generateSparklineD(presHistory, -35, 22, 70, 15, 0.05, 0.5)} 
            strokeColor={sensors.P_1 > 0.3 ? "#ffcc00" : "#00ff66"} 
          />
        </g>

        {/* Датчик L-1 (Уровень в колонне) */}
        <g transform="translate(460, 310)">
          <S.SensorBox 
            isWarning={sensors.L_1 > 85 || sensors.L_1 < 15} 
            isDanger={sensors.L_1 > 95 || sensors.L_1 < 5}
          >
            <rect className="bg" x="-35" y="-10" width="70" height="28" rx="4" />
            <text className="value" x="0" y="8" textAnchor="middle">{sensors.L_1}%</text>
            <text className="label" x="0" y="-15" textAnchor="middle">L-1 (УРОВЕНЬ)</text>
          </S.SensorBox>
          
          {/* Спарклайн под датчиком */}
          <rect x="-35" y="22" width="70" height="15" fill="#090d14" rx="2" stroke="#1d2635" strokeWidth="0.5" />
          <S.SparklinePath 
            d={generateSparklineD(levelHistory, -35, 22, 70, 15, 0, 100)} 
            strokeColor={(sensors.L_1 > 85 || sensors.L_1 < 15) ? "#ffcc00" : "#00ff66"} 
          />
        </g>
      </S.SVGCanvas>
    </S.SchemeContainer>
  );
};

export default FlowScheme;
