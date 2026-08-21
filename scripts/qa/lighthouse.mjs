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
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'dist');
const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.webp':'image/webp', '.avif':'image/avif', '.woff2':'font/woff2', '.ico':'image/x-icon',
  '.xml':'application/xml', '.txt':'text/plain', '.webmanifest':'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent((req.url||'/').split('?')[0]);
  const file = path.join(DIST, url === '/' ? 'index.html' : url);
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
                         'Cache-Control': 'public, max-age=31536000, immutable' });
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
  screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
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
await chrome.kill();
server.close();

const want = { performance: 85, accessibility: 95, 'best-practices': 95, seo: 95 };
if (Object.entries(want).some(([k, v]) => Math.round(c[k].score * 100) < v)) process.exit(1);
