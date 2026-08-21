/**
 * Кадровый цикл пролёта.
 *
 * Камера идёт вперёд сквозь стопку полноэкранных кадров. Положение — одно
 * дробное число t: целое значение означает покой на кадре с этим номером.
 *
 * Пресет масштаба. Для кадра n смещение d = t − n:
 *   d = −1  кадр рождается,          масштаб 1,04
 *   d =  0  кадр стоит на главе,     масштаб 1,15
 *   d = +1  кадр ушёл вперёд,        масштаб 2,60
 * Между этими точками функция линейна в логарифме масштаба и имеет излом в
 * нуле: вперёд кадр разгоняется куда быстрее, чем подходил. Излом сглажен
 * через softplus, поэтому на остановке нет рывка.
 *
 * Масштаб всегда ≥ 1,04, а фотография лежит под object-fit: cover —
 * значит она никогда не меньше экрана.
 */

export const SCALE = {
  born: 1.04,
  rest: 1.15,
  gone: 2.60,
  kink: 0.10,      // τ: чем меньше, тем резче излом
};

/**
 * Подходящий кадр набирает непрозрачность почти мгновенно. Это не опечатка:
 * он лежит ПОД уходящим и, пока тот плотен, всё равно не виден. Зато в
 * середине перехода под растворяющимся кадром всегда стоит непрозрачный слой,
 * и чёрного провала не возникает. На остановке (d = −1) он ровно в нуле,
 * поэтому правило чистой остановки не нарушено.
 */
const FADE_IN = 0.02;
/** Полуширина окна, в котором видна подпись. */
const CAPTION_WINDOW = 0.34;
/** За пределами этого смещения слой не участвует в отрисовке. */
export const LIVE_RANGE = 1;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (t) => t * t * (3 - 2 * t);

/** softplus: сглаженный max(0, d). */
function softplus(d, tau) {
  const x = d / tau;
  if (x > 30) return d;              // ln(1+e^x) → x
  if (x < -30) return tau * Math.exp(x);
  return tau * Math.log1p(Math.exp(x));
}

/**
 * Коэффициенты подбираются один раз так, чтобы функция точно проходила через
 * три опорные точки пресета. Меняешь числа в SCALE — коэффициенты едут следом.
 */
function solveScale(preset) {
  const tau = preset.kink;
  const sp0 = softplus(0, tau);
  const spMinus = softplus(-1, tau) - sp0;
  const spPlus = softplus(1, tau) - sp0;
  const lnBorn = Math.log(preset.born / preset.rest);   // g(−1)
  const lnGone = Math.log(preset.gone / preset.rest);   // g(+1)
  // −A + C·spMinus = lnBorn
  //  A + C·spPlus  = lnGone
  const C = (lnGone + lnBorn) / (spPlus + spMinus);
  const A = lnGone - C * spPlus;
  return { tau, sp0, A, C, lnRest: Math.log(preset.rest) };
}

const K = solveScale(SCALE);

/** Масштаб кадра при смещении d. */
export function scaleAt(d) {
  const g = K.A * d + K.C * (softplus(d, K.tau) - K.sp0);
  return Math.exp(K.lnRest + g);
}

/** Непрозрачность кадра при смещении d. */
export function frameOpacityAt(d) {
  if (d <= -LIVE_RANGE || d >= LIVE_RANGE) return 0;
  if (d <= 0) return clamp((d + 1) / FADE_IN, 0, 1);
  return 1 - d;
}

/** Непрозрачность подписи при смещении d: читается ровно одна. */
export function captionOpacityAt(d) {
  return smoothstep(clamp(1 - Math.abs(d) / CAPTION_WINDOW, 0, 1));
}

/** cubic-bezier(.65, 0, .35, 1) — та же кривая, что в CSS. */
function bezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a;
  const B = (a, b) => 3 * b - 6 * a;
  const C = (a) => 3 * a;
  const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = slope(t, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      const e = calc(t, x1, x2) - x;
      if (Math.abs(e) < 1e-6) break;
      t -= e / d;
    }
    return calc(t, y1, y2);
  };
}

const EASE = bezier(0.65, 0, 0.35, 1);

/**
 * @param {object} options
 * @param {HTMLElement} options.root         контейнер .flight
 * @param {NodeListOf<HTMLElement>} options.slides
 * @param {number} options.duration          длительность перехода, мс
 * @param {(index:number)=>void} options.onSettle  вызывается в момент чистой остановки
 * @param {(index:number)=>void} options.onNeed     просьба подгрузить кадр
 */
export function createFlight({ root, slides, duration = 1000, onSettle, onNeed }) {
  const count = slides.length;
  const layers = Array.from(slides, (slide) => ({
    slide,
    frame: slide.querySelector('.slide__frame'),
    photo: slide.querySelector('.slide__photo'),
    live: false,
    lastO: -1,
    lastS: -1,
    lastC: -1,
  }));

  let position = 0;          // текущее t
  let index = 0;             // ближайшая остановка
  let from = 0, to = 0, startedAt = 0, animating = false, raf = 0;

  /** Один проход отрисовки. Ничего, кроме transform и opacity, не трогаем. */
  function paint() {
    for (let i = 0; i < count; i++) {
      const layer = layers[i];
      const d = position - i;
      const live = d > -LIVE_RANGE && d < LIVE_RANGE;

      if (live !== layer.live) {
        layer.live = live;
        if (live) layer.slide.setAttribute('data-live', '');
        else layer.slide.removeAttribute('data-live');
      }
      if (!live) {
        // Гасим один раз, дальше не трогаем: лишние записи в стиль дороги
        if (layer.lastO !== 0) {
          layer.frame.style.setProperty('--o', '0');
          layer.slide.style.setProperty('--c', '0');
          layer.lastO = 0; layer.lastC = 0; layer.lastS = -1;
        }
        continue;
      }

      const o = frameOpacityAt(d);
      const s = scaleAt(d);
      if (o !== layer.lastO) { layer.frame.style.setProperty('--o', o.toFixed(4)); layer.lastO = o; }
      if (s !== layer.lastS) { layer.photo.style.setProperty('--s', s.toFixed(4)); layer.lastS = s; }
      const c = captionOpacityAt(d);
      if (c !== layer.lastC) { layer.slide.style.setProperty('--c', c.toFixed(4)); layer.lastC = c; }
    }
  }

  function tick(now) {
    const elapsed = now - startedAt;
    const progress = duration <= 1 ? 1 : clamp(elapsed / duration, 0, 1);
    position = from + (to - from) * EASE(progress);
    paint();
    if (progress < 1) {
      raf = requestAnimationFrame(tick);
      return;
    }
    // Чистая остановка: ровно один слой с непрозрачностью 1, остальные в нуле
    position = to;
    index = to;
    animating = false;
    raf = 0;
    paint();
    onSettle?.(index);
  }

  function goTo(next, { immediate = false } = {}) {
    const target = clamp(Math.round(next), 0, count - 1);
    // immediate вызывают при входе в режим — там нужен обязательный проход
    // отрисовки, даже если номер кадра не изменился
    if (target === index && !animating && !immediate) return false;
    if (raf) cancelAnimationFrame(raf);

    // Кадр n+2 просим заранее, чтобы на переходе не было пустого места
    onNeed?.(target);
    onNeed?.(target + 1);
    onNeed?.(target + 2);

    from = position;
    to = target;
    if (immediate || duration <= 1) {
      position = target; index = target; animating = false; raf = 0;
      paint();
      onSettle?.(index);
      return true;
    }
    startedAt = performance.now();
    animating = true;
    raf = requestAnimationFrame(tick);
    return true;
  }

  function resize() { paint(); }

  paint();   // первый проход: без него слои остались бы на фолбэках из CSS

  return {
    get count() { return count; },
    get index() { return index; },
    get position() { return position; },
    get animating() { return animating; },
    goTo,
    next: (opts) => goTo(index + 1, opts),
    prev: (opts) => goTo(index - 1, opts),
    paint,
    resize,
    destroy() { if (raf) cancelAnimationFrame(raf); },
  };
}
