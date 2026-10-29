/** Бюджет передачи (brotli): код и первая загрузка с шрифтами. Чистый node. */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { DIST, TRANSFER_BUDGET, bytes } from './config.mjs';

const br = (buf) => zlib.brotliCompressSync(buf).length;
const html = await fs.readFile(path.join(DIST, 'index.html'));
let code = br(html);
const sub = async (dir) => (await fs.readdir(path.join(DIST, 'assets', dir))).map((f) => path.join(DIST, 'assets', dir, f));
for (const f of [...await sub('css'), ...await sub('js')]) code += br(await fs.readFile(f));

// шрифты первой загрузки: Prata 400 и Golos 400/500/600 кириллица + латиница (грубо — все файлы)
let fonts = 0;
for (const f of await sub('fonts')) fonts += (await fs.stat(f)).size;
const total = code + fonts;
const rows = [['код (html+css+js, brotli)', code, TRANSFER_BUDGET.code], ['первая загрузка', total, TRANSFER_BUDGET.transfer]];
let bad = 0;
for (const [n, v, cap] of rows) {
  const ok = v <= cap; if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${n}: ${bytes(v)} из ${bytes(cap)}`);
}
if (bad) process.exit(1);
console.log('check-transfer: ок');
