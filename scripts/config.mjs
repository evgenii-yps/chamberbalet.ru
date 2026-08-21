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

/** Шесть проходных кадров: их видно только в движении, между главами.
 *  Крупный вариант на них не отрабатывает вес, поэтому 2560 у них отключён.
 *  Остальные восемь — экраны, на которых кадр стоит и его разглядывают. */
export const PASSTHROUGH_PHOTOS = new Set([
  '02-hall-wide', '06-duet-candles', '08-sugarplum-costume',
  '09-costume-close', '11-snow-scene', '12-stage-top',
]);

export const PHOTO_WIDTHS_PASSTHROUGH = [640, 1280, 1920];

/** Отключение 2560 у проходных кадров — СРЕДСТВО ПРОТИВ ПЕРЕРАСХОДА, а не
 *  умолчание. Пока строка 1 бюджета сходится, лесенка у всех полная: резать
 *  качество без нужды незачем. Если `npm run images` сообщит о перерасходе —
 *  включить и пересобрать:
 *
 *      TRIM_PASSTHROUGH=1 npm run images
 *
 *  Отчёт печатает, сколько это даст, даже когда отключение выключено. */
export const TRIM_PASSTHROUGH = process.env.TRIM_PASSTHROUGH === '1';

export const widthsFor = (basename) =>
  (TRIM_PASSTHROUGH && PASSTHROUGH_PHOTOS.has(basename)
    ? PHOTO_WIDTHS_PASSTHROUGH
    : PHOTO_WIDTHS);

export const PHOTO_FORMATS = [
  { ext: 'avif', mime: 'image/avif', options: { quality: 50, effort: 6 } },
  { ext: 'webp', mime: 'image/webp', options: { quality: 78, effort: 5 } },
  { ext: 'jpg',  mime: 'image/jpeg', options: { quality: 82, progressive: true, mozjpeg: true } },
];

/** Ниже этого по длинной стороне — печатаем предупреждение. */
export const MIN_ORIGINAL_LONG_SIDE = 2000;

/** Бюджеты веса, байты.
 *
 *  §4.5 задавал потолок страницы 6 МБ, §5.2 разрешал видео до 4 МБ. Вместе с
 *  четырнадцатью полноэкранными кадрами это не сходилось: одна строка не может
 *  одновременно вмещать и не вмещать видео. Разведено на две независимые
 *  строки, обе печатаются:
 *
 *    page  — изображения + шрифты + код (CSS, JS, HTML). Видео не входит.
 *    video — отдельной строкой, свой потолок.
 *
 *  Потолок 6 МБ не поднимается молча: при перерасходе сначала отключается
 *  вариант 2560 у проходных кадров (см. PASSTHROUGH_PHOTOS). */
export const BUDGET = {
  firstScreen: 1.2 * 1024 * 1024,
  page: 6 * 1024 * 1024,
  video: 4 * 1024 * 1024,
};

/** Пока полной сборки не было, вес шрифтов и кода берём отсюда. build.mjs
 *  пишет измеренное значение в .build/weights.json и дальше считаем по нему. */
export const CODE_FONTS_FALLBACK = 220 * 1024;

/** Сколько кадров держит экран загрузки и что считаем «первым экраном». */
export const FIRST_SCREEN_SLIDES = 3;

/** Ширина, по которой считаем бюджет: типовой десктоп. */
export const BUDGET_WIDTH = 1920;

/** sizes = min(160vw, 2560px). На FullHD это 160 % от 1920 = 3072 px, обрезано
 *  потолком до 2560 — то есть браузер просит 2560 и берёт САМЫЙ тяжёлый
 *  вариант кадра, а не тот, что равен ширине экрана. Бюджет обязан считаться
 *  по этой цифре, иначе он занижен примерно вдвое. */
export const SIZES_VW_FACTOR = 1.6;
export const SIZES_CAP = 2560;
export const requestWidthAt = (screenWidth) =>
  Math.min(Math.round(screenWidth * SIZES_VW_FACTOR), SIZES_CAP);

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
