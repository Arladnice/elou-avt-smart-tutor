/**
 * Пороги фронтенда обязаны совпадать с доменом бэкенда.
 *
 * thresholds.ts дублирует значения из
 * backend/src/elou_tutor/domain/process_limits.py — иначе подсветка на
 * мнемосхеме, оценка риска в демо-режиме и реальные срабатывания защит
 * расходятся. Шапка файла требует править оба места синхронно, но ничто
 * этого не проверяло: правка порогов К-2 на бэкенде проехала мимо фронтенда
 * и оставила демо-режим на старых уставках.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as thresholds from './thresholds';

// Путь считается от корня фронтенда: под jsdom import.meta.url — это http-адрес
// модуля из дев-сервера vitest, и file-URL из него не получить.
const PROCESS_LIMITS = resolve(
  process.cwd(),
  '../backend/src/elou_tutor/domain/process_limits.py',
);

/** Разбирает `ИМЯ = 123.4` из питоновского модуля констант. */
const readPythonConstants = (): Record<string, number> => {
  const source = readFileSync(PROCESS_LIMITS, 'utf8');
  const constants: Record<string, number> = {};
  for (const line of source.split('\n')) {
    const match = /^([A-Z][A-Z0-9_]*)\s*=\s*(-?\d+(?:\.\d+)?)\s*(?:#.*)?$/.exec(line);
    if (match) constants[match[1]] = Number(match[2]);
  }
  return constants;
};

/** Пары «константа фронтенда → константа домена бэкенда». */
const MIRRORED: Array<[keyof typeof thresholds, string]> = [
  ['PRES_WARNING', 'COLUMN_PRES_WARNING'],
  ['PRES_CRITICAL', 'COLUMN_PRES_CRITICAL_LEVEL'],
  ['TEMP_WARNING', 'FURNACE_TEMP_WARNING'],
  ['TEMP_CRITICAL', 'FURNACE_TEMP_CRITICAL_LEVEL'],
  ['LEVEL_HIGH', 'COLUMN_LEVEL_HIGH'],
  ['LEVEL_HIGH_CRITICAL', 'COLUMN_LEVEL_HIGH_CRITICAL_LEVEL'],
  ['LEVEL_LOW', 'COLUMN_LEVEL_LOW'],
  ['LEVEL_LOW_CRITICAL', 'COLUMN_LEVEL_LOW_CRITICAL_LEVEL'],
  ['K1_LEVEL_FULL_SCALE_MM', 'K1_LEVEL_FULL_SCALE_MM'],
  ['K2_LEVEL_FULL_SCALE_MM', 'K2_LEVEL_FULL_SCALE_MM'],
  ['SETPOINT_ACCEPTANCE_TOLERANCE', 'SETPOINT_ACCEPTANCE_TOLERANCE'],
  ['K2_LEVEL_HIGH', 'K2_LEVEL_HIGH'],
  ['K2_LEVEL_HIGH_CRITICAL', 'K2_LEVEL_HIGH_CRITICAL'],
  ['K2_LEVEL_LOW', 'K2_LEVEL_LOW'],
  ['K2_LEVEL_LOW_INTERLOCK', 'K2_LEVEL_LOW_INTERLOCK'],
  ['K2_LEVEL_LOW_CRITICAL', 'K2_LEVEL_LOW_CRITICAL'],
  ['K2_PRESSURE_NORMAL', 'K2_PRESSURE_NORMAL'],
  ['K2_PRESSURE_WARNING', 'K2_PRESSURE_WARNING'],
  ['K2_PRESSURE_CRITICAL', 'K2_PRESSURE_CRITICAL'],
  ['K2_TEMP_WARNING', 'K2_TEMP_WARNING'],
  ['K2_TEMP_CRITICAL', 'K2_TEMP_CRITICAL'],
  ['STARTUP_FILLING_TIME_LIMIT_SEC', 'STARTUP_FILLING_TIME_LIMIT_SEC'],
  ['STARTUP_HEATING_THRESHOLD_TEMP', 'STARTUP_HEATING_THRESHOLD_TEMP'],
];

test('питоновский модуль порогов читается', () => {
  const constants = readPythonConstants();

  expect(Object.keys(constants).length).toBeGreaterThan(20);
  expect(constants.FURNACE_TEMP_WARNING).toBeDefined();
});

test.each(MIRRORED)('%s совпадает с %s в домене бэкенда', (frontName, backName) => {
  const constants = readPythonConstants();

  expect(constants[backName], `константа ${backName} не найдена в process_limits.py`).toBeDefined();
  expect(thresholds[frontName]).toBeCloseTo(constants[backName], 5);
});
