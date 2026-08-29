/**
 * Ролик секции «Как это выглядит в зале».
 *
 * Задача ровно одна: поставить постер тогда, когда он понадобится, и ни
 * секундой раньше. Атрибут poster в разметке заставил бы браузер тянуть
 * картинку вместе с документом — то есть на первом экране, где секции видео
 * ещё нет и в помине. Поэтому путь лежит в data-poster, а poster ставится,
 * когда секция входит в область просмотра.
 *
 * Сам ролик держится на preload="none" и не грузится, пока зритель не нажал
 * play. Автовоспроизведения нет, звук включает зритель.
 */
import { observeOnce } from './observe.js';

export function setupStageVideo(root = document) {
  const videos = root.querySelectorAll('.filmstrip__video[data-poster]');
  if (!videos.length) return;

  const arm = () => observeOnce(videos, (video) => {
    const src = video.dataset.poster;
    if (!src) return;
    video.poster = src;
    // Атрибут снимается, чтобы повторный проход не назначал его заново.
    delete video.dataset.poster;
    // rootMargin ноль: постер приходит, когда секция действительно доходит
    // до экрана. Он весит около девяти килобайт и успевает встать до того,
    // как зритель на него посмотрит.
  }, { rootMargin: '0px', threshold: 0 });

  /*
   * Наблюдение включается только после того, как пролёт отпустил страницу.
   *
   * Пока пролёт идёт, .flight стоит position: fixed и из потока вынут — то
   * есть текстовые секции лежат в самом верху документа, а не под ним, и
   * геометрически попадают в область просмотра с первого кадра. Наблюдатель
   * про заслонённость ничего не знает и честно сообщает «секция видна», хотя
   * поверх неё во весь экран стоит фотография.
   *
   * Из-за этого постер уезжал в первую загрузку и при нулевом rootMargin.
   * Поймано приёмкой: один запрос stage-poster до единой прокрутки.
   *
   * Признак — класс flight-done на <html>. Именно он, а не is-flight на
   * body: setupStageVideo вызывается из init() ДО enterFlight(0), и в этот
   * момент is-flight ещё не выставлен — проверка на него срабатывала бы на
   * пустом месте и включала наблюдение сразу. flight-done же появляется
   * ровно один раз и ровно тогда, когда страница отдана зрителю.
   *
   * Раскладки пролёта может не быть вовсе: уменьшенное движение, нет
   * разметки, скрипт пролёта не поднялся. Тогда секции лежат обычной
   * стопкой, заслонять их нечему, и наблюдение включается сразу.
   */
  const html = document.documentElement;
  const flightRuns = html.classList.contains('js')
    && document.querySelector('.flight')
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!flightRuns || html.classList.contains('flight-done')) { arm(); return; }

  const watcher = new MutationObserver(() => {
    if (!html.classList.contains('flight-done')) return;
    watcher.disconnect();
    arm();
  });
  watcher.observe(html, { attributes: true, attributeFilter: ['class'] });
}
