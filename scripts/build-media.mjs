/**
 * Система медиа: media/media.json → слоты страницы.
 *
 *   { "hero-chamber": { "type": "bg",     "src": "media/hero-chamber.mp4", "poster": "media/hero-chamber.webp" },
 *     "video-main":   { "type": "inline", "src": "media/main.mp4", "preview": "media/main-preview.mp4",
 *                       "poster": "media/main.webp", "caption": "«Щелкунчик», Дом Архитектора" },
 *     "scale-1":      { "type": "img",    "src": "media/scale-1.jpg", "alt": "…" },
 *     "qr-rider":     { "type": "qr",     "url": "https://…" } }
 *
 * Нет записи или файла — слот остаётся красивой заглушкой. Пути — от корня репозитория.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { ROOT, DIST, MEDIA, bytes } from './config.mjs';

const WIDTHS = [640, 1280, 1920];
const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
const exists = (f) => fs.access(f).then(() => true, () => false);

async function copyHashed(rel, dir, warn, cap) {
  const src = path.join(ROOT, rel);
  if (!(await exists(src))) { warn(`нет файла ${rel}`); return null; }
  const body = await fs.readFile(src);
  if (cap && body.length > cap) warn(`${rel}: ${bytes(body.length)} больше ${bytes(cap)}`);
  const ext = path.extname(rel);
  const name = `${path.basename(rel, ext)}.${hash(body)}${ext}`;
  await fs.mkdir(path.join(DIST, dir), { recursive: true });
  await fs.writeFile(path.join(DIST, dir, name), body);
  return `/${dir}/${name}`;
}

async function photo(id, c, warn) {
  const src = path.join(ROOT, c.src);
  if (!(await exists(src))) { warn(`нет файла ${c.src}`); return null; }
  const body = await fs.readFile(src);
  const meta = await sharp(body).metadata();
  const h = hash(body);
  await fs.mkdir(path.join(DIST, 'assets', 'photo'), { recursive: true });
  const widths = WIDTHS.filter((w) => w <= meta.width);
  if (!widths.length || widths[widths.length - 1] < meta.width) widths.push(Math.min(meta.width, WIDTHS[2]));
  const out = { webp: [], jpg: [], width: meta.width, height: meta.height, alt: c.alt || '' };
  for (const w of [...new Set(widths)]) {
    for (const [ext, opts] of [['webp', { quality: 74, effort: 5 }], ['jpg', { quality: 80, progressive: true, mozjpeg: true }]]) {
      const file = `${id}-${w}.${h}.${ext}`;
      const img = sharp(body).rotate().resize({ width: w, withoutEnlargement: true });
      await fs.writeFile(path.join(DIST, 'assets', 'photo', file), await (ext === 'webp' ? img.webp(opts) : img.jpeg(opts)).toBuffer());
      out[ext].push({ w, url: `/assets/photo/${file}` });
    }
  }
  return out;
}

export async function buildMedia() {
  const warnings = [];
  const warn = (m) => warnings.push(m);
  const file = path.join(MEDIA, 'media.json');
  let cfg = {};
  if (await exists(file)) {
    try { cfg = JSON.parse(await fs.readFile(file, 'utf8')); } catch (e) { throw new Error(`media/media.json: ${e.message}`); }
  }
  const manifest = {};
  for (const [id, c] of Object.entries(cfg)) {
    if (!c || id.startsWith('_')) continue;
    const type = c.type;
    if (type === 'img') {
      const p = await photo(id, c, warn);
      if (p) manifest[id] = { type, ...p };
    } else if (type === 'bg' || type === 'inline') {
      const e = { type, caption: c.caption || '' };
      if (c.src) e.src = await copyHashed(c.src, 'media', warn, type === 'bg' ? 3 * 1048576 : null);
      if (c.full) e.full = await copyHashed(c.full, 'media', warn);
      if (c.preview) e.preview = await copyHashed(c.preview, 'media', warn);
      if (c.poster) e.poster = await copyHashed(c.poster, 'media', warn, 120 * 1024);
      if (e.src || e.poster) manifest[id] = e;
    } else if (type === 'qr') {
      manifest[id] = { type, url: c.url };
    } else warn(`${id}: неизвестный type «${type}»`);
  }
  return { manifest, warnings };
}
