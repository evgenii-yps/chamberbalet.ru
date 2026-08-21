/**
 * Затемнение и контраст. Считаем числом, а не глазом (§9 спецификации).
 *
 * Затемнение перенесено из согласованного прототипа: это ОДИН экранный слой
 * поверх всей стопки, а не по слою на кадр. Так плотность постоянна и не
 * удваивается в середине перехода, когда видно два кадра сразу.
 *
 * Три составляющие:
 *   база       — ровное поле на всю площадь кадра;
 *   текст      — усиление к нижнему левому углу, где стоит подпись: плато под
 *                ней и сглаженный сход вверх, поэтому границы не видно;
 *   виньетка   — очень пологая, радиусы больше самого кадра (как в прототипе).
 *
 * Профиль текстовой зоны пришлось пересчитать. В прототипе это была одна
 * пологая диагональ `to top right`; замеры показали, что она не проходит две
 * цифры самой спецификации: поле над фотографией выходило на 0,429 (светлый
 * пресет — 0,502) при потолке 0,40, а контраст в верхней части подписи падал
 * до 3,16 : 1 на светлом кадре при норме 4,5 : 1. Диагональ не умеет
 * одновременно накрыть подпись и отпустить верх кадра: слева она тянется до
 * самого потолка. Здесь вертикальная составляющая ведущая, горизонтальный
 * уклон сохранён — впечатление «темнее к нижнему левому углу» то же.
 *
 * Потолок «общей плотности 40 %» относим к полю над текстовой зоной — именно
 * оно лежит поверх свечей. Усиление под подписью спецификация задаёт
 * отдельным числом (70–75 %) и в потолок не включает.
 */

export const SCRIM = {
  base:        0.34,   // ровное поле
  textMax:     0.52,   // плато под подписью
  textPlateau: 0.40,   // докуда снизу держится плато, доля высоты
  textFade:    0.66,   // где усиление сходит в ноль
  leanMax:     0.16,   // уклон к левому краю: подпись стоит слева
  leanTo:      0.55,   // докуда вправо тянется уклон
  // Светлый кадр: плато выше, но сход круче. Просто поднять плато нельзя —
  // вместе с ним поднимется и хвост, а он лежит уже поверх свечей.
  brightMax:   0.70,
  brightFade:  0.56,
  vignette:    { rx: 1.25, ry: 1.15, cx: 0.50, cy: 0.48, from: 0.54, to: 0.25 },
};

const CEILING_FIELD = 0.40;
const TEXT_PEAK = [0.70, 0.755];
/** Прямоугольник подписи: слева снизу, ширина min(720px, 90vw). Измерен в браузере. */
const CAPTION = { x0: 0.04, x1: 0.52, y0: 0.05, y1: 0.42 };
/** Всё, что выше текстовой зоны, — «поле над фотографией». */
const FIELD_ABOVE = 0.45;

const smoothstep = (t) => t * t * (3 - 2 * t);

/** Вертикальный профиль усиления: плато под подписью и сглаженный сход вверх. */
export function textProfile(P, y) {
  if (y <= P.textPlateau) return 1;
  if (y >= P.textFade) return 0;
  return 1 - smoothstep((y - P.textPlateau) / (P.textFade - P.textPlateau));
}

/** Горизонтальный уклон к левому краю. */
export function leanProfile(P, x) {
  const t = 1 - Math.min(x / P.leanTo, 1);
  return t * t;
}

function vignetteAt(P, x, y) {
  const v = P.vignette;
  const r = Math.hypot((x - v.cx) / v.rx, ((1 - y) - v.cy) / v.ry);
  if (r <= v.from) return 0;
  return v.to * Math.min((r - v.from) / (1 - v.from), 1);
}

export function measure(P = SCRIM, bright = false) {
  const textMax = bright ? P.brightMax : P.textMax;
  P = bright ? { ...P, textFade: P.brightFade } : P;

  // Ровное поле над фотографией: база и виньетка. Светлый пресет его НЕ трогает
  const field = (x, y) => 1 - (1 - P.base) * (1 - vignetteAt(P, x, y));
  const text = (x, y) => {
    const v = textProfile(P, y);
    return 1 - (1 - textMax * v) * (1 - P.leanMax * leanProfile(P, x) * v);
  };
  const full = (x, y) => 1 - (1 - field(x, y)) * (1 - text(x, y));

  const N = 320;
  let sum = 0, n = 0, peak = 0;
  let above = 0, aboveN = 0, aboveMax = 0;
  let cap = 0, capN = 0, capMin = 1;

  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = (i + 0.5) / N, y = (j + 0.5) / N, f = full(x, y);
    sum += f; n++;
    if (f > peak) peak = f;
    if (y > FIELD_ABOVE) { above += f; aboveN++; if (f > aboveMax) aboveMax = f; }
    if (x >= CAPTION.x0 && x <= CAPTION.x1 && y >= CAPTION.y0 && y <= CAPTION.y1) {
      cap += f; capN++; if (f < capMin) capMin = f;
    }
  }
  return {
    mean: sum / n, peak,
    fieldMean: above / aboveN, fieldMax: aboveMax,
    capMean: cap / capN, capMin,
    centre: full(0.5, 0.5), corner: full(0.99, 0.99),
  };
}

/** Контраст кремового текста поверх кадра с относительной яркостью photo. */
export function contrast(photoLuminance, density) {
  const cream = 0.8085;     // #F2ECE1
  const voidLum = 0.0025;   // #070506
  const mixed = photoLuminance * (1 - density) + voidLum * density;
  return (cream + 0.05) / (mixed + 0.05);
}

/** Тот же пресет в виде CSS. Стили собираются из этих чисел, а не набиваются руками. */
export function scrimCss(P = SCRIM) {
  const rgba = (a) => `rgb(7 5 6 / ${a.toFixed(3)})`;
  const v = P.vignette;
  const vign = `radial-gradient(${(v.rx * 100).toFixed(0)}% ${(v.ry * 100).toFixed(0)}% ` +
    `at ${(v.cx * 100).toFixed(0)}% ${(v.cy * 100).toFixed(0)}%, ` +
    `${rgba(0)} ${(v.from * 100).toFixed(0)}%, ${rgba(v.to)} 100%)`;

  // Вертикальный профиль раскладываем в стопы: пять точек дают неотличимый
  // от smoothstep сход, границы между тёмной и светлой частью не видно.
  const verticalFor = (fade) => {
    const span = fade - P.textPlateau;
    return 'linear-gradient(to top, ' + [
      'rgb(7 5 6 / calc(var(--scrim-text) * 1)) 0%',
      ...[0, 0.25, 0.5, 0.75, 1].map((k) => {
        const y = P.textPlateau + k * span;
        const a = textProfile({ ...P, textFade: fade }, y);
        return `rgb(7 5 6 / calc(var(--scrim-text) * ${a.toFixed(3)})) ${(y * 100).toFixed(1)}%`;
      }),
    ].join(', ') + ')';
  };
  const vertical = verticalFor(P.textFade);
  const lean = 'linear-gradient(to right, ' + [0, 0.25, 0.5, 0.75, 1].map((k) => {
    const x = k * P.leanTo;
    return `rgb(7 5 6 / calc(var(--scrim-lean) * ${leanProfile(P, x).toFixed(3)})) ${(x * 100).toFixed(1)}%`;
  }).join(', ') + `, ${rgba(0)} 100%)`;

  const stack = (fade) => [
    '    /* уклон к левому краю: подпись стоит слева */',
    '    ' + lean + ',',
    '    /* плато под подписью и сглаженный сход вверх */',
    '    ' + verticalFor(fade) + ',',
    '    /* очень пологая виньетка: радиусы больше кадра */',
    '    ' + vign + ',',
    '    /* база ровным полем */',
    '    ' + rgba(P.base) + ';',
  ];

  return [
    '/* Затемнение — отдельный слой поверх кадра, к самому кадру не привязан.',
    '   В пролёте он один на всю стопку: плотность не удваивается там, где',
    '   видно два кадра сразу. Числа держит scripts/check-scrim.mjs. */',
    '',
    '.flight__scrim, .opener__veil, .layer__photo::after {',
    `  --scrim-text: ${P.textMax.toFixed(2)};`,
    `  --scrim-lean: ${P.leanMax.toFixed(2)};`,
    '  background:',
    ...stack(P.textFade),
    '}',
    '',
    '/* Светлый кадр. Усиливаем ТОЛЬКО текстовую зону, а сход делаем круче:',
    '   ровное поле над фотографией остаётся прежним, свечи не гаснут. */',
    '.flight__scrim[data-bright], .opener__veil[data-bright], [data-bright] .layer__photo::after {',
    `  --scrim-text: ${P.brightMax.toFixed(2)};`,
    '  background:',
    ...stack(P.brightFade),
    '}',
    '',
    '/* В пролёте — один экранный слой на всю стопку. */',
    '.flight__scrim {',
    '  position: fixed;',
    '  inset: 0;',
    '  z-index: var(--z-scrim);',
    '  pointer-events: none;',
    '  opacity: 0;',
    '  transition: opacity .35s var(--flight-ease);',
    '}',
    '/* В пролёте плотность ведёт скрипт покадрово — переход только на выходе.',
    '   Пока виден первый экран со своей веалью, экранный слой держится',
    '   прозрачным: иначе затемнение складывалось бы вдвое. */',
    '.flight__scrim[data-on] { opacity: 1; transition: none; }',
    'html:not(.js) .flight__scrim { display: none; }',
    '',
    '/* Первый экран несёт своё затемнение: экранный слой в этот момент ещё',
    '   не включён, а заголовок уже стоит поверх фотографии. */',
    '.opener__veil { position: absolute; inset: 0; }',
    '',
    '/* Статическая раскладка: экранного слоя нет, поэтому затемнение уходит',
    '   в сам кадр — иначе подпись легла бы на неприкрытую фотографию. */',
    '.layer__photo::after { content: \'\'; position: absolute; inset: 0; display: none; z-index: 1; }',
    'html:not(.js) .layer__photo::after { display: block; }',
    '@media (prefers-reduced-motion: reduce) { .layer__photo::after { display: block; } }',
  ].join('\n');
}

const FRAMES = [
  ['тёмный кадр (свечи в темноте)', 0.05, false],
  ['средний кадр', 0.22, false],
  ['светлый: зал с роялем и ёлкой', 0.45, true],
  ['очень светлый: костюм крупным планом', 0.62, true],
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const base = measure(SCRIM, false);
  const bright = measure(SCRIM, true);
  const problems = [];
  const row = (k, v, note = '') => console.log('  ', k.padEnd(34), v.toFixed(3), note);

  console.log('\nЗатемнение — обычный кадр');
  row('поле над текстовой зоной', base.fieldMean, `потолок ${CEILING_FIELD.toFixed(2)} — здесь свечи`);
  row('  оно же, максимум', base.fieldMax);
  row('всё поле, среднее', base.mean);
  row('пик в текстовой зоне', base.peak, `нужно ${TEXT_PEAK[0]}–${TEXT_PEAK[1]}`);
  row('под подписью, среднее', base.capMean);
  row('под подписью, минимум', base.capMin);
  row('центр кадра', base.centre);

  console.log('\nЗатемнение — светлый кадр');
  row('поле над текстовой зоной', bright.fieldMean, `потолок ${CEILING_FIELD.toFixed(2)}`);
  row('пик в текстовой зоне', bright.peak, `нужно ${TEXT_PEAK[0]}–${TEXT_PEAK[1]}`);
  row('под подписью, минимум', bright.capMin);

  // Потолок поля держат оба пресета. Полосу 70–75 % спецификация задаёт для
  // обычного кадра; светлому позволено уйти глубже — иначе на нём не собрать
  // 4,5 : 1, — но не глубже 0,85, чтобы свечи в подписи ещё читались.
  for (const [name, m] of [['обычный', base], ['светлый', bright]]) {
    if (m.fieldMean > CEILING_FIELD) problems.push(`${name}: поле ${m.fieldMean.toFixed(3)} > ${CEILING_FIELD}`);
  }
  if (base.peak < TEXT_PEAK[0] || base.peak > TEXT_PEAK[1]) {
    problems.push(`обычный: пик ${base.peak.toFixed(3)} вне ${TEXT_PEAK.join('–')}`);
  }
  if (bright.peak > 0.85) problems.push(`светлый: пик ${bright.peak.toFixed(3)} глубже 0,85`);

  console.log('\nКонтраст кремового текста в худшей точке подписи');
  for (const [name, lum, isBright] of FRAMES) {
    const m = isBright ? bright : base;
    const c = contrast(lum, m.capMin);
    console.log('  ', name.padEnd(40), `${c.toFixed(2)} : 1`, isBright ? '(светлый пресет)' : '');
    if (c < 4.5) problems.push(`контраст ${c.toFixed(2)} : 1 на кадре «${name}»`);
  }

  if (problems.length) {
    console.error('\nНе сходится:');
    problems.forEach((p) => console.error('  ', p));
    process.exit(1);
  }
  console.log('\n   сходится\n');
}
