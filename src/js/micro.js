/* Микро-переходы (6.4): аккордеоны, счётчики, появление линеек и шагов, каскады. */
const EASE = 'cubic-bezier(.2,.7,.2,1)';
const root = document.documentElement;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ----------------------------- аккордеоны ----------------------------- */
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
      const h = body.scrollHeight;
      body.style.overflow = 'hidden';
      const from = opening ? 0 : body.getBoundingClientRect().height;
      const to = opening ? h : 0;
      anim = body.animate({ height: [`${from}px`, `${to}px`] }, { duration: opening ? 320 : 240, easing: EASE });
      inner.animate({ opacity: opening ? [0, 1] : [1, 0] },
        { duration: opening ? 240 : 160, delay: opening ? 80 : 0, easing: 'linear', fill: 'backwards' });
      const done = () => { anim = null; body.style.overflow = ''; if (!opening) d.open = false; };
      anim.onfinish = done;
      anim.oncancel = () => { anim = null; body.style.overflow = ''; };
    });
  });
}

/* ----------------------------- счётчики ----------------------------- */
const NUM = /\d+(?:,\d+)?/g;
const fmt = (v, dec) => (dec ? v.toFixed(1).replace('.', ',') : String(Math.round(v)));

function count(el) {
  const text = el.textContent;
  const nums = [...text.matchAll(NUM)].map((m) => ({ to: parseFloat(m[0].replace(',', '.')), dec: m[0].includes(',') }));
  const render = (k) => { let i = 0; el.textContent = text.replace(NUM, () => { const n = nums[i++]; return fmt(n.to * k, n.dec); }); };
  render(0);
  return (k) => render(k);
}

export function initCounters() {
  $$('[data-count]').forEach((el) => {
    const set = count(el);
    new IntersectionObserver(([e], io) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 900);
        set(1 - (1 - p) ** 3);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 }).observe(el);
  });
}

/* ------------------------ появление при прокрутке ------------------------ */
export function initReveals() {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: 0.4 });
  $$('.h2').forEach((h) => io.observe(h));
  const steps = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); steps.unobserve(e.target); }
  }), { threshold: 0.2 });
  $$('[data-steps]').forEach((s) => steps.observe(s));
}

/* ------------------------------- каскады ------------------------------- */
/** Строки списка входят по одной: opacity + сдвиг 8 px, не больше max штук. */
export function cascade(rows, { step = 35, max = 8 } = {}) {
  if (reduced()) return;
  rows.slice(0, max).forEach((el, i) => el.animate(
    [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
    { duration: 300, delay: i * step, easing: EASE, fill: 'backwards' }));
}

export function initMicro() {
  if (!reduced()) root.classList.add('anim');
  initAccordions();
  if (!reduced()) { initCounters(); initReveals(); }
}
