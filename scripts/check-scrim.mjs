/**
 * Проверка затемнения и контраста. Считаем числом, а не глазом (§9 спецификации).
 *
 * Затемнение — три слоя, ровно как в flight.css:
 *   база      — ровное поле на всю площадь кадра;
 *   текст     — усиление в текстовой зоне: плато под подписью и плавный сход
 *               вверх, поэтому границы не видно;
 *   виньетка  — к углам.
 *
 * Потолок «общей плотности 40 %» относим к полю, лежащему поверх самой
 * фотографии (база + виньетка): именно оно гасит свечи. Усиление в текстовой
 * зоне спецификация задаёт отдельным числом (70–75 %) и в потолок не
 * включает — иначе три числа несовместимы: база 34 % и виньетка 25 % сами по
 * себе дают среднюю плотность около 39 %, и на текст не остаётся ничего.
 *
 * Светлые кадры (зал со свечной дугой, розовая пачка крупным планом) метятся
 * в content.js как scrim: 'strong'. Усиление добавляется ТОЛЬКО в текстовой
 * зоне: ровное поле над фотографией остаётся прежним, свечи не гаснут.
 */

export const SCRIM = {
  base:       0.34,   // ровное поле
  textMax:    0.50,   // плато усиления под подписью
  textPlateau:0.38,   // докуда снизу держится плато, доля высоты
  textFade:   0.64,   // где усиление сходит в ноль
  strongExtra:0.34,   // добавка для светлых кадров, только в текстовой зоне
  vignette:   0.25,   // в углах
  vignetteR:  0.60,   // радиус, внутри которого виньетки нет
};

const CEILING_FLAT = 0.40;
const TEXT_PEAK = [0.70, 0.755];
/** Прямоугольник, который реально занимает подпись (с полями). */
const CAPTION = { x0: 0.05, x1: 0.50, y0: 0.07, y1: 0.38 };

const smoothstep = (t) => t * t * (3 - 2 * t);

export const textLayer = (P, strong) => (x, y) => {
  const max = strong ? 1 - (1 - P.textMax) * (1 - P.strongExtra) : P.textMax;
  if (y <= P.textPlateau) return max;
  if (y >= P.textFade) return 0;
  return max * (1 - smoothstep((y - P.textPlateau) / (P.textFade - P.textPlateau)));
};

export const vignetteLayer = (P) => (x, y) => {
  const r = Math.hypot((x - 0.5) / 0.60, (y - 0.55) / 0.50);
  if (r <= P.vignetteR) return 0;
  return P.vignette * Math.min((r - P.vignetteR) / (1 - P.vignetteR), 1) ** 2;
};

export function measure(P = SCRIM, strong = false) {
  const text = textLayer(P, strong), vign = vignetteLayer(P);
  const flat = (x, y) => 1 - (1 - P.base) * (1 - vign(x, y));
  const full = (x, y) => 1 - (1 - flat(x, y)) * (1 - text(x, y));

  const N = 320;
  let flatSum = 0, fullSum = 0, n = 0, peak = 0, capMin = 1, capSum = 0, capN = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = (i + 0.5) / N, y = (j + 0.5) / N, f = full(x, y);
    flatSum += flat(x, y); fullSum += f; n++;
    if (f > peak) peak = f;
    if (x >= CAPTION.x0 && x <= CAPTION.x1 && y >= CAPTION.y0 && y <= CAPTION.y1) {
      capSum += f; capN++; if (f < capMin) capMin = f;
    }
  }
  return { flatMean: flatSum / n, fullMean: fullSum / n, peak,
           capMean: capSum / capN, capMin, centre: full(0.5, 0.55), corner: full(0.99, 0.99) };
}

/** Контраст кремового текста поверх кадра с относительной яркостью photo. */
export function contrast(photoLuminance, density) {
  const cream = 0.8085;       // #F2ECE1
  const voidLum = 0.0025;     // #070506
  const mixed = photoLuminance * (1 - density) + voidLum * density;
  return (cream + 0.05) / (mixed + 0.05);
}

const FRAMES = [
  ['тёмный кадр (свечи в темноте)', 0.05, false],
  ['средний кадр', 0.22, false],
  ['светлый: зал со свечной дугой', 0.45, true],
  ['очень светлый: розовая пачка крупным планом', 0.62, true],
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const base = measure(SCRIM, false);
  const strong = measure(SCRIM, true);
  const problems = [];
  const row = (k, v, note = '') => console.log('  ', k.padEnd(32), v.toFixed(3), note);

  console.log('\nЗатемнение — базовый пресет');
  row('база + виньетка, среднее', base.flatMean, `потолок ${CEILING_FLAT.toFixed(2)} — здесь свечи`);
  row('всё поле, среднее', base.fullMean);
  row('пик', base.peak, `нужно ${TEXT_PEAK[0]}–${TEXT_PEAK[1]}`);
  row('под подписью, среднее', base.capMean);
  row('под подписью, минимум', base.capMin);
  row('центр кадра', base.centre);
  row('угол', base.corner);

  console.log('\nУсиленный пресет для светлых кадров');
  row('база + виньетка, среднее', strong.flatMean, 'поле не тронуто');
  row('под подписью, минимум', strong.capMin);

  if (base.flatMean > CEILING_FLAT) problems.push(`плотность поля ${base.flatMean.toFixed(3)} > ${CEILING_FLAT}`);
  if (strong.flatMean > CEILING_FLAT) problems.push(`усиленный пресет поднял поле до ${strong.flatMean.toFixed(3)}`);
  if (base.peak < TEXT_PEAK[0] || base.peak > TEXT_PEAK[1]) problems.push(`пик ${base.peak.toFixed(3)} вне ${TEXT_PEAK.join('–')}`);

  console.log('\nКонтраст кремового текста в худшей точке подписи');
  for (const [name, lum, isStrong] of FRAMES) {
    const m = isStrong ? strong : base;
    const c = contrast(lum, m.capMin);
    console.log('  ', name.padEnd(44), `${c.toFixed(2)} : 1`, isStrong ? '(усиленный)' : '');
    if (c < 4.5) problems.push(`контраст ${c.toFixed(2)} : 1 на кадре «${name}»`);
  }

  if (problems.length) {
    console.error('\nНе сходится:');
    problems.forEach((p) => console.error('  ', p));
    process.exit(1);
  }
  console.log('\n   сходится\n');
}
