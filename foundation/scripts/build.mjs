import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {routes,validateRecord,validateSession} from '../src/model.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const input=JSON.parse(await fs.readFile(path.join(root,'data/fixture.json'),'utf8'));
if (process.env.RELEASE === '1') throw new Error('Release blocked: fixture data and rights-pending media.');
for(const [kind,collection] of [['venue','venues'],['production','productions'],['person','people'],['media','media'],['document','documents']]) for(const x of input[collection]) if(validateRecord(kind,x).length) throw new Error(`Invalid ${kind}: ${validateRecord(kind,x).join(', ')}`);
for(const s of input.sessions) if(validateSession(s).length) throw new Error(`Invalid fixture session: ${validateSession(s).join(', ')}`);
await fs.rm(dist,{recursive:true,force:true});await fs.mkdir(path.join(dist,'assets'),{recursive:true});
for(const file of ['site.css','site.js']) await fs.copyFile(path.join(root,'src',file),path.join(dist,'assets',file));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups={home:['Вступление и видео','Афиша','Постановки','Два формата','Люди','Для площадок'],schedule:['Показы и фильтр городов','Постановки'],repertoire:['Постановки','Другие произведения'],'production-a':['О спектакле','Галерея','Форматы','Показы'],'production-b':['О спектакле','Форматы','Показы'],people:['Руководители','Артисты','Биография'],venues:['Условия','Форматы','Контакты']};
for(const route of routes){
 const nav=routes.filter(r=>['home','schedule','repertoire','people','venues'].includes(r.key)).map(r=>`<li><a href="${r.path}"${route===r?' aria-current="page"':''}>${escape(r.label)}</a></li>`).join('');
 const sections=groups[route.key].map(x=>`<section><h2>${escape(x)}</h2><p class="placeholder">PREVIEW ONLY — исходное содержимое и медиа не включены.</p></section>`).join('');
 const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(route.label)} — PREVIEW</title><link rel="stylesheet" href="assets/site.css"><script src="assets/site.js" defer></script></head><body><a class="skip" href="#main">Перейти к содержанию</a><div class="notice">ЧЕРНОВИК: технический каркас с вымышленными данными. Не публиковать.</div><header><a href="index.html">Технический каркас</a><button type="button" class="menu" data-menu aria-expanded="false" aria-controls="navigation">Меню</button><nav id="navigation" aria-label="Основная навигация"><ul>${nav}</ul></nav></header><main id="main" tabindex="-1"><h1>${escape(route.label)}</h1>${sections}</main><footer>PREVIEW ONLY — права и материалы не проверены.</footer></body></html>\n`;
 await fs.writeFile(path.join(dist,route.path),html);
}
await fs.writeFile(path.join(dist,'404.html'),'<!doctype html><html lang="ru"><meta charset="utf-8"><title>404 — PREVIEW</title><h1>Страница не найдена</h1><a href="/">На главную</a></html>\n');
await fs.writeFile(path.join(dist,'robots.txt'),'User-agent: *\nDisallow: /\n');
const files=(await fs.readdir(dist,{recursive:true,withFileTypes:true})).filter(d=>d.isFile()).map(d=>path.relative(dist,path.join(d.parentPath||d.path,d.name)).replaceAll(path.sep,'/')).sort();
const manifest=[];for(const f of files){const buf=await fs.readFile(path.join(dist,f));manifest.push({path:f,bytes:buf.length,sha256:crypto.createHash('sha256').update(buf).digest('hex')})}
await fs.writeFile(path.join(dist,'build-manifest.json'),JSON.stringify({previewOnly:true,files:manifest},null,2)+'\n');
console.log(`PREVIEW ONLY: built ${routes.length} routes in ${dist}; release is blocked.`);
