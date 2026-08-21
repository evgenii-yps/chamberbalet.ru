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
import { ORIGINALS, BUILD, BUILD_ASSETS, VIDEO, BUDGET, PHOTO_FORMATS, bytes } from './config.mjs';

const VIDEO_SRC = path.join(ORIGINALS, 'video');
const VIDEO_OUT = path.join(BUILD_ASSETS, 'video');
const POSTER_OUT = path.join(BUILD_ASSETS, 'photo');
const MANIFEST_FILE = path.join(BUILD, 'video.json');
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

async function hasFfmpeg() {
  try { await run('ffmpeg', ['-version']); return true; } catch { return false; }
}

async function findSource() {
  for (const ext of EXTENSIONS) {
    const file = path.join(VIDEO_SRC, 'hero' + ext);
    try { await fs.access(file); return file; } catch { /* дальше */ }
  }
  return null;
}

const ARGS = {
  h264: (crf) => ['-c:v', 'libx264', '-crf', String(crf), '-preset', 'slow',
                  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart'],
  vp9:  (crf) => ['-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0',
                  '-row-mt', '1', '-pix_fmt', 'yuv420p'],
};

async function encode(source, variant) {
  const tmp = path.join(BUILD, `${variant.name}.${variant.ext}`);
  await run('ffmpeg', [
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
async function makePoster(source) {
  const raw = path.join(BUILD, 'hero-poster.png');
  await run('ffmpeg', ['-y', '-i', source, '-frames:v', '1', '-vf', 'scale=1920:-2', raw]);
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

export async function buildVideo({ quiet = false } = {}) {
  await fs.mkdir(BUILD, { recursive: true });
  const empty = { sources: [], poster: [] };

  const source = await findSource();
  if (!source) {
    if (!quiet) { console.log('\nВидео'); log('видео не найдено, собираю без него'); }
    await fs.writeFile(MANIFEST_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  if (!(await hasFfmpeg())) {
    if (!quiet) { console.log('\nВидео'); log('ffmpeg не установлен, собираю без видео (исходник на месте)'); }
    await fs.writeFile(MANIFEST_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }

  await fs.mkdir(VIDEO_OUT, { recursive: true });
  await fs.mkdir(POSTER_OUT, { recursive: true });

  console.log('\nВидео');
  const sources = [];
  for (const variant of VIDEO.variants) sources.push(await encode(source, variant));
  const poster = await makePoster(source);

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
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildVideo().catch((e) => { console.error(e.message); process.exit(1); });
}
