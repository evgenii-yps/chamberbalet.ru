/**
 * Видеофон первого экрана.
 *
 *  media/originals/video/hero.<ext>
 *      → dist/assets/video/hero-1920.mp4  (H.264, CRF 28)
 *        dist/assets/video/hero-1280.mp4
 *        dist/assets/video/hero-1920.webm (VP9,  CRF 34)
 *        постер берётся первым кадром и уходит в конвейер изображений
 *
 * Ролика ещё нет — это нормальное состояние: печатаем заметку и выходим.
 * Страница в таком случае работает на фотографии.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { ORIGINALS, BUILD, BUILD_ASSETS, VIDEO, VIDEO_SECTION, BUDGET, PHOTO_FORMATS, bytes } from './config.mjs';
import { videoSection } from '../src/content.js';

const VIDEO_SRC = path.join(ORIGINALS, 'video');
const VIDEO_OUT = path.join(BUILD_ASSETS, 'video');
const POSTER_OUT = path.join(BUILD_ASSETS, 'photo');
const MANIFEST_FILE = path.join(BUILD, 'video.json');
const SECTION_MANIFEST_FILE = path.join(BUILD, 'video-section.json');
const EXTENSIONS = ['.mov', '.mp4', '.mkv', '.avi', '.webm', '.m4v'];

const log = (...a) => console.log('  ', ...a);
const hashOf = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.split('\n').slice(-6).join('\n')))));
  });
}

let ffmpegStatic = null;
try { ffmpegStatic = (await import('ffmpeg-static')).default; } catch { /* пакета нет */ }

/**
 * ffmpeg берётся из PATH, а если его там нет — из ffmpeg-static, когда пакет
 * поставлен. Театру ffmpeg не нужен: без видео сборка проходит и печатает
 * заметку, поэтому в зависимости он не уезжает.
 */
async function findFfmpeg() {
  for (const bin of ['ffmpeg', ffmpegStatic]) {
    if (!bin) continue;
    try { await run(bin, ['-version']); return bin; } catch { /* дальше */ }
  }
  return null;
}

async function findIn(dir, basename) {
  for (const ext of EXTENSIONS) {
    const file = path.join(dir, basename + ext);
    try { await fs.access(file); return file; } catch { /* дальше */ }
  }
  return null;
}

const findSource = () => findIn(VIDEO_SRC, 'hero');

const ARGS = {
  h264: (crf) => ['-c:v', 'libx264', '-crf', String(crf), '-preset', 'slow',
                  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart'],
  vp9:  (crf) => ['-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0',
                  '-row-mt', '1', '-pix_fmt', 'yuv420p'],
};

async function encode(bin, source, variant) {
  const tmp = path.join(BUILD, `${variant.name}.${variant.ext}`);
  await run(bin, [
    '-y', '-i', source,
    '-an',                                              // звука нет по требованию
    '-vf', `scale=${variant.width}:-2:flags=lanczos`,
    ...ARGS[variant.codec](variant.crf),
    tmp,
  ]);
  const data = await fs.readFile(tmp);
  await fs.unlink(tmp).catch(() => {});
  const file = `${variant.name}.${hashOf(data)}.${variant.ext}`;
  await fs.writeFile(path.join(VIDEO_OUT, file), data);
  return { file, size: data.length, width: variant.width, ext: variant.ext,
           mime: variant.ext === 'webm' ? 'video/webm' : 'video/mp4' };
}

/** Первый кадр ролика в трёх форматах — постер, видимый до готовности видео. */
async function makePoster(bin, source) {
  const raw = path.join(BUILD, 'hero-poster.png');
  await run(bin, ['-y', '-i', source, '-frames:v', '1', '-vf', 'scale=1920:-2', raw]);
  const input = await fs.readFile(raw);
  await fs.unlink(raw).catch(() => {});

  const variants = [];
  for (const format of PHOTO_FORMATS) {
    const buffer = await sharp(input)
      .toColourspace('srgb').withIccProfile('srgb')
      [format.ext === 'jpg' ? 'jpeg' : format.ext](format.options)
      .toBuffer();
    const file = `hero-poster-1920.${hashOf(buffer)}.${format.ext}`;
    await fs.writeFile(path.join(POSTER_OUT, file), buffer);
    variants.push({ file, size: buffer.length, ext: format.ext, mime: format.mime, width: 1920 });
  }
  return variants;
}

/**
 * Читает сведения о ролике из вывода ffmpeg.
 *
 * Разбор идёт независимыми выражениями, а не одним на всю строку: строка
 * Stream содержит запятые внутри скобок — `yuv420p(tv, bt709, progressive)`, —
 * и единый шаблон на них разъезжается. Разбор по частям от этого не зависит.
 */
async function probe(bin, file) {
  const text = await capture(bin, ['-hide_banner', '-i', file]);
  const line = /^.*Video: .*$/m.exec(text)?.[0];
  if (!line) return null;
  const size = /(?:^|[\s,])(\d{2,5})x(\d{2,5})(?![\d])/.exec(line);
  const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(text);
  const br = /bitrate: (\d+) kb\/s/.exec(text);
  const vbr = /Video:.*?, (\d+) kb\/s/.exec(line);
  return {
    codec: /Video: (\w+)/.exec(line)?.[1] || null,
    profile: /Video: \w+ \(([^)]+)\)/.exec(line)?.[1] || null,
    width: size ? Number(size[1]) : null,
    height: size ? Number(size[2]) : null,
    duration: d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : null,
    bitrate: br ? Number(br[1]) * 1000 : (vbr ? Number(vbr[1]) * 1000 : null),
    audio: /Audio: /.test(text),
  };
}

/** ffmpeg пишет сведения о файле в stderr и выходит с ошибкой без -o. */
function capture(bin, args) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let out = '';
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', () => resolve(''));
    child.on('close', () => resolve(out));
  });
}

/**
 * Ролик секции «Как это выглядит в зале».
 *
 * Отличается от фона первого экрана по всем пунктам: со звуком, с нативными
 * контролами, зритель включает его сам. Поэтому и конвейер свой.
 *
 * Перекодирования по умолчанию НЕТ. Присланный материал уже H.264 High и
 * укладывается в потолок битрейта; повторное сжатие только потеряло бы
 * качество, ничего не выиграв. Делается ремукс с +faststart — чтобы moov
 * оказался в начале файла и браузер начинал играть, не дождавшись конца.
 * Перекодирование включается само, если исходник выше потолка битрейта.
 */
async function buildSectionVideo(bin, quiet) {
  const empty = { source: null, poster: null };
  const source = await findIn(VIDEO_SRC, videoSection.basename);
  if (!source) {
    if (!quiet) log(`ролик секции (${videoSection.basename}) не найден — секции видео не будет`);
    await fs.writeFile(SECTION_MANIFEST_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }

  const info = await probe(bin, source);
  await fs.mkdir(VIDEO_OUT, { recursive: true });
  await fs.mkdir(POSTER_OUT, { recursive: true });

  const tmp = path.join(BUILD, 'stage-tmp.mp4');
  const recode = info && info.bitrate > VIDEO_SECTION.maxBitrate * 1.15;
  await run(bin, recode
    ? ['-y', '-i', source, '-c:v', 'libx264', '-b:v', String(Math.round(VIDEO_SECTION.maxBitrate)),
       '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
       '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', tmp]
    : ['-y', '-i', source, '-c', 'copy', '-movflags', '+faststart', tmp]);

  const data = await fs.readFile(tmp);
  await fs.unlink(tmp).catch(() => {});
  const file = `stage.${hashOf(data)}.mp4`;
  await fs.writeFile(path.join(VIDEO_OUT, file), data);

  // Постер. Ставится из JS при входе секции в вьюпорт, поэтому в первую
  // загрузку не попадает — но собрать его надо здесь.
  const raw = path.join(BUILD, 'stage-poster.png');
  await run(bin, ['-y', '-ss', String(videoSection.posterAt), '-i', source, '-frames:v', '1', raw]);
  const poster = await sharp(await fs.readFile(raw))
    .toColourspace('srgb').withIccProfile('srgb')
    .webp({ quality: VIDEO_SECTION.poster.quality, effort: 5 })
    .toBuffer();
  await fs.unlink(raw).catch(() => {});
  const posterFile = `stage-poster.${hashOf(poster)}.webp`;
  await fs.writeFile(path.join(POSTER_OUT, posterFile), poster);
  const posterMeta = await sharp(poster).metadata();

  const manifest = {
    source: { file, size: data.length, mime: 'video/mp4', recoded: Boolean(recode), ...info },
    poster: { file: posterFile, size: poster.length, width: posterMeta.width, height: posterMeta.height },
  };
  await fs.writeFile(SECTION_MANIFEST_FILE, JSON.stringify(manifest, null, 2));

  if (!quiet) {
    log(`ролик секции: ${info?.width}×${info?.height}, ${info?.duration?.toFixed(1)} с, ` +
        `${info?.bitrate ? (info.bitrate / 1000).toFixed(0) : '?'} kb/s, ` +
        `${info?.codec} ${info?.profile}, звук ${info?.audio ? 'есть' : 'нет'}, ${bytes(data.length)}` +
        (recode ? ' — перекодирован под потолок битрейта' : ' — ремукс с faststart, без перекодирования'));
    log(`постер: ${posterMeta.width}×${posterMeta.height}, ${bytes(poster.length)} из ${bytes(VIDEO_SECTION.poster.cap)}` +
        (poster.length > VIDEO_SECTION.poster.cap ? ' — ПЕРЕБОР' : ''));
    if (info?.width && info.width < info.height) {
      log('внимание: кадр вертикальный. ТЗ правки 06 просило 16 : 9; секция сверстана под вертикаль по решению владельца.');
    }
    if (info?.duration && (info.duration < 40 || info.duration > 60)) {
      log(`внимание: длительность ${info.duration.toFixed(1)} с вне полосы 40–60 с из ТЗ.`);
    }
  }
  return manifest;
}

export async function buildVideo({ quiet = false } = {}) {
  await fs.mkdir(BUILD, { recursive: true });
  const empty = { sources: [], poster: [] };
  const emptySection = { source: null, poster: null };

  if (!quiet) console.log('\nВидео');
  const bin = await findFfmpeg();
  if (!bin) {
    if (!quiet) log('ffmpeg не найден — собираю без видео. Поставить: npm i -D ffmpeg-static');
    await fs.writeFile(MANIFEST_FILE, JSON.stringify(empty, null, 2));
    await fs.writeFile(SECTION_MANIFEST_FILE, JSON.stringify(emptySection, null, 2));
    return empty;
  }

  // Ролик секции собирается независимо от фона первого экрана: это два
  // разных ролика, и отсутствие одного не должно отменять другой.
  const section = await buildSectionVideo(bin, quiet);

  const source = await findSource();
  if (!source) {
    if (!quiet) log('фон первого экрана (hero) не найден, собираю без него');
    await fs.writeFile(MANIFEST_FILE, JSON.stringify(empty, null, 2));
    return { ...empty, section };
  }

  await fs.mkdir(VIDEO_OUT, { recursive: true });
  await fs.mkdir(POSTER_OUT, { recursive: true });
  const sources = [];
  for (const variant of VIDEO.variants) sources.push(await encode(bin, source, variant));
  const poster = await makePoster(bin, source);

  // Порядок <source>: сначала WebM, затем MP4.
  sources.sort((a, b) => (a.ext === b.ext ? b.width - a.width : a.ext === 'webm' ? -1 : 1));

  const manifest = { sources, poster };
  await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

  if (!quiet) {
    console.table(sources.map((s) => ({ файл: s.file, ширина: s.width, вес: bytes(s.size) })));
    log(`постер: ${bytes(poster.reduce((s, p) => s + p.size, 0))} в трёх форматах`);
  }

  const heavy = sources.filter((s) => s.size > BUDGET.video);
  if (heavy.length) {
    console.error('\nВидео тяжелее бюджета:');
    heavy.forEach((s) => console.error('  ', `${s.file} — ${bytes(s.size)} > ${bytes(BUDGET.video)}`));
    throw new Error('видео превышает 4 МБ');
  }
  return { ...manifest, section };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildVideo().catch((e) => { console.error(e.message); process.exit(1); });
}
