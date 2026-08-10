import {
  K2_LEVEL_HIGH,
  K2_LEVEL_LOW,
  K2_LEVEL_LOW_INTERLOCK,
  K2_PRESSURE_NORMAL,
  K2_PRESSURE_WARNING,
  K2_TEMP_WARNING,
  LEVEL_HIGH,
  LEVEL_LOW,
  PRES_ESD,
  PRES_WARNING,
} from '@/shared/config';
import { INITIAL_PUMPS, type Defects, type Pumps, type Sensors, type Setpoints, type Valves } from './types';

/**
 * Резервная физика установки на случай недоступного бэкенда (демо-режим).
 * Чистая функция одного шага — воспроизводит поведение simulator/ на сервере
 * достаточно близко, чтобы тренажёр оставался управляемым без сети.
 */
export const stepMockPhysics = (
  prev: Sensors,
  valves: Valves,
  setpoints: Setpoints,
  defects: Defects,
  pumps: Pumps = INITIAL_PUMPS,
): Sensors => {
  let nextTemp = prev.T_1;
  let nextTempP3 = prev.T_3;
  let nextPres = prev.P_1;
  let nextLevel = prev.L_1;
  let nextK2Level = prev.L_2;

  const F_in = valves.V_1 && pumps.N_20 && !defects.pump_fail
    ? setpoints.F_in_Sp / 100
    : 0.0;

  // Печь с автоматической компенсацией охлаждения сырья (feedforward)
  const Q_heat =
    (setpoints.T_1_Sp - nextTemp) * 0.15 +
    F_in * (setpoints.T_1_Sp - 60.0) * 0.06 +
    (defects.coil_overheat ? 5.0 : 0.0);
  const Q_cool = F_in * (nextTemp - 60.0) * 0.06;
  nextTemp += Q_heat - Q_cool + (Math.random() - 0.5) * 0.5;
  const p3Flow = valves.V_P3_OUT && valves.V_P3_RETURN && pumps.N_3;
  const p3Rate = p3Flow || valves.HC_P3 ? 0.12 : 0.04;
  nextTempP3 += valves.FUEL_P3
    ? (setpoints.T_3_Sp - nextTempP3) * p3Rate + (Math.random() - 0.5) * 0.3
    : -Math.max(0.2, (nextTempP3 - 60) * 0.015);

  // Колонна (давление)
  nextPres += (nextTemp - 260) * 0.0012 + (nextLevel - 50) * 0.0005;
  if (valves.V_2 && !defects.valve_jam) {
    nextPres -= nextPres * 0.15;
  }
  nextPres = Math.max(0.05, nextPres);

  // Колонна (уровень)
  nextLevel += F_in * 0.6;
  if (valves.V_3) {
    nextLevel -= 0.55 * Math.sqrt(nextLevel / 100.0);
  }
  nextLevel = Math.max(0, Math.min(100, nextLevel));

  const desaltFailed = defects.elou_desalt_fail || !valves.V_ELOU;
  const vacuumLost = defects.vt_vacuum_loss || !valves.V_VT;
  const k2Inflow = valves.V_3 && valves.V_P1_IN && pumps.N_2 ? 1.0 : 0;
  // Насосы Н-4/Н-32 блокируются на том же уровне, что и на сервере, — порог
  // берём из общего конфига, иначе демо-режим разъезжается с реальными ПАЗ
  const pumpsBlocked =
    defects.power_fail || defects.k2_pump_fail || nextK2Level <= K2_LEVEL_LOW_INTERLOCK;
  const hasK2Outflow = (valves.V_K2_OUT_32 && pumps.N_32) || (valves.V_K2_OUT_4 && pumps.N_4);
  const k2Outflow = pumpsBlocked || !hasK2Outflow ? 0 : 1.0;
  nextK2Level = Math.max(0, Math.min(100, nextK2Level + k2Inflow - k2Outflow));

  return {
    T_1: Math.round(nextTemp * 100) / 100,
    T_3: Math.round(nextTempP3 * 100) / 100,
    P_1: Math.round(nextPres * 1000) / 1000,
    L_1: Math.round(nextLevel * 100) / 100,
    Sal_1: desaltFailed ? 42.0 : 4.2,
    W_1: desaltFailed ? 3.2 : 0.15,
    // При срыве вакуума давление обязано уйти за порог сигнализации, иначе
    // демо-режим не покажет ни тревоги, ни роста риска
    P_vac: vacuumLost ? K2_PRESSURE_WARNING + 0.01 : K2_PRESSURE_NORMAL,
    T_2: defects.power_fail ? Math.max(150, prev.T_2 - 0.12) : vacuumLost ? Math.min(420, prev.T_2 + 0.02) : 350.0,
    L_2: Math.round(nextK2Level * 100) / 100,
    L_E1: Math.max(0, prev.L_E1 - (valves.V_E1_DRAIN ? 0.8 : 0)),
    L_E2: Math.max(0, prev.L_E2 - (valves.V_E2_DRAIN ? 0.8 : 0)),
    Flame_P1: valves.FUEL_P1 && setpoints.T_1_Sp > 100,
    Flame_P3: valves.FUEL_P3 && setpoints.T_3_Sp > 100,
    F_in: Math.round(F_in * 1000) / 10,
  };
};

/** Оценка риска аварии в демо-режиме (на сервере считает ИИ-модуль) */
export const evaluateMockRisk = (sensors: Sensors, startupK2Prefill = false): number => {
  let risk = 5;
  if (sensors.T_1 > 310) risk += 30;
  if (sensors.P_1 > PRES_WARNING) risk += 40;
  if (sensors.L_1 > LEVEL_HIGH || sensors.L_1 < LEVEL_LOW) risk += 25;
  if (
    sensors.L_2 > K2_LEVEL_HIGH ||
    (!startupK2Prefill && sensors.L_2 < K2_LEVEL_LOW) ||
    sensors.P_vac > K2_PRESSURE_WARNING ||
    sensors.T_2 > K2_TEMP_WARNING
  ) {
    risk += 25;
  }
  return Math.min(100, risk);
};

/** Пределы, за которыми установка в демо-режиме переходит в аварию */
export const detectMockAccident = (sensors: Sensors): string | null => {
  if (sensors.P_1 >= PRES_ESD) {
    return `Критическое превышение давления в колонне К-1 (более ${PRES_ESD} МПа). Взрыв колонны!`;
  }
  if (sensors.T_1 >= 380) {
    return 'Критический перегрев печи П-1 (выше 380°C). Прогар змеевика и пожар!';
  }
  return null;
};
