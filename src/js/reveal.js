/**
 * Появление при прокрутке. Скрипт ставит класс .is-in; само движение — в
 * motion.css и только при .anim (то есть без prefers-reduced-motion).
 */
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const once = (els, opts, cb) => {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); cb?.(e.target); }
  }), opts);
  els.forEach((el) => io.observe(el));
};

/* ---- счётчики: от 0 до значения, 900 мс, один раз; диапазоны считают обе границы ---- */
const NUM = /\d+(?:,\d+)?/g;
const fmt = (v, dec) => (dec ? v.toFixed(1).replace('.', ',') : String(Math.round(v)));

function counter(el) {
  const text = el.textContent;
  const nums = [...text.matchAll(NUM)].map((m) => ({ to: parseFloat(m[0].replace(',', '.')), dec: m[0].includes(',') }));
  if (!nums.length) return null;
  const render = (k) => { let i = 0; el.textContent = text.replace(NUM, () => { const n = nums[i++]; return fmt(n.to * k, n.dec); }); };
  render(0);
  return render;
}

function initCounters() {
  $$('[data-count]').forEach((el) => {
    const render = counter(el);
    if (!render) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 900);
        render(1 - (1 - p) ** 3);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(el);
  });
}

export function initReveals() {
  if (reduced()) return;
  document.documentElement.classList.add('anim');
  initCounters();
  once($$('[data-reveal]'), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  once($$('.h2, .manifest__lead, .shutter, .mask, .why-grid, .ach-grid'), { threshold: 0.35 });
  // пиктограммы рисуются линией при первом появлении
  once($$('.why__ico, .chips .ico, .step__ico, .inv__ico, .person__c .ico, .qrcard__n .ico'), { threshold: 0.6 });
  // портреты: из чёрно-белого в цвет в центре экрана (телефон) — на hover работает CSS
  const faces = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-color', e.isIntersecting)),
    { rootMargin: '0px -38% 0px -38%' });
  $$('.face').forEach((f) => faces.observe(f));
}
