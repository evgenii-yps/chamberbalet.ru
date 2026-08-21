import sharp from 'sharp';
import { readdir, mkdir, copyFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { layers } from '../src/content.js';

const S = 16;
const REF = 'prototype/assets/photo';
const IN  = process.argv[2] || 'media/originals/incoming';
const OUT = 'media/originals/photo';

// Имена слотов берём из src/content.js — это единственный источник правды:
// именно по ним build-images.mjs ищет оригиналы. Расходиться нельзя.
const SLOTS = layers.map((l) => l.photo);

async function dhash(file) {
  const { data } = await sharp(file)
    .greyscale().resize(S + 1, S, { fit: 'fill' })
    .raw().toBuffer({ resolveWithObject: true });
  const bits = [];
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      bits.push(data[y * (S + 1) + x] < data[y * (S + 1) + x + 1] ? 1 : 0);
  return bits;
}
const ham = (a, b) => a.reduce((s, v, i) => s + (v !== b[i] ? 1 : 0), 0);

const apply = process.argv.includes('--apply');
const refs = [];
for (let i = 0; i < 14; i++) {
  const n = String(i + 1).padStart(2, '0');
  refs.push({ slot: SLOTS[i], hash: await dhash(join(REF, `${n}.jpg`)) });
}
const cands = [];
for (const f of (await readdir(IN)).filter(f => /\.(jpe?g|png|tiff?)$/i.test(f)))
  cands.push({ file: f, hash: await dhash(join(IN, f)) });
console.log(`кандидатов: ${cands.length}, слотов: 14`);

const used = new Set();
let suspect = 0;
for (const r of refs) {
  const d = cands.map(c => ({ ...c, d: ham(r.hash, c.hash) })).sort((a, b) => a.d - b.d);
  const [best, second, third] = d;
  const bad = best.d > 20 || second.d < best.d * 3 || used.has(best.file);
  if (bad) suspect++;
  used.add(best.file);
  console.log(`${r.slot.padEnd(24)} ← ${best.file.padEnd(30)} d=${String(best.d).padStart(3)} | 2-й ${second.file} d=${second.d} | 3-й ${third.file} d=${third.d} ${bad ? ' ⚠ ПРОВЕРИТЬ' : ''}`);
  if (apply && !bad) {
    await mkdir(OUT, { recursive: true });
    await copyFile(join(IN, best.file), join(OUT, r.slot + extname(best.file).toLowerCase()));
  }
}
if (suspect) console.error(`\n${suspect} слот(ов) требуют ручной проверки — автоматически не копирую.`);
