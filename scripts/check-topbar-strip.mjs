/**
 * Верхняя полоса кадра под шапкой.
 *
 * Зачем отдельная проверка. Флаг `bright` отвечает на другой вопрос: он
 * калиброван по зоне ПОДПИСИ внизу кадра, там же, где меряет
 * check-contrast-photos.mjs. Верх кадра никто не мерил, пока в шапке стоял
 * мелкий полупрозрачный текст. С крупным названием посередине шапки верхняя
 * полоса стала самостоятельной текстовой зоной, и у неё должен быть свой
 * критерий — иначе светлый верх ловится только глазами и только случайно.
 *
 * Замер это подтвердил: по яркости верхней полосы флаг `bright` и реальная
 * светлота совпадают лишь на двух кадрах из восьми. Кадр «ряды кресел» —
 * самая светлая полоса из всех — флага `bright` не имеет вовсе.
 *
 * Что проверяется. Для каждого кадра берётся полоса высотой с шапку от
 * ВЕРХА фотографии, без затемнения. Если её p95 достигает порога, кадр
 * обязан нести `topScrim: true` — иначе сборка не проходит.
 *
 * Порог по p95, а не по средней — намеренно, и это отличается от
 * check-contrast-photos.mjs, где блокирует среднее. Причина в геометрии
 * зоны: подпись занимает большой прямоугольник, и одна свеча в его углу
 * среднего не портит. Полоса под шапкой узкая, название стоит поперёк неё
 * целиком, и светлое пятно шириной в пару букв бьёт по читаемости сразу —
 * ровно то, что случилось с кадром «ряды кресел», где среднее в норме, а
 * контраст по p95 падал до 2,69 : 1.
 */
import sharp from 'sharp';
import path from 'node:path';
import { ORIGINALS } from './config.mjs';
import { layers } from '../src/content.js';

/**
 * Опорное окно — мобильное: аудитория открывает ссылку с телефона.
 * BAR — высота шапки, замерена в браузере на этом окне.
 */
const VIEW = { w: 390, h: 844 };
const BAR = 78;

/**
 * Минимальный масштаб камеры на остановке. Кадр никогда не показывается
 * один к одному: даже стоя на месте, камера держит его увеличенным, и
 * видно меньше, чем есть в файле. Число подтверждает qa:demo — «кадр не
 * меньше экрана (минимум масштаба 1.150)».
 */
const ZOOM = 1.15;

/** p95 полосы, при котором кадр обязан нести подложку. */
const MAX_P95 = 0.25;

const srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const relLum = (r, g, b) =>
  0.2126 * srgbToLin(r / 255) + 0.7152 * srgbToLin(g / 255) + 0.0722 * srgbToLin(b / 255);
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p))];

/**
 * Прямоугольник фотографии, попадающий под шапку.
 *
 * Мерить верхнюю полосу самого файла нельзя, и это не теория: object-fit
 * cover на мобильном окне показывает лишь центральную треть ширины кадра, а
 * камера сверху ещё и увеличивает. У «13-soloist-ready» верх файла даёт p95
 * 0,76, а то, что реально под шапкой, — 0,21: разница втрое, и она решает,
 * нужна кадру подложка или нет.
 *
 * Поэтому геометрия воспроизводится целиком: cover, центрирование по обеим
 * осям (object-position у этих кадров умолчательный) и масштаб камеры.
 */
function stripRect(w, h) {
  const s = Math.max(VIEW.w / w, VIEW.h / h);          // cover
  const ox = (VIEW.w - w * s) / 2;
  const oy = (VIEW.h - h * s) / 2;
  // Точка экрана -> точка до трансформа камеры (масштаб от центра элемента).
  const pre = (v, size) => (v - size / 2) / ZOOM + size / 2;
  const toPhoto = (x, y) => ({ x: (pre(x, VIEW.w) - ox) / s, y: (pre(y, VIEW.h) - oy) / s });
  const a = toPhoto(0, 0);
  const b = toPhoto(VIEW.w, BAR);
  const left = Math.max(0, Math.round(a.x));
  const top = Math.max(0, Math.round(a.y));
  const right = Math.min(w, Math.round(b.x));
  const bottom = Math.min(h, Math.round(b.y));
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

/** Яркости пикселей полосы под шапкой. */
async function stripLums(file) {
  const img = sharp(file).toColourspace('srgb');
  const { width, height } = await img.metadata();
  const rect = stripRect(width, height);
  const { data, info } = await img
    .extract(rect)
    .resize(320, null, { fit: 'inside' })
    .raw().toBuffer({ resolveWithObject: true });
  const out = [];
  for (let i = 0; i < data.length; i += info.channels) out.push(relLum(data[i], data[i + 1], data[i + 2]));
  return { lums: out.sort((a, b) => a - b), rect };
}

console.log('\nВерхняя полоса под шапкой');
console.log(`  окно ${VIEW.w}x${VIEW.h}, шапка ${BAR} px, масштаб камеры ${ZOOM} — без затемнения`);
console.log(`  порог: p95 ≥ ${MAX_P95} — кадр обязан нести topScrim\n`);

const rows = [];
const missing = [];
const spare = [];

for (const layer of layers) {
  const file = path.join(ORIGINALS, 'photo', layer.photo + '.jpg');
  let lums;
  try { ({ lums } = await stripLums(file)); } catch { continue; }
  const mean = lums.reduce((s, v) => s + v, 0) / lums.length;
  const p95 = pct(lums, 0.95);
  const needs = p95 >= MAX_P95;
  const has = !!layer.topScrim;
  if (needs && !has) missing.push(layer.photo);
  if (!needs && has) spare.push(layer.photo);
  rows.push({
    кадр: layer.photo,
    средняя: mean.toFixed(4),
    p95: p95.toFixed(4),
    'нужна подложка': needs ? 'да' : '—',
    topScrim: has ? 'стоит' : '—',
    вердикт: needs && !has ? '× НЕТ ФЛАГА' : needs ? 'сходится' : has ? 'флаг без нужды' : 'сходится',
  });
}

console.table(rows);

if (!rows.length) {
  console.log('   оригиналов нет — проверять нечего\n');
  process.exit(0);
}

const above = rows.filter((r) => r['нужна подложка'] === 'да');
console.log(`   выше порога: ${above.length} кадр(ов)${above.length ? ' — ' + above.map((r) => r.кадр).join(', ') : ''}`);
for (const p of spare) console.log(`   внимание: у ${p} стоит topScrim, хотя полоса ниже порога — лишняя подложка`);

if (missing.length) {
  console.log(`\n   × выше порога и без topScrim: ${missing.join(', ')}`);
  console.log('   поставьте topScrim: true в src/content.js\n');
  process.exit(1);
}
console.log('\n   сходится\n');
