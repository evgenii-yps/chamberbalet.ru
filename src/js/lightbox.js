/**
 * Лайтбокс галереи. Ванильный, без библиотеки.
 *
 * Разметка работает и без него: миниатюра — обычная ссылка на полноразмер.
 * Скрипт перехватывает клик и открывает кадр поверх страницы; если скрипт не
 * выполнился, ссылка просто откроет файл. Ничего не ломается.
 *
 * Что обязано работать (E3 правки 06):
 *   Esc и клик вне кадра закрывают;
 *   ←/→ листают, по кругу;
 *   фокус заперт внутри окна, пока оно открыто;
 *   при закрытии фокус возвращается на ту миниатюру, с которой открыли;
 *   role="dialog" и aria-modal стоят в разметке;
 *   свайп на мобильном листает;
 *   при prefers-reduced-motion переход между кадрами без анимации.
 *
 * Полноразмер грузится только при открытии: src проставляется здесь, в
 * разметке его нет.
 */

const SWIPE_THRESHOLD = 45;   // px, как в навигации пролёта
const SWIPE_SLOPE = 1.2;      // горизонталь должна перевешивать вертикаль

/** Что вообще может получить фокус внутри окна. */
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function setupLightbox(root = document) {
  const box = root.getElementById?.('lightbox') || root.querySelector('#lightbox');
  const links = Array.from(root.querySelectorAll('.shots__link'));
  if (!box || !links.length) return null;

  const img = box.querySelector('.lightbox__img');
  const altEl = box.querySelector('.lightbox__alt');
  const countEl = box.querySelector('.lightbox__count');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** Счётчик берётся из разметки ссылки, а не из строки в скрипте: тексты
   *  живут в content.js и в код не переезжают. */
  const position = (n, total) => `${n} / ${total}`;

  let index = -1;
  let opener = null;          // миниатюра, с которой открыли
  let lastFocus = null;

  function show(i) {
    index = (i + links.length) % links.length;
    const link = links[index];
    const full = link.dataset.full;
    const alt = link.dataset.alt || '';

    // При уменьшенном движении подмены не показываем вовсе: кадр просто
    // встаёт. Иначе — гасим на время загрузки, чтобы не мелькал предыдущий.
    if (!reduce.matches) img.style.opacity = '0';
    img.alt = alt;
    img.width = Number(link.dataset.width) || 0;
    img.height = Number(link.dataset.height) || 0;
    img.src = full;                       // полноразмер тянется только сейчас
    const done = () => { img.style.opacity = ''; };
    if (img.complete) done();
    else img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });

    altEl.textContent = alt;
    countEl.textContent = position(index + 1, links.length);
    preload(index + 1);
  }

  /** Соседний кадр поднимаем заранее: листание не должно ждать сети. */
  function preload(i) {
    const link = links[(i + links.length) % links.length];
    if (!link || link.dataset.warm) return;
    link.dataset.warm = '1';
    const pre = new Image();
    pre.src = link.dataset.full;
  }

  function open(i, from) {
    opener = from || links[i];
    lastFocus = document.activeElement;
    box.hidden = false;
    // Класс ставится следующим кадром: на том же переход не запустится,
    // потому что элемент только что вышел из hidden.
    requestAnimationFrame(() => box.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    show(i);
    // Фокус — на КНОПКУ закрытия, а не на первый попавшийся [data-close]:
    // тем же атрибутом помечена подложка, а она <div> и фокус не принимает.
    // Молча: focus() на неподходящем узле не бросает, просто ничего не
    // делает, и фокус остаётся снаружи окна — то есть ловушка сторожит
    // пустое место, а Tab уводит на страницу под окном.
    box.querySelector('.lightbox__btn--close')?.focus?.();
    document.addEventListener('keydown', onKey, true);
  }

  function close() {
    box.classList.remove('is-open');
    box.hidden = true;
    document.body.style.overflow = '';
    img.removeAttribute('src');            // не держим полноразмер в памяти
    document.removeEventListener('keydown', onKey, true);
    // Фокус возвращается на исходную миниатюру. lastFocus — страховка на
    // случай, когда окно открыли не с миниатюры (например, программно).
    (opener || lastFocus)?.focus?.();
    opener = null;
  }

  /**
   * Ловушка фокуса. Перехват идёт в фазе погружения (capture), потому что
   * Tab внутри окна обязан остаться в окне независимо от того, что думает
   * элемент под курсором.
   */
  function onKey(e) {
    if (box.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); return; }
    if (e.key !== 'Tab') return;

    const items = Array.from(box.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && (active === first || !box.contains(active))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (active === last || !box.contains(active))) {
      e.preventDefault(); first.focus();
    }
  }

  links.forEach((link, i) => {
    link.addEventListener('click', (e) => {
      // Модификаторы и средняя кнопка оставляем браузеру: «открыть в новой
      // вкладке» на ссылке обязано работать.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      open(i, link);
    });
  });

  box.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-close]')) { close(); return; }
    if (t.closest('[data-prev]')) { show(index - 1); return; }
    if (t.closest('[data-next]')) { show(index + 1); return; }
  });

  /* Свайп. Горизонтальный жест листает, вертикальный отдаём странице. */
  let sx = 0, sy = 0, swiping = false;
  box.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { swiping = false; return; }
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = true;
  }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (!swiping) return;
    swiping = false;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * SWIPE_SLOPE) return;
    show(dx > 0 ? index - 1 : index + 1);
  }, { passive: true });

  return { open, close };
}
