#!/usr/bin/env node
/**
 * Проверка соответствия фронтенда архитектуре Feature-Sliced Design.
 * Правила описаны в docs/architecture.md, раздел 4.
 *
 * Запуск: npm run check:fsd   (из каталога frontend)
 * Зависимостей нет — только стандартная библиотека Node.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(fileURLToPath(new URL('..', import.meta.url)), 'src');

// Слои сверху вниз: слой может импортировать только те, что ниже него.
const LAYERS = ['app', 'pages', 'widgets', 'entities', 'shared'];

// Слои, внутри которых один слайс не должен зависеть от соседнего слайса.
// entities исключены намеренно: сущности ссылаются друг на друга типами
// (session → scenario, simulator → telemetry/session) — это допустимо.
const NO_CROSS_SLICE = new Set(['pages', 'widgets']);

const IMPORT_RE = /(?:from|import)\s*\(?\s*['"]@\/([^'"]+)['"]/g;

/** Рекурсивно собирает все .ts/.tsx файлы каталога. */
function collectFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

/** Возвращает { layer, slice } по пути внутри src, либо null для файлов вне слоёв. */
function locate(relPath) {
  const [layer, slice] = relPath.split(sep);
  if (!LAYERS.includes(layer)) return null;
  return { layer, slice: slice ?? '' };
}

const violations = [];

for (const file of collectFiles(SRC)) {
  const relPath = relative(SRC, file);
  const from = locate(relPath);
  if (!from) continue; // main.tsx, assets и прочее вне слоёв

  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(IMPORT_RE)) {
    const target = locate(match[1].split('/').join(sep));
    if (!target) continue;

    const fromIdx = LAYERS.indexOf(from.layer);
    const targetIdx = LAYERS.indexOf(target.layer);

    if (targetIdx < fromIdx) {
      violations.push(
        `${relPath}: слой "${from.layer}" импортирует вышестоящий слой "${target.layer}" ` +
        `(@/${match[1]}). Разрешено только сверху вниз: ${LAYERS.join(' → ')}.`
      );
      continue;
    }

    if (
      targetIdx === fromIdx &&
      NO_CROSS_SLICE.has(from.layer) &&
      from.slice !== target.slice
    ) {
      violations.push(
        `${relPath}: слайс "${from.layer}/${from.slice}" импортирует соседний ` +
        `"${target.layer}/${target.slice}". Общий код выносите в shared/ или entities/.`
      );
    }
  }
}

if (violations.length > 0) {
  console.error(`\n✗ Нарушений архитектуры FSD: ${violations.length}\n`);
  for (const v of violations) console.error(`  • ${v}`);
  console.error('\nПравила слоёв: docs/architecture.md, раздел 4.1\n');
  process.exit(1);
}

console.log('✓ FSD: правила слоёв соблюдены');
