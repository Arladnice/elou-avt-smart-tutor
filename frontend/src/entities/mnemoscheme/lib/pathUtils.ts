/**
 * Сдвигает координаты всех абсолютных сегментов SVG пути (M, L, H, V) на dx и dy
 */
export function translateSvgPath(d: string, dx: number, dy: number): string {
  if (!d || (dx === 0 && dy === 0)) return d;
  return d.replace(/([A-DF-Za-df-z])([^A-DF-Za-df-z]*)/g, (_, cmd: string, argsStr: string) => {
    const upperCmd = cmd.toUpperCase();
    const isRelative = cmd !== upperCmd;
    if (isRelative) return _;
    const nums = (argsStr.trim().match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (nums.length === 0) return cmd;

    if (upperCmd === 'M' || upperCmd === 'L') {
      const shifted = nums.map((n, i) => (i % 2 === 0 ? Math.round(n + dx) : Math.round(n + dy)));
      const pairs: string[] = [];
      for (let i = 0; i < shifted.length; i += 2) {
        pairs.push(`${shifted[i]},${shifted[i + 1]}`);
      }
      return `${cmd} ${pairs.join(' ')}`;
    }
    if (upperCmd === 'H') {
      const shifted = nums.map(n => Math.round(n + dx));
      return `${cmd} ${shifted.join(' ')}`;
    }
    if (upperCmd === 'V') {
      const shifted = nums.map(n => Math.round(n + dy));
      return `${cmd} ${shifted.join(' ')}`;
    }
    return _;
  });
}

export interface PipeGeometryParams {
  d?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  routing?: 'direct' | 'elbow-hv' | 'elbow-vh' | 'step-h' | 'step-v';
  midX?: number;
  midY?: number;
}

/**
 * Вычисляет SVG-траекторию (d) трубопровода с поддержкой ортогональных изгибов 90°
 */
export function computePipePath(params: PipeGeometryParams): string | undefined {
  const { d, x1, y1, x2, y2, routing, midX, midY } = params;

  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
    return d;
  }

  // Если точки строго на одной прямой по горизонтали или вертикали — прямой отрезок
  if (x1 === x2 || y1 === y2) {
    return `M ${x1},${y1} L ${x2},${y2}`;
  }

  switch (routing) {
    case 'elbow-hv':
      // Г-образная: сначала по горизонтали до x2, затем по вертикали до y2
      return `M ${x1},${y1} H ${x2} V ${y2}`;

    case 'elbow-vh':
      // Г-образная: сначала по вертикали до y2, затем по горизонтали до x2
      return `M ${x1},${y1} V ${y2} H ${x2}`;

    case 'step-h': {
      // Z-ступенька (горизонтальная): H -> V -> H
      const mx = midX !== undefined ? midX : Math.round((x1 + x2) / 2 / 10) * 10;
      return `M ${x1},${y1} H ${mx} V ${y2} H ${x2}`;
    }

    case 'step-v': {
      // Z-ступенька (вертикальная): V -> H -> V
      const my = midY !== undefined ? midY : Math.round((y1 + y2) / 2 / 10) * 10;
      return `M ${x1},${y1} V ${my} H ${x2} V ${y2}`;
    }

    case 'direct':
      // Прямая наклонная линия
      return `M ${x1},${y1} L ${x2},${y2}`;

    default:
      if (d) return d;
      return `M ${x1},${y1} L ${x2},${y2}`;
  }
}
