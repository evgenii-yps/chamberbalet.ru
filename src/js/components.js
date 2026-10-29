/* Компоненты: вкладки репертуара и аккордеоны. */
import { reduced } from './reveal.js';

const EASE = 'cubic-bezier(.2,.7,.2,1)';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

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
      if (i === current && !panels[i].hidden) { if (focus) tabs[i].focus(); return; }
      const prev = panels[current];
      const mine = ++token;
      current = i;
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
      // список: старый уходит (140 мс), новые строки входят каскадом (шаг 35 мс, не больше 8)
      const show = () => {
        panels.forEach((p, j) => { p.hidden = j !== i; p.removeAttribute('data-later'); });
        if (!reduced()) $$('.row', panels[i]).slice(0, 8).forEach((r, k) => r.animate(
          [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
          { duration: 300, delay: k * 35, easing: EASE, fill: 'backwards' }));
      };
      if (reduced() || prev.hidden) show();
      else prev.animate({ opacity: [1, 0] }, { duration: 140, fill: 'forwards' }).onfinish = (e) => { e.target.cancel(); if (mine === token) show(); };
      moveBar();
      if (focus) tabs[i].focus();
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

/* ---- аккордеоны: плавная высота (320 мс открытие, 240 закрытие), «+» → «×» ---- */
export function initAccordions() {
  $$('details.row').forEach((d) => {
    const body = d.querySelector('.row__body');
    const inner = d.querySelector('.row__in');
    let anim = null;
    d.classList.toggle('is-open', d.open);
    d.addEventListener('toggle', () => { if (!anim) d.classList.toggle('is-open', d.open); });
    d.querySelector('summary').addEventListener('click', (e) => {
      if (reduced()) return;                       // нативное поведение, мгновенно
      e.preventDefault();
      if (anim) anim.cancel();
      const opening = !d.open;
      if (opening) { d.open = true; d.classList.add('is-open'); } else d.classList.remove('is-open');
      const to = opening ? body.scrollHeight : 0;
      const from = opening ? 0 : body.getBoundingClientRect().height;
      body.style.overflow = 'hidden';
      anim = body.animate({ height: [`${from}px`, `${to}px`] }, { duration: opening ? 320 : 240, easing: EASE });
      inner.animate({ opacity: opening ? [0, 1] : [1, 0] }, { duration: opening ? 240 : 160, delay: opening ? 80 : 0, easing: 'linear', fill: 'backwards' });
      anim.onfinish = () => { anim = null; body.style.overflow = ''; if (!opening) d.open = false; };
      anim.oncancel = () => { anim = null; body.style.overflow = ''; };
    });
  });
}
