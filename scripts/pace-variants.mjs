/**
 * Варианты темпа проходных кадров — одним списком на все инструменты.
 *
 * По этим числам считает scripts/measure-pace.mjs и по ним же собираются
 * демонстрации в scripts/build-demo.mjs: замер и сборка не могут разойтись.
 * Боевой код здесь не участвует — в нём числа стоят на своих местах
 * (DURATION в src/js/main.js, PASS_COST в src/js/flight.js).
 *
 *   duration  длительность перехода, мс
 *   passCost  цена проходного кадра в карте темпа (у главы всегда 1)
 *   dwell     микрозадержка на проходном кадре, либо null
 *     hold    сколько миллисекунд камера стоит неподвижно
 *     ramp    спад и разгон вокруг остановки. Ноль ставить нельзя: задержка
 *             приходится на самый быстрый участок кривой, и мгновенный стоп
 *             читается как два толчка. Скорость гасим и возвращаем плавно,
 *             задержка от этого удлиняется на ramp.
 */
export const VARIANTS = {
  base: {
    key: 'base', title: 'Как сейчас',
    note: 'переход 1000 мс, проходной кадр стоит 0,45',
    duration: 1000, passCost: 0.45, dwell: null,
  },
  a: {
    key: 'a', title: 'A — длиннее переход',
    note: 'переход 1900 мс, темп проходных не тронут',
    duration: 1900, passCost: 0.45, dwell: null,
  },
  b: {
    key: 'b', title: 'B — темп проходных к единице',
    note: 'переход 1000 мс, проходной кадр стоит столько же, сколько глава',
    duration: 1000, passCost: 1.00, dwell: null,
  },
  c: {
    key: 'c', title: 'C — микрозадержка на проходном',
    note: 'переход 1000 мс, остановка 240 мс на полном заполнении экрана',
    duration: 1000, passCost: 0.45, dwell: { hold: 240, ramp: 130, cap: 2000 },
  },
};

export const ORDER = ['base', 'a', 'b', 'c'];

/** Потолки на длительность перехода — для сравнения глазами и в замере. */
export const CAPS = [1800, 2000, 2200];

/** Тот же C с разными потолками. Соседние главы во всех трёх одинаковы:
 *  потолок вступает в дело только на прыжках через три и больше проходных. */
export const CAP_VARIANTS = Object.fromEntries([
  ['none', null], ...CAPS.map((cap) => [`cap${cap}`, cap]),
].map(([key, cap]) => [key, {
  key,
  title: cap ? `C · потолок ${cap} мс` : 'C · без потолка',
  note: cap
    ? `переход 1000 мс, остановка 240 мс, дальний прыжок не длиннее ${cap} мс`
    : 'переход 1000 мс, остановка 240 мс, прыжок через весь пролёт — 2865 мс',
  duration: 1000,
  passCost: 0.45,
  dwell: { hold: 240, ramp: 130, ...(cap ? { cap } : {}) },
}]));

export const CAP_ORDER = ['none', ...CAPS.map((cap) => `cap${cap}`)];

/** Плавная ступенька: 0 → 1 без излома скорости на концах. */
export const smoothstep = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * Множитель скорости внутри микрозадержки: 1 → 0 за rampIn, ноль hold
 * миллисекунд, 0 → 1 за rampOut. Скаты несимметричны нарочно — их укорачивает
 * расписание, когда два проходных кадра стоят вплотную (см. dwellSchedule).
 */
export function dwellRate(tau, { hold, rampIn, rampOut }) {
  if (tau < rampIn) return 1 - smoothstep(tau / rampIn);
  if (tau < rampIn + hold) return 0;
  if (tau < rampIn + hold + rampOut) return smoothstep((tau - rampIn - hold) / rampOut);
  return 1;
}

export const dwellSpan = ({ hold, rampIn, rampOut }) => rampIn + hold + rampOut;

/** Сколько миллисекунд задержки добавляют к переходу сверх его длительности. */
export const dwellAdded = (plan) =>
  plan.reduce((sum, e) => sum + e.hold + (e.rampIn + e.rampOut) / 2, 0);

/**
 * Расписание микрозадержек на один переход.
 *
 * `centers` — виртуальные времена, в которые камера стоит ровно на очередном
 * проходном кадре; `duration` — длина перехода без задержек.
 *
 * Скат съедает половину своей длины виртуального времени, поэтому камера
 * встаёт ровно на кадре, если начать гасить скорость за rampIn/2 до него.
 * Когда два проходных кадра идут подряд, между ними столько времени нет:
 * при полном скате разгон после первой задержки перелетел бы второй кадр и
 * камера встала бы уже на растворяющемся. Поэтому скат между соседями
 * укорачивается до зазора — камера переползает от кадра к кадру, ни разу не
 * выходя на полную скорость.
 *
 *
 * ПОТОЛОК НА ПЕРЕХОД
 *
 * Между соседними главами проходных кадров один-два, и полная задержка на
 * каждом стоит недорого. Но щелчок по дальней точке рельса, Home и End — это
 * один переход через все шесть, и полные задержки растянули бы его почти до
 * трёх секунд.
 *
 * `dwell.cap` — потолок длительности перехода целиком. Когда полные задержки
 * в него не влезают, они не отключаются, а СЖИМАЮТСЯ: hold и ramp умножаются
 * на общий множитель, подобранный так, чтобы переход уложился ровно в
 * потолок. Отсюда два свойства, ради которых это и сделано:
 *
 *   деградация плавная — множитель уходит от единицы непрерывно, порога, на
 *     котором поведение скачком меняется, нет вовсе;
 *   короткий прыжок никогда не медленнее длинного — длительность равна
 *     duration + min(полные задержки, запас), а это неубывающая функция от
 *     числа проходных кадров.
 *
 * Множитель ищется делением пополам: добавка растёт по нему монотонно
 * (hold линейно, скаты линейно до упора в зазор), решать аналитически незачем.
 */
export function dwellSchedule(centers, duration, dwell) {
  if (!dwell || !centers.length) return [];

  const build = (scale) => {
    const hold = dwell.hold * scale;
    const ramp = dwell.ramp * scale;
    const gap = (k) => (k === 0 ? centers[0] : centers[k] - centers[k - 1]);
    return centers.map((at, k) => ({
      at,
      hold,
      rampIn: Math.max(0, Math.min(ramp, gap(k))),
      rampOut: Math.max(0, Math.min(ramp, k + 1 < centers.length ? gap(k + 1) : duration - at)),
    }));
  };

  const full = build(1);
  const allowance = (dwell.cap ?? Infinity) - duration;
  if (dwellAdded(full) <= allowance) return full;
  if (allowance <= 0) return [];

  let lo = 0, hi = 1;
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    if (dwellAdded(build(mid)) > allowance) hi = mid; else lo = mid;
  }
  return build(lo);
}

/**
 * Шаг виртуальных часов на dt миллисекунд реального времени.
 *
 * Виртуальное время — то, по которому считается кривая перехода. Вне задержек
 * оно идёт вровень с настоящим; внутри задержки замедляется до нуля и обратно.
 *
 * Отрезок кадра при необходимости делится на части: подойти к точке задержки,
 * начать гасить скорость, выйти из задержки — всё это может случиться внутри
 * одного кадра. Без деления камера проскакивает точку на треть кадра вперёд
 * и встаёт уже на растворяющемся кадре: при 60 Гц это заметная промашка,
 * замер по мелкому шагу её не покажет, а глаз на странице — покажет.
 *
 * Скорость на отрезке берём в его середине: правый край систематически врёт
 * на скатах, а середина — второго порядка точности, ошибка ниже кадра.
 */
export function advance(state, dt, plan) {
  let { virtual, next, clock } = state;
  let left = dt;
  for (let guard = 0; guard < 64 && left > 1e-6; guard++) {
    if (clock >= 0) {
      const span = dwellSpan(plan[next]);
      const step = Math.min(left, span - clock);
      clock += step;
      virtual += step * dwellRate(clock - step / 2, plan[next]);
      left -= step;
      if (clock >= span - 1e-9) { clock = -1; next++; }
    } else {
      const entry = plan[next];
      const limit = entry ? entry.at - entry.rampIn / 2 : Infinity;
      const step = Math.min(left, Math.max(0, limit - virtual));
      virtual += step;
      left -= step;
      if (left > 1e-6) clock = 0;
    }
  }
  return { virtual, next, clock };
}
