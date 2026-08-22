/**
 * Проверка демонстрационных сборок в настоящем браузере.
 *
 *   npm run build && node scripts/build-demo.mjs && node scripts/qa/demo.mjs
 *
 * Замер в scripts/measure-pace.mjs считает по формулам. Здесь то же самое
 * меряется секундомером на живой странице: сколько на самом деле длится
 * переход в каждом варианте и совпадает ли это с обещанным числом. Заодно
 * проверяется, что правка flight.js не сломала модель: на остановке ровно
 * один плотный слой, между остановками страница не проваливается в чёрное.
 *
 * Требует playwright (в зависимости сборки он не входит):
 *   npm i -D playwright
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BUILD } from '../config.mjs';
import {
  DURATION_VARIANTS, DURATION_ORDER, CURVE_VARIANTS, CURVE_ORDER,
  DEPTH_VARIANTS, DEPTH_ORDER,
} from '../pace-variants.mjs';

const OUT = path.join(BUILD, 'demo');
const PAGES = [
  { file: 'duration.html', set: DURATION_VARIANTS, order: DURATION_ORDER },
  { file: 'curve.html', set: CURVE_VARIANTS, order: CURVE_ORDER },
  { file: 'depth.html', set: DEPTH_VARIANTS, order: DEPTH_ORDER },
];

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(pass ? ' ·' : ' ×', name, detail ? '— ' + detail : '');
};

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});

/**
 * Секундомер на один переход: от нажатия до мгновения, когда преобразование
 * слоёв перестаёт меняться. Дорисовка после остановки не идёт вовсе — цикл
 * останавливается, — поэтому «перестало меняться» и есть конец перехода.
 *
 * Ждём ПЕРВОГО изменения отдельно и с запасом: начало перехода от первого
 * экрана внешне неподвижно (первый экран ещё плотен, кадр под ним ещё не
 * проявился), и секундомер, который сдаётся за триста миллисекунд, объявил
 * бы такой переход несостоявшимся.
 */
const timeOneStep = (page) => page.evaluate(() => new Promise((resolve) => {
  const layers = [...document.querySelectorAll('.layer__photo')];
  const opener = document.querySelector('.opener');
  const snapshot = () => layers.map((l) => l.style.transform + '|' + l.style.opacity).join(';') +
    '#' + opener.style.transform + '|' + opener.style.opacity;
  let last = snapshot();
  let lastChange = 0;
  const started = performance.now();
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
  const tick = () => {
    const now = performance.now();
    const shot = snapshot();
    if (shot !== last) { last = shot; lastChange = now; }
    if (!lastChange) {
      if (now - started > 2500) resolve(0);          // переход так и не начался
      else requestAnimationFrame(tick);
      return;
    }
    if (now - lastChange > 250) resolve(lastChange - started);
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));

const state = (page) => page.evaluate(() => {
  const photos = [...document.querySelectorAll('.layer__photo')];
  const opacity = photos.map((p) => Number(getComputedStyle(p).opacity));
  const opener = Number(getComputedStyle(document.querySelector('.opener')).opacity);
  // Сколько света вообще доходит до зрителя: единица — экран закрыт.
  const covered = 1 - opacity.reduce((s, o) => s * (1 - o), 1) * (1 - opener);
  return {
    full: opacity.filter((v) => v === 1).length,
    lit: opacity.filter((v) => v > 0).length,
    covered,
    scale: photos.map((p) => {
      const m = /scale\(([\d.]+)\)/.exec(p.style.transform);
      return m ? Number(m[1]) : null;
    }).filter(Boolean),
  };
});

for (const page of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const tab = await ctx.newPage();
  const noise = [];
  tab.on('console', (m) => { if (m.type() === 'error') noise.push(m.text()); });
  tab.on('pageerror', (e) => noise.push(e.message));
  await tab.goto(pathToFileURL(path.join(OUT, page.file)).href, { waitUntil: 'load' });
  await tab.waitForTimeout(1200);

  console.log(`\n${page.file}`);
  check('консоль чистая', noise.length === 0, noise.slice(0, 2).join(' | '));
  check('плашка на месте и кнопок столько же, сколько вариантов',
    (await tab.$$('.pace-demo button')).length === page.order.length);

  for (const key of page.order) {
    const want = page.set[key];
    await tab.click(`.pace-demo button[data-pace="${key}"]`);
    // Каждый вариант мерится от одного места и на переходе ГЛАВА → ГЛАВА:
    // Home возвращает на первый экран, первое колесо уводит на первую главу,
    // и уже следующее идёт под секундомер.
    await tab.keyboard.press('Home');
    await tab.waitForTimeout(want.duration + 500);
    await tab.evaluate(() => window.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })));
    await tab.waitForTimeout(want.duration + 500);

    const measured = await timeOneStep(tab);
    const st = await state(tab);

    const off = Math.abs(measured - want.duration);
    check(`${want.title}: переход ${Math.round(measured)} мс при обещанных ${want.duration} мс`,
      off <= Math.max(120, want.duration * 0.06), `расхождение ${Math.round(off)} мс`);
    check(`${want.title}: на остановке ровно один плотный слой`,
      st.full === 1 && st.lit === 1, `плотных ${st.full}, светящихся ${st.lit}`);
    check(`${want.title}: экран закрыт целиком (${(st.covered * 100).toFixed(1)} %)`, st.covered > 0.999);
    check(`${want.title}: кадр не меньше экрана (минимум масштаба ${Math.min(...st.scale).toFixed(3)})`,
      Math.min(...st.scale) >= 1);
  }
  await ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} из ${results.length} проверок пройдено`);
if (failed.length) {
  console.log('\nНе прошло:');
  failed.forEach((f) => console.log('  ×', f.name));
  process.exit(1);
}
