/**
 * Ф3, подбор. Наименьшее значение scrimText, при котором кадр берёт порог.
 *
 * Не проверка, а инструмент: двоичным поиском подбирает --scrim-frame для
 * каждого кадра и печатает готовые строки для src/content.js. Значение
 * ставится ровно туда, куда его ставит main.js, — на экранный слой.
 *
 * Порядок работы: сюда — за числом, в src/content.js — руками, потом
 * `npm run check` (там статический гейт) и `npm run qa:contrast` (браузер).
 * Порог здесь выше приёмочного (4,60 против 4,50) намеренно: подбор без
 * запаса даёт кадры, которые проваливаются от любой следующей правки.
 *
 *     npm run build && npm run qa:fit
 */
import sharp from 'sharp';
import { serve, launch, openPage, toChapter, viewsFrom, relLum, ratio, hexRgb } from './harness.mjs';

const LINES = [
  { sel: '.layer__kicker', name: 'рубрика',      rgb: hexRgb('#C9A063'), a: 1    },
  { sel: '.layer__title',  name: 'заголовок',    rgb: hexRgb('#F2ECE1'), a: 1    },
  { sel: '.layer__body',   name: 'подзаголовок', rgb: hexRgb('#F2ECE1'), a: 0.70 },
  { sel: '.layer__fact',   name: 'метаданные',   rgb: hexRgb('#F0C070'), a: 1    },
];
const TARGET = Number(process.env.TARGET || 4.60);
const CEILING = 0.94;      // выше этого кадр перестаёт читаться под подписью

const { url, close } = await serve(4189);
const browser = await launch();
const need = {};

for (const view of viewsFrom(process.env.VIEWS, [{ w: 390, h: 844 }, { w: 1280, h: 800 }])) {
  const { ctx, page } = await openPage(browser, url, view);
  for (let chapter = 1; chapter <= 8; chapter++) {
    await toChapter(page, chapter);
    const info = await page.evaluate((sels) => {
      const layer = document.querySelector('.layer[data-in]');
      if (!layer) return null;
      const o = { photo: layer.querySelector('.layer__photo').dataset.photo,
                  bright: layer.hasAttribute('data-bright'), boxes: {} };
      for (const s of sels) {
        const e = layer.querySelector(s); if (!e) continue;
        const r = e.getBoundingClientRect();
        o.boxes[s] = { x: Math.max(0, Math.round(r.left)), y: Math.max(0, Math.round(r.top)),
                       w: Math.round(r.width), h: Math.round(r.height) };
      }
      const b = Object.values(o.boxes);
      o.clip = { x: Math.min(...b.map((v) => v.x)), y: Math.min(...b.map((v) => v.y)) };
      o.clip.width = Math.max(...b.map((v) => v.x + v.w)) - o.clip.x;
      o.clip.height = Math.max(...b.map((v) => v.y + v.h)) - o.clip.y;
      return o;
    }, LINES.map((l) => l.sel));
    if (!info) continue;

    await page.evaluate(() => {
      const st = document.createElement('style'); st.id = 'qa-hide-caption';
      st.textContent = '.layer__caption{visibility:hidden!important}'; document.head.append(st);
    });

    const worst = async (value) => {
      await page.evaluate((v) => {
        const s = document.querySelector('.flight__scrim');
        if (v === null) s.style.removeProperty('--scrim-frame');
        else s.style.setProperty('--scrim-frame', String(v));
      }, value);
      await page.waitForTimeout(90);
      const buf = await page.screenshot({ clip: info.clip });
      const { data, info: meta } = await sharp(buf).toColourspace('srgb')
        .raw().toBuffer({ resolveWithObject: true });
      let min = Infinity, who = '';
      for (const line of LINES) {
        const b = info.boxes[line.sel]; if (!b) continue;
        let best = -1, rgb = [0, 0, 0];
        for (let y = b.y - info.clip.y; y < Math.min(meta.height, b.y - info.clip.y + b.h); y++)
          for (let x = b.x - info.clip.x; x < Math.min(meta.width, b.x - info.clip.x + b.w); x++) {
            if (y < 0 || x < 0) continue;
            const i = (y * meta.width + x) * meta.channels;
            const L = relLum(data[i], data[i + 1], data[i + 2]);
            if (L > best) { best = L; rgb = [data[i], data[i + 1], data[i + 2]]; }
          }
        const fg = line.rgb.map((c, k) => c * line.a + rgb[k] * (1 - line.a));
        const c = ratio(relLum(...fg), best);
        if (c < min) { min = c; who = line.name; }
      }
      return { min, who };
    };

    const asIs = await worst(null);
    let value = null, after = asIs;
    if (asIs.min < TARGET) {
      let lo = info.bright ? 0.72 : 0.55, hi = CEILING;
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2;
        if ((await worst(Number(mid.toFixed(3)))).min >= TARGET) hi = mid; else lo = mid;
      }
      value = Number(hi.toFixed(2));
      after = await worst(value);
    }
    await page.evaluate(() => document.getElementById('qa-hide-caption')?.remove());

    const k = info.photo;
    need[k] = need[k] || { кадр: k, bright: info.bright ? 'да' : '—' };
    need[k][`${view.w}: как есть`] = `${asIs.min.toFixed(2)} (${asIs.who})`;
    need[k][`${view.w}: нужно`] = value ?? '—';
    need[k][`${view.w}: станет`] = after.min.toFixed(2);
    if (value !== null) need[k].итог = Math.max(need[k].итог || 0, value);
  }
  await ctx.close();
}
console.log(`\nПодбор --scrim-frame, порог ${TARGET} : 1 на самом светлом пикселе`);
console.table(Object.values(need));
const out = Object.values(need).filter((v) => v.итог);
console.log(out.length ? '\nВ src/content.js:' : '\n   всем кадрам хватает общего значения');
for (const v of out) console.log(`   ${v.кадр}: scrimText: ${v.итог}`);
console.log();
await browser.close(); close();
