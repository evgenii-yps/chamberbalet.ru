/**
 * Конвейер изображений.
 *
 *  media/originals/photo/<имя>.<ext>
 *      → dist/assets/photo/<имя>-<ширина>.<хэш>.<avif|webp|jpg>
 *
 * Кадр показывается вплоть до масштаба 2,6, поэтому одной ширины экрана мало:
 * генерируем до 2560 и просим браузер брать крупный вариант через sizes.
 *
 * Отсутствие оригиналов — нормальное состояние: печатаем заметку и выходим
 * с пустым манифестом, сборка продолжается.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {
  ORIGINALS, BUILD, BUILD_ASSETS, PHOTO_FORMATS, OG_IMAGE,
  MIN_ORIGINAL_LONG_SIDE, BUDGET, BUDGET_WIDTH, FIRST_SCREEN_SLIDES, bytes,
  widthsFor, requestWidthAt, CODE_FONTS_FALLBACK, GALLERY, SEAM_LQIP,
} from './config.mjs';
import { layers, gallery } from '../src/content.js';

const PHOTO_SRC = path.join(ORIGINALS, 'photo');
const PHOTO_OUT = path.join(BUILD_ASSETS, 'photo');
const GALLERY_SRC = path.join(ORIGINALS, 'gallery');
const GALLERY_OUT = path.join(BUILD_ASSETS, 'gallery');
const CACHE_FILE = path.join(BUILD, 'images.cache.json');
const MANIFEST_FILE = path.join(BUILD, 'images.json');
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp', '.avif'];

const log = (...a) => console.log('  ', ...a);

async function readCache() {
  try { return JSON.parse(await fs.readFile(CACHE_FILE, 'utf8')); } catch { return {}; }
}

async function findIn(dir, basename) {
  for (const ext of EXTENSIONS) {
    const file = path.join(dir, basename + ext);
    try { await fs.access(file); return file; } catch { /* дальше */ }
  }
  return null;
}

const findOriginal = (basename) => findIn(PHOTO_SRC, basename);

const hashOf = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);

/** Один вариант: ширина × формат. Без апскейла — узкий оригинал просто не даёт крупных ширин. */
async function renderVariant(pipeline, basename, width, format) {
  const buffer = await pipeline
    .clone()
    .resize({ width, withoutEnlargement: true, fit: 'inside' })
    [format.ext === 'jpg' ? 'jpeg' : format.ext](format.options)
    .toBuffer({ resolveWithObject: true });

  const hash = hashOf(buffer.data);
  const file = `${basename}-${buffer.info.width}.${hash}.${format.ext}`;
  await fs.writeFile(path.join(PHOTO_OUT, file), buffer.data);
  return { width: buffer.info.width, height: buffer.info.height, ext: format.ext, mime: format.mime, file, size: buffer.data.length };
}

async function processPhoto(basename, source, cache) {
  const stat = await fs.stat(source);
  const widths = widthsFor(basename);
  // Лесенка входит в ключ: смена лесенки не должна отдавать кадры из кэша.
  const key = `${basename}:${stat.size}:${Math.round(stat.mtimeMs)}:${widths.join('/')}`;
  if (cache[basename]?.key === key) {
    const files = cache[basename].variants.map((v) => path.join(PHOTO_OUT, v.file));
    const present = await Promise.all(files.map((f) => fs.access(f).then(() => true, () => false)));
    if (present.every(Boolean)) return cache[basename];
  }

  const input = sharp(source, { failOn: 'none' });
  const meta = await input.metadata();
  const longSide = Math.max(meta.width || 0, meta.height || 0);
  const warnings = [];
  if (longSide < MIN_ORIGINAL_LONG_SIDE) {
    warnings.push(`${basename}: оригинал ${meta.width}×${meta.height}, нужно от ${MIN_ORIGINAL_LONG_SIDE} px по длинной стороне`);
  }

  // Метаданные вон, цвет принудительно в sRGB: кадры из Adobe RGB иначе поедут.
  const base = input.rotate().toColourspace('srgb').withIccProfile('srgb');

  const variants = [];
  for (const width of widths) {
    if (width > longSide && variants.some((v) => v.width >= longSide)) continue;
    for (const format of PHOTO_FORMATS) {
      variants.push(await renderVariant(base, basename, width, format));
    }
  }
  // Дубли по (ширина, формат) появляются, когда withoutEnlargement упирается в оригинал.
  const seen = new Set();
  const unique = variants.filter((v) => {
    const id = `${v.width}.${v.ext}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return { key, width: meta.width, height: meta.height, variants: unique, warnings };
}

async function makeOgImage(source) {
  const buffer = await sharp(source, { failOn: 'none' })
    .rotate()
    .resize({ width: OG_IMAGE.width, height: OG_IMAGE.height, fit: 'cover', position: 'attention' })
    .toColourspace('srgb')
    .withIccProfile('srgb')
    .jpeg({ quality: 84, progressive: true, mozjpeg: true })
    .toBuffer();
  const file = `og-${hashOf(buffer)}.jpg`;
  await fs.writeFile(path.join(PHOTO_OUT, file), buffer);
  return { file, size: buffer.length };
}

/**
 * Галерея: две производные на кадр — миниатюра в сетку и полноразмер в
 * лайтбокс. Полноразмер в первую загрузку не входит и открывается по клику,
 * поэтому его потолок отдельный и щедрее.
 *
 * Миниатюра режется в 3 : 2 через fit: cover — сетка обязана держать ряды
 * ровными, а среди оригиналов есть вертикальные. Точка кадрирования
 * `attention`: sharp выбирает область с наибольшей детализацией, что для
 * вертикального кадра с фигурой даёт корпус, а не потолок.
 */
async function processGalleryItem(item) {
  const source = await findIn(GALLERY_SRC, item.photo);
  if (!source) return null;
  const base = sharp(source, { failOn: 'none' }).rotate().toColourspace('srgb').withIccProfile('srgb');
  const meta = await sharp(source, { failOn: 'none' }).metadata();

  const thumbBuf = await base.clone()
    .resize({ width: GALLERY.thumb.width, height: GALLERY.thumb.height, fit: 'cover', position: 'attention' })
    .webp({ quality: GALLERY.thumb.quality, effort: 5 })
    .toBuffer();
  const fullBuf = await base.clone()
    .resize({ width: GALLERY.full.width, height: GALLERY.full.width, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: GALLERY.full.quality, effort: 5 })
    .toBuffer();
  const fullMeta = await sharp(fullBuf).metadata();

  const thumb = `${item.photo}-${GALLERY.thumb.width}.${hashOf(thumbBuf)}.webp`;
  const full  = `${item.photo}-${GALLERY.full.width}.${hashOf(fullBuf)}.webp`;
  await fs.writeFile(path.join(GALLERY_OUT, thumb), thumbBuf);
  await fs.writeFile(path.join(GALLERY_OUT, full), fullBuf);

  return {
    photo: item.photo, alt: item.alt,
    thumb: { file: thumb, size: thumbBuf.length, width: GALLERY.thumb.width, height: GALLERY.thumb.height },
    full:  { file: full,  size: fullBuf.length,  width: fullMeta.width, height: fullMeta.height },
    source: { width: meta.width, height: meta.height },
  };
}

/**
 * LQIP стыка: нижние 30 % последнего кадра пролёта, ужатые до 20 px по
 * ширине. Дальше эту кроху растягивает и размывает CSS.
 *
 * Берётся именно последний кадр, потому что после пролёта на экране остаётся
 * он: .flight.is-done гасит все слои, кроме [data-live-frame]. Возьми любой
 * другой — стык растворял бы фотографию не в ту, что над ним стоит.
 */
async function buildSeamLqip() {
  const last = layers.at(-1);
  const source = await findOriginal(last.photo);
  if (!source) return null;
  const img = sharp(source, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  const height = Math.round(meta.height * SEAM_LQIP.bottom);
  const buffer = await img
    .extract({ left: 0, top: meta.height - height, width: meta.width, height })
    .resize({ width: SEAM_LQIP.width })
    .toColourspace('srgb')
    .webp({ quality: SEAM_LQIP.quality, effort: 6 })
    .toBuffer();
  return { slug: last.photo, size: buffer.length, dataUri: `data:image/webp;base64,${buffer.toString('base64')}` };
}

export async function buildImages({ quiet = false } = {}) {
  await fs.mkdir(PHOTO_OUT, { recursive: true });
  await fs.mkdir(GALLERY_OUT, { recursive: true });
  await fs.mkdir(BUILD, { recursive: true });

  const cache = await readCache();
  const manifest = { photos: {}, og: null };
  const warnings = [];
  const missing = [];

  // Кодирование AVIF в четырёх ширинах идёт минуты. Печатаем ход работы:
  // молчащая сборка выглядит зависшей.
  const total = layers.length;
  for (const [n, slide] of layers.entries()) {
    const source = await findOriginal(slide.photo);
    if (!source) { missing.push(slide.photo); continue; }
    const started = performance.now();
    const entry = await processPhoto(slide.photo, source, cache);
    if (!quiet) {
      const took = (performance.now() - started) / 1000;
      const note = took < 0.05 ? 'из кэша' : `${took.toFixed(1)} с`;
      process.stdout.write(`   [${String(n + 1).padStart(2)}/${total}] ${slide.photo} — ${note}\n`);
    }
    cache[slide.photo] = entry;
    warnings.push(...(entry.warnings || []));
    manifest.photos[slide.photo] = {
      width: entry.width,
      height: entry.height,
      variants: entry.variants,
    };
  }

  const heroSource = await findOriginal(layers[0].photo);
  if (heroSource) manifest.og = await makeOgImage(heroSource);

  // Галерея. Отсутствующий оригинал не роняет сборку — кадр просто выпадает.
  manifest.gallery = [];
  const galleryMissing = [];
  for (const item of gallery.items) {
    const entry = await processGalleryItem(item);
    if (entry) manifest.gallery.push(entry); else galleryMissing.push(item.photo);
  }

  manifest.seam = await buildSeamLqip();

  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

  if (!quiet) {
    report(manifest, warnings, missing, await codeAndFontsSize(), await videoSize());
    reportGallery(manifest, galleryMissing);
  }
  return manifest;
}

/** Вес одного кадра в том виде, в каком его реально возьмёт браузер.
 *
 *  Считаем не по ширине экрана, а по ширине ЗАПРОСА: sizes = min(160vw, 2560px)
 *  на FullHD даёт 2560, поэтому браузер тянет самый крупный вариант кадра.
 *  Счёт по 1920 занижал бы бюджет почти вдвое. */
function representativeSize(photo) {
  if (!photo) return 0;
  const avif = photo.variants.filter((v) => v.ext === 'avif').sort((a, b) => a.width - b.width);
  if (!avif.length) return 0;
  const want = requestWidthAt(BUDGET_WIDTH);
  return (avif.find((v) => v.width >= want) || avif[avif.length - 1]).size;
}

/** Вес шрифтов и кода: измеренный прошлой полной сборкой, иначе — резерв. */
async function codeAndFontsSize() {
  try {
    const w = JSON.parse(await fs.readFile(path.join(BUILD, 'weights.json'), 'utf8'));
    if (Number.isFinite(w.codeAndFonts)) return { size: w.codeAndFonts, measured: true };
  } catch { /* полной сборки ещё не было */ }
  return { size: CODE_FONTS_FALLBACK, measured: false };
}

/** Вес видео: из манифеста прошлой сборки. Нет видео — строка нулевая. */
async function videoSize() {
  try {
    const v = JSON.parse(await fs.readFile(path.join(BUILD, 'video.json'), 'utf8'));
    const files = v?.variants || [];
    return files.reduce((s, f) => s + (f.size || 0), 0) + (v?.poster?.size || 0);
  } catch { return 0; }
}

function reportGallery(manifest, missing) {
  console.log('\nГалерея и стык');
  if (missing.length) log(`оригиналов нет: ${missing.join(', ')}`);
  if (!manifest.gallery.length) { log('кадров галереи нет — секция не собирается'); }
  else {
    console.table(manifest.gallery.map((g) => ({
      кадр: g.photo,
      оригинал: `${g.source.width}×${g.source.height}`,
      миниатюра: bytes(g.thumb.size),
      'полный': `${g.full.width}×${g.full.height} ${bytes(g.full.size)}`,
    })));
    const thumbs = manifest.gallery.reduce((s, g) => s + g.thumb.size, 0);
    const fulls = manifest.gallery.reduce((s, g) => s + g.full.size, 0);
    const overThumb = manifest.gallery.filter((g) => g.thumb.size > GALLERY.thumb.cap);
    const overFull = manifest.gallery.filter((g) => g.full.size > GALLERY.full.cap);
    log(`миниатюры ×${manifest.gallery.length}: ${bytes(thumbs)} — входят в transfer-full`);
    log(`полноразмеры: ${bytes(fulls)} — грузятся по клику, в бюджет страницы не входят`);
    for (const g of overThumb) log(`внимание: миниатюра ${g.photo} — ${bytes(g.thumb.size)} > ${bytes(GALLERY.thumb.cap)}`);
    for (const g of overFull) log(`внимание: полноразмер ${g.photo} — ${bytes(g.full.size)} > ${bytes(GALLERY.full.cap)}`);
  }
  if (manifest.seam) {
    const ok = manifest.seam.size <= SEAM_LQIP.cap;
    log(`LQIP стыка (${manifest.seam.slug}, нижние ${SEAM_LQIP.bottom * 100} %, ${SEAM_LQIP.width} px): ` +
        `${manifest.seam.size} Б из ${SEAM_LQIP.cap}${ok ? '' : ' — ПЕРЕБОР'}`);
  }
}

function report(manifest, warnings, missing, extra, videoBytes) {
  const names = Object.keys(manifest.photos);
  console.log('\nИзображения');

  if (missing.length) {
    log(`оригиналов нет: ${missing.length} из ${layers.length} (${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ', …' : ''})`);
  }
  if (!names.length) {
    log('ни одного оригинала не найдено — собираю без фотографий');
    return;
  }

  const rows = names.map((name) => {
    const p = manifest.photos[name];
    const total = p.variants.reduce((s, v) => s + v.size, 0);
    return {
      кадр: name,
      оригинал: `${p.width}×${p.height}`,
      вариантов: p.variants.length,
      [`avif@${BUDGET_WIDTH}`]: bytes(representativeSize(p)),
      'все файлы': bytes(total),
    };
  });
  console.table(rows);

  for (const w of warnings) log('внимание:', w);

  const videoPoster = manifest.og ? manifest.og.size : 0;
  const firstScreen = layers
    .slice(0, FIRST_SCREEN_SLIDES)
    .reduce((s, sl) => s + representativeSize(manifest.photos[sl.photo]), 0) + videoPoster;
  const photos = layers.reduce((s, sl) => s + representativeSize(manifest.photos[sl.photo]), 0) + videoPoster;

  const { size: codeFonts, measured } = extra;
  const page = photos + codeFonts;

  const want = requestWidthAt(BUDGET_WIDTH);
  log(`ширина запроса на ${BUDGET_WIDTH} px: ${want} px (sizes = min(160vw, 2560px)) — по ней и считаем`);
  log(`первый экран (${FIRST_SCREEN_SLIDES} кадра + постер): ${bytes(firstScreen)} из ${bytes(BUDGET.firstScreen)}`);

  // Две строки. §4.5 и §5.2 противоречили друг другу; развели явно.
  console.log('\n  Бюджет — две независимые строки');
  log(`  1. изображения + шрифты и код: ${bytes(photos)} + ${bytes(codeFonts)}${measured ? '' : ' (резерв, полной сборки ещё не было)'} = ${bytes(page)} из ${bytes(BUDGET.page)}`);
  log(`  2. видео:                      ${bytes(videoBytes)} из ${bytes(BUDGET.video)}${videoBytes ? '' : ' — видео не снято'}`);

  // Запас до потолка первой строки — в мегабайтах и в кадрах: по нему видно,
  // сколько ещё кадров пролёт выдержит, если главы когда-нибудь добавятся.
  const perPhoto = photos / layers.length;
  log(`  запас строки 1: ${bytes(BUDGET.page - page)} — это ещё ${Math.floor((BUDGET.page - page) / perPhoto)} кадр(ов) того же веса`);

  const over = [];
  if (firstScreen > BUDGET.firstScreen) over.push(`первый экран ${bytes(firstScreen)} > ${bytes(BUDGET.firstScreen)}`);
  if (page > BUDGET.page) over.push(`строка 1 (изображения + шрифты и код) ${bytes(page)} > ${bytes(BUDGET.page)}`);
  if (videoBytes > BUDGET.video) over.push(`строка 2 (видео) ${bytes(videoBytes)} > ${bytes(BUDGET.video)}`);
  if (over.length) {
    console.error('\nБюджет превышен:');
    over.forEach((o) => console.error('  ', o));
    console.error('   потолок не поднимаем: режем лесенку или кадры, а не бюджет.');
    process.exitCode = 1;
    throw new Error('бюджет веса превышен');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildImages().catch((e) => { console.error(e.message); process.exit(1); });
}
