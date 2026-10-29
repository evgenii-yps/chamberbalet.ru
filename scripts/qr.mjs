/**
 * QR при сборке: без внешних сервисов. Кодирование — qrcode-generator
 * (devDependency, в браузер не попадает); здесь только вывод в SVG.
 * Тёмные модули сливаются в горизонтальные отрезки: меньше узлов, а номер --i
 * (диагональ) задаёт каскад появления «модулями».
 */
import qrcode from 'qrcode-generator';

export function qrSvg(url, label) {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 3;
  const size = n + quiet * 2;
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!qr.isDark(y, x)) { x++; continue; }
      let len = 0;
      while (x + len < n && qr.isDark(y, x + len)) len++;
      d += `<path d="M${x + quiet} ${y + quiet}h${len}v1h-${len}z" style="--i:${x + y}"/>`;
      x += len;
    }
  }
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#F5EBD1"/><g fill="#131110">${d}</g></svg>`;
}
