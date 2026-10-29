/** Контраст пар токенов (WCAG). Текст ≥ 4.5, крупный ≥ 3. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { SRC } from './config.mjs';

const css = await fs.readFile(path.join(SRC, 'css', 'tokens.css'), 'utf8');
const tok = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(tok[a]), lum(tok[b])].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const PAIRS = [
  ['ink', 'ground'], ['cream', 'ground'], ['cream-2', 'ground'], ['muted', 'ground'], ['patina', 'ground'],
  ['cream', 'ground-2'], ['cream-2', 'ground-2'], ['muted', 'ground-2'], ['patina', 'ground-2'],
  ['cream', 'ground-3'], ['cream-2', 'ground-3'], ['muted', 'ground-3'], ['patina', 'ground-3'], ['ink', 'ground-3'],
  ['patina-dark', 'cream'], ['muted-dark', 'cream'], ['ground', 'cream'],
  ['ground', 'patina'],           // активная плашка переключателя
  ['cream', 'ground-3'],
];
let bad = 0;
for (const [fg, bg] of PAIRS) {
  const r = ratio(fg, bg);
  const ok = r >= 4.5;
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${fg} на ${bg}: ${r.toFixed(1)}:1`);
}
if (bad) process.exit(1);
console.log('check-contrast: ок');
