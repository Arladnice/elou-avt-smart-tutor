import type { MnemoschemeConfig } from './types';

export const DEFAULT_MNEMOSCHEME_ID = 'elou-avt-6-default';

export const DEFAULT_MNEMOSCHEME_PRESET: MnemoschemeConfig = {
  id: DEFAULT_MNEMOSCHEME_ID,
  name: 'ЭЛОУ-АВТ-6 (Штатный регламент)',
  description: 'Эталонная технологическая мнемосхема ЭЛОУ-АВТ-6 с полным контуром ЭЛОУ, колонн К-1/К-2, печей П-1/П-3 и насосных агрегатов',
  isBuiltin: true,
  width: 1260,
  height: 620,
  zones: [
    { id: 'zone-elou', x: 10, y: 10, width: 380, height: 600, label: 'ЭЛОУ' },
    { id: 'zone-k1', x: 400, y: 10, width: 390, height: 600, label: 'АТ' },
    { id: 'zone-k2', x: 800, y: 10, width: 450, height: 600, label: 'ВТ' },
  ],
  columns: [
    {
      id: 'col-k1',
      tag: 'К-1',
      equipmentId: 'K_1',
      x: 410,
      y: 120,
      levelBinding: 'L_1',
      alertBindings: ['steam_fail', 'valve_jam', 'power_fail'],
    },
    {
      id: 'col-k2',
      tag: 'К-2',
      equipmentId: 'K_2',
      x: 900,
      y: 160,
      levelBinding: 'L_2',
      alertBindings: ['vt_vacuum_loss', 'k2_pump_fail', 'steam_fail', 'power_fail'],
      tagOffsetY: 112,
    },
  ],
  furnaces: [
    {
      id: 'fur-p3',
      tag: 'П-3',
      equipmentId: 'P_3',
      x: 130,
      y: 430,
      flameBinding: 'Flame_P3',
      alertBindings: ['power_fail'],
    },
    {
      id: 'fur-p1',
      tag: 'П-1',
      equipmentId: 'P_1',
      x: 650,
      y: 430,
      flameBinding: 'Flame_P1',
      alertBindings: ['coil_overheat', 'power_fail'],
    },
  ],
  vessels: [
    {
      id: 'ves-e1',
      tag: 'Е-1',
      equipmentId: 'VESSEL_E_1',
      x: 620,
      y: 50,
      levelSensorBinding: 'L_E1',
      alertBindings: ['valve_jam', 'power_fail'],
    },
    {
      id: 'ves-e2',
      tag: 'Е-2',
      equipmentId: 'VESSEL_E_2',
      x: 1100,
      y: 70,
      levelSensorBinding: 'L_E2',
      alertBindings: ['vt_vacuum_loss', 'power_fail'],
    },
  ],
  pumps: [
    {
      id: 'pump-n20',
      tag: 'Н-20',
      equipmentId: 'N_20',
      x: 150,
      y: 100,
      alertBindings: ['pump_fail', 'power_fail'],
    },
    {
      id: 'pump-n3',
      tag: 'Н-3',
      equipmentId: 'N_3',
      x: 320,
      y: 470,
      direction: 'left',
      alertBindings: ['power_fail'],
    },
    {
      id: 'pump-n2',
      tag: 'Н-2',
      equipmentId: 'N_2',
      x: 580,
      y: 470,
      alertBindings: ['power_fail'],
    },
    {
      id: 'pump-n32',
      tag: 'Н-32',
      equipmentId: 'N_32',
      x: 1080,
      y: 490,
      tagOffsetY: -39,
      alertBindings: ['k2_pump_fail', 'power_fail'],
    },
    {
      id: 'pump-n4',
      tag: 'Н-4',
      equipmentId: 'N_4',
      x: 1080,
      y: 570,
      tagOffsetY: -39,
      alertBindings: ['k2_pump_fail', 'power_fail'],
    },
  ],
  valves: [
    {
      id: 'valve-v-elou',
      label: 'V-ELOU',
      valveId: 'V_ELOU',
      equipmentId: 'V_ELOU',
      x: 80,
      y: 60,
      rotate: 90,
      vertical: true,
      hideLabel: true,
    },
    {
      id: 'valve-v1',
      label: 'V-1',
      valveId: 'V_1',
      equipmentId: 'V_1',
      x: 310,
      y: 190,
    },
    {
      id: 'valve-v2',
      label: 'V-2',
      valveId: 'V_2',
      equipmentId: 'V_2',
      x: 480,
      y: 50,
      rotate: 90,
      vertical: true,
    },
    {
      id: 'valve-ve1-drain',
      label: 'ДРЕН Е-1',
      valveId: 'V_E1_DRAIN',
      x: 680,
      y: 120,
      rotate: 90,
      vertical: true,
      hideLabel: true,
    },
    {
      id: 'valve-steam-k1',
      label: 'ПАР К-1',
      valveId: 'V_STEAM_K1',
      x: 570,
      y: 240,
    },
    {
      id: 'valve-vp3-1',
      label: 'V-П3-1',
      valveId: 'V_P3_OUT',
      x: 260,
      y: 470,
    },
    {
      id: 'valve-vp3-2',
      label: 'V-П3-2',
      valveId: 'V_P3_RETURN',
      x: 290,
      y: 280,
    },
    {
      id: 'valve-fuel-p3',
      label: 'ТОПЛ. П-3',
      valveId: 'FUEL_P3',
      x: 180,
      y: 530,
      rotate: 90,
      vertical: true,
      hideLabel: true,
    },
    {
      id: 'valve-vp1',
      label: 'V-П1',
      valveId: 'V_P1_IN',
      x: 630,
      y: 470,
    },
    {
      id: 'valve-v3',
      label: 'V-3',
      valveId: 'V_3',
      equipmentId: 'V_3',
      x: 820,
      y: 350,
      rotate: 90,
      vertical: true,
    },
    {
      id: 'valve-fuel-p1',
      label: 'ТОПЛ. П-1',
      valveId: 'FUEL_P1',
      x: 700,
      y: 530,
      rotate: 90,
      vertical: true,
      hideLabel: true,
    },
    {
      id: 'valve-vk2-relief',
      label: 'СБРОС К-2',
      valveId: 'V_K2_RELIEF',
      x: 960,
      y: 60,
      rotate: 90,
      vertical: true,
    },
    {
      id: 'valve-ve2-drain',
      label: 'ДРЕН Е-2',
      valveId: 'V_E2_DRAIN',
      x: 1160,
      y: 140,
      rotate: 90,
      vertical: true,
      hideLabel: true,
    },
    {
      id: 'valve-steam-k2',
      label: 'ПАР К-2',
      valveId: 'V_STEAM_K2',
      x: 1140,
      y: 270,
      hideLabel: true,
    },
    {
      id: 'valve-vk2-out-32',
      label: 'V-Н32',
      valveId: 'V_K2_OUT_32',
      x: 1180,
      y: 490,
    },
    {
      id: 'valve-vk2-out-4',
      label: 'V-Н4',
      valveId: 'V_K2_OUT_4',
      x: 1180,
      y: 570,
    },
  ],
  sensors: [
    {
      id: 'sensor-sal1',
      tag: 'Sal-1',
      sensorKey: 'Sal_1',
      unit: 'мг/л',
      x: 90,
      y: 170,
    },
    {
      id: 'sensor-w1',
      tag: 'W-1',
      sensorKey: 'W_1',
      unit: '%',
      x: 180,
      y: 170,
    },
    {
      id: 'sensor-p1',
      tag: 'P-1 · К-1',
      sensorKey: 'P_1',
      unit: 'МПа',
      x: 590,
      y: 190,
      showSparkline: true,
      minLimit: 0.05,
      maxLimit: 0.5,
    },
    {
      id: 'sensor-l1',
      tag: 'L-1 · К-1',
      sensorKey: 'L_1',
      unit: '%',
      x: 620,
      y: 330,
      showLevelGauge: true,
      fullScaleMm: 2000,
    },
    {
      id: 'sensor-t1',
      tag: 'T-1 · П-1',
      sensorKey: 'T_1',
      unit: '°C',
      x: 700,
      y: 390,
      showSparkline: true,
      minLimit: 240,
      maxLimit: 380,
    },
    {
      id: 'sensor-t3',
      tag: 'T-3 · П-3',
      sensorKey: 'T_3',
      unit: '°C',
      x: 180,
      y: 390,
      showSparkline: true,
      minLimit: 240,
      maxLimit: 380,
    },
    {
      id: 'sensor-pvac',
      tag: 'P-vac · К-2',
      sensorKey: 'P_vac',
      unit: 'МПа',
      x: 1100,
      y: 210,
    },
    {
      id: 'sensor-t2',
      tag: 'T-2 · К-2',
      sensorKey: 'T_2',
      unit: '°C',
      x: 1100,
      y: 340,
      showSparkline: true,
      minLimit: 180,
      maxLimit: 420,
    },
    {
      id: 'sensor-l2',
      tag: 'L-2 · К-2',
      sensorKey: 'L_2',
      unit: '%',
      x: 1100,
      y: 410,
      showLevelGauge: true,
      fullScaleMm: 4000,
    },
  ],
  pipes: [
    { id: 'pipe-feed-in', d: 'M 60,100 H 120', kind: 'crude' },
    { id: 'pipe-demulsifier', d: 'M 80,30 V 100', kind: 'demulsifier', flowBinding: 'demulsifier' },
    { id: 'pipe-feed-k1', d: 'M 180,100 H 250 V 190 H 410', kind: 'crude', flowBinding: 'k1Feed', cutOffValve: 'V_1' },
    { id: 'pipe-gas-relief-1', d: 'M 480,70 H 620', kind: 'gas', flowBinding: 'k1Relief' },
    { id: 'pipe-gas-flare-1', d: 'M 480,120 V 30 H 580', kind: 'gas', flowBinding: 'k1Relief' },
    { id: 'pipe-drain-e1', kind: 'drain', flowBinding: 'e1Drain', x1: 680, y1: 90, x2: 680, y2: 140 },
    { id: 'pipe-steam-k1', kind: 'steam', flowBinding: 'steamK1', x1: 610, y1: 240, x2: 540, y2: 240 },
    { id: 'pipe-k1-bottom', d: 'M 480,410 V 470', kind: 'crude', flowBinding: 'k1BottomOutflow' },
    { id: 'pipe-k1-loop-p3', d: 'M 480,470 H 350', kind: 'crude', flowBinding: 'k1Loop' },
    { id: 'pipe-h3-to-p3', d: 'M 300,470 H 220', kind: 'crude', flowBinding: 'k1Loop', cutOffValve: 'V_P3_OUT' },
    { id: 'pipe-p3-to-k1', d: 'M 130,470 H 70 V 280 H 410', kind: 'crude', flowBinding: 'k1Loop', cutOffValve: 'V_P3_RETURN' },
    { id: 'pipe-fuel-p3', kind: 'fuel', flowBinding: 'fuelP3', x1: 180, y1: 500, x2: 180, y2: 550 },
    { id: 'pipe-steam-p3', kind: 'steam', x1: 130, y1: 450, x2: 90, y2: 450 },
    { id: 'pipe-k1-to-h2', d: 'M 480,470 H 550', kind: 'crude', flowBinding: 'k2Feed' },
    { id: 'pipe-h2-to-p1', d: 'M 610,470 H 650', kind: 'crude', flowBinding: 'k2Feed', cutOffValve: 'V_P1_IN' },
    { id: 'pipe-p1-to-k2', d: 'M 740,470 H 820 V 250 H 900', kind: 'crude', flowBinding: 'k2Feed', cutOffValve: 'V_3' },
    { id: 'pipe-fuel-p1', kind: 'fuel', flowBinding: 'fuelP1', x1: 700, y1: 500, x2: 700, y2: 550 },
    { id: 'pipe-steam-p1', kind: 'steam', x1: 740, y1: 450, x2: 790, y2: 450 },
    { id: 'pipe-gas-relief-2', d: 'M 960,90 H 1100', kind: 'gas', flowBinding: 'k2Relief' },
    { id: 'pipe-gas-flare-2', d: 'M 960,160 V 30 H 1080', kind: 'gas', flowBinding: 'k2Relief' },
    { id: 'pipe-drain-e2', kind: 'drain', flowBinding: 'e2Drain', x1: 1160, y1: 110, x2: 1160, y2: 160 },
    { id: 'pipe-steam-k2', kind: 'steam', flowBinding: 'steamK2', x1: 1240, y1: 270, x2: 1010, y2: 270 },
    { id: 'pipe-k2-to-h32', d: 'M 960,450 V 490 H 1050', kind: 'crude', flowBinding: 'k2Outflow32' },
    { id: 'pipe-h32-out', d: 'M 1100,490 H 1240', kind: 'crude', flowBinding: 'k2Outflow32', cutOffValve: 'V_K2_OUT_32' },
    { id: 'pipe-k2-to-h4', d: 'M 960,490 V 570 H 1050', kind: 'crude', flowBinding: 'k2Outflow4' },
    { id: 'pipe-h4-out', d: 'M 1100,570 H 1240', kind: 'crude', flowBinding: 'k2Outflow4', cutOffValve: 'V_K2_OUT_4' },
  ],
  labels: [
    { id: 'lbl-elou', x: 20, y: 110, text: 'ЭЛОУ', className: 'source-label' },
    { id: 'lbl-demuls-1', x: 220, y: 30, text: 'ДЕЭМУЛЬГАТОР', className: 'utility-label' },
    { id: 'lbl-demuls-2', x: 220, y: 50, text: 'В ЭЛОУ', className: 'utility-label' },
    { id: 'lbl-v-elou', x: 80, y: 20, text: 'V-ELOU', className: 'valve-tag' },
    { id: 'lbl-gas-1', x: 510, y: 20, text: 'СБРОС ГАЗА', className: 'gas-release-label' },
    { id: 'lbl-drain-e1-1', x: 700, y: 130, text: 'ДРЕН Е-1', className: 'utility-label' },
    { id: 'lbl-drain-e1-2', x: 700, y: 150, text: 'ДРЕНАЖ', className: 'utility-label' },
    { id: 'lbl-steam-k1', x: 530, y: 230, text: 'ПАР', className: 'utility-label', textAnchor: 'end' },
    { id: 'lbl-fuel-p3-1', x: 220, y: 540, text: 'ТОПЛ. П-3', className: 'utility-label' },
    { id: 'lbl-fuel-p3-2', x: 180, y: 580, text: 'ТОПЛИВО', className: 'utility-label', textAnchor: 'middle' },
    { id: 'lbl-steam-p3', x: 50, y: 440, text: 'ПАР', className: 'utility-label' },
    { id: 'lbl-fuel-p1-1', x: 740, y: 540, text: 'ТОПЛ. П-1', className: 'utility-label' },
    { id: 'lbl-fuel-p1-2', x: 700, y: 580, text: 'ТОПЛИВО', className: 'utility-label', textAnchor: 'middle' },
    { id: 'lbl-steam-p1', x: 800, y: 440, text: 'ПАР', className: 'utility-label' },
    { id: 'lbl-gas-2', x: 1000, y: 20, text: 'СБРОС ГАЗА', className: 'gas-release-label' },
    { id: 'lbl-drain-e2-1', x: 1180, y: 150, text: 'ДРЕН Е-2', className: 'utility-label' },
    { id: 'lbl-drain-e2-2', x: 1180, y: 170, text: 'ДРЕНАЖ', className: 'utility-label' },
    { id: 'lbl-steam-k2', x: 1140, y: 230, text: 'ОТПАРНОЙ ПАР К-2', className: 'utility-label', textAnchor: 'middle' },
  ],
};

export const ELOU_DETAILED_PRESET_ID = 'elou-detailed-3train';

export const ELOU_DETAILED_PRESET: MnemoschemeConfig = {
  id: ELOU_DETAILED_PRESET_ID,
  name: 'ЭЛОУ: Полная схема обессоливания (3 потока, Э-1..Э-6, Е-15, Е-16)',
  description: 'Детальная технологическая схема блока ЭЛОУ: 3 параллельные нитки, 2 ступени обессоливания, контур промывочной воды Н-82, буферная емкость Е-15 и гидрозатвор-ловушка Е-16',
  isBuiltin: true,
  width: 1320,
  height: 720,
  zones: [
    { id: 'zone-feed-header', x: 10, y: 10, width: 330, height: 90, label: 'УЗЕЛ ПОДАЧИ ПРОМЫВОЧНОЙ ВОДЫ (Н-82)' },
    { id: 'zone-train-1', x: 10, y: 110, width: 920, height: 140, label: 'I НИТКА ОБЕССОЛИВАНИЯ (Э-1 → Э-2)' },
    { id: 'zone-train-2', x: 10, y: 260, width: 920, height: 140, label: 'II НИТКА ОБЕССОЛИВАНИЯ (Э-3 → Э-4)' },
    { id: 'zone-train-3', x: 10, y: 410, width: 920, height: 140, label: 'III НИТКА ОБЕССОЛИВАНИЯ (Э-5 → Э-6)' },
    { id: 'zone-buffer', x: 940, y: 220, width: 370, height: 230, label: 'СБОР И ОТКАЧКА В К-1 (Е-15, Н-20)' },
    { id: 'zone-drain-trap', x: 10, y: 560, width: 1300, height: 150, label: 'ДРЕНАЖНЫЙ КОЛЛЕКТОР И ЛОВУШКА НЕФТИ (Е-16)' },
  ],
  columns: [],
  furnaces: [],
  vessels: [
    // 1-я ступень обессоливания
    { id: 'ves-ed1', tag: 'Э-1', equipmentId: 'ED_1', x: 380, y: 150, alertBindings: ['elou_desalt_fail'] },
    { id: 'ves-ed3', tag: 'Э-3', equipmentId: 'ED_3', x: 380, y: 300, alertBindings: ['elou_desalt_fail'] },
    { id: 'ves-ed5', tag: 'Э-5', equipmentId: 'ED_5', x: 380, y: 450, alertBindings: ['elou_desalt_fail'] },
    // 2-я ступень глубокого обессоливания
    { id: 'ves-ed2', tag: 'Э-2', equipmentId: 'ED_2', x: 720, y: 150, alertBindings: ['elou_desalt_fail'] },
    { id: 'ves-ed4', tag: 'Э-4', equipmentId: 'ED_4', x: 720, y: 300, alertBindings: ['elou_desalt_fail'] },
    { id: 'ves-ed6', tag: 'Э-6', equipmentId: 'ED_6', x: 720, y: 450, alertBindings: ['elou_desalt_fail'] },
    // Буферная емкость обессоленной нефти
    { id: 'ves-e15', tag: 'Е-15', equipmentId: 'VESSEL_E_15', x: 960, y: 310, alertBindings: [] },
    // Вертикальный гидрозатвор / ловушка нефти
    { id: 'ves-e16', tag: 'Е-16', equipmentId: 'VESSEL_E_16', orientation: 'vertical', x: 1100, y: 580, alertBindings: [] },
  ],
  pumps: [
    { id: 'pump-n82', tag: 'Н-82 (вода)', equipmentId: 'N_82', x: 80, y: 60, alertBindings: ['power_fail'] },
    { id: 'pump-n20', tag: 'Н-20', equipmentId: 'N_20', x: 1180, y: 330, alertBindings: ['pump_fail', 'power_fail'] },
  ],
  valves: [
    // Входные задвижки сырой нефти (зеленые на схеме)
    { id: 'valve-feed-1', label: 'Вх-1', valveId: 'V_FEED_1', x: 190, y: 170 },
    { id: 'valve-feed-2', label: 'Вх-2', valveId: 'V_FEED_2', x: 190, y: 320 },
    { id: 'valve-feed-3', label: 'Вх-3', valveId: 'V_FEED_3', x: 190, y: 470 },

    // Смесители 1-й ступени (инжекторы промывочной воды)
    { id: 'mixer-a19-1', label: 'А-19/1', valveId: 'A_19_1', kind: 'mixer', x: 280, y: 170 },
    { id: 'mixer-a19-3', label: 'А-19/3', valveId: 'A_19_3', kind: 'mixer', x: 280, y: 320 },
    { id: 'mixer-a19-5', label: 'А-19/5', valveId: 'A_19_5', kind: 'mixer', x: 280, y: 470 },

    // Межступенчатые задвижки
    { id: 'valve-mid-1', label: 'Меж-1', valveId: 'V_MID_1', x: 550, y: 170 },
    { id: 'valve-mid-2', label: 'Меж-2', valveId: 'V_MID_2', x: 550, y: 320 },
    { id: 'valve-mid-3', label: 'Меж-3', valveId: 'V_MID_3', x: 550, y: 470 },

    // Смесители 2-й ступени
    { id: 'mixer-a20-2', label: 'А-20/2', valveId: 'A_20_2', kind: 'mixer', x: 630, y: 170 },
    { id: 'mixer-a20-4', label: 'А-20/4', valveId: 'A_20_4', kind: 'mixer', x: 630, y: 320 },
    { id: 'mixer-a20-6', label: 'А-20/6', valveId: 'A_20_6', kind: 'mixer', x: 630, y: 470 },

    // Выходные задвижки 2-й ступени в коллектор Е-15
    { id: 'valve-out-1', label: 'Вых-1', valveId: 'V_OUT_1', x: 890, y: 170 },
    { id: 'valve-out-2', label: 'Вых-2', valveId: 'V_OUT_2', x: 890, y: 320 },
    { id: 'valve-out-3', label: 'Вых-3', valveId: 'V_OUT_3', x: 890, y: 470 },

    // Обвязка Е-15 и сырьевого насоса Н-20
    { id: 'valve-e15-drain', label: 'Дрен Е-15', valveId: 'V_E15_DRAIN', x: 1020, y: 380, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-v1-elou', label: 'V-1', valveId: 'V_1', equipmentId: 'V_1', x: 1120, y: 330 },

    // Обвязка промывочной воды Н-82
    { id: 'valve-water-main', label: 'Вода напор', valveId: 'V_WATER_MAIN', x: 190, y: 35 },
    { id: 'valve-water-stage2', label: 'Вода II ст', valveId: 'V_WATER_ST2', x: 630, y: 70, vertical: true, rotate: 90 },
    { id: 'valve-water-stage1', label: 'Вода I ст', valveId: 'V_WATER_ST1', x: 280, y: 115, vertical: true, rotate: 90 },

    // Дренажные клапаны соленой подтоварной воды под дегидраторами
    { id: 'valve-drain-e1', label: 'Др-1', valveId: 'V_DR_E1', x: 440, y: 220, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-drain-e3', label: 'Др-3', valveId: 'V_DR_E3', x: 440, y: 370, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-drain-e5', label: 'Др-5', valveId: 'V_DR_E5', x: 440, y: 520, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-drain-e2', label: 'Др-2', valveId: 'V_DR_E2', x: 780, y: 220, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-drain-e4', label: 'Др-4', valveId: 'V_DR_E4', x: 780, y: 370, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-drain-e6', label: 'Др-6', valveId: 'V_DR_E6', x: 780, y: 520, vertical: true, rotate: 90, hideLabel: true },

    // Арматура ловушки Е-16
    { id: 'valve-drain-collector', label: 'Коллектор', valveId: 'V_DR_COL', x: 1040, y: 630 },
    { id: 'valve-water-discharge', label: 'Сброс воды', valveId: 'V_DR_WATER', x: 1118, y: 675, vertical: true, rotate: 90 },
  ],
  sensors: [
    {
      id: 'sensor-sal1-elou',
      tag: 'Sal-1 · Соли',
      sensorKey: 'Sal_1',
      unit: 'мг/л',
      x: 1080,
      y: 250,
      showSparkline: true,
      minLimit: 0,
      maxLimit: 30,
    },
    {
      id: 'sensor-w1-elou',
      tag: 'W-1 · Влага',
      sensorKey: 'W_1',
      unit: '%',
      x: 1080,
      y: 380,
      showSparkline: true,
      minLimit: 0,
      maxLimit: 2.0,
    },
  ],
  pipes: [
    // 1. Сырьевая гребенка сырой нефти (зеленая)
    { id: 'pipe-feed-raw', kind: 'crude', flowBinding: 'elouFeed', x1: 20, y1: 320, x2: 120, y2: 320, routing: 'direct' },
    { id: 'pipe-feed-split-1', kind: 'crude', flowBinding: 'elouFeed', x1: 120, y1: 320, x2: 170, y2: 170, routing: 'elbow-vh' },
    { id: 'pipe-feed-split-2', kind: 'crude', flowBinding: 'elouFeed', x1: 120, y1: 320, x2: 170, y2: 320, routing: 'direct' },
    { id: 'pipe-feed-split-3', kind: 'crude', flowBinding: 'elouFeed', x1: 120, y1: 320, x2: 170, y2: 470, routing: 'elbow-vh' },

    // От задвижек в смесители А-19
    { id: 'pipe-v1-to-a19-1', kind: 'crude', flowBinding: 'elouFeed', x1: 210, y1: 170, x2: 260, y2: 170, routing: 'direct' },
    { id: 'pipe-v2-to-a19-3', kind: 'crude', flowBinding: 'elouFeed', x1: 210, y1: 320, x2: 260, y2: 320, routing: 'direct' },
    { id: 'pipe-v3-to-a19-5', kind: 'crude', flowBinding: 'elouFeed', x1: 210, y1: 470, x2: 260, y2: 470, routing: 'direct' },

    // От смесителей А-19 в дегидраторы 1-й ступени (Э-1, Э-3, Э-5)
    { id: 'pipe-a19-1-to-ed1', kind: 'crude', flowBinding: 'elouFeed', x1: 300, y1: 170, x2: 380, y2: 170, routing: 'direct' },
    { id: 'pipe-a19-3-to-ed3', kind: 'crude', flowBinding: 'elouFeed', x1: 300, y1: 320, x2: 380, y2: 320, routing: 'direct' },
    { id: 'pipe-a19-5-to-ed5', kind: 'crude', flowBinding: 'elouFeed', x1: 300, y1: 470, x2: 380, y2: 470, routing: 'direct' },

    // Межступенчатые перетоки от 1-й ступени к задвижкам
    { id: 'pipe-ed1-to-vmid1', kind: 'crude', flowBinding: 'elouFeed', x1: 500, y1: 170, x2: 530, y2: 170, routing: 'direct' },
    { id: 'pipe-ed3-to-vmid2', kind: 'crude', flowBinding: 'elouFeed', x1: 500, y1: 320, x2: 530, y2: 320, routing: 'direct' },
    { id: 'pipe-ed5-to-vmid3', kind: 'crude', flowBinding: 'elouFeed', x1: 500, y1: 470, x2: 530, y2: 470, routing: 'direct' },

    // От межступенчатых задвижек в смесители А-20 2-й ступени
    { id: 'pipe-vmid1-to-a20-2', kind: 'crude', flowBinding: 'elouFeed', x1: 570, y1: 170, x2: 610, y2: 170, routing: 'direct' },
    { id: 'pipe-vmid2-to-a20-4', kind: 'crude', flowBinding: 'elouFeed', x1: 570, y1: 320, x2: 610, y2: 320, routing: 'direct' },
    { id: 'pipe-vmid3-to-a20-6', kind: 'crude', flowBinding: 'elouFeed', x1: 570, y1: 470, x2: 610, y2: 470, routing: 'direct' },

    // От смесителей А-20 в дегидраторы 2-й ступени (Э-2, Э-4, Э-6)
    { id: 'pipe-a20-2-to-ed2', kind: 'crude', flowBinding: 'elouFeed', x1: 650, y1: 170, x2: 720, y2: 170, routing: 'direct' },
    { id: 'pipe-a20-4-to-ed4', kind: 'crude', flowBinding: 'elouFeed', x1: 650, y1: 320, x2: 720, y2: 320, routing: 'direct' },
    { id: 'pipe-a20-6-to-ed6', kind: 'crude', flowBinding: 'elouFeed', x1: 650, y1: 470, x2: 720, y2: 470, routing: 'direct' },

    // От дегидраторов 2-й ступени к выходным клапанам
    { id: 'pipe-ed2-to-vout1', kind: 'crude', flowBinding: 'elouFeed', x1: 840, y1: 170, x2: 870, y2: 170, routing: 'direct' },
    { id: 'pipe-ed4-to-vout2', kind: 'crude', flowBinding: 'elouFeed', x1: 840, y1: 320, x2: 870, y2: 320, routing: 'direct' },
    { id: 'pipe-ed6-to-vout3', kind: 'crude', flowBinding: 'elouFeed', x1: 840, y1: 470, x2: 870, y2: 470, routing: 'direct' },

    // От выходных клапанов в общий коллектор и буферную емкость Е-15
    { id: 'pipe-vout1-to-collector', kind: 'crude', flowBinding: 'elouFeed', x1: 910, y1: 170, x2: 935, y2: 325, routing: 'elbow-hv' },
    { id: 'pipe-vout2-to-collector', kind: 'crude', flowBinding: 'elouFeed', x1: 910, y1: 320, x2: 935, y2: 325, routing: 'direct' },
    { id: 'pipe-vout3-to-collector', kind: 'crude', flowBinding: 'elouFeed', x1: 910, y1: 470, x2: 935, y2: 325, routing: 'elbow-hv' },
    { id: 'pipe-collector-to-e15', kind: 'crude', flowBinding: 'elouFeed', x1: 935, y1: 325, x2: 960, y2: 325, routing: 'direct' },

    // От Е-15 к клапану V-1 и насосу Н-20
    { id: 'pipe-e15-to-v1', kind: 'crude', flowBinding: 'k1Feed', x1: 1080, y1: 330, x2: 1100, y2: 330, routing: 'direct' },
    { id: 'pipe-v1-to-n20', kind: 'crude', flowBinding: 'k1Feed', x1: 1140, y1: 330, x2: 1150, y2: 330, routing: 'direct' },
    { id: 'pipe-n20-to-k1', kind: 'crude', flowBinding: 'k1Feed', x1: 1210, y1: 330, x2: 1310, y2: 330, routing: 'direct' },

    // Дренаж Е-15
    { id: 'pipe-e15-drain', kind: 'drain', x1: 1020, y1: 355, x2: 1020, y2: 410, routing: 'direct' },

    // 2. Линии промывочной воды от Н-82 (utility)
    { id: 'pipe-water-intake', kind: 'utility', flowBinding: 'washWater', x1: 20, y1: 60, x2: 50, y2: 60, routing: 'direct' },
    { id: 'pipe-water-discharge', kind: 'utility', flowBinding: 'washWater', x1: 110, y1: 60, x2: 170, y2: 35, routing: 'elbow-vh' },
    { id: 'pipe-water-main', kind: 'utility', flowBinding: 'washWater', x1: 210, y1: 35, x2: 630, y2: 35, routing: 'direct' },

    // Ввод воды во 2-ю ступень (А-20/2, А-20/4, А-20/6)
    { id: 'pipe-water-to-st2-v', kind: 'utility', flowBinding: 'washWater', x1: 630, y1: 35, x2: 630, y2: 50, routing: 'direct' },
    { id: 'pipe-water-st2-feed', kind: 'utility', flowBinding: 'washWater', x1: 630, y1: 90, x2: 630, y2: 450, routing: 'direct' },
    { id: 'pipe-water-a20-2', kind: 'utility', flowBinding: 'washWater', x1: 630, y1: 145, x2: 630, y2: 145, routing: 'direct' },
    { id: 'pipe-water-a20-4', kind: 'utility', flowBinding: 'washWater', x1: 630, y1: 295, x2: 630, y2: 295, routing: 'direct' },
    { id: 'pipe-water-a20-6', kind: 'utility', flowBinding: 'washWater', x1: 630, y1: 445, x2: 630, y2: 445, routing: 'direct' },

    // Ввод воды в 1-ю ступень (А-19/1, А-19/3, А-19/5)
    { id: 'pipe-water-to-st1-v', kind: 'utility', flowBinding: 'washWater', x1: 280, y1: 35, x2: 280, y2: 95, routing: 'direct' },
    { id: 'pipe-water-st1-feed', kind: 'utility', flowBinding: 'washWater', x1: 280, y1: 135, x2: 280, y2: 450, routing: 'direct' },

    // 3. Линии сброса соленой подтоварной воды (drain)
    // 1-я ступень
    { id: 'pipe-dr-e1', kind: 'drain', flowBinding: 'elouDrain', x1: 440, y1: 195, x2: 440, y2: 630, routing: 'direct' },
    { id: 'pipe-dr-e3', kind: 'drain', flowBinding: 'elouDrain', x1: 440, y1: 345, x2: 440, y2: 390, routing: 'direct' },
    { id: 'pipe-dr-e5', kind: 'drain', flowBinding: 'elouDrain', x1: 440, y1: 495, x2: 440, y2: 540, routing: 'direct' },

    // 2-я ступень
    { id: 'pipe-dr-e2', kind: 'drain', flowBinding: 'elouDrain', x1: 780, y1: 195, x2: 780, y2: 630, routing: 'direct' },
    { id: 'pipe-dr-e4', kind: 'drain', flowBinding: 'elouDrain', x1: 780, y1: 345, x2: 780, y2: 390, routing: 'direct' },
    { id: 'pipe-dr-e6', kind: 'drain', flowBinding: 'elouDrain', x1: 780, y1: 495, x2: 780, y2: 540, routing: 'direct' },

    // Общий дренажный коллектор
    { id: 'pipe-drain-collector', kind: 'drain', flowBinding: 'elouDrain', x1: 440, y1: 630, x2: 1020, y2: 630, routing: 'direct' },
    { id: 'pipe-drain-to-e16', kind: 'drain', flowBinding: 'elouDrain', x1: 1060, y1: 630, x2: 1100, y2: 630, routing: 'direct' },

    // Выходы из ловушки Е-16
    { id: 'pipe-e16-oil-trap', kind: 'crude', flowBinding: 'trappedOil', x1: 1136, y1: 595, x2: 1300, y2: 595, routing: 'direct' },
    { id: 'pipe-e16-water-dr', kind: 'drain', flowBinding: 'elouDrain', x1: 1118, y1: 664, x2: 1118, y2: 710, routing: 'direct' },
  ],
  labels: [
    { id: 'lbl-feed-title', x: 20, y: 305, text: 'Из блока подготовки сырой нефти', className: 'source-label' },
    { id: 'lbl-water-title', x: 80, y: 25, text: 'Н-82 (вода)', className: 'utility-label' },
    { id: 'lbl-to-k1', x: 1280, y: 315, text: '(В К-1)', className: 'source-label', textAnchor: 'middle' },
    { id: 'lbl-trapped-oil', x: 1220, y: 580, text: 'Уловленная нефть', className: 'source-label' },
    { id: 'lbl-drain-water', x: 1140, y: 705, text: 'Дренажная вода', className: 'utility-label' },
    { id: 'lbl-e15-drain-text', x: 1020, y: 415, text: 'Дренаж', className: 'utility-label', textAnchor: 'middle' },
    { id: 'lbl-stage1-title', x: 440, y: 130, text: 'I СТУПЕНЬ ОБЕССОЛИВАНИЯ', className: 'equipment-tag', textAnchor: 'middle' },
    { id: 'lbl-stage2-title', x: 780, y: 130, text: 'II СТУПЕНЬ ГЛУБОКОГО ОБЕССОЛИВАНИЯ', className: 'equipment-tag', textAnchor: 'middle' },
  ],
};

export const ELOU_AVT_INTEGRATED_PRESET_ID = 'elou-avt-6-integrated';

export const ELOU_AVT_INTEGRATED_PRESET: MnemoschemeConfig = {
  id: ELOU_AVT_INTEGRATED_PRESET_ID,
  name: 'ЭЛОУ-АВТ-6: Единая схема установки (ЭЛОУ 3 потока + АТ + ВТ)',
  description: 'Сквозная непрерывная мнемосхема всей установки: 3-поточный блок ЭЛОУ (Э-1..Э-6, Е-15, Е-16) со сквозной подачей насосом Н-20 в колонну К-1, печи П-1/П-3 и вакуумную колонну К-2',
  isBuiltin: true,
  width: 2600,
  height: 740,
  zones: [
    { id: 'zone-elou-water', x: 10, y: 10, width: 330, height: 90, label: 'УЗЕЛ ПОДАЧИ ПРОМЫВОЧНОЙ ВОДЫ (Н-82)' },
    { id: 'zone-elou-1', x: 10, y: 110, width: 920, height: 140, label: 'I НИТКА ОБЕССОЛИВАНИЯ (Э-1 → Э-2)' },
    { id: 'zone-elou-2', x: 10, y: 260, width: 920, height: 140, label: 'II НИТКА ОБЕССОЛИВАНИЯ (Э-3 → Э-4)' },
    { id: 'zone-elou-3', x: 10, y: 410, width: 920, height: 140, label: 'III НИТКА ОБЕССОЛИВАНИЯ (Э-5 → Э-6)' },
    { id: 'zone-elou-buffer', x: 940, y: 220, width: 320, height: 230, label: 'БУФЕР Е-15 И СЫРЬЕВОЙ НАСОС Н-20' },
    { id: 'zone-elou-drain', x: 10, y: 560, width: 1250, height: 155, label: 'ДРЕНАЖНЫЙ КОЛЛЕКТОР И ЛОВУШКА НЕФТИ (Е-16)' },
    { id: 'zone-at', x: 1280, y: 10, width: 730, height: 705, label: 'АТМОСФЕРНАЯ ПЕРЕГОНКА (АТ: К-1, П-1, П-3)' },
    { id: 'zone-vt', x: 2030, y: 10, width: 550, height: 705, label: 'ВАКУУМНЫЙ БЛОК (ВТ: К-2, Н-32, Н-4)' },
  ],
  columns: [
    {
      id: 'col-k1',
      tag: 'К-1',
      equipmentId: 'K_1',
      x: 1530,
      y: 120,
      levelBinding: 'L_1',
      alertBindings: ['steam_fail', 'valve_jam', 'power_fail'],
    },
    {
      id: 'col-k2',
      tag: 'К-2',
      equipmentId: 'K_2',
      x: 2070,
      y: 160,
      levelBinding: 'L_2',
      alertBindings: ['vt_vacuum_loss', 'k2_pump_fail', 'steam_fail', 'power_fail'],
      tagOffsetY: 112,
    },
  ],
  furnaces: [
    {
      id: 'fur-p3',
      tag: 'П-3',
      equipmentId: 'P_3',
      x: 1330,
      y: 450,
      flameBinding: 'Flame_P3',
      alertBindings: ['power_fail'],
    },
    {
      id: 'fur-p1',
      tag: 'П-1',
      equipmentId: 'P_1',
      x: 1805,
      y: 450,
      flameBinding: 'Flame_P1',
      alertBindings: ['coil_overheat', 'power_fail'],
    },
  ],
  vessels: [
    // 1-я ступень обессоливания
    { id: 'ves-ed1', tag: 'Э-1', equipmentId: 'ED_1', x: 380, y: 150, alertBindings: ['elou_desalt_fail'] },
    { id: 'ves-ed3', tag: 'Э-3', equipmentId: 'ED_3', x: 380, y: 300, alertBindings: ['elou_desalt_fail'] },
    { id: 'ves-ed5', tag: 'Э-5', equipmentId: 'ED_5', x: 380, y: 450, alertBindings: ['elou_desalt_fail'] },
    // 2-я ступень глубокого обессоливания
    { id: 'ves-ed2', tag: 'Э-2', equipmentId: 'ED_2', x: 720, y: 150, alertBindings: ['elou_desalt_fail'] },
    { id: 'ves-ed4', tag: 'Э-4', equipmentId: 'ED_4', x: 720, y: 300, alertBindings: ['elou_desalt_fail'] },
    { id: 'ves-ed6', tag: 'Э-6', equipmentId: 'ED_6', x: 720, y: 450, alertBindings: ['elou_desalt_fail'] },
    // Буферная емкость Е-15
    { id: 'ves-e15', tag: 'Е-15', equipmentId: 'VESSEL_E_15', x: 960, y: 305, alertBindings: [] },
    // Вертикальная ловушка нефти Е-16
    { id: 'ves-e16', tag: 'Е-16', equipmentId: 'VESSEL_E_16', orientation: 'vertical', x: 1100, y: 580, alertBindings: [] },
    // Рефлюксная емкость К-1
    { id: 'ves-e1', tag: 'Е-1', equipmentId: 'VESSEL_E_1', x: 1720, y: 60, levelSensorBinding: 'L_E1', alertBindings: ['valve_jam', 'power_fail'] },
    // Вакуумный рефлюкс К-2
    { id: 'ves-e2', tag: 'Е-2', equipmentId: 'VESSEL_E_2', x: 2250, y: 70, levelSensorBinding: 'L_E2', alertBindings: ['vt_vacuum_loss', 'power_fail'] },
  ],
  pumps: [
    { id: 'pump-n82', tag: 'Н-82 (вода)', equipmentId: 'N_82', x: 80, y: 60, alertBindings: ['power_fail'] },
    { id: 'pump-n20', tag: 'Н-20', equipmentId: 'N_20', x: 1170, y: 330, alertBindings: ['pump_fail', 'power_fail'] },
    { id: 'pump-n3', tag: 'Н-3', equipmentId: 'N_3', x: 1495, y: 490, direction: 'left', alertBindings: ['power_fail'] },
    { id: 'pump-n2', tag: 'Н-2', equipmentId: 'N_2', x: 1710, y: 490, alertBindings: ['power_fail'] },
    { id: 'pump-n32', tag: 'Н-32', equipmentId: 'N_32', x: 2240, y: 490, tagOffsetY: -39, alertBindings: ['k2_pump_fail', 'power_fail'] },
    { id: 'pump-n4', tag: 'Н-4', equipmentId: 'N_4', x: 2240, y: 570, tagOffsetY: -39, alertBindings: ['k2_pump_fail', 'power_fail'] },
  ],
  valves: [
    // Входная гребенка сырья
    { id: 'valve-feed-1', label: 'Вх-1', valveId: 'V_FEED_1', x: 190, y: 170 },
    { id: 'valve-feed-2', label: 'Вх-2', valveId: 'V_FEED_2', x: 190, y: 320 },
    { id: 'valve-feed-3', label: 'Вх-3', valveId: 'V_FEED_3', x: 190, y: 470 },
    { id: 'valve-v-elou', label: 'V-ELOU', valveId: 'V_ELOU', equipmentId: 'V_ELOU', x: 100, y: 260, vertical: true, rotate: 90, hideLabel: true },

    // Смесители 1-й ступени
    { id: 'mixer-a19-1', label: 'А-19/1', valveId: 'A_19_1', kind: 'mixer', x: 280, y: 170 },
    { id: 'mixer-a19-3', label: 'А-19/3', valveId: 'A_19_3', kind: 'mixer', x: 280, y: 320 },
    { id: 'mixer-a19-5', label: 'А-19/5', valveId: 'A_19_5', kind: 'mixer', x: 280, y: 470 },

    // Межступенчатые задвижки
    { id: 'valve-mid-1', label: 'Меж-1', valveId: 'V_MID_1', x: 550, y: 170 },
    { id: 'valve-mid-2', label: 'Меж-2', valveId: 'V_MID_2', x: 550, y: 320 },
    { id: 'valve-mid-3', label: 'Меж-3', valveId: 'V_MID_3', x: 550, y: 470 },

    // Смесители 2-й ступени
    { id: 'mixer-a20-2', label: 'А-20/2', valveId: 'A_20_2', kind: 'mixer', x: 630, y: 170 },
    { id: 'mixer-a20-4', label: 'А-20/4', valveId: 'A_20_4', kind: 'mixer', x: 630, y: 320 },
    { id: 'mixer-a20-6', label: 'А-20/6', valveId: 'A_20_6', kind: 'mixer', x: 630, y: 470 },

    // Выходные клапаны 2-й ступени в коллектор Е-15
    { id: 'valve-out-1', label: 'Вых-1', valveId: 'V_OUT_1', x: 890, y: 170 },
    { id: 'valve-out-2', label: 'Вых-2', valveId: 'V_OUT_2', x: 890, y: 320 },
    { id: 'valve-out-3', label: 'Вых-3', valveId: 'V_OUT_3', x: 890, y: 470 },

    // Е-15 и сквозной сырьевой клапан V-1
    { id: 'valve-e15-drain', label: 'Дрен Е-15', valveId: 'V_E15_DRAIN', x: 1020, y: 380, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-v1', label: 'V-1', valveId: 'V_1', equipmentId: 'V_1', x: 1255, y: 330 },

    // Промывочная вода
    { id: 'valve-water-main', label: 'Вода напор', valveId: 'V_WATER_MAIN', x: 190, y: 35 },
    { id: 'valve-water-stage2', label: 'Вода II ст', valveId: 'V_WATER_ST2', x: 630, y: 70, vertical: true, rotate: 90 },
    { id: 'valve-water-stage1', label: 'Вода I ст', valveId: 'V_WATER_ST1', x: 280, y: 115, vertical: true, rotate: 90 },

    // Дренажные клапаны ЭЛОУ
    { id: 'valve-drain-e1', label: 'Др-1', valveId: 'V_DR_E1', x: 440, y: 220, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-drain-e3', label: 'Др-3', valveId: 'V_DR_E3', x: 440, y: 370, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-drain-e5', label: 'Др-5', valveId: 'V_DR_E5', x: 440, y: 520, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-drain-e2', label: 'Др-2', valveId: 'V_DR_E2', x: 780, y: 220, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-drain-e4', label: 'Др-4', valveId: 'V_DR_E4', x: 780, y: 370, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-drain-e6', label: 'Др-6', valveId: 'V_DR_E6', x: 780, y: 520, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-drain-collector', label: 'Коллектор', valveId: 'V_DR_COL', x: 1040, y: 630 },
    { id: 'valve-water-discharge', label: 'Сброс воды', valveId: 'V_DR_WATER', x: 1118, y: 675, vertical: true, rotate: 90 },

    // Блок АТ
    { id: 'valve-v2', label: 'V-2', valveId: 'V_2', equipmentId: 'V_2', x: 1595, y: 70, vertical: true, rotate: 90 },
    { id: 'valve-ve1-drain', label: 'ДРЕН Е-1', valveId: 'V_E1_DRAIN', x: 1780, y: 130, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-steam-k1', label: 'ПАР К-1', valveId: 'V_STEAM_K1', x: 1680, y: 250 },
    { id: 'valve-vp3-1', label: 'V-П3-1', valveId: 'V_P3_OUT', x: 1445, y: 490 },
    { id: 'valve-vp3-2', label: 'V-П3-2', valveId: 'V_P3_RETURN', x: 1420, y: 290 },
    { id: 'valve-fuel-p3', label: 'ТОПЛ. П-3', valveId: 'FUEL_P3', x: 1375, y: 540, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-vp1', label: 'V-П1', valveId: 'V_P1_IN', x: 1765, y: 490 },
    { id: 'valve-v3', label: 'V-3', valveId: 'V_3', equipmentId: 'V_3', x: 1940, y: 350, vertical: true, rotate: 90 },
    { id: 'valve-fuel-p1', label: 'ТОПЛ. П-1', valveId: 'FUEL_P1', x: 1850, y: 540, vertical: true, rotate: 90, hideLabel: true },

    // Блок ВТ
    { id: 'valve-vk2-relief', label: 'СБРОС К-2', valveId: 'V_K2_RELIEF', x: 2135, y: 70, vertical: true, rotate: 90 },
    { id: 'valve-ve2-drain', label: 'ДРЕН Е-2', valveId: 'V_E2_DRAIN', x: 2310, y: 140, vertical: true, rotate: 90, hideLabel: true },
    { id: 'valve-steam-k2', label: 'ПАР К-2', valveId: 'V_STEAM_K2', x: 2280, y: 270, hideLabel: true },
    { id: 'valve-vk2-out-32', label: 'V-Н32', valveId: 'V_K2_OUT_32', x: 2330, y: 490 },
    { id: 'valve-vk2-out-4', label: 'V-Н4', valveId: 'V_K2_OUT_4', x: 2330, y: 570 },
  ],
  sensors: [
    // ЭЛОУ
    { id: 'sensor-sal1-int', tag: 'Sal-1 · Соли', sensorKey: 'Sal_1', unit: 'мг/л', x: 1080, y: 250, showSparkline: true, minLimit: 0, maxLimit: 30 },
    { id: 'sensor-w1-int', tag: 'W-1 · Влага', sensorKey: 'W_1', unit: '%', x: 1080, y: 380, showSparkline: true, minLimit: 0, maxLimit: 2.0 },
    // АТ
    { id: 'sensor-p1-int', tag: 'P-1 · К-1', sensorKey: 'P_1', unit: 'МПа', x: 1635, y: 110, showSparkline: true, minLimit: 0.1, maxLimit: 0.6 },
    { id: 'sensor-l1-int', tag: 'L-1 · К-1', sensorKey: 'L_1', unit: '%', x: 1635, y: 180, showLevelGauge: true, fullScaleMm: 4000 },
    { id: 'sensor-t3-int', tag: 'T-3 · П-3', sensorKey: 'T_3', unit: '°C', x: 1350, y: 385, showSparkline: true, minLimit: 200, maxLimit: 380 },
    { id: 'sensor-t1-int', tag: 'T-1 · П-1', sensorKey: 'T_1', unit: '°C', x: 1825, y: 385, showSparkline: true, minLimit: 240, maxLimit: 380 },
    // ВТ
    { id: 'sensor-pvac-int', tag: 'P-вак · К-2', sensorKey: 'P_vac', unit: 'кПа', x: 2165, y: 110, showSparkline: true, minLimit: 0, maxLimit: 20 },
    { id: 'sensor-t2-int', tag: 'T-2 · К-2', sensorKey: 'T_2', unit: '°C', x: 2165, y: 340, showSparkline: true, minLimit: 180, maxLimit: 420 },
    { id: 'sensor-l2-int', tag: 'L-2 · К-2', sensorKey: 'L_2', unit: '%', x: 2165, y: 410, showLevelGauge: true, fullScaleMm: 4000 },
  ],
  pipes: [
    // 1. Сырьевая гребенка ЭЛОУ
    { id: 'pipe-raw-feed', kind: 'crude', flowBinding: 'elouFeed', x1: 20, y1: 320, x2: 120, y2: 320, routing: 'direct' },
    { id: 'pipe-raw-demuls', kind: 'demulsifier', flowBinding: 'demulsifier', x1: 100, y1: 220, x2: 100, y2: 320, routing: 'direct' },
    { id: 'pipe-raw-split-1', kind: 'crude', flowBinding: 'elouFeed', x1: 120, y1: 320, x2: 170, y2: 170, routing: 'elbow-vh' },
    { id: 'pipe-raw-split-2', kind: 'crude', flowBinding: 'elouFeed', x1: 120, y1: 320, x2: 170, y2: 320, routing: 'direct' },
    { id: 'pipe-raw-split-3', kind: 'crude', flowBinding: 'elouFeed', x1: 120, y1: 320, x2: 170, y2: 470, routing: 'elbow-vh' },

    // От задвижек в смесители А-19
    { id: 'pipe-v1-to-a19-1', kind: 'crude', flowBinding: 'elouFeed', x1: 210, y1: 170, x2: 260, y2: 170, routing: 'direct' },
    { id: 'pipe-v2-to-a19-3', kind: 'crude', flowBinding: 'elouFeed', x1: 210, y1: 320, x2: 260, y2: 320, routing: 'direct' },
    { id: 'pipe-v3-to-a19-5', kind: 'crude', flowBinding: 'elouFeed', x1: 210, y1: 470, x2: 260, y2: 470, routing: 'direct' },

    // От смесителей А-19 в дегидраторы 1-й ступени (Э-1, Э-3, Э-5)
    { id: 'pipe-a19-1-to-ed1', kind: 'crude', flowBinding: 'elouFeed', x1: 300, y1: 170, x2: 380, y2: 170, routing: 'direct' },
    { id: 'pipe-a19-3-to-ed3', kind: 'crude', flowBinding: 'elouFeed', x1: 300, y1: 320, x2: 380, y2: 320, routing: 'direct' },
    { id: 'pipe-a19-5-to-ed5', kind: 'crude', flowBinding: 'elouFeed', x1: 300, y1: 470, x2: 380, y2: 470, routing: 'direct' },

    // Межступенчатые перетоки от 1-й ступени к задвижкам
    { id: 'pipe-ed1-to-vmid1', kind: 'crude', flowBinding: 'elouFeed', x1: 500, y1: 170, x2: 530, y2: 170, routing: 'direct' },
    { id: 'pipe-ed3-to-vmid2', kind: 'crude', flowBinding: 'elouFeed', x1: 500, y1: 320, x2: 530, y2: 320, routing: 'direct' },
    { id: 'pipe-ed5-to-vmid3', kind: 'crude', flowBinding: 'elouFeed', x1: 500, y1: 470, x2: 530, y2: 470, routing: 'direct' },

    // От задвижек в смесители А-20
    { id: 'pipe-vmid1-to-a20-2', kind: 'crude', flowBinding: 'elouFeed', x1: 570, y1: 170, x2: 610, y2: 170, routing: 'direct' },
    { id: 'pipe-vmid2-to-a20-4', kind: 'crude', flowBinding: 'elouFeed', x1: 570, y1: 320, x2: 610, y2: 320, routing: 'direct' },
    { id: 'pipe-vmid3-to-a20-6', kind: 'crude', flowBinding: 'elouFeed', x1: 570, y1: 470, x2: 610, y2: 470, routing: 'direct' },

    // От смесителей А-20 в дегидраторы 2-й ступени (Э-2, Э-4, Э-6)
    { id: 'pipe-a20-2-to-ed2', kind: 'crude', flowBinding: 'elouFeed', x1: 650, y1: 170, x2: 720, y2: 170, routing: 'direct' },
    { id: 'pipe-a20-4-to-ed4', kind: 'crude', flowBinding: 'elouFeed', x1: 650, y1: 320, x2: 720, y2: 320, routing: 'direct' },
    { id: 'pipe-a20-6-to-ed6', kind: 'crude', flowBinding: 'elouFeed', x1: 650, y1: 470, x2: 720, y2: 470, routing: 'direct' },

    // От дегидраторов 2-й ступени к выходным задвижкам
    { id: 'pipe-ed2-to-vout1', kind: 'crude', flowBinding: 'elouFeed', x1: 840, y1: 170, x2: 870, y2: 170, routing: 'direct' },
    { id: 'pipe-ed4-to-vout2', kind: 'crude', flowBinding: 'elouFeed', x1: 840, y1: 320, x2: 870, y2: 320, routing: 'direct' },
    { id: 'pipe-ed6-to-vout3', kind: 'crude', flowBinding: 'elouFeed', x1: 840, y1: 470, x2: 870, y2: 470, routing: 'direct' },

    // От выходных клапанов в общий коллектор и буферную емкость Е-15
    { id: 'pipe-vout1-to-collector', kind: 'crude', flowBinding: 'elouFeed', x1: 910, y1: 170, x2: 935, y2: 325, routing: 'elbow-hv' },
    { id: 'pipe-vout2-to-collector', kind: 'crude', flowBinding: 'elouFeed', x1: 910, y1: 320, x2: 935, y2: 325, routing: 'direct' },
    { id: 'pipe-vout3-to-collector', kind: 'crude', flowBinding: 'elouFeed', x1: 910, y1: 470, x2: 935, y2: 325, routing: 'elbow-hv' },
    { id: 'pipe-collector-to-e15', kind: 'crude', flowBinding: 'elouFeed', x1: 935, y1: 325, x2: 960, y2: 325, routing: 'direct' },

    // 2. СКВОЗНОЕ СОЕДИНЕНИЕ: Е-15 → Н-20 → V-1 → КОЛОННА К-1
    { id: 'pipe-e15-to-n20', kind: 'crude', flowBinding: 'k1Feed', x1: 1080, y1: 330, x2: 1140, y2: 330, routing: 'direct' },
    { id: 'pipe-n20-to-v1', kind: 'crude', flowBinding: 'k1Feed', x1: 1200, y1: 330, x2: 1235, y2: 330, routing: 'direct' },
    { id: 'pipe-v1-to-k1', kind: 'crude', flowBinding: 'k1Feed', cutOffValve: 'V_1', x1: 1275, y1: 330, x2: 1530, y2: 220, routing: 'step-h', midX: 1300 },

    // Дренаж Е-15
    { id: 'pipe-e15-drain', kind: 'drain', x1: 1020, y1: 350, x2: 1020, y2: 410, routing: 'direct' },

    // 3. Линии промывочной воды Н-82
    { id: 'pipe-water-in', kind: 'utility', flowBinding: 'washWater', x1: 20, y1: 60, x2: 50, y2: 60, routing: 'direct' },
    { id: 'pipe-water-pump-out', kind: 'utility', flowBinding: 'washWater', x1: 110, y1: 60, x2: 170, y2: 35, routing: 'elbow-vh' },
    { id: 'pipe-water-main-distrib', kind: 'utility', flowBinding: 'washWater', x1: 210, y1: 35, x2: 630, y2: 35, routing: 'direct' },
    { id: 'pipe-water-st2-v', kind: 'utility', flowBinding: 'washWater', x1: 630, y1: 35, x2: 630, y2: 50, routing: 'direct' },
    { id: 'pipe-water-st2-down', kind: 'utility', flowBinding: 'washWater', x1: 630, y1: 90, x2: 630, y2: 450, routing: 'direct' },
    { id: 'pipe-water-st1-v', kind: 'utility', flowBinding: 'washWater', x1: 280, y1: 35, x2: 280, y2: 95, routing: 'direct' },
    { id: 'pipe-water-st1-down', kind: 'utility', flowBinding: 'washWater', x1: 280, y1: 135, x2: 280, y2: 450, routing: 'direct' },

    // 4. Дренажный контур соленой воды и гидрозатвор Е-16
    { id: 'pipe-dr-e1', kind: 'drain', flowBinding: 'elouDrain', x1: 440, y1: 195, x2: 440, y2: 630, routing: 'direct' },
    { id: 'pipe-dr-e3', kind: 'drain', flowBinding: 'elouDrain', x1: 440, y1: 345, x2: 440, y2: 390, routing: 'direct' },
    { id: 'pipe-dr-e5', kind: 'drain', flowBinding: 'elouDrain', x1: 440, y1: 495, x2: 440, y2: 540, routing: 'direct' },
    { id: 'pipe-dr-e2', kind: 'drain', flowBinding: 'elouDrain', x1: 780, y1: 195, x2: 780, y2: 630, routing: 'direct' },
    { id: 'pipe-dr-e4', kind: 'drain', flowBinding: 'elouDrain', x1: 780, y1: 345, x2: 780, y2: 390, routing: 'direct' },
    { id: 'pipe-dr-e6', kind: 'drain', flowBinding: 'elouDrain', x1: 780, y1: 495, x2: 780, y2: 540, routing: 'direct' },
    { id: 'pipe-collector-main', kind: 'drain', flowBinding: 'elouDrain', x1: 440, y1: 630, x2: 1020, y2: 630, routing: 'direct' },
    { id: 'pipe-collector-to-e16', kind: 'drain', flowBinding: 'elouDrain', x1: 1060, y1: 630, x2: 1100, y2: 630, routing: 'direct' },
    { id: 'pipe-e16-trap-oil', kind: 'crude', flowBinding: 'trappedOil', x1: 1136, y1: 595, x2: 1220, y2: 595, routing: 'direct' },
    { id: 'pipe-e16-trap-oil-return', kind: 'crude', flowBinding: 'trappedOil', x1: 1220, y1: 595, x2: 1220, y2: 670, routing: 'direct' },
    { id: 'pipe-e16-water-drain-out', kind: 'drain', flowBinding: 'elouDrain', x1: 1118, y1: 664, x2: 1118, y2: 710, routing: 'direct' },

    // 5. Блок АТ (К-1, П-1, П-3, Е-1)
    { id: 'pipe-gas-relief-1', d: 'M 1595,85 H 1720', kind: 'gas', flowBinding: 'k1Relief' },
    { id: 'pipe-gas-flare-1', d: 'M 1595,120 V 45 H 1680', kind: 'gas', flowBinding: 'k1Relief' },
    { id: 'pipe-drain-e1', kind: 'drain', flowBinding: 'e1Drain', x1: 1780, y1: 100, x2: 1780, y2: 150 },
    { id: 'pipe-steam-k1', kind: 'steam', flowBinding: 'steamK1', x1: 1720, y1: 250, x2: 1640, y2: 250 },
    { id: 'pipe-k1-bottom', d: 'M 1595,410 V 490', kind: 'crude', flowBinding: 'k1BottomOutflow' },
    { id: 'pipe-k1-loop-p3', d: 'M 1595,490 H 1525', kind: 'crude', flowBinding: 'k1Loop' },
    { id: 'pipe-h3-to-p3', d: 'M 1465,490 H 1420', kind: 'crude', flowBinding: 'k1Loop', cutOffValve: 'V_P3_OUT' },
    { id: 'pipe-p3-to-k1', d: 'M 1330,490 H 1285 V 290 H 1530', kind: 'crude', flowBinding: 'k1Loop', cutOffValve: 'V_P3_RETURN' },
    { id: 'pipe-fuel-p3', kind: 'fuel', flowBinding: 'fuelP3', x1: 1375, y1: 510, x2: 1375, y2: 560 },
    { id: 'pipe-k1-bottom-h2', d: 'M 1595,490 H 1680', kind: 'crude', flowBinding: 'k2Feed' },
    { id: 'pipe-h2-to-p1', d: 'M 1740,490 H 1785', kind: 'crude', flowBinding: 'k2Feed', cutOffValve: 'V_P1_IN' },
    { id: 'pipe-fuel-p1', kind: 'fuel', flowBinding: 'fuelP1', x1: 1850, y1: 510, x2: 1850, y2: 560 },

    // 6. Блок ВТ (П-1 → К-2, Е-2, Н-32, Н-4)
    { id: 'pipe-p1-to-k2', d: 'M 1895,490 H 1940 V 350 H 2070', kind: 'crude', flowBinding: 'k2Feed', cutOffValve: 'V_3' },
    { id: 'pipe-k2-top-e2', d: 'M 2135,160 V 90 H 2250', kind: 'gas', flowBinding: 'k1Relief' },
    { id: 'pipe-k2-relief', d: 'M 2135,90 V 45 H 2220', kind: 'gas', flowBinding: 'k1Relief' },
    { id: 'pipe-drain-e2', kind: 'drain', flowBinding: 'e2Drain', x1: 2310, y1: 110, x2: 2310, y2: 160 },
    { id: 'pipe-steam-k2', kind: 'steam', flowBinding: 'steamK2', x1: 2320, y1: 270, x2: 2180, y2: 270 },
    { id: 'pipe-k2-to-h32', d: 'M 2135,450 V 490 H 2210', kind: 'crude', flowBinding: 'k2Outflow32' },
    { id: 'pipe-h32-out', d: 'M 2270,490 H 2490', kind: 'crude', flowBinding: 'k2Outflow32', cutOffValve: 'V_K2_OUT_32' },
    { id: 'pipe-k2-to-h4', d: 'M 2135,490 V 570 H 2210', kind: 'crude', flowBinding: 'k2Outflow4' },
    { id: 'pipe-h4-out', d: 'M 2270,570 H 2490', kind: 'crude', flowBinding: 'k2Outflow4', cutOffValve: 'V_K2_OUT_4' },
  ],
  labels: [
    { id: 'lbl-feed-main', x: 20, y: 305, text: 'Из блока подготовки сырой нефти', className: 'source-label' },
    { id: 'lbl-water-h82', x: 80, y: 25, text: 'Н-82 (вода)', className: 'utility-label' },
    { id: 'lbl-demuls-int', x: 100, y: 200, text: 'ДЕЭМУЛЬГАТОР', className: 'utility-label' },
    { id: 'lbl-st1-title', x: 440, y: 130, text: 'I СТУПЕНЬ ОБЕССОЛИВАНИЯ', className: 'equipment-tag', textAnchor: 'middle' },
    { id: 'lbl-st2-title', x: 780, y: 130, text: 'II СТУПЕНЬ ГЛУБОКОГО ОБЕССОЛИВАНИЯ', className: 'equipment-tag', textAnchor: 'middle' },
    { id: 'lbl-e15-dr', x: 1020, y: 418, text: 'Дренаж', className: 'utility-label', textAnchor: 'middle' },
    { id: 'lbl-trap-oil-int', x: 1150, y: 580, text: 'Уловленная нефть', className: 'source-label' },
    { id: 'lbl-drain-water-int', x: 1130, y: 705, text: 'Дренажная вода', className: 'utility-label' },
    { id: 'lbl-gas-k1', x: 1615, y: 35, text: 'СБРОС ГАЗА К-1', className: 'gas-release-label' },
    { id: 'lbl-drain-e1-int', x: 1800, y: 150, text: 'ДРЕН Е-1', className: 'utility-label' },
    { id: 'lbl-steam-k1-int', x: 1640, y: 240, text: 'ПАР К-1', className: 'utility-label', textAnchor: 'end' },
    { id: 'lbl-fuel-p3-int', x: 1415, y: 550, text: 'ТОПЛ. П-3', className: 'utility-label' },
    { id: 'lbl-fuel-p1-int', x: 1890, y: 550, text: 'ТОПЛ. П-1', className: 'utility-label' },
    { id: 'lbl-gas-k2', x: 2155, y: 35, text: 'СБРОС ВАКУУМА', className: 'gas-release-label' },
    { id: 'lbl-drain-e2-int', x: 2330, y: 150, text: 'ДРЕН Е-2', className: 'utility-label' },
    { id: 'lbl-steam-k2-int', x: 2280, y: 235, text: 'ОТПАРНОЙ ПАР К-2', className: 'utility-label', textAnchor: 'middle' },
    { id: 'lbl-out-gudron', x: 2490, y: 530, text: 'ГУДРОН (В ПАРК)', className: 'source-label' },
  ],
};

export const BUILTIN_PRESETS: MnemoschemeConfig[] = [
  DEFAULT_MNEMOSCHEME_PRESET,
  ELOU_DETAILED_PRESET,
  ELOU_AVT_INTEGRATED_PRESET,
];
