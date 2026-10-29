/* Компоненты: вкладки репертуара. */
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
    const select = (i, focus) => {
      current = i;
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
      panels.forEach((p, j) => { p.hidden = j !== i; p.removeAttribute('data-later'); });
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
