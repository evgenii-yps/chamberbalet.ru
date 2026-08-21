/**
 * Видеофон первого экрана.
 *
 * Ролика может не быть — это нормальное состояние. Под видео всегда лежит
 * фотография первого кадра, поэтому любая осечка означает ровно одно:
 * элемент убирается, остаётся фотография. Ошибок в консоли быть не должно.
 */

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const savesData = () => {
  const c = navigator.connection;
  return Boolean(c && (c.saveData || /^(slow-)?2g$/.test(c.effectiveType || '')));
};

export function setupHeroVideo(video) {
  if (!video) return null;

  // На reduced-motion и в режиме экономии трафика видео не подключаем вовсе
  if (prefersReducedMotion() || savesData()) {
    video.remove();
    return null;
  }

  const wide = window.matchMedia('(min-width: 48rem)').matches;
  const sources = JSON.parse(video.dataset.sources || '[]')
    .filter((s) => (wide ? true : s.width <= 1280));
  const chosen = sources.length ? sources : JSON.parse(video.dataset.sources || '[]');
  if (!chosen.length) { video.remove(); return null; }

  let removed = false;
  const drop = () => {
    if (removed) return;
    removed = true;
    try { video.pause(); } catch { /* уже мёртв */ }
    video.removeAttribute('src');
    video.remove();
  };

  for (const source of chosen) {
    const el = document.createElement('source');
    el.src = source.src;
    el.type = source.type;
    video.append(el);
  }

  video.addEventListener('loadeddata', () => { video.classList.add('is-ready'); }, { once: true });
  video.addEventListener('error', drop, { once: true });
  // Последний <source> сообщает об ошибке отдельно: без этого молчаливый провал
  video.querySelector('source:last-of-type')?.addEventListener('error', drop, { once: true });

  video.load();
  const played = video.play();
  if (played && typeof played.catch === 'function') {
    // Автовоспроизведение отклонено — не ошибка, просто остаёмся на фотографии
    played.catch(drop);
  }

  let paused = false;
  const setActive = (active) => {
    if (removed) return;
    if (active && paused) { paused = false; video.play().catch(drop); }
    else if (!active && !paused) { paused = true; try { video.pause(); } catch { /* всё равно */ } }
  };

  document.addEventListener('visibilitychange', () => setActive(!document.hidden), { passive: true });

  return { setActive, drop };
}
