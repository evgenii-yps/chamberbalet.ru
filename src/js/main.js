/**
 * Сборка страницы: режимы, загрузка кадров, экран загрузки, рельс глав.
 *
 * Перехват прокрутки живёт только в пролёте. Как только пролёт закончен,
 * страница ведёт себя как обычная: overflow: hidden снимается, секции
 * листаются нативно.
 */
import { createFlight, OPENER_AT } from './flight.js';
import { createNav } from './nav.js';
import { setupHeroVideo } from './hero-video.js';
import { setupReveal } from './reveal.js';

const DURATION = 1000;
const RESIZE_DEBOUNCE = 150;
/** Сколько кадров пролёта держит экран загрузки. Их ровно один: нулевой —
 *  единственный, что стоит в разметке, и он же делит файл с первым экраном.
 *  Остальные подтягиваются после отрисовки (см. warmFlightPhotos). */
const FIRST_SCREEN_FRAMES = 1;
const LOADER_TIMEOUT = 6000;
/** Пауза перед подменой подписи: старая успевает уйти, новая не мелькает. */
const CAPTION_SWAP = 240;
/** Насколько заранее просим кадры, которых ещё нет. */
const LOOKAHEAD = 5;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function debounce(fn, wait) {
  let timer = 0;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
}

/* ------------------------------------------------------------------ *
 *  Кадры: разметка первых трёх в HTML, остальные — в <noscript>
 * ------------------------------------------------------------------ */

function createPhotoLoader(root) {
  const holders = Array.from(root.querySelectorAll('.layer__photo'));

  /**
   * При включённом скриптинге содержимое <noscript> не разбирается парсером и
   * доступно как обычный текст — значит одна и та же разметка обслуживает и
   * страницу без JS, и ленивую загрузку, без дублирующего манифеста.
   */
  function ensure(index) {
    const holder = holders[index];
    if (!holder || holder.dataset.loaded) return null;
    const html = holder.querySelector('noscript')?.textContent;
    if (!html) { holder.dataset.loaded = 'empty'; return null; }
    holder.dataset.loaded = 'yes';
    holder.innerHTML = html;
    return holder.querySelector('img');
  }

  holders.forEach((holder) => { if (holder.querySelector('img')) holder.dataset.loaded = 'yes'; });

  return {
    ensure,
    imageOf: (i) => holders[i]?.querySelector('img') || null,
    count: holders.length,
    /** Просим всё до позиции камеры плюс запас. */
    upto(position) {
      const limit = Math.min(this.count - 1, Math.floor(position) + LOOKAHEAD);
      for (let i = 0; i <= limit; i++) this.ensure(i);
    },
  };
}

const settled = (img) => {
  if (!img) return Promise.resolve();
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });   // осечка не держит экран
  });
};

/**
 * Кадры пролёта, кроме нулевого, догружаются после отрисовки первого экрана.
 *
 * До первого действия пользователя пролёт не стартует, а вес этих кадров
 * соревнуется с кадром LCP за одну и ту же полосу. Ждём `load` — то есть
 * момент, когда первый экран уже нарисован, — и поднимаем их в простое.
 *
 * Страховка на случай, если действие случится раньше: пролёт зовёт `onNeed`
 * и поднимает недостающее сам, а первый переход идёт на нулевой кадр, который
 * стоит в разметке и загружен всегда.
 */
function warmFlightPhotos(photos) {
  const start = () => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    idle(() => photos.upto(0));
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

async function runLoader(loader, photos, openerImage) {
  if (!loader) return;
  const first = openerImage ? [openerImage] : [];
  for (let i = 0; i < Math.min(FIRST_SCREEN_FRAMES, photos.count); i++) {
    photos.ensure(i);
    first.push(photos.imageOf(i));
  }
  if (!first.length) { loader.classList.add('is-done'); setTimeout(() => loader.remove(), 700); return; }
  let done = 0;
  const step = () => {
    done += 1;
    loader.style.setProperty('--loader-progress', `${Math.round((done / first.length) * 100)}%`);
  };

  await Promise.race([
    Promise.all(first.map((img) => settled(img).then(step))),
    new Promise((resolve) => setTimeout(resolve, LOADER_TIMEOUT)),
  ]);

  loader.classList.add('is-done');
  setTimeout(() => loader.remove(), 700);
}

/* ------------------------------------------------------------------ *
 *  Точка входа
 * ------------------------------------------------------------------ */

function init() {
  document.documentElement.classList.add('js', 'ready');

  const flightEl = document.querySelector('.flight');
  const world = document.querySelector('.flight__world');
  const opener = document.querySelector('.opener');
  const after = document.querySelector('.after');
  const loader = document.querySelector('.loader');
  setupReveal();

  if (!flightEl || !world || !opener) return;

  const layerEls = Array.from(world.querySelectorAll('.layer'));
  const photoEls = layerEls.map((el) => el.querySelector('.layer__photo'));
  const chapterAt = layerEls.map((el) => Boolean(el.querySelector('.layer__caption')));
  const stopIndexes = layerEls
    .map((el, i) => (chapterAt[i] ? i : -1))
    .filter((i) => i >= 0);

  const photos = createPhotoLoader(world);
  const live = document.getElementById('flight-live');
  const scrim = document.querySelector('.flight__scrim');
  const rail = document.querySelector('.rail');
  const railDots = rail ? Array.from(rail.querySelectorAll('.rail__dot')) : [];
  const hint = document.querySelector('.hint');
  const video = setupHeroVideo(opener.querySelector('.opener__video'));

  runLoader(loader, photos, opener.querySelector('.opener__bg img'));
  warmFlightPhotos(photos);

  // Уважаем reduced-motion: пролёт вырождается в обычную прокрутку
  if (reduceMotion.matches) {
    for (let i = 0; i < photos.count; i++) photos.ensure(i);
    return;
  }

  let active = false;
  let swapTimer = 0;
  let shownChapter = -2;

  const flight = createFlight({
    layers: photoEls,
    isChapter: (i) => chapterAt[i],
    stops: [OPENER_AT, ...stopIndexes],
    duration: DURATION,
    onNeed: (position) => photos.upto(position + 1),
    onOpener: (opacity) => {
      opener.style.opacity = opacity.toFixed(3);
      opener.style.transform = `scale(${(1 + (1 - opacity) * 0.06).toFixed(4)})`;
      opener.style.visibility = opacity < 0.01 ? 'hidden' : 'visible';
      // Первый экран несёт своё затемнение. Экранный слой поднимается ровно
      // настолько, насколько уходит первый экран, — плотность не удваивается
      if (scrim) scrim.style.opacity = (1 - opacity).toFixed(3);
      video?.setActive(opacity > 0.02);
    },
    onSettle: (stop) => {
      nav.transitionEnded();
      markRail(stop);
    },
  });

  /** Подпись подменяется с паузой: старая успевает уйти, новая не мелькает. */
  function setChapter(stop) {
    const chapterNumber = stop - 1;             // остановка 0 — первый экран
    markRail(stop);
    if (chapterNumber === shownChapter) return;
    shownChapter = chapterNumber;

    clearTimeout(swapTimer);
    layerEls.forEach((el) => el.removeAttribute('data-in'));
    if (chapterNumber < 0) { if (live) live.textContent = ''; return; }

    const target = layerEls[stopIndexes[chapterNumber]];
    swapTimer = setTimeout(() => {
      target?.setAttribute('data-in', '');
      const bright = target?.hasAttribute('data-bright');
      if (scrim) scrim.toggleAttribute('data-bright', Boolean(bright));
      if (live) live.textContent = target?.dataset.chapter || '';
    }, CAPTION_SWAP);
  }

  /**
   * Подпись главы принадлежит пролёту и обязана уходить вместе с ним.
   *
   * Чистим здесь всё состояние подписи разом: снятый data-in гасит её,
   * снятая отложенная подмена не даёт ей вернуться через CAPTION_SWAP уже
   * после выхода, а сброшенный shownChapter возвращает setChapter право
   * поставить ту же самую главу заново при возврате в пролёт — без сброса
   * он посчитал бы её показанной и подпись не вернулась бы никогда.
   */
  function clearChapter() {
    clearTimeout(swapTimer);
    swapTimer = 0;
    shownChapter = -2;
    layerEls.forEach((el) => el.removeAttribute('data-in'));
    scrim?.removeAttribute('data-bright');
    if (live) live.textContent = '';
  }

  function markRail(stop) {
    for (const dot of railDots) {
      dot.setAttribute('aria-current', Number(dot.dataset.stop) === stop ? 'true' : 'false');
    }
    if (hint) hint.style.opacity = stop > 0 ? '0' : '';
  }

  /* --- режимы --------------------------------------------------- */

  function enterFlight(stop = flight.index) {
    if (active) return;
    active = true;
    flightEl.classList.remove('is-done');
    document.documentElement.classList.remove('flight-done');
    document.body.classList.add('is-flight');
    window.scrollTo(0, 0);
    scrim?.setAttribute('data-on', '');
    if (rail) rail.style.opacity = '';
    flight.goTo(stop, { immediate: true });
    setChapter(stop);
    nav.reset();
  }

  function exitFlight() {
    if (!active) return;
    active = false;
    // Остаётся последний кадр: страница отпущена, дальше обычная прокрутка
    clearChapter();
    layerEls.forEach((el, i) => el.toggleAttribute('data-live-frame', i === stopIndexes.at(-1)));
    flightEl.classList.add('is-done');
    document.documentElement.classList.add('flight-done');
    document.body.classList.remove('is-flight');
    window.scrollTo(0, 0);
    scrim?.removeAttribute('data-on');
    if (scrim) scrim.style.opacity = '';        // назад под переход из CSS
    if (rail) rail.style.opacity = '0';
    video?.setActive(false);
  }

  function toContact() {
    exitFlight();
    const target = document.getElementById('kontakt');
    if (!target) return;
    target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    target.querySelector('h2')?.focus?.();
  }

  const nav = createNav({
    target: window,
    isEnabled: () => active,
    // Возвращаем true, только если переход действительно начался: по этому
    // признаку ввод понимает, ждать ему остановки или можно принимать
    // следующее действие
    onIntent: (intent, payload) => {
      if (intent === 'contact') { toContact(); return false; }
      if (intent === 'goto') {
        const stop = payload === 'last' ? flight.stopCount - 1 : 0;
        setChapter(stop);
        return flight.goTo(stop);
      }
      if (intent === 'prev') {
        if (flight.index <= 0) return false;
        setChapter(flight.index - 1);
        return flight.prev();
      }
      if (flight.atLast) {
        // Пролёт закончен: отпускаем прокрутку и уходим в секции
        exitFlight();
        after?.scrollIntoView({ behavior: 'smooth' });
        return false;
      }
      setChapter(flight.index + 1);
      return flight.next();
    },
  });
  nav.attach();

  /* --- возврат в пролёт ------------------------------------------ */

  function maybeReenter(goingUp) {
    if (active || !goingUp || window.scrollY > 2) return;
    enterFlight(flight.stopCount - 1);
  }

  window.addEventListener('wheel', (e) => { if (!active) maybeReenter(e.deltaY < 0); }, { passive: true });

  let reentryTouchY = 0;
  window.addEventListener('touchstart', (e) => { reentryTouchY = e.touches[0]?.clientY ?? 0; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (active) return;
    maybeReenter((e.touches[0]?.clientY ?? 0) - reentryTouchY > 24);
  }, { passive: true });

  /* --- рельс и выходы -------------------------------------------- */

  for (const dot of railDots) {
    dot.addEventListener('click', () => {
      const stop = Number(dot.dataset.stop);
      if (!active) { enterFlight(stop); return; }
      setChapter(stop);
      flight.goTo(stop);
    });
  }

  after?.addEventListener('focusin', () => { if (active) exitFlight(); });

  for (const link of document.querySelectorAll('.skip-link, [data-to-contact]')) {
    link.addEventListener('click', (e) => { e.preventDefault(); toContact(); });
  }

  window.addEventListener('resize', debounce(() => flight.resize(), RESIZE_DEBOUNCE), { passive: true });
  reduceMotion.addEventListener?.('change', (e) => { if (e.matches) exitFlight(); });

  enterFlight(0);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
