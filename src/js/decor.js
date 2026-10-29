/* Украшения первого экрана: подсказка, курсор-свет, пауза вне экрана, видео; параллакс занавеса. */
import { store } from './store.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export function initDecor() {
  const hero = document.getElementById('top');

  // Декор и видео стоят, пока первый экран вне вьюпорта
  const videos = [...hero.querySelectorAll('video')];
  new IntersectionObserver(([e]) => {
    root.classList.toggle('hero-off', !e.isIntersecting);
    videos.forEach((v) => { if (e.isIntersecting && !reduced.matches) v.play().catch(() => {}); else v.pause(); });
  }).observe(hero);

  // Подсказка «нажмите» — при первом визите через 2,5 с
  if (!store.get('ne-touched')) {
    setTimeout(() => { if (!root.classList.contains('touched')) root.classList.add('hint-on'); }, 2500);
  }

  // Курсор-свет: запаздывание lerp 0,12; цикл живёт, пока пятно догоняет курсор
  if (matchMedia('(pointer: fine)').matches && !reduced.matches) {
    const light = hero.querySelector('.cursor-light');
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      light.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top;
      if (!hero.classList.contains('is-hover')) { x = tx; y = ty; hero.classList.add('is-hover'); }
      if (!raf) raf = requestAnimationFrame(tick);
    });
    hero.addEventListener('pointerleave', () => hero.classList.remove('is-hover'));
  }

  // Тень занавеса: параллакс ±20 px, пока раздел виден
  const curtain = document.querySelector('.curtain');
  if (curtain && !reduced.matches) {
    const sec = curtain.parentElement;
    let on = false, ticking = false;
    const update = () => {
      ticking = false;
      const r = sec.getBoundingClientRect();
      const k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
      curtain.style.setProperty('--py', `${(k * 20).toFixed(1)}px`);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) { addEventListener('scroll', onScroll, { passive: true }); on = true; update(); }
      else if (!e.isIntersecting && on) { removeEventListener('scroll', onScroll); on = false; }
    }).observe(sec);
  }
}
