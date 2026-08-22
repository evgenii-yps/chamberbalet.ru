/**
 * LCP медианой нескольких прогонов, с перемежением сборок.
 *
 *   npm run build && node scripts/qa/lcp.mjs                 одна сборка, dist/
 *   node scripts/qa/lcp.mjs 5 a=/путь/dist-a b=/путь/dist-b  две сборки вперемешку
 *   node scripts/qa/lcp.mjs 5 --direct a=… b=…               прямой замер в браузере
 *
 * ДВА ЗАМЕРА, А НЕ ОДИН
 *
 * По умолчанию считает Lighthouse: он применяет троттлинг СИМУЛЯЦИЕЙ (Lantern)
 * — грузит страницу как есть и пересчитывает тайминги по графу запросов. Это
 * воспроизводимо, но это оценка.
 *
 * `--direct` меряет то же самое в браузере через PerformanceObserver под
 * НАСТОЯЩИМ троттлингом (4G, CPU ×4) и печатает, какой элемент оказался
 * элементом LCP. Когда два замера расходятся, прав скорее прямой, но знать
 * надо оба: приёмка проекта смотрит на Lighthouse.
 *
 * ПОЧЕМУ ПЕРЕМЕЖЕНИЕ, А НЕ ПОДРЯД
 *
 * Числа шумные: разброс между прогонами на одной и той же сборке доходит до
 * секунды при неизменном весе страницы (§15 SPEC). Прогнать сначала пять раз
 * одну сборку, потом пять раз другую — значит сравнить не сборки, а два куска
 * времени: разогрев машины, соседние процессы, тепловой режим. Поэтому
 * прогоны чередуются a, b, a, b… и сравниваются медианы.
 *
 * Требует lighthouse и chrome-launcher (в зависимости сборки они не входят):
 *   npm i -D lighthouse chrome-launcher
 */
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DIST } from '../config.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };

function serve(root, port) {
  const server = http.createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = path.join(root, url === '/' ? 'index.html' : url);
    try {
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
                           'Cache-Control': 'public, max-age=31536000, immutable' });
      res.end(body);
    } catch { res.writeHead(404).end('404'); }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

const args = process.argv.slice(2);
const direct = args.includes('--direct');
const rounds = Number(args.find((a) => /^\d+$/.test(a))) || 5;
const pairs = args.filter((a) => a.includes('=')).map((a) => {
  const [label, dir] = a.split('=');
  return { label, dir: path.resolve(dir) };
});
const builds = pairs.length ? pairs : [{ label: 'dist', dir: DIST }];

const median = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const sec = (ms) => (ms / 1000).toFixed(2).replace('.', ',');

const servers = [];
for (const [n, build] of builds.entries()) {
  build.port = 4190 + n;
  build.lcp = [];
  build.weight = [];
  servers.push(await serve(build.dir, build.port));
}

const NETWORK = { offline: false, downloadThroughput: 1638 * 1024 / 8, uploadThroughput: 675 * 1024 / 8, latency: 150 };
const CPU_SLOWDOWN = 4;

/** Прямой замер: PerformanceObserver под настоящим троттлингом. */
async function measureDirect(build) {
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', NETWORK);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  await page.addInitScript(() => {
    window.__LCP = 0; window.__EL = '';
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__LCP = entry.startTime;
        window.__EL = entry.element?.className || entry.element?.tagName || entry.id || '';
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  await page.goto(`http://localhost:${build.port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);          // поздние кандидаты успевают прийти
  const seen = await page.evaluate(() => ({ lcp: window.__LCP, el: window.__EL }));
  await browser.close();
  return seen;
}

/** Замер Lighthouse: троттлинг симуляцией. */
async function measureLighthouse(build) {
  const chrome = await chromeLauncher.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM ? { chromePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const result = await lighthouse(`http://localhost:${build.port}/`, {
    port: chrome.port, output: 'json', logLevel: 'silent',
    onlyCategories: ['performance'],
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
    formFactor: 'mobile',
  });
  await chrome.kill();
  const audits = result.lhr.audits;
  if (result.lhr.runtimeError) throw new Error(result.lhr.runtimeError.message);
  return {
    lcp: audits['largest-contentful-paint'].numericValue,
    weight: audits['total-byte-weight']?.numericValue ?? 0,
    cls: audits['cumulative-layout-shift'].displayValue,
  };
}

console.log(`\nLCP, мобильный профиль · ${rounds} прогон(ов) на сборку` +
            (builds.length > 1 ? ', вперемешку' : '') +
            (direct ? ' · прямой замер в браузере (4G, CPU ×4)' : ' · Lighthouse (симуляция)'));
console.log('   ' + '─'.repeat(58));

for (let round = 1; round <= rounds; round++) {
  for (const build of builds) {
    if (direct) {
      const { lcp, el } = await measureDirect(build);
      build.lcp.push(lcp);
      console.log(`   ${round}. ${build.label.padEnd(10)} LCP ${sec(lcp).padStart(5)} с · элемент ${el || '—'}`);
    } else {
      const { lcp, weight, cls } = await measureLighthouse(build);
      build.lcp.push(lcp);
      build.weight.push(weight);
      console.log(`   ${round}. ${build.label.padEnd(10)} LCP ${sec(lcp).padStart(5)} с · ` +
                  `вес ${Math.round(weight / 1024)} КБ · CLS ${cls}`);
    }
  }
}

console.log('   ' + '─'.repeat(58));
for (const build of builds) {
  console.log(`   ${build.label.padEnd(10)} медиана ${sec(median(build.lcp))} с ` +
              `(разброс ${sec(Math.min(...build.lcp))}–${sec(Math.max(...build.lcp))} с)` +
              (build.weight.length ? `, вес ${Math.round(median(build.weight) / 1024)} КБ` : ''));
}
if (builds.length === 2) {
  const delta = median(builds[1].lcp) - median(builds[0].lcp);
  console.log(`   разница медиан: ${delta >= 0 ? '+' : '−'}${sec(Math.abs(delta))} с ` +
              `(${builds[1].label} против ${builds[0].label})`);
}
console.log('');

servers.forEach((s) => s.close());
