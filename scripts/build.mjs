/**
 * Сборка. Результат — папка dist/, её и заливаем на хостинг.
 *
 *   npm run build          продакшн: заглушки скрывают блок целиком
 *   npm run build:debug    отладка: заглушки видны пометкой
 *
 * Конвейеры фото и видео работают вхолостую: пока оригиналов нет, сборка
 * проходит, страница живёт на ровном поле сцены, консоль чистая.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { ROOT, SRC, DIST, BUILD, BUILD_ASSETS, bytes } from './config.mjs';
import { buildImages } from './build-images.mjs';
import { buildVideo } from './build-video.mjs';
import { buildFonts } from './build-fonts.mjs';
import { createRenderer, esc } from './render.mjs';
import { scrimCss } from './check-scrim.mjs';
import * as C from '../src/content.js';

const DEBUG = process.env.BUILD_MODE === 'debug';
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex').slice(0, 8);

async function emptyDist() {
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });
}

/**
 * Медиа кодируются в .build/assets и оттуда копируются. Кодирование AVIF на
 * четырнадцать кадров идёт минуты — терять его при каждой сборке нельзя.
 */
async function copyAssets() {
  try { await fs.access(BUILD_ASSETS); } catch { return 0; }
  await fs.cp(BUILD_ASSETS, path.join(DIST, 'assets'), { recursive: true });
  let total = 0;
  const walk = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else total += (await fs.stat(full)).size;
    }
  };
  await walk(BUILD_ASSETS);
  return total;
}

/* ------------------------- стили: один файл ------------------------- */

async function buildCss(fontCss) {
  const order = ['tokens.css', 'base.css', 'flight.css', 'sections.css'];
  const parts = [];
  if (fontCss) parts.push('/* шрифты: самохостинг, ноль внешних запросов */\n' + fontCss);
  for (const name of order) {
    let css = await fs.readFile(path.join(SRC, 'css', name), 'utf8');
    // Затемнение собирается из чисел SCRIM, которые проверяет check-scrim.mjs
    css = css.replace('/*{{scrim}}*/', scrimCss());
    parts.push(`/* ${name} */\n` + css);
  }
  const css = parts.join('\n\n');
  const file = `app.${hash(css)}.css`;
  await fs.mkdir(path.join(DIST, 'assets', 'css'), { recursive: true });
  await fs.writeFile(path.join(DIST, 'assets', 'css', file), css);
  return { file, size: Buffer.byteLength(css) };
}

/* --------------- скрипты: хэш в имени, импорты переписываются --------------- */

const JS_FILES = ['flight.js', 'nav.js', 'hero-video.js', 'reveal.js', 'main.js'];

async function buildJs() {
  const outDir = path.join(DIST, 'assets', 'js');
  await fs.mkdir(outDir, { recursive: true });

  const sources = new Map();
  for (const name of JS_FILES) sources.set(name, await fs.readFile(path.join(SRC, 'js', name), 'utf8'));

  const deps = new Map();
  for (const [name, code] of sources) {
    deps.set(name, [...code.matchAll(/from\s+'\.\/([\w.-]+\.js)'/g)].map((m) => m[1]));
  }

  // Топологический порядок: сначала листья, чтобы имя было известно раньше ссылки
  const emitted = new Map();
  const visit = async (name, seen = new Set()) => {
    if (emitted.has(name)) return emitted.get(name);
    if (seen.has(name)) throw new Error(`циклический импорт: ${name}`);
    seen.add(name);
    let code = sources.get(name);
    for (const dep of deps.get(name)) {
      const emittedDep = await visit(dep, seen);
      code = code.replaceAll(`'./${dep}'`, `'./${emittedDep.file}'`);
    }
    const file = `${name.replace(/\.js$/, '')}.${hash(code)}.js`;
    await fs.writeFile(path.join(outDir, file), code);
    const entry = { file, size: Buffer.byteLength(code) };
    emitted.set(name, entry);
    return entry;
  };

  for (const name of JS_FILES) await visit(name);
  return { entry: emitted.get('main.js'), total: [...emitted.values()].reduce((s, e) => s + e.size, 0) };
}

/* ------------------------------- иконки ------------------------------- */

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#070506"/>
  <path d="M32 12c5 6 8 10 8 15a8 8 0 0 1-16 0c0-5 3-9 8-15z" fill="#F0C070"/>
  <rect x="29" y="35" width="6" height="15" fill="#C9A063"/>
</svg>`;

async function buildIcons() {
  await fs.writeFile(path.join(DIST, 'favicon.svg'), FAVICON_SVG);
  const svg = Buffer.from(FAVICON_SVG);
  const png = (size) => sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  await fs.writeFile(path.join(DIST, 'apple-touch-icon.png'), await png(180));
  await fs.mkdir(path.join(DIST, 'assets', 'icons'), { recursive: true });
  await fs.writeFile(path.join(DIST, 'assets', 'icons', 'icon-192.png'), await png(192));
  await fs.writeFile(path.join(DIST, 'assets', 'icons', 'icon-512.png'), await png(512));
  await fs.writeFile(path.join(DIST, 'favicon.ico'), await png(32));   // ico не нужен современным, но пусть лежит
}

/* ----------------------- служебные файлы ----------------------- */

async function buildMeta() {
  const origin = C.site.url.replace(/\/$/, '');
  await fs.writeFile(path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);

  const today = new Date().toISOString().slice(0, 10);
  await fs.writeFile(path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url><loc>${origin}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>\n` +
    `</urlset>\n`);

  await fs.writeFile(path.join(DIST, 'site.webmanifest'), JSON.stringify({
    name: C.site.organisation.name,
    short_name: C.site.organisation.name,
    lang: C.site.lang,
    start_url: '/',
    display: 'standalone',
    background_color: C.site.themeColor,
    theme_color: C.site.themeColor,
    icons: [
      { src: '/assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }, null, 2));

  const htaccess = path.join(ROOT, '.htaccess');
  await fs.copyFile(htaccess, path.join(DIST, '.htaccess')).catch(() => {
    console.warn('   .htaccess не найден в корне репозитория');
  });
}

/* ------------------------------- сборка ------------------------------- */

async function main() {
  console.log(DEBUG ? 'Сборка: отладочная (заглушки видны)' : 'Сборка: продакшн (заглушки скрывают блок)');
  await emptyDist();

  const images = await buildImages();
  const video = await buildVideo();
  const fonts = await buildFonts();

  const R = createRenderer({ debug: DEBUG, images, video, fonts });

  const mediaSize = await copyAssets();
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
    skipLink: esc(C.ui.skipLink),
    loaderMark: esc(C.ui.loading),
    social: R.renderSocial(),
    preload: R.renderPreload(),
    styles: `<link rel="stylesheet" href="/assets/css/${css.file}">`,
    topbar: R.renderTopbar(),
    flight: R.renderFlight(),
    sections: R.renderSections(),
    footer: R.renderFooter(),
    jsonld: R.renderJsonLd(),
    script: `<script type="module" src="/assets/js/${js.entry.file}"></script>`,
  };

  let html = template;
  for (const [key, value] of Object.entries(slots)) {
    html = html.replaceAll(`<!--{{${key}}}-->`, value);
  }
  const left = html.match(/<!--\{\{(\w+)\}\}-->/);
  if (left) throw new Error(`в шаблоне остался незаполненный слот: ${left[1]}`);

  await fs.writeFile(path.join(DIST, 'index.html'), html);

  // Вес шрифтов и кода — в .build/weights.json: по нему build-images.mjs
  // считает первую строку бюджета (изображения + шрифты + код).
  const fontsSize = fonts.faces.reduce((s, f) => s + f.size, 0);
  const codeAndFonts = css.size + js.total + Buffer.byteLength(html) + fontsSize;
  await fs.writeFile(
    path.join(BUILD, 'weights.json'),
    JSON.stringify({ codeAndFonts, css: css.size, js: js.total, html: Buffer.byteLength(html), fonts: fontsSize }, null, 2),
  );

  console.log('\nСтраница');
  console.log('   index.html      ', bytes(Buffer.byteLength(html)));
  console.log('   стили           ', bytes(css.size), `→ /assets/css/${css.file}`);
  console.log('   скрипты         ', bytes(js.total), `→ /assets/js/${js.entry.file}`);
  console.log('   шрифты          ', bytes(fonts.faces.reduce((s, f) => s + f.size, 0)), `(${fonts.faces.length} файлов)`);
  console.log('   медиа и шрифты  ', bytes(mediaSize), 'в assets/');
  console.log('\n   готово: dist/\n');
}

main().catch((e) => { console.error('\nСборка не прошла:', e.message); process.exit(1); });
