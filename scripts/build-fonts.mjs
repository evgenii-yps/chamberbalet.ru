/**
 * Шрифты: самохостинг, ноль внешних запросов.
 *
 * Два источника, в порядке предпочтения:
 *   1. media/originals/fonts/<Семейство>-<вес>.ttf|otf — настоящий субсеттинг
 *      через subset-font по диапазонам из config.mjs;
 *   2. пакеты @fontsource/* из devDependencies — там уже лежат готовые
 *      посемейственные субсеты, берём только cyrillic и latin.
 *
 * Cormorant Garamond подключаем ТОЛЬКО прямым начертанием: курсив
 * переопределяет кириллицу и портит текст.
 *
 * Если не нашлось ничего — печатаем заметку, отдаём пустой список,
 * страница живёт на системном стеке.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import subsetFont from 'subset-font';
import { ORIGINALS, BUILD, BUILD_ASSETS, ROOT, FONTS, FONT_UNICODE_RANGES, FONT_UNICODE_RANGE_CSS, bytes } from './config.mjs';

/** Кириллица и всё остальное разводятся по разным файлам: русской странице
 *  латинский субсет почти не нужен, и браузер его просто не скачает. */
const isCyrillic = ([a]) => a >= 0x0400 && a <= 0x04ff;
const GROUPS = {
  cyrillic: FONT_UNICODE_RANGES.filter(isCyrillic),
  latin: FONT_UNICODE_RANGES.filter((r) => !isCyrillic(r)),
};

const rangeCss = (ranges) => ranges
  .map(([a, b]) => (a === b ? `U+${a.toString(16).toUpperCase()}` : `U+${a.toString(16).toUpperCase()}-${b.toString(16).toUpperCase()}`))
  .join(', ');

const rangeText = (ranges) => ranges
  .flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i)))
  .join('');

const FONT_SRC = path.join(ORIGINALS, 'fonts');
const FONT_OUT = path.join(BUILD_ASSETS, 'fonts');
const MANIFEST_FILE = path.join(BUILD, 'fonts.json');

const log = (...a) => console.log('  ', ...a);
const hashOf = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);

/** Строка со всеми символами нужных диапазонов — вход для subset-font. */
const SUBSET_TEXT = rangeText(FONT_UNICODE_RANGES);

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

/** Оригинал в media/originals/fonts: CormorantGaramond-400.ttf, Manrope-500.otf и т. п. */
async function findOriginal(font, weight) {
  const stems = [
    `${font.family.replace(/\s+/g, '')}-${weight}`,
    `${font.slug}-${weight}`,
    `${font.family.replace(/\s+/g, '')}-${weight === 400 ? 'Regular' : weight === 500 ? 'Medium' : 'SemiBold'}`,
  ];
  for (const stem of stems) {
    for (const ext of ['.ttf', '.otf']) {
      const file = path.join(FONT_SRC, stem + ext);
      if (await exists(file)) return file;
    }
  }
  return null;
}

/** Готовые субсеты fontsource: только cyrillic и latin, только normal. */
async function findFontsource(font, weight) {
  const dir = path.join(ROOT, 'node_modules', font.pkg, 'files');
  if (!(await exists(dir))) return [];
  const wanted = ['cyrillic', 'latin'];
  const found = [];
  for (const subset of wanted) {
    const file = path.join(dir, `${font.slug}-${subset}-${weight}-normal.woff2`);
    if (await exists(file)) found.push({ subset, file });
  }
  return found;
}

async function emit(basename, data) {
  const file = `${basename}.${hashOf(data)}.woff2`;
  await fs.writeFile(path.join(FONT_OUT, file), data);
  return { file, size: data.length };
}

export async function buildFonts({ quiet = false } = {}) {
  await fs.mkdir(FONT_OUT, { recursive: true });
  await fs.mkdir(BUILD, { recursive: true });

  const faces = [];
  const notes = [];

  for (const font of FONTS) {
    for (const weight of font.weights) {
      const original = await findOriginal(font, weight);

      if (original) {
        const buffer = await fs.readFile(original);
        const subset = await subsetFont(buffer, SUBSET_TEXT, { targetFormat: 'woff2' });
        const out = await emit(`${font.slug}-${weight}`, subset);
        faces.push({ family: font.family, weight, style: 'normal', ...out,
                     range: FONT_UNICODE_RANGE_CSS, source: 'оригинал' });
        continue;
      }

      const packaged = await findFontsource(font, weight);
      if (!packaged.length) {
        notes.push(`${font.family} ${weight}: источник не найден`);
        continue;
      }
      for (const { subset, file } of packaged) {
        const buffer = await fs.readFile(file);
        // Пакетные субсеты всё равно шире нужного — прогоняем через subset-font.
        const data = await subsetFont(buffer, rangeText(GROUPS[subset]), { targetFormat: 'woff2' });
        const out = await emit(`${font.slug}-${subset}-${weight}`, data);
        faces.push({ family: font.family, weight, style: 'normal', ...out,
                     range: rangeCss(GROUPS[subset]), source: `fontsource/${subset}` });
      }
    }
  }

  const css = faces.map((f) => [
    '@font-face {',
    `  font-family: '${f.family}';`,
    `  src: url('../fonts/${f.file}') format('woff2');`,
    `  font-weight: ${f.weight};`,
    '  font-style: normal;',
    '  font-display: swap;',
    ...(f.range ? [`  unicode-range: ${f.range};`] : []),
    '}',
  ].join('\n')).join('\n\n');

  const manifest = { faces, css };
  await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

  if (!quiet) {
    console.log('\nШрифты');
    if (!faces.length) {
      log('шрифтов не найдено, собираю на системном стеке');
    } else {
      console.table(faces.map((f) => ({
        семейство: f.family, вес: f.weight, источник: f.source, файл: f.file, вес_файла: bytes(f.size),
      })));
      log(`итого ${bytes(faces.reduce((s, f) => s + f.size, 0))}`);
    }
    notes.forEach((n) => log('внимание:', n));
  }
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildFonts().catch((e) => { console.error(e.message); process.exit(1); });
}
