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
 *
 * К телам прибавляются заголовки ответа по HEADERS_PER_REQUEST_ESTIMATE —
 * величина оценочная, обоснование при ней же в config.mjs. Без неё счёт был
 * мягче Lighthouse на 4 195 Б: сборка проходила бы статику и не проходила
 * Lighthouse. С ней остаток — единицы байт.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  DIST, BUILD, TRANSFER_BUDGET, TRANSFER_PROFILE, HEADERS_PER_REQUEST_ESTIMATE,
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
/** Один запрос: тело плюс заголовки. Класс заголовков решает расширение —
 *  у сжатых ответов есть Content-Encoding и Vary, у прочих нет. */
const headersFor = (file) =>
  (COMPRESSIBLE.has(path.extname(file)) ? HEADERS_PER_REQUEST_ESTIMATE.compressed
                                        : HEADERS_PER_REQUEST_ESTIMATE.plain);

async function group(label, files) {
  const body = (await Promise.all(files.map(weigh))).reduce((s, n) => s + n, 0);
  const headers = files.reduce((s, f) => s + headersFor(f), 0);
  return { label, files, body, headers, total: body + headers };
}

const fontFiles = fonts.map((f) => path.join(DIST, 'assets', 'fonts', f.file));
const photoFiles = photos.map((p) => path.join(DIST, 'assets', 'photo', p.file));
const smallFiles = smallRefs.map((r) => path.join(DIST, r.replace(/^\//, '')));

const groups = [
  await group('документ', [path.join(DIST, 'index.html')]),
  await group('стили', css),
  await group('скрипты', js),
  await group(`шрифты (веса ${[...usedWeights].sort().join(', ')})`, fontFiles),
  await group(`кадры ×${FIRST_SCREEN_SLIDES} @${photos[0]?.width}`, photoFiles),
  await group('иконка и манифест', smallFiles),
];

const codeGroups = groups.filter((g) => g.label === 'стили' || g.label === 'скрипты');
const codeBytes = codeGroups.reduce((s, g) => s + g.total, 0);
const transferBytes = groups.reduce((s, g) => s + g.total, 0);
const requests = groups.reduce((s, g) => s + g.files.length, 0);
const headersTotal = groups.reduce((s, g) => s + g.headers, 0);

console.log(`\nЧетыре гейта. Трансфер первой загрузки — статически, brotli, профиль ${TRANSFER_PROFILE.width}×${TRANSFER_PROFILE.height} ×${TRANSFER_PROFILE.dpr}`);
console.table(groups.map((g) => ({
  что: g.label, запросов: g.files.length, тела: bytes(g.body),
  'заголовки (оценка)': bytes(g.headers), всего: bytes(g.total),
})));
console.log(`   запросов ${requests}, из них заголовков — ${bytes(headersTotal)} по оценке`);

/* ── transfer-full: вся страница после прокрутки до низа ─────────────── */
/*
 * Считается: документ, стили, скрипты, шрифты, ВСЕ кадры пролёта, миниатюры
 * галереи, постер видео, иконка и манифест.
 *
 * НЕ считается — намеренно, и это не умолчание:
 *
 *   ВИДЕОФАЙЛ. Стоит на preload="none" и не тянется, пока зритель не нажал
 *     play. У него свой гейт `video` с потолком 12 МБ. Включи его сюда — и
 *     число перестало бы что-либо значить: одиннадцать мегабайт перекрыли бы
 *     всё остальное, и рост галереи вдвое остался бы незамеченным.
 *
 *   ПОЛНОРАЗМЕРЫ ЛАЙТБОКСА. Тянутся по одному и только при открытии кадра.
 *     Их двенадцать; сложить их в бюджет страницы значило бы мерить сеанс,
 *     которого не бывает — никто не открывает подряд все двенадцать.
 *
 * Общее у обоих исключений одно: загрузка идёт по ЯВНОМУ действию зрителя,
 * а не по прокрутке. Всё, что приезжает само, здесь посчитано.
 */
const galleryDir = path.join(DIST, 'assets', 'gallery');
const galleryManifest = images.gallery || [];
const thumbFiles = galleryManifest.map((g) => path.join(galleryDir, g.thumb.file));

/** Все кадры пролёта в том варианте, который попросит браузер профиля. */
const allPhotoFiles = layers
  .map((l) => pick(l.photo))
  .filter(Boolean)
  .map((v) => path.join(DIST, 'assets', 'photo', v.file));

/** Постер видео: ставится из JS при входе секции в вьюпорт, то есть по
 *  прокрутке — значит в transfer-full входит. */
const sectionVideo = JSON.parse(await fs.readFile(path.join(BUILD, 'video-section.json'), 'utf8'));
const posterFiles = sectionVideo.poster
  ? [path.join(DIST, 'assets', 'photo', sectionVideo.poster.file)] : [];

const fullGroups = [
  await group('документ', [path.join(DIST, 'index.html')]),
  await group('стили', css),
  await group('скрипты', js),
  await group('шрифты', fontFiles),
  await group(`кадры пролёта ×${allPhotoFiles.length}`, allPhotoFiles),
  await group(`миниатюры галереи ×${thumbFiles.length}`, thumbFiles),
  await group('постер видео', posterFiles),
  await group('иконка и манифест', smallFiles),
];
const fullBytes = fullGroups.reduce((s, g) => s + g.total, 0);

console.log(`\nВся страница после прокрутки до низа — тот же профиль`);
console.table(fullGroups.map((g) => ({
  что: g.label, запросов: g.files.length, тела: bytes(g.body), всего: bytes(g.total),
})));
console.log('   исключены намеренно: видеофайл (свой гейт) и полноразмеры лайтбокса —');
console.log('   и то и другое грузится по явному действию зрителя, а не по прокрутке');

/* ── видео: отдельная строка ─────────────────────────────────────────── */
/* Нет файла — гейт проходит с нулём и начнёт работать в момент подстановки. */
const videoBytes = sectionVideo.source
  ? (await fs.stat(path.join(DIST, 'assets', 'video', sectionVideo.source.file))).size
  : 0;

const over = [];
for (const [label, got, cap] of [
  ['вся страница', transferBytes, TRANSFER_BUDGET.transfer],
  ['CSS и JS', codeBytes, TRANSFER_BUDGET.code],
  ['до низа', fullBytes, TRANSFER_BUDGET.transferFull],
  ['видео', videoBytes, TRANSFER_BUDGET.video],
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
