import React, { useState } from 'react';
import { useTelemetry } from '@/entities/telemetry';
import { useSession } from '@/entities/session';
import { useSimulatorActions } from '@/entities/simulator';
import { Activity, Flame, TrendingUp } from 'lucide-react';
import {
  K1_LEVEL_FULL_SCALE_MM,
  K2_LEVEL_FULL_SCALE_MM,
  K2_LEVEL_HIGH,
  K2_LEVEL_LOW,
  K2_LEVEL_LOW_CRITICAL,
  K2_PRESSURE_CRITICAL,
  K2_PRESSURE_WARNING,
  K2_TEMP_CRITICAL,
  K2_TEMP_WARNING,
} from '@/shared/config/thresholds';
import type { EquipmentId } from '../model/equipmentCatalog';
import EquipmentDrawer from './EquipmentDrawer';
import * as S from './FlowScheme.styles';

const generateSparklineD = (history: number[], x: number, y: number, w: number, h: number, minVal: number, maxVal: number) => {
  if (history.length < 2) return '';
  const points = history.map((val, idx) => {
    const px = x + (idx / (history.length - 1)) * w;
    const range = maxVal - minVal;
    const normalizedVal = range > 0 ? (val - minVal) / range : 0.5;
    const clampedVal = Math.max(0, Math.min(1, normalizedVal));
    const py = y + h - clampedVal * h;
    return `${px},${py}`;
  });
  return `M ${points.join(' L ')}`;
};

interface EquipmentInfoMarkerProps {
  equipmentId: EquipmentId;
  transform: string;
  onOpen: (equipmentId: EquipmentId) => void;
}

const EquipmentInfoMarker: React.FC<EquipmentInfoMarkerProps> = ({ equipmentId, transform, onOpen }) => {
  const openCard = (event: React.MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    onOpen(equipmentId);
  };

  const openCardFromKeyboard = (event: React.KeyboardEvent<SVGGElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    onOpen(equipmentId);
  };

  return (
    <S.EquipmentInfoGroup
      transform={transform}
      role="button"
      tabIndex={0}
      aria-label={`Открыть карточку ${equipmentId.replace('_', '-')}`}
      onClick={openCard}
      onKeyDown={openCardFromKeyboard}
    >
      <title>Открыть карточку оборудования</title>
      <circle cx="0" cy="0" r="5" />
      <text x="0" y="2.5" textAnchor="middle">i</text>
    </S.EquipmentInfoGroup>
  );
};

const FlowScheme: React.FC = () => {
  const { sensors, valves, status, defects, telemetryHistory, wsLatency } = useTelemetry();
  const { isOnline } = useSession();
  const { toggleValve } = useSimulatorActions();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<EquipmentId | null>(null);

  // Спарклайны берут те же точки, что и предиктивный график (SimulatorContext)
  const sparklineWindow = telemetryHistory.slice(-15);
  const tempHistory = sparklineWindow.map(p => p.T_1);
  const presHistory = sparklineWindow.map(p => p.P_1);
  const levelHistory = sparklineWindow.map(p => p.L_1);
  const k2LevelHistory = sparklineWindow.map(p => p.L_2);

  const handleValveClick = (valveId: 'V_1' | 'V_2' | 'V_3' | 'V_ELOU' | 'V_VT') => {
    if (status !== 'running') return;
    toggleValve(valveId);
  };

  const handleEquipmentKeyDown = (event: React.KeyboardEvent<SVGGElement>, equipmentId: EquipmentId) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setSelectedEquipmentId(equipmentId);
  };

  return (
    <>
      <S.SchemeContainer>
      <S.SchemeHeader>
        <S.HeaderTitleContainer>
          <Activity size={14} />
          Сквозная мнемосхема процесса: ЭЛОУ-АВТ-1
        </S.HeaderTitleContainer>
        <S.HeaderStatusContainer>
          <TrendingUp size={12} color="#00e5ff" />
          <span>Спарклайны трендов активны</span>
          <S.OnlineBadge $isOnline={isOnline}>
            {isOnline ? `Online (ping ${wsLatency}ms)` : 'Offline (Mock)'}
          </S.OnlineBadge>
        </S.HeaderStatusContainer>
      </S.SchemeHeader>
      
      <S.SVGCanvas viewBox="0 0 1020 460">
        <defs>
          <linearGradient id="elouGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1c2536" />
            <stop offset="100%" stopColor="#0f1522" />
          </linearGradient>
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
          <linearGradient id="vtGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#251a36" />
            <stop offset="100%" stopColor="#130e1d" />
          </linearGradient>
        </defs>

        {/* СЕКЦИОННЫЕ РАЗДЕЛИТЕЛИ И ПЛАШКИ УРОВНЕЙ ДЕТАЛИЗАЦИИ */}
        {/* Блок 1: ЭЛОУ */}
        <g transform="translate(10, 10)">
          <rect x="0" y="0" width="225" height="440" rx="6" fill="rgba(255,255,255,0.01)" stroke="#1a2333" strokeDasharray="4 4" />
          <text x="112" y="22" fill="#e1e7f0" fontSize="10" fontWeight="700" textAnchor="middle">БЛОК 1: ЭЛОУ</text>
          <S.BlockFidelityBadge $level="aggregated" transform="translate(62, 28)">
            <rect x="0" y="0" width="100" height="14" />
            <text x="50" y="10">Агрегированная модель</text>
          </S.BlockFidelityBadge>
        </g>

        {/* Блок 2: АТ */}
        <g transform="translate(245, 10)">
          <rect x="0" y="0" width="480" height="440" rx="6" fill="rgba(255,255,255,0.01)" stroke="#1a2333" strokeDasharray="4 4" />
          <text x="240" y="22" fill="#e1e7f0" fontSize="10" fontWeight="700" textAnchor="middle">БЛОК 2: АТМОСФЕРНЫЙ (АТ)</text>
          <S.BlockFidelityBadge $level="detailed" transform="translate(190, 28)">
            <rect x="0" y="0" width="100" height="14" />
            <text x="50" y="10">Детальная физика</text>
          </S.BlockFidelityBadge>
        </g>

        {/* Блок 3: ВТ */}
        <g transform="translate(735, 10)">
          <rect x="0" y="0" width="275" height="440" rx="6" fill="rgba(255,255,255,0.01)" stroke="#1a2333" strokeDasharray="4 4" />
          <text x="137" y="22" fill="#e1e7f0" fontSize="10" fontWeight="700" textAnchor="middle">БЛОК 3: ВАКУУМНЫЙ (ВТ)</text>
          <S.BlockFidelityBadge $level="aggregated" transform="translate(87, 28)">
            <rect x="0" y="0" width="100" height="14" />
            <text x="50" y="10">Агрегированная модель</text>
          </S.BlockFidelityBadge>
        </g>

        {/* ТРУБОПРОВОДЫ МЕЖБЛОЧНЫЕ */}
        {/* Подача реагента/деэмульгатора сверху в Э-1 */}
        <S.PipeLine d="M 125,58 L 125,120" $isActive={valves.V_ELOU} />
        <S.PipeFlow d="M 125,58 L 125,120" $isActive={valves.V_ELOU} />

        {/* Вход сырой нефти в ЭЛОУ */}
        <S.PipeLine d="M 25,200 L 75,200" $isActive={true} />
        <S.PipeFlow d="M 25,200 L 75,200" $isActive={true} />

        {/* Прямая подача из ЭЛОУ через Н-20 и V-1 в К-1 */}
        <S.PipeLine d="M 175,200 L 245,200 L 245,105 L 500,105 L 500,200 L 530,200" $isActive={valves.V_1} />
        <S.PipeFlow d="M 175,200 L 245,200 L 245,105 L 500,105 L 500,200 L 530,200" $isActive={valves.V_1} />

        {/* Агрегированный возврат нагретого потока из печной группы в К-1 */}
        <S.PipeLine d="M 430,200 L 530,200" $isActive={valves.V_1} />
        <S.PipeFlow d="M 430,200 L 530,200" $isActive={valves.V_1} $speed="1s" />

        {/* Сброс давления К-1 */}
        <S.PipeLine d="M 585,80 L 585,58 L 710,58" $isActive={valves.V_2} />
        <S.PipeFlow d="M 585,80 L 585,58 L 710,58" $isActive={valves.V_2} $speed="0.8s" />

        {/* Из куба К-1 в ВТ (Мазутопровод) */}
        <S.PipeLine d="M 585,350 L 585,415 L 770,415 L 770,200 L 800,200" $isActive={valves.V_3} />
        <S.PipeFlow d="M 585,350 L 585,415 L 770,415 L 770,200 L 800,200" $isActive={valves.V_3} />

        {/* Отсос вакуумных паров из К-2 в ПЭУ */}
        <S.PipeLine d="M 845,140 L 845,115 L 920,115" $isActive={valves.V_VT} />
        <S.PipeFlow d="M 845,140 L 845,115 L 920,115" $isActive={valves.V_VT} $speed="0.8s" />

        {/* Подача пара в ПЭУ сверху */}
        <S.PipeLine d="M 920,55 L 920,100" $isActive={valves.V_VT} />
        <S.PipeFlow d="M 920,55 L 920,100" $isActive={valves.V_VT} />

        {/* ОБОРУДОВАНИЕ БЛОКА 1: ЭЛОУ */}
        {/* Сырьевой насос Н-1 */}
        <S.EquipmentGroup
          transform="translate(45, 200)"
          role="button"
          tabIndex={0}
          aria-label="Открыть карточку сырьевого насоса Н-1"
          $isAlert={Boolean(defects?.pump_fail || defects?.power_fail)}
          onClick={() => setSelectedEquipmentId('N_1')}
          onKeyDown={event => handleEquipmentKeyDown(event, 'N_1')}
        >
          <title>Н-1 · Открыть карточку оборудования</title>
          <circle className="equipment-hitbox" cx="0" cy="0" r="19" />
          <circle cx="0" cy="0" r="11" fill="#131924" stroke={(defects?.pump_fail || defects?.power_fail) ? "#ff4d4f" : "#e1e7f0"} strokeWidth="1.5" />
          <polygon points="-4,-5 -4,5 5,0" fill={(defects?.pump_fail || defects?.power_fail) ? "#ff4d4f" : "#e1e7f0"} />
          <text x="0" y="-16" fill="#e1e7f0" fontSize="8" textAnchor="middle" fontWeight="bold">Н-1</text>
        </S.EquipmentGroup>

        {/* Насос Н-20 после блока ЭЛОУ */}
        <S.EquipmentGroup
          transform="translate(215, 200)"
          role="button"
          tabIndex={0}
          aria-label="Открыть карточку насоса Н-20"
          $isAlert={Boolean(defects?.pump_fail || defects?.power_fail)}
          onClick={() => setSelectedEquipmentId('N_20')}
          onKeyDown={event => handleEquipmentKeyDown(event, 'N_20')}
        >
          <title>Н-20 · Открыть карточку оборудования</title>
          <circle className="equipment-hitbox" cx="0" cy="0" r="18" />
          <circle cx="0" cy="0" r="10" fill="#131924" stroke="#e1e7f0" strokeWidth="1.5" />
          <polygon points="-4,-5 -4,5 5,0" fill="#e1e7f0" />
          <text x="0" y="-15" fill="#e1e7f0" fontSize="8" textAnchor="middle" fontWeight="bold">Н-20</text>
        </S.EquipmentGroup>

        {/* Электродегидратор Э-1 */}
        <S.EquipmentGroup
          transform="translate(75, 120)"
          role="button"
          tabIndex={0}
          aria-label="Открыть карточку электродегидратора Э-1"
          $isAlert={Boolean(defects?.elou_desalt_fail || defects?.power_fail)}
          onClick={() => setSelectedEquipmentId('E_1')}
          onKeyDown={event => handleEquipmentKeyDown(event, 'E_1')}
        >
          <title>Э-1 · Открыть карточку оборудования</title>
          <rect className="equipment-hitbox" x="-5" y="-5" width="110" height="140" rx="18" />
          <rect x="0" y="0" width="100" height="130" rx="15" fill="url(#elouGrad)" stroke={defects?.elou_desalt_fail ? "#ffcc00" : "#00e5ff"} strokeWidth={defects?.elou_desalt_fail ? "2.5" : "1.5"} />
          <text x="50" y="24" fill={defects?.elou_desalt_fail ? "#ffcc00" : "#00e5ff"} fontSize="10" fontWeight="700" textAnchor="middle">
            {defects?.elou_desalt_fail ? "Э-1 (СБОЙ)" : "ЭЛОУ Э-1"}
          </text>
          {/* Электроды */}
          <line x1="20" y1="50" x2="80" y2="50" stroke="#00e5ff" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="20" y1="68" x2="80" y2="68" stroke="#00e5ff" strokeWidth="2" strokeDasharray="4 2" />
          <text x="50" y="96" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">Электродегидратор</text>
        </S.EquipmentGroup>

        {/* Клапан V_ELOU (Деэмульгатор) */}
        <S.ValveGroup $isOpen={valves.V_ELOU} transform="translate(125, 80)" onClick={() => handleValveClick('V_ELOU')}>
          <polygon points="-10,-8 10,8 10,-8 -10,8" />
          <circle cx="0" cy="0" r="3" />
          <text x="22" y="3" fill="#e1e7f0" fontSize="8" textAnchor="start">V-ELOU</text>
          <EquipmentInfoMarker equipmentId="V_ELOU" transform="translate(13, 14)" onOpen={setSelectedEquipmentId} />
        </S.ValveGroup>

        {/* Датчики ЭЛОУ: Sal-1 и W-1 */}
        <g transform="translate(68, 290)">
          <S.SensorBox $isWarning={sensors.Sal_1 > 10} $isDanger={sensors.Sal_1 > 25}>
            <rect className="bg" x="0" y="0" width="55" height="24" rx="4" />
            <text className="value" x="27" y="15" fontSize="10" textAnchor="middle">{sensors.Sal_1}</text>
            <text className="label" x="27" y="-5" fontSize="8" textAnchor="middle">Sal-1 (СОЛИ)</text>
          </S.SensorBox>
        </g>

        <g transform="translate(132, 290)">
          <S.SensorBox $isWarning={sensors.W_1 > 0.5} $isDanger={sensors.W_1 > 1.5}>
            <rect className="bg" x="0" y="0" width="55" height="24" rx="4" />
            <text className="value" x="27" y="15" fontSize="10" textAnchor="middle">{sensors.W_1}%</text>
            <text className="label" x="27" y="-5" fontSize="8" textAnchor="middle">W-1 (ВОДА)</text>
          </S.SensorBox>
        </g>

        {/* ОБОРУДОВАНИЕ БЛОКА 2: АТМОСФЕРНЫЙ (АТ) */}
        {/* Клапан V-1 */}
        <S.ValveGroup $isOpen={valves.V_1} transform="translate(285, 105)" onClick={() => handleValveClick('V_1')}>
          <polygon points="-10,-8 10,8 10,-8 -10,8" />
          <circle cx="0" cy="0" r="3" fill={defects?.air_fail ? "#ffcc00" : undefined} />
          <text x="0" y="-13" fill="#e1e7f0" fontSize="8" textAnchor="middle">V-1</text>
          <EquipmentInfoMarker equipmentId="V_1" transform="translate(14, 14)" onOpen={setSelectedEquipmentId} />
        </S.ValveGroup>

        {/* Печь П-1 */}
        <S.EquipmentGroup
          transform="translate(320, 130)"
          role="button"
          tabIndex={0}
          aria-label="Открыть карточку печи П-1"
          $isAlert={Boolean(defects?.coil_overheat || defects?.power_fail)}
          onClick={() => setSelectedEquipmentId('P_1')}
          onKeyDown={event => handleEquipmentKeyDown(event, 'P_1')}
        >
          <title>П-1 · Открыть карточку оборудования</title>
          <rect className="equipment-hitbox" x="-5" y="-5" width="120" height="150" rx="10" />
          <rect x="0" y="0" width="110" height="140" rx="8" fill="url(#furnaceGrad)" stroke={(defects?.coil_overheat || defects?.power_fail) ? "#ff4444" : "#ff4444"} strokeWidth={(defects?.coil_overheat || defects?.power_fail) ? "2.5" : "1.5"} />
          <text x="55" y="24" fill="#ff4444" fontSize="10" fontWeight="700" textAnchor="middle">ПЕЧЬ П-1</text>
          <S.FlameWrapper $isActive={valves.V_1 && !defects?.power_fail} transform="translate(41, 95)">
            <Flame size={28} color={(valves.V_1 && !defects?.power_fail) ? "#ff6600" : "#ff3333"} />
          </S.FlameWrapper>
        </S.EquipmentGroup>

        {/* Датчик T-1 печи + sparkline ниже печи */}
        <g transform="translate(375, 310)">
          <S.SensorBox $isWarning={sensors.T_1 > 310} $isDanger={sensors.T_1 > 325}>
            <rect className="bg" x="-35" y="-10" width="70" height="26" rx="4" />
            <text className="value" x="0" y="7" textAnchor="middle">{sensors.T_1}°C</text>
            <text className="label" x="0" y="-13" textAnchor="middle">T-1 (ПЕЧЬ)</text>
          </S.SensorBox>
          <rect x="-35" y="20" width="70" height="12" fill="#090d14" rx="2" stroke="#1d2635" strokeWidth="0.5" />
          <S.SparklinePath d={generateSparklineD(tempHistory, -35, 20, 70, 12, 240, 340)} $strokeColor={sensors.T_1 > 310 ? "#ff3333" : "#00ff66"} />
        </g>

        {/* Колонна К-1 */}
        <S.EquipmentGroup
          transform="translate(530, 80)"
          role="button"
          tabIndex={0}
          aria-label="Открыть карточку атмосферной колонны К-1"
          $isAlert={Boolean(defects?.steam_fail || defects?.power_fail)}
          onClick={() => setSelectedEquipmentId('K_1')}
          onKeyDown={event => handleEquipmentKeyDown(event, 'K_1')}
        >
          <title>К-1 · Открыть карточку оборудования</title>
          <rect className="equipment-hitbox" x="-5" y="-5" width="120" height="280" rx="21" />
          <rect x="0" y="0" width="110" height="270" rx="18" fill="url(#columnGrad)" stroke={defects?.steam_fail ? "#ff4d4f" : "#3e537a"} strokeWidth={defects?.steam_fail ? "2.5" : "2"} />
          <text x="55" y="22" fill={defects?.steam_fail ? "#ff4d4f" : "#e1e7f0"} fontSize="10" fontWeight="700" textAnchor="middle">
            {defects?.steam_fail ? "К-1 (СРЫВ ПАРА)" : "КОЛОННА К-1"}
          </text>
          {/* Индикатор уровня только в кубовой части колонны: 100% = 2000 мм */}
          <rect x="15" y="195" width="80" height="50" fill="#131924" rx="4" stroke="#222c3e" />
          <rect x="15" y={195 + (50 - (sensors.L_1 / 100) * 50)} width="80" height={(sensors.L_1 / 100) * 50} fill="rgba(0, 229, 255, 0.2)" rx="4" />
          <text x="55" y="188" fill="#7c8ba1" fontSize="7" textAnchor="middle">Кубовая часть · 2000 мм</text>
        </S.EquipmentGroup>

        {/* Датчик L-1 уровня ниже колонны */}
        <g transform="translate(585, 390)">
          <S.SensorBox $isWarning={sensors.L_1 > 85 || sensors.L_1 < 15} $isDanger={sensors.L_1 > 95 || sensors.L_1 < 5}>
            <rect className="bg" x="-68" y="-10" width="136" height="26" rx="4" />
            <text className="value" x="0" y="7" textAnchor="middle">
              {Math.round((sensors.L_1 / 100) * K1_LEVEL_FULL_SCALE_MM)} мм · {sensors.L_1}%
            </text>
            <text className="label" x="0" y="-13" textAnchor="middle">L-1 (УРОВЕНЬ)</text>
          </S.SensorBox>
          <rect x="-68" y="20" width="136" height="12" fill="#090d14" rx="2" stroke="#1d2635" strokeWidth="0.5" />
          <S.SparklinePath d={generateSparklineD(levelHistory, -68, 20, 136, 12, 0, 100)} $strokeColor={(sensors.L_1 > 85 || sensors.L_1 < 15) ? "#ffcc00" : "#00ff66"} />
        </g>

        {/* Клапаны V-2 и V-3 */}
        <S.ValveGroup $isOpen={valves.V_2} transform="translate(650, 58)" onClick={() => handleValveClick('V_2')}>
          <polygon points="-10,-8 10,8 10,-8 -10,8" />
          <circle cx="0" cy="0" r="3" />
          <text x="0" y="-13" fill="#e1e7f0" fontSize="8" textAnchor="middle">V-2 (Сброс)</text>
          <EquipmentInfoMarker equipmentId="V_2" transform="translate(14, 14)" onOpen={setSelectedEquipmentId} />
        </S.ValveGroup>

        <S.ValveGroup $isOpen={valves.V_3} transform="translate(685, 415)" onClick={() => handleValveClick('V_3')}>
          <polygon points="-10,-8 10,8 10,-8 -10,8" />
          <circle cx="0" cy="0" r="3" />
          <text x="0" y="-13" fill="#e1e7f0" fontSize="8" textAnchor="middle">V-3</text>
          <EquipmentInfoMarker equipmentId="V_3" transform="translate(14, 14)" onOpen={setSelectedEquipmentId} />
        </S.ValveGroup>

        {/* Датчик P-1 справа от колонны К-1 */}
        <g transform="translate(675, 110)">
          <S.SensorBox $isWarning={sensors.P_1 > 0.3} $isDanger={sensors.P_1 > 0.4}>
            <rect className="bg" x="-32" y="-10" width="64" height="26" rx="4" />
            <text className="value" x="0" y="7" textAnchor="middle">{sensors.P_1} МПа</text>
            <text className="label" x="0" y="-13" textAnchor="middle">P-1 (КОЛОННА)</text>
          </S.SensorBox>
          <rect x="-32" y="20" width="64" height="12" fill="#090d14" rx="2" stroke="#1d2635" strokeWidth="0.5" />
          <S.SparklinePath d={generateSparklineD(presHistory, -32, 20, 64, 12, 0.05, 0.5)} $strokeColor={sensors.P_1 > 0.3 ? "#ffcc00" : "#00ff66"} />
        </g>

        {/* ОБОРУДОВАНИЕ БЛОКА 3: ВАКУУМНЫЙ (ВТ) */}
        {/* Колонна К-2 */}
        <S.EquipmentGroup
          transform="translate(800, 140)"
          role="button"
          tabIndex={0}
          aria-label="Открыть карточку вакуумной колонны К-2"
          $isAlert={Boolean(defects?.vt_vacuum_loss || defects?.k2_pump_fail || defects?.steam_fail || defects?.power_fail)}
          onClick={() => setSelectedEquipmentId('K_2')}
          onKeyDown={event => handleEquipmentKeyDown(event, 'K_2')}
        >
          <title>К-2 · Открыть карточку оборудования</title>
          <rect className="equipment-hitbox" x="-5" y="-5" width="100" height="190" rx="18" />
          <rect x="0" y="0" width="90" height="180" rx="14" fill="url(#vtGrad)" stroke={defects?.vt_vacuum_loss ? "#ff4d4f" : "#aa00ff"} strokeWidth={defects?.vt_vacuum_loss ? "2.5" : "1.5"} />
          <text x="45" y="22" fill={defects?.vt_vacuum_loss ? "#ff4d4f" : "#aa00ff"} fontSize="10" fontWeight="700" textAnchor="middle">
            {defects?.vt_vacuum_loss ? "К-2 (СБОЙ)" : "КОЛОННА К-2"}
          </text>
          <text x="45" y="90" fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="middle">Вакуумный блок</text>
          <rect x="15" y="125" width="60" height="40" fill="#131924" rx="4" stroke="#38234f" />
          <rect x="15" y={125 + (40 - (sensors.L_2 / 100) * 40)} width="60" height={(sensors.L_2 / 100) * 40} fill="rgba(170, 0, 255, 0.24)" rx="4" />
          <text x="45" y="120" fill="#7c8ba1" fontSize="7" textAnchor="middle">Куб · 4000 мм</text>
        </S.EquipmentGroup>

        {/* Пароэжектор ПЭУ и клапан пара V_VT */}
        <g transform="translate(900, 100)">
          <rect x="0" y="0" width="40" height="30" rx="4" fill="#171124" stroke="#aa00ff" strokeWidth="1" />
          <text x="20" y="18" fill="#aa00ff" fontSize="8" fontWeight="700" textAnchor="middle">ПЭУ</text>
        </g>

        <S.ValveGroup $isOpen={valves.V_VT} transform="translate(920, 75)" onClick={() => handleValveClick('V_VT')}>
          <polygon points="-10,-8 10,8 10,-8 -10,8" />
          <circle cx="0" cy="0" r="3" />
          <text x="22" y="3" fill="#e1e7f0" fontSize="8" textAnchor="start">V-VT</text>
          <EquipmentInfoMarker equipmentId="V_VT" transform="translate(13, 14)" onOpen={setSelectedEquipmentId} />
        </S.ValveGroup>

        {/* Датчик остаточного вакуума P-vac справа от K-2 */}
        <g transform="translate(925, 200)">
          <S.SensorBox $isWarning={sensors.P_vac > K2_PRESSURE_WARNING} $isDanger={sensors.P_vac >= K2_PRESSURE_CRITICAL}>
            <rect className="bg" x="-35" y="-10" width="70" height="26" rx="4" />
            <text className="value" x="0" y="7" textAnchor="middle">{sensors.P_vac.toFixed(3)} МПа</text>
            <text className="label" x="0" y="-13" textAnchor="middle">P-vac (ВАКУУМ)</text>
          </S.SensorBox>
        </g>

        {/* Датчик уровня куба К-2 L-2: полная шкала 4000 мм */}
        <g transform="translate(945, 280)">
          <S.SensorBox $isWarning={sensors.L_2 > K2_LEVEL_HIGH || sensors.L_2 < K2_LEVEL_LOW} $isDanger={sensors.L_2 < K2_LEVEL_LOW_CRITICAL}>
            <rect className="bg" x="-68" y="-10" width="136" height="26" rx="4" />
            <text className="value" x="0" y="7" textAnchor="middle">
              {Math.round((sensors.L_2 / 100) * K2_LEVEL_FULL_SCALE_MM)} мм · {sensors.L_2.toFixed(1)}%
            </text>
            <text className="label" x="0" y="-13" textAnchor="middle">L-2 (УРОВЕНЬ К-2)</text>
          </S.SensorBox>
          <rect x="-68" y="20" width="136" height="12" fill="#090d14" rx="2" stroke="#38234f" strokeWidth="0.5" />
          <S.SparklinePath d={generateSparklineD(k2LevelHistory, -68, 20, 136, 12, 0, 100)} $strokeColor={(sensors.L_2 > K2_LEVEL_HIGH || sensors.L_2 < K2_LEVEL_LOW) ? "#ffcc00" : "#aa00ff"} />
        </g>

        {/* Датчик температуры куба К-2 T-2 ниже K-2 */}
        <g transform="translate(845, 360)">
          <S.SensorBox $isWarning={sensors.T_2 > K2_TEMP_WARNING} $isDanger={sensors.T_2 >= K2_TEMP_CRITICAL}>
            <rect className="bg" x="-32" y="-10" width="64" height="26" rx="4" />
            <text className="value" x="0" y="7" textAnchor="middle">{sensors.T_2.toFixed(1)}°C</text>
            <text className="label" x="0" y="-13" textAnchor="middle">T-2 (КУБ К-2)</text>
          </S.SensorBox>
        </g>
        </S.SVGCanvas>
      </S.SchemeContainer>
      <EquipmentDrawer
        equipmentId={selectedEquipmentId}
        onClose={() => setSelectedEquipmentId(null)}
      />
    </>
  );
};

export default FlowScheme;
