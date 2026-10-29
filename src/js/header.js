/**
 * Шапка: плотная после первого экрана, прячется при прокрутке вниз и
 * возвращается при прокрутке вверх, линия прогресса чтения, бегунок под
 * пунктом текущего раздела, полноэкранное меню на телефоне.
 */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;

export function initHeader() {
  const top = $('#topbar');
  const hero = $('#top');
  const burger = $('.burger', top);
  const menu = $('.menu', top);
  const run = $('.menu__run', top);
  const panel = $('#mpanel');
  let hovering = false;

  /* ---- плотная после первого экрана: считаем по положению прокрутки, а не по событию пересечения,
          чтобы прыжок (scrollTo, якорь, восстановление позиции) тоже давал верное состояние ---- */
  const syncSolid = () => top.classList.toggle('is-solid', scrollY > hero.offsetHeight - top.offsetHeight);

  /* ---- прячется вниз, возвращается вверх; прогресс чтения ---- */
  let lastY = scrollY, ticking = false, acc = 0;
  const frame = () => {
    ticking = false;
    const y = scrollY;
    syncSolid();
    const dy = y - lastY;
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    top.style.setProperty('--read', max > 0 ? (y / max).toFixed(4) : '0');
    const menuOpen = top.classList.contains('is-menu-open');
    if (y < 80 || menuOpen || hovering || top.contains(document.activeElement) && document.activeElement !== document.body) {
      top.classList.remove('is-hidden'); acc = 0; return;
    }
    acc = Math.sign(dy) === Math.sign(acc) ? acc + dy : dy;     // накопленный ход в одну сторону
    if (acc > 12) top.classList.add('is-hidden');
    else if (acc < -8) top.classList.remove('is-hidden');
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  top.addEventListener('pointerenter', () => { hovering = true; top.classList.remove('is-hidden'); });
  top.addEventListener('pointerleave', () => { hovering = false; });
  top.addEventListener('focusin', () => top.classList.remove('is-hidden'));
  addEventListener('resize', syncSolid);
  addEventListener('pageshow', syncSolid);
  syncSolid();
  frame();

  /* ---- меню на телефоне ---- */
  const setMenu = (open, back) => {
    top.classList.toggle('is-menu-open', open);
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? burger.dataset.close : burger.dataset.open);
    if (open) top.classList.remove('is-hidden');
    if (open) panel.querySelector('a')?.focus({ preventScroll: true });
    else if (back) burger.focus();
  };
  burger.addEventListener('click', () => setMenu(!top.classList.contains('is-menu-open')));
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  top.addEventListener('keydown', (e) => {
    const open = top.classList.contains('is-menu-open');
    if (e.key === 'Escape' && open) { setMenu(false, true); return; }
    if (e.key === 'Tab' && open) {                       // фокус не уходит из открытого меню
      const items = $$('a[href], button', top).filter((el) => el.offsetParent !== null && !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden');
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  matchMedia('(min-width: 980px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---- пункт текущего раздела: один бегунок ---- */
  const links = [...$$('.menu__a', top), ...$$('.mpanel__a', top)];
  const byId = new Map();
  links.forEach((a) => { const id = a.getAttribute('href').slice(1); (byId.get(id) || byId.set(id, []).get(id)).push(a); });
  let active = null;
  const moveRun = () => {
    const a = active && byId.get(active)?.find((x) => x.closest('.menu') && !x.hidden);
    if (!a || a.offsetWidth === 0) { menu.classList.remove('has-active'); return; }
    run.style.setProperty('--x', `${a.offsetLeft}px`);
    run.style.setProperty('--w', `${a.offsetWidth}px`);
    menu.classList.add('has-active');
  };
  const paint = () => {
    links.forEach((a) => (byId.get(active)?.includes(a) ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    moveRun();
  };
  const current = new Map();
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => current.set(e.target.id, e.isIntersecting));
    const next = [...byId.keys()].find((id) => current.get(id)) || null;
    if (next !== active) { active = next; paint(); }
  }, { rootMargin: '-35% 0px -60% 0px' });
  byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  addEventListener('resize', moveRun);
  document.addEventListener('modechange', moveRun);
  document.fonts?.ready.then(moveRun);
}
