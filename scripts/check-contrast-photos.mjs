/**
 * Контраст на БОЕВЫХ кадрах (§9, пункт 5 ТЗ).
 *
 * check-scrim.mjs проверяет сам профиль затемнения на четырёх подставных
 * яркостях. Здесь берём настоящие кадры и меряем их относительную яркость
 * ровно в том прямоугольнике, где стоит подпись, — и уже по ней считаем
 * контраст кремового заголовка, абзаца и латунной факт-строки.
 *
 * Худшая точка — не средняя яркость, а светлое пятно под подписью: свеча,
 * попавшая в угол, роняет контраст сильнее, чем поднимает его тёмный фон.
 * Поэтому считаем и среднее, и 95-й процентиль.
 */
import sharp from 'sharp';
import path from 'node:path';
import { ORIGINALS } from './config.mjs';
import { SCRIM, measure } from './check-scrim.mjs';
import { layers } from '../src/content.js';

const CREAM = '#F2ECE1';   // заголовок главы
const CREAM70 = 0.70;      // абзац: тот же кремовый на 70 % прозрачности
const FLAME = '#F0C070';   // факт-строка (.layer__fact — color: var(--flame))
const VOID_LUM = 0.0025;

/** Прямоугольник подписи в долях кадра, y — от НИЗА (как в check-scrim). */
const CAPTION = { x0: 0.04, x1: 0.52, y0: 0.05, y1: 0.42 };
/** Поле над текстовой зоной: всё выше 0,45 по высоте от низа. */
const FIELD_ABOVE = 0.45;

const srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const relLum = (r, g, b) =>
  0.2126 * srgbToLin(r / 255) + 0.7152 * srgbToLin(g / 255) + 0.0722 * srgbToLin(b / 255);

const hexLum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return relLum((n >> 16) & 255, (n >> 8) & 255, n & 255);
};

const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Яркость кадра под затемнением плотности d. */
const behind = (photoLum, d) => photoLum * (1 - d) + VOID_LUM * d;

/** Пиксели прямоугольника: возвращает массив относительных яркостей. */
async function lumsIn(file, rect) {
  const img = sharp(file).toColourspace('srgb');
  const { width, height } = await img.metadata();
  // y в rect отсчитывается от низа — переводим в координаты сверху вниз.
  const top = Math.round(height * (1 - rect.y1));
  const bottom = Math.round(height * (1 - rect.y0));
  const left = Math.round(width * rect.x0);
  const right = Math.round(width * rect.x1);
  const { data, info } = await img
    .extract({ left, top, width: right - left, height: bottom - top })
    .resize(160, null, { fit: 'inside' })
    .raw().toBuffer({ resolveWithObject: true });
  const out = [];
  for (let i = 0; i < data.length; i += info.channels) out.push(relLum(data[i], data[i + 1], data[i + 2]));
  return out;
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p))];

const creamLum = hexLum(CREAM);
const flameLum = hexLum(FLAME);

/** Абзац — кремовый на 70 %: цвет смешивается с тем, что под ним. */
const bodyLumOver = (backLum) => {
  const c = hexLum(CREAM);
  return c * CREAM70 + backLum * (1 - CREAM70);
};

const bright = measure(SCRIM, true);
const normal = measure(SCRIM, false);

console.log('\nКонтраст на боевых кадрах');
console.log('  профиль затемнения: поле над фото — обычный', normal.fieldMean.toFixed(3),
            '/ светлый', bright.fieldMean.toFixed(3), '(потолок 0,400)');
console.log('  плотность в худшей точке подписи: обычный', normal.capMin.toFixed(3),
            '/ светлый', bright.capMin.toFixed(3));
console.log();

const rows = [];
const problems = [];

for (const layer of layers) {
  const file = path.join(ORIGINALS, 'photo', layer.photo + '.jpg');
  const m = layer.bright ? bright : normal;
  let caption, field;
  try {
    caption = (await lumsIn(file, CAPTION)).sort((a, b) => a - b);
    field = (await lumsIn(file, { x0: 0, x1: 1, y0: FIELD_ABOVE, y1: 1 })).sort((a, b) => a - b);
  } catch { continue; }

  const capMean = caption.reduce((s, v) => s + v, 0) / caption.length;
  const capP95 = pct(caption, 0.95);

  // Худшая точка: самая светлая часть кадра под самым слабым затемнением.
  const worst = behind(capP95, m.capMin);
  const mean = behind(capMean, m.capMin);

  const cCream = ratio(creamLum, worst);          // заголовок
  const cBody = ratio(bodyLumOver(worst), worst);  // абзац, cream-70
  const cFlame = ratio(flameLum, worst);           // факт-строка, пламя

  // Свечи. Затемнение — равномерное умножение, поэтому «гаснут» они не по
  // абсолютному уровню, а если блик перестаёт отрываться от фона. Меряем
  // отрыв: во сколько раз ярчайшие блики поля светлее его медианы ПОСЛЕ
  // затемнения. Меньше 3 — пламя слилось с залом.
  const fMed = pct(field, 0.5), fTop = pct(field, 0.999);
  const glow = (behind(fTop, m.fieldMean) + 0.05) / (behind(fMed, m.fieldMean) + 0.05);

  rows.push({
    кадр: layer.photo,
    пресет: layer.bright ? 'светлый' : 'обычный',
    'яркость подписи ср.': capMean.toFixed(3),
    'она же p95': capP95.toFixed(3),
    'заголовок': cCream.toFixed(2) + ':1',
    'абзац': cBody.toFixed(2) + ':1',
    'факт-строка': cFlame.toFixed(2) + ':1',
    'поле': m.fieldMean.toFixed(3),
    'отрыв бликов': glow.toFixed(1) + '×',
  });

  if (cCream < 4.5) problems.push(`${layer.photo}: заголовок ${cCream.toFixed(2)} : 1 < 4,5 : 1 (p95)`);
  if (cBody < 4.5) problems.push(`${layer.photo}: абзац ${cBody.toFixed(2)} : 1 < 4,5 : 1 (p95)`);
  if (cFlame < 4.5) problems.push(`${layer.photo}: факт-строка ${cFlame.toFixed(2)} : 1 < 4,5 : 1 (p95)`);
  if (m.fieldMean > 0.40) problems.push(`${layer.photo}: поле ${m.fieldMean.toFixed(3)} > 0,400`);
  if (glow < 3) problems.push(`${layer.photo}: свечи погасли, отрыв бликов ${glow.toFixed(1)}× < 3×`);
}

console.table(rows);

const brightRows = rows.filter((r) => r.пресет === 'светлый');
console.log(`светлых кадров: ${brightRows.length} (ожидается 6)`);

if (problems.length) {
  console.error('\nНе сходится:');
  problems.forEach((p) => console.error('  ', p));
  process.exit(1);
}
console.log('\n   сходится\n');
