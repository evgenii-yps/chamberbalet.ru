/**
 * Ф1. Верх вьюпорта в состоянии главы.
 *
 * Порог: «ровных строк сверху» — ноль. Ровной считается строка со СКО
 * яркости ниже 0,0008; у фотографии оно на порядок больше даже в самом
 * тёмном месте, у сплошной заливки — на порядок меньше.
 *
 * Зачем именно так. Полосу под шапкой создавал стык: он блок нормального
 * потока, а в пролёте первый экран и сам пролёт лежат fixed, и нижняя часть
 * стыка приходилась на верх окна поверх живого кадра. На первом экране её не
 * видно — слой первого экрана закрывает вьюпорт целиком, — поэтому мерить
 * нужно именно на главе, а не при позиции 0. Замер по позиции 0 давал ноль
 * ровных строк и при сломанном порядке слоёв.
 *
 * Печатается и стопка elementsFromPoint: она называет виновника, а не только
 * фиксирует симптом.
 *
 *     npm run build && npm run qa:chapter
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BUILD } from '../config.mjs';
import { serve, launch, openPage, toChapter, viewsFrom, rowStats, rowRgb } from './harness.mjs';

const FLAT_SD = 0.0008;
const CHAPTER = Number(process.env.CHAPTER || 1);

const OUT = path.join(BUILD, 'qa', 'chapter');
await fs.mkdir(OUT, { recursive: true });
const { url, close } = await serve(4187);
const browser = await launch();

console.log(`\nФ1 — верх вьюпорта на главе ${CHAPTER}`);
console.log(`   порог: ровных строк сверху (СКО < ${FLAT_SD}) — ноль\n`);

const problems = [];
for (const view of viewsFrom(process.env.VIEWS)) {
  const { ctx, page } = await openPage(browser, url, view);
  await toChapter(page, CHAPTER);
  const info = await page.evaluate(() => ({
    photo: document.querySelector('.layer[data-in] .layer__photo')?.dataset.photo,
    stack: document.elementsFromPoint(Math.round(window.innerWidth / 2), 40).slice(0, 6)
      .map((e) => (typeof e.className === 'string' && e.className)
        ? '.' + e.className.trim().split(/\s+/)[0] : e.tagName.toLowerCase()),
  }));
  const file = path.join(OUT, `chapter${CHAPTER}-${view.w}x${view.h}.png`);
  await page.screenshot({ path: file });
  const { data, info: meta } = await sharp(file).toColourspace('srgb')
    .raw().toBuffer({ resolveWithObject: true });

  let flat = 0;
  while (flat < meta.height && rowStats(data, meta, flat).sd < FLAT_SD) flat++;

  console.log(`${view.w} × ${view.h} — кадр ${info.photo}`);
  console.log(`   верх окна рисует: ${info.stack.join(' > ')}`);
  console.log(`   ровных строк сверху: ${flat}  ${flat === 0 ? '·' : '×'}`);
  if (flat) {
    const [r, g, b] = rowRgb(data, meta, flat - 1);
    console.log(`   полоса до y=${flat - 1}, её цвет ${r.toFixed(1)}, ${g.toFixed(1)}, ${b.toFixed(1)}`);
    problems.push(`${view.w}: полоса высотой ${flat} px`);
  }
  console.log();
  await ctx.close();
}
await browser.close(); close();

if (problems.length) {
  console.error('Не сходится:');
  problems.forEach((p) => console.error('  ×', p));
  process.exit(1);
}
console.log('   сходится\n');
