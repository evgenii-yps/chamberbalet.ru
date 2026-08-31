/**
 * Профиль строк по яркости для готового снимка. Браузера не требует.
 *
 * Отвечает на два вопроса: докуда сверху идёт ровное поле (то есть где
 * кончается сплошная заливка и начинается фотография) и где в кадре самые
 * резкие горизонтали. По нему нашлась полоса под шапкой, и по нему же
 * проверяется, что её не стало.
 *
 *     node scripts/qa/band.mjs .build/qa/chapter/chapter1-1920x1080.png
 */
import sharp from 'sharp';
import { rowStats, rowRgb } from './harness.mjs';

const FLAT_SD = 0.0008;
const files = process.argv.slice(2);
if (!files.length) {
  console.error('укажите один или несколько png');
  process.exit(2);
}

for (const file of files) {
  const { data, info } = await sharp(file).toColourspace('srgb')
    .raw().toBuffer({ resolveWithObject: true });
  console.log(`\n${file}  ${info.width} × ${info.height}`);

  let flat = 0;
  while (flat < info.height && rowStats(data, info, flat).sd < FLAT_SD) flat++;
  if (flat) {
    const [r, g, b] = rowRgb(data, info, flat - 1);
    console.log(`   ровное поле сверху до y=${flat - 1}, цвет ${r.toFixed(1)}, ${g.toFixed(1)}, ${b.toFixed(1)}`);
    console.log(`   первая «фотографическая» строка y=${flat}`);
  } else {
    console.log('   ровного поля сверху нет — фотография с первой строки');
  }

  const mid = (y) => { const [r, g, b] = rowRgb(data, info, y); return (r + g + b) / 3; };
  const jumps = [];
  for (let y = 1; y < info.height; y++) jumps.push({ y, d: Math.abs(mid(y) - mid(y - 1)) });
  jumps.sort((a, b) => b.d - a.d);
  console.log('   самые резкие горизонтали (уровней sRGB между соседними строками):');
  for (const j of jumps.slice(0, 5)) console.log(`     y=${String(j.y).padStart(5)}  Δ=${j.d.toFixed(2)}`);
}
console.log();
