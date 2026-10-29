/**
 * Режим страницы: одно состояние на <html data-mode="all|chamber|big">.
 * Всё остальное — CSS-селекторами; скрипт держит только то, что CSS не умеет:
 * hidden у разделов, подпись первого экрана, aria, URL и localStorage.
 */
import { store } from './store.js';

export const MODES = ['all', 'chamber', 'big'];
const root = document.documentElement;
const data = JSON.parse(document.getElementById('app-data').textContent);

export const getMode = () => root.dataset.mode;
const shown = (el, mode) => el.dataset.modes.split(' ').includes(mode);

/** Раздел под серединой экрана, который скроется. */
function leavingSectionUnderViewport(next) {
  const mid = innerHeight / 2;
  return [...document.querySelectorAll('section[data-modes]')].some((el) => {
    if (el.hidden || shown(el, next)) return false;
    const r = el.getBoundingClientRect();
    return r.top <= mid && r.bottom >= mid;
  });
}

/** Какие разделы появятся и какие уйдут при смене режима. */
export function sectionsFor(next) {
  const all = [...document.querySelectorAll('section[data-modes]')];
  return {
    entering: all.filter((el) => el.hidden && shown(el, next)),
    leaving: all.filter((el) => !el.hidden && !shown(el, next)),
  };
}

/** Подпись первого экрана. */
export function paintCaption(mode) {
  const cap = document.getElementById('mode-cap');
  if (cap) cap.innerHTML = data.lead[mode];
}

/**
 * Применение режима: только состояние, без движения.
 * keep — разделы, которые ещё должны остаться на экране (их скроет сцена после затухания).
 */
export function applyMode(mode, { keep = [], caption = true } = {}) {
  root.dataset.mode = mode;
  document.querySelectorAll('[data-modes]').forEach((el) => { el.hidden = !shown(el, mode) && !keep.includes(el); });
  document.querySelectorAll('[data-set-mode]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.setMode === mode));
  });
  document.querySelectorAll('[data-ne]').forEach((b) => {
    b.setAttribute('aria-label', mode === 'chamber' ? data.ne.restore : data.ne.remove);
  });
  if (caption) paintCaption(mode);
  document.dispatchEvent(new Event('modechange'));
}

function syncUrl(mode) {
  try {
    const url = new URL(location.href);
    url.searchParams.set('mode', mode);
    history.replaceState(null, '', url);
  } catch { /* file:// и песочницы — адрес не обязателен */ }
}

/**
 * Смена по действию зрителя: хранит выбор и адрес. Движение отдаётся сцене,
 * которой достаётся контекст: что появится, что уйдёт и как применить состояние.
 */
export function setMode(next, { scene } = {}) {
  if (!MODES.includes(next) || next === getMode()) return;
  const jump = leavingSectionUnderViewport(next);
  const { entering, leaving } = sectionsFor(next);
  const ctx = {
    next, entering, leaving,
    apply: (opts) => applyMode(next, { caption: false, ...opts }),
    caption: () => paintCaption(next),
    hide: (els) => { els.forEach((el) => { el.hidden = true; }); if (jump) scrollTo({ top: 0, behavior: 'auto' }); },
  };
  store.set('ne-mode', next);
  store.set('ne-touched', '1');
  root.classList.add('touched');
  syncUrl(next);
  if (scene) scene(ctx);
  else { applyMode(next); ctx.hide([]); }
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
