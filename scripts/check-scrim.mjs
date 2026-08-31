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
  base:        0.26,   // ровное поле
  textMax:     0.55,   // плато под подписью
  textPlateau: 0.40,   // докуда снизу держится плато, доля высоты
  textFade:    0.82,   // где усиление сходит в ноль
  leanMax:     0.12,   // уклон к левому краю: подпись стоит слева
  leanTo:      0.55,   // докуда вправо тянется уклон
  // Светлый кадр отличается ТОЛЬКО плотностью плато. Прежде у него был ещё
  // и свой, более крутой сход (0.56 против 0.66) — он и делал край панели
  // различимым. Теперь геометрия у обоих пресетов одна, разное только число.
  brightMax:   0.72,
  brightFade:  0.82,
  vignette:    { rx: 1.25, ry: 1.15, cx: 0.50, cy: 0.48, from: 0.54, to: 0.20 },
  /**
   * Остаточная плотность после пролёта.
   *
   * Прежде затемнение уходило в ноль, и последний кадр показывался
   * неприкрытым. Это давало перепад в источнике: под стыком фотография шла
   * втрое светлее, чем то, во что её гасит грунт, и кромка читалась линией.
   * Здесь слой садится на остаток и перестаёт быть fixed — он покрывает
   * ровно последний кадр, а не текстовую часть под ним.
   */
  rest:        0.18,
};

/**
 * «Поле над текстовой зоной» — та часть кадра, которой усиление под подписью
 * НЕ касается вовсе. Прежде граница стояла на 0,45 при сходе на 0,66: между
 * ними усиление ещё работало, и в «поле» попадала его половина.
 *
 * Растяжка схода до 42 % высоты (требование: не короче 40 %) сдвинула бы это
 * расхождение до трёх четвертей региона — число перестало бы измерять то, что
 * названо. Поэтому граница берётся из самой растяжки, а не из константы: поле
 * начинается там, где усиление кончилось.
 *
 * Потолок при этом не ослаблен, а ужат: 0,34 вместо 0,40. Прежняя база была
 * ровно 0,34, и гейт теперь требует, чтобы нетронутая часть кадра была не
 * темнее прежней базы. Для сведения печатаются оба числа — и по новой
 * границе, и по старой 0,45.
 */
const CEILING_FIELD = 0.34;
const LEGACY_FIELD_ABOVE = 0.45;
const TEXT_PEAK = [0.70, 0.755];
/** Прямоугольник подписи: слева снизу, ширина min(720px, 90vw). Измерен в браузере. */
const CAPTION = { x0: 0.04, x1: 0.52, y0: 0.05, y1: 0.42 };
/** Всё, что выше растяжки, — «поле над фотографией». */
const FIELD_ABOVE = Math.max(SCRIM.textFade, SCRIM.brightFade);

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

/**
 * Плотность затемнения в точке кадра. x — доля ширины от левого края,
 * y — доля высоты от НИЗА (усиление живёт внизу, отсюда и отсчёт).
 *
 * textMax задаётся отдельным доводом, а не берётся из пресета: по нему идут
 * и общее значение, и светлый пресет, и покадровое переопределение
 * (--scrim-frame). Одна функция на все три случая — иначе покадровый расчёт
 * контраста и сам CSS разойдутся.
 */
export function densityAt(P, x, y, textMax = P.textMax) {
  const field = 1 - (1 - P.base) * (1 - vignetteAt(P, x, y));
  const v = textProfile(P, y);
  const text = 1 - (1 - textMax * v) * (1 - P.leanMax * leanProfile(P, x) * v);
  return 1 - (1 - field) * (1 - text);
}

export function measure(P = SCRIM, bright = false) {
  const textMax = bright ? P.brightMax : P.textMax;
  P = bright ? { ...P, textFade: P.brightFade } : P;
  const full = (x, y) => densityAt(P, x, y, textMax);

  const N = 320;
  let sum = 0, n = 0, peak = 0;
  let above = 0, aboveN = 0, aboveMax = 0;
  let legacy = 0, legacyN = 0;
  let cap = 0, capN = 0, capMin = 1;

  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = (i + 0.5) / N, y = (j + 0.5) / N, f = full(x, y);
    sum += f; n++;
    if (f > peak) peak = f;
    if (y > FIELD_ABOVE) { above += f; aboveN++; if (f > aboveMax) aboveMax = f; }
    if (y > LEGACY_FIELD_ABOVE) { legacy += f; legacyN++; }
    if (x >= CAPTION.x0 && x <= CAPTION.x1 && y >= CAPTION.y0 && y <= CAPTION.y1) {
      cap += f; capN++; if (f < capMin) capMin = f;
    }
  }
  return {
    mean: sum / n, peak,
    fieldMean: above / aboveN, fieldMax: aboveMax,
    legacyFieldMean: legacy / legacyN,
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

  // Вертикальный профиль раскладываем в стопы: семь точек на растяжке в 42 %
  // дают неотличимый от smoothstep сход. Пять, как было на растяжке в 26 %,
  // на удвоенной длине уже показывают перегиб между стопами.
  const STOPS = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];
  const span = P.textFade - P.textPlateau;
  const vertical = 'linear-gradient(to top, ' + [
    'rgb(7 5 6 / calc(var(--scrim-text) * 1)) 0%',
    ...STOPS.map((k) => {
      const y = P.textPlateau + k * span;
      const a = textProfile(P, y);
      return `rgb(7 5 6 / calc(var(--scrim-text) * ${a.toFixed(3)})) ${(y * 100).toFixed(1)}%`;
    }),
  ].join(', ') + ')';

  const lean = 'linear-gradient(to right, ' + [0, 0.25, 0.5, 0.75, 1].map((k) => {
    const x = k * P.leanTo;
    return `rgb(7 5 6 / calc(var(--scrim-lean) * ${leanProfile(P, x).toFixed(3)})) ${(x * 100).toFixed(1)}%`;
  }).join(', ') + `, ${rgba(0)} 100%)`;

  return [
    '/* Затемнение — отдельный слой поверх кадра, к самому кадру не привязан.',
    '   В пролёте он один на всю стопку: плотность не удваивается там, где',
    '   видно два кадра сразу. Числа держит scripts/check-scrim.mjs. */',
    '',
    '.flight__scrim, .opener__veil, .layer__photo::after {',
    '  /* Плотность усиления под подписью. Три уровня, и они не спорят:',
    '       умолчание ниже        — обычный кадр;',
    '       [data-bright]         — второе умолчание, светлый кадр;',
    '       --scrim-frame         — переопределение ПО ОТДЕЛЬНОМУ КАДРУ, бьёт оба.',
    '     Кадру, который не проходит по контрасту на общем значении, поднимают',
    '     только его собственное: базовое для всех остаётся прежним. Значение',
    '     ставит src/content.js (поле scrimText) — инлайном на .layer, откуда',
    '     оно наследуется в ::after, и копией на экранный слой из main.js. */',
    `  --scrim-text: var(--scrim-frame, ${P.textMax.toFixed(2)});`,
    `  --scrim-lean: ${P.leanMax.toFixed(2)};`,
    '  background:',
    '    /* уклон к левому краю: подпись стоит слева */',
    '    ' + lean + ',',
    '    /* плато под подписью и сглаженный сход вверх */',
    '    ' + vertical + ',',
    '    /* очень пологая виньетка: радиусы больше кадра */',
    '    ' + vign + ',',
    '    /* база ровным полем */',
    '    ' + rgba(P.base) + ';',
    '}',
    '',
    '/* Светлый кадр. Отличается ровно одним числом: геометрия схода у обоих',
    '   пресетов теперь общая, поэтому второго стека градиентов больше нет —',
    '   прежде их было два, и различались они не только плотностью, но и',
    '   длиной растяжки, из-за чего у светлых кадров край панели читался. */',
    '.flight__scrim[data-bright], .opener__veil[data-bright], [data-bright] .layer__photo::after {',
    `  --scrim-text: var(--scrim-frame, ${P.brightMax.toFixed(2)});`,
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
    '/* Пролёт закончен. Затемнение не уходит в ноль: неприкрытая фотография',
    '   под стыком светлее того, во что её гасит грунт, и кромка читается',
    '   линией. Остаток гасит перепад в источнике, а не маскирует его.',
    '   position: absolute — обязательно: fixed-слой остался бы поверх',
    '   вьюпорта и затонировал бы всю текстовую часть. Абсолютный лежит',
    '   внутри .flight.is-done и покрывает ровно последний кадр. */',
    'html.flight-done .flight__scrim {',
    '  position: absolute;',
    `  opacity: ${P.rest.toFixed(2)};`,
    '}',
    '',
    '/* Первый экран несёт своё затемнение: экранный слой в этот момент ещё',
    '   не включён, а заголовок уже стоит поверх фотографии. */',
    '.opener__veil { position: absolute; inset: 0; }',
    '',
    '/* Статическая раскладка: экранного слоя нет, поэтому затемнение уходит',
    '   в сам кадр — иначе подпись легла бы на неприкрытую фотографию. */',
    ".layer__photo::after { content: ''; position: absolute; inset: 0; display: none; z-index: 1; }",
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
