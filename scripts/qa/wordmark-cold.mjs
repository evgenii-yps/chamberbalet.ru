/** D0: воспроизведение дефекта первого экрана на холодной загрузке с LTE. */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.build', 'diag');
await fs.mkdir(OUT, { recursive: true });
const TYPES = { '.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif',
  '.woff2':'font/woff2','.ico':'image/x-icon','.xml':'application/xml','.txt':'text/plain','.webmanifest':'application/manifest+json' };
const server = http.createServer(async (req,res)=>{
  const url=decodeURIComponent((req.url||'/').split('?')[0]);
  const file=path.join(DIST,url==='/'?'index.html':url);
  try{ const b=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream'}); res.end(b);
  }catch{res.writeHead(404).end('404');}
});
await new Promise(r=>server.listen(4189,r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
// LTE: 1.6 Mbps вниз, 750 kbps вверх, 150 мс RTT
await cdp.send('Network.emulateNetworkConditions', {
  offline:false, downloadThroughput: 1.6*1024*1024/8, uploadThroughput: 750*1024/8, latency: 150 });
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

const probe = () => page.evaluate(() => {
  const q=(s)=>document.querySelector(s);
  const ink=(el)=>{ if(!el) return null; const r=document.createRange(); r.selectNodeContents(el);
    const rs=[...r.getClientRects()].filter(x=>x.width>0&&x.height>0); if(!rs.length) return null;
    return { top:+Math.min(...rs.map(x=>x.top)).toFixed(1), bottom:+Math.max(...rs.map(x=>x.bottom)).toFixed(1),
             left:+Math.min(...rs.map(x=>x.left)).toFixed(1), right:+Math.max(...rs.map(x=>x.right)).toFixed(1) }; };
  const wm=ink(q('.wordmark__line')), ti=ink(q('.opener__title')), le=ink(q('.opener__lede'));
  const overlap = (a,b)=> (a&&b) ? Math.max(0, Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)) : 0;
  return { t:+performance.now().toFixed(0), wm, ti, le,
    transform: q('.wordmark')?.style.transform,
    openerOn: document.documentElement.classList.contains('opener-on'),
    fontsReady: document.fonts.status,
    overlapWmLede: +overlap(wm,le).toFixed(1),
    wmHeight: wm ? +(wm.bottom-wm.top).toFixed(1) : null,
    tiHeight: ti ? +(ti.bottom-ti.top).toFixed(1) : null,
  };
});

const t0 = Date.now();
await page.goto('http://localhost:4189/', { waitUntil:'commit' });
const rows=[];
for (const ms of [40,80,120,160,200,240,280,320,400,600,1000,3000,9000]) {
  const wait = ms - (Date.now()-t0);
  if (wait>0) await page.waitForTimeout(wait);
  const p = await probe();
  rows.push({ мс: ms, шрифты: p.fontsReady, 'высота ink названия': p.wmHeight,
    'высота ink h1': p.tiHeight, 'наложение на лид, px': p.overlapWmLede, transform: p.transform });
  await page.screenshot({ path: path.join(OUT, `d0-${String(ms).padStart(5,'0')}.png`) });
}
console.table(rows);
const final = await probe();
console.log('\nфинальное состояние:', JSON.stringify(final, null, 1));
await browser.close(); server.close();
