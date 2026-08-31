/**
 * Ф3. Контраст подписи на САМОМ СВЕТЛОМ пикселе под ней — в браузере, на
 * собранной странице.
 *
 * Порог 4,5 : 1 для всех четырёх строк подписи.
 *
 * Чем отличается от scripts/check-contrast-photos.mjs: тот считает то же
 * самое статически, по оригиналам и профилю затемнения, и потому годится в
 * гейт (`npm run check`) — браузера он не требует. Здесь фон берётся с
 * готового кадра, со всеми слоями, дизерингом и пересчётом цвета, какие есть
 * на экране. Числа двух проверок обязаны сходиться; расхождение означает, что
 * геометрия в статическом гейте разошлась с боевой.
 *
 * Приём: снимок делается дважды — с погашенной подписью (чистый фон под
 * строкой, уже с затемнением) и обычный. Фон берётся из первого, поэтому
 * собственная тень строки в фон не попадает. Цвет буквы считается композитом
 * объявленного цвета с его альфой поверх этого фона.
 *
 *     npm run build && npm run qa:contrast
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BUILD } from '../config.mjs';
import { serve, launch, openPage, toChapter, viewsFrom, relLum, ratio, hexRgb } from './harness.mjs';

/** Цвета строк — из src/css/flight.css. Альфа там, где цвет полупрозрачный. */
const LINES = [
  { sel: '.layer__kicker', name: 'рубрика',      rgb: hexRgb('#C9A063'), a: 1    },
  { sel: '.layer__title',  name: 'заголовок',    rgb: hexRgb('#F2ECE1'), a: 1    },
  { sel: '.layer__body',   name: 'подзаголовок', rgb: hexRgb('#F2ECE1'), a: 0.70 },
  { sel: '.layer__fact',   name: 'метаданные',   rgb: hexRgb('#F0C070'), a: 1    },
];
const MIN_RATIO = 4.5;

const OUT = path.join(BUILD, 'qa', 'contrast');
await fs.mkdir(OUT, { recursive: true });
const { url, close } = await serve(4186);
const browser = await launch();

const problems = [];
for (const view of viewsFrom(process.env.VIEWS, [{ w: 390, h: 844 }, { w: 1280, h: 800 }])) {
  const { ctx, page } = await openPage(browser, url, view);
  const rows = [];
  for (let chapter = 1; chapter <= 8; chapter++) {
    await toChapter(page, chapter);
    const info = await page.evaluate((sels) => {
      const layer = document.querySelector('.layer[data-in]');
      if (!layer) return null;
      const out = { photo: layer.querySelector('.layer__photo')?.dataset.photo, boxes: {}, sizes: {} };
      for (const s of sels) {
        const e = layer.querySelector(s);
        if (!e) continue;
        const r = e.getBoundingClientRect();
        out.boxes[s] = { x: Math.max(0, Math.round(r.left)), y: Math.max(0, Math.round(r.top)),
                         w: Math.round(r.width), h: Math.round(r.height) };
        out.sizes[s] = parseFloat(getComputedStyle(e).fontSize);
      }
      return out;
    }, LINES.map((l) => l.sel));
    if (!info) continue;

    // фон без букв: тень строки принадлежит строке, а не подложке
    await page.evaluate(() => {
      const st = document.createElement('style');
      st.id = 'qa-hide-caption';
      st.textContent = '.layer__caption{visibility:hidden!important}';
      document.head.append(st);
    });
    await page.waitForTimeout(200);
    const file = path.join(OUT, `bg-${view.w}-${chapter}.png`);
    await page.screenshot({ path: file });
    await page.evaluate(() => document.getElementById('qa-hide-caption')?.remove());

    const { data, info: meta } = await sharp(file).toColourspace('srgb')
      .raw().toBuffer({ resolveWithObject: true });
    const row = { кадр: info.photo };
    for (const line of LINES) {
      const b = info.boxes[line.sel];
      if (!b) { row[line.name] = '—'; continue; }
      let best = -1, rgb = [0, 0, 0];
      for (let y = b.y; y < Math.min(meta.height, b.y + b.h); y++)
        for (let x = b.x; x < Math.min(meta.width, b.x + b.w); x++) {
          const i = (y * meta.width + x) * meta.channels;
          const L = relLum(data[i], data[i + 1], data[i + 2]);
          if (L > best) { best = L; rgb = [data[i], data[i + 1], data[i + 2]]; }
        }
      const fg = line.rgb.map((c, k) => c * line.a + rgb[k] * (1 - line.a));
      const c = ratio(relLum(...fg), best);
      row[line.name] = c.toFixed(2);
      if (c < MIN_RATIO) {
        problems.push(`${view.w}px, ${info.photo}: ${line.name} ${c.toFixed(2)} : 1 < ${MIN_RATIO} : 1`);
      }
    }
    rows.push(row);
  }
  console.log(`\nКонтраст на самом светлом пикселе под строкой — ${view.w} × ${view.h}`);
  console.table(rows);
  await ctx.close();
}
await browser.close(); close();

if (problems.length) {
  console.error('\nНиже порога:');
  problems.forEach((p) => console.error('  ×', p));
  console.error('\n   поднимать не общее значение, а scrimText нужного кадра в src/content.js\n');
  process.exit(1);
}
console.log('\n   сходится\n');
