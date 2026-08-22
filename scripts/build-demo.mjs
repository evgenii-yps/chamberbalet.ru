/**
 * Демонстрационные сборки перехода.
 *
 *   npm run build && node scripts/build-demo.mjs
 *
 * Результат — .build/demo/: витрина и три страницы, каждая самодостаточная и
 * переносимая. Стили, шрифты, скрипты и фотографии зашиты в документ, ни
 * одного внешнего запроса: страница открывается двойным щелчком с диска,
 * уходит в мессенджер целиком и живёт в любом подкаталоге хостинга.
 *
 *   duration.html   2000 / 2400 / 2800 / 3200 мс — только длительность
 *   curve.html      2800 мс, базовая кривая против уверенной
 *   depth.html      2800 мс, базовая глубина против резкого колена
 *
 * ЧТО ЭТО НЕ ТРОГАЕТ
 *
 * Ни src/, ни dist/. Демонстрации собираются ИЗ готового dist/ — та же
 * страница, те же фотографии, тот же CSS, — и правится в них ровно один файл:
 * flight.js. Правка одна и та же во всех сборках; различаются они только
 * числами в window.__PACE. Значит сравнение честное: разница на экране — это
 * разница чисел, а не разного кода.
 *
 * Числа берутся из scripts/pace-variants.mjs — оттуда же, откуда их берёт
 * scripts/measure-pace.mjs. Замер и то, что видно глазами, не могут разойтись.
 *
 * Кадры берём в 1280 avif: на телефоне это ровно то, что покажет боевая
 * страница, на десктопе — мягче. Темп от разрешения не зависит, а файл
 * остаётся в мегабайт вместо двадцати.
 */
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { ROOT, DIST, BUILD } from './config.mjs';
import {
  BASE_CURVE, BASE_SCALE,
  DURATION_VARIANTS, DURATION_ORDER,
  CURVE_VARIANTS, CURVE_ORDER,
  DEPTH_VARIANTS, DEPTH_ORDER,
  SOURCE_GUARDS,
} from './pace-variants.mjs';

const OUT = path.join(BUILD, 'demo');
const DATA_WIDTH = 1280;

/* ------------------------------------------------------------------ *
 *  Правка flight.js: числа снаружи
 * ------------------------------------------------------------------ */

const PACE_BLOCK = `
/* ── ДЕМО: длительность, кривая и глубина задаются снаружи ────────────
 * Вставка scripts/build-demo.mjs. В боевом коде этого блока нет: там
 * длительность стоит в main.js, а кривая и пресет масштаба — константами
 * выше в этом файле. Здесь они читаются из window.__PACE на каждом кадре
 * отрисовки, поэтому вариант переключается прямо на странице.
 */
const PACE_DEFAULT = { duration: 1000, curve: [0.65, 0.35], scale: SCALE };
const pace = () => ({ ...PACE_DEFAULT, ...(globalThis.__PACE || {}) });
`;

/** Точные куски исходника. Разойдётся — сборка демонстраций упадёт, а не соврёт. */
const PATCHES = [
  ['export const SCALE = { base: 1.04, accel: 0.8, soft: 0.18 };',
   'export const SCALE = { base: 1.04, accel: 0.8, soft: 0.18 };\n' + PACE_BLOCK],

  [`export function scaleAt(t) {
  return SCALE.base * Math.exp(SCALE.accel * softplus(t, SCALE.soft));
}`,
   `export function scaleAt(t) {
  const S = pace().scale;
  return S.base * Math.exp(S.accel * softplus(t, S.soft));
}`],

  ['  const x1 = 0.65, x2 = 0.35;', '  const x1 = pace().curve[0], x2 = pace().curve[1];'],

  ['    const u = duration <= 1 ? 1 : clamp((now - startedAt) / duration, 0, 1);',
   '    const total = pace().duration;\n' +
   '    const u = total <= 1 ? 1 : clamp((now - startedAt) / total, 0, 1);'],

  ['    if (immediate || duration <= 1) {', '    if (immediate || pace().duration <= 1) {'],
];

/**
 * Подпись главы подменяется через CAPTION_SWAP после действия зрителя — сейчас
 * это 240 мс при переходе 1000 мс, то есть 0,24 длительности. Оставить 240 мс
 * при переходе 2800 мс значит показать текст новой главы за две секунды до
 * того, как камера на неё приедет: подпись стоит на месте, а кадр под ней ещё
 * едет. Держим ту же долю, что и в согласованном, — правится число, а не
 * устройство подписи.
 */
const MAIN_PATCHES = [
  ['const CAPTION_SWAP = 240;',
   'const CAPTION_SWAP = 240;\n' +
   'const captionSwap = () => Math.round(((globalThis.__PACE || {}).duration || 1000) * 0.24);'],
  ['    }, CAPTION_SWAP);', '    }, captionSwap());'],
];

function patchWith(source, patches, what) {
  let code = source;
  for (const [from, to] of patches) {
    if (!code.includes(from)) {
      throw new Error(`исходник ${what} разошёлся с правкой демонстраций:\n${from.slice(0, 70)}…`);
    }
    code = code.replace(from, to);
  }
  return code;
}

const patchFlight = (source) => patchWith(source, PATCHES, 'flight.js');
const patchMain = (source) => patchWith(source, MAIN_PATCHES, 'main.js');

/* ------------------------------------------------------------------ *
 *  Плашка переключения
 * ------------------------------------------------------------------ */

function badge(set, order, active, caption) {
  const links = order.map((key) =>
    `<button type="button" data-pace="${key}"` +
    `${key === active ? ' aria-current="true"' : ''}>${set[key].title}</button>`).join('');

  const config = JSON.stringify(Object.fromEntries(order.map((key) => {
    const { duration, curve, scale, title, note } = set[key];
    return [key, { duration, curve, scale, title, note }];
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
@media (max-width: 46rem) {
  .pace-demo { flex-direction: column; align-items: stretch; gap: .35rem; font-size: 10px; padding: .35rem .5rem; }
  .pace-demo__now { white-space: normal; text-align: center; }
}
</style>
<script>
(function () {
  var CONF = ${config};
  var CAPTION = ${JSON.stringify(caption)};
  var box = document.getElementById('pace-demo');
  var now = box.querySelector('.pace-demo__now');
  function apply(key, push) {
    var v = CONF[key];
    if (!v) return;
    window.__PACE = { duration: v.duration, curve: v.curve, scale: v.scale };
    now.innerHTML = '<b>' + v.title + '</b> · ' + v.note;
    box.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-current', b.dataset.pace === key ? 'true' : 'false');
    });
    if (push) { try { history.replaceState(null, '', '#' + key); } catch (e) { /* песочница */ } }
  }
  box.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) apply(b.dataset.pace, true);
  });
  box.title = CAPTION;
  apply((location.hash || '').slice(1) in CONF ? location.hash.slice(1) : '${active}', false);
})();
</script>`;
}

/* ------------------------------------------------------------------ *
 *  Одна страница — одним файлом
 * ------------------------------------------------------------------ */

async function dataUri(file, mime) {
  return `data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`;
}

async function inlineOne(template, jsDir, jsFiles, flightFile, opts) {
  const { set, order, active = order[0], title, caption } = opts;
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
  const modules = ['flight.', 'nav.', 'hero-video.', 'reveal.', 'main.'];
  const parts = [];
  for (const prefix of modules) {
    const file = jsFiles.find((f) => f.startsWith(prefix));
    let code = await fs.readFile(path.join(jsDir, file), 'utf8');
    if (file === flightFile) code = patchFlight(code);
    if (file.startsWith('main.')) code = patchMain(code);
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
    `<title>${title}</title>`,
    `<style>${css}</style>`,
    "<script>document.documentElement.classList.add('js');</script>",
    body,
    badge(set, order, active, caption),
    `<script type="module">${js}</script>`,
  ].join('\n');
}

/* ------------------------------------------------------------------ *
 *  Сборка
 * ------------------------------------------------------------------ */

const PAGES = [
  {
    file: 'duration.html',
    title: 'Длительность перехода',
    caption: 'Одна и та же механика, четыре длительности перехода.',
    set: DURATION_VARIANTS, order: DURATION_ORDER, active: 'd2800',
    about: 'Кривая и глубина как в согласованном, меняется только длительность.',
  },
  {
    file: 'curve.html',
    title: 'Кривая разгона',
    caption: 'Одна длительность, две кривые разгона.',
    set: CURVE_VARIANTS, order: CURVE_ORDER, active: 'confident',
    about: 'Переход 2800 мс. Уверенная кривая трогается раньше и дольше садится на главу; ' +
           'пик скорости при этом не выше базового.',
  },
  {
    file: 'depth.html',
    title: 'Глубина прохода',
    caption: 'Одна длительность и кривая, два пресета масштаба.',
    set: DEPTH_VARIANTS, order: DEPTH_ORDER, active: 'deep',
    about: 'Переход 2800 мс. Опорные точки пресета те же (1,04 и 1,15), резче только колено: ' +
           'кадр дольше стоит на крупности главы и уходит вперёд до 2,6, а не до 1,83.',
  },
];

async function main() {
  try { await fs.access(path.join(DIST, 'index.html')); }
  catch { throw new Error('нет dist/ — сначала npm run build'); }

  for (const guard of SOURCE_GUARDS) {
    const source = fss.readFileSync(path.join(ROOT, guard.file), 'utf8');
    if (!source.includes(guard.text)) {
      throw new Error(`${guard.file} разошёлся с pace-variants.mjs: не найдено «${guard.text}»`);
    }
  }

  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });

  const jsDir = path.join(DIST, 'assets', 'js');
  const jsFiles = await fs.readdir(jsDir);
  const flightFile = jsFiles.find((f) => f.startsWith('flight.'));
  if (!flightFile) throw new Error('в dist/assets/js нет flight.*.js');

  const template = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');

  console.log('\nДемонстрации перехода');
  for (const page of PAGES) {
    const html = await inlineOne(template, jsDir, jsFiles, flightFile, page);
    await fs.writeFile(path.join(OUT, page.file), html);
    console.log(`   ${path.join(OUT, page.file)}   ${page.title}, ` +
                `${(Buffer.byteLength(html) / 1048576).toFixed(1)} МБ`);
  }
  await fs.writeFile(path.join(OUT, 'index.html'), showcase());
  console.log(`   ${path.join(OUT, 'index.html')}   витрина\n`);
}

function showcase() {
  const rows = PAGES.map((p) =>
    `<li><a href="${p.file}"><b>${p.title}</b></a><span>${p.about}</span></li>`).join('');
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Переход между главами — демонстрации</title>
<style>
  body { margin: 0; padding: 2.5rem 1.25rem; background: #070506; color: #F2ECE1;
         font: 16px/1.5 system-ui, sans-serif; }
  main { max-width: 40rem; margin: 0 auto; }
  h1 { font-size: 1.4rem; font-weight: 600; margin: 0 0 .5rem; }
  p { color: #F2ECE1B0; }
  ul { list-style: none; padding: 0; margin: 2rem 0 0; display: grid; gap: .75rem; }
  li { border: 1px solid #F0C07040; border-radius: .5rem; }
  a { display: block; padding: .9rem 1rem .3rem; color: #F2ECE1; text-decoration: none; }
  a b { color: #F0C070; }
  span { display: block; padding: 0 1rem .9rem; color: #F2ECE1A0; font-size: .85rem; }
</style></head>
<body><main>
  <h1>Переход между главами</h1>
  <p>Восемь кадров, восемь глав, проходных кадров нет. Одна и та же страница
     и одна и та же механика; вариант переключается плашкой сверху, без
     перезагрузки.</p>
  <ul>${rows}</ul>
</main></body></html>`;
}

main().catch((e) => { console.error('\nДемонстрации не собрались:', e.message); process.exit(1); });
