import { cascade, reduced } from './micro.js';

/* Компоненты: вкладки репертуара, «показать всех», шапка с бургером и подсветкой раздела. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ------------------------------- вкладки ------------------------------- */
export function initTabs() {
  $$('[data-tabs]').forEach((root) => {
    const tabs = $$('[role="tab"]', root);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const bar = $('.tabs__bar', root);
    let current = 0;

    const moveBar = () => {
      const t = tabs[current];
      bar.style.setProperty('--x', `${t.offsetLeft}px`);
      bar.style.setProperty('--w', `${t.offsetWidth}px`);
    };
    let token = 0;
    const select = (i, focus) => {
      if (i === current && panels[i] && !panels[i].hidden) { if (focus) tabs[i].focus(); return; }
      const prev = panels[current];
      const mine = ++token;
      current = i;
      tabs.forEach((t, j) => {
        t.setAttribute('aria-selected', String(j === i));
        t.tabIndex = j === i ? 0 : -1;
      });
      const show = () => {
        panels.forEach((p, j) => { p.hidden = j !== i; p.removeAttribute('data-later'); });
        cascade($$('.row', panels[i]));
      };
      if (reduced() || prev.hidden) show();
      else prev.animate({ opacity: [1, 0] }, { duration: 140, fill: 'forwards' }).onfinish = (e) => {
        e.target.cancel();
        if (mine === token) show();
      };
      moveBar();
      if (focus) tabs[i].focus();
      tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const last = tabs.length - 1;
        const to = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        select(to, true);
      });
    });
    panels.forEach((p, j) => { p.hidden = j !== 0; });
    moveBar();
    addEventListener('resize', moveBar);
    document.fonts?.ready.then(moveBar);
  });
}

/* ---------------------- «Показать всех солистов» ---------------------- */
export function initMore() {
  const btn = $('[data-more]');
  if (!btn) return;
  const extra = $$('[data-extra]');
  let open = false;
  const paint = () => {
    extra.forEach((li) => { li.hidden = !open; });
    if (open && !reduced()) extra.forEach((li, k) => li.animate(
      [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
      { duration: 300, delay: k * 25, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }));
    btn.setAttribute('aria-expanded', String(open));
    btn.innerHTML = open ? btn.dataset.less : btn.dataset.all;
  };
  btn.hidden = false;
  paint();
  btn.addEventListener('click', () => {
    open = !open;
    paint();
    if (!open) document.getElementById('sol-h').scrollIntoView({ block: 'start' });
  });
}

/* --------------------------------- шапка --------------------------------- */
export function initHeader() {
  const top = $('#topbar');
  const burger = $('.burger', top);
  const hero = $('#top');
  const topH = () => top.getBoundingClientRect().height;

  // Прозрачная над первым экраном, плотная после него
  new IntersectionObserver(([e]) => top.classList.toggle('is-solid', !e.isIntersecting),
    { rootMargin: `-${Math.round(topH())}px 0px 0px 0px` }).observe(hero);

  // Бургер
  const setMenu = (open, back) => {
    top.classList.toggle('is-menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    if (back) burger.focus();
  };
  burger.addEventListener('click', () => setMenu(!top.classList.contains('is-menu-open')));
  top.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && top.classList.contains('is-menu-open')) { setMenu(false, true); }
  });
  $('.menu', top).addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', (e) => {
    if (top.classList.contains('is-menu-open') && !top.contains(e.target)) setMenu(false);
  });

  // Пункт текущего раздела
  const links = $$('.menu__a', top);
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const current = new Map();
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => current.set(e.target.id, e.isIntersecting));
    const active = [...byId.keys()].find((id) => current.get(id));
    links.forEach((a) => (a === byId.get(active) ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  }, { rootMargin: '-35% 0px -60% 0px' });
  byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
}
