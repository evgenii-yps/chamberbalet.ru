/**
 * Инварианты пролёта. Проверяем числом то, что в приёмке записано словами.
 */
import { scaleAt, frameOpacityAt, captionOpacityAt, SCALE, LIVE_RANGE } from '../src/js/flight.js';

const COUNT = 14;
const problems = [];
const ok = (name, value) => console.log('  ', value ? '·' : '×', name);

/** Композит стопки в точке t: 1 означает, что чёрного нигде не видно. */
function composite(t) {
  // Слои идут сверху вниз: ближний кадр лежит поверх дальнего
  let transmitted = 1;
  for (let i = 0; i < COUNT; i++) transmitted *= 1 - frameOpacityAt(t - i);
  return 1 - transmitted;
}

console.log('\nПролёт');

// 1. Фотография никогда не меньше экрана
let minScale = Infinity;
for (let d = -LIVE_RANGE; d <= LIVE_RANGE; d += 0.001) minScale = Math.min(minScale, scaleAt(d));
const scaleOk = minScale >= 1;
ok(`фотография никогда не меньше экрана (минимум ${minScale.toFixed(4)})`, scaleOk);
if (!scaleOk) problems.push(`масштаб опускается до ${minScale.toFixed(4)}`);

// 2. Опорные точки пресета
const anchors = [[-1, SCALE.born], [0, SCALE.rest], [1, SCALE.gone]];
const anchorsOk = anchors.every(([d, v]) => Math.abs(scaleAt(d) - v) < 1e-9);
ok(`пресет проходит через ${anchors.map(([, v]) => v).join(' / ')}`, anchorsOk);
if (!anchorsOk) problems.push('пресет масштаба промахивается мимо опорных точек');

// 3. Монотонность: камера не сдаёт назад
let mono = true;
for (let d = -LIVE_RANGE, prev = 0; d <= LIVE_RANGE; d += 0.001) {
  const s = scaleAt(d); if (s < prev - 1e-9) mono = false; prev = s;
}
ok('масштаб монотонно растёт', mono);
if (!mono) problems.push('масштаб немонотонен');

// 4. Чистая остановка: ровно один слой с непрозрачностью 1
let cleanStops = true;
for (let i = 0; i < COUNT; i++) {
  let full = 0, nonZero = 0;
  for (let j = 0; j < COUNT; j++) {
    const o = frameOpacityAt(i - j);
    if (o === 1) full++;
    if (o > 0) nonZero++;
  }
  if (full !== 1 || nonZero !== 1) cleanStops = false;
}
ok('на каждой остановке ровно один слой с непрозрачностью 1', cleanStops);
if (!cleanStops) problems.push('на остановке видно больше одного слоя');

// 5. Подпись читается ровно одна
let oneCaption = true;
for (let i = 0; i < COUNT; i++) {
  const visible = Array.from({ length: COUNT }, (_, j) => captionOpacityAt(i - j)).filter((c) => c > 0.001);
  if (visible.length !== 1 || Math.abs(visible[0] - 1) > 1e-9) oneCaption = false;
}
ok('на остановке читается ровно одна подпись', oneCaption);
if (!oneCaption) problems.push('на остановке видно больше одной подписи');

// 6. Чёрного провала в середине перехода нет
let worst = 1, worstAt = 0;
for (let t = 0; t <= COUNT - 1; t += 0.0005) {
  const c = composite(t);
  if (c < worst) { worst = c; worstAt = t; }
}
const noGap = worst >= 0.99;
ok(`в середине перехода чёрного провала нет (минимум плотности ${(worst * 100).toFixed(2)} % при t = ${worstAt.toFixed(3)})`, noGap);
if (!noGap) problems.push(`в переходе просвечивает пустота на ${((1 - worst) * 100).toFixed(1)} %`);

// 7. Остановиться между слайдами невозможно — обеспечивается goTo(Math.round)
if (problems.length) {
  console.error('\nНе сходится:');
  problems.forEach((p) => console.error('  ', p));
  process.exit(1);
}
console.log('\n   сходится\n');
