/** Общие константы сборки и сторожей. Правится здесь, а не в трёх местах. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = path.join(ROOT, 'src');
export const DIST = path.join(ROOT, 'dist');
export const BUILD = path.join(ROOT, '.build');
/** Слоты изображений первого экрана и портрета: media/hero-*.{mp4,webm,jpg}, media/olesya.jpg */
export const MEDIA = path.join(ROOT, 'media');

export const bytes = (n) => (n < 1024 ? `${n} Б` : n < 1048576 ? `${(n / 1024).toFixed(1)} КиБ` : `${(n / 1048576).toFixed(2)} МиБ`);

/** Шрифты (самохостинг, woff2, кириллица + латиница). Файлы берутся из @fontsource. */
export const FONTS = [
  { family: 'Prata', pkg: '@fontsource/prata', slug: 'prata', weights: [400], preload: true },
  { family: 'Golos Text', pkg: '@fontsource/golos-text', slug: 'golos-text', weights: [400, 500, 600] },
];
export const FONT_RANGES = {
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
};

/**
 * Бюджет передачи (brotli, байты): документ + стили + скрипты + шрифты первой
 * загрузки. Картинок на странице нет (слоты пусты), поэтому потолок общий.
 * Потолки не поднимаются молча.
 */
export const TRANSFER_BUDGET = {
  /** html + css + js под brotli */
  code: 60 * 1024,
  /** первая загрузка целиком: код + шрифты, которые попросит браузер */
  transfer: 220 * 1024,
};
