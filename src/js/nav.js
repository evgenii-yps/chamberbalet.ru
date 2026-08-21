/**
 * Ввод и послайдовая навигация.
 *
 * Одно действие — один слайд. Очередь из десятка мелких дельт тачпада должна
 * давать ровно один переход, поэтому:
 *   дельты копятся до порога 45 px;
 *   после перехода ставится замок, который снимается только после 180 мс
 *   тишины — пока палец на тачпаде, поток дельт замок продлевает;
 *   плюс пауза 150 мс после конца перехода.
 *
 * Остановиться между слайдами невозможно: наружу уходит только намерение
 * «следующий» / «предыдущий» / «на такой-то», а не позиция.
 */

const WHEEL_THRESHOLD = 45;   // px
const SILENCE = 180;          // мс тишины, снимающей замок
const AFTER_TRANSITION = 150; // мс паузы после перехода
const SWIPE_THRESHOLD = 45;   // px
const SWIPE_SLOPE = 1.2;      // насколько вертикаль должна перевешивать горизонталь

const LINE_HEIGHT = 16;

/** Дельта колеса в пикселях, независимо от deltaMode. */
function wheelDelta(event) {
  if (event.deltaMode === 1) return event.deltaY * LINE_HEIGHT;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

export function createNav({ target = window, onIntent, isEnabled }) {
  let accumulated = 0;
  /** Жест ещё идёт: снимается только тишиной. Держит очередь дельт тачпада. */
  let gestureLock = false;
  /** Переход ещё идёт: снимается, когда пролёт доехал до остановки. */
  let transitionPending = false;
  let silenceTimer = 0;
  let cooldownUntil = 0;

  const enabled = () => (isEnabled ? isEnabled() : true);
  const busy = () => gestureLock || transitionPending || performance.now() < cooldownUntil;

  function armSilence() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => { gestureLock = false; accumulated = 0; }, SILENCE);
  }

  /**
   * onIntent сообщает, начался ли переход. Если не начался — а так бывает на
   * первом кадре и на выходе из пролёта — ждать нечего, иначе ввод залипнет
   * навсегда.
   */
  function emit(intent, payload) {
    accumulated = 0;
    gestureLock = true;
    armSilence();
    transitionPending = onIntent(intent, payload) === true;
    if (!transitionPending) cooldownUntil = performance.now() + AFTER_TRANSITION;
  }

  /** Вызывается снаружи, когда переход закончился. */
  function transitionEnded() {
    transitionPending = false;
    cooldownUntil = performance.now() + AFTER_TRANSITION;
  }

  function onWheel(event) {
    if (!enabled()) return;
    event.preventDefault();

    // Поток дельт продлевает замок: пока палец на тачпаде, переход один
    if (gestureLock) armSilence();
    if (busy()) { accumulated = 0; return; }

    accumulated += wheelDelta(event);
    if (Math.abs(accumulated) < WHEEL_THRESHOLD) return;
    emit(accumulated > 0 ? 'next' : 'prev');
  }

  const KEYS_NEXT = new Set(['PageDown', 'ArrowDown', 'ArrowRight']);
  const KEYS_PREV = new Set(['PageUp', 'ArrowUp', 'ArrowLeft']);

  function onKey(event) {
    if (!enabled()) return;
    if (event.repeat) return;                                  // удержание не листает подряд
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const tag = event.target instanceof HTMLElement ? event.target.tagName : '';
    const inControl = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (inControl) return;

    let intent = null, payload;
    if (event.code === 'Space') intent = event.shiftKey ? 'prev' : 'next';
    else if (KEYS_NEXT.has(event.key)) intent = 'next';
    else if (KEYS_PREV.has(event.key)) intent = 'prev';
    else if (event.key === 'Home') { intent = 'goto'; payload = 'first'; }
    else if (event.key === 'End') { intent = 'goto'; payload = 'last'; }
    else if (event.key === 'Escape') { onIntent('contact'); return; }
    if (!intent) return;

    event.preventDefault();
    if (busy()) return;
    emit(intent, payload);
  }

  let touchY = 0, touchX = 0, touchActive = false, touchUsed = false;

  function onTouchStart(event) {
    if (!enabled() || event.touches.length !== 1) return;
    touchY = event.touches[0].clientY;
    touchX = event.touches[0].clientX;
    touchActive = true;
    touchUsed = false;
  }

  function onTouchMove(event) {
    if (!enabled() || !touchActive) return;
    const dy = touchY - event.touches[0].clientY;
    const dx = touchX - event.touches[0].clientX;
    if (Math.abs(dy) > Math.abs(dx) * SWIPE_SLOPE) event.preventDefault();
    if (gestureLock) armSilence();
    if (touchUsed || busy()) return;
    if (Math.abs(dy) < SWIPE_THRESHOLD || Math.abs(dy) <= Math.abs(dx) * SWIPE_SLOPE) return;
    touchUsed = true;                                          // один свайп — один слайд
    emit(dy > 0 ? 'next' : 'prev');
  }

  function onTouchEnd() {
    touchActive = false;
    armSilence();
  }

  function attach() {
    target.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    target.addEventListener('touchstart', onTouchStart, { passive: true });
    target.addEventListener('touchmove', onTouchMove, { passive: false });
    target.addEventListener('touchend', onTouchEnd, { passive: true });
    target.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  function detach() {
    target.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
    target.removeEventListener('touchstart', onTouchStart);
    target.removeEventListener('touchmove', onTouchMove);
    target.removeEventListener('touchend', onTouchEnd);
    target.removeEventListener('touchcancel', onTouchEnd);
    clearTimeout(silenceTimer);
  }

  return {
    attach, detach, transitionEnded,
    reset() { accumulated = 0; gestureLock = false; transitionPending = false; cooldownUntil = 0; },
  };
}
