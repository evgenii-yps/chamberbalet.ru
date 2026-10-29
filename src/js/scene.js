/**
 * Сцена смены режима. Состояние меняет mode.js; здесь — только движение.
 * Занавес первого экрана рисует CSS (граница едет 1100 мс); скрипт ведёт
 * подпись (старая уходит, новая входит), вспышку знака и разделы
 * (уходящий гаснет 250 мс, приходящий раскрывается 600 мс).
 */
import { reduced } from './reveal.js';

const EASE = 'cubic-bezier(.2,.7,.2,1)';
const root = document.documentElement;

function flash(next) {
  if (next !== 'big') return;
  root.classList.remove('ne-flash');
  void root.offsetWidth;
  root.classList.add('ne-flash');
  setTimeout(() => root.classList.remove('ne-flash'), 950);
}

export function scene(ctx) {
  if (reduced()) { ctx.apply(); ctx.caption(); ctx.hide([]); return; }
  const cap = document.getElementById('mode-cap');

  // 1. состояние меняется сразу — занавес начинает ехать; уходящие разделы остаются до затухания
  ctx.apply({ keep: ctx.leaving });
  flash(ctx.next);

  // 2. подпись: старая уходит, новая входит
  cap.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }],
    { duration: 200, easing: 'linear', fill: 'forwards' }).finished.then(() => {
    ctx.caption();
    cap.getAnimations().forEach((a) => a.cancel());
    cap.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
      { duration: 300, delay: 120, easing: EASE, fill: 'backwards' });
  });

  // 3. разделы
  ctx.entering.forEach((el) => el.animate(
    [{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, clipPath: 'inset(0)' }],
    { duration: 600, easing: EASE }));
  if (ctx.leaving.length) {
    Promise.all(ctx.leaving.map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }],
      { duration: 250, easing: 'linear', fill: 'forwards' }).finished)).then(() => {
      ctx.leaving.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
      ctx.hide(ctx.leaving);
    });
  } else ctx.hide([]);
}
