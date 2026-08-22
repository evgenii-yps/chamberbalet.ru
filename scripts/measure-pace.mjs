/**
 * Сколько длится переход и сколько кадр держит экран.
 *
 * Считаем по тем же функциям, что работают в браузере (src/js/flight.js):
 * профиль прозрачности opacityAt, окна ухода fadeOutEnd, карта темпа
 * buildPath/positionOn, первый экран openerOpacityAt. Кривая разгона и пресет
 * масштаба вынесены в scripts/pace-variants.mjs, потому что варианты меняют
 * именно их; числа боевого файла сверяются с исходником при запуске.
 *
 * Доля экрана у кадра i — его собственная плотность за вычетом того, что
 * загораживают слои ближе к камере (кадры с меньшим номером и первый экран):
 *
 *     share(i) = opacity(i) · (1 − opener) · Π (1 − opacity(j)),  j < i
 *
 * Пока share ≥ 0,98, кадр закрывает экран один и целиком.
 *
 *   node scripts/measure-pace.mjs                все три набора
 *   node scripts/measure-pace.mjs duration       только длительности
 *   node scripts/measure-pace.mjs --duration=2600 --curve=.4,.15
 *                                                произвольная комбинация
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  opacityAt, fadeOutEnd, buildPath, positionOn, OPENER_AT, OPENER_HOLD,
  openerOpacityAt, SCALE,
} from '../src/js/flight.js';
import { layers, chapters } from '../src/content.js';
import {
  BASE_CURVE, BASE_SCALE, DURATION_VARIANTS, DURATION_ORDER,
  CURVE_VARIANTS, CURVE_ORDER, DEPTH_VARIANTS, DEPTH_ORDER,
  bezierWith, scaleWith, SOURCE_GUARDS,
} from './pace-variants.mjs';
import { ROOT } from './config.mjs';

/* ---------- копии не могут разойтись с боевым файлом незамеченными ---------- */
for (const guard of SOURCE_GUARDS) {
  const source = fs.readFileSync(path.join(ROOT, guard.file), 'utf8');
  if (!source.includes(guard.text)) {
    console.error(`\n${guard.file} разошёлся с pace-variants.mjs: не найдено «${guard.text}»`);
    process.exit(1);
  }
}
for (const key of ['base', 'accel', 'soft']) {
  if (SCALE[key] !== BASE_SCALE[key]) {
    console.error(`\nпресет масштаба разошёлся: SCALE.${key} = ${SCALE[key]}, а в pace-variants ${BASE_SCALE[key]}`);
    process.exit(1);
  }
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
  let blocked = 1 - openerOpacityAt(position);
  for (let j = 0; j < i; j++) blocked *= 1 - opacityAt(position - j, OUT_END[j]);
  return opacityAt(position - i, OUT_END[i]) * blocked;
}

/**
 * Прогон отрезка пути. Копит по каждому кадру время над каждым порогом и
 * диапазон масштаба, пока кадр держит экран целиком.
 */
function run(from, to, { duration, curve, scale }, acc) {
  const path = buildPath(from, to, isChapter, N);
  for (let t = 0; t <= duration; t += STEP_MS) {
    const u = duration <= 0 ? 1 : Math.min(t / duration, 1);
    const position = positionOn(path, bezierWith(u, curve[0], curve[1]));
    for (let i = 0; i < N; i++) {
      const s = shareOf(position, i);
      if (s < SHARES.at(-1)) continue;
      const row = acc.held.get(i) ?? SHARES.map(() => 0);
      SHARES.forEach((threshold, k) => { if (s >= threshold) row[k] += STEP_MS; });
      acc.held.set(i, row);
      if (s >= SHARES[0]) {
        const sc = scaleWith(position - i, scale);
        const r = acc.scale.get(i) ?? [Infinity, -Infinity];
        acc.scale.set(i, [Math.min(r[0], sc), Math.max(r[1], sc)]);
      }
    }
  }
  return duration;
}

/** Проход всех восьми глав подряд: без пауз на остановках, одно действие за другим. */
function wholePass(variant) {
  const acc = { held: new Map(), scale: new Map() };
  let total = 0;
  for (let n = 0; n < STOPS.length - 1; n++) total += run(STOPS[n], STOPS[n + 1], variant, acc);
  return { acc, total };
}

/**
 * Первый переход: первый экран → первая глава.
 *
 * Первый экран стоит на −1,05 и держится плотным до −0,80 (OPENER_HOLD): до
 * этой точки под ним ничего не видно, кадр только проявляется, и экран
 * визуально неподвижен. Это четверть пути, а по времени — заметно больше:
 * кривая на старте пологая. Чем длиннее переход, тем дольше эта неподвижность,
 * и считать её надо числом, а не на глазок: только у ЭТОГО перехода она есть,
 * между главами такого участка нет.
 */
function deadStart({ duration, curve }) {
  const path = buildPath(STOPS[0], STOPS[1], isChapter, N);
  let lo = 0, hi = 1;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (positionOn(path, bezierWith(mid, curve[0], curve[1])) < OPENER_HOLD) lo = mid; else hi = mid;
  }
  return ((lo + hi) / 2) * duration;
}

/** Дальний прыжок: Home, End, щелчок по крайней точке рельса — один переход. */
function jump(variant) {
  const acc = { held: new Map(), scale: new Map() };
  const total = run(STOPS[1], STOPS.at(-1), variant, acc);
  const inside = [];
  for (let i = 1; i < N - 1; i++) {
    const row = acc.held.get(i);
    if (row) inside.push(row[0]);
  }
  return { total, inside };
}

const ms = (v, w = 4) => String(Math.round(v)).padStart(w);
const secs = (v) => (v / 1000).toFixed(1).replace('.', ',');

function report(variant) {
  console.log(`\n${variant.title}`);
  console.log(`   ${variant.note}`);
  console.log('   ' + '─'.repeat(74));
  console.log('   кадр  глава            экран целиком  преобладает   виден   масштаб');

  const { acc, total } = wholePass(variant);

  // У последнего кадра выхода нет: пролёт на нём кончается, и он стоит,
  // пока зритель не уйдёт в секции. Его в сводку по «держит экран» не берём.
  const held = [];
  for (let i = 0; i < N; i++) {
    const row = acc.held.get(i);
    if (!row) continue;
    const sc = acc.scale.get(i);
    const label = layers[i].chapter.kicker;
    const last = i === N - 1;
    console.log(
      `   ${String(i).padStart(4)}  ${label.padEnd(16)}` +
      `${last ? '   без выхода' : ms(row[0]) + ' мс     '}  ${ms(row[1])} мс    ${ms(row[2])} мс   ` +
      `${sc ? `${sc[0].toFixed(2)}–${sc[1].toFixed(2)}` : '  —'}`);
    if (!last) held.push(row[0]);
  }

  const worst = Math.min(...held), best = Math.max(...held);
  const avg = held.reduce((s, v) => s + v, 0) / held.length;
  const far = jump(variant);

  console.log('   ' + '─'.repeat(74));
  console.log(`   переход между соседними главами: ${ms(variant.duration)} мс`);
  console.log(`   кадр держит экран целиком: ${ms(worst)}–${ms(best)} мс, в среднем ${ms(avg)} мс`);
  console.log(`   восемь глав подряд, без пауз: ${secs(total)} с (8 × ${variant.duration} мс)`);
  console.log(`   первый переход: экран неподвижен первые ${ms(deadStart(variant))} мс — ` +
              `первый экран держится плотным, пока кадр под ним не проявится`);
  console.log(`   дальний прыжок (Home, End, крайняя точка рельса): ${ms(far.total)} мс, ` +
              `промежуточный кадр держит экран ${ms(Math.min(...far.inside))}–${ms(Math.max(...far.inside))} мс`);
  return { duration: variant.duration, worst, avg, best, total, jumpHold: Math.min(...far.inside) };
}

function summary(rows) {
  console.log('\nСводка');
  console.log('   ' + '─'.repeat(74));
  console.log('   вариант                  переход   кадр целиком      восемь глав   прыжок');
  for (const [v, r] of rows) {
    console.log(`   ${v.title.padEnd(24)}${ms(r.duration)} мс  ${ms(r.worst)}–${ms(r.best)} мс   ` +
                `${secs(r.total).padStart(8)} с   ${ms(r.jumpHold)} мс/кадр`);
  }
}

/* ------------------------------ запуск ------------------------------ */

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : null;
};

console.log(`\nКадров ${N}, остановок ${STOPS.length}: первый экран и ${chapters.length} глав.`);
console.log('Кадров без главы нет: один кадр — одна остановка, переход всегда на соседний.');
console.log(`Пороги доли экрана: целиком ≥ ${SHARES[0]}, преобладает ≥ ${SHARES[1]}, виден ≥ ${SHARES[2]}.`);

if (arg('duration') || arg('curve')) {
  const curve = arg('curve') ? arg('curve').split(',').map(Number) : BASE_CURVE;
  const duration = Number(arg('duration') ?? 2800);
  report({
    title: 'Замер',
    note: `переход ${duration} мс, кривая cubic-bezier(${curve[0]}, 0, ${curve[1]}, 1)`,
    duration, curve, scale: BASE_SCALE,
  });
  console.log('');
} else {
  const want = process.argv.slice(2);
  const sets = [
    ['duration', 'Длительность перехода', DURATION_VARIANTS, DURATION_ORDER],
    ['curve', 'Кривая разгона', CURVE_VARIANTS, CURVE_ORDER],
    ['depth', 'Глубина прохода', DEPTH_VARIANTS, DEPTH_ORDER],
  ].filter(([key]) => !want.length || want.includes(key));

  for (const [, title, set, order] of sets) {
    console.log(`\n\n══ ${title} ` + '═'.repeat(Math.max(0, 60 - title.length)));
    summary(order.map((key) => [set[key], report(set[key])]));
  }
  console.log('');
}
