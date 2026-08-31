/**
 * Общая обвязка замеров: статический сервер над dist/, браузер и арифметика
 * контраста. Пять проверок ниже делят её намеренно — расхождение в том, как
 * они поднимают страницу или считают яркость, означало бы, что их числа
 * нельзя класть в одну таблицу.
 *
 * Playwright в зависимости сборки НЕ входит: театру он не нужен, а `npm ci`
 * должен оставаться лёгким.
 *
 *     npm i -D playwright
 *     npm run build && npm run qa:rest
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DIST, SRC } from '../config.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml',
  '.txt': 'text/plain', '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};

/** Сервер над dist/. Порт свой у каждой проверки: их запускают параллельно. */
export async function serve(port) {
  const server = http.createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = path.join(DIST, url === '/' ? 'index.html' : url);
    if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
    try {
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end('404'); }
  });
  await new Promise((r) => server.listen(port, r));
  return { url: `http://localhost:${port}/`, close: () => server.close() };
}

/** PLAYWRIGHT_CHROMIUM — на случай, когда браузер стоит отдельно от playwright. */
export const launch = () => chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});

/**
 * Длительность перехода берётся из боевого кода, а не зашивается числом.
 * Проверка, где ожидание короче перехода, не падает — она тихо начинает
 * проверять не то: состояние читается посреди движения.
 */
export const DURATION = Number(
  /const DURATION = (\d+);/.exec(await fs.readFile(path.join(SRC, 'js', 'main.js'), 'utf8'))?.[1]);
if (!Number.isFinite(DURATION)) throw new Error('не удалось прочитать DURATION из src/js/main.js');
/** Переход плюс пауза ввода (150 мс) и запас на медленную машину. */
export const SETTLE = DURATION + 800;

/** Окна замеров. Мобильное первым: аудитория открывает ссылку с телефона.
 *  1907×922 — окно, на котором заказчик снял полосу под шапкой. */
export const VIEWS = [
  { w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1280, h: 800 },
  { w: 1907, h: 922 }, { w: 1920, h: 1080 },
];

/** Разбор строки вида «390x844,1280x800» из переменной окружения. */
export const viewsFrom = (env, fallback = VIEWS) => (env
  ? env.split(',').map((s) => ({ w: Number(s.split('x')[0]), h: Number(s.split('x')[1]) }))
  : fallback);

/** Страница с уже отработавшим экраном загрузки и готовыми шрифтами. */
export async function openPage(browser, url, { w, h }, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 1, ...opts,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.querySelector('.loader')?.remove());
  return { ctx, page };
}

/** Прыжок по рельсу на главу 1…8 и ожидание остановки. */
export async function toChapter(page, chapter) {
  await page.evaluate((n) => document.querySelectorAll('.rail__dot')[n - 1].click(), chapter);
  await page.waitForTimeout(SETTLE);
}

/** Выход из пролёта: на последнюю главу и ещё раз вниз. */
export async function exitFlight(page) {
  await page.keyboard.press('End');
  await page.waitForTimeout(SETTLE + 400);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(2000);
}

/* ── яркость и контраст: WCAG 2.1 ──────────────────────────────────── */

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const relLum = (r, g, b) =>
  0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
export const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
export const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Среднее и СКО яркости по строке пикселей сырого буфера sharp. */
export function rowStats(data, info, y) {
  let sum = 0;
  const v = new Float64Array(info.width);
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    v[x] = relLum(data[i], data[i + 1], data[i + 2]);
    sum += v[x];
  }
  const mean = sum / info.width;
  let sd = 0;
  for (const L of v) sd += (L - mean) ** 2;
  return { mean, sd: Math.sqrt(sd / info.width) };
}

/** Средний цвет строки — по нему считаются межстрочные ступени в уровнях sRGB. */
export function rowRgb(data, info, y) {
  let r = 0, g = 0, b = 0;
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    r += data[i]; g += data[i + 1]; b += data[i + 2];
  }
  return [r / info.width, g / info.width, b / info.width];
}
