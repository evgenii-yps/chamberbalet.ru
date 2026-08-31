/**
 * Приёмка правки 06. Числа, а не «готово».
 * Скриншоты — .build/accept/, отчёт — в консоль и accept.json.
 */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs/promises'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.build', 'accept');
await fs.mkdir(OUT, { recursive: true });

const T = { '.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif',
  '.woff2':'font/woff2','.ico':'image/x-icon','.xml':'application/xml','.txt':'text/plain',
  '.webmanifest':'application/manifest+json','.mp4':'video/mp4' };

const requests = [];
const server = http.createServer(async (q, s) => {
  const u = decodeURIComponent((q.url || '/').split('?')[0]);
  const fp = path.join(DIST, u === '/' ? 'index.html' : u);
  try {
    const b = await fs.readFile(fp);
    requests.push({ url: u, bytes: b.length });
    s.writeHead(200, { 'Content-Type': T[path.extname(fp)] || 'application/octet-stream' });
    s.end(b);
  } catch { s.writeHead(404).end('404'); }
});
await new Promise((r) => server.listen(4200, r));
const URL = 'http://localhost:4200/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(pass ? ' ·' : ' ×', name, detail ? '— ' + detail : '');
};

/* ── измеритель контраста по реальным пикселям ────────────────────────── */
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [h, l] = a > b ? [a, b] : [b, a]; return (h + 0.05) / (l + 0.05); };

/** Контраст текста элемента: пик яркости внутри его глифов против фона рядом. */
async function contrastOf(page, selector) {
  const box = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = document.createRange(); r.selectNodeContents(el);
    const rects = [...r.getClientRects()].filter((x) => x.width > 2 && x.height > 2);
    if (!rects.length) return null;
    const b = rects[0];
    return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
  }, selector);
  if (!box || box.w < 3 || box.h < 3) return null;

  const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
  const bgShot = await page.screenshot({ clip: { x: Math.max(0, box.x - 12), y: box.y, width: 6, height: box.h } });
  const { default: sharp } = await import('sharp');
  const px = async (buf) => {
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const out = [];
    for (let i = 0; i < data.length; i += info.channels) out.push(L(data[i], data[i + 1], data[i + 2]));
    return out;
  };
  const fg = await px(shot);
  const bg = await px(bgShot);
  bg.sort((a, b) => a - b);
  return { peak: Math.max(...fg), bg: bg[Math.floor(bg.length / 2)], ratio: ratio(Math.max(...fg), bg[Math.floor(bg.length / 2)]) };
}

/** Доводит страницу до текстовых секций тем же путём, что и зритель. */
async function toSections(page) {
  await page.waitForTimeout(1200);
  await page.keyboard.press('End');
  await page.waitForTimeout(3300);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(1600);
}

/* ══ 1. Контраст в текстовых секциях (блок B) ════════════════════════════ */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await toSections(page);
  await page.evaluate(() => document.getElementById('trebovaniya').scrollIntoView());
  await page.waitForTimeout(800);

  console.log('\n1. Контраст в области реального текста (пик глифов против фона рядом)');
  const probes = [
    ['заголовок секции «Что нужно от зала»', '#trebovaniya .section__title'],
    ['тело абзаца', '#trebovaniya .group:last-child .group__body'],
    ['надзаголовок брасом «АРТИСТЫ»', '#trebovaniya .group:last-child .group__title'],
    ['значение «70 минут»', '#trebovaniya .params tbody tr:first-child td'],
  ];
  for (const [name, sel] of probes) {
    await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }), sel);
    await page.waitForTimeout(350);
    const c = await contrastOf(page, sel);
    check(name, c && c.ratio >= 4.5, c ? `${c.ratio.toFixed(2)} : 1` : 'не найдено');
  }
  // Тот же селектор в двух местах экрана обязан дать одно число
  await page.evaluate(() => document.getElementById('trebovaniya').scrollIntoView());
  await page.waitForTimeout(500);
  const top = await contrastOf(page, '#trebovaniya .group:first-child .group__title');
  const bottom = await contrastOf(page, '#trebovaniya .group:last-child .group__title');
  const spread = Math.abs(top.ratio - bottom.ratio);
  check('один селектор .group__title вверху и внизу экрана даёт одно число',
        spread < 0.5, `${top.ratio.toFixed(2)} и ${bottom.ratio.toFixed(2)}, расхождение ${spread.toFixed(2)}`);

  // Затемнение не возвращается после resize (тот самый дефект)
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForTimeout(700);
  const scrim = await page.evaluate(() => {
    const s = document.querySelector('.flight__scrim');
    return { computed: getComputedStyle(s).opacity, inline: s.style.opacity };
  });
  check('resize после пролёта не возвращает затемнение',
        scrim.computed === '0', `computed ${scrim.computed}, inline "${scrim.inline}"`);
  await ctx.close();
}

/* ══ 2. Стык ═════════════════════════════════════════════════════════════ */
for (const [w, h, tag] of [[390, 844, 'm390'], [1280, 800, 'd1280']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await toSections(page);
  await page.evaluate(() => document.querySelector('.seam')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `seam-${tag}.png`) });

  const air = await page.evaluate(() => {
    const seam = document.querySelector('.seam');
    const first = document.querySelector('.after .section:first-child .kicker, .after .section:first-child .section__title');
    if (!seam || !first) return null;
    const flight = document.querySelector('.flight');
    return {
      seamHeight: Math.round(seam.getBoundingClientRect().height),
      photoBottom: Math.round(flight.getBoundingClientRect().bottom),
      textTop: Math.round(first.getBoundingClientRect().top),
    };
  });
  check(`стык ${w}: воздух между низом фото и первой строкой ≥ 88 px`,
        air && (air.textTop - air.photoBottom) >= 88,
        air ? `${air.textTop - air.photoBottom} px (стык ${air.seamHeight} px)` : 'нет');
  await ctx.close();
}

/* ══ 3. Горизонтальная прокрутка ═════════════════════════════════════════ */
console.log('\n4. Горизонтальная прокрутка');
for (const w of [320, 390, 768, 1280]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await toSections(page);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); }
  });
  await page.waitForTimeout(500);
  const over = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth, win: window.innerWidth,
  }));
  check(`${w}: горизонтальной прокрутки нет`, over.doc <= over.win + 1, `${over.doc} при ${over.win}`);
  await ctx.close();
}

/* ══ 4. Обход табом и лайтбокс ═══════════════════════════════════════════ */
{
  console.log('\n5. Клавиатура');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await toSections(page);

  const order = await page.evaluate(() => {
    const sel = 'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';
    return [...document.querySelectorAll(sel)]
      .filter((el) => el.offsetParent !== null || el.tagName === 'VIDEO')
      .map((el) => el.className || el.tagName.toLowerCase());
  });
  const idxVideo = order.findIndex((c) => String(c).includes('filmstrip__video'));
  const idxShot = order.findIndex((c) => String(c).includes('shots__link'));
  const idxCta  = order.findIndex((c) => String(c).includes('panel__cta'));
  check('порядок обхода: видео → галерея → кнопка материалов',
        idxVideo >= 0 && idxShot > idxVideo && idxCta > idxShot,
        `видео ${idxVideo}, первая миниатюра ${idxShot}, кнопка ${idxCta}`);
  const shotCount = order.filter((c) => String(c).includes('shots__link')).length;
  check('каждая миниатюра галереи получает фокус', shotCount === 12, `${shotCount} из 12`);

  // открытие лайтбокса
  await page.evaluate(() => document.getElementById('galereya').scrollIntoView());
  await page.waitForTimeout(500);
  const first = page.locator('.shots__link').first();
  await first.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  const opened = await page.evaluate(() => {
    const b = document.getElementById('lightbox');
    return { hidden: b.hidden, role: b.getAttribute('role'), modal: b.getAttribute('aria-modal'),
             src: b.querySelector('.lightbox__img').getAttribute('src'),
             count: b.querySelector('.lightbox__count').textContent,
             focusIn: b.contains(document.activeElement) };
  });
  check('лайтбокс открылся с клавиатуры', !opened.hidden && Boolean(opened.src), `кадр ${opened.count}`);
  check('role="dialog" и aria-modal', opened.role === 'dialog' && opened.modal === 'true',
        `${opened.role} / aria-modal=${opened.modal}`);
  check('фокус переехал внутрь окна', opened.focusIn);

  // стрелка вперёд
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => document.querySelector('.lightbox__count').textContent);
  check('стрелка → листает', after !== opened.count, `${opened.count} → ${after}`);

  // ловушка фокуса: десять Tab подряд не должны вывести наружу
  let escaped = false;
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => document.getElementById('lightbox').contains(document.activeElement));
    if (!inside) { escaped = true; break; }
  }
  check('ловушка фокуса держит: 10 × Tab не выводят наружу', !escaped);

  await page.screenshot({ path: path.join(OUT, 'lightbox-1280.png') });

  // Esc и возврат фокуса
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const closed = await page.evaluate(() => ({
    hidden: document.getElementById('lightbox').hidden,
    focus: document.activeElement?.className || '',
    src: document.querySelector('.lightbox__img').getAttribute('src'),
  }));
  check('Esc закрывает', closed.hidden);
  check('фокус вернулся на исходную миниатюру', String(closed.focus).includes('shots__link'), closed.focus);
  check('полноразмер выгружен при закрытии', !closed.src);

  // клик вне кадра
  await first.click();
  await page.waitForTimeout(600);
  await page.locator('.lightbox__backdrop').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(500);
  check('клик вне кадра закрывает', await page.evaluate(() => document.getElementById('lightbox').hidden));
  await ctx.close();
}

/* ══ 5. Видео: ни байта в первой загрузке ════════════════════════════════ */
{
  console.log('\n10. Видео');
  requests.length = 0;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const firstLoad = requests.filter((r) => r.url.includes('/video/'));
  const posterFirst = requests.filter((r) => r.url.includes('stage-poster'));
  check('в первой загрузке нет ни байта видео', firstLoad.length === 0, `${firstLoad.length} запросов`);
  check('постер видео тоже не в первой загрузке', posterFirst.length === 0, `${posterFirst.length} запросов`);

  await toSections(page);
  await page.evaluate(() => document.getElementById('video')?.scrollIntoView());
  await page.waitForTimeout(1200);
  const posterSet = await page.evaluate(() => {
    const v = document.querySelector('.filmstrip__video');
    return { poster: v?.getAttribute('poster'), preload: v?.getAttribute('preload'),
             controls: v?.hasAttribute('controls'), autoplay: v?.hasAttribute('autoplay'),
             muted: v?.muted };
  });
  check('постер поставлен из JS при входе секции', Boolean(posterSet.poster), posterSet.poster || 'нет');
  check('preload="none", контролы нативные, автовоспроизведения нет',
        posterSet.preload === 'none' && posterSet.controls && !posterSet.autoplay);
  const videoBytes = requests.filter((r) => r.url.includes('/video/')).length;
  check('видеофайл не запрошен и после прокрутки к секции', videoBytes === 0, `${videoBytes} запросов`);
  await page.screenshot({ path: path.join(OUT, 'video-390.png') });
  await ctx.close();
}

/* ══ 6. prefers-reduced-motion ═══════════════════════════════════════════ */
{
  console.log('\n6. prefers-reduced-motion');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('galereya')?.scrollIntoView());
  await page.waitForTimeout(500);
  const lbTransition = await page.evaluate(() => getComputedStyle(document.getElementById('lightbox')).transitionDuration);
  check('лайтбокс без анимации', lbTransition === '0s', lbTransition);
  const seamAnim = await page.evaluate(() => {
    const s = document.querySelector('.seam__blur');
    const cs = getComputedStyle(s);
    return { anim: cs.animationName, trans: cs.transitionDuration };
  });
  check('стык статичен', seamAnim.anim === 'none' && seamAnim.trans === '0s',
        `animation ${seamAnim.anim}, transition ${seamAnim.trans}`);
  await ctx.close();
}

/* ══ 7. Скриншоты «до/после» ═════════════════════════════════════════════ */
{
  for (const [w, h, tag] of [[390, 844, 'm390'], [768, 1024, 't768'], [1280, 800, 'd1280']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(OUT, `after-opener-${tag}.png`) });
    await toSections(page);
    for (const id of ['trebovaniya', 'repertuar', 'galereya', 'materialy']) {
      await page.evaluate((x) => document.getElementById(x)?.scrollIntoView(), id);
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT, `after-${id}-${tag}.png`) });
    }
    await ctx.close();
  }
}

const failed = results.filter((r) => !r.pass);
await fs.writeFile(path.join(OUT, 'accept.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length} из ${results.length} проверок пройдено`);
if (failed.length) { failed.forEach((f) => console.log('  ×', f.name, f.detail)); }
await browser.close(); server.close();
process.exit(failed.length ? 1 : 0);
