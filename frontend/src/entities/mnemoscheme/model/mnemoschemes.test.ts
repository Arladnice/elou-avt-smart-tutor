import { describe, it, expect } from 'vitest';
import {
  BUILTIN_PRESETS,
  DEFAULT_MNEMOSCHEME_PRESET,
  ELOU_DETAILED_PRESET,
  ELOU_AVT_INTEGRATED_PRESET,
} from './defaultPreset';
import { getSnapPorts } from './snapPorts';
import type { MnemoschemeConfig } from './types';
import type { PumpId, DefectId } from '@/entities/telemetry';

const KNOWN_PUMP_IDS: PumpId[] = ['N_20', 'N_2', 'N_3', 'N_4', 'N_32', 'N_82'];
const KNOWN_DEFECT_IDS: DefectId[] = [
  'pump_fail',
  'coil_overheat',
  'valve_jam',
  'power_fail',
  'air_fail',
  'steam_fail',
  'elou_desalt_fail',
  'vt_vacuum_loss',
  'k2_pump_fail',
];

const validateSchemeIntegrity = (scheme: MnemoschemeConfig) => {
  expect(scheme.id).toBeTruthy();
  expect(scheme.name).toBeTruthy();
  expect(scheme.width).toBeGreaterThanOrEqual(1000);
  expect(scheme.height).toBeGreaterThanOrEqual(500);
  expect(scheme.zones.length).toBeGreaterThan(0);

  // Проверка уникальности всех ID элементов схемы
  const allIds = [
    ...scheme.zones.map(z => z.id),
    ...scheme.columns.map(c => c.id),
    ...scheme.furnaces.map(f => f.id),
    ...scheme.vessels.map(v => v.id),
    ...scheme.pumps.map(p => p.id),
    ...scheme.valves.map(v => v.id),
    ...scheme.sensors.map(s => s.id),
    ...scheme.pipes.map(p => p.id),
    ...scheme.labels.map(l => l.id),
  ];
  const uniqueIds = new Set(allIds);
  expect(uniqueIds.size).toBe(allIds.length);

  // Проверка насосов
  for (const pump of scheme.pumps) {
    expect(KNOWN_PUMP_IDS).toContain(pump.equipmentId as PumpId);
    expect(pump.x).toBeGreaterThanOrEqual(0);
    expect(pump.x).toBeLessThanOrEqual(scheme.width);
    expect(pump.y).toBeGreaterThanOrEqual(0);
    expect(pump.y).toBeLessThanOrEqual(scheme.height);
    if (pump.alertBindings) {
      for (const alert of pump.alertBindings) {
        expect(KNOWN_DEFECT_IDS).toContain(alert as DefectId);
      }
    }
  }

  // Проверка задвижек и клапанов
  for (const valve of scheme.valves) {
    expect(valve.valveId).toBeTruthy();
    expect(valve.x).toBeGreaterThanOrEqual(0);
    expect(valve.x).toBeLessThanOrEqual(scheme.width);
    expect(valve.y).toBeGreaterThanOrEqual(0);
    expect(valve.y).toBeLessThanOrEqual(scheme.height);
  }

  // Проверка печей
  for (const furnace of scheme.furnaces) {
    expect(furnace.tag).toBeTruthy();
    expect(furnace.x).toBeGreaterThanOrEqual(0);
    expect(furnace.y).toBeGreaterThanOrEqual(0);
  }

  // Проверка колонн
  for (const col of scheme.columns) {
    expect(col.tag).toBeTruthy();
    expect(col.x).toBeGreaterThanOrEqual(0);
    expect(col.y).toBeGreaterThanOrEqual(0);
  }

  // Проверка емкостей
  for (const vessel of scheme.vessels) {
    expect(vessel.tag).toBeTruthy();
    expect(vessel.x).toBeGreaterThanOrEqual(0);
    expect(vessel.y).toBeGreaterThanOrEqual(0);
  }

  // Проверка портов привязки
  const snapPorts = getSnapPorts(scheme);
  expect(snapPorts.length).toBeGreaterThan(0);
};

describe('Мнемосхемы установки ЭЛОУ-АВТ-6 (Все 3 встроенных пресета)', () => {
  it('содержит ровно 3 встроенных пресета в BUILTIN_PRESETS', () => {
    expect(BUILTIN_PRESETS.length).toBe(3);
    expect(BUILTIN_PRESETS.map(p => p.id)).toEqual([
      DEFAULT_MNEMOSCHEME_PRESET.id,
      ELOU_DETAILED_PRESET.id,
      ELOU_AVT_INTEGRATED_PRESET.id,
    ]);
  });

  describe('Схема 1: ЭЛОУ-АВТ-6 (Штатный регламент)', () => {
    it('соответствует контракту и валидна по геометрии и тегам', () => {
      validateSchemeIntegrity(DEFAULT_MNEMOSCHEME_PRESET);
      expect(DEFAULT_MNEMOSCHEME_PRESET.columns.length).toBe(2); // К-1, К-2
      expect(DEFAULT_MNEMOSCHEME_PRESET.furnaces.length).toBe(2); // П-1, П-3
      expect(DEFAULT_MNEMOSCHEME_PRESET.vessels.length).toBe(2); // Е-1, Е-2
      expect(DEFAULT_MNEMOSCHEME_PRESET.pumps.length).toBe(5); // Н-20, Н-3, Н-2, Н-32, Н-4
    });

    it('содержит ключевые органы управления учебных сценариев (V-1, V-2, V-3)', () => {
      const valveIds = DEFAULT_MNEMOSCHEME_PRESET.valves.map(v => v.valveId);
      expect(valveIds).toContain('V_1');
      expect(valveIds).toContain('V_2');
      expect(valveIds).toContain('V_3');
    });
  });

  describe('Схема 2: ЭЛОУ: Полная схема обессоливания (3 потока, Э-1..Э-6, Е-15, Е-16)', () => {
    it('соответствует контракту и валидна по геометрии и тегам', () => {
      validateSchemeIntegrity(ELOU_DETAILED_PRESET);
      expect(ELOU_DETAILED_PRESET.vessels.length).toBe(8); // Э-1..Э-6, Е-15, Е-16
      expect(ELOU_DETAILED_PRESET.pumps.length).toBe(2); // Н-82, Н-20
    });

    it('содержит все нитки обессоливания и узел промывочной воды', () => {
      const vesselTags = ELOU_DETAILED_PRESET.vessels.map(v => v.tag);
      expect(vesselTags).toEqual(
        expect.arrayContaining(['Э-1', 'Э-2', 'Э-3', 'Э-4', 'Э-5', 'Э-6', 'Е-15', 'Е-16'])
      );

      const valveIds = ELOU_DETAILED_PRESET.valves.map(v => v.valveId);
      expect(valveIds).toContain('V_FEED_1');
      expect(valveIds).toContain('V_FEED_2');
      expect(valveIds).toContain('V_FEED_3');
      expect(valveIds).toContain('V_WATER_MAIN');
      expect(valveIds).toContain('V_OUT_1');
      expect(valveIds).toContain('V_1'); // Выход сырья в К-1
    });
  });

  describe('Схема 3: ЭЛОУ-АВТ-6: Единая сквозная схема (ЭЛОУ + АТ + ВТ)', () => {
    it('соответствует контракту и валидна по геометрии и тегам', () => {
      validateSchemeIntegrity(ELOU_AVT_INTEGRATED_PRESET);
      expect(ELOU_AVT_INTEGRATED_PRESET.width).toBe(2600);
      expect(ELOU_AVT_INTEGRATED_PRESET.columns.length).toBe(2); // К-1, К-2
      expect(ELOU_AVT_INTEGRATED_PRESET.furnaces.length).toBe(2); // П-1, П-3
      expect(ELOU_AVT_INTEGRATED_PRESET.vessels.length).toBe(10); // Э-1..Э-6, Е-15, Е-16, Е-1, Е-2
      expect(ELOU_AVT_INTEGRATED_PRESET.pumps.length).toBe(6); // Н-82, Н-20, Н-3, Н-2, Н-32, Н-4
    });

    it('объединяет все технологические органы управления всей установки', () => {
      const valveIds = ELOU_AVT_INTEGRATED_PRESET.valves.map(v => v.valveId);
      expect(valveIds).toContain('V_FEED_1');
      expect(valveIds).toContain('V_WATER_MAIN');
      expect(valveIds).toContain('V_1');
      expect(valveIds).toContain('V_2');
      expect(valveIds).toContain('V_3');
    });
  });
});
