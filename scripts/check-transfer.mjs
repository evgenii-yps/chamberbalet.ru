/**
 * Статический сторож трансфера. Чистый node, без браузера.
 *
 * Зачем он, если то же самое считает `npm run lighthouse`: тот запускается
 * не везде. Ни lighthouse, ни chrome-launcher, ни playwright не объявлены в
 * devDependencies — на чистом `npm ci` ворота с потолком не поднимутся вовсе.
 * Порог, который работает не у всех, не порог.
 *
 * Обе величины берутся из TRANSFER_BUDGET, а профиль — из TRANSFER_PROFILE.
 * Копий не заводим: две константы разойдутся при первой же правке.
 *
 * Что считается первой загрузкой и почему именно это:
 *
 *   документ, стили, скрипты — целиком: скриптов ровно столько, сколько
 *     модулей, и все они импортируются из main.js в одной волне;
 *   шрифты — те начертания, чей вес встречается в CSS хотя бы раз ВНЕ
 *     @font-face. Правило намеренно грубое: семейство оно не различает, и
 *     если вес 600 понадобится Manrope, в счёт попадёт и Cormorant 600,
 *     которого браузер не запросит. Ошибка идёт в сторону перебора, а не
 *     недобора, и она же сторожит ровно ту ловушку, что записана в base.css:
 *     одно число font-weight тянет два файла на 25 316 Б;
 *   кадры — первые FIRST_SCREEN_SLIDES штук в том варианте, который выберет
 *     браузер: ширина слота из sizes, помноженная на плотность профиля;
 *   мелочь — иконка и манифест: их Chrome просит, apple-touch-icon нет.
 *
 * Обложку соцсетей (og) не считаем: в бюджете кадров она есть, но в первую
 * загрузку страницы не входит — её просит не браузер, а чужой парсер.
 *
 * Сжатие — brotli, теми же типами, что перечислены в .htaccess. woff2, avif и
 * прочее уже сжато, поэтому идёт как есть: сервер их не трогает.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  DIST, BUILD, TRANSFER_BUDGET, TRANSFER_PROFILE,
  FIRST_SCREEN_SLIDES, requestWidthAt, bytes,
} from './config.mjs';
import { layers } from '../src/content.js';

/** Ровно те типы, что в .htaccess под BROTLI_COMPRESS и DEFLATE. */
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.txt', '.webmanifest']);

async function weigh(file) {
  const body = await fs.readFile(file);
  return COMPRESSIBLE.has(path.extname(file)) ? zlib.brotliCompressSync(body).length : body.length;
}

async function listDir(dir) {
  try {
    return (await fs.readdir(dir)).map((f) => path.join(dir, f));
  } catch { return []; }
}

const html = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
const css = await listDir(path.join(DIST, 'assets', 'css'));
const js = await listDir(path.join(DIST, 'assets', 'js'));

/* ── шрифты ──────────────────────────────────────────────────────────── */
const cssText = (await Promise.all(css.map((f) => fs.readFile(f, 'utf8')))).join('\n');
// Вырезаем блоки @font-face: объявленный вес — не признак того, что он нужен
const usedWeights = new Set(
  [...cssText.replace(/@font-face\s*\{[^}]*\}/g, '').matchAll(/font-weight:\s*(\d{3})/g)].map((m) => Number(m[1])),
);
const faces = JSON.parse(await fs.readFile(path.join(BUILD, 'fonts.json'), 'utf8')).faces;
const fonts = faces.filter((f) => usedWeights.has(f.weight));

/* ── кадры первого экрана ────────────────────────────────────────────── */
const images = JSON.parse(await fs.readFile(path.join(BUILD, 'images.json'), 'utf8'));
/** Браузер выбирает по интринсикам: слот из sizes × плотность экрана. */
const wanted = requestWidthAt(TRANSFER_PROFILE.width) * TRANSFER_PROFILE.dpr;
const pick = (slug) => {
  const variants = (images.photos[slug]?.variants || []).filter((v) => v.ext === 'avif')
    .sort((a, b) => a.width - b.width);
  return variants.find((v) => v.width >= wanted) || variants[variants.length - 1];
};
const photos = layers.slice(0, FIRST_SCREEN_SLIDES).map((l) => ({ slug: l.photo, ...pick(l.photo) }));

/* ── мелочь из <head> ────────────────────────────────────────────────── */
const smallRefs = [...html.matchAll(/<link[^>]*rel="(icon|manifest)"[^>]*href="([^"]+)"/g)].map((m) => m[2]);

/* ── счёт ────────────────────────────────────────────────────────────── */
const sum = async (files) => (await Promise.all(files.map(weigh))).reduce((s, n) => s + n, 0);
const codeBytes = await sum([...css, ...js]);
const docBytes = zlib.brotliCompressSync(Buffer.from(html)).length;
const fontBytes = fonts.reduce((s, f) => s + f.size, 0);
const photoBytes = photos.reduce((s, p) => s + (p?.size || 0), 0);
const smallBytes = await sum(smallRefs.map((r) => path.join(DIST, r.replace(/^\//, ''))));
const transferBytes = docBytes + codeBytes + fontBytes + photoBytes + smallBytes;

console.log(`\nТрансфер первой загрузки — статически, brotli, профиль ${TRANSFER_PROFILE.width}×${TRANSFER_PROFILE.height} ×${TRANSFER_PROFILE.dpr}`);
console.table([
  { что: 'документ', файлов: 1, вес: bytes(docBytes) },
  { что: 'стили', файлов: css.length, вес: bytes(await sum(css)) },
  { что: 'скрипты', файлов: js.length, вес: bytes(await sum(js)) },
  { что: `шрифты (веса ${[...usedWeights].sort().join(', ')})`, файлов: fonts.length, вес: bytes(fontBytes) },
  { что: `кадры ×${FIRST_SCREEN_SLIDES} @${photos[0]?.width}`, файлов: photos.length, вес: bytes(photoBytes) },
  { что: 'иконка и манифест', файлов: smallRefs.length, вес: bytes(smallBytes) },
]);

const over = [];
for (const [label, got, cap] of [
  ['вся страница', transferBytes, TRANSFER_BUDGET.transfer],
  ['CSS и JS', codeBytes, TRANSFER_BUDGET.code],
]) {
  const ok = got <= cap;
  if (!ok) over.push(`${label}: ${bytes(got)} > ${bytes(cap)}`);
  console.log('  ', ok ? '·' : '×', label.padEnd(14), bytes(got).padStart(9), `из ${bytes(cap)}`,
              ok ? `— запас ${bytes(cap - got)}` : `— ПЕРЕБОР ${bytes(got - cap)}`);
}

if (over.length) {
  console.error('\n   потолок трансфера не поднимаем молча:');
  over.forEach((o) => console.error('    ×', o));
  process.exit(1);
}
console.log('\n   сходится\n');
