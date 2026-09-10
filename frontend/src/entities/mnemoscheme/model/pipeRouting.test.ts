import { describe, it, expect } from 'vitest';
import { computePipePath } from '../lib/pathUtils';
import { getSnapPorts, findMatchingPort } from './snapPorts';
import type { MnemoschemeConfig } from './types';

describe('computePipePath', () => {
  it('формирует прямой отрезок для горизонтальной и вертикальной линии', () => {
    expect(computePipePath({ x1: 100, y1: 100, x2: 200, y2: 100, routing: 'elbow-hv' })).toBe(
      'M 100,100 L 200,100'
    );
    expect(computePipePath({ x1: 100, y1: 100, x2: 100, y2: 250, routing: 'step-h' })).toBe(
      'M 100,100 L 100,250'
    );
  });

  it('формирует Г-образную трассу (H-V: сначала горизонталь, затем вертикаль)', () => {
    const path = computePipePath({ x1: 100, y1: 100, x2: 200, y2: 300, routing: 'elbow-hv' });
    expect(path).toBe('M 100,100 H 200 V 300');
  });

  it('формирует Г-образную трассу (V-H: сначала вертикаль, затем горизонталь)', () => {
    const path = computePipePath({ x1: 100, y1: 100, x2: 200, y2: 300, routing: 'elbow-vh' });
    expect(path).toBe('M 100,100 V 300 H 200');
  });

  it('формирует Z-ступеньку (step-h) с автоматическим расчетом центра', () => {
    const path = computePipePath({ x1: 100, y1: 100, x2: 300, y2: 200, routing: 'step-h' });
    expect(path).toBe('M 100,100 H 200 V 200 H 300');
  });

  it('формирует Z-ступеньку (step-h) с пользовательским смещением midX', () => {
    const path = computePipePath({ x1: 100, y1: 100, x2: 300, y2: 200, routing: 'step-h', midX: 250 });
    expect(path).toBe('M 100,100 H 250 V 200 H 300');
  });

  it('формирует Z-ступеньку (step-v) с пользовательским смещением midY', () => {
    const path = computePipePath({ x1: 100, y1: 100, x2: 300, y2: 200, routing: 'step-v', midY: 180 });
    expect(path).toBe('M 100,100 V 180 H 300 V 200');
  });

  it('формирует прямую диагональ при routing: direct', () => {
    const path = computePipePath({ x1: 100, y1: 100, x2: 300, y2: 200, routing: 'direct' });
    expect(path).toBe('M 100,100 L 300,200');
  });

  it('возвращает исходный d, если x1/y1 не заданы', () => {
    expect(computePipePath({ d: 'M 10,20 C 30,40 50,60 70,80' })).toBe('M 10,20 C 30,40 50,60 70,80');
  });
});

describe('getSnapPorts and findMatchingPort', () => {
  const dummyScheme: MnemoschemeConfig = {
    id: 'test',
    name: 'Test Scheme',
    width: 1200,
    height: 600,
    zones: [],
    columns: [{ id: 'col-1', tag: 'К-1', equipmentId: 'K_1', x: 400, y: 100, alertBindings: [] }],
    furnaces: [{ id: 'fur-1', tag: 'П-1', equipmentId: 'P_1', x: 600, y: 200, flameBinding: 'P_1', alertBindings: [] }],
    vessels: [{ id: 'ves-1', tag: 'Е-1', x: 200, y: 300, alertBindings: [] }],
    pumps: [{ id: 'p-1', tag: 'Н-20', equipmentId: 'N_20', x: 150, y: 100 }],
    valves: [{ id: 'v-1', label: 'V-1', valveId: 'V_1', x: 250, y: 100 }],
    sensors: [],
    pipes: [{ id: 'pipe-1', kind: 'crude', x1: 50, y1: 50, x2: 80, y2: 50 }],
    labels: [],
  };

  it('динамически генерирует порты для насосов, колонн, печей, емкостей и клапанов', () => {
    const ports = getSnapPorts(dummyScheme);
    expect(ports.length).toBeGreaterThan(0);

    const pumpIn = ports.find(p => p.id === 'p-1-in');
    expect(pumpIn).toBeDefined();
    expect(pumpIn?.x).toBe(120); // 150 - 30
    expect(pumpIn?.y).toBe(100);

    const pumpOut = ports.find(p => p.id === 'p-1-out');
    expect(pumpOut).toBeDefined();
    expect(pumpOut?.x).toBe(180); // 150 + 30

    const colTop = ports.find(p => p.id === 'col-1-top');
    expect(colTop).toBeDefined();
    expect(colTop?.x).toBe(445); // 400 + 45
    expect(colTop?.y).toBe(100);
  });

  it('находит подходящий порт в пределах допуска tolerance', () => {
    const ports = getSnapPorts(dummyScheme);
    // Ищем около (120, 100) со смещением 2px
    const matched = findMatchingPort(ports, 122, 99, 8);
    expect(matched).toBeDefined();
    expect(matched?.id).toBe('p-1-in');

    // Вне допуска 8px
    const notMatched = findMatchingPort(ports, 135, 100, 8);
    expect(notMatched).toBeUndefined();
  });
});
