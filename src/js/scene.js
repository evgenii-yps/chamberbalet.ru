/**
 * Сцена смены режима (6.1). Состояние меняет mode.js; здесь — только движение.
 * С View Transitions новый кадр раскрывается занавесом; без них — кроссфейд.
 */
import { sectionsFor } from './mode.js';

const EASE = 'cubic-bezier(.2,.7,.2,1)';
const root = document.documentElement;
const $$ = (s) => [...document.querySelectorAll(s)];
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const heroTexts = () => [document.getElementById('mode-cap'), ...$$('[data-hero-btn]')];

const enter = (els) => els.forEach((el) => el.animate(
  [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
  { duration: 300, delay: 120, easing: EASE, fill: 'backwards' }));

const reveal = (els) => els.forEach((el) => el.animate(
  [{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, clipPath: 'inset(0)' }],
  { duration: 600, easing: EASE }));

function flash(next) {
  if (next !== 'big') return;
  root.classList.remove('ne-flash');
  void root.offsetWidth;
  root.classList.add('ne-flash');
  setTimeout(() => root.classList.remove('ne-flash'), 950);
}

export function scene(next, run) {
  if (reduced()) { run(); return; }
  const { entering } = sectionsFor(next);
  const after = () => { enter(heroTexts()); reveal(entering); flash(next); };

  if (document.startViewTransition) {
    root.dataset.vt = next === 'big' ? 'down' : 'center';
    const vt = document.startViewTransition(() => { run(); after(); });
    vt.finished.finally(() => { delete root.dataset.vt; });
    return;
  }

  // Откат: старое уходит, состояние меняется, новое входит; мягкий кроссфейд main
  const { leaving } = sectionsFor(next);
  const outs = [
    ...heroTexts().map((el) => el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 200, fill: 'forwards' })),
    ...leaving.map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' })),
  ];
  Promise.all(outs.map((a) => a.finished)).then(() => {
    run();
    outs.forEach((a) => a.cancel());
    after();
    document.querySelector('main').animate([{ opacity: .4 }, { opacity: 1 }], { duration: 300 });
  });
}
