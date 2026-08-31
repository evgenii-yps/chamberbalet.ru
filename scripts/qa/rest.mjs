/**
 * Ф2. Состояние ПОКОЯ на остановке не зависит от того, с какой стороны на неё
 * приехали.
 *
 * Порог: попарный диф ≤ 1 % пикселей.
 *
 * Зачем. Отрисовка обязана быть функцией позиции камеры. Дважды она ею не
 * была: флаг светлого пресета не снимался при возврате на первый экран, а
 * will-change держал слои поднятыми постоянно — композитор выбирает масштаб
 * растеризации поднятого слоя по истории крупностей, а вниз и вверх она
 * обратная. Обе причины сняты, эта проверка их и сторожит.
 *
 * Для остановки k снимок делается дважды: последний переход сверху (k−1 → k)
 * и последний переход снизу (k+1 → k). К предпоследней точке подъезжаем одним
 * прыжком по рельсу — весь пролёт гонять не нужно, важен только последний
 * переход.
 *
 * Прямоугольник .hint исключается: её прозрачность направлена по построению
 * (markRail гасит подсказку на любой главе), это заявленное поведение.
 *
 *     npm run build && npm run qa:rest
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BUILD } from '../config.mjs';
import { serve, launch, openPage, toChapter, viewsFrom, SETTLE } from './harness.mjs';

const OUT = path.join(BUILD, 'qa', 'rest');
const LIMIT = 1;                    // процент различающихся пикселей
const NOISE = 2;                    // Δ канала, ниже которой это шум кодирования
const STOPS = (process.env.STOPS || '0,1,2,3,4,5,6,7').split(',').map(Number);

await fs.mkdir(OUT, { recursive: true });
const { url, close } = await serve(4188);
const browser = await launch();

const key = (page, k) => page.keyboard.press(k).then(() => page.waitForTimeout(SETTLE));
const hintRect = (page) => page.evaluate(() => {
  const e = document.querySelector('.hint');
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: Math.max(0, Math.floor(r.left) - 4), y: Math.max(0, Math.floor(r.top) - 4),
           w: Math.ceil(r.width) + 8, h: Math.ceil(r.height) + 8 };
});
const state = (page) => page.evaluate(() => ({
  moving: document.documentElement.classList.contains('is-moving'),
  bright: document.querySelector('.flight__scrim').hasAttribute('data-bright'),
  opener: getComputedStyle(document.querySelector('.opener')).opacity,
  willChange: getComputedStyle(document.querySelector('.wordmark')).willChange,
}));

async function diff(a, b, skip) {
  const A = await sharp(a).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = A.info;
  let n = 0, bad = 0, max = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (skip && x >= skip.x && x < skip.x + skip.w && y >= skip.y && y < skip.y + skip.h) continue;
    const i = (y * W + x) * C;
    const d = Math.max(Math.abs(A.data[i] - B.data[i]),
                       Math.abs(A.data[i + 1] - B.data[i + 1]),
                       Math.abs(A.data[i + 2] - B.data[i + 2]));
    n++; if (d > NOISE) bad++; if (d > max) max = d;
  }
  return { share: 100 * bad / n, max };
}

console.log('\nФ2 — покой: приезд сверху против приезда снизу');
console.log(`   порог ${LIMIT} % пикселей, шум ниже Δ ${NOISE} из 255\n`);

const rows = [];
for (const view of viewsFrom(process.env.VIEWS)) {
  let hint = null;
  for (const stop of STOPS) {
    // сверху: k−1 → k
    let { ctx, page } = await openPage(browser, url, view);
    if (stop >= 2) await toChapter(page, stop - 1);
    if (stop >= 1) await key(page, 'ArrowDown');
    const down = await state(page);
    hint = hint || await hintRect(page);
    const fD = path.join(OUT, `${view.w}-stop${stop}-down.png`);
    await page.screenshot({ path: fD });
    await ctx.close();

    // снизу: k+1 → k
    ({ ctx, page } = await openPage(browser, url, view));
    await toChapter(page, stop + 1);
    await key(page, 'ArrowUp');
    const up = await state(page);
    const fU = path.join(OUT, `${view.w}-stop${stop}-up.png`);
    await page.screenshot({ path: fU });
    await ctx.close();

    const d = await diff(fD, fU, hint);
    rows.push({
      ширина: view.w, остановка: stop,
      'вниз opener/bright': `${down.opener}/${down.bright ? 'да' : '—'}`,
      'вверх opener/bright': `${up.opener}/${up.bright ? 'да' : '—'}`,
      'is-moving в покое': (down.moving || up.moving) ? 'ДА ×' : 'нет',
      'will-change названия': down.willChange,
      'диф, %': d.share.toFixed(4), 'макс Δ': d.max,
    });
    process.stdout.write('.');
  }
  console.log(` ${view.w} — исключено .hint ${JSON.stringify(hint)}`);
}

console.table(rows);
await browser.close(); close();

const over = rows.filter((r) => Number(r['диф, %']) > LIMIT || r['is-moving в покое'] !== 'нет');
if (over.length) {
  console.error(`\n   × выше порога: ${over.length} из ${rows.length}\n`);
  process.exit(1);
}
console.log(`\n   · все ${rows.length} точек ≤ ${LIMIT} %\n`);
