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
