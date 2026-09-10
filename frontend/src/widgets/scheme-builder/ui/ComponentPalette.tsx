import React from 'react';
import { Plus, Layers, Cpu, Gauge, GitCommit, Tag } from 'lucide-react';
import * as S from './SchemeBuilder.styles';

export type PaletteCategory = 'equipment' | 'pumps' | 'valves' | 'sensors' | 'pipes' | 'labels';

export interface PaletteItemDef {
  type: string;
  name: string;
  sub: string;
  defaultData: Record<string, any>;
}

export interface ComponentPaletteProps {
  onAddItem: (item: PaletteItemDef) => void;
}

const PALETTE_ITEMS: { category: string; icon: React.ReactNode; items: PaletteItemDef[] }[] = [
  {
    category: 'Аппараты и колонны',
    icon: <Layers size={14} />,
    items: [
      {
        type: 'column',
        name: 'Колонна К-1',
        sub: 'Атмосферная ректификационная',
        defaultData: { tag: 'К-1', equipmentId: 'K_1', levelBinding: 'L_1', alertBindings: ['steam_fail', 'valve_jam', 'power_fail'] },
      },
      {
        type: 'column',
        name: 'Колонна К-2',
        sub: 'Вакуумная перегонки мазута',
        defaultData: { tag: 'К-2', equipmentId: 'K_2', levelBinding: 'L_2', alertBindings: ['vt_vacuum_loss', 'k2_pump_fail', 'steam_fail', 'power_fail'], tagOffsetY: 112 },
      },
      {
        type: 'furnace',
        name: 'Печь П-1',
        sub: 'Трубчатая нагревательная',
        defaultData: { tag: 'П-1', equipmentId: 'P_1', flameBinding: 'Flame_P1', alertBindings: ['coil_overheat', 'power_fail'] },
      },
      {
        type: 'furnace',
        name: 'Печь П-3',
        sub: 'Циркуляционная печь К-1',
        defaultData: { tag: 'П-3', equipmentId: 'P_3', flameBinding: 'Flame_P3', alertBindings: ['power_fail'] },
      },
      {
        type: 'vessel',
        name: 'Емкость Е-1',
        sub: 'Рефлюксная емкость К-1',
        defaultData: { tag: 'Е-1', equipmentId: 'VESSEL_E_1', levelSensorBinding: 'L_E1', alertBindings: ['valve_jam', 'power_fail'] },
      },
      {
        type: 'vessel',
        name: 'Емкость Е-2',
        sub: 'Вакуумный рефлюкс К-2',
        defaultData: { tag: 'Е-2', equipmentId: 'VESSEL_E_2', levelSensorBinding: 'L_E2', alertBindings: ['vt_vacuum_loss', 'power_fail'] },
      },
    ],
  },
  {
    category: 'Насосные агрегаты',
    icon: <Cpu size={14} />,
    items: [
      {
        type: 'pump',
        name: 'Насос Н-20',
        sub: 'Сырьевой насос ЭЛОУ',
        defaultData: { tag: 'Н-20', equipmentId: 'N_20', alertBindings: ['pump_fail', 'power_fail'] },
      },
      {
        type: 'pump',
        name: 'Насос Н-3',
        sub: 'Циркуляционный насос П-3',
        defaultData: { tag: 'Н-3', equipmentId: 'N_3', direction: 'left', alertBindings: ['power_fail'] },
      },
      {
        type: 'pump',
        name: 'Насос Н-2',
        sub: 'Сырьевой насос П-1 / К-2',
        defaultData: { tag: 'Н-2', equipmentId: 'N_2', alertBindings: ['power_fail'] },
      },
      {
        type: 'pump',
        name: 'Насос Н-32',
        sub: 'Откачка гудрона К-2 (раб)',
        defaultData: { tag: 'Н-32', equipmentId: 'N_32', tagOffsetY: -39, alertBindings: ['k2_pump_fail', 'power_fail'] },
      },
      {
        type: 'pump',
        name: 'Насос Н-4',
        sub: 'Откачка гудрона К-2 (рез)',
        defaultData: { tag: 'Н-4', equipmentId: 'N_4', tagOffsetY: -39, alertBindings: ['k2_pump_fail', 'power_fail'] },
      },
    ],
  },
  {
    category: 'Запорно-регулирующая арматура',
    icon: <GitCommit size={14} />,
    items: [
      {
        type: 'valve',
        name: 'Задвижка V-1',
        sub: 'Подача сырья в колонну К-1',
        defaultData: { label: 'V-1', valveId: 'V_1', equipmentId: 'V_1' },
      },
      {
        type: 'valve',
        name: 'Сброс V-2',
        sub: 'Сброс газа К-1 на факел',
        defaultData: { label: 'V-2', valveId: 'V_2', equipmentId: 'V_2', vertical: true, rotate: 90 },
      },
      {
        type: 'valve',
        name: 'Задвижка V-3',
        sub: 'Переток мазута К-1 в К-2',
        defaultData: { label: 'V-3', valveId: 'V_3', equipmentId: 'V_3', vertical: true, rotate: 90 },
      },
      {
        type: 'valve',
        name: 'Клапан V-ELOU',
        sub: 'Ввод деэмульгатора в ЭЛОУ',
        defaultData: { label: 'V-ELOU', valveId: 'V_ELOU', equipmentId: 'V_ELOU', vertical: true, rotate: 90, hideLabel: true },
      },
      {
        type: 'valve',
        name: 'Сброс К-2',
        sub: 'Срыв вакуума К-2 на факел',
        defaultData: { label: 'СБРОС К-2', valveId: 'V_K2_RELIEF', vertical: true, rotate: 90 },
      },
      {
        type: 'valve',
        name: 'Пар К-1',
        sub: 'Отпарной пар колонны К-1',
        defaultData: { label: 'ПАР К-1', valveId: 'V_STEAM_K1' },
      },
      {
        type: 'valve',
        name: 'Пар К-2',
        sub: 'Отпарной пар колонны К-2',
        defaultData: { label: 'ПАР К-2', valveId: 'V_STEAM_K2', hideLabel: true },
      },
      {
        type: 'valve',
        name: 'Дренаж Е-1',
        sub: 'Дренаж емкости Е-1',
        defaultData: { label: 'ДРЕН Е-1', valveId: 'V_E1_DRAIN', vertical: true, rotate: 90, hideLabel: true },
      },
      {
        type: 'valve',
        name: 'Дренаж Е-2',
        sub: 'Дренаж емкости Е-2',
        defaultData: { label: 'ДРЕН Е-2', valveId: 'V_E2_DRAIN', vertical: true, rotate: 90, hideLabel: true },
      },
    ],
  },
  {
    category: 'КИПиА и датчики',
    icon: <Gauge size={14} />,
    items: [
      {
        type: 'sensor',
        name: 'T-1 (П-1)',
        sub: 'Температура на выходе печи П-1',
        defaultData: { tag: 'T-1 · П-1', sensorKey: 'T_1', unit: '°C', showSparkline: true, minLimit: 240, maxLimit: 380 },
      },
      {
        type: 'sensor',
        name: 'T-3 (П-3)',
        sub: 'Температура на выходе печи П-3',
        defaultData: { tag: 'T-3 · П-3', sensorKey: 'T_3', unit: '°C', showSparkline: true, minLimit: 240, maxLimit: 380 },
      },
      {
        type: 'sensor',
        name: 'P-1 (К-1)',
        sub: 'Давление верха колонны К-1',
        defaultData: { tag: 'P-1 · К-1', sensorKey: 'P_1', unit: 'МПа', showSparkline: true, minLimit: 0.05, maxLimit: 0.5 },
      },
      {
        type: 'sensor',
        name: 'L-1 (К-1)',
        sub: 'Уровень низа колонны К-1',
        defaultData: { tag: 'L-1 · К-1', sensorKey: 'L_1', unit: '%', showLevelGauge: true, fullScaleMm: 2000 },
      },
      {
        type: 'sensor',
        name: 'P-vac (К-2)',
        sub: 'Остаточное давление вакуума К-2',
        defaultData: { tag: 'P-vac · К-2', sensorKey: 'P_vac', unit: 'МПа' },
      },
      {
        type: 'sensor',
        name: 'T-2 (К-2)',
        sub: 'Температура низа колонны К-2',
        defaultData: { tag: 'T-2 · К-2', sensorKey: 'T_2', unit: '°C', showSparkline: true, minLimit: 180, maxLimit: 420 },
      },
      {
        type: 'sensor',
        name: 'L-2 (К-2)',
        sub: 'Уровень гудрона колонны К-2',
        defaultData: { tag: 'L-2 · К-2', sensorKey: 'L_2', unit: '%', showLevelGauge: true, fullScaleMm: 4000 },
      },
      {
        type: 'sensor',
        name: 'Sal-1 (ЭЛОУ)',
        sub: 'Содержание солей после обессоливания',
        defaultData: { tag: 'Sal-1', sensorKey: 'Sal_1', unit: 'мг/л' },
      },
      {
        type: 'sensor',
        name: 'W-1 (ЭЛОУ)',
        sub: 'Содержание воды в обессоленной нефти',
        defaultData: { tag: 'W-1', sensorKey: 'W_1', unit: '%' },
      },
    ],
  },
  {
    category: 'Трубопроводы и метки',
    icon: <Tag size={14} />,
    items: [
      {
        type: 'pipe',
        name: 'Линия сырья / нефти',
        sub: 'Технологический трубопровод',
        defaultData: { kind: 'crude', length: 140, orientation: 'horizontal', routing: 'direct' },
      },
      {
        type: 'pipe',
        name: 'Линия сброса газа',
        sub: 'Сброс на факельную установку',
        defaultData: { kind: 'gas', length: 140, orientation: 'horizontal', routing: 'direct' },
      },
      {
        type: 'pipe',
        name: 'Паропровод',
        sub: 'Подача водяного пара',
        defaultData: { kind: 'steam', length: 120, orientation: 'horizontal', routing: 'direct' },
      },
      {
        type: 'pipe',
        name: 'Дренажная линия',
        sub: 'Дренаж в емкость или закрытую сеть',
        defaultData: { kind: 'drain', length: 100, orientation: 'vertical', routing: 'direct' },
      },
      {
        type: 'label',
        name: 'Текстовая надпись',
        sub: 'Технологический маркер на схеме',
        defaultData: { text: 'НОВАЯ ЛИНИЯ', className: 'utility-label' },
      },
    ],
  },
];

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({ onAddItem }) => {
  return (
    <S.PaletteSidebar>
      {PALETTE_ITEMS.map(section => (
        <React.Fragment key={section.category}>
          <S.PaletteSectionTitle>
            {section.category}
          </S.PaletteSectionTitle>
          {section.items.map(item => (
            <S.PaletteItem key={item.name} onClick={() => onAddItem(item)}>
              <S.PaletteItemLabel>
                <S.PaletteItemTitle>{item.name}</S.PaletteItemTitle>
                <S.PaletteItemSub>{item.sub}</S.PaletteItemSub>
              </S.PaletteItemLabel>
              <Plus size={14} />
            </S.PaletteItem>
          ))}
        </React.Fragment>
      ))}
    </S.PaletteSidebar>
  );
};
