/**
 * Разметка страницы v2. Тексты — из src/content.js, пиктограммы — из
 * src/icons.js, медиа — из media/media.json через build-media.mjs.
 */
import * as C from '../src/content.js';
import { spriteSvg, ico } from '../src/icons.js';
import { qrSvg } from './qr.mjs';

const NB = '\u00a0';

export const esc = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** Неразрывные пробелы: после предлогов и союзов до трёх букв, в инициалах, перед тире, у чисел. */
export function typo(s) {
  return s
    .replace(/(?<=(?:^|[\s«(])[А-Яа-яЁёA-Za-z]{1,3}) (?=\S)/g, NB)
    .replace(/(?<=(?:^|[\s«(])[А-ЯЁ]\.) (?=[А-ЯЁ])/g, NB)
    .replace(/ (?=[—–])/g, NB)
    .replace(/(?<=\d) (?=[×мчк]|мин|сезон|стран)/g, NB)
    .replace(/(?<=×) /g, NB);
}

/** Строка в разметку: экранирование, типографика, {НЕ} → span. */
export const t = (s) => typo(esc(s)).replaceAll('{НЕ}', '<span class="ne-i">{НЕ}</span>');
const attr = (s) => esc(typo(s)).replaceAll('{НЕ}', '{НЕ}');

/** Заголовок: [обычное, ключевое слово патиной]. */
const parts = (p) => `${t(p[0])}<span class="k">${t(p[1])}</span>`;

/** Знак {НЕ}: скобки, слово и линия-пульс. */
const mk = () =>
  '<span class="mk"><span class="mk__b" aria-hidden="true">{</span>' +
  '<span class="mk__ne"><span class="mk__t">НЕ</span><i class="mk__ul"></i></span>' +
  '<span class="mk__b" aria-hidden="true">}</span></span>';

/** Фраза по словам — маска, каскад задаёт --i. */
function words(s, start = 0) {
  return typo(esc(s)).split(' ').map((w, i) =>
    `<span class="w" style="--i:${start + i}"><span>${w}</span></span>`).join(' ');
}

/** Детерминированный «случай»: сборка воспроизводима. */
function rng(seed) {
  let x = seed;
  return () => ((x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

export function createRenderer({ fonts, media, warnings = [] }) {
  const registry = {};      // слоты, которые открывает плеер
  const modesAttr = (modes) => (modes ? ` data-modes="${modes.join(' ')}"` : '');

  /* ------------------------------- медиа ------------------------------- */

  const playBtn = (id, label, group) =>
    `<button type="button" class="play" data-play="${id}"${group ? ` data-group="${group}"` : ''} aria-label="${attr(C.ui.play)}: ${attr(label)}">${ico('play')}</button>`;

  function picture(m, { sizes = '100vw', alt = '' } = {}) {
    const set = (arr) => arr.map((x) => `${x.url} ${x.w}w`).join(', ');
    const last = m.jpg[m.jpg.length - 1];
    return `<picture><source type="image/webp" srcset="${set(m.webp)}" sizes="${sizes}">` +
      `<img src="${m.jpg[0].url}" srcset="${set(m.jpg)}" sizes="${sizes}" alt="${esc(alt || m.alt)}" width="${m.width}" height="${m.height}" loading="lazy" decoding="async"></picture>`;
  }

  /**
   * Слот медиа. Нет файла — заглушка (свечение, зерно, подпись слота).
   * o: type, cls, ratio, play (кнопка Play), group, sizes, parallax, tag (скрыть подпись у реального).
   */
  function slotMedia(slot, o = {}) {
    const m = media[slot.id];
    const type = o.type || slot.type || 'img';
    const ratio = o.ratio || slot.ratio;
    const style = ratio ? ` style="aspect-ratio:${ratio}"` : '';
    const E = o.el || 'div';
    const cls = `media${o.cls ? ' ' + o.cls : ''}${o.parallax ? ' media--par' : ''}`;
    const par = o.parallax ? ' data-fx="par"' : '';
    const label = (m && m.caption) || slot.tag;
    const wrap = (c, inner, extra = '') => `<${E} class="${c}" data-slot="${slot.id}"${style}${extra}><${E} class="media__in"${par}>${inner}</${E}>`;

    if (type === 'inline') {
      registry[slot.id] = m && (m.src || m.poster)
        ? { kind: 'video', src: m.src || null, poster: m.poster || null, caption: m.caption || slot.tag }
        : { kind: 'ph', caption: slot.tag };
    }

    if (type === 'bg' && m && (m.src || m.poster)) {
      if (o.full) registry[slot.id] = { kind: 'video', src: m.full || m.src || null, poster: m.poster || null, caption: m.caption || slot.tag };
      return wrap(cls, `<video class="media__bg" muted loop playsinline preload="none"${m.poster ? ` poster="${m.poster}"` : ''} data-bg${m.src ? ` data-src="${m.src}"` : ''}></video>`) + `</${E}>`;
    }
    if (type === 'inline' && m && (m.src || m.poster)) {
      return wrap(`${cls} is-real`, (m.poster ? `<img src="${m.poster}" alt="" loading="lazy" decoding="async">` : '') +
        (m.preview ? `<video class="media__prev" muted loop playsinline preload="none" data-src="${m.preview}"></video>` : '')) +
        `${playBtn(slot.id, label, o.group)}${m.caption ? `<span class="tag">${t(m.caption)}</span>` : ''}</${E}>`;
    }
    if (type === 'img' && m && m.jpg) {
      if (o.lightbox) registry[slot.id] = { kind: 'img', src: m.jpg[m.jpg.length - 1].url, caption: m.alt || slot.tag };
      return wrap(`${cls} is-real`, picture(m, { sizes: o.sizes || '(min-width:1000px) 50vw, 100vw', alt: slot.tag })) + `</${E}>`;
    }
    // заглушка: свечение, зерно, подпись слота
    if (o.lightbox) registry[slot.id] = { kind: 'ph', caption: slot.tag };
    if (o.full) registry[slot.id] = { kind: 'ph', caption: slot.tag };
    return wrap(`${cls} is-ph`, '') +
      `${type === 'inline' ? playBtn(slot.id, slot.tag, o.group) : ''}<span class="tag${o.tagRight ? ' tag--r' : ''}">${t(slot.tag)}</span></${E}>`;
  }

  /** Плитка кадра: вся плитка — кнопка лайтбокса. */
  function tile(slot, cls = '', group = 'gallery') {
    const inner = slotMedia(slot, { type: 'img', lightbox: true, el: 'span', sizes: '(min-width:1000px) 33vw, 50vw' });
    return `<button type="button" class="tile ${cls}" data-play="${slot.id}" data-group="${group}" aria-label="${attr(C.ui.openPhoto)}: ${attr(slot.tag)}">${inner}</button>`;
  }

  /* ------------------------------ служебное ------------------------------ */

  function renderPreload() {
    return (fonts.faces || []).filter((f) => f.preload)
      .map((f) => `<link rel="preload" href="/assets/fonts/${f.file}" as="font" type="font/woff2" crossorigin>`).join('\n');
  }

  function renderJsonLd() {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'PerformingArtsTheater',
      name: C.site.name,
      description: C.site.description,
      url: C.site.url,
      founder: { '@type': 'Person', name: C.troupe.director.name },
      address: { '@type': 'PostalAddress', addressLocality: C.site.city, addressCountry: 'RU' },
      telephone: '+79052327890',
      email: 'lesya84@yandex.ru',
    };
    return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  }

  /** Данные для скриптов: подписи режимов, подписи плеера, реестр медиа. Единственный источник — content.js. */
  function renderAppData() {
    const data = {
      lead: Object.fromEntries(Object.entries(C.hero.lead).map(([k, v]) => [k, t(v)])),
      ne: { remove: C.ui.neRemove, restore: C.ui.neRestore },
      ui: C.ui,
      media: registry,
    };
    return `<script type="application/json" id="app-data">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`;
  }

  const sprite = () => spriteSvg();

  /* --------------------------------- шапка --------------------------------- */

  function seg(kind) {
    const label = (s) => (kind === 'big' ? s.big : s.mini);
    return `<div class="seg seg--${kind}" role="group" aria-label="${esc(kind === 'big' ? C.ui.bigSwitchLabel : C.ui.switchLabel)}">` +
      '<i class="seg__run" aria-hidden="true"></i>' +
      C.switcher.map((s) =>
        `<button type="button" class="seg__b" data-set-mode="${s.mode}" aria-pressed="${s.mode === 'all'}">` +
        `<span class="seg__l">${t(label(s))}</span>` +
        (kind === 'big' ? `<span class="seg__s">${t(s.sub)}</span>` : '') +
        '</button>').join('') +
      '</div>';
  }

  function renderTopbar() {
    const links = (cls) => C.menu.map((m) =>
      `<a class="${cls}" href="${m.href}"${modesAttr(m.modes)}>${t(m.label)}</a>`).join('');
    const contacts = C.quickContacts.map((c) =>
      `<a class="mpanel__c" href="${c.href}"${c.external ? ' target="_blank" rel="noopener"' : ''}>${ico(c.icon)}<span>${t(c.label)}</span></a>`).join('');
    return `<header class="top" id="topbar">
  <div class="top__bar">
    <a class="brand" href="#top" aria-label="${attr(C.site.name)} — наверх"><span class="brand__t" aria-hidden="true">${typo('Театр')} ${mk()} Камерного${NB}балета</span></a>
    <nav class="menu" id="menu" aria-label="${esc(C.ui.menuNav)}">${links('menu__a')}<i class="menu__run" aria-hidden="true"></i></nav>
    ${seg('mini')}
    <button type="button" class="burger" aria-expanded="false" aria-controls="mpanel" aria-label="${esc(C.ui.menuOpen)}" data-open="${esc(C.ui.menuOpen)}" data-close="${esc(C.ui.menuClose)}"><span class="burger__i" aria-hidden="true"></span></button>
  </div>
  <i class="top__progress" aria-hidden="true"></i>
  <div class="mpanel" id="mpanel" aria-label="${esc(C.ui.menuNav)}">
    <nav class="mpanel__nav" aria-label="${esc(C.ui.menuNav)}">${C.menu.map((m, i) => `<a class="mpanel__a" href="${m.href}"${modesAttr(m.modes)} style="--i:${i}"><span>${t(m.label)}</span></a>`).join('')}</nav>
    <div class="mpanel__foot">${seg('panel')}<div class="mpanel__contacts">${contacts}</div></div>
  </div>
</header>`;
  }

  /* ------------------------------ первый экран ------------------------------ */

  function renderArc() {
    const n = 15;
    const rand = rng(29102026);
    let out = '<div class="arc">';
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (i / (n - 1));
      const x = (50 - 47 * Math.cos(a)).toFixed(2);
      const y = (Math.sin(a) * 100).toFixed(2);
      const ord = Math.min(i, n - 1 - i);
      const period = (2.5 + rand() * 2).toFixed(2);
      const phase = (-rand() * 4.5).toFixed(2);
      out += `<b class="arc__f" style="--x:${x}%;--y:${y}%;--ord:${ord}"><i style="--p:${period}s;--ph:${phase}s"></i></b>`;
    }
    return out + '</div>';
  }

  function renderHero() {
    const h = C.hero;
    const sizers = ['all', 'chamber', 'big'].map((k) => `<span class="hero__sz" aria-hidden="true">${t(h.lead[k])}</span>`).join('');
    return `<section class="hero" id="top" aria-label="${esc(C.ui.theatreAria)}" data-hero>
  <div class="hero__halves" aria-hidden="true">
    <div class="hero__half hero__half--l">${slotMedia(h.left, { type: 'bg', cls: 'hero__m' })}</div>
    <div class="hero__half hero__half--r">${slotMedia(h.right, { type: 'bg', cls: 'hero__m', tagRight: true })}</div>
  </div>
  <div class="hero__shade" aria-hidden="true"></div>
  <div class="hero__fx" aria-hidden="true">
    <i class="seam"></i>
    <div class="beams"><i class="beam beam--1"></i><i class="beam beam--2"></i><i class="beam beam--3"></i></div>
    ${renderArc()}
    <div class="grain"></div>
    <div class="cursor-light"></div>
  </div>
  <div class="hero__in">
    <h1 class="mark" aria-label="${attr(C.site.name)}, ${esc(h.by)}">
      <span class="mark__l1">${t(h.line1)} <button type="button" class="ne" data-ne aria-label="${esc(C.ui.neRemove)}">${mk()}</button></span>
      <span class="mark__l2">${t(h.line2)}</span>
    </h1>
    <p class="hero__by">${t(h.by)}</p>
    <div class="hero__mode">
      <p class="hero__cap" id="mode-cap" aria-live="polite">${t(h.lead.all)}</p>
      ${sizers}
    </div>
    ${seg('big')}
  </div>
  <a class="cue" href="#manifest" aria-label="${esc(C.ui.scrollCueLabel)}">${t(C.ui.scrollCue)}<span class="cue__l" aria-hidden="true"></span></a>
</section>`;
  }

  /* -------------------------------- манифест -------------------------------- */

  function renderManifest() {
    const m = C.manifest;
    const variants = ['all', 'chamber', 'big'].map((k) => {
      const [a, b] = m.lead[k];
      const na = a.split(' ').length;
      return `<span class="mv mv--${k}">${words(a)} <span class="k">${words(b, na)}</span></span>`;
    }).join('');
    const why = m.why.map((w, i) => `<div class="why" style="--i:${i}"><i class="why__line" aria-hidden="true"></i>${ico(w.icon, 'why__ico')}<h2 class="h3">${t(w.title)}</h2><p>${t(w.text)}</p></div>`).join('');
    return `<section class="sec manifest" id="manifest" aria-label="О театре" data-reveal>
  <div class="wrap">
    <p class="manifest__lead" data-words>${variants}</p>
    <p class="manifest__text">${t(m.text)}</p>
    <div class="why-grid">${why}</div>
  </div>
</section>`;
  }

  /* ------------------------------- два масштаба ------------------------------- */

  function box(kind, name, kicker, d) {
    return `<div class="box box--${kind}"><p class="box__k">${t(kicker)}</p><p class="box__n">${t(name)}</p>` +
      `<p class="box__nums"><span><span class="num" data-count>${d.art}</span><span class="num__l">${t(C.scale.artists)}</span></span>` +
      `<span><span class="num" data-count>${d.trip}</span><span class="num__l">${t(C.scale.trip)}</span></span></p>` +
      `<p class="box__cast">${t(d.cast)}</p></div>`;
  }

  function renderScale() {
    const s = C.scale;
    const cards = s.flagships.map((f) => `<article class="card-wide" data-reveal>
      <div class="card-wide__media shutter">${slotMedia(f.slot, { sizes: '(min-width:1000px) 45vw, 100vw' })}</div>
      <div class="card-wide__body">
        <h3 class="card-wide__t">${t(f.name)}</h3>
        <p class="card-wide__cr">${t(f.credits)}</p>
        <p class="card-wide__tx">${t(f.text)}</p>
        <div class="boxes">${box('big', s.bigName, s.bigKicker, f.big)}${box('ch', s.chName, s.chKicker, f.ch)}</div>
      </div>
    </article>`).join('');
    const g = s.gala;
    return `<section class="sec sec--3 scale" id="scale" aria-labelledby="scale-h">
  <div class="wrap">
    <h2 class="h2 h2--rule" id="scale-h">${parts(s.title)}</h2>
    <p class="lead">${t(s.lead)}</p>
    <div class="cards">${cards}
    <article class="card-wide card-wide--gala" data-reveal>
      <div class="card-wide__media shutter">${slotMedia(g.slot, { sizes: '(min-width:1000px) 45vw, 100vw' })}</div>
      <div class="card-wide__body card-wide__body--row">
        <div class="gala__t"><p class="gala__k">${t(g.kicker)}</p><h3 class="card-wide__t card-wide__t--s">${t(g.name)}</h3><p>${t(g.text)}</p></div>
        <p class="gala__nums"><span><span class="num num--l" data-count>${g.soloists}</span><span class="num__l">${t(g.soloistsLabel)}</span></span><span><span class="num num--l" data-count>${g.trip}</span><span class="num__l">${t(g.tripLabel)}</span></span></p>
      </div>
    </article></div>
  </div>
</section>`;
  }

  /* -------------------------------- главы вечера -------------------------------- */

  function renderEvening() {
    const e = C.evening;
    const ch = e.chapters.map((c, i) => `<article class="chapter${i % 2 ? ' chapter--rev' : ''}" data-reveal>
      <div class="chapter__media shutter">${slotMedia(c.slot, { parallax: true, ratio: c.slot.ratio, group: 'chapters', sizes: '(min-width:1000px) 55vw, 100vw' })}</div>
      <div class="chapter__text"><p class="chapter__n">${c.n}</p><h3 class="chapter__t mask"><span>${t(c.title)}</span></h3><p>${t(c.text)}</p><p class="chapter__fact">${t(c.fact)}</p></div>
    </article>`).join('');
    return `<section class="sec evening" id="evening" aria-labelledby="evening-h" data-modes="all chamber">
  <div class="wrap"><h2 class="h2 h2--rule" id="evening-h">${parts(e.title)}</h2></div>
  <div class="evening__list" data-line><i class="evening__line" aria-hidden="true"></i>${ch}</div>
</section>`;
  }

  /* ---------------------------------- видеозал ---------------------------------- */

  function renderVideo() {
    const v = C.video;
    const vert = v.vertical.map((s) => `<div class="ribbon__i">${slotMedia(s, { group: 'video', cls: 'v-vert' })}</div>`).join('');
    return `<section class="sec sec--3 video" id="video" aria-labelledby="video-h">
  <div class="wrap">
    <div class="video__head"><h2 class="h2" id="video-h">${parts(v.title)}</h2><p class="video__lead">${t(v.lead)}</p></div>
    <div class="video__main shutter" data-reveal>${slotMedia(v.main, { ratio: '16 / 9', group: 'video' })}</div>
    <div class="ribbon" data-drag><div class="ribbon__track">${vert}</div></div>
    <p class="video__link"><a href="${v.archive.href}" target="_blank" rel="noopener">${t(v.archive.label)}</a></p>
  </div>
</section>`;
  }

  /* ---------------------------------- репертуар ---------------------------------- */

  function renderRow(it) {
    const v = ['all', 'chamber', 'big'].map((k) => `<span class="v v--${k}">${t(C.versionLine[k])}</span>`).join('');
    return `<details class="row">
        <summary class="row__sum"><span class="row__name">${t(it.name)}</span><span class="row__meta">${t(it.meta)}</span>${ico('plus', 'row__plus')}</summary>
        <div class="row__body"><div class="row__in"><p class="row__text">${t(it.text)}</p><p class="row__ver">${v}</p></div></div>
      </details>`;
  }

  function renderRep() {
    const r = C.rep;
    const total = r.groups.reduce((n, g) => n + g.items.length, 0);
    const posters = r.posters.map((p) => `<a class="poster" href="#rep-list">
        <div class="poster__m">${slotMedia(p.slot, { sizes: '(min-width:1000px) 25vw, 50vw' })}</div>
        <p class="poster__k">${t(p.kind)}</p><h3 class="poster__t">${t(p.name)}</h3><p class="poster__meta">${t(p.meta)}</p></a>`).join('');
    const tabs = r.groups.map((g, i) =>
      `<button type="button" role="tab" class="tabs__t" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span>${t(g.tab)}</span><span class="tabs__n">${g.items.length}</span></button>`).join('');
    const panels = r.groups.map((g, i) =>
      `<div class="panel" role="tabpanel" id="panel-${i}" aria-labelledby="tab-${i}"${i === 0 ? '' : ' data-later'}>
      <h3 class="panel__h">${t(g.tab)}</h3>
      <p class="panel__note">${t(g.note)}</p>
      <div class="rows">${g.items.map(renderRow).join('\n      ')}</div>
    </div>`).join('\n    ');
    return `<section class="sec rep" id="rep" aria-labelledby="rep-h">
  <div class="wrap">
    <div class="rep__head"><div><h2 class="h2 h2--rule" id="rep-h">${t(r.title)}</h2></div><p class="rep__lead">${t(r.lead(total))}</p></div>
    <div class="posters">${posters}</div>
    <div class="tabs" id="rep-list" data-tabs>
      <div class="tabs__list" role="tablist" aria-label="${esc(r.tabsLabel)}">${tabs}<i class="tabs__bar" aria-hidden="true"></i></div>
    ${panels}
    </div>
  </div>
</section>`;
  }

  /* ----------------------------------- труппа ----------------------------------- */

  function renderTroupe() {
    const d = C.troupe.director;
    const tr = C.troupe;
    const facts = d.facts.map((f) => `<div class="dl__r"><dt>${t(f[0])}</dt><dd>${t(f[1])}</dd></div>`).join('');
    const ach = tr.achievements.map((a, i) => `<div class="ach" style="--i:${i}"><p class="ach__v"${/\d/.test(a.value) ? ' data-count' : ''}>${t(a.value)}</p><p class="ach__t">${t(a.text)}</p></div>`).join('');
    const faces = tr.faces.map((f) => `<div class="face"><div class="face__m">${slotMedia(f.slot, { sizes: '250px' })}</div><p class="face__n">${t(f.name)}</p><p class="face__s">${t(f.short)}</p></div>`).join('');
    const all = tr.all.map((s) => `<div class="all__i"><p class="all__n">${t(s.name)}</p><p class="all__b">${t(s.bio)}</p></div>`).join('');
    return `<section class="sec troupe" id="troupe" aria-labelledby="troupe-h">
  <div class="troupe__dir wrap">
    <div class="dir__ph shutter" data-reveal>${slotMedia(d.slot, { parallax: false, cls: 'dir__m', sizes: '(min-width:1000px) 40vw, 100vw' })}</div>
    <div class="dir__t" data-reveal>
      <p class="eyebrow">${t(d.role)}</p>
      <h2 class="dir__n" id="troupe-h">${t(d.name)}</h2>
      <p class="dir__lead">${t(d.lead)}</p>
      <dl class="dl">${facts}</dl>
    </div>
  </div>
  <div class="wrap ach-grid" data-reveal>${ach}</div>
  <div class="wrap"><h3 class="h2-s">${t(tr.facesTitle)}</h3><p class="faces__lead">${t(tr.facesLead)}</p></div>
  <div class="ribbon ribbon--faces" data-drag><div class="ribbon__track">${faces}</div></div>
  <div class="wrap"><details class="row row--all">
    <summary class="row__sum"><span class="row__name">${t(tr.allTitle(tr.all.length))}</span>${ico('plus', 'row__plus')}</summary>
    <div class="row__body"><div class="row__in row__in--wide"><div class="all">${all}</div></div></div>
  </details></div>
</section>`;
  }

  /* ---------------------------------- площадкам ---------------------------------- */

  function renderVenues() {
    const v = C.venues;
    const params = v.params.map((p) => `<div class="param"><dt>${t(p.label)}</dt><dd class="param__v" data-count>${esc(p.value)}</dd></div>`).join('');
    const bring = v.bring.map((b, i) => `<li style="--i:${i}">${ico(b.icon)}<span>${t(b.label)}</span></li>`).join('');
    const need = v.need.map((n) => `<div class="need__r"><h4>${t(n.title)}</h4><p>${t(n.text)}</p></div>`).join('');
    const models = v.models.map((m, i) => `<div class="model" style="--i:${i}"><p class="model__n">${m.n}</p><h4 class="model__t">${t(m.title)}</h4>` +
      v.modelRows.map((r, j) => `<p class="model__k">${t(r)}</p><p class="model__v">${t(m.cells[j])}</p>`).join('') + '</div>').join('');
    const qr = qrSvg(media['qr-rider']?.url || C.contacts.riderQr.url, esc(C.contacts.riderQr.tag));
    return `<section class="sec sec--light venues" id="venues" aria-labelledby="venues-h" data-modes="all chamber">
  <div class="torn" aria-hidden="true"></div>
  <div class="wrap">
    <p class="eyebrow">${t(v.eyebrow)}</p>
    <h2 class="h2 h2--rule" id="venues-h">${parts(v.title)}</h2>
    <dl class="params" aria-label="${esc(v.paramsLabel)}" data-reveal>${params}</dl>
    <div class="venues__cols">
      <div>
        <h3 class="h3 h3--s">${t(v.bringTitle)}</h3>
        <ul class="chips" data-reveal>${bring}</ul>
        <h3 class="h3 h3--s h3--gap">${t(v.needTitle)}</h3>
        <div class="need">${need}</div>
      </div>
      <aside class="rider" aria-label="${esc(v.rider.aria)}" data-reveal>
        <div class="qrbox">${qr}</div>
        <div><p class="rider__t">${t(v.rider.title)}</p><p class="rider__x">${t(v.rider.text)}</p><a href="${v.rider.link.href}">${t(v.rider.link.label)}</a></div>
      </aside>
    </div>
    <h3 class="h2-s h2-s--gap">${t(v.modelsTitle)}</h3>
    <p class="models__lead">${t(v.modelsLead)}</p>
    <div class="models" data-reveal>${models}</div>
    <p class="models__note">${t(v.modelsNote)}</p>
    <a class="btn btn--on-light" href="${v.cta.href}">${t(v.cta.label)}</a>
  </div>
</section>`;
  }

  /* ---------------------------------- заказчикам ---------------------------------- */

  function renderClients() {
    const c = C.clients;
    const steps = c.steps.map((s, i) => `<li class="step" style="--i:${i}"><div class="step__m shutter">${slotMedia(s.slot, { sizes: '(min-width:1000px) 30vw, 100vw' })}</div>
      <div class="step__h">${ico(s.icon, 'step__ico')}<h3>${t(s.t)}</h3></div><p>${t(s.d)}</p></li>`).join('');
    const formats = c.formats.map((f, i) => `<div class="fmt" style="--i:${i}"><h4>${t(f.t)}</h4><p class="fmt__p">${t(f.p)}</p><p>${t(f.d)}</p></div>`).join('');
    const prem = c.premieres.map((p, i) => `<div class="prem" style="--i:${i}"><p class="prem__k">${t(p.kicker)}</p><h4>${t(p.t)}</h4><p>${t(p.d)}</p></div>`).join('');
    return `<section class="sec sec--3 clients" id="clients" aria-labelledby="clients-h" data-modes="all big">
  <div class="clients__bg">${slotMedia(c.video, { type: 'bg', cls: 'clients__m', parallax: true, full: true })}${playBtn(c.video.id, c.video.tag, null)}</div>
  <div class="wrap">
    <p class="eyebrow">${t(c.eyebrow)}</p>
    <h2 class="h2 h2--rule" id="clients-h">${parts(c.title)}</h2>
    <p class="lead">${t(c.lead)}</p>
    <ol class="steps" data-reveal>${steps}</ol>
    <h3 class="h2-s h2-s--gap">${t(c.formatsTitle)}</h3>
    <p class="clients__fl">${t(c.formatsLead)}</p>
    <div class="fmts" data-reveal>${formats}</div>
    <div class="prems" data-reveal>${prem}</div>
    <a class="btn" href="${c.cta.href}">${t(c.cta.label)}</a>
  </div>
</section>`;
  }

  /* ----------------------------------- гастроли ----------------------------------- */

  function renderTour() {
    const g = C.tour;
    const list = (b) => `<div><p class="tour__k">${t(b.kicker)}</p><h3 class="tour__h">${t(b.title)}</h3><ul class="dots">${b.items.map((x, i) => `<li style="--i:${i}"><i class="dot" aria-hidden="true"></i><span>${t(x)}</span></li>`).join('')}</ul></div>`;
    const design = g.design.map((d) => `<div class="opt"><div class="opt__m shutter">${slotMedia(d.slot, { sizes: '(min-width:1000px) 45vw, 100vw' })}</div><div class="opt__b"><p class="opt__n">${t(d.n)}</p><h4>${t(d.t)}</h4><p>${t(d.d)}</p></div></div>`).join('');
    const invite = g.invite.map((s, i) => `<li class="inv" style="--i:${i}"><p class="inv__n">${s.n}</p>${ico(s.icon, 'inv__ico')}<h4>${t(s.t)}</h4><p>${t(s.d)}</p></li>`).join('');
    return `<section class="sec sec--light tour" id="tour" aria-labelledby="tour-h">
  <div class="torn" aria-hidden="true"></div>
  <div class="wrap">
    <p class="eyebrow">${t(g.eyebrow)}</p>
    <h2 class="h2" id="tour-h">${t(g.title[0])}<br><span class="k">${t(g.title[1])}</span></h2>
    <i class="tour__rule" aria-hidden="true"></i>
    <div class="tour__cols" data-reveal>${list(g.theatre)}${list(g.host)}</div>
    <h3 class="h2-s h2-s--gap">${t(g.designTitle)}</h3>
    <div class="opts">${design}</div>
    <p class="tour__note">${t(g.designNote)}</p>
    <h3 class="h2-s h2-s--gap">${t(g.inviteTitle)}</h3>
    <ol class="invite" data-reveal>${invite}</ol>
    <a class="btn btn--on-light" href="${g.cta.href}">${t(g.cta.label)}</a>
  </div>
</section>`;
  }

  /* ------------------------------------ кадры ------------------------------------ */

  function renderGallery() {
    const g = C.gallery;
    return `<section class="sec gallery" id="gallery" aria-labelledby="gallery-h">
  <div class="wrap"><h2 class="h2" id="gallery-h">${t(g.title)}</h2>
  <div class="mosaic" data-reveal>${g.tiles.map((x, i) => tile(x.slot, `${x.cls || ''}`.trim()).replace('<button ', `<button style="--i:${i}" `)).join('')}</div></div>
</section>`;
  }

  /* ----------------------------------- контакты ----------------------------------- */

  function renderContacts() {
    const c = C.contacts;
    const line = (icon, text, href, ext) => (href
      ? `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${ico(icon)}<span>${t(text)}</span></a>`
      : `<span class="pending">${ico(icon)}<span>${t(text)}</span></span>`);
    const people = c.people.map((p, i) => `<div class="person" style="--i:${i}">
      <div class="person__h"><div class="person__m">${slotMedia(p.slot, { sizes: '96px' })}</div><div><p class="person__n">${t(p.name)}</p><p class="person__r">${t(p.role)}</p></div></div>
      <p class="person__a">${t(p.about)}</p>
      <p class="person__c">${line('phone', p.tel, p.telHref)}${line('mail', p.mail, p.mailHref)}${line('telegram', p.tg, p.tgHref, true)}</p>
    </div>`).join('');
    const qrs = c.qr.map((q) => `<a class="qrcard" href="${q.url}" target="_blank" rel="noopener"><div class="qrbox qrbox--s">${qrSvg(media[q.id]?.url || q.url, esc(q.tag))}</div><span class="qrcard__t"><span class="qrcard__n">${ico(q.icon)}${t(q.title)}</span><span class="qrcard__x">${t(q.text)}</span></span></a>`).join('');
    return `<section class="sec sec--4 contacts" id="contacts" aria-labelledby="contacts-h">
  <div class="wrap">
    <h2 class="h2" id="contacts-h">${parts(c.title)}</h2>
    <p class="contacts__lead">${t(c.lead)}</p>
    <div class="people" data-reveal>${people}</div>
    <div class="qrs" data-reveal>${qrs}</div>
  </div>
</section>`;
  }

  /* ------------------------------------ футер ------------------------------------ */

  function renderFooter() {
    const f = C.footer;
    const bottom = f.bottom.map((b) => `<span>${t(b)}</span>`).join('<span aria-hidden="true"> · </span>');
    return `<footer class="foot">
  <div class="wrap">
    <p class="foot__big" aria-hidden="true">${typo('Театр')} ${mk()} Камерного${NB}балета</p>
    <div class="foot__grid">
      <div><p class="foot__mark">${t(C.hero.line1)} <span class="ne-i">{НЕ}</span><br>${t(C.hero.line2)}</p><p class="foot__x">${t(f.brand.role)}<br>${t(f.brand.producer)}</p></div>
      <div><h2 class="foot__h">${t(f.chamber.title)}</h2><p class="foot__x">${t(f.chamber.text)}</p></div>
      <div><h2 class="foot__h">${t(f.tour.title)}</h2><p class="foot__x">${t(f.tour.text)}</p></div>
    </div>
    <p class="foot__bottom">${bottom}</p>
  </div>
</footer>`;
  }

  function renderSections() {
    return [renderManifest(), renderScale(), renderEvening(), renderVideo(), renderRep(), renderTroupe(),
      renderVenues(), renderClients(), renderTour(), renderGallery(), renderContacts()].join('\n');
  }

  return { renderTopbar, renderHero, renderSections, renderFooter, renderJsonLd, renderPreload, renderAppData, sprite };
}
