/** Общие константы конвейеров. Правится здесь, а не в трёх местах. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = path.join(ROOT, 'src');
export const DIST = path.join(ROOT, 'dist');
export const BUILD = path.join(ROOT, '.build');
/** Собранные медиа лежат здесь и копируются в dist/. Так очистка dist/ не
 *  выбрасывает результат многоминутного кодирования. */
export const BUILD_ASSETS = path.join(BUILD, 'assets');
export const ORIGINALS = path.join(ROOT, 'media', 'originals');

export const PHOTO_WIDTHS = [640, 1280, 1920, 2560];

export const PHOTO_FORMATS = [
  { ext: 'avif', mime: 'image/avif', options: { quality: 50, effort: 6 } },
  { ext: 'webp', mime: 'image/webp', options: { quality: 78, effort: 5 } },
  { ext: 'jpg',  mime: 'image/jpeg', options: { quality: 82, progressive: true, mozjpeg: true } },
];

/** Ниже этого по длинной стороне — печатаем предупреждение. */
export const MIN_ORIGINAL_LONG_SIDE = 2000;

/** Бюджеты веса, байты. */
export const BUDGET = {
  firstScreen: 1.2 * 1024 * 1024,
  page: 6 * 1024 * 1024,
  video: 4 * 1024 * 1024,
};

/** Сколько кадров держит экран загрузки и что считаем «первым экраном». */
export const FIRST_SCREEN_SLIDES = 3;

/** Ширина, по которой считаем бюджет: типовой десктоп. */
export const BUDGET_WIDTH = 1920;

export const OG_IMAGE = { width: 1200, height: 630 };

export const VIDEO = {
  variants: [
    { name: 'hero-1920', width: 1920, codec: 'h264', ext: 'mp4', crf: 28 },
    { name: 'hero-1280', width: 1280, codec: 'h264', ext: 'mp4', crf: 28 },
    { name: 'hero-1920', width: 1920, codec: 'vp9',  ext: 'webm', crf: 34 },
  ],
};

/** Кириллица + базовая латиница + типографика, которую реально используем. */
export const FONT_UNICODE_RANGES = [
  [0x0020, 0x007e], // базовая латиница
  [0x00a0, 0x00a0],
  [0x00ab, 0x00ab], [0x00bb, 0x00bb], // « »
  [0x00d7, 0x00d7],                   // ×
  [0x0400, 0x04ff], // кириллица
  [0x2010, 0x2015], // дефисы и тире
  [0x2018, 0x201f], // кавычки
  [0x2022, 0x2022], // •
  [0x2026, 0x2026], // …
  [0x00a9, 0x00a9], // ©
  [0x2116, 0x2116], // №
  [0x00b7, 0x00b7], // ·
];

export const FONT_UNICODE_RANGE_CSS =
  FONT_UNICODE_RANGES
    .map(([a, b]) => (a === b ? `U+${a.toString(16).toUpperCase()}` : `U+${a.toString(16).toUpperCase()}-${b.toString(16).toUpperCase()}`))
    .join(', ');

export const FONTS = [
  { family: 'Cormorant Garamond', pkg: '@fontsource/cormorant-garamond', slug: 'cormorant-garamond', weights: [400, 600] },
  { family: 'Manrope',            pkg: '@fontsource/manrope',            slug: 'manrope',            weights: [400, 500] },
];

export const bytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};
