/**
 * Ф4. Стык последнего кадра и текстовой части.
 *
 * Два порога, оба замеряются здесь:
 *   ступень на кромке фотографии и во всей зоне стыка — не больше 2,0
 *     уровня sRGB между соседними строками;
 *   растяжка от кромки до сплошного грунта — не короче 25 % высоты кадра.
 *
 * Ступень меряется по средней яркости строки: одна строка поперёк всего окна
 * усредняет содержание фотографии, и остаётся ровно то, что даёт кромка.
 * Порог 2,0 взят как порог различимости горизонтали на почти чёрном фоне —
 * ниже него ступень тонет в собственном шуме кадра и в дизеринге грунта.
 *
 * Заодно печатается число строк со ступенью ≥ 0,9: это сторож полосения
 * восьмибитного градиента. Дизеринг --grain держит его на единицах строк.
 *
 *     npm run build && npm run qa:seam
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BUILD } from '../config.mjs';
import { serve, launch, openPage, exitFlight, viewsFrom, rowStats, rowRgb } from './harness.mjs';

const MAX_STEP = 2.0;      // уровней sRGB между соседними строками
const MIN_RUN = 25;        // % высоты кадра от кромки до сплошного грунта

const OUT = path.join(BUILD, 'qa', 'seam');
await fs.mkdir(OUT, { recursive: true });
const { url, close } = await serve(4184);
const browser = await launch();

console.log('\nФ4 — стык кадра и текстовой секции');
console.log(`   пороги: ступень ≤ ${MAX_STEP.toFixed(1)} уровня sRGB, растяжка ≥ ${MIN_RUN} % высоты кадра\n`);

const problems = [];
for (const view of viewsFrom(process.env.VIEWS)) {
  const { ctx, page } = await openPage(browser, url, view);
  await exitFlight(page);
  // подвести низ пролёта в верхнюю треть окна
  await page.evaluate(() => {
    const f = document.querySelector('.flight');
    window.scrollTo(0, window.scrollY + f.getBoundingClientRect().bottom - window.innerHeight * 0.35);
  });
  await page.waitForTimeout(600);

  const geo = await page.evaluate(() => {
    const box = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
    const scrim = document.querySelector('.flight__scrim');
    const f = box('.flight');
    const s = scrim.getBoundingClientRect();
    return {
      frameH: f.height, photoBottom: f.bottom,
      seamTop: box('.seam').top, seamBottom: box('.seam').bottom,
      scrim: { position: getComputedStyle(scrim).position, opacity: getComputedStyle(scrim).opacity,
               покрываетКадр: Math.abs(s.top - f.top) < 1 && Math.abs(s.bottom - f.bottom) < 1 },
      soil: getComputedStyle(document.documentElement).getPropertyValue('--soil-1').trim(),
    };
  });

  const file = path.join(OUT, `seam-${view.w}.png`);
  await page.screenshot({ path: file });
  const { data, info } = await sharp(file).toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
  const mid = (y) => { const [r, g, b] = rowRgb(data, info, y); return (r + g + b) / 3; };

  const edge = Math.round(geo.photoBottom);
  let atEdge = 0;
  for (let y = Math.max(1, edge - 2); y <= Math.min(info.height - 1, edge + 2); y++) {
    atEdge = Math.max(atEdge, Math.abs(mid(y) - mid(y - 1)));
  }
  const top = Math.max(1, Math.round(geo.seamTop));
  const bottom = Math.min(info.height - 1, Math.round(geo.seamBottom));
  let maxStep = 0, banding = 0;
  for (let y = top; y <= bottom; y++) {
    const d = Math.abs(mid(y) - mid(y - 1));
    if (d > maxStep) maxStep = d;
    if (d >= 0.9) banding++;
  }
  const run = geo.seamBottom - geo.photoBottom;
  const share = 100 * run / geo.frameH;

  console.log(`${view.w} × ${view.h}`);
  console.log(`   ступень на кромке        ${atEdge.toFixed(2)}  ${atEdge <= MAX_STEP ? '·' : '×'}`);
  console.log(`   ступень во всей зоне     ${maxStep.toFixed(2)}  ${maxStep <= MAX_STEP ? '·' : '×'}`);
  console.log(`   растяжка от кромки       ${run.toFixed(0)} px = ${share.toFixed(1)} %  ${share >= MIN_RUN ? '·' : '×'}`);
  console.log(`   строк со ступенью ≥ 0,9  ${banding} из ${bottom - top}`);
  console.log(`   остаточная шторка        ${geo.scrim.position}, opacity ${geo.scrim.opacity}, ` +
              `покрывает последний кадр: ${geo.scrim.покрываетКадр ? 'да' : 'НЕТ ×'}`);
  console.log(`   грунт под стыком         ${geo.soil}\n`);

  if (atEdge > MAX_STEP) problems.push(`${view.w}: ступень на кромке ${atEdge.toFixed(2)} > ${MAX_STEP}`);
  if (maxStep > MAX_STEP) problems.push(`${view.w}: ступень в зоне стыка ${maxStep.toFixed(2)} > ${MAX_STEP}`);
  if (share < MIN_RUN) problems.push(`${view.w}: растяжка ${share.toFixed(1)} % < ${MIN_RUN} %`);
  if (!geo.scrim.покрываетКадр) problems.push(`${view.w}: остаточная шторка не совпала с последним кадром`);
  await ctx.close();
}
await browser.close(); close();

if (problems.length) {
  console.error('Не сходится:');
  problems.forEach((p) => console.error('  ×', p));
  process.exit(1);
}
console.log('   сходится\n');
