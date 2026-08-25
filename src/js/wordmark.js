/**
 * Морфинг названия: заголовок первого экрана и подпись шапки — одно слово,
 * которое едет между двумя положениями, а не появляется и не исчезает.
 *
 * Привод — значение onOpener: flight.js отдаёт его каждый кадр rAF, оно
 * нормировано 1 → 0 и уже несёт кривую пролёта. Параллельного таймера нет
 * намеренно: синхронность с камерой получается по построению, а не подгонкой.
 *
 * Закон масштаба геометрический, а не линейный: size = k^a. Замерено, что
 * даёт линейная интерполяция кегля на 1280 (82,88 → 21 px): скорость сжатия
 * −12,12 % кегля за 100 мс в начале и −47,65 % в конце, разгон вчетверо
 * внутри одного движения — это и читается как рывок. При геометрическом
 * законе скорость постоянна: −22,27 % на всём отрезке. На 320 (25 → 20 px)
 * линейный закон почти равномерен (−3,33 → −4,17), поэтому разница видна
 * только на широких экранах — но закон один на все ширины, отдельных кривых
 * по брейкпоинтам нет.
 *
 * Положение интерполируется линейно: воспринимаемый сдвиг линеен по
 * расстоянию, тогда как воспринимаемый размер логарифмичен. Замерено, что
 * вертикальный ход почти совпадает по ширинам — 58,09 px за 100 мс на 320
 * против 60,42 на 1280, расхождение 4 %, — и именно он несёт основную часть
 * движения.
 */

/** Разрядка в em: подпись и заголовок объявлены по-разному, и промежуточные
 *  кадры должны идти между ними, а не прыгать в конце. */
function trackingEm(cs) {
  const ls = cs.letterSpacing;
  if (ls === 'normal') return 0;
  return parseFloat(ls) / parseFloat(cs.fontSize);
}

/** Границы набранных глифов, а не бокса: бокс строки шире ink на разрядку и
 *  на полусимвольные поля, и сводить положения по нему — та же ошибка знака,
 *  что уже записана в SPEC. */
function inkCentre(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
  if (!rects.length) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const right = Math.max(...rects.map((r) => r.right));
  const top = Math.min(...rects.map((r) => r.top));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

export function createWordmark({ el, line, title }) {
  if (!el || !line || !title) return null;
  let g = null;

  function measure() {
    // Замер идёт в состоянии покоя: матрица снимается, иначе прочитаются
    // координаты предыдущего кадра, помноженные сами на себя.
    const had = el.style.transform;
    el.style.transform = '';
    line.style.letterSpacing = '';
    const restCs = getComputedStyle(line);
    const rest = inkCentre(line);
    const box = el.getBoundingClientRect();
    const headCs = getComputedStyle(title);
    const head = inkCentre(title);
    el.style.transform = had;
    if (!rest || !head) { g = null; return; }
    g = {
      cx: box.left + box.width / 2,
      cy: box.top + box.height / 2,
      rest,
      head,
      k: parseFloat(headCs.fontSize) / parseFloat(restCs.fontSize),
      ls0: trackingEm(restCs),
      ls1: trackingEm(headCs),
    };
  }

  /** a — значение onOpener: 1 на первом экране, 0 на месте подписи. */
  function apply(a) {
    if (!g) measure();
    if (!g) return;
    const s = Math.pow(g.k, a);
    // Куда должен приехать центр ink на этом кадре
    const gx = g.rest.x + (g.head.x - g.rest.x) * a;
    const gy = g.rest.y + (g.head.y - g.rest.y) * a;
    // Решение относительно transform-origin 50% 50%:
    // c + s(p − c) + t = цель
    const tx = gx - g.cx - s * (g.rest.x - g.cx);
    const ty = gy - g.cy - s * (g.rest.y - g.cy);
    if (g.ls0 !== g.ls1) {
      // Разрядка в em, а не в px: её масштабирует тот же transform, и в конце
      // перехода она обязана совпасть с подписью до сотых.
      line.style.letterSpacing = `${(g.ls0 + (g.ls1 - g.ls0) * a).toFixed(5)}em`;
    }
    el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
  }

  return { measure, apply };
}
