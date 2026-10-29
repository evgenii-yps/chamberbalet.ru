/**
 * Шрифты: самохостинг, ноль внешних запросов.
 * Prata (дисплей) и Golos Text 400/500/600 берутся готовыми woff2-субсетами из
 * @fontsource: только cyrillic и latin, только прямое начертание.
 * Результат — папка dist/assets/fonts с хэшем в имени и @font-face для CSS.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, DIST, FONTS, FONT_RANGES } from './config.mjs';

export async function buildFonts() {
  const outDir = path.join(DIST, 'assets', 'fonts');
  await fs.mkdir(outDir, { recursive: true });
  const faces = [];
  let css = '';
  for (const font of FONTS) {
    for (const weight of font.weights) {
      for (const subset of ['cyrillic', 'latin']) {
        const src = path.join(ROOT, 'node_modules', font.pkg, 'files', `${font.slug}-${subset}-${weight}-normal.woff2`);
        let body;
        try { body = await fs.readFile(src); }
        catch { throw new Error(`нет шрифта ${src}: выполните npm ci`); }
        const hash = crypto.createHash('sha256').update(body).digest('hex').slice(0, 8);
        const file = `${font.slug}-${subset}-${weight}.${hash}.woff2`;
        await fs.writeFile(path.join(outDir, file), body);
        faces.push({ family: font.family, weight, subset, file, size: body.length, preload: font.preload && subset === 'cyrillic' });
        css += `@font-face{font-family:'${font.family}';font-style:normal;font-weight:${weight};font-display:swap;` +
               `src:url(/assets/fonts/${file}) format('woff2');unicode-range:${FONT_RANGES[subset]}}\n`;
      }
    }
  }
  // Первый экран набран Prata и Golos 400 — их кириллицу просим заранее.
  for (const f of faces) if (f.family === 'Golos Text' && f.weight === 400 && f.subset === 'cyrillic') f.preload = true;
  return { faces, css };
}
