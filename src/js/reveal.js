/**
 * Появление секций после пролёта. IntersectionObserver, никакого скролл-цикла.
 */
export function setupReveal(root = document) {
  const items = root.querySelectorAll('.reveal');
  if (!items.length) return;

  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  items.forEach((el) => observer.observe(el));
}
