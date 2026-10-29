/**
 * Режим страницы: одно состояние на <html data-mode="all|chamber|big">.
 * Всё остальное — CSS-селекторами; скрипт держит только то, что CSS не умеет:
 * hidden у разделов, подписи первого экрана, aria, URL и localStorage.
 */
import { store } from './store.js';

export const MODES = ['all', 'chamber', 'big'];
const root = document.documentElement;
const data = JSON.parse(document.getElementById('modes-data').textContent);

export const getMode = () => root.dataset.mode;
const shown = (el, mode) => el.dataset.modes.split(' ').includes(mode);

/** Раздел, внутри которого сейчас находится зритель и который скроется. */
function leavingSectionUnderViewport(next) {
  const mid = innerHeight / 2;
  return [...document.querySelectorAll('section[data-modes]')].some((el) => {
    if (el.hidden || shown(el, next)) return false;
    const r = el.getBoundingClientRect();
    return r.top <= mid && r.bottom >= mid;
  });
}

/** Подпись и кнопки первого экрана. */
function paintHero(mode) {
  const d = data.modes[mode];
  const cap = document.getElementById('mode-cap');
  if (cap) cap.innerHTML = d.caption;
  document.querySelectorAll('[data-hero-btn]').forEach((a, i) => {
    a.innerHTML = d.buttons[i].label;
    a.setAttribute('href', d.buttons[i].href);
    a.classList.toggle('btn--ghost', i !== 0);
  });
}

/** Синхронное применение режима: никаких анимаций, только состояние. */
export function applyMode(mode) {
  root.dataset.mode = mode;
  document.querySelectorAll('[data-modes]').forEach((el) => { el.hidden = !shown(el, mode); });
  document.querySelectorAll('[data-set-mode]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.setMode === mode));
  });
  document.querySelectorAll('[data-ne]').forEach((b) => {
    b.setAttribute('aria-label', mode === 'chamber' ? data.ne.restore : data.ne.remove);
  });
  paintHero(mode);
}

function syncUrl(mode) {
  try {
    const url = new URL(location.href);
    url.searchParams.set('mode', mode);
    history.replaceState(null, '', url);
  } catch { /* file:// и прочее — URL не обязателен */ }
}

/** Смена по действию зрителя: хранит выбор и адрес, прокручивает к началу при необходимости. */
export function setMode(next, { scene } = {}) {
  if (!MODES.includes(next) || next === getMode()) return;
  const jump = leavingSectionUnderViewport(next);
  const run = () => {
    applyMode(next);
    if (jump) scrollTo({ top: 0, behavior: 'auto' });
  };
  store.set('ne-mode', next);
  store.set('ne-touched', '1');
  root.classList.add('touched');
  syncUrl(next);
  if (scene) scene(next, run); else run();
}

export function initModes({ scene } = {}) {
  applyMode(getMode());
  root.classList.add('modes-ready');
  document.addEventListener('click', (e) => {
    const set = e.target.closest('[data-set-mode]');
    if (set) { setMode(set.dataset.setMode, { scene }); return; }
    if (e.target.closest('[data-ne]')) setMode(getMode() === 'chamber' ? 'big' : 'chamber', { scene });
  });
}
