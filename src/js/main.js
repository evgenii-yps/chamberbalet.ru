/**
 * Сборка страницы: режимы, загрузка кадров, экран загрузки, рельс глав.
 *
 * Перехват прокрутки живёт только в пролёте. Как только пролёт закончен,
 * страница ведёт себя как обычная: overflow: hidden снимается, секции
 * листаются нативно.
 */
import { createFlight } from './flight.js';
import { createNav } from './nav.js';
import { setupHeroVideo } from './hero-video.js';
import { setupReveal } from './reveal.js';

const DURATION = 1000;
const RESIZE_DEBOUNCE = 150;
const FIRST_SCREEN_SLIDES = 3;
const LOADER_TIMEOUT = 6000;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function debounce(fn, wait) {
  let timer = 0;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
}

/* ------------------------------------------------------------------ *
 *  Кадры: разметка первых трёх лежит в HTML, остальные достаём из манифеста
 * ------------------------------------------------------------------ */

function createPhotoLoader(root) {
  const holders = Array.from(root.querySelectorAll('.slide__photo'));

  /**
   * Разметка отложенных кадров лежит в <noscript>. При включённом скриптинге
   * его содержимое не разбирается парсером и доступно как обычный текст —
   * значит одна и та же разметка обслуживает и страницу без JS, и ленивую
   * загрузку, без дублирующего манифеста.
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

  /** Кадры, отрисованные прямо в HTML, считаем уже загруженными. */
  holders.forEach((holder) => { if (holder.querySelector('img')) holder.dataset.loaded = 'yes'; });

  const imageOf = (index) => holders[index]?.querySelector('img') || null;

  return { ensure, imageOf, count: holders.length };
}

const settled = (img) => {
  if (!img) return Promise.resolve();
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });   // осечка не держит экран
  });
};

/* ------------------------------------------------------------------ *
 *  Экран загрузки: держим, пока не готовы первые три кадра
 * ------------------------------------------------------------------ */

async function runLoader(loader, photos) {
  if (!loader) return;
  const first = [];
  for (let i = 0; i < Math.min(FIRST_SCREEN_SLIDES, photos.count); i++) {
    photos.ensure(i);
    first.push(photos.imageOf(i));
  }
  let done = 0;
  const step = () => {
    done += 1;
    loader.style.setProperty('--loader-progress', `${Math.round((done / first.length) * 100)}%`);
  };

  const all = Promise.all(first.map((img) => settled(img).then(step)));
  const timeout = new Promise((resolve) => setTimeout(resolve, LOADER_TIMEOUT));
  await Promise.race([all, timeout]);

  loader.classList.add('is-done');
  setTimeout(() => loader.remove(), 700);
}

/* ------------------------------------------------------------------ *
 *  Точка входа
 * ------------------------------------------------------------------ */

function init() {
  document.documentElement.classList.add('js');

  const root = document.querySelector('.flight');
  const after = document.querySelector('.after');
  const loader = document.querySelector('.loader');
  setupReveal();

  if (!root) return;

  const slides = root.querySelectorAll('.slide');
  const photos = createPhotoLoader(root);
  const live = document.getElementById('flight-live');
  const rail = root.querySelector('.rail');
  const railDots = rail ? Array.from(rail.querySelectorAll('.rail__dot')) : [];
  const hint = root.querySelector('.scroll-hint');
  const video = setupHeroVideo(root.querySelector('.slide__video'));

  runLoader(loader, photos);

  // Уважаем reduced-motion: пролёт вырождается в обычную прокрутку,
  // все кадры просто грузятся по мере появления
  if (reduceMotion.matches) {
    for (let i = 0; i < photos.count; i++) photos.ensure(i);
    return;
  }

  let active = false;

  const flight = createFlight({
    root,
    slides,
    duration: DURATION,
    onNeed: (index) => { if (index >= 0 && index < photos.count) photos.ensure(index); },
    onSettle: (index) => {
      nav.transitionEnded(DURATION);
      announce(index);
      markRail(index);
      video?.setActive(index === 0);
      if (hint) hint.toggleAttribute('data-hidden', index !== 0);
    },
  });

  function announce(index) {
    if (!live) return;
    const slide = slides[index];
    const label = slide?.dataset.chapter;
    live.textContent = label || '';
  }

  function markRail(index) {
    for (const dot of railDots) {
      const target = Number(dot.dataset.index);
      dot.setAttribute('aria-current', target === index ? 'true' : 'false');
    }
  }

  /* --- режимы --------------------------------------------------- */

  function enterFlight(index = flight.index) {
    if (active) return;
    active = true;
    root.classList.remove('is-done');
    root.classList.add('is-active');
    document.body.classList.add('is-flight');
    window.scrollTo(0, 0);
    flight.goTo(index, { immediate: true });
    nav.reset();
  }

  function exitFlight() {
    if (!active) return;
    active = false;
    root.classList.remove('is-active');
    root.classList.add('is-done');
    document.body.classList.remove('is-flight');
    window.scrollTo(0, 0);
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
    target: root,
    isEnabled: () => active,
    onIntent: (intent, payload) => {
      if (intent === 'contact') { toContact(); return; }
      if (intent === 'goto') {
        flight.goTo(payload === 'last' ? flight.count - 1 : 0);
        return;
      }
      if (intent === 'prev') { flight.prev(); return; }
      if (flight.index >= flight.count - 1) {
        // Пролёт закончен: отпускаем прокрутку и уходим в секции
        exitFlight();
        after?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      flight.next();
    },
  });
  nav.attach();

  /* --- возврат в пролёт ------------------------------------------ */

  function maybeReenter(goingUp) {
    if (active || !goingUp || window.scrollY > 2) return;
    enterFlight(flight.count - 1);
  }

  window.addEventListener('wheel', (e) => {
    if (active) return;
    maybeReenter(e.deltaY < 0);
  }, { passive: true });

  let reentryTouchY = 0;
  window.addEventListener('touchstart', (e) => { reentryTouchY = e.touches[0]?.clientY ?? 0; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (active) return;
    const y = e.touches[0]?.clientY ?? 0;
    maybeReenter(y - reentryTouchY > 24);
  }, { passive: true });

  /* --- рельс глав ------------------------------------------------ */

  for (const dot of railDots) {
    dot.addEventListener('click', () => {
      const index = Number(dot.dataset.index);
      if (!active) enterFlight(index);
      else flight.goTo(index);
    });
  }

  /* --- фокус не должен запирать зрителя --------------------------- */

  after?.addEventListener('focusin', () => { if (active) exitFlight(); });

  document.querySelector('.skip-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    toContact();
  });

  window.addEventListener('resize', debounce(() => flight.resize(), RESIZE_DEBOUNCE), { passive: true });

  reduceMotion.addEventListener?.('change', (e) => { if (e.matches) exitFlight(); });

  enterFlight(0);
  announce(0);
  markRail(0);
  photos.ensure(1);
  photos.ensure(2);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
