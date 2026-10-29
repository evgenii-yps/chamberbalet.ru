/** Приёмка по содержанию: запрещённые слова, старые фразы, счётчики, robots. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { DIST } from './config.mjs';
import * as C from '../src/content.js';

const html = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')
  .replaceAll('&nbsp;', ' ').replaceAll(' ', ' ').replace(/\s+/g, ' ');
// Подписи режимов лежат в JSON-данных скрипта: сверяем и с ними
const full = html.replaceAll('\\u003c', '<').replace(/<[^>]+>/g, ' ').replaceAll('&nbsp;', ' ').replaceAll('\u00a0', ' ').replace(/\s+/g, ' ').replace(/\s+([.,;:!?—–])/g, ' $1');
const fails = [];
const warns = [];
const placeholders = C.contacts.people.flatMap((p) => [p.tel, p.mail, p.tg]).filter((x) => /^\[/.test(x));
if (placeholders.length) warns.push(`заглушки в контактах (ждут данных): ${placeholders.join(', ')}`);
const must = (ok, msg) => { if (!ok) fails.push(msg); };

for (const w of ['Купить', 'купить', 'МЧС', 'постоянная труппа', 'репетиционный зал', 'штатная постановочная']) {
  must(!text.includes(w), `в тексте есть «${w}»`);
}
must(!/(?:\d{1,2}\s(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря))/.test(text), 'в тексте есть дата афиши');
must(C.troupe.all.length === 27, `в списке труппы ${C.troupe.all.length}, в заголовке 27`);
must(C.rep.groups.reduce((n, g) => n + g.items.length, 0) === 24, 'репертуар: не 24 названия');

for (const id of ['top', 'manifest', 'scale', 'evening', 'video', 'rep', 'troupe', 'venues', 'clients', 'tour', 'gallery', 'contacts']) must(html.includes(`id="${id}"`), `нет якоря #${id}`);
for (const m of C.menu) must(html.includes(`href="${m.href}"`), `меню: нет ${m.href}`);
// все видимые строки content.js попадают в разметку
const TECH = new Set(['id', 'type', 'ratio', 'icon', 'href', 'url', 'telHref', 'mailHref', 'tgHref', 'cls', 'n', 'qr']);
const walk = (v, out = []) => (typeof v === 'string' ? out.push(v) : v && typeof v === 'object' && Object.entries(v).forEach(([k, x]) => { if (!TECH.has(k)) walk(x, out); }), out);
const skip = new Set([C.site.url, C.site.themeColor, C.site.lang]);
for (const s of walk([C.manifest, C.scale, C.evening, C.video, C.rep, C.troupe, C.venues, C.clients, C.tour, C.gallery, C.contacts, C.hero, C.versionLine, C.footer])) {
  if (skip.has(s) || /^(#|https?:)/.test(s) || s === '') continue;
  const plain = s.replace(/\s+/g, ' ');
  must(text.includes(plain) || full.replace(/ +/g, ' ').includes(plain.replace(/ +/g, ' ')) || html.includes(plain.replaceAll('&', '&amp;')) || html.includes(plain.replaceAll(' ', ' ')) , `не попало в разметку: ${plain.slice(0, 50)}`);
}
const robots = await fs.readFile(path.join(DIST, 'robots.txt'), 'utf8').catch(() => '');
if (process.env.ROBOTS === 'deny') must(/Disallow: \/\s*$/m.test(robots), 'robots.txt без Disallow: /');

for (const w of warns) console.log('  ⚠', w);
if (fails.length) { fails.forEach((f) => console.error('  ✗', f)); process.exit(1); }
console.log('check-content: ок');
