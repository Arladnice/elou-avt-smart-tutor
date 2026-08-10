/**
 * Резервная физика демо-режима обязана следовать тем же уставкам, что и сервер.
 *
 * Пороги К-2 здесь были зашиты числами (12, 18, 0.07) в обход shared/config,
 * поэтому правка уставок на бэкенде их не затронула: в демо-режиме насосы
 * блокировались не там, где на сервере, а срыв вакуума переставал считаться
 * риском, потому что подставляемое давление оказалось ниже нового порога.
 */

import {
  K2_LEVEL_HIGH,
  K2_LEVEL_LOW,
  K2_LEVEL_LOW_INTERLOCK,
  K2_PRESSURE_WARNING,
  K2_TEMP_WARNING,
} from '@/shared/config';
import { detectMockAccident, evaluateMockRisk, stepMockPhysics } from './mockSimulation';
import { INITIAL_DEFECTS, INITIAL_SENSORS, INITIAL_VALVES } from './types';
import type { Defects, Sensors, Valves } from './types';

const sensors = (overrides: Partial<Sensors> = {}): Sensors => ({
  ...INITIAL_SENSORS,
  ...overrides,
});

const valves = (overrides: Partial<Valves> = {}): Valves => ({
  ...INITIAL_VALVES,
  ...overrides,
});

const defects = (overrides: Partial<Defects> = {}): Defects => ({
  ...INITIAL_DEFECTS,
  ...overrides,
});

describe('stepMockPhysics: вакуумный блок', () => {
  test('срыв вакуума поднимает остаточное давление выше порога сигнализации', () => {
    const next = stepMockPhysics(
      sensors(),
      valves(),
      { T_1_Sp: 280, T_3_Sp: 280, F_in_Sp: 100 },
      defects({ vt_vacuum_loss: true }),
    );

    expect(next.P_vac).toBeGreaterThan(K2_PRESSURE_WARNING);
  });

  test('исправный вакуум держит давление ниже порога сигнализации', () => {
    const next = stepMockPhysics(sensors(), valves(), { T_1_Sp: 280, T_3_Sp: 280, F_in_Sp: 100 }, defects());

    expect(next.P_vac).toBeLessThan(K2_PRESSURE_WARNING);
  });

  test('откачка куба К-2 останавливается на пороге блокировки насосов', () => {
    const atInterlock = sensors({ L_2: K2_LEVEL_LOW_INTERLOCK });
    // V_3 закрыт: притока нет, уровень меняется только откачкой
    const next = stepMockPhysics(atInterlock, valves({ V_3: false }), { T_1_Sp: 280, T_3_Sp: 280, F_in_Sp: 100 }, defects());

    expect(next.L_2).toBe(K2_LEVEL_LOW_INTERLOCK);
  });

  test('выше порога блокировки откачка работает', () => {
    const aboveInterlock = sensors({ L_2: K2_LEVEL_LOW_INTERLOCK + 10 });
    const next = stepMockPhysics(aboveInterlock, valves({ V_3: false }), { T_1_Sp: 280, T_3_Sp: 280, F_in_Sp: 100 }, defects());

    expect(next.L_2).toBeLessThan(K2_LEVEL_LOW_INTERLOCK + 10);
  });

  test('отказ насосов К-2 останавливает откачку на любом уровне', () => {
    const next = stepMockPhysics(
      sensors({ L_2: 50 }),
      valves({ V_3: false }),
      { T_1_Sp: 280, T_3_Sp: 280, F_in_Sp: 100 },
      defects({ k2_pump_fail: true }),
    );

    expect(next.L_2).toBe(50);
  });
});

describe('evaluateMockRisk: пороги К-2', () => {
  const calmRisk = () => evaluateMockRisk(sensors());

  test('здоровая установка даёт минимальный риск', () => {
    expect(calmRisk()).toBeLessThanOrEqual(10);
  });

  test('давление выше порога сигнализации К-2 поднимает риск', () => {
    const risky = evaluateMockRisk(sensors({ P_vac: K2_PRESSURE_WARNING + 0.005 }));

    expect(risky).toBeGreaterThan(calmRisk());
  });

  test('уровень куба К-2 ниже сигнализации поднимает риск', () => {
    const risky = evaluateMockRisk(sensors({ L_2: K2_LEVEL_LOW - 1 }));

    expect(risky).toBeGreaterThan(calmRisk());
  });

  test('уровень куба К-2 выше сигнализации поднимает риск', () => {
    const risky = evaluateMockRisk(sensors({ L_2: K2_LEVEL_HIGH + 1 }));

    expect(risky).toBeGreaterThan(calmRisk());
  });

  test('перегрев куба К-2 поднимает риск', () => {
    const risky = evaluateMockRisk(sensors({ T_2: K2_TEMP_WARNING + 1 }));

    expect(risky).toBeGreaterThan(calmRisk());
  });

  test('риск не выходит за 100%', () => {
    const everything = evaluateMockRisk(
      sensors({ T_1: 400, P_1: 0.5, L_1: 95, L_2: 95, P_vac: 0.2, T_2: 400 }),
    );

    expect(everything).toBe(100);
  });
});

describe('detectMockAccident', () => {
  test('штатное состояние аварией не считается', () => {
    expect(detectMockAccident(sensors())).toBeNull();
  });

  test('превышение давления в К-1 — авария', () => {
    expect(detectMockAccident(sensors({ P_1: 0.48 }))).toContain('давления');
  });

  test('перегрев печи — авария', () => {
    expect(detectMockAccident(sensors({ T_1: 380 }))).toContain('перегрев');
  });
});
