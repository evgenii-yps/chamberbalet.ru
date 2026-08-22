/**
 * Ленивая загрузка кадров под троттлингом: не рвётся ли пролёт, если зритель
 * начал листать раньше, чем страница догрузилась.
 *
 *   npm run build && node scripts/qa/lazy.mjs
 *
 * ЗАЧЕМ
 *
 * Кадры пролёта, кроме нулевого, поднимаются после события `load` (прогрев),
 * а если действие случилось раньше — по `onNeed` из самого пролёта. LOOKAHEAD
 * задаёт, насколько заранее. Слишком маленький запас проявляется не ошибкой в
 * консоли, а рывком: слой уже плотный, а картинки под ним ещё нет, и зритель
 * секунду смотрит в пустоту.
 *
 * Худший случай и проверяется: троттлинг 4G, первое действие в момент
 * readyState = interactive (прогрев ещё не начинался), восемь остановок
 * подряд без пауз на чтение.
 *
 * ЧТО СЧИТАЕТСЯ ПРОВАЛОМ
 *
 *   1. Слой с непрозрачностью больше нуля, под которым нет загруженной
 *      картинки: <img> отсутствует, не докачан или битый.
 *   2. Остановка, на которой плотный слой пуст.
 *
 * Длинные кадры отрисовки печатаются справочно: под CPU-троттлингом ×4 они
 * есть всегда, и порогом это делать нечестно.
 *
 * Требует playwright (в зависимости сборки он не входит):
 *   npm i -D playwright
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DIST } from '../config.mjs';
import { chapters } from '../../src/content.js';

/** Мобильный профиль Lighthouse: 1638 кбит/с, RTT 150 мс, CPU ×4. */
const NETWORK = { offline: false, downloadThroughput: 1638 * 1024 / 8, uploadThroughput: 675 * 1024 / 8, latency: 150 };
const CPU_SLOWDOWN = 4;
const PORT = 4177;

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = path.join(DIST, url === '/' ? 'index.html' : url);
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('404'); }
});
await new Promise((r) => server.listen(PORT, r));

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(pass ? ' ·' : ' ×', name, detail ? '— ' + detail : '');
};

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
const ctx = await browser.newContext({
  viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
const noise = [];
page.on('pageerror', (e) => noise.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') noise.push(m.text()); });

const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', NETWORK);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });

/**
 * Сторож и первое действие живут В САМОЙ странице.
 *
 * Момент, который проверяется, короткий: пролёт уже ожил, а `load` ещё не
 * случился. Если ждать этого мгновения снаружи и потом слать действие по
 * управляющему каналу, круговая задержка съедает окно и действие приходит
 * уже на загруженную страницу — проверка тихо перестаёт проверять то, ради
 * чего написана. Поэтому скрипт ставится до навигации и сам:
 *
 *   дожидается первого кадра отрисовки, на котором пролёт активен;
 *   запоминает readyState — им и доказывается, что момент тот самый;
 *   включает сторожа непрозрачности;
 *   шлёт первое действие.
 *
 * Сторож живёт до конца прогона и каждый кадр отрисовки сверяет
 * непрозрачность слоя с состоянием картинки под ним. Проверять это по
 * итоговому состоянию бессмысленно: пустой кадр успеет заполниться.
 */
const BOOT = () => {
  const start = () => {
    const holders = [...document.querySelectorAll('.layer__photo')];
    if (!holders.length || !document.body.classList.contains('is-flight')) {
      requestAnimationFrame(start);
      return;
    }
    window.__FIRST = {
      readyState: document.readyState,
      inMarkup: holders.filter((h) => h.querySelector('img')).length,
    };

    const state = { violations: [], frames: 0, worstFrame: 0, started: performance.now() };
    let previous = performance.now();
    const tick = () => {
      const now = performance.now();
      state.frames++;
      state.worstFrame = Math.max(state.worstFrame, now - previous);
      previous = now;
      const loader = document.querySelector('.loader');
      const covered = Boolean(loader) && !loader.classList.contains('is-done');
      holders.forEach((holder, i) => {
        const style = getComputedStyle(holder);
        const opacity = Number(style.opacity);
        if (opacity <= 0 || style.visibility === 'hidden') return;
        const img = holder.querySelector('img');
        if (img && img.complete && img.naturalWidth > 0) return;
        if (state.violations.length < 40) {
          state.violations.push({
            at: Math.round(now - state.started),
            frame: i,
            opacity: Number(opacity.toFixed(3)),
            covered,                                   // экран загрузки ещё поверх всего
            why: !img ? 'картинки нет в разметке' : 'картинка ещё не догружена',
          });
        }
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.__WATCH = state;

    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
  };
  requestAnimationFrame(start);
};

/**
 * Конец перехода — мгновение, после которого преобразования слоёв перестают
 * меняться: кадровый цикл на остановке просто останавливается.
 */
const settled = (page) => page.evaluate(() => new Promise((resolve) => {
  const holders = [...document.querySelectorAll('.layer__photo')];
  const shot = () => holders.map((h) => h.style.transform + '|' + h.style.opacity).join(';');
  let last = shot(), quiet = performance.now();
  const tick = () => {
    const now = performance.now();
    const s = shot();
    if (s !== last) { last = s; quiet = now; }
    if (now - quiet > 300) resolve(true); else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));

const railStop = () => page.evaluate(() =>
  Number(document.querySelector('.rail__dot[aria-current="true"]')?.dataset.stop ?? -1));

/** Одно действие колесом и ожидание чистой остановки. */
async function step(expected) {
  await page.evaluate(() => window.dispatchEvent(
    new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })));
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    if (await railStop() === expected) { await settled(page); return true; }
    await page.waitForTimeout(60);
  }
  return false;
}

console.log('\nЛенивая загрузка под троттлингом');
console.log(`   4G: ${Math.round(NETWORK.downloadThroughput * 8 / 1024)} кбит/с, RTT ${NETWORK.latency} мс, CPU ×${CPU_SLOWDOWN}`);

await page.addInitScript(BOOT);
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'commit' });

// Первое действие уже ушло изнутри страницы; ждём его следа.
await page.waitForFunction(() => window.__FIRST, null, { timeout: 30000 });
const atStart = await page.evaluate(() => window.__FIRST);
check(`первое действие приходится на readyState = ${atStart.readyState}`,
  atStart.readyState === 'interactive',
  `кадров в разметке на этот момент: ${atStart.inMarkup}`);

const stops = chapters.length;
const timings = [];
let missed = null;
for (let n = 1; n <= stops; n++) {
  const began = Date.now();
  // Первое действие ушло из BOOT, остальные семь шлём отсюда.
  const ok = n === 1
    ? await (async () => {
      const deadline = Date.now() + 25000;
      while (Date.now() < deadline) {
        if (await railStop() === 1) { await settled(page); return true; }
        await page.waitForTimeout(60);
      }
      return false;
    })()
    : await step(n);
  timings.push(Date.now() - began);
  if (!ok) { missed = n; break; }
  // Состояние остановки: плотный слой обязан быть непустым
  const atStop = await page.evaluate(() => {
    const holders = [...document.querySelectorAll('.layer__photo')];
    const dense = holders.filter((h) => Number(getComputedStyle(h).opacity) === 1);
    return {
      dense: dense.length,
      empty: dense.filter((h) => {
        const img = h.querySelector('img');
        return !(img && img.complete && img.naturalWidth > 0);
      }).length,
    };
  });
  if (atStop.dense !== 1 || atStop.empty !== 0) {
    check(`остановка ${n}: плотный слой один и с картинкой`, false,
      `плотных ${atStop.dense}, пустых ${atStop.empty}`);
  }
}

check(`восемь остановок подряд пройдены (${timings.length} из ${stops})`, missed === null,
  missed ? `застряли на остановке ${missed}` : `по ${Math.min(...timings)}–${Math.max(...timings)} мс на остановку`);

const watch = await page.evaluate(() => window.__WATCH);
// Нарушения под ещё не убранным экраном загрузки считаем отдельно: там
// зритель видит экран загрузки, а не пустой кадр. Печатаем в любом случае.
const visible = watch.violations.filter((v) => !v.covered);
const hidden = watch.violations.filter((v) => v.covered);
check('ни одного плотного слоя без загруженной картинки', visible.length === 0,
  visible.slice(0, 4).map((v) => `кадр ${v.frame} на ${v.at} мс, ${v.why} (${v.opacity})`).join('; '));
if (hidden.length) {
  console.log(`   справочно: ${hidden.length} кадр(ов) отрисовки с незаполненным слоем ПОД экраном загрузки`);
}
check('консоль чистая', noise.length === 0, noise.slice(0, 2).join(' | '));

const after = await page.evaluate(() => ({
  loaded: [...document.querySelectorAll('.layer__photo img')].length,
  ready: [...document.querySelectorAll('.layer__photo img')].filter((i) => i.complete && i.naturalWidth > 0).length,
}));
console.log(`\n   кадров подтянуто за прогон: ${after.ready} из ${after.loaded} в разметке`);
console.log(`   кадров отрисовки: ${watch.frames}, самый длинный ${Math.round(watch.worstFrame)} мс ` +
            `(справочно: CPU ×${CPU_SLOWDOWN})`);

await ctx.close();
await browser.close();
server.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} из ${results.length} проверок пройдено`);
if (failed.length) process.exit(1);
