/**
 * Движение, привязанное к прокрутке, только для видимых узлов:
 *   data-fx="par"  — параллакс внутри рамки ±40 px (--py)
 *   data-fx="zoom" — медленный зум 1,08 → 1 (--zs)
 *   [data-line]    — линия между главами растёт с прокруткой (--p)
 * Без prefers-reduced-motion. Параллакса текста нет.
 */
import { reduced } from './reveal.js';

export function initScrollFx() {
  if (reduced()) return;
  const par = [...document.querySelectorAll('[data-fx="par"]')];
  const zoom = [...document.querySelectorAll('[data-fx="zoom"]')];
  const lines = [...document.querySelectorAll('[data-line]')];
  const visible = new Set();
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target);
    schedule();
  }), { rootMargin: '10% 0px' });
  [...par, ...zoom, ...lines].forEach((el) => io.observe(el));

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  let ticking = false;
  const run = () => {
    ticking = false;
    const vh = innerHeight;
    visible.forEach((el) => {
      const host = el.closest('.media, [data-line]') || el;
      const r = host.getBoundingClientRect();
      if (el.dataset.fx === 'par') {
        const k = clamp(((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
        el.style.setProperty('--py', `${(k * 40).toFixed(1)}px`);
      } else if (el.dataset.fx === 'zoom') {
        const p = clamp((vh - r.top) / (vh + r.height));
        el.style.setProperty('--zs', (1.08 - 0.08 * p).toFixed(4));
      } else {
        el.style.setProperty('--p', clamp((vh * 0.6 - r.top) / r.height).toFixed(4));
      }
    });
  };
  function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(run); } }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  schedule();
}
