/**
 * Кадровый цикл пролёта. Механика перенесена из согласованного прототипа.
 *
 * Камера идёт вперёд сквозь стопку полноэкранных кадров. Положение — одно
 * дробное число p в системе номеров слоёв: p = 3 означает, что камера стоит
 * ровно на четвёртом кадре.
 *
 * Остановок меньше, чем кадров. Останавливаемся только на главах; кадры без
 * главы — проходные, камера пролетает их внутри одного перехода и идёт по
 * ним заметно быстрее. Первая остановка отрицательная: там стоит первый
 * экран, лежащий отдельным слоем поверх стопки.
 */

/* ── масштаб ──────────────────────────────────────────────────────────
 * Кадр рождается уже во весь экран (1,04), на главе около 1,15, к уходу
 * доходит до 2,6. softplus сглаживает излом: до главы кривая почти плоская,
 * после — резко уходит вперёд.
 */
export const SCALE = { base: 1.04, accel: 0.8, soft: 0.18 };

/** softplus: сглаженный max(0, t). Без защиты от переполнения exp(t/soft) рвётся. */
function softplus(t, soft) {
  const x = t / soft;
  if (x > 30) return t;
  if (x < -30) return soft * Math.exp(x);
  return soft * Math.log1p(Math.exp(x));
}

export function scaleAt(t) {
  return SCALE.base * Math.exp(SCALE.accel * softplus(t, SCALE.soft));
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ── прозрачность ─────────────────────────────────────────────────────
 * Кадр проявляется под предыдущим, стоит плотным и растворяется.
 * Растворение обязано закончиться до того, как встанет следующая остановка,
 * иначе на остановке видно два слоя, — поэтому окно ухода считается от
 * фактического расстояния до ближайшей главы впереди.
 *
 * in1 = −(1 + in0 − out0): подходящий кадр набирает полную плотность ровно к
 * тому мгновению, когда уходящий начинает растворяться. Так стопка закрыта
 * всегда, и чёрный провал невозможен по построению, а не по совпадению.
 * В прототипе окно было на 0,1 длиннее и оставляло просвет в 1,7 %.
 */
export const FADE = { in0: -1.00, in1: -0.80, out0: 0.20, outMax: 0.70 };

export function fadeOutEnd(layers, i) {
  let next = i + 1;
  while (next < layers.length && !layers[next].chapter) next++;
  const gap = (next < layers.length ? next : i + 1) - i;
  return Math.min(FADE.outMax, gap * FADE.outMax);
}

export function opacityAt(t, outEnd) {
  if (t <= FADE.in0 || t >= outEnd) return 0;
  if (t < FADE.in1) return clamp((t - FADE.in0) / (FADE.in1 - FADE.in0), 0, 1);
  if (t > FADE.out0) return clamp(1 - (t - FADE.out0) / (outEnd - FADE.out0), 0, 1);
  return 1;
}

/* ── прочее ───────────────────────────────────────────────────────── */

/** Где на числовой оси стоит первый экран. */
export const OPENER_AT = -1.05;
/**
 * Первый экран держится плотным, пока под ним не встанет первый кадр, и
 * только потом растворяется. В прототипе он начинал гаснуть сразу от своей
 * остановки, и между ним и ещё не проявившимся кадром просвечивала пустота
 * на 18 % — на тёмных кадрах это почти незаметно, но приёмка требует, чтобы
 * провала не было вовсе. Держим до FADE.in1: там кадр уже плотный.
 */
export const OPENER_HOLD = FADE.in1;
export const OPENER_FADE = 0.55;

export function openerOpacityAt(p) {
  return clamp(1 - (p - OPENER_HOLD) / OPENER_FADE, 0, 1);
}
/** Проходной кадр «дешевле» главы: камера идёт по нему быстрее. */
export const PASS_COST = 0.45;

/** cubic-bezier(.65, 0, .35, 1) — та же кривая, что в CSS. */
function bezier(x) {
  const x1 = 0.65, x2 = 0.35;
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

/**
 * Карта темпа внутри одного перехода. Глава стоит единицу, проходной кадр —
 * PASS_COST. Равномерная доля пути по этой карте даёт неравномерное движение
 * по номерам слоёв: на главах камера идёт медленно, между ними разгоняется.
 */
export function buildPath(from, to, isChapter, count, steps = 48) {
  const cumulative = [0];
  let total = 0;
  for (let k = 0; k < steps; k++) {
    const p = from + (to - from) * ((k + 0.5) / steps);
    const i = clamp(Math.round(p), 0, count - 1);
    total += isChapter(i) ? 1 : PASS_COST;
    cumulative.push(total);
  }
  return { from, to, cumulative, total, steps };
}

export function positionOn(path, u) {
  const x = u * path.total;
  let lo = 0, hi = path.steps;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path.cumulative[mid] <= x) lo = mid; else hi = mid;
  }
  const segment = path.cumulative[hi] - path.cumulative[lo];
  const f = segment ? (x - path.cumulative[lo]) / segment : 0;
  return path.from + (path.to - path.from) * ((lo + f) / path.steps);
}

/**
 * Дрейф кадров: медленный снос вбок, привязанный к базовому масштабу.
 * Направления разложены золотым углом, чтобы соседние кадры не сносило
 * одинаково. Амплитуда мала — 0,8…1,4 % экрана, чёрных краёв не даёт:
 * даже на минимальном масштабе 1,04 запас вчетверо больше.
 */
export function driftOf(i) {
  const angle = i * 2.399963;
  return { x: Math.cos(angle), y: Math.sin(angle) * 0.6, amp: 0.008 + (i % 3) * 0.003 };
}

/**
 * @param {object} options
 * @param {HTMLElement[]} options.layers    слои кадров, по одному на фотографию
 * @param {boolean[]} options.isChapter     несёт ли слой главу
 * @param {number[]} options.stops          позиции остановок, первая — первый экран
 * @param {number} options.duration         длительность перехода, мс
 * @param {(index:number)=>void} options.onSettle  вызывается на чистой остановке
 * @param {(position:number)=>void} options.onNeed просьба подгрузить кадры
 * @param {(opacity:number)=>void} options.onOpener состояние первого экрана
 */
export function createFlight({
  layers, isChapter, stops, duration = 1000, onSettle, onNeed, onOpener,
}) {
  const count = layers.length;
  const last = stops.length - 1;

  // Окно ухода зависит от расстояния до ближайшей главы впереди
  const chapterMap = layers.map((_, i) => ({ chapter: isChapter(i) || undefined }));
  const state = layers.map((el, i) => ({
    el,
    drift: driftOf(i),
    outEnd: fadeOutEnd(chapterMap, i),
    visible: null,
    lastO: -1,
    lastT: null,
  }));

  let viewportW = window.innerWidth;
  let viewportH = window.innerHeight;
  let position = stops[0];
  let index = 0;
  let path = null, startedAt = 0, animating = false, raf = 0;

  function paint() {
    for (let i = 0; i < count; i++) {
      const layer = state[i];
      const t = position - i;

      if (t <= FADE.in0 || t >= layer.outEnd) {
        if (layer.visible !== false) {
          layer.visible = false;
          layer.el.style.visibility = 'hidden';
          layer.el.style.opacity = '0';
          layer.el.removeAttribute('data-live');
          layer.lastO = 0;
          layer.lastT = null;
        }
        continue;
      }

      if (layer.visible !== true) {
        layer.visible = true;
        layer.el.style.visibility = 'visible';
        layer.el.setAttribute('data-live', '');
      }

      const o = opacityAt(t, layer.outEnd);
      if (o !== layer.lastO) { layer.el.style.opacity = o.toFixed(3); layer.lastO = o; }

      if (t !== layer.lastT) {
        const k = clamp(t, -1, 1);
        const dx = layer.drift.x * layer.drift.amp * k * viewportW;
        const dy = layer.drift.y * layer.drift.amp * k * viewportH;
        layer.el.style.transform =
          `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${scaleAt(t).toFixed(4)})`;
        layer.lastT = t;
      }
    }
    onOpener?.(openerOpacityAt(position));
  }

  function step(now) {
    raf = 0;
    const u = duration <= 1 ? 1 : clamp((now - startedAt) / duration, 0, 1);
    position = positionOn(path, bezier(u));
    paint();
    if (u < 1) { raf = requestAnimationFrame(step); return; }
    position = path.to;
    animating = false;
    paint();
    onSettle?.(index);
  }

  function goTo(n, { immediate = false } = {}) {
    const target = clamp(Math.round(n), 0, last);
    if (target === index && !animating && !immediate) return false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }

    index = target;
    onNeed?.(stops[target]);

    if (immediate || duration <= 1) {
      position = stops[target];
      animating = false;
      paint();
      onSettle?.(index);
      return true;
    }

    path = buildPath(position, stops[target], isChapter, count);
    startedAt = performance.now();
    animating = true;
    raf = requestAnimationFrame(step);
    return true;
  }

  function resize() {
    viewportW = window.innerWidth;
    viewportH = window.innerHeight;
    state.forEach((layer) => { layer.lastT = null; });   // дрейф зависит от размера
    paint();
  }

  return {
    get count() { return count; },
    get stopCount() { return stops.length; },
    get index() { return index; },
    get position() { return position; },
    get animating() { return animating; },
    get atLast() { return index >= last; },
    goTo, paint, resize,
    next: (opts) => goTo(index + 1, opts),
    prev: (opts) => goTo(index - 1, opts),
    destroy() { if (raf) cancelAnimationFrame(raf); },
  };
}
