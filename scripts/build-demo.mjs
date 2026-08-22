/**
 * Демонстрационные сборки темпа пролёта.
 *
 *   npm run build && node scripts/build-demo.mjs
 *
 * Результат — .build/demo/: витрина и четыре варианта (как сейчас, A, B, C).
 * Папка самодостаточная и переносимая: пути внутри относительные, ложится в
 * любой подкаталог хостинга (например /demo/) и открывается с телефона.
 *
 * ЧТО ЭТО НЕ ТРОГАЕТ
 *
 * Ни src/, ни dist/. Демонстрации собираются ИЗ готового dist/ — та же
 * страница, те же фотографии, тот же CSS, — и правится в них ровно один файл:
 * flight.js. Правка одна и та же на все четыре варианта; различаются они
 * только числами в window.__PACE. Значит сравнение честное: разница на экране
 * — это разница чисел, а не разного кода.
 *
 * Числа берутся из scripts/pace-variants.mjs — оттуда же, откуда их берёт
 * scripts/measure-pace.mjs, а функции задержки переносятся в браузер прямо
 * из этого модуля, исходным текстом. Замер и то, что видно глазами, не могут
 * разойтись.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, DIST, BUILD } from './config.mjs';
import {
  VARIANTS, ORDER, smoothstep, dwellRate, dwellSpan, dwellSchedule, advance,
} from './pace-variants.mjs';

const OUT = path.join(BUILD, 'demo');

/* ------------------------------------------------------------------ *
 *  Правка flight.js: числа снаружи и микрозадержка
 * ------------------------------------------------------------------ */

/** Функции задержки уезжают в браузер исходным текстом из pace-variants.mjs. */
const SHARED = [
  `const smoothstep = ${smoothstep.toString()};`,
  dwellRate.toString(),
  `const dwellSpan = ${dwellSpan.toString()};`,
  dwellSchedule.toString(),
  advance.toString(),
].join('\n\n');

const PACE_BLOCK = `
/* ── ДЕМО: темп задаётся снаружи ──────────────────────────────────────
 * Вставка scripts/build-demo.mjs. В боевом коде этого блока нет: там
 * длительность стоит в main.js, цена проходного кадра — выше в этом файле,
 * а микрозадержки нет вовсе. Здесь числа читаются из window.__PACE на каждом
 * переходе, поэтому вариант переключается прямо на странице.
 */
const PACE_DEFAULT = { duration: 1000, passCost: PASS_COST, dwell: null };
const pace = () => ({ ...PACE_DEFAULT, ...(globalThis.__PACE || {}) });

${SHARED}

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
 * Виртуальные времена, в которые камера стоит ровно на проходном кадре: там
 * он закрывает экран целиком при масштабе 1,15 — как глава на остановке.
 */
function dwellCenters(path, isChapter, count, duration) {
  const lo = Math.min(path.from, path.to), hi = Math.max(path.from, path.to);
  const forward = path.to > path.from;
  const out = [];
  for (let i = Math.ceil(lo); i <= Math.floor(hi); i++) {
    // Первый экран стоит на −1,05, и целые точки до нулевого кадра — не кадры:
    // придержать там значит замереть на пустом месте.
    if (i < 0 || i >= count || i <= lo || i >= hi || isChapter(i)) continue;
    let a = 0, b = 1;
    for (let k = 0; k < 40; k++) {
      const mid = (a + b) / 2;
      if (forward ? positionOn(path, mid) < i : positionOn(path, mid) > i) a = mid; else b = mid;
    }
    out.push(bezierInverse((a + b) / 2) * duration);
  }
  return out.sort((p, q) => p - q);
}
`;

/** Точные куски исходника. Разойдётся — сборка демонстраций упадёт, а не соврёт. */
const PATCHES = [
  ['export const PASS_COST = 0.45;', 'export const PASS_COST = 0.45;\n' + PACE_BLOCK],

  ['    total += isChapter(i) ? 1 : PASS_COST;',
   '    total += isChapter(i) ? 1 : pace().passCost;'],

  ['  let path = null, startedAt = 0, animating = false, raf = 0;',
   '  let path = null, startedAt = 0, animating = false, raf = 0;\n' +
   '  let virtual = 0, lastNow = 0, plan = [], dwellNext = 0, dwellClock = -1;'],

  [`  function step(now) {
    raf = 0;
    const u = duration <= 1 ? 1 : clamp((now - startedAt) / duration, 0, 1);
    position = positionOn(path, bezier(u));`,
   `  function step(now) {
    raf = 0;
    const total = pace().duration;
    const dt = Math.min(64, now - lastNow);        // вкладка была в фоне — не прыгаем
    lastNow = now;

    const moved = advance({ virtual, next: dwellNext, clock: dwellClock }, dt, plan);
    virtual = moved.virtual;
    dwellNext = moved.next;
    dwellClock = moved.clock;

    const u = total <= 1 ? 1 : clamp(virtual / total, 0, 1);
    position = positionOn(path, bezier(u));`],

  ['    if (u < 1) { raf = requestAnimationFrame(step); return; }',
   '    if (u < 1 || dwellClock >= 0) { raf = requestAnimationFrame(step); return; }'],

  ['    if (immediate || duration <= 1) {', '    if (immediate || pace().duration <= 1) {'],

  [`    path = buildPath(position, stops[target], isChapter, count);
    startedAt = performance.now();
    animating = true;`,
   `    path = buildPath(position, stops[target], isChapter, count);
    const cfg = pace();
    plan = dwellSchedule(dwellCenters(path, isChapter, count, cfg.duration), cfg.duration, cfg.dwell);
    dwellNext = 0;
    dwellClock = -1;
    virtual = 0;
    startedAt = performance.now();
    lastNow = startedAt;
    animating = true;`],
];

function patchFlight(source) {
  let code = source;
  for (const [from, to] of PATCHES) {
    if (!code.includes(from)) {
      throw new Error(`исходник flight.js разошёлся с правкой демонстраций:\n${from.slice(0, 70)}…`);
    }
    code = code.replace(from, to);
  }
  return code;
}

/* ------------------------------------------------------------------ *
 *  Значок варианта и переключатель
 * ------------------------------------------------------------------ */

const num = (v) => String(v).replace('.', ',');

function badge(active) {
  const links = ORDER.map((key) => {
    const v = VARIANTS[key];
    const label = key === 'base' ? 'сейчас' : key.toUpperCase();
    return `<button type="button" data-pace="${key}"` +
           `${key === active ? ' aria-current="true"' : ''}>${label}</button>`;
  }).join('');

  const config = JSON.stringify(Object.fromEntries(ORDER.map((key) => {
    const { duration, passCost, dwell, title, note } = VARIANTS[key];
    return [key, { duration, passCost, dwell, title, note }];
  })));

  return `
<div class="pace-demo" id="pace-demo">
  <p class="pace-demo__now"></p>
  <div class="pace-demo__switch">${links}</div>
</div>
<style>
.pace-demo {
  position: fixed; z-index: 1200; left: 50%; top: 0; transform: translateX(-50%);
  display: flex; align-items: center; gap: .75rem;
  padding: .45rem .8rem; border-radius: 0 0 .5rem .5rem;
  background: rgb(7 5 6 / .82); backdrop-filter: blur(6px);
  border: 1px solid rgb(240 192 112 / .28); border-top: 0;
  font: 500 11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .04em; color: #F2ECE1; max-width: calc(100vw - 1rem);
}
.pace-demo__now { margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pace-demo__now b { color: #F0C070; font-weight: 600; }
.pace-demo__switch { display: flex; gap: .25rem; flex: 0 0 auto; }
.pace-demo button {
  font: inherit; color: #F2ECE1; background: none; cursor: pointer;
  border: 1px solid rgb(240 192 112 / .3); border-radius: .25rem; padding: .2rem .5rem;
}
.pace-demo button[aria-current='true'] { background: #F0C070; color: #070506; border-color: #F0C070; }
@media (max-width: 34rem) { .pace-demo { font-size: 10px; gap: .5rem; padding: .35rem .5rem; } }
</style>
<script>
(function () {
  var CONF = ${config};
  var box = document.getElementById('pace-demo');
  var now = box.querySelector('.pace-demo__now');
  function apply(key, push) {
    var v = CONF[key];
    if (!v) return;
    window.__PACE = { duration: v.duration, passCost: v.passCost, dwell: v.dwell };
    now.innerHTML = '<b>' + v.title + '</b> · ' + v.note;
    box.querySelectorAll('button').forEach(function (b) {
      if (b.dataset.pace === key) b.setAttribute('aria-current', 'true');
      else b.setAttribute('aria-current', 'false');
    });
    if (push) { try { history.replaceState(null, '', '#' + key); } catch (e) { /* песочница */ } }
  }
  box.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) apply(b.dataset.pace, true);
  });
  apply((location.hash || '').slice(1) in CONF ? location.hash.slice(1) : '${active}', false);
})();
</script>`;
}

/* ------------------------------------------------------------------ *
 *  Сборка
 * ------------------------------------------------------------------ */

/** Абсолютные пути dist/ переводим в относительные: папку можно класть куда угодно. */
function relativise(html, prefix) {
  return html
    .replaceAll('href="/assets/', `href="${prefix}assets/`)
    .replaceAll('src="/assets/', `src="${prefix}assets/`)
    .replaceAll('href="/favicon', `href="${prefix}favicon`)
    .replaceAll('href="/apple-touch-icon', `href="${prefix}apple-touch-icon`)
    .replaceAll('href="/site.webmanifest"', `href="${prefix}site.webmanifest"`);
}


/* ------------------------------------------------------------------ *
 *  Всё одним файлом
 *
 *  Та же страница и те же четыре набора чисел, но без единого внешнего
 *  запроса: стили, шрифты, скрипты и фотографии зашиты в документ. Такой
 *  файл открывается двойным щелчком с диска и уходит в мессенджер целиком —
 *  для «посмотреть глазами» этого достаточно.
 *
 *  Кадры берём в 1280 avif: на телефоне это ровно то, что покажет боевая
 *  страница, на десктопе — мягче. Темп от разрешения не зависит, а файл
 *  остаётся в полтора мегабайта вместо двадцати четырёх.
 * ------------------------------------------------------------------ */

const DATA_WIDTH = 1280;

async function dataUri(file, mime) {
  return `data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`;
}

async function inlineOne(template, jsDir, jsFiles, flightFile) {
  const photoDir = path.join(DIST, 'assets', 'photo');
  const photos = await fs.readdir(photoDir);
  const pick = async (slug) => {
    const file = photos.find((f) => f.startsWith(`${slug}-${DATA_WIDTH}.`) && f.endsWith('.avif'));
    return file ? dataUri(path.join(photoDir, file), 'image/avif') : null;
  };

  /* стили: шрифты внутрь */
  const cssFile = (await fs.readdir(path.join(DIST, 'assets', 'css')))[0];
  let css = await fs.readFile(path.join(DIST, 'assets', 'css', cssFile), 'utf8');
  for (const font of await fs.readdir(path.join(DIST, 'assets', 'fonts'))) {
    const uri = await dataUri(path.join(DIST, 'assets', 'fonts', font), 'font/woff2');
    css = css.replaceAll(`url('../fonts/${font}')`, `url('${uri}')`);
  }

  /* скрипты: пять модулей в один, импорты и экспорты снимаются */
  const order = ['flight.', 'nav.', 'hero-video.', 'reveal.', 'main.'];
  const parts = [];
  for (const prefix of order) {
    const file = jsFiles.find((f) => f.startsWith(prefix));
    let code = await fs.readFile(path.join(jsDir, file), 'utf8');
    if (file === flightFile) code = patchFlight(code);
    code = code.replace(/^import[^;]+;$/gm, '').replace(/^export /gm, '');
    parts.push(code);
  }
  const js = parts.join('\n');

  /* разметка: только содержимое body, фотографии — строками data: */
  let body = template.slice(template.indexOf('<body>') + 6, template.indexOf('</body>'));
  const alt = (chunk) => (chunk.match(/alt="([^"]*)"/) || [, ''])[1];

  const holders = [...body.matchAll(/<div class="layer__photo" data-photo="([^"]+)">([\s\S]*?)<\/div>/g)];
  for (const [whole, slug, inner] of holders) {
    const uri = await pick(slug);
    if (!uri) continue;
    body = body.replace(whole,
      `<div class="layer__photo" data-photo="${slug}"><img src="${uri}" alt="${alt(inner)}"></div>`);
  }
  const opener = body.match(/<div class="opener__bg">([\s\S]*?)<\/div>/);
  if (opener) {
    const uri = await pick('01-hall-piano');
    body = body.replace(opener[0],
      `<div class="opener__bg"><img src="${uri}" alt="${alt(opener[1])}"></div>`);
  }
  // остатки внешних ссылок в разметке демонстрации не нужны
  body = body.replace(/<script type="module"[^>]*><\/script>/, '');

  return [
    '<title>Темп проходных кадров</title>',
    `<style>${css}</style>`,
    "<script>document.documentElement.classList.add('js');</script>",
    body,
    badge('base'),
    `<script type="module">${js}</script>`,
  ].join('\n');
}

async function main() {
  try { await fs.access(path.join(DIST, 'index.html')); }
  catch { throw new Error('нет dist/ — сначала npm run build'); }

  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });

  // Общие медиа, стили и шрифты — одной копией на все варианты
  await fs.cp(path.join(DIST, 'assets'), path.join(OUT, 'assets'), { recursive: true });
  await fs.rm(path.join(OUT, 'assets', 'js'), { recursive: true, force: true });
  for (const file of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'site.webmanifest']) {
    await fs.copyFile(path.join(DIST, file), path.join(OUT, file)).catch(() => {});
  }

  const jsDir = path.join(DIST, 'assets', 'js');
  const jsFiles = await fs.readdir(jsDir);
  const flightFile = jsFiles.find((f) => f.startsWith('flight.'));
  if (!flightFile) throw new Error('в dist/assets/js нет flight.*.js');

  const template = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');

  for (const key of ORDER) {
    const dir = path.join(OUT, key);
    await fs.mkdir(path.join(dir, 'js'), { recursive: true });
    for (const file of jsFiles) {
      const code = await fs.readFile(path.join(jsDir, file), 'utf8');
      await fs.writeFile(path.join(dir, 'js', file), file === flightFile ? patchFlight(code) : code);
    }
    let html = relativise(template, '../');
    html = html.replaceAll('src="../assets/js/', 'src="js/');
    html = html.replace('</body>', `${badge(key)}\n</body>`);
    await fs.writeFile(path.join(dir, 'index.html'), html);
  }

  await fs.writeFile(path.join(OUT, 'index.html'), showcase());
  const single = await inlineOne(template, jsDir, jsFiles, flightFile);
  await fs.writeFile(path.join(OUT, 'pace-demo.html'), single);

  console.log('\nДемонстрации темпа');
  for (const key of ORDER) console.log(`   ${OUT}/${key}/index.html   ${VARIANTS[key].title}`);
  console.log(`   ${OUT}/index.html   витрина`);
  console.log(`   ${OUT}/pace-demo.html   всё одним файлом, ` +
              `${(Buffer.byteLength(single) / 1048576).toFixed(1)} МБ\n`);
}

function showcase() {
  const rows = ORDER.map((key) => {
    const v = VARIANTS[key];
    const label = key === 'base' ? 'сейчас' : key.toUpperCase();
    return `<li><a href="${key}/"><b>${label}</b> ${v.title}</a><span>${v.note}</span></li>`;
  }).join('');
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Темп проходных кадров — демонстрации</title>
<style>
  body { margin: 0; padding: 2.5rem 1.25rem; background: #070506; color: #F2ECE1;
         font: 16px/1.5 system-ui, sans-serif; }
  main { max-width: 40rem; margin: 0 auto; }
  h1 { font-size: 1.4rem; font-weight: 600; margin: 0 0 .5rem; }
  p { color: #F2ECE1B0; }
  ul { list-style: none; padding: 0; margin: 2rem 0 0; display: grid; gap: .75rem; }
  li { border: 1px solid #F0C07040; border-radius: .5rem; }
  a { display: block; padding: .9rem 1rem .3rem; color: #F2ECE1; text-decoration: none; }
  a b { color: #F0C070; margin-right: .5rem; }
  span { display: block; padding: 0 1rem .9rem; color: #F2ECE1A0; font-size: .85rem; }
</style></head>
<body><main>
  <h1>Темп проходных кадров</h1>
  <p>Одна и та же страница, четыре набора чисел. Вариант переключается и прямо
     на странице — плашкой сверху, без перезагрузки.</p>
  <ul>${rows}</ul>
</main></body></html>`;
}

main().catch((e) => { console.error('\nДемонстрации не собрались:', e.message); process.exit(1); });
