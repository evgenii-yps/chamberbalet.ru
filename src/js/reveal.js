/**
 * Появление секций после пролёта. Наблюдатель общий — src/js/observe.js.
 *
 * Уменьшенное движение обрабатывается здесь, а не в наблюдателе: флаг
 * отменяет АНИМАЦИЮ появления, а не наблюдение как таковое. Секции при этом
 * обязаны быть видны сразу — иначе выключенная анимация оставила бы их
 * прозрачными навсегда.
 */
import { observeOnce } from './observe.js';

export function setupReveal(root = document) {
  const items = root.querySelectorAll('.reveal');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  observeOnce(
    items,
    (el) => el.classList.add('is-in'),
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );
}
