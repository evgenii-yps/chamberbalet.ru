/**
 * Появление при прокрутке. Скрипт только ставит класс .is-in; само движение —
 * в motion.css и только при .anim (то есть без prefers-reduced-motion).
 */
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const once = (els, opts) => {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), opts);
  els.forEach((el) => io.observe(el));
};

export function initReveals() {
  if (reduced()) return;
  document.documentElement.classList.add('anim');
  // пиктограммы рисуются линией при первом появлении
  once($$('.why__ico, .chips .ico, .step__ico, .inv__ico, .person__c .ico, .qrcard__n .ico'), { threshold: 0.6 });
}
