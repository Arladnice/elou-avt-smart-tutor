import type { MnemoschemeConfig } from './types';

export interface SnapPort {
  id: string;
  label: string;
  x: number;
  y: number;
  category: 'pump' | 'valve' | 'vessel' | 'furnace' | 'column' | 'pipe';
  categoryLabel: string;
  targetId: string;
}

/**
 * Собирает технологические штуцеры и порты подключения со всех аппаратов мнемосхемы.
 * Координаты рассчитываются динамически на основе текущего положения оборудования.
 */
export function getSnapPorts(scheme: MnemoschemeConfig, excludePipeId?: string): SnapPort[] {
  const ports: SnapPort[] = [];

  // 1. Насосы
  scheme.pumps.forEach(p => {
    ports.push({
      id: `${p.id}-in`,
      label: `Всас ${p.tag}`,
      x: p.x - 30,
      y: p.y,
      category: 'pump',
      categoryLabel: 'Насосы',
      targetId: p.id,
    });
    ports.push({
      id: `${p.id}-out`,
      label: `Напор ${p.tag}`,
      x: p.x + 30,
      y: p.y,
      category: 'pump',
      categoryLabel: 'Насосы',
      targetId: p.id,
    });
  });

  // 2. Колонны
  scheme.columns.forEach(c => {
    ports.push({
      id: `${c.id}-top`,
      label: `Верх ${c.tag} (сброс газа)`,
      x: c.x + 45,
      y: c.y,
      category: 'column',
      categoryLabel: 'Колонны',
      targetId: c.id,
    });
    ports.push({
      id: `${c.id}-feed-left`,
      label: `Питание ${c.tag} (левый ввод)`,
      x: c.x,
      y: c.y + 110,
      category: 'column',
      categoryLabel: 'Колонны',
      targetId: c.id,
    });
    ports.push({
      id: `${c.id}-feed-right`,
      label: `Питание ${c.tag} (правый ввод)`,
      x: c.x + 90,
      y: c.y + 110,
      category: 'column',
      categoryLabel: 'Колонны',
      targetId: c.id,
    });
    ports.push({
      id: `${c.id}-bottom`,
      label: `Куб ${c.tag} (остаток)`,
      x: c.x + 45,
      y: c.y + 250,
      category: 'column',
      categoryLabel: 'Колонны',
      targetId: c.id,
    });
  });

  // 3. Печи
  scheme.furnaces.forEach(f => {
    ports.push({
      id: `${f.id}-in`,
      label: `Вход змеевика ${f.tag}`,
      x: f.x,
      y: f.y + 35,
      category: 'furnace',
      categoryLabel: 'Печи',
      targetId: f.id,
    });
    ports.push({
      id: `${f.id}-out`,
      label: `Выход змеевика ${f.tag}`,
      x: f.x + 90,
      y: f.y + 35,
      category: 'furnace',
      categoryLabel: 'Печи',
      targetId: f.id,
    });
    ports.push({
      id: `${f.id}-fuel`,
      label: `Топливный газ ${f.tag}`,
      x: f.x + 45,
      y: f.y + 70,
      category: 'furnace',
      categoryLabel: 'Печи',
      targetId: f.id,
    });
  });

  // 4. Емкости
  scheme.vessels.forEach(v => {
    ports.push({
      id: `${v.id}-in`,
      label: `Штуцер входа ${v.tag}`,
      x: v.x,
      y: v.y + 20,
      category: 'vessel',
      categoryLabel: 'Емкости',
      targetId: v.id,
    });
    ports.push({
      id: `${v.id}-out`,
      label: `Штуцер выхода ${v.tag}`,
      x: v.x + 120,
      y: v.y + 20,
      category: 'vessel',
      categoryLabel: 'Емкости',
      targetId: v.id,
    });
    ports.push({
      id: `${v.id}-drain`,
      label: `Дренаж ${v.tag}`,
      x: v.x + 60,
      y: v.y + 45,
      category: 'vessel',
      categoryLabel: 'Емкости',
      targetId: v.id,
    });
  });

  // 5. Задвижки и клапаны
  scheme.valves.forEach(v => {
    const isVert = Boolean(v.vertical || v.rotate === 90 || v.rotate === 270);
    const name = v.label || v.valveId;
    if (isVert) {
      ports.push({
        id: `${v.id}-in`,
        label: `Вход ${name}`,
        x: v.x,
        y: v.y - 20,
        category: 'valve',
        categoryLabel: 'Задвижки и клапаны',
        targetId: v.id,
      });
      ports.push({
        id: `${v.id}-out`,
        label: `Выход ${name}`,
        x: v.x,
        y: v.y + 20,
        category: 'valve',
        categoryLabel: 'Задвижки и клапаны',
        targetId: v.id,
      });
    } else {
      ports.push({
        id: `${v.id}-in`,
        label: `Вход ${name}`,
        x: v.x - 20,
        y: v.y,
        category: 'valve',
        categoryLabel: 'Задвижки и клапаны',
        targetId: v.id,
      });
      ports.push({
        id: `${v.id}-out`,
        label: `Выход ${name}`,
        x: v.x + 20,
        y: v.y,
        category: 'valve',
        categoryLabel: 'Задвижки и клапаны',
        targetId: v.id,
      });
    }
  });

  // 6. Концы других трубопроводов
  scheme.pipes.forEach(p => {
    if (p.id === excludePipeId) return;
    if (p.x1 !== undefined && p.y1 !== undefined) {
      ports.push({
        id: `${p.id}-start`,
        label: `Линия (${p.kind}) начало`,
        x: p.x1,
        y: p.y1,
        category: 'pipe',
        categoryLabel: 'Трубопроводы',
        targetId: p.id,
      });
    }
    if (p.x2 !== undefined && p.y2 !== undefined) {
      ports.push({
        id: `${p.id}-end`,
        label: `Линия (${p.kind}) конец`,
        x: p.x2,
        y: p.y2,
        category: 'pipe',
        categoryLabel: 'Трубопроводы',
        targetId: p.id,
      });
    }
  });

  return ports;
}

/**
 * Ищет штуцер оборудования, совпадающий с заданными координатами (в пределах допуска tolerance px).
 */
export function findMatchingPort(
  ports: SnapPort[],
  x?: number,
  y?: number,
  tolerance = 8
): SnapPort | undefined {
  if (x === undefined || y === undefined) return undefined;
  return ports.find(p => Math.hypot(p.x - x, p.y - y) <= tolerance);
}
