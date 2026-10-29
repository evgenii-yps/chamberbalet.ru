/**
 * Сборка. Результат — папка dist/, её и заливаем на хостинг.
 *
 *   npm run build              продакшн
 *   ROBOTS=deny npm run build  то же + robots.txt с Disallow: / (пока сайт закрыт)
 *   BUILD_COMMENTS=keep ...    оставить комментарии в CSS/JS
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { ROOT, SRC, DIST, BUILD, MEDIA, bytes } from './config.mjs';
import { buildFonts } from './build-fonts.mjs';
import { createRenderer, esc, typo } from './render.mjs';
import { stripComments } from './strip-comments.mjs';
import * as C from '../src/content.js';

const ROBOTS_DENY = process.env.ROBOTS === 'deny';
const KEEP_COMMENTS = process.env.BUILD_COMMENTS === 'keep';
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex').slice(0, 8);
const exists = (f) => fs.access(f).then(() => true, () => false);

async function emptyDist() {
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });
}

/* ---------------------------------- стили ---------------------------------- */

async function buildCss(fontCss) {
  const parts = ['/* шрифты */\n' + fontCss];
  const files = (await fs.readdir(path.join(SRC, 'css'))).filter((f) => f.endsWith('.css'));
  const order = ['tokens.css', 'base.css', 'sections.css', 'motion.css'];
  for (const name of order.filter((n) => files.includes(n))) {
    parts.push(`/* ${name} */\n` + await fs.readFile(path.join(SRC, 'css', name), 'utf8'));
  }
  let css = parts.join('\n');
  if (!KEEP_COMMENTS) css = stripComments(css, 'css');
  const file = `app.${hash(css)}.css`;
  await fs.mkdir(path.join(DIST, 'assets', 'css'), { recursive: true });
  await fs.writeFile(path.join(DIST, 'assets', 'css', file), css);
  return { file, size: Buffer.byteLength(css) };
}

/* ---------------------------------- скрипты ---------------------------------- */

async function buildJs() {
  const outDir = path.join(DIST, 'assets', 'js');
  await fs.mkdir(outDir, { recursive: true });
  const names = (await fs.readdir(path.join(SRC, 'js'))).filter((f) => f.endsWith('.js'));
  const sources = new Map();
  for (const n of names) sources.set(n, await fs.readFile(path.join(SRC, 'js', n), 'utf8'));
  const emitted = new Map();
  const visit = async (name, seen = new Set()) => {
    if (emitted.has(name)) return emitted.get(name);
    if (seen.has(name)) throw new Error(`циклический импорт: ${name}`);
    seen.add(name);
    let code = sources.get(name);
    const deps = [...code.matchAll(/from\s+'\.\/([\w.-]+\.js)'/g)].map((m) => m[1]);
    for (const dep of deps) {
      const e = await visit(dep, seen);
      code = code.replaceAll(`'./${dep}'`, `'./${e.file}'`);
    }
    if (!KEEP_COMMENTS) code = stripComments(code, 'js');
    const file = `${name.replace(/\.js$/, '')}.${hash(code)}.js`;
    await fs.writeFile(path.join(outDir, file), code);
    const entry = { file, size: Buffer.byteLength(code) };
    emitted.set(name, entry);
    return entry;
  };
  for (const n of names) await visit(n);
  return { entry: emitted.get('main.js'), total: [...emitted.values()].reduce((s, e) => s + e.size, 0) };
}

/* ------------------------------ иконки и мета ------------------------------ */

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#131110"/>
  <path d="M20 12c-6 0-7 3-7 8v6c0 4-2 6-5 6 3 0 5 2 5 6v6c0 5 1 8 7 8M44 12c6 0 7 3 7 8v6c0 4 2 6 5 6-3 0-5 2-5 6v6c0 5-1 8-7 8" fill="none" stroke="#67B099" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M25 24v16M25 24l10 16M35 24v16" fill="none" stroke="#67B099" stroke-width="3.5" stroke-linecap="square"/>
</svg>`;

async function buildIcons() {
  await fs.writeFile(path.join(DIST, 'favicon.svg'), FAVICON_SVG);
  const svg = Buffer.from(FAVICON_SVG);
  const png = (s) => sharp(svg, { density: 384 }).resize(s, s).png({ compressionLevel: 9 }).toBuffer();
  await fs.writeFile(path.join(DIST, 'apple-touch-icon.png'), await png(180));
  await fs.mkdir(path.join(DIST, 'assets', 'icons'), { recursive: true });
  await fs.writeFile(path.join(DIST, 'assets', 'icons', 'icon-192.png'), await png(192));
  await fs.writeFile(path.join(DIST, 'assets', 'icons', 'icon-512.png'), await png(512));
}

async function buildMeta() {
  const origin = C.site.url.replace(/\/$/, '');
  await fs.writeFile(path.join(DIST, 'robots.txt'), ROBOTS_DENY
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
  const today = new Date().toISOString().slice(0, 10);
  await fs.writeFile(path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url><loc>${origin}/</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`);
  await fs.writeFile(path.join(DIST, 'site.webmanifest'), JSON.stringify({
    name: C.site.name, short_name: 'Камерный балет', lang: C.site.lang, start_url: '/', display: 'standalone',
    background_color: C.site.themeColor, theme_color: C.site.themeColor,
    icons: [
      { src: '/assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, null, 2));
  await fs.copyFile(path.join(ROOT, '.htaccess'), path.join(DIST, '.htaccess'));
}

/* ----------------------------- слоты изображений ----------------------------- */

/** Слот есть, только если файл лежит в media/. Нет файла — нет и узла в разметке. */
async function scanMedia() {
  const out = {};
  const copy = async (name) => {
    await fs.mkdir(path.join(DIST, 'media'), { recursive: true });
    await fs.copyFile(path.join(MEDIA, name), path.join(DIST, 'media', name));
    return `/media/${name}`;
  };
  for (const base of ['hero-chamber', 'hero-big']) {
    const video = [];
    for (const [ext, type] of [['webm', 'video/webm'], ['mp4', 'video/mp4']]) {
      if (await exists(path.join(MEDIA, `${base}.${ext}`))) video.push({ src: await copy(`${base}.${ext}`), type });
    }
    const jpg = await exists(path.join(MEDIA, `${base}.jpg`)) ? await copy(`${base}.jpg`) : null;
    if (video.length) out[base] = { video, poster: jpg };
    else if (jpg) out[base] = { image: jpg };
  }
  if (await exists(path.join(MEDIA, 'olesya.jpg'))) out.olesya = await copy('olesya.jpg');
  return out;
}

/* ----------------------------------- сборка ----------------------------------- */

async function main() {
  await emptyDist();
  await fs.mkdir(BUILD, { recursive: true });
  const fonts = await buildFonts();
  const media = await scanMedia();
  const R = createRenderer({ fonts, media });
  const css = await buildCss(fonts.css);
  const js = await buildJs();
  await buildIcons();
  await buildMeta();

  const template = await fs.readFile(path.join(SRC, 'index.html'), 'utf8');
  const slots = {
    lang: C.site.lang,
    title: esc(C.site.title),
    description: esc(C.site.description),
    canonical: esc(C.site.url),
    themeColor: esc(C.site.themeColor),
    skipLink: esc(C.site.skipLink),
    preload: R.renderPreload(),
    styles: `<link rel="stylesheet" href="/assets/css/${css.file}">`,
    topbar: R.renderTopbar(),
    hero: R.renderHero(),
    sections: R.renderSections(),
    footer: R.renderFooter(),
    modesData: R.renderModesData(),
    jsonld: R.renderJsonLd(),
    script: `<script type="module" src="/assets/js/${js.entry.file}"></script>`,
  };
  let html = template;
  for (const [k, v] of Object.entries(slots)) html = html.replaceAll(`<!--{{${k}}}-->`, v);
  const left = html.match(/<!--\{\{(\w+)\}\}-->/);
  if (left) throw new Error(`в шаблоне остался слот: ${left[1]}`);
  await fs.writeFile(path.join(DIST, 'index.html'), html);

  console.log('\nСтраница');
  console.log('   index.html ', bytes(Buffer.byteLength(html)));
  console.log('   стили      ', bytes(css.size), `→ /assets/css/${css.file}`);
  console.log('   скрипты    ', bytes(js.total), `→ /assets/js/${js.entry.file}`);
  console.log('   шрифты     ', bytes(fonts.faces.reduce((s, f) => s + f.size, 0)), `(${fonts.faces.length} файлов)`);
  console.log('   слоты медиа', Object.keys(media).join(', ') || 'пусто (фон — рисованный декор)');
  if (ROBOTS_DENY) console.log('   robots.txt  Disallow: / (ROBOTS=deny)');
  console.log('\n   готово: dist/\n');
}

main().catch((e) => { console.error('\nСборка не прошла:', e.message); process.exit(1); });
