/* Декор первого экрана: прокрутка, курсор-свет, пауза вне экрана. */
import { reduced } from './reveal.js';

const root = document.documentElement;

export function initDecor() {
  const hero = document.getElementById('top');

  // Декор стоит, пока первый экран вне вьюпорта
  new IntersectionObserver(([e]) => root.classList.toggle('hero-off', !e.isIntersecting)).observe(hero);

  // Прокрутка: видео уходит с лёгким масштабом и затемнением, знак поднимается чуть быстрее фона
  if (!reduced()) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const k = Math.min(1, Math.max(0, scrollY / hero.offsetHeight));
      hero.style.setProperty('--hs', k.toFixed(3));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // Курсор-свет: запаздывание lerp 0,12; цикл живёт, пока пятно догоняет курсор
  if (matchMedia('(pointer: fine)').matches && !reduced()) {
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
}
