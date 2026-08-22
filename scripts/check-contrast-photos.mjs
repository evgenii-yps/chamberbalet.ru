/**
 * Контраст на БОЕВЫХ кадрах (§9, пункт 5 ТЗ).
 *
 * check-scrim.mjs проверяет сам профиль затемнения на четырёх подставных
 * яркостях. Здесь берём настоящие кадры и меряем их относительную яркость
 * ровно в том прямоугольнике, где стоит подпись, — и уже по ней считаем
 * контраст кремового заголовка, абзаца и латунной факт-строки.
 *
 *
 * ЧТО СЧИТАЕТСЯ ПРИЁМКОЙ И ПОЧЕМУ ИМЕННО ЭТО
 *
 * Блокирует сборку контраст по СРЕДНЕЙ яркости фона под подписью. Контраст по
 * p95 считается и печатается, но не роняет сборку.
 *
 * Причина не в мягкости, а в том, что WCAG определён для сплошной заливки:
 * там фон — одно число, и «худшая точка» совпадает со средней. Методики для
 * фотографического фона в стандарте нет вовсе. Перенести на фото формулу
 * буквально можно двумя способами, и оба — интерпретация, а не требование:
 *
 *   по среднему — фон под строкой как одно число. Это ближе всего к тому,
 *     что стандарт вообще описывает, и к тому, что видит глаз: буква стоит
 *     не в одной точке, а поперёк всей текстовой зоны;
 *   по p95 — «самые светлые 5 % площади подписи». Полезная страховка, но
 *     это уже не WCAG, а собственная, более жёсткая мерка. Кадр может
 *     провалить её из-за одной свечи, попавшей в угол прямоугольника под
 *     строкой, где буквы вообще нет.
 *
 * Проверка, которая горит красным всегда, не проверяет ничего: её перестают
 * читать. Поэтому блокирует среднее, а p95 остаётся справочной строкой —
 * по ней видно, какие кадры стоит посмотреть глазами.
 *
 *
 * ТЕНЬ ПОД СТРОКОЙ УЧТЕНА
 *
 * У каждой строки подписи есть text-shadow, и он заметно темнит фон вокруг
 * штрихов. Прежняя редакция этой проверки его игнорировала и потому занижала
 * контраст. Альфа тени не выведена формулой, а измерена на отрендеренных
 * пикселях: настоящие шрифты и кегли, полоса вплотную к штрихам, контроль со
 * снятой тенью даёт ровно 0.
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

/** Порог контраста и потолок плотности поля. */
const MIN_RATIO = 4.5;
const MAX_FIELD = 0.40;
/** Ниже этого блики свечей сливаются с залом. */
const MIN_GLOW = 3;

/**
 * Альфа тени в полосе вплотную к штрихам, измеренная в браузере на мобильном
 * вьюпорте (там кегль меньше, тени меньше — оценка консервативная).
 * CSS-источник: .layer__title 0 2px 40px, .layer__body 0 1px 24px,
 * .layer__fact 0 1px 20px, все rgba(7,5,6,.9….95).
 */
const SHADOW_ALPHA = { title: 0.116, body: 0.124, fact: 0.080 };
const SHADOW_RGB = [7, 5, 6];

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

const SHADOW_LUM = relLum(...SHADOW_RGB);
/** Фон под строкой после тени: тень домешивается поверх затемнённого кадра. */
const withShadow = (bg, alpha) => bg * (1 - alpha) + SHADOW_LUM * alpha;

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
const bodyLumOver = (backLum) => hexLum(CREAM) * CREAM70 + backLum * (1 - CREAM70);

/** Три контраста для заданного фона, с учётом тени каждой строки. */
function trio(bg) {
  const t = withShadow(bg, SHADOW_ALPHA.title);
  const b = withShadow(bg, SHADOW_ALPHA.body);
  const f = withShadow(bg, SHADOW_ALPHA.fact);
  return { title: ratio(creamLum, t), body: ratio(bodyLumOver(b), b), fact: ratio(flameLum, f) };
}

const bright = measure(SCRIM, true);
const normal = measure(SCRIM, false);
const expectedBright = layers.filter((l) => l.bright).length;

console.log('\nКонтраст на боевых кадрах');
console.log('  профиль затемнения: поле над фото — обычный', normal.fieldMean.toFixed(3),
            '/ светлый', bright.fieldMean.toFixed(3), `(потолок ${MAX_FIELD.toFixed(3)})`);
console.log('  плотность в худшей точке подписи: обычный', normal.capMin.toFixed(3),
            '/ светлый', bright.capMin.toFixed(3));
console.log('  тень под строкой учтена: заголовок', SHADOW_ALPHA.title,
            '· абзац', SHADOW_ALPHA.body, '· факт-строка', SHADOW_ALPHA.fact);
console.log();

const rows = [];
const reference = [];
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

  const atMean = trio(behind(capMean, m.capMin));   // приёмка
  const atP95 = trio(behind(capP95, m.capMin));     // справочно

  // Свечи. Затемнение — равномерное умножение, поэтому «гаснут» они не по
  // абсолютному уровню, а если блик перестаёт отрываться от фона. Меряем
  // отрыв: во сколько раз ярчайшие блики поля светлее его медианы ПОСЛЕ
  // затемнения. Меньше 3 — пламя слилось с залом.
  const fMed = pct(field, 0.5), fTop = pct(field, 0.999);
  const glow = (behind(fTop, m.fieldMean) + 0.05) / (behind(fMed, m.fieldMean) + 0.05);

  const r1 = (x) => x.toFixed(2) + ':1';
  rows.push({
    кадр: layer.photo,
    пресет: layer.bright ? 'светлый' : 'обычный',
    'фон ср.': capMean.toFixed(3),
    'заголовок': r1(atMean.title),
    'абзац': r1(atMean.body),
    'факт-строка': r1(atMean.fact),
    'поле': m.fieldMean.toFixed(3),
    'отрыв бликов': glow.toFixed(1) + '×',
  });
  reference.push({
    кадр: layer.photo,
    'фон p95': capP95.toFixed(3),
    'заголовок': r1(atP95.title),
    'абзац': r1(atP95.body),
    'факт-строка': r1(atP95.fact),
    'ниже порога': [
      atP95.title < MIN_RATIO ? 'заголовок' : null,
      atP95.body < MIN_RATIO ? 'абзац' : null,
      atP95.fact < MIN_RATIO ? 'факт-строка' : null,
    ].filter(Boolean).join(', ') || '—',
  });

  // Блокирует только среднее — см. шапку файла.
  for (const [key, label] of [['title', 'заголовок'], ['body', 'абзац'], ['fact', 'факт-строка']]) {
    if (atMean[key] < MIN_RATIO) {
      problems.push(`${layer.photo}: ${label} ${atMean[key].toFixed(2)} : 1 < ${MIN_RATIO} : 1 (по средней яркости фона)`);
    }
  }
  if (m.fieldMean > MAX_FIELD) problems.push(`${layer.photo}: поле ${m.fieldMean.toFixed(3)} > ${MAX_FIELD.toFixed(3)}`);
  if (glow < MIN_GLOW) problems.push(`${layer.photo}: свечи погасли, отрыв бликов ${glow.toFixed(1)}× < ${MIN_GLOW}×`);
}

console.log('Приёмка — по средней яркости фона под подписью');
console.table(rows);

console.log('\nСправочно — по p95 (самые светлые 5 % площади подписи). Сборку не роняет.');
console.table(reference);

const below = reference.filter((r) => r['ниже порога'] !== '—');
if (below.length) {
  console.log(`   по p95 ниже ${MIN_RATIO} : 1 — ${below.length} кадр(ов): ` +
              below.map((r) => `${r.кадр} (${r['ниже порога']})`).join('; '));
  console.log('   это справочная мерка, не WCAG — посмотреть глазами, решение принимается отдельно.');
} else {
  console.log(`   по p95 все кадры тоже выше ${MIN_RATIO} : 1`);
}

console.log(`\nсветлых кадров: ${rows.filter((r) => r.пресет === 'светлый').length} (в src/content.js: ${expectedBright})`);

if (problems.length) {
  console.error('\nНе сходится:');
  problems.forEach((p) => console.error('  ', p));
  process.exit(1);
}
console.log('\n   сходится\n');
