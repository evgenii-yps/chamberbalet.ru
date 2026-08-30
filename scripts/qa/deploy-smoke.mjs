/** Дымовая проверка распакованного архива: страница работает из того, что уедет на хостинг. */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs/promises'; import path from 'node:path';
const ROOT = process.argv[2];
const T={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2','.mp4':'video/mp4','.webmanifest':'application/manifest+json','.ico':'image/x-icon','.xml':'application/xml','.txt':'text/plain'};
const bad=[];
const srv=http.createServer(async(q,r)=>{const u=decodeURIComponent((q.url||'/').split('?')[0]);const fp=path.join(ROOT,u==='/'?'index.html':u);
 try{const b=await fs.readFile(fp);r.writeHead(200,{'Content-Type':T[path.extname(fp)]||'application/octet-stream'});r.end(b);}
 catch{bad.push(u);r.writeHead(404).end('404');}});
await new Promise(r=>srv.listen(4210,r));
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const errs=[];
for(const [w,h,tag] of [[390,844,'390'],[1280,800,'1280']]){
 const c=await br.newContext({viewport:{width:w,height:h},deviceScaleFactor:2});
 const p=await c.newPage();
 p.on('console',(m)=>{ if(m.type()==='error') errs.push(tag+': '+m.text()); });
 p.on('pageerror',(e)=>errs.push(tag+': '+e.message));
 p.on('request',(rq)=>{ const u=rq.url(); if(!u.startsWith('http://localhost:4210')&&!u.startsWith('data:')) errs.push(tag+': внешний запрос '+u); });
 await p.goto('http://localhost:4210/',{waitUntil:'load'});
 await p.waitForTimeout(1500);
 await p.keyboard.press('End'); await p.waitForTimeout(3300);
 await p.keyboard.press('PageDown'); await p.waitForTimeout(1500);
 await p.evaluate(async()=>{ for(let y=0;y<document.body.scrollHeight;y+=400){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));} });
 await p.waitForTimeout(1500);
 const state=await p.evaluate(()=>({
   секций: document.querySelectorAll('.after .section').length,
   миниатюр: document.querySelectorAll('.shots__link').length,
   видео: Boolean(document.querySelector('.filmstrip__video')),
   постер: document.querySelector('.filmstrip__video')?.getAttribute('poster')||null,
   стык: Boolean(document.querySelector('.seam')),
   лайтбокс: Boolean(document.getElementById('lightbox')),
   кнопкаДиска: document.querySelector('.panel__cta')?.getAttribute('aria-disabled')||'ссылка живая',
   затемнение: getComputedStyle(document.querySelector('.flight__scrim')).opacity,
   фонГрунта: getComputedStyle(document.querySelector('.after')).backgroundColor,
 }));
 console.log(tag+':', JSON.stringify(state, null, 0));
 await p.screenshot({path:'/home/user/chamberbalet.ru/.build/accept/deploy-'+tag+'.png'});
 await c.close();
}
console.log('404 при загрузке:', bad.length? bad.join(', ') : 'нет');
console.log('ошибки консоли и внешние запросы:', errs.length? errs.join(' | ') : 'нет');
await br.close(); srv.close();
process.exit(bad.length||errs.length?1:0);
