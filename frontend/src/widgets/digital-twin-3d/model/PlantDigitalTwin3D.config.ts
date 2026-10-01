import type { CameraPresetConfig, Hotspot3D } from './types';

export const CAMERA_PRESETS: CameraPresetConfig[] = [
  {
    id: 'overview',
    label: 'Общий вид завода',
    iconName: 'Globe',
    position: [0, 26, 44],
    target: [2, 4, 0],
    description: 'Панорамный обзор всего комплекса ЭЛОУ-АВТ-6 от ввода нефти до вакуумного блока',
  },
  {
    id: 'elou',
    label: 'Блок ЭЛОУ',
    iconName: 'Zap',
    position: [-18, 14, 22],
    target: [-18, 3, 0],
    description: 'Электродегидраторы Э-1..Э-6, насос промывки Н-82, буферная емкость Е-15',
  },
  {
    id: 'furnaces_at',
    label: 'Печи и АТ',
    iconName: 'Flame',
    position: [8, 16, 26],
    target: [8, 6, 0],
    description: 'Трубчатые печи П-1/П-3 с горелками и атмосферная колонна К-1 с тарелками',
  },
  {
    id: 'vt',
    label: 'Блок ВТ',
    iconName: 'RotateCcw',
    position: [27, 15, 22],
    target: [26, 5, 0],
    description: 'Вакуумная колонна К-2, эжекторная система и насосы откачки гудрона Н-4/Н-32',
  },
  {
    id: 'cinematic',
    label: 'Кино-облёт',
    iconName: 'Video',
    position: [0, 20, 40],
    target: [2, 5, 0],
    description: 'Плавный кинематографический облёт установки для презентаций и демо-стендов',
  },
];

export const TWIN_HOTSPOTS: Hotspot3D[] = [
  {
    id: 'hs-k1',
    label: 'К-1',
    sublabel: 'Атмосферная колонна',
    worldPos: [13, 17.5, 0],
    equipmentId: 'K_1',
    category: 'column',
    valueGetter: (sensors) => `T: ${(sensors.T_1 ?? 280).toFixed(1)}°C | P: ${(sensors.P_1 ?? 0.35).toFixed(3)} МПа | L: ${(sensors.L_1 ?? 50).toFixed(1)}%`,
  },
  {
    id: 'hs-k2',
    label: 'К-2',
    sublabel: 'Вакуумная колонна',
    worldPos: [26, 14.5, 0],
    equipmentId: 'K_2',
    category: 'column',
    valueGetter: (sensors) => `T: ${(sensors.T_2 ?? 350).toFixed(1)}°C | P: ${(sensors.P_vac ?? 0.04).toFixed(3)} МПа | L: ${(sensors.L_2 ?? 50).toFixed(1)}%`,
  },
  {
    id: 'hs-p1',
    label: 'П-1',
    sublabel: 'Печь нагрева мазута',
    worldPos: [3, 8.5, -6],
    equipmentId: 'P_1',
    category: 'furnace',
    valueGetter: (sensors, setpoints) => `Tфакт: ${(sensors.T_1 ?? 280).toFixed(1)}°C | Sp: ${(setpoints.T_1_Sp ?? 280).toFixed(0)}°C`,
  },
  {
    id: 'hs-p3',
    label: 'П-3',
    sublabel: 'Печь контура К-1',
    worldPos: [3, 8.5, 6],
    equipmentId: 'P_3',
    category: 'furnace',
    valueGetter: (sensors, setpoints) => `Tфакт: ${(sensors.T_3 ?? 280).toFixed(1)}°C | Sp: ${(setpoints.T_3_Sp ?? 280).toFixed(0)}°C`,
  },
  {
    id: 'hs-elou',
    label: 'ЭЛОУ',
    sublabel: 'Электродегидраторы Э-1..Э-6',
    worldPos: [-20, 6.5, 0],
    category: 'vessel',
    valueGetter: (sensors) => `Соли: ${(sensors.Sal_1 ?? 4.2).toFixed(1)} мг/л | Влага: ${(sensors.W_1 ?? 0.15).toFixed(2)}%`,
  },
  {
    id: 'hs-n82',
    label: 'Н-82',
    sublabel: 'Промывочная вода',
    worldPos: [-30, 2.5, -8],
    pumpId: 'N_82',
    equipmentId: 'N_82',
    category: 'pump',
  },
  {
    id: 'hs-n20',
    label: 'Н-20',
    sublabel: 'Сырьевой насос',
    worldPos: [-6, 2.5, 0],
    pumpId: 'N_20',
    equipmentId: 'N_20',
    category: 'pump',
  },
  {
    id: 'hs-v1',
    label: 'V-1',
    sublabel: 'Вход сырья',
    worldPos: [-2, 2.2, 0],
    valveId: 'V_1',
    equipmentId: 'V_1',
    category: 'valve',
  },
];

export const TWIN_COLORS = {
  background: 0x070b12,
  ground: 0x0c121d,
  groundGrid: 0x1a293f,
  concrete: 0x242e3d,
  steelDark: 0x1f2937,
  steelLight: 0x475569,
  steelBright: 0x94a3b8,
  crudePipe: 0x10b981,       // Изумрудно-зеленый поток сырой нефти
  gasPipe: 0xf59e0b,         // Золотисто-янтарный газ и светлые фракции
  waterPipe: 0x0ea5e9,       // Неоново-синяя промывочная вода
  steamPipe: 0xe2e8f0,       // Полупрозрачный белый пар
  drainPipe: 0x64748b,       // Технологический дренаж
  pumpRunning: 0x10b981,     // Зеленый индикатор в работе
  pumpStopped: 0xef4444,     // Красный индикатор останова
  flameOrange: 0xf97316,
  flameYellow: 0xfde047,
  flameBlue: 0x38bdf8,
};
