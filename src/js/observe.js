/**
 * Однократное наблюдение за входом элемента в область просмотра.
 *
 * Вынесено из reveal.js, где то же самое было прошито на один класс и одно
 * действие. Потребителей теперь трое: проявление секций, постер видео и
 * подстраховка галереи. Каждый из них хочет «сделать один раз, когда узел
 * показался», и заводить под это три наблюдателя незачем.
 *
 * Кадры пролёта сюда не относятся и наблюдателя не используют: их поднимает
 * не видимость, а позиция камеры (photos.upto в main.js). Видимость там
 * ничего не сказала бы — в пролёте все слои лежат в области просмотра сразу.
 */

/**
 * Наблюдения нет только в одном случае: нет самого API.
 *
 * prefers-reduced-motion сюда не входит намеренно. Он про анимацию, а не про
 * наблюдение: у проявления секций анимация есть, и там флаг обязан её
 * отменить — но это забота reveal.js. У постера видео анимации нет вовсе, и
 * отключать ему наблюдение по этому флагу значило бы грузить картинку сразу,
 * то есть ровно то, ради чего наблюдатель и заведён.
 */
const unavailable = () => !('IntersectionObserver' in window);

/**
 * @param elements  что наблюдаем
 * @param onEnter   что сделать при первом появлении
 * @param options   rootMargin и threshold наблюдателя
 *
 * Когда наблюдение недоступно, onEnter вызывается сразу для всех: отсутствие
 * наблюдателя не должно означать отсутствие содержимого.
 */
export function observeOnce(elements, onEnter, options = {}) {
  const items = Array.from(elements || []);
  if (!items.length) return null;

  if (unavailable()) {
    items.forEach((el) => onEnter(el));
    return null;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      onEnter(entry.target);
    }
  }, options);

  items.forEach((el) => observer.observe(el));
  return observer;
}
