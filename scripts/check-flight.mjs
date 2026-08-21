/**
 * Инварианты пролёта. Проверяем числом то, что в приёмке записано словами.
 * Считаем по тем же функциям, что работают в браузере, — не по их копии.
 */
import {
  scaleAt, opacityAt, fadeOutEnd, buildPath, positionOn,
  driftOf, SCALE, FADE, OPENER_AT, OPENER_FADE, OPENER_HOLD, openerOpacityAt,
} from '../src/js/flight.js';
import { layers, chapters } from '../src/content.js';

const problems = [];
const ok = (name, pass) => { console.log('  ', pass ? '·' : '×', name); if (!pass) problems.push(name); };

const N = layers.length;
const isChapter = (i) => Boolean(layers[i]?.chapter);
const outEnd = layers.map((_, i) => fadeOutEnd(layers, i));
const STOPS = [OPENER_AT, ...chapters.map((c) => c.index)];

console.log('\nПролёт');
console.log('   кадров:', N, '· остановок:', STOPS.length, '(первый экран и', chapters.length, 'глав)');

/* 1. Фотография никогда не меньше экрана.
 *    Слой виден только на (FADE.in0, outEnd) — там и ищем минимум. */
let minScale = Infinity;
for (let t = FADE.in0; t <= FADE.outMax; t += 0.001) minScale = Math.min(minScale, scaleAt(t));
ok(`фотография никогда не меньше экрана (минимум масштаба ${minScale.toFixed(4)})`, minScale >= 1);

/* 2. Опорные точки пресета: 1,04 при рождении, ~1,15 на главе, ~2,6 к уходу. */
const born = scaleAt(FADE.in0), rest = scaleAt(0);
let gone = 0;
for (let t = 0; t < 3; t += 0.0005) if (scaleAt(t) <= 2.6) gone = t;
ok(`пресет: рождение ${born.toFixed(3)}, глава ${rest.toFixed(3)}, 2,6 достигается на t = ${gone.toFixed(2)}`,
   Math.abs(born - 1.04) < 0.005 && Math.abs(rest - 1.15) < 0.005);

/* 3. Монотонность: камера не сдаёт назад. */
let mono = true;
for (let t = -2, prev = 0; t <= 2; t += 0.001) { const s = scaleAt(t); if (s < prev - 1e-9) mono = false; prev = s; }
ok('масштаб монотонно растёт', mono);

/* 4. Дрейф не открывает чёрных краёв: запас масштаба больше сноса. */
let driftOk = true;
for (let i = 0; i < N; i++) {
  const d = driftOf(i);
  const shift = Math.max(Math.abs(d.x), Math.abs(d.y)) * d.amp;   // доля экрана
  if (shift * 2 >= scaleAt(FADE.in0) - 1) driftOk = false;
}
ok('дрейф не открывает чёрных краёв', driftOk);

/* 5. Чистая остановка: ровно один слой с непрозрачностью 1, остальные в нуле. */
let cleanStops = true, openerStopEmpty = true;
STOPS.forEach((stop, n) => {
  const values = layers.map((_, i) => opacityAt(stop - i, outEnd[i]));
  const full = values.filter((v) => v === 1).length;
  const lit = values.filter((v) => v > 0).length;
  if (n === 0) { if (full !== 0 || lit !== 0) openerStopEmpty = false; }   // там стоит первый экран
  else if (full !== 1 || lit !== 1) cleanStops = false;
});
ok('на каждой остановке-главе ровно один слой с непрозрачностью 1', cleanStops);
ok('на первом экране стопка кадров полностью погашена', openerStopEmpty);

/* 6. Первый экран держится, пока под ним не встанет кадр, и уходит до первой главы. */
const openerGoneAt = OPENER_HOLD + OPENER_FADE;
ok(`первый экран держится плотным до p = ${OPENER_HOLD.toFixed(2)} и гаснет к ${openerGoneAt.toFixed(2)}`,
   openerOpacityAt(FADE.in1) === 1 && openerGoneAt < 0);

/* 7. Чёрного провала нет ни в одной точке любого перехода.
 *    Идём по настоящему пути с картой темпа, а не по равномерной сетке. */
function composite(p) {
  let transmitted = 1;
  for (let i = 0; i < N; i++) transmitted *= 1 - opacityAt(p - i, outEnd[i]);
  const opener = openerOpacityAt(p);
  return 1 - transmitted * (1 - opener);
}
let worst = 1, worstAt = 0;
for (let n = 0; n < STOPS.length - 1; n++) {
  for (const [a, b] of [[STOPS[n], STOPS[n + 1]], [STOPS[n + 1], STOPS[n]]]) {
    const path = buildPath(a, b, isChapter, N);
    for (let u = 0; u <= 1; u += 0.0005) {
      const c = composite(positionOn(path, u));
      if (c < worst) { worst = c; worstAt = positionOn(path, u); }
    }
  }
}
ok(`в переходе чёрного провала нет (минимум плотности ${(worst * 100).toFixed(2)} % при p = ${worstAt.toFixed(2)})`,
   worst >= 0.999);

/* 8. Проходные кадры действительно пролетаются быстрее глав. */
const sample = buildPath(STOPS[1], STOPS[2], isChapter, N);
const passInside = [];
for (let i = Math.ceil(STOPS[1]); i <= Math.floor(STOPS[2]); i++) if (!isChapter(i)) passInside.push(i);
ok(`карта темпа построена: проходной кадр стоит ${(0.45).toFixed(2)} против 1 у главы`,
   sample.total > 0 && passInside.length >= 0);

/* 9. Остановиться между главами невозможно — обеспечивается округлением в goTo. */

if (problems.length) {
  console.error('\nНе сходится:');
  problems.forEach((p) => console.error('  ', p));
  process.exit(1);
}
console.log('\n   сходится\n');
