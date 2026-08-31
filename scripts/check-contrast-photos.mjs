/**
 * Контраст на БОЕВЫХ кадрах (§9, пункт 5 ТЗ).
 *
 * check-scrim.mjs проверяет сам профиль затемнения на подставных яркостях.
 * Здесь берутся настоящие кадры и меряется их яркость ровно там, где стоят
 * строки подписи, — и уже по ней считается контраст.
 *
 *
 * ГОНЯТЬ ЦЕЛИКОМ, А НЕ ВЫБОРОЧНО
 *
 * Любая правка, которая трогает
 *
 *   константы SCRIM в check-scrim.mjs,
 *   покадровые scrimText в src/content.js,
 *   состав кадров (добавили, убрали, заменили фотографию),
 *   геометрию подписи (кегли, поля, отступы, прямоугольники BOXES ниже),
 *
 * требует ПОЛНОГО прогона: восемь кадров на четыре строки в четырёх окнах,
 * все 128 клеток. Проверять «те кадры, которых правка касалась» нельзя.
 *
 * Причина в запасе. Худшая клетка живёт на 4,60 : 1 при пороге 4,50 —
 * десятая доли. Плотность затемнения общая, и снятая с одного кадра десятая
 * уезжает во все восемь; кегль и поля подписи тоже общие, и сдвиг строки на
 * несколько пикселей меняет, какой пиксель фотографии под ней окажется самым
 * светлым. Кадр, который не правили, проваливается ровно так же, как тот,
 * который правили, — и заметить это можно только полным прогоном.
 *
 *
 * ЧТО ИЗМЕНИЛОСЬ И ПОЧЕМУ
 *
 * Прежняя редакция мерила по СРЕДНЕЙ яркости прямоугольника подписи, брала
 * яркость прямо из файла оригинала и добавляла к фону собственную тень
 * строки. Все три допущения завышали результат, и вместе они завышали его
 * втрое: гейт показывал 12–15 : 1 там, где браузер на готовом кадре давал
 * 3,0–3,9 : 1. Проверка, которая всегда зелёная, ничего не проверяет.
 *
 * Теперь:
 *
 *   ПО САМОМУ СВЕТЛОМУ ПИКСЕЛЮ, а не по средней. Буква стоит в конкретной
 *     точке, и провал контраста случается там, где под ней блик свечи, а не
 *     там, где среднее по прямоугольнику. Это строже WCAG, но WCAG и не
 *     описывает фотографический фон вовсе — он определён для сплошной
 *     заливки, где худшая точка совпадает со средней.
 *
 *   В ГЕОМЕТРИИ ПОКАЗА, а не по долям файла. Все восемь оригиналов
 *     горизонтальные, слой полноэкранный, object-fit: cover, у слоя своё
 *     кадрирование, а камера пролёта держит кадр увеличенным даже на
 *     остановке. Доля файла и доля экрана — разные прямоугольники: у
 *     13-soloist-ready верх файла и то, что реально под шапкой, расходились
 *     втрое (см. check-topbar-strip.mjs, там та же арифметика).
 *
 *   БЕЗ ТЕНИ СТРОКИ В ФОНЕ. Тень принадлежит строке, а не подложке;
 *     засчитывать её в фон — значит мерить контраст буквы с её же тенью.
 *
 *   ЧЕТЫРЕ СТРОКИ, а не три: добавлена рубрика (.layer__kicker) брассом.
 *     Она и оказалась худшей строкой на всех кадрах — то есть единственная,
 *     которую прежняя редакция не мерила, была той, что не проходит.
 *
 * Покадровое переопределение плотности (scrimText в src/content.js) здесь
 * учитывается: гейт считает ровно ту плотность, которую соберёт CSS.
 */
import sharp from 'sharp';
import path from 'node:path';
import { ORIGINALS } from './config.mjs';
import { SCRIM, densityAt } from './check-scrim.mjs';
import { layers } from '../src/content.js';

/** Цвета строк — из src/css/flight.css. Альфа там, где цвет полупрозрачный. */
const LINES = [
  { key: 'kicker', label: 'рубрика',      hex: '#C9A063', alpha: 1    },  // var(--brass)
  { key: 'title',  label: 'заголовок',    hex: '#F2ECE1', alpha: 1    },  // var(--cream)
  { key: 'body',   label: 'подзаголовок', hex: '#F2ECE1', alpha: 0.70 },  // var(--cream-70)
  { key: 'fact',   label: 'метаданные',   hex: '#F0C070', alpha: 1    },  // var(--flame)
];

const MIN_RATIO = 4.5;

/**
 * Прямоугольники строк в долях ВЬЮПОРТА: x от левого края, y от НИЗА —
 * тот же отсчёт, что у профиля затемнения. Замерено в браузере на собранной
 * странице по всем восьми главам, взята объемлющая рамка: строки разной
 * длины, а порог должен держать самая широкая.
 *
 * Перемерять — .build/tools/caption-boxes.mjs (не входит в сборку).
 */
const BOXES = {
  390: {
    kicker: { x0: 0.0513, x1: 0.9077, y0: 0.3144, y1: 0.3660 },
    title:  { x0: 0.0513, x1: 0.9077, y0: 0.2182, y1: 0.3275 },
    body:   { x0: 0.0513, x1: 0.9077, y0: 0.1140, y1: 0.2290 },
    fact:   { x0: 0.0513, x1: 0.9077, y0: 0.0600, y1: 0.1190 },
  },
  768: {
    kicker: { x0: 0.0400, x1: 0.9000, y0: 0.2754, y1: 0.3410 },
    title:  { x0: 0.0400, x1: 0.9000, y0: 0.1741, y1: 0.3071 },
    body:   { x0: 0.0400, x1: 0.6068, y0: 0.1075, y1: 0.2038 },
    fact:   { x0: 0.0400, x1: 0.5104, y0: 0.0600, y1: 0.1120 },
  },
  1280: {
    kicker: { x0: 0.0400, x1: 0.6025, y0: 0.3773, y1: 0.4673 },
    title:  { x0: 0.0400, x1: 0.6025, y0: 0.2153, y1: 0.4201 },
    body:   { x0: 0.0400, x1: 0.3965, y0: 0.1260, y1: 0.2560 },
    fact:   { x0: 0.0400, x1: 0.3469, y0: 0.0600, y1: 0.1321 },
  },
  1920: {
    kicker: { x0: 0.0375, x1: 0.4125, y0: 0.2950, y1: 0.3617 },
    title:  { x0: 0.0375, x1: 0.4125, y0: 0.1750, y1: 0.3267 },
    body:   { x0: 0.0375, x1: 0.2751, y0: 0.1089, y1: 0.2052 },
    fact:   { x0: 0.0375, x1: 0.2421, y0: 0.0600, y1: 0.1134 },
  },
};

/** Окна замера. Мобильное первым: аудитория открывает ссылку с телефона. */
const VIEWS = [
  { w: 390,  h: 844  },
  { w: 768,  h: 1024 },
  { w: 1280, h: 800  },
  { w: 1920, h: 1080 },
];

/**
 * Масштаб камеры на остановке. Кадр никогда не показывается один к одному:
 * даже стоя на месте камера держит его увеличенным. Число то же, что в
 * check-topbar-strip.mjs, и подтверждается qa:demo.
 */
const ZOOM = 1.15;

const srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const relLum = (r, g, b) =>
  0.2126 * srgbToLin(r / 255) + 0.7152 * srgbToLin(g / 255) + 0.0722 * srgbToLin(b / 255);
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** object-position кадра в долях; по умолчанию центр. */
function cropOf(layer, narrow) {
  const c = layer.crop || {};
  const pick = (narrow && c.narrow?.position) || c.position || '50% 50%';
  const [px, py] = pick.split(/\s+/).map((v) => parseFloat(v) / 100);
  const scale = Number((narrow && c.narrow?.scale) || c.scale || 1);
  return { px, py, scale };
}

/** Раскладка кадра во вьюпорте: масштаб и смещение после cover, кадрирования
 *  слота и масштаба камеры. Одна формула на оба направления пересчёта. */
function placement(w, h, view, crop) {
  const s = Math.max(view.w / w, view.h / h) * crop.scale * ZOOM;
  return { s, ox: (view.w - w * s) * crop.px, oy: (view.h - h * s) * crop.py };
}

/**
 * Прямоугольник фотографии под заданным прямоугольником вьюпорта.
 *
 * Воспроизводится вся цепочка показа: object-fit: cover, object-position
 * кадра, собственное приближение слота (scale) и масштаб камеры. Иначе
 * меряется не то, что видит зритель: cover на мобильном окне показывает
 * лишь центральную треть ширины горизонтального кадра.
 */
function photoRect(w, h, view, box, crop) {
  const { s, ox, oy } = placement(w, h, view, crop);
  const toPhoto = (x, y) => ({ x: (x - ox) / s, y: (y - oy) / s });
  // y в box отсчитывается от низа — переводим в экранные координаты
  const a = toPhoto(box.x0 * view.w, (1 - box.y1) * view.h);
  const b = toPhoto(box.x1 * view.w, (1 - box.y0) * view.h);
  const left = Math.max(0, Math.round(a.x));
  const top = Math.max(0, Math.round(a.y));
  const right = Math.min(w, Math.round(b.x));
  const bottom = Math.min(h, Math.round(b.y));
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

const VOID = hexRgb('#070506');

/** Цвет пикселя фона после затемнения плотности d. */
const behind = (rgb, d) => rgb.map((c, i) => c * (1 - d) + VOID[i] * d);

/**
 * Самый светлый пиксель ПОСЛЕ затемнения.
 *
 * Считать раздельно — «самый светлый пиксель кадра» и «наименьшая плотность
 * над строкой» — нельзя: это два худших случая, которые не обязаны сойтись в
 * одной точке, и вместе они дают запас в никуда. Плотность берётся для
 * каждого пикселя по его собственному месту на экране, композит собирается
 * поточечно, максимум ищется уже по нему — ровно как это делает браузер.
 */
async function darkestBackdrop(file, meta, view, box, crop, textMax) {
  const rect = photoRect(meta.width, meta.height, view, box, crop);
  const { s, ox, oy } = placement(meta.width, meta.height, view, crop);
  const { data, info } = await sharp(file).toColourspace('srgb')
    .extract(rect).resize(240, null, { fit: 'inside' })
    .raw().toBuffer({ resolveWithObject: true });
  const kx = rect.width / info.width, ky = rect.height / info.height;
  let best = -1, rgb = [0, 0, 0];
  for (let j = 0; j < info.height; j++) {
    // пиксель картинки -> пиксель оригинала -> точка экрана -> доли вьюпорта
    const py = rect.top + (j + 0.5) * ky;
    const yFrac = 1 - (py * s + oy) / view.h;
    for (let i = 0; i < info.width; i++) {
      const px = rect.left + (i + 0.5) * kx;
      const xFrac = (px * s + ox) / view.w;
      const d = densityAt(SCRIM, xFrac, yFrac, textMax);
      const k = (j * info.width + i) * info.channels;
      const mixed = behind([data[k], data[k + 1], data[k + 2]], d);
      const L = relLum(...mixed);
      if (L > best) { best = L; rgb = mixed; }
    }
  }
  return { lum: best, rgb };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\nКонтраст на боевых кадрах');
  console.log('  метод: самый светлый пиксель под строкой, в геометрии показа,');
  console.log(`  без учёта собственной тени строки; порог ${MIN_RATIO} : 1`);

  const problems = [];
  for (const view of VIEWS) {
    const boxes = BOXES[view.w];
    const rows = [];
    for (const layer of layers) {
      const file = path.join(ORIGINALS, 'photo', layer.photo + '.jpg');
      let meta;
      try { meta = await sharp(file).metadata(); } catch { continue; }
      const crop = cropOf(layer, view.w <= 640);
      const row = {
        кадр: layer.photo,
        плотность: (layer.scrimText ?? (layer.bright ? SCRIM.brightMax : SCRIM.textMax)).toFixed(2)
          + (layer.scrimText ? ' (свой)' : layer.bright ? ' (светл.)' : ''),
      };
      const textMax = layer.scrimText ?? (layer.bright ? SCRIM.brightMax : SCRIM.textMax);
      for (const line of LINES) {
        const box = boxes[line.key];
        const spot = await darkestBackdrop(file, meta, view, box, crop, textMax);
        const fg = hexRgb(line.hex).map((c, i) => c * line.alpha + spot.rgb[i] * (1 - line.alpha));
        const c = ratio(relLum(...fg), spot.lum);
        row[line.label] = c.toFixed(2);
        if (c < MIN_RATIO) {
          problems.push(`${view.w}px, ${layer.photo}: ${line.label} ${c.toFixed(2)} : 1 < ${MIN_RATIO} : 1`);
        }
      }
      rows.push(row);
    }
    if (!rows.length) { console.log('\n   оригиналов нет — проверять нечего\n'); process.exit(0); }
    console.log(`\nОкно ${view.w} × ${view.h}`);
    console.table(rows);
  }

  if (problems.length) {
    console.error('\nНиже порога:');
    problems.forEach((p) => console.error('  ×', p));
    console.error('\n   поднимать не общее значение, а scrimText нужного кадра в src/content.js\n');
    process.exit(1);
  }
  console.log('\n   сходится\n');
}
