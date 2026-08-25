/**
 * Lighthouse на мобильном профиле. Требует lighthouse и chrome-launcher,
 * которые НЕ входят в зависимости сборки:
 *
 *   npm i -D lighthouse chrome-launcher
 *   npm run build && npm run lighthouse
 */
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { TRANSFER_BUDGET, TRANSFER_PROFILE, bytes } from '../config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/** По умолчанию dist/, но можно указать другую сборку: npm run lighthouse -- <путь> */
const DIST = path.resolve(process.argv[2] || path.join(ROOT, 'dist'));
const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.webp':'image/webp', '.avif':'image/avif', '.woff2':'font/woff2', '.ico':'image/x-icon',
  '.xml':'application/xml', '.txt':'text/plain', '.webmanifest':'application/manifest+json' };
/** Ровно те типы, что перечислены в .htaccess под BROTLI_COMPRESS и DEFLATE.
 *  Без этого сервер отдавал бы несжатое, и порог мерил бы не то, что уходит
 *  по проводу: разница по стилям — вчетверо. */
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.txt', '.webmanifest']);

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent((req.url||'/').split('?')[0]);
  const file = path.join(DIST, url === '/' ? 'index.html' : url);
  try {
    let body = await fs.readFile(file);
    const ext = path.extname(file);
    const head = { 'Content-Type': TYPES[ext] || 'application/octet-stream',
                   'Cache-Control': 'public, max-age=31536000, immutable' };
    const accept = String(req.headers['accept-encoding'] || '');
    if (COMPRESSIBLE.has(ext)) {
      if (/\bbr\b/.test(accept)) { body = zlib.brotliCompressSync(body); head['Content-Encoding'] = 'br'; }
      else if (/\bgzip\b/.test(accept)) { body = zlib.gzipSync(body, { level: 9 }); head['Content-Encoding'] = 'gzip'; }
      if (head['Content-Encoding']) head.Vary = 'Accept-Encoding';
    }
    head['Content-Length'] = body.length;
    res.writeHead(200, head);
    res.end(body);
  } catch { res.writeHead(404).end('404'); }
});
await new Promise(r => server.listen(4180, r));

const chrome = await chromeLauncher.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { chromePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});
const result = await lighthouse('http://localhost:4180/', {
  port: chrome.port, output: 'json', logLevel: 'error',
  // Профиль — из config.mjs: по нему же считает статический сторож
  // check-transfer.mjs, и разъехаться они не должны.
  screenEmulation: { mobile: true, width: TRANSFER_PROFILE.width, height: TRANSFER_PROFILE.height,
                     deviceScaleFactor: TRANSFER_PROFILE.dpr, disabled: false },
  formFactor: 'mobile',
});
const c = result.lhr.categories;
console.log('\nLighthouse, мобильный профиль');
for (const [key, label, want] of [['performance','Performance',85],['accessibility','Accessibility',95],
                                  ['best-practices','Best Practices',95],['seo','SEO',95]]) {
  const score = Math.round(c[key].score * 100);
  console.log('  ', score >= want ? '·' : '×', label.padEnd(16), score, `(нужно ≥ ${want})`);
}
const a = result.lhr.audits;
console.log('\n   LCP', a['largest-contentful-paint'].displayValue,
            '| CLS', a['cumulative-layout-shift'].displayValue,
            '| TBT', a['total-blocking-time'].displayValue);
const failed = Object.values(a).filter(x => x.score !== null && x.score < 0.9 &&
  ['accessibility','best-practices','seo'].some(g => c[g].auditRefs.some(r => r.id === x.id)));
if (failed.length) { console.log('\n   замечания:'); failed.forEach(f => console.log('    -', f.title)); }

/* ---------------------------- трансфер ---------------------------- *
 *  Считаем по тем же записям, что видел браузер, и в том же сжатии, в каком
 *  их отдаст рег.ру. Две строки, потому что одна не сторожит:
 *    вся страница — на девять десятых медиа, правка стилей её не сдвинет;
 *    CSS и JS — ровно то, что меняется в каждой итерации.
 */
const requests = a['network-requests']?.details?.items || [];
const sizeOf = (exts) => requests
  .filter((it) => exts.includes(path.extname(new URL(it.url).pathname)))
  .reduce((sum, it) => sum + (it.transferSize || 0), 0);
const transfer = requests.reduce((sum, it) => sum + (it.transferSize || 0), 0);
const code = sizeOf(['.css', '.js']);

console.log('\nТрансфер, сжатие как на бою');
const over = [];
for (const [label, got, cap] of [
  ['вся страница', transfer, TRANSFER_BUDGET.transfer],
  ['CSS и JS',     code,     TRANSFER_BUDGET.code],
]) {
  const ok = got <= cap;
  if (!ok) over.push(`${label}: ${bytes(got)} > ${bytes(cap)}`);
  console.log('  ', ok ? '·' : '×', label.padEnd(14), bytes(got).padStart(9),
              `из ${bytes(cap)}`, ok ? `— запас ${bytes(cap - got)}` : `— ПЕРЕБОР ${bytes(got - cap)}`);
}

await chrome.kill();
server.close();

const want = { performance: 85, accessibility: 95, 'best-practices': 95, seo: 95 };
const scoresBad = Object.entries(want).some(([k, v]) => Math.round(c[k].score * 100) < v);
if (over.length) {
  console.error('\n   потолок трансфера не поднимаем молча:');
  over.forEach((o) => console.error('    ×', o));
}
if (scoresBad || over.length) process.exit(1);
