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
import sharp from 'sharp';
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
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = path.join(DIST, url === '/' ? 'index.html' : url);
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('404'); }
});
await new Promise((r) => server.listen(4173, r));
const URL = 'http://localhost:4173/';

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(pass ? ' ·' : ' ×', name, detail ? '— ' + detail : '');
};

// PLAYWRIGHT_CHROMIUM — на случай, когда браузер стоит отдельно от playwright
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});

async function openPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...opts });
  const page = await ctx.newPage();
  const noise = [], external = [], failed = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') noise.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => noise.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => failed.push(r.url() + ' ' + (r.failure()?.errorText || '')));
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost:4173') && !r.url().startsWith('data:')) external.push(r.url());
  });
  return { ctx, page, noise, external, failed };
}

/** Какие слои сейчас плотные, и видно ли первый экран. */
const readState = (page) => page.evaluate(() => {
  const photos = [...document.querySelectorAll('.layer__photo')];
  const opacity = photos.map((p) => Number(getComputedStyle(p).opacity));
  const opener = document.querySelector('.opener');
  return {
    opacity,
    full: opacity.filter((v) => v === 1).length,
    lit: opacity.filter((v) => v > 0).length,
    partial: opacity.filter((v) => v > 0 && v < 1).length,
    visible: photos.filter((p) => getComputedStyle(p).visibility === 'visible').length,
    openerOpacity: opener ? Number(getComputedStyle(opener).opacity) : null,
    scrimOpacity: Number(getComputedStyle(document.querySelector('.flight__scrim')).opacity),
    captions: [...document.querySelectorAll('.layer__caption')]
      .filter((c) => getComputedStyle(c).visibility === 'visible' && Number(getComputedStyle(c).opacity) > 0.5).length,
    current: Number(document.querySelector('.rail__dot[aria-current="true"]')?.dataset.stop ?? -1),
  };
});

/** Доля светлых точек в снимке. Тот же порог, что у проверки подписи. */
async function brightShare(shot) {
  const { data } = await sharp(shot).greyscale().raw().toBuffer({ resolveWithObject: true });
  let bright = 0;
  for (const v of data) if (v > 170) bright++;
  return { bright, total: data.length, share: bright / data.length };
}

/**
 * Рисует ли подпись главы хоть что-нибудь в текстовых секциях.
 *
 * Подпись вынесена в position: fixed и живёт поверх всей страницы, поэтому
 * забытый data-in оставляет её висеть над секциями. Проверять это по
 * вычисленным стилям бесполезно: ровно так проверка уже один раз прошла на
 * сломанной странице.
 *
 * Считаем по пикселям. Просто «нет светлых точек» в области HUD не годится:
 * там стоит и собственный текст секции, он светлый по замыслу. Поэтому
 * снимаем область дважды — как есть и с вырезанными из документа подписями —
 * и требуем, чтобы снимки совпали до последней точки. Совпали — значит в
 * области HUD нет ни одной светлой точки, привнесённой подписью.
 *
 * Подпись фиксирована и вне потока: её удаление не может сдвинуть ничего
 * другого, поэтому любое расхождение снимков — это и есть нарисованный HUD.
 */
async function hudPaint(page) {
  // Первая текстовая секция на экран целиком
  await page.evaluate(() => {
    const first = document.querySelector('.after .section');
    first?.scrollIntoView({ block: 'start', behavior: 'auto' });
  });
  await page.waitForTimeout(900);                 // проявление секции успевает закончиться

  const zone = await page.evaluate(() => {
    // Область HUD: где подпись стоит в пролёте. Берём её собственную рамку,
    // а если разметка изменится — нижние две трети левой половины экрана.
    const cap = document.querySelector('.layer__caption');
    const r = cap?.getBoundingClientRect();
    const known = r && r.width > 1 && r.height > 1;
    const w = known ? Math.min(window.innerWidth, r.right + 8) : window.innerWidth * 0.6;
    return {
      x: 0,
      y: Math.round(window.innerHeight * 0.3),
      width: Math.max(8, Math.round(w)),
      height: Math.round(window.innerHeight * 0.7) - 1,
      section: document.querySelector('.after .section')?.id || '',
    };
  });
  const clip = { x: zone.x, y: zone.y, width: zone.width, height: zone.height };

  const asIs = await page.screenshot({ clip });
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'qa-hud-off';
    style.textContent = '.layer__caption { display: none !important; }';
    document.head.append(style);
  });
  const without = await page.screenshot({ clip });
  await page.evaluate(() => document.getElementById('qa-hud-off')?.remove());

  const a = await sharp(asIs).greyscale().raw().toBuffer();
  const b = await sharp(without).greyscale().raw().toBuffer();
  let differ = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differ++;
  const lit = await brightShare(asIs);
  const litWithout = await brightShare(without);

  return {
    section: zone.section,
    differ,
    extraBright: lit.bright - litWithout.bright,
    // Заодно вычисленные стили: подпись не должна быть видимой и по ним тоже
    styled: await page.evaluate(() => [...document.querySelectorAll('.layer__caption')]
      .filter((c) => getComputedStyle(c).visibility === 'visible' &&
                     Number(getComputedStyle(c).opacity) > 0.01).length),
  };
}

/**
 * Свайп пальцем. Настоящие touch-события через CDP: послайдовая навигация на
 * телефоне живёт на них, и проверять её мышью бессмысленно.
 */
async function swipe(cdp, page, fromY, toY, x = 160) {
  const steps = 8;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: fromY }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent',
      { type: 'touchMove', touchPoints: [{ x, y: fromY + (toY - fromY) * (i / steps) }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

const coverage = (page, selector) => page.evaluate((sel) => {
  const img = document.querySelector(sel);
  if (!img) return null;
  const r = img.getBoundingClientRect();
  return { w: r.width, h: r.height, vw: window.innerWidth, vh: window.innerHeight };
}, selector);

/* ---------------- 1. обычная загрузка ---------------- */
{
  const { ctx, page, noise, external, failed } = await openPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);

  check('консоль чистая', noise.length === 0, noise.slice(0, 3).join(' | '));
  check('ноль внешних запросов', external.length === 0, external.slice(0, 3).join(' | '));
  check('нет провалившихся запросов', failed.length === 0, failed.slice(0, 3).join(' | '));

  check('экран загрузки уходит', await page.evaluate(() => {
    const l = document.querySelector('.loader');
    return !l || l.classList.contains('is-done');
  }));

  let st = await readState(page);
  check('на первом экране стопка кадров погашена', st.lit === 0 && st.openerOpacity === 1,
    `плотных слоёв ${st.lit}, первый экран ${st.openerOpacity}`);
  check('на первом экране затемнение не удваивается', st.scrimOpacity < 0.02,
    `экранный слой ${st.scrimOpacity}`);

  const cov = await coverage(page, '.opener__bg img');
  check('первый экран: фотография не меньше экрана',
    !cov || (cov.w >= cov.vw - 1 && cov.h >= cov.vh - 1),
    cov ? `${Math.round(cov.w)}×${Math.round(cov.h)} при экране ${cov.vw}×${cov.vh}` : 'оригиналов нет');

  await page.screenshot({ path: `${SHOTS}/01-opener.png` });

  /* ------- колесо: очередь мелких дельт = одна остановка ------- */
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 12); await page.waitForTimeout(12); }
  await page.waitForTimeout(1800);
  st = await readState(page);
  check('очередь из 12 мелких дельт тачпада = одна остановка', st.current === 1, `остановка ${st.current}`);
  check('на остановке ровно один плотный слой', st.full === 1 && st.lit === 1,
    `плотных ${st.full}, светящихся ${st.lit}`);
  check('в покое видим ровно один слой', st.visible === 1, `видимых ${st.visible}`);
  check('на остановке читается ровно одна подпись', st.captions === 1, `подписей ${st.captions}`);
  check('на главе работает экранное затемнение', st.scrimOpacity > 0.98, `экранный слой ${st.scrimOpacity}`);

  // Пиксели, а не вычисленные стили: подпись однажды уже уезжала под
  // собственный кадр, оставаясь при этом visible и с opacity 1.
  // elementFromPoint здесь не годится — у подписи pointer-events: none.
  const titleBox = await page.evaluate(() => {
    const h2 = document.querySelector('.layer[data-in] .layer__caption h2');
    if (!h2) return null;
    const r = h2.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  });
  let painted = null;
  if (titleBox && titleBox.width > 0 && titleBox.height > 0) {
    painted = await brightShare(await page.screenshot({ clip: titleBox }));
  }
  check('подпись действительно нарисована поверх кадра и затемнения',
    painted !== null && painted.share > 0.02,
    painted ? `светлых пикселей ${(painted.share * 100).toFixed(1)} % в рамке заголовка` : 'заголовка нет');

  const covLayer = await coverage(page, '.layer[data-index="0"] .layer__photo img');
  check('кадр не меньше экрана', !covLayer || (covLayer.w >= covLayer.vw - 1 && covLayer.h >= covLayer.vh - 1),
    covLayer ? `${Math.round(covLayer.w)}×${Math.round(covLayer.h)} при экране ${covLayer.vw}×${covLayer.vh}` : 'оригиналов нет');

  await page.screenshot({ path: `${SHOTS}/02-chapter.png` });

  /* ------- один щелчок колеса = одна остановка ------- */
  const before = (await readState(page)).current;
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(1800);
  check('один щелчок колеса = одна остановка', (await readState(page)).current - before === 1);

  /* ------- удержание клавиши не пролистывает подряд ------- */
  const b2 = (await readState(page)).current;
  await page.keyboard.down('PageDown');
  await page.waitForTimeout(900);
  await page.keyboard.up('PageDown');
  await page.waitForTimeout(1600);
  check('удержание клавиши не пролистывает подряд', (await readState(page)).current - b2 === 1);

  /* ------- нажатие посреди перехода не считается ------- */
  const b3 = (await readState(page)).current;
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(300);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(1800);
  check('нажатие посреди перехода не листает второй раз', (await readState(page)).current - b3 === 1);

  /* ------- остановиться между остановками невозможно ------- */
  check('остановиться между остановками невозможно', (await readState(page)).partial === 0);

  /* ------- рельс ------- */
  check('рельс — восемь кнопок с aria-current', await page.evaluate(() => {
    const dots = [...document.querySelectorAll('.rail__dot')];
    return dots.length === 8 && dots.every((d) => d.tagName === 'BUTTON') &&
           dots.filter((d) => d.getAttribute('aria-current') === 'true').length === 1;
  }));

  /* ------- End и выход в секции ------- */
  await page.keyboard.press('End');
  await page.waitForTimeout(1800);
  check('End уводит на последнюю главу', (await readState(page)).current === 8);
  check('в пролёте прокрутка перехвачена', await page.evaluate(() => document.body.classList.contains('is-flight')));

  await page.keyboard.press('PageDown');
  await page.waitForTimeout(1600);
  const released = await page.evaluate(() => ({
    locked: document.body.classList.contains('is-flight'),
    overflow: getComputedStyle(document.body).overflow,
  }));
  check('после пролёта прокрутка обычная', !released.locked && released.overflow !== 'hidden', released.overflow);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(700);
  check('секции листаются нативно', await page.evaluate(() => window.scrollY > 500));
  await page.screenshot({ path: `${SHOTS}/03-contact.png` });

  /* ------- подпись главы не переживает выход из пролёта ------- */
  let hud = await hudPaint(page);
  check('в первой текстовой секции подпись главы не рисует ни одной точки',
    hud.differ === 0,
    `секция #${hud.section}: расхождение ${hud.differ} точек, светлых сверх фона ${hud.extraBright}`);
  check('в текстовых секциях подпись погашена и по вычисленным стилям', hud.styled === 0,
    `видимых подписей ${hud.styled}`);
  await page.screenshot({ path: `${SHOTS}/06-after-hud.png` });

  /* ------- назад в пролёт и снова вперёд: подпись возвращается и уходит ------- */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(1000);
  const back = await page.evaluate(() => ({
    locked: document.body.classList.contains('is-flight'),
    captions: [...document.querySelectorAll('.layer__caption')]
      .filter((c) => getComputedStyle(c).visibility === 'visible' && Number(getComputedStyle(c).opacity) > 0.5).length,
  }));
  check('возврат в пролёт наверху страницы: подпись последней главы снова на месте',
    back.locked && back.captions === 1, `пролёт ${back.locked}, подписей ${back.captions}`);

  await page.keyboard.press('PageDown');
  await page.waitForTimeout(1600);
  hud = await hudPaint(page);
  check('после возврата и повторного выхода подпись снова не рисует ни одной точки',
    hud.differ === 0 && hud.styled === 0,
    `расхождение ${hud.differ} точек, видимых подписей ${hud.styled}`);

  /* ------- семантика ------- */
  const semantics = await page.evaluate(() => {
    const levels = [...document.querySelectorAll('h1,h2,h3')].map((h) => Number(h.tagName[1]));
    let jumps = 0;
    for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) jumps++;
    const imgs = [...document.querySelectorAll('.layer__photo img')];
    return {
      h1: document.querySelectorAll('h1').length, jumps,
      imgs: imgs.length, noAlt: imgs.filter((i) => !i.alt).length,
      main: !!document.querySelector('main'), live: !!document.querySelector('[aria-live]'),
      chapters: document.querySelectorAll('.layer__caption').length,
    };
  });
  check('ровно один h1', semantics.h1 === 1, `найдено ${semantics.h1}`);
  check('уровни заголовков без пропусков', semantics.jumps === 0);
  check('все восемь глав есть в разметке', semantics.chapters === 8, `найдено ${semantics.chapters}`);
  check('у всех загруженных кадров есть alt', semantics.noAlt === 0, `без alt: ${semantics.noAlt} из ${semantics.imgs}`);
  check('есть main и aria-live', semantics.main && semantics.live);

  check('заглушек на странице нет', !(await page.evaluate(() => document.body.textContent.includes('__ЗАПОЛНИТЬ__'))));
  check('ставок и сумм на странице нет', !(await page.evaluate(() => /\d+\s*(%|руб|₽)/.test(document.body.textContent))));
  check('горизонтального скролла нет', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

  /* ------- откат, если скрипт не доехал ------- */
  const fallback = await page.evaluate(() => {
    document.documentElement.classList.remove('js');
    const h = document.documentElement.scrollHeight;
    document.documentElement.classList.add('js');
    return { h, vh: window.innerHeight };
  });
  check('без класса js страница снова прокручиваемая стопка', fallback.h > fallback.vh * 5,
    `высота ${fallback.h} при экране ${fallback.vh}`);

  await ctx.close();
}

/* ---------------- 2. без JS ---------------- */
{
  const { ctx, page } = await openPage({ javaScriptEnabled: false });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const info = await page.$eval('body', () => ({
    overflow: getComputedStyle(document.body).overflow,
    height: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
    frames: document.querySelectorAll('.layer').length,
    captions: document.querySelectorAll('.layer__caption').length,
    opener: !!document.querySelector('.opener'),
  }));
  check('без JS страница прокручивается',
    info.overflow !== 'hidden' && info.height > info.viewport * 10,
    `высота ${info.height} при экране ${info.viewport}`);
  check('без JS видны первый экран, все кадры и подписи',
    info.opener && info.frames === 8 && info.captions === 8,
    `кадров ${info.frames}, подписей ${info.captions}`);
  check('без JS экран загрузки не показывается',
    await page.$eval('.loader', (l) => getComputedStyle(l).display === 'none').catch(() => true));
  await page.screenshot({ path: `${SHOTS}/04-nojs.png` });
  await ctx.close();
}

/* ---------------- 3. reduced motion ---------------- */
{
  const { ctx, page, noise } = await openPage({ reducedMotion: 'reduce' });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const state = await page.evaluate(() => ({
    locked: document.body.classList.contains('is-flight'),
    video: !!document.querySelector('.opener__video'),
    height: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
  }));
  check('reduced-motion: пролёт вырождается в прокрутку',
    !state.locked && state.height > state.viewport * 10, `высота ${state.height}`);
  check('reduced-motion: видео не подключается', !state.video);
  check('reduced-motion: консоль чистая', noise.length === 0, noise.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ---------------- 4. мобильный ---------------- */
{
  const { ctx, page, noise, external } = await openPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  check('мобильный: консоль чистая', noise.length === 0, noise.slice(0, 2).join(' | '));
  check('мобильный: ноль внешних запросов', external.length === 0);
  check('мобильный: горизонтального скролла нет',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  const clash = await page.evaluate(() => {
    const rail = document.querySelector('.rail');
    if (!rail || getComputedStyle(rail).display === 'none') return { ok: true, why: 'рельса нет' };
    const r = rail.getBoundingClientRect();
    const texts = [...document.querySelectorAll('.opener__kicker, .opener__title, .opener__lede, .layer__caption')];
    const bad = texts.find((t) => {
      const b = t.getBoundingClientRect();
      return b.width > 0 && b.right > r.left && b.bottom > r.top && b.top < r.bottom;
    });
    return { ok: !bad, why: bad ? bad.className : '' };
  });
  check('мобильный: текст не подлезает под рельс глав', clash.ok, clash.why);

  const cov = await coverage(page, '.opener__bg img');
  check('мобильный: фотография не меньше экрана',
    !cov || (cov.w >= cov.vw - 1 && cov.h >= cov.vh - 1),
    cov ? `${Math.round(cov.w)}×${Math.round(cov.h)} при экране ${cov.vw}×${cov.vh}` : 'оригиналов нет');
  await page.screenshot({ path: `${SHOTS}/05-mobile.png` });

  /* ------- послайдовая навигация пальцем и выход из пролёта ------- */
  const cdp = await ctx.newCDPSession(page);
  await swipe(cdp, page, 640, 300);
  await page.waitForTimeout(1600);
  check('мобильный: один свайп = одна остановка',
    (await readState(page)).current === 1, `остановка ${(await readState(page)).current}`);

  await page.keyboard.press('End');
  await page.waitForTimeout(1800);
  await swipe(cdp, page, 640, 300);              // с последней главы — в секции
  await page.waitForTimeout(1600);
  check('мобильный: после пролёта прокрутка обычная',
    !(await page.evaluate(() => document.body.classList.contains('is-flight'))));

  let mhud = await hudPaint(page);
  check('мобильный: в первой текстовой секции подпись главы не рисует ни одной точки',
    mhud.differ === 0,
    `секция #${mhud.section}: расхождение ${mhud.differ} точек, светлых сверх фона ${mhud.extraBright}`);
  check('мобильный: в текстовых секциях подпись погашена и по вычисленным стилям',
    mhud.styled === 0, `видимых подписей ${mhud.styled}`);
  await page.screenshot({ path: `${SHOTS}/07-mobile-after-hud.png` });

  /* ------- свайп вниз наверху страницы возвращает в пролёт ------- */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await swipe(cdp, page, 300, 640);
  await page.waitForTimeout(1000);
  const mback = await page.evaluate(() => ({
    locked: document.body.classList.contains('is-flight'),
    captions: [...document.querySelectorAll('.layer__caption')]
      .filter((c) => getComputedStyle(c).visibility === 'visible' && Number(getComputedStyle(c).opacity) > 0.5).length,
  }));
  check('мобильный: свайп вниз наверху страницы возвращает в пролёт с подписью',
    mback.locked && mback.captions === 1, `пролёт ${mback.locked}, подписей ${mback.captions}`);

  await swipe(cdp, page, 640, 300);
  await page.waitForTimeout(1600);
  mhud = await hudPaint(page);
  check('мобильный: после возврата и повторного выхода подпись снова не рисует ни одной точки',
    mhud.differ === 0 && mhud.styled === 0,
    `расхождение ${mhud.differ} точек, видимых подписей ${mhud.styled}`);

  await ctx.close();
}

await browser.close();
server.close();

const failedChecks = results.filter((r) => !r.pass);
console.log(`\n${results.length - failedChecks.length} из ${results.length} проверок пройдено`);
if (failedChecks.length) {
  console.log('\nНе прошло:');
  failedChecks.forEach((f) => console.log('  ×', f.name, f.detail));
  process.exit(1);
}
