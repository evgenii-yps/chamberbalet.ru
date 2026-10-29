/**
 * Система медиа на странице: фоновые видео (ленивая загрузка, пауза вне экрана),
 * превью-петли у видеовставок, лента с перетаскиванием и инерцией.
 */
import { reduced } from './reveal.js';

const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const saveData = () => navigator.connection?.saveData === true;

/* ---- фоновые видео: грузим при приближении, играем только на экране ---- */
function initBg() {
  const vids = $$('video[data-bg]');
  if (!vids.length) return;
  const off = reduced() || saveData();         // остаётся постер
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    const v = e.target;
    if (off) return;
    if (e.isIntersecting) {
      if (!v.src && v.dataset.src) v.src = v.dataset.src;
      v.play().catch(() => {});
    } else v.pause();
  }), { rootMargin: '300px 0px' });
  vids.forEach((v) => io.observe(v));
}

/* ---- превью-петли: hover на десктопе, центр экрана на телефоне ---- */
function initPreviews() {
  const vids = $$('video.media__prev');
  if (!vids.length || reduced() || saveData()) return;
  const start = (v) => { if (!v.src) v.src = v.dataset.src; v.classList.add('is-on'); v.play().catch(() => {}); };
  const stop = (v) => { v.pause(); v.classList.remove('is-on'); };
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    vids.forEach((v) => {
      const host = v.closest('.media');
      host.addEventListener('pointerenter', () => start(v));
      host.addEventListener('pointerleave', () => stop(v));
    });
  } else {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? start : stop)(e.target)),
      { rootMargin: '-35% 0px -35% 0px' });
    vids.forEach((v) => io.observe(v));
  }
}

/* ---- лента с перетаскиванием мышью и инерцией ---- */
function initDrag() {
  $$('[data-drag]').forEach((el) => {
    let down = false, moved = 0, startX = 0, startLeft = 0, lastX = 0, lastT = 0, vel = 0, raf = 0;
    const stopInertia = () => { cancelAnimationFrame(raf); raf = 0; };
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      stopInertia();
      down = true; moved = 0; startX = lastX = e.clientX; startLeft = el.scrollLeft; lastT = performance.now(); vel = 0;
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) el.classList.add('is-drag');
      el.scrollLeft = startLeft - dx;
      const t = performance.now();
      vel = (lastX - e.clientX) / Math.max(1, t - lastT);   // px/мс
      lastX = e.clientX; lastT = t;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (reduced() || Math.abs(vel) < 0.05) { el.classList.remove('is-drag'); return; }
      let v = vel * 16;
      const step = () => {
        el.scrollLeft += v; v *= 0.94;
        if (Math.abs(v) > 0.4) raf = requestAnimationFrame(step);
        else { raf = 0; el.classList.remove('is-drag'); }
      };
      raf = requestAnimationFrame(step);
    });
    // после перетаскивания клик по кнопке внутри не должен срабатывать
    el.addEventListener('click', (e) => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    el.addEventListener('wheel', stopInertia, { passive: true });
  });
}

export function initMedia() {
  initBg();
  initPreviews();
  initDrag();
}
