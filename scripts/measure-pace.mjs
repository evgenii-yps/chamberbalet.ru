/**
 * Сколько миллисекунд проходной кадр реально держит экран.
 *
 * Считаем по тем же функциям, что работают в браузере (src/js/flight.js), а не
 * по их пересказу: профиль прозрачности opacityAt, масштаб scaleAt, карта
 * темпа buildPath/positionOn и та же кривая cubic-bezier(.65, 0, .35, 1).
 *
 * Доля экрана у кадра i — его собственная плотность за вычетом того, что
 * загораживают кадры ближе к камере (у них меньший индекс и больший z-index):
 *
 *     share(i) = opacity(i) · Π (1 − opacity(j)),  j < i
 *
 * Пока share ≥ 0,98, кадр закрывает экран один и целиком. Это и есть
 * «проходной кадр держится»: масштаб в этой полосе печатается рядом, 1,07–1,28
 * — то же, что у главы на остановке (1,15).
 *
 *   node scripts/measure-pace.mjs             все варианты и сводка
 *   node scripts/measure-pace.mjs base a      только перечисленные
 *   node scripts/measure-pace.mjs --duration=1600 --pass-cost=0.7 --hold=200
 *                                             произвольная комбинация
 */
import {
  opacityAt, fadeOutEnd, scaleAt, buildPath, positionOn, OPENER_AT, PASS_COST,
} from '../src/js/flight.js';
import { layers, chapters } from '../src/content.js';
import { VARIANTS, ORDER, dwellSchedule, advance } from './pace-variants.mjs';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* Копия приватной кривой из flight.js: cubic-bezier(.65, 0, .35, 1). */
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
  return 3 * mu * u * u + u * u * u;
}

/** Обратная развёртка кривой: какому времени отвечает доля пути. */
function bezierInverse(y) {
  let lo = 0, hi = 1;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (bezier(mid) < y) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Карта темпа с произвольной ценой проходного кадра. Тело — построчная копия
 * buildPath из flight.js, где 0,45 вынесено в аргумент: вариант B меняет
 * именно это число. Совпадение с боевой функцией на цене по умолчанию
 * проверяется при запуске — копия не может разойтись незамеченной.
 */
function buildPathWith(from, to, isChapter, count, steps, cost) {
  const cumulative = [0];
  let total = 0;
  for (let k = 0; k < steps; k++) {
    const p = from + (to - from) * ((k + 0.5) / steps);
    const i = clamp(Math.round(p), 0, count - 1);
    total += isChapter(i) ? 1 : cost;
    cumulative.push(total);
  }
  return { from, to, cumulative, total, steps };
}

const N = layers.length;
const isChapter = (i) => Boolean(layers[i]?.chapter);
const OUT_END = layers.map((_, i) => fadeOutEnd(layers, i));
const STOPS = [OPENER_AT, ...chapters.map((c) => c.index)];

/**
 * Три порога, а не один: «сколько кадр виден» — вопрос с тремя разными
 * ответами, и подсовывать вместо него один удобный нечестно.
 *
 *   0,98  кадр закрыл экран целиком — полноэкранное состояние;
 *   0,50  кадр преобладает: соседи просвечивают, но видно его;
 *   0,05  кадр присутствует на экране хоть сколько-нибудь.
 */
const SHARES = [0.98, 0.50, 0.05];
/** Шаг симуляции мельче кадра при 120 Гц: погрешность ниже отчётной точности. */
const STEP_MS = 0.5;

function shareOf(position, i) {
  let blocked = 1;
  for (let j = 0; j < i; j++) blocked *= 1 - opacityAt(position - j, OUT_END[j]);
  return opacityAt(position - i, OUT_END[i]) * blocked;
}

/**
 * Где вариант C придерживает камеру: на собственном номере проходного кадра.
 * Там он закрывает экран целиком при масштабе 1,15 — ровно как глава на своей
 * остановке. Возвращаем виртуальные времена этих точек.
 */
function dwellCenters(path, duration, dwell) {
  if (!dwell) return [];
  const lo = Math.min(path.from, path.to), hi = Math.max(path.from, path.to);
  const out = [];
  for (let i = Math.ceil(lo); i <= Math.floor(hi); i++) {
    // Первый экран стоит на −1,05, и целые точки до нулевого кадра — не кадры:
    // придержать там значит замереть на пустом месте.
    if (i < 0 || i >= N || i <= lo || i >= hi || isChapter(i)) continue;
    let a = 0, b = 1;
    const forward = path.to > path.from;
    for (let k = 0; k < 40; k++) {
      const mid = (a + b) / 2;
      if (forward ? positionOn(path, mid) < i : positionOn(path, mid) > i) a = mid; else b = mid;
    }
    out.push(bezierInverse((a + b) / 2) * duration);
  }
  return out.sort((p, q) => p - q);
}

/** Прогон одного перехода. Возвращает время по кадрам и фактическую длительность. */
function runTransition(from, to, { duration, passCost, dwell }) {
  const path = buildPathWith(from, to, isChapter, N, 48, passCost);
  const plan = dwellSchedule(dwellCenters(path, duration, dwell), duration, dwell);

  const held = new Map();
  const scaleRange = new Map();
  let elapsed = 0, virtual = 0, next = 0, clock = -1;

  for (let guard = 0; guard < 400000; guard++) {
    const u = duration <= 0 ? 1 : clamp(virtual / duration, 0, 1);
    const position = positionOn(path, bezier(u));

    for (let i = 0; i < N; i++) {
      const s = shareOf(position, i);
      if (s < SHARES.at(-1)) continue;
      const row = held.get(i) ?? SHARES.map(() => 0);
      SHARES.forEach((threshold, k) => { if (s >= threshold) row[k] += STEP_MS; });
      held.set(i, row);
      if (s >= SHARES[0]) {
        const sc = scaleAt(position - i);
        const r = scaleRange.get(i) ?? [Infinity, -Infinity];
        scaleRange.set(i, [Math.min(r[0], sc), Math.max(r[1], sc)]);
      }
    }

    if (u >= 1 && clock < 0) break;
    elapsed += STEP_MS;
    ({ virtual, next, clock } = advance({ virtual, next, clock }, STEP_MS, plan));
  }

  return { held, scaleRange, total: elapsed, dwells: plan.length };
}

const ms = (v, w = 4) => String(Math.round(v)).padStart(w);

function report(variant) {
  const { title, note } = variant;
  console.log(`\n${title}`);
  console.log(`   ${note}`);
  console.log('   ' + '─'.repeat(76));
  console.log('   переход           кадр   экран целиком  преобладает   виден   масштаб');

  const all = [];
  let longest = 0;
  for (let n = 0; n < STOPS.length - 1; n++) {
    const from = STOPS[n], to = STOPS[n + 1];
    const r = runTransition(from, to, variant);
    longest = Math.max(longest, r.total);

    const passing = [];
    for (let i = 0; i < N; i++) {
      if (isChapter(i)) continue;                 // главы — остановки, их время не ограничено
      const row = r.held.get(i);
      if (row) passing.push({ i, row, scale: r.scaleRange.get(i) });
    }
    const label = `${n}→${n + 1} (${from === OPENER_AT ? 'экран' : from} → ${to})`;
    if (!passing.length) {
      console.log(`   ${label.padEnd(18)}  —    проходных нет${''.padEnd(28)}${ms(r.total)} мс`);
      continue;
    }
    passing.forEach((p, k) => {
      const sc = p.scale ? `${p.scale[0].toFixed(2)}–${p.scale[1].toFixed(2)}` : '  —';
      console.log(
        `   ${(k === 0 ? label : '').padEnd(18)}${String(p.i).padStart(3)}    ` +
        `${ms(p.row[0])} мс       ${ms(p.row[1])} мс    ${ms(p.row[2])} мс   ${sc}`);
      all.push(p.row[0]);
    });
    console.log(`   ${''.padEnd(18)}       переход целиком: ${ms(r.total)} мс`);
  }

  // Прыжок через весь пролёт: клавиши Home/End и щелчок по дальней точке
  // рельса. Это один переход, и он пересекает все шесть проходных кадров.
  const jump = runTransition(STOPS.at(-1), STOPS[0], variant).total;

  const worst = Math.min(...all), best = Math.max(...all);
  const avg = all.reduce((s, v) => s + v, 0) / all.length;
  console.log('   ' + '─'.repeat(76));
  console.log(`   проходных кадров ${all.length} · минимум ${ms(worst)} мс · среднее ${ms(avg)} мс · ` +
              `максимум ${ms(best)} мс · самый длинный переход ${ms(longest)} мс`);
  console.log(`   прыжок через весь пролёт (Home, End, дальняя точка рельса): ${ms(jump)} мс`);
  return { worst, avg, best, longest, jump };
}

/* ------------------------------ запуск ------------------------------ */

{
  const a = buildPath(0, 6, isChapter, N);
  const b = buildPathWith(0, 6, isChapter, N, 48, PASS_COST);
  if (a.total !== b.total || !a.cumulative.every((v, k) => v === b.cumulative[k])) {
    console.error('копия buildPath разошлась с flight.js'); process.exit(1);
  }
}

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : null;
};

console.log(`\nКадров ${N}, остановок ${STOPS.length}, проходных ${N - chapters.length}.`);
console.log(`Пороги доли экрана: целиком ≥ ${SHARES[0]}, преобладает ≥ ${SHARES[1]}, виден ≥ ${SHARES[2]}.`);

const custom = arg('duration') || arg('pass-cost') || arg('hold');
if (custom) {
  const hold = arg('hold');
  report({
    title: 'Замер',
    note: `переход ${arg('duration') ?? 1000} мс, цена проходного ${arg('pass-cost') ?? PASS_COST}` +
          (hold ? `, задержка ${hold} мс` : ''),
    duration: arg('duration') ?? 1000,
    passCost: arg('pass-cost') ?? PASS_COST,
    dwell: hold ? { hold, ramp: arg('ramp') ?? 130 } : null,
  });
  console.log('');
} else {
  const names = process.argv.slice(2).filter((a) => ORDER.includes(a));
  const list = names.length ? names : ORDER;
  const rows = list.map((key) => [VARIANTS[key], report(VARIANTS[key])]);
  console.log('\nСводка');
  console.log('   ' + '─'.repeat(76));
  console.log('   вариант                        минимум  среднее  максимум   переход  прыжок');
  for (const [v, r] of rows) {
    console.log(`   ${v.title.padEnd(30)}${ms(r.worst)} мс ${ms(r.avg)} мс  ${ms(r.best)} мс` +
                `   ${ms(r.longest)} мс${ms(r.jump, 8)} мс`);
  }
  console.log('\n   ориентир: кадр ≥ 350–400 мс, переход ≤ 2000 мс\n');
}
