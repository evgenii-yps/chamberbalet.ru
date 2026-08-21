/**
 * Проверки в настоящем браузере. Требуют playwright, который НЕ входит в
 * зависимости сборки: театру он не нужен, а `npm ci` должен оставаться лёгким.
 *
 *   npm i -D playwright
 *   npm run build && npm run qa
 *
 * Скриншоты кладутся в .build/shots/.
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'dist');
const SHOTS = path.join(ROOT, '.build', 'shots');
await fs.mkdir(SHOTS, { recursive: true });

const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.webp':'image/webp', '.avif':'image/avif', '.woff2':'font/woff2', '.ico':'image/x-icon',
  '.xml':'application/xml', '.txt':'text/plain', '.webmanifest':'application/manifest+json' };

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent((req.url||'/').split('?')[0]);
  const file = path.join(DIST, url === '/' ? 'index.html' : url);
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('404'); }
});
await new Promise(r => server.listen(4173, r));
const URL = 'http://localhost:4173/';

const results = [];
const check = (name, pass, detail='') => { results.push({ name, pass, detail }); console.log(pass ? ' ·' : ' ×', name, detail ? '— ' + detail : ''); };

// PLAYWRIGHT_CHROMIUM — на случай, когда браузер стоит отдельно от playwright
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});

async function openPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...opts });
  const page = await ctx.newPage();
  const console_ = [];
  const external = [];
  const failed = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console_.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => console_.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => failed.push(r.url() + ' ' + (r.failure()?.errorText||'')));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173') && !r.url().startsWith('data:')) external.push(r.url()); });
  return { ctx, page, console_, external, failed };
}

/* ---------------- 1. обычная загрузка ---------------- */
{
  const { ctx, page, console_, external, failed } = await openPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  check('консоль чистая', console_.length === 0, console_.slice(0,3).join(' | '));
  check('ноль внешних запросов', external.length === 0, external.slice(0,3).join(' | '));
  check('нет провалившихся запросов', failed.length === 0, failed.slice(0,3).join(' | '));

  const loaderGone = await page.evaluate(() => {
    const l = document.querySelector('.loader');
    return !l || l.classList.contains('is-done');
  });
  check('экран загрузки уходит', loaderGone);

  // ровно один слой с непрозрачностью 1
  const opacities = async () => page.evaluate(() =>
    [...document.querySelectorAll('.slide__frame')].map((f) => Number(getComputedStyle(f).opacity.slice(0,6))));
  let o = await opacities();
  check('на остановке ровно один слой с непрозрачностью 1',
    o.filter((v) => v === 1).length === 1 && o.filter((v) => v > 0).length === 1,
    `непрозрачных: ${o.filter(v=>v>0).length}`);

  const vis = await page.evaluate(() => [...document.querySelectorAll('.slide__frame')]
    .filter(f => getComputedStyle(f).visibility === 'visible').length);
  check('в покое видим ровно один слой', vis === 1, `видимых слоёв: ${vis}`);

  const scale = await page.evaluate(() => {
    const p = document.querySelector('.slide[data-index="0"] .slide__photo');
    return getComputedStyle(p).transform;
  });
  check('кадр стоит на масштабе 1,15', /matrix\(1\.15/.test(scale), scale);

  const covers = await page.evaluate(() => {
    const img = document.querySelector('.slide[data-index="0"] .slide__photo img');
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return { w: r.width, h: r.height, vw: window.innerWidth, vh: window.innerHeight };
  });
  // Оригиналов может не быть — это нормальное состояние сборки
  check('фотография не меньше экрана',
    !covers || (covers.w >= covers.vw - 1 && covers.h >= covers.vh - 1),
    covers ? `кадр ${Math.round(covers.w)}×${Math.round(covers.h)}, экран ${covers.vw}×${covers.vh}`
           : 'оригиналов нет, проверять нечего');

  await page.screenshot({ path: `${SHOTS}/01-hero.png` });

  /* ------- колесо: очередь мелких дельт = один слайд ------- */
  const idx = () => page.evaluate(() => [...document.querySelectorAll('.slide')]
    .findIndex((s) => Number(getComputedStyle(s.querySelector('.slide__frame')).opacity) === 1));

  const before = await idx();
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 12); await page.waitForTimeout(12); }
  await page.waitForTimeout(1600);
  const afterTrackpad = await idx();
  check('очередь из 12 мелких дельт тачпада = один слайд', afterTrackpad - before === 1,
    `было ${before}, стало ${afterTrackpad}`);

  await page.screenshot({ path: `${SHOTS}/02-chapter.png` });

  /* ------- одиночный щелчок колеса = один слайд ------- */
  const b2 = await idx();
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(1600);
  const a2 = await idx();
  check('один щелчок колеса = один слайд', a2 - b2 === 1, `было ${b2}, стало ${a2}`);

  /* ------- удержание клавиши не пролистывает подряд ------- */
  const b3 = await idx();
  await page.keyboard.down('PageDown');
  await page.waitForTimeout(900);
  await page.keyboard.up('PageDown');
  await page.waitForTimeout(1400);
  const a3 = await idx();
  check('удержание клавиши не пролистывает подряд', a3 - b3 === 1, `было ${b3}, стало ${a3}`);

  /* ------- второе нажатие посреди перехода не считается ------- */
  const b4 = await idx();
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(300);
  await page.keyboard.press('PageDown');   // переход ещё идёт
  await page.waitForTimeout(1600);
  const a4 = await idx();
  check('нажатие посреди перехода не листает второй раз', a4 - b4 === 1, `было ${b4}, стало ${a4}`);

  /* ------- остановиться между слайдами невозможно ------- */
  const fractional = await page.evaluate(() => {
    const o = [...document.querySelectorAll('.slide__frame')].map(f => Number(getComputedStyle(f).opacity));
    return o.filter(v => v > 0 && v < 1).length;
  });
  check('остановиться между слайдами невозможно', fractional === 0, `дробных слоёв: ${fractional}`);

  /* ------- рельс глав ------- */
  const railOk = await page.evaluate(() => {
    const dots = [...document.querySelectorAll('.rail__dot')];
    return dots.length > 0 && dots.every(d => d.tagName === 'BUTTON') &&
           dots.filter(d => d.getAttribute('aria-current') === 'true').length <= 1;
  });
  check('рельс — настоящие кнопки с aria-current', railOk);

  /* ------- End → последний слайд, дальше секции ------- */
  await page.keyboard.press('End');
  await page.waitForTimeout(1400);
  const last = await idx();
  check('End уводит на последний кадр', last === 13, `индекс ${last}`);

  const bodyLocked = await page.evaluate(() => document.body.classList.contains('is-flight'));
  check('в пролёте прокрутка перехвачена', bodyLocked);

  await page.keyboard.press('PageDown');
  await page.waitForTimeout(1500);
  const released = await page.evaluate(() => ({
    locked: document.body.classList.contains('is-flight'),
    overflow: getComputedStyle(document.body).overflow,
    y: window.scrollY,
  }));
  check('после пролёта прокрутка обычная', !released.locked && released.overflow !== 'hidden',
    `overflow: ${released.overflow}, scrollY ${released.y}`);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/03-contact.png` });

  const scrolled = await page.evaluate(() => window.scrollY > 500);
  check('секции листаются нативно', scrolled);

  /* ------- семантика ------- */
  const semantics = await page.evaluate(() => {
    const h1 = document.querySelectorAll('h1').length;
    const levels = [...document.querySelectorAll('h1,h2,h3')].map(h => Number(h.tagName[1]));
    let jumps = 0;
    for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i-1] > 1) jumps++;
    const imgs = [...document.querySelectorAll('.slide__photo img')];
    return { h1, jumps, imgs: imgs.length, noAlt: imgs.filter(i => !i.alt).length,
             main: !!document.querySelector('main'), live: !!document.querySelector('[aria-live]') };
  });
  check('ровно один h1', semantics.h1 === 1, `найдено ${semantics.h1}`);
  check('уровни заголовков без пропусков', semantics.jumps === 0, `пропусков ${semantics.jumps}`);
  check('у всех загруженных кадров есть alt', semantics.noAlt === 0, `без alt: ${semantics.noAlt} из ${semantics.imgs}`);
  check('есть main и aria-live', semantics.main && semantics.live);

  const placeholders = await page.evaluate(() => document.body.textContent.includes('__ЗАПОЛНИТЬ__'));
  check('заглушек на странице нет', !placeholders);

  const money = await page.evaluate(() => /\d+\s*(%|руб|₽)/.test(document.body.textContent));
  check('ставок и сумм на странице нет', !money);

  const hScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check('горизонтального скролла нет', hScroll);

  /* ------- откат, если скрипт не доехал ------- */
  const fallback = await page.evaluate(() => {
    document.documentElement.classList.remove('js');
    const h = document.documentElement.scrollHeight;
    document.documentElement.classList.add('js');
    return { h, vh: window.innerHeight };
  });
  check('без класса js страница снова прокручиваемая стопка',
    fallback.h > fallback.vh * 5, `высота ${fallback.h} при экране ${fallback.vh}`);

  await ctx.close();
}

/* ---------------- 2. без JS ---------------- */
{
  const { ctx, page, console_ } = await openPage({ javaScriptEnabled: false });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const s = await page.evaluate(() => 0).catch(() => null);
  const info = await page.$eval('body', (b) => ({
    overflow: getComputedStyle(b).overflow,
    height: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
  }));
  check('без JS страница прокручивается', info.overflow !== 'hidden' && info.height > info.viewport * 5,
    `высота ${info.height}, overflow ${info.overflow}`);
  const imgs = await page.$$eval('.slide__photo img, .slide__photo noscript', (els) => els.length);
  check('без JS кадры в разметке присутствуют', imgs >= 14, `элементов ${imgs}`);
  const loaderHidden = await page.$eval('.loader', (l) => getComputedStyle(l).display === 'none').catch(() => true);
  check('без JS экран загрузки не показывается', loaderHidden);
  await page.screenshot({ path: `${SHOTS}/04-nojs.png`, fullPage: false });
  await ctx.close();
}

/* ---------------- 3. reduced motion ---------------- */
{
  const { ctx, page, console_ } = await openPage({ reducedMotion: 'reduce' });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const state = await page.evaluate(() => ({
    active: document.querySelector('.flight').classList.contains('is-active'),
    locked: document.body.classList.contains('is-flight'),
    video: !!document.querySelector('.slide__video'),
    height: document.documentElement.scrollHeight,
  }));
  check('reduced-motion: пролёт вырождается в прокрутку', !state.active && !state.locked,
    `is-active ${state.active}, is-flight ${state.locked}`);
  check('reduced-motion: видео не подключается', !state.video);
  check('reduced-motion: консоль чистая', console_.length === 0, console_.slice(0,2).join(' | '));
  await ctx.close();
}

/* ---------------- 4. мобильный ---------------- */
{
  const { ctx, page, console_, external } = await openPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  check('мобильный: консоль чистая', console_.length === 0, console_.slice(0,2).join(' | '));
  check('мобильный: ноль внешних запросов', external.length === 0);
  const noH = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check('мобильный: горизонтального скролла нет', noH);
  const mCovers = await page.evaluate(() => {
    const img = document.querySelector('.slide[data-index="0"] .slide__photo img');
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return { w: r.width, h: r.height, vw: window.innerWidth, vh: window.innerHeight };
  });
  check('мобильный: фотография не меньше экрана',
    !mCovers || (mCovers.w >= mCovers.vw - 1 && mCovers.h >= mCovers.vh - 1),
    mCovers ? `кадр ${Math.round(mCovers.w)}×${Math.round(mCovers.h)}, экран ${mCovers.vw}×${mCovers.vh}`
            : 'оригиналов нет, проверять нечего');

  await page.screenshot({ path: `${SHOTS}/05-mobile.png` });
  await ctx.close();
}

await browser.close();
server.close();

const failedChecks = results.filter(r => !r.pass);
console.log(`\n${results.length - failedChecks.length} из ${results.length} проверок пройдено`);
if (failedChecks.length) { console.log('\nНе прошло:'); failedChecks.forEach(f => console.log('  ×', f.name, f.detail)); process.exit(1); }
