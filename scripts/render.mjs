/**
 * Разметка страницы. Все тексты — из src/content.js; здесь только вёрстка и
 * типографика (неразрывные пробелы, подстановка знака {НЕ}).
 */
import * as C from '../src/content.js';

const NB = '\u00a0';

export const esc = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** Неразрывные пробелы: после предлогов и союзов до трёх букв, внутри
 *  инициалов, перед тире, между числом и единицей. */
export function typo(s) {
  return s
    .replace(/(?<=(?:^|[\s«(])[А-Яа-яЁёA-Za-z]{1,3}) (?=\S)/g, NB)
    .replace(/(?<=(?:^|[\s«(])[А-ЯЁ]\.) (?=[А-ЯЁ])/g, NB)
    .replace(/ (?=[—–])/g, NB)
    .replace(/(?<=\d) (?=[×мчк]|мин)/g, NB)
    .replace(/(?<=×) /g, NB);
}

/** Текст для вставки в разметку: экранирование, типографика, {НЕ} → span. */
export const t = (s) => typo(esc(s)).replaceAll('{НЕ}', '<span class="ne-i">{НЕ}</span>');

const attr = (s) => esc(typo(s));
const slug = (s) => s;

/** Знак {НЕ}: скобки, слово и линия-пульс под ним. */
const mk = () =>
  '<span class="mk"><span class="mk__b" aria-hidden="true">{</span>' +
  '<span class="mk__ne"><span class="mk__t">НЕ</span><i class="mk__ul"></i></span>' +
  '<span class="mk__b" aria-hidden="true">}</span></span>';

/** Детерминированный «случай»: сборка воспроизводима. */
function rng(seed) {
  let x = seed;
  return () => ((x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

export function createRenderer({ fonts, media }) {
  const modesAttr = (modes) => (modes ? ` data-modes="${modes.join(' ')}"` : '');

  /* ------------------------------- служебное ------------------------------- */

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

  /** Подписи режимов отдаём скрипту данными: единственный источник — content.js. */
  function renderModesData() {
    const data = {
      modes: Object.fromEntries(Object.entries(C.modes).map(([k, m]) => [k, {
        caption: t(m.caption),
        buttons: m.buttons.map((b) => ({ label: t(b.label), href: b.href })),
      }])),
      ne: { remove: C.ui.neRemove, restore: C.ui.neRestore },
    };
    return `<script type="application/json" id="modes-data">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`;
  }

  /* --------------------------------- шапка --------------------------------- */

  function seg(kind) {
    const label = (s) => (kind === 'mini' ? s.mini : s.big);
    return `<div class="seg seg--${kind}" role="group" aria-label="${esc(C.ui.switchLabel)}">` +
      '<i class="seg__run" aria-hidden="true"></i>' +
      C.switcher.map((s) =>
        `<button type="button" class="seg__b" data-set-mode="${s.mode}" aria-pressed="${s.mode === 'all'}">` +
        `<span class="seg__l">${t(label(s))}</span>` +
        (kind === 'big' ? `<span class="seg__s">${t(s.sub)}</span>` : '') +
        '</button>').join('') +
      '</div>';
  }

  function renderTopbar() {
    const items = C.menu.map((m) =>
      `<a class="menu__a" href="${m.href}"${modesAttr(m.modes)}>${t(m.label)}</a>`).join('');
    return `<header class="top" id="topbar">
  <div class="top__in">
    <a class="brand" href="#top" aria-label="${attr(C.site.name)} — наверх"><span class="brand__t" aria-hidden="true">${typo('Театр')} ${mk()} Камерного${NB}балета</span></a>
    <button type="button" class="burger" aria-expanded="false" aria-controls="menu" aria-label="${esc(C.ui.menuOpen)}"><span class="burger__i" aria-hidden="true"></span></button>
    <nav class="menu" id="menu" aria-label="${esc(C.ui.menuNav)}">${items}</nav>
    ${seg('mini')}
  </div>
</header>`;
  }

  /* ------------------------------ первый экран ------------------------------ */

  function renderArc() {
    const n = 15;
    const rand = rng(29102026);
    let out = '<div class="arc" aria-hidden="true">';
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

  function renderMediaSlots() {
    const slot = (name) => {
      const f = media[name];
      if (!f) return '';
      const cls = `hero__media hero__media--${name.replace('hero-', '')}`;
      if (f.video) {
        return `<div class="${cls}"><video muted loop playsinline preload="metadata"${f.poster ? ` poster="${f.poster}"` : ''} data-pause-offscreen>` +
          f.video.map((v) => `<source src="${v.src}" type="${v.type}">`).join('') + '</video></div>';
      }
      return `<div class="${cls}"><img src="${f.image}" alt="" decoding="async"></div>`;
    };
    return slot('hero-chamber') + slot('hero-big');
  }

  function renderHero() {
    const m = C.modes;
    const sizers = ['all', 'chamber', 'big'].map((k) => `<span class="hero__sz" aria-hidden="true">${t(m[k].caption)}</span>`).join('');
    const btns = m.all.buttons.map((b, i) =>
      `<a class="btn${i === 0 ? '' : ' btn--ghost'}" href="${b.href}" data-hero-btn="${i}">${t(b.label)}</a>`).join('');
    return `<section class="hero" id="top" aria-label="${attr(C.site.name)}">
  <div class="hero__decor" aria-hidden="true">
    ${renderMediaSlots()}
    <div class="beams"><i class="beam beam--1"></i><i class="beam beam--2"></i><i class="beam beam--3"></i></div>
    ${renderArc()}
    <div class="grain"></div>
    <div class="cursor-light"></div>
  </div>
  <div class="hero__in">
    <h1 class="mark" aria-label="${attr(C.site.name)}, ${esc(C.hero.line3)}">
      <span class="mark__l1"><span class="mark__w">${t(C.hero.line1)}</span> <button type="button" class="ne" data-ne aria-label="${esc(C.ui.neRemove)}">${mk()}</button><span class="hint" aria-hidden="true"><svg viewBox="0 0 120 70" width="120" height="70" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path class="hint__p" pathLength="1" d="M104 56c-34 6-70-6-86-38M18 18l-1 13M18 18l11 7"/></svg><span class="hint__t">${t(C.ui.hintArrow)}</span></span></span>
      <span class="mark__l2">${t(C.hero.line2)}</span>
      <span class="mark__l3">${t(C.hero.line3)}</span>
    </h1>
    <p class="hero__slogan">${t(C.hero.slogan)}</p>
    <div class="hero__mode">
      <p class="hero__cap" id="mode-cap" aria-live="polite">${t(m.all.caption)}</p>
      ${sizers}
    </div>
    ${seg('big')}
    <div class="hero__cta">${btns}</div>
  </div>
</section>`;
  }

  /* -------------------------------- О театре -------------------------------- */

  function renderAbout() {
    const a = C.about;
    const nums = a.numbers.map((n) =>
      `<div class="stat"><p class="stat__v${n.accent ? ' stat__v--accent' : ''}" data-count>${esc(n.value)}</p><p class="stat__l">${t(n.label)}</p></div>`).join('');
    return `<section class="sec about" id="about" aria-labelledby="about-h">
  <div class="wrap about__grid">
    <div class="about__text">
      <h2 class="h2" id="about-h">${t(a.title)}</h2>
      ${a.paragraphs.map((p) => `<p>${t(p)}</p>`).join('\n      ')}
    </div>
    <div class="about__nums">${nums}</div>
  </div>
</section>
<div class="divider" aria-hidden="true"><span class="divider__l"></span><b class="flame"><i></i></b><span class="divider__l"></span></div>`;
  }

  /* -------------------------------- Спектакли -------------------------------- */

  function renderRow(it, i) {
    const v = ['all', 'chamber', 'big'].map((k) => `<span class="v v--${k}">${t(C.versionLine[k])}</span>`).join('');
    return `<details class="row">
        <summary class="row__sum"><span class="row__name">${t(it.name)}</span><span class="row__plus" aria-hidden="true"></span></summary>
        <div class="row__body"><div class="row__in">
          <p class="row__meta">${t(it.meta)}</p>
          <p class="row__text">${t(it.text)}</p>
          <p class="row__ver">${v}</p>
        </div></div>
      </details>`;
  }

  function renderRep() {
    const r = C.rep;
    const tabs = r.groups.map((g, i) =>
      `<button type="button" role="tab" class="tabs__t" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span>${t(g.tab)}</span><span class="tabs__n">${g.items.length}</span></button>`).join('');
    const panels = r.groups.map((g, i) =>
      `<div class="panel" role="tabpanel" id="panel-${i}" aria-labelledby="tab-${i}"${i === 0 ? '' : ' data-later'}>
      <h3 class="panel__h">${t(g.tab)}</h3>
      <p class="panel__note">${t(g.note)}</p>
      <div class="rows">${g.items.map(renderRow).join('\n      ')}</div>
    </div>`).join('\n    ');
    return `<section class="sec sec--2 rep" id="rep" aria-labelledby="rep-h">
  <div class="wrap">
    <h2 class="h2" id="rep-h">${t(r.title)}</h2>
    <p class="lead">${t(r.lead)}</p>
    <div class="tabs" data-tabs>
      <div class="tabs__list" role="tablist" aria-label="${esc(r.tabsLabel)}">${tabs}<i class="tabs__bar" aria-hidden="true"></i></div>
    ${panels}
    </div>
  </div>
</section>`;
  }

  /* -------------------------------- Площадкам -------------------------------- */

  function renderVenues() {
    const v = C.venues;
    const params = v.params.map((p) =>
      `<div class="param"><p class="param__v" data-count>${esc(p.value)}</p><p class="param__l">${t(p.label)}</p></div>`).join('');
    const need = v.need.map((n) => `<div class="need__c"><h4 class="h4">${t(n.title)}</h4><p>${t(n.text)}</p></div>`).join('');
    const head = v.modelsHead.map((h, i) => (i === 0 ? '<td></td>' : `<th scope="col">${t(h)}</th>`)).join('');
    const rows = v.models.map((r) =>
      `<tr><th scope="row">${t(r[0])}</th>${r.slice(1).map((c) => `<td>${t(c)}</td>`).join('')}</tr>`).join('');
    return `<section class="sec sec--light venues" id="venues" aria-labelledby="venues-h" data-modes="all chamber">
  <div class="wrap">
    <p class="eyebrow">${t(v.eyebrow)}</p>
    <h2 class="h2" id="venues-h">${t(v.title)}</h2>
    <div class="venues__cols">
      <div class="venues__text">
        ${v.paragraphs.map((p) => `<p>${t(p)}</p>`).join('\n        ')}
        <p class="pull">${t(v.pull)}</p>
      </div>
      <div class="venues__bring">
        <h3 class="h3">${t(v.bringTitle)}</h3>
        <ul class="chips">${v.bring.map((b) => `<li>${t(b)}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="params">${params}</div>
    <h3 class="h3 h3--gap">${t(v.needTitle)}</h3>
    <div class="need">${need}</div>
    <h3 class="h3 h3--gap">${t(v.modelsTitle)}</h3>
    <p class="models__lead">${t(v.modelsLead)}</p>
    <div class="models" tabindex="0" role="region" aria-label="${attr(v.modelsTitle)}">
      <table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>
    </div>
    <p class="models__note">${t(v.modelsNote)}</p>
    <a class="btn btn--on-light" href="${v.cta.href}">${t(v.cta.label)}</a>
  </div>
</section>`;
  }

  /* -------------------------------- Заказчикам -------------------------------- */

  function renderClients() {
    const c = C.clients;
    const steps = c.steps.map((s, i) =>
      `<li class="step" style="--i:${i}"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><h3 class="step__t">${t(s.title)}</h3><p>${t(s.text)}</p></li>`).join('');
    return `<section class="sec sec--3 clients" id="clients" aria-labelledby="clients-h" data-modes="all big">
  <div class="curtain" aria-hidden="true"></div>
  <div class="wrap">
    <p class="eyebrow">${t(c.eyebrow)}</p>
    <h2 class="h2" id="clients-h">${t(c.title)}</h2>
    <p class="lead">${t(c.lead)}</p>
    <ol class="steps" data-steps>${steps}</ol>
    <a class="btn" href="${c.cta.href}">${t(c.cta.label)}</a>
  </div>
</section>`;
  }

  /* ---------------------------------- Труппа ---------------------------------- */

  function renderTroupe() {
    const tr = C.troupe;
    const d = tr.director;
    const portrait = media.olesya
      ? `<div class="dir__ph"><img src="${media.olesya}" alt="${esc(d.photoAlt)}" width="640" height="800" loading="lazy" decoding="async"></div>`
      : '';
    const sol = tr.soloists.map((s, i) =>
      `<li class="sol"${i >= tr.visible ? ' data-extra' : ''} style="--k:${Math.max(0, i - tr.visible)}"><details class="row row--s">
          <summary class="row__sum"><span class="row__name">${t(s[0])}</span><span class="row__plus" aria-hidden="true"></span></summary>
          <div class="row__body"><div class="row__in"><p class="row__text">${t(s[1])}</p></div></div>
        </details></li>`).join('\n        ');
    const team = tr.team.map((p) => `<li><p class="team__n">${t(p[0])}</p><p>${t(p[1])}</p></li>`).join('');
    return `<section class="sec troupe" id="troupe" aria-labelledby="troupe-h">
  <div class="wrap">
    <h2 class="h2" id="troupe-h">${t(tr.title)}</h2>
    <p class="lead">${t(tr.lead)}</p>
    <div class="dir${portrait ? ' dir--ph' : ''}">
      ${portrait}
      <div class="dir__t">
        <p class="eyebrow">${t(d.role)}</p>
        <h3 class="dir__n">${t(d.name)}</h3>
        <p class="dir__r">${t(d.title)}</p>
        <p>${t(d.text)}</p>
      </div>
    </div>
    <h3 class="h3 h3--gap" id="sol-h">${t(tr.soloistsTitle)}</h3>
    <ul class="sols" id="sols" aria-labelledby="sol-h">
        ${sol}
    </ul>
    <button type="button" class="more" data-more aria-expanded="false" aria-controls="sols" data-all="${esc(tr.showAll)}" data-less="${esc(tr.collapse)}" hidden>${t(tr.showAll)}</button>
    <h3 class="h3 h3--gap">${t(tr.teamTitle)}</h3>
    <ul class="team">${team}</ul>
  </div>
</section>`;
  }

  /* ----------------------------- Материалы и призыв ----------------------------- */

  function renderMaterials() {
    const m = C.materials;
    return `<section class="sec sec--2 mats" id="contacts" aria-labelledby="mats-h">
  <div class="wrap mats__grid">
    <div>
      <h2 class="h2" id="mats-h">${t(m.title)}</h2>
      <p class="lead">${t(m.line)}</p>
    </div>
    <div>
      <h3 class="h3">${t(m.listTitle)}</h3>
      <ul class="mats__list">${m.list.map((x) => `<li>${t(x)}</li>`).join('')}</ul>
      <a class="btn" href="${m.link.href}" target="_blank" rel="noopener">${t(m.link.label)}</a>
    </div>
  </div>
</section>`;
  }

  /* ----------------------------------- Футер ----------------------------------- */

  function renderFooter() {
    const f = C.footer;
    const contacts = f.contacts.map((c) =>
      `<li><a href="${c.href}"${c.external ? ' target="_blank" rel="noopener"' : ''}>${t(c.label)}</a></li>`).join('');
    const bottom = f.bottom.map((b, i) => (i < 2 ? `<span>${t(b)}</span>` : `<span>${t(b)}</span>`)).join('<span aria-hidden="true"> · </span>');
    return `<footer class="foot">
  <div class="wrap foot__grid">
    <div>
      <p class="foot__mark">${t(f.brand.l1)} ${mk()}<br>${t(f.brand.l2)}</p>
      <p class="foot__role">${t(f.brand.role)}</p>
    </div>
    <div>
      <h2 class="foot__h">${t(f.tour.title)}</h2>
      <p>${t(f.tour.text)}</p>
    </div>
    <div>
      <h2 class="foot__h">${t(f.contactTitle)}</h2>
      <ul class="foot__list">${contacts}</ul>
    </div>
  </div>
  <div class="wrap foot__bottom"><p>${bottom}</p></div>
</footer>`;
  }

  function renderSections() {
    return [renderAbout(), renderRep(), renderVenues(), renderClients(), renderTroupe(), renderMaterials()].join('\n');
  }

  return { renderTopbar, renderHero, renderSections, renderFooter, renderJsonLd, renderPreload, renderModesData, slug };
}
