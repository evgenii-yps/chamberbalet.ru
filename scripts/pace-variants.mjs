/**
 * Варианты перехода — одним списком на замер и на демонстрации.
 *
 * По этим числам считает scripts/measure-pace.mjs и по ним же собираются
 * демонстрации в scripts/build-demo.mjs: замер и то, что видно глазами, не
 * могут разойтись. Боевой код здесь не участвует — в нём числа стоят на
 * своих местах (DURATION в src/js/main.js, SCALE и кривая в flight.js).
 *
 * Проходных кадров больше нет: один кадр — одна глава, переход всегда ведёт
 * к соседнему кадру. Поэтому вариант описывается тремя вещами и только ими:
 *
 *   duration  длительность перехода, мс
 *   curve     [x1, x2] — cubic-bezier(x1, 0, x2, 1), кривая разгона
 *   scale     пресет масштаба { base, accel, soft } — глубина прохода
 */

/** Длительность, кривая и пресет, стоящие в src/. Сверяются с исходниками. */
export const BASE_DURATION = 2400;
export const BASE_CURVE = [0.33, 0.18];
export const BASE_SCALE = { base: 1.04, accel: 1.31, soft: 0.111 };

/**
 * То, что стояло до применения решения: симметричная кривая и пологое колено.
 * Оставлено не из сентиментальности — демонстрации сравнивают «как было» с
 * «как стало», и обе стороны сравнения должны браться из одного файла.
 */
export const PREV_CURVE = [0.65, 0.35];
export const PREV_SCALE = { base: 1.04, accel: 0.8, soft: 0.18 };

const variant = (key, title, note, duration, curve = BASE_CURVE, scale = BASE_SCALE) =>
  ({ key, title, note, duration, curve, scale });

/* ------------------------------------------------------------------ *
 *  1. Длительность перехода
 * ------------------------------------------------------------------ */

export const DURATIONS = [2000, 2400, 2800, 3200];

export const DURATION_VARIANTS = Object.fromEntries(DURATIONS.map((ms) => [
  `d${ms}`,
  variant(`d${ms}`, `${ms} мс${ms === BASE_DURATION ? ' — принято' : ''}`,
    `переход ${ms} мс, кривая и глубина как в src/`, ms),
]));

export const DURATION_ORDER = DURATIONS.map((ms) => `d${ms}`);

/* ------------------------------------------------------------------ *
 *  2. Кривая разгона (при одной и той же длительности)
 * ------------------------------------------------------------------ */

export const CURVE_VARIANTS = {
  prev: variant('prev', 'Прежняя кривая',
    `переход ${BASE_DURATION} мс, cubic-bezier(.65, 0, .35, 1) — симметричная`,
    BASE_DURATION, PREV_CURVE),
  current: variant('current', 'Уверенная — принята',
    `переход ${BASE_DURATION} мс, cubic-bezier(.33, 0, .18, 1) — трогается раньше, дольше садится`,
    BASE_DURATION),
};

export const CURVE_ORDER = ['prev', 'current'];

/* ------------------------------------------------------------------ *
 *  3. Глубина прохода (при одной и той же длительности и кривой)
 * ------------------------------------------------------------------ */

export const DEPTH_VARIANTS = {
  prev: variant('prev', 'Прежняя глубина',
    `переход ${BASE_DURATION} мс, масштаб 1,04 → 1,15 → 1,83 к растворению`,
    BASE_DURATION, BASE_CURVE, PREV_SCALE),
  current: variant('current', 'Резче колено — принято',
    `переход ${BASE_DURATION} мс, масштаб 1,04 → 1,15 → 2,60 к растворению`,
    BASE_DURATION),
};

export const DEPTH_ORDER = ['prev', 'current'];

/* ------------------------------------------------------------------ *
 *  Кривая: одна реализация на замер и на браузер
 * ------------------------------------------------------------------ */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * cubic-bezier(x1, 0, x2, 1). Тело построчно совпадает с приватной bezier()
 * из src/js/flight.js, где две константы вынесены в аргумент. Совпадение
 * констант с боевым файлом проверяется при запуске замера и при сборке
 * демонстраций — копия не может разойтись незамеченной.
 */
export function bezierWith(x, x1, x2) {
  let u = clamp(x, 0, 1);
  for (let k = 0; k < 6; k++) {
    const mt = 1 - u;
    const fx = 3 * mt * mt * u * x1 + 3 * mt * u * u * x2 + u * u * u;
    const dx = 3 * mt * mt * x1 + 6 * mt * u * (x2 - x1) + 3 * u * u * (1 - x2);
    if (dx < 1e-6) break;
    u = clamp(u - (fx - x) / dx, 0, 1);
  }
  const mu = 1 - u;
  return 3 * mu * u * u + u * u * u;    // y1 = 0, y2 = 1
}

/** Пресет масштаба с произвольными числами: копия scaleAt из flight.js. */
export function softplusWith(t, soft) {
  const x = t / soft;
  if (x > 30) return t;
  if (x < -30) return soft * Math.exp(x);
  return soft * Math.log1p(Math.exp(x));
}

export const scaleWith = (t, S) => S.base * Math.exp(S.accel * softplusWith(t, S.soft));

/**
 * Числа кривой и пресета, записанные в боевом файле. Замер и демонстрации
 * читают их отсюда и сверяют с исходником: если в flight.js поправят кривую,
 * а здесь забудут, оба инструмента упадут, а не соврут.
 */
export const SOURCE_GUARDS = [
  { file: 'src/js/flight.js', text: 'const x1 = 0.33, x2 = 0.18;' },
  { file: 'src/js/flight.js', text: 'export const SCALE = { base: 1.04, accel: 1.31, soft: 0.111 };' },
  { file: 'src/js/main.js', text: 'const DURATION = 2400;' },
  { file: 'src/css/tokens.css', text: '--flight-ease: cubic-bezier(.33, 0, .18, 1);' },
];
