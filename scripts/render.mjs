/**
 * Разметка собирается здесь из src/content.js. Ни одной видимой строки в
 * шаблоне: тексты правятся в одном файле и попадают и в HTML, и в JSON-LD.
 *
 * Заглушка (PLACEHOLDER) в продакшн-сборке скрывает блок целиком — лучше
 * отсутствующий блок, чем «__ЗАПОЛНИТЬ__» на живом сайте. В отладочной
 * сборке она рисуется видимой пометкой.
 */
import * as C from '../src/content.js';
import { PHOTO_WIDTHS } from './config.mjs';

/** sizes: кадр показывается вплоть до масштаба 2,6, поэтому 100vw занижает
 *  потребность и браузер берёт слишком мелкий вариант. */
export const SIZES = 'min(160vw, 2560px)';

/** Заголовок главы содержит <br> — для aria-label его надо снять. */
export const stripTags = (s) => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Значения, которые нельзя показывать. */
const blank = C.isBlank;

export function createRenderer({ debug = false, images = { photos: {}, og: null }, video = { sources: [], poster: [] }, fonts = { faces: [] } }) {
  /**
   * Заполненное значение → само значение.
   * Пустое → null в проде (блок исчезает) или пометка в отладке.
   */
  const val = (v) => {
    if (!blank(v)) return esc(v);
    return debug ? '<span class="placeholder">' + esc(C.PLACEHOLDER) + '</span>' : null;
  };
  /** Блок целиком показываем, только если есть хоть одно заполненное значение. */
  const any = (values) => debug || values.some((v) => !blank(v));

  const photoOf = (name) => images.photos?.[name];

  /** <picture> с источниками по убыванию предпочтения. */
  function picture(layer, { eager = false, priority = false } = {}) {
    const photo = photoOf(layer.photo);
    if (!photo) return '';

    const byExt = {};
    for (const v of photo.variants) (byExt[v.ext] ||= []).push(v);
    for (const list of Object.values(byExt)) list.sort((a, b) => a.width - b.width);

    const srcset = (list) => list.map((v) => `/assets/photo/${v.file} ${v.width}w`).join(', ');
    const sources = ['avif', 'webp']
      .filter((ext) => byExt[ext]?.length)
      .map((ext) => `<source type="${byExt[ext][0].mime}" srcset="${srcset(byExt[ext])}" sizes="${SIZES}">`);

    const jpg = byExt.jpg || [];
    if (!jpg.length) return '';
    const fallback = jpg.find((v) => v.width >= 1280) || jpg[jpg.length - 1];
    const largest = jpg[jpg.length - 1];

    const attrs = [
      `src="/assets/photo/${fallback.file}"`,
      `srcset="${srcset(jpg)}"`,
      `sizes="${SIZES}"`,
      `width="${largest.width}"`,
      `height="${largest.height}"`,
      `alt="${esc(layer.alt)}"`,
      eager ? 'decoding="async"' : 'loading="lazy" decoding="async"',
      priority ? 'fetchpriority="high"' : '',
    ].filter(Boolean).join(' ');

    return `<picture>${sources.join('')}<img ${attrs}></picture>`;
  }

  /** Постер видео: тот же <picture>, всегда виден, пока ролик не готов. */
  function posterPicture() {
    if (!video.poster?.length) return '';
    const byExt = Object.fromEntries(video.poster.map((p) => [p.ext, p]));
    const sources = ['avif', 'webp'].filter((e) => byExt[e])
      .map((e) => `<source type="${byExt[e].mime}" srcset="/assets/photo/${byExt[e].file}">`);
    if (!byExt.jpg) return '';
    return `<picture>${sources.join('')}<img src="/assets/photo/${byExt.jpg.file}" alt="" width="1920" height="1080" fetchpriority="high" decoding="async"></picture>`;
  }

  /* ------------------------------- пролёт ------------------------------- */

  /** Подпись главы. Живёт в своём кадре: так она есть и без JS, и для поиска. */
  function caption(chapter, number, total) {
    const id = `chapter-${number + 1}-title`;
    return [
      '<div class="layer__caption">',
      `<p class="layer__kicker">${esc(chapter.kicker)}` +
        `<span class="layer__no">${String(number + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span></p>`,
      `<h2 class="layer__title" id="${id}">${chapter.title}</h2>`,
      `<p class="layer__body">${esc(chapter.body)}</p>`,
      `<p class="layer__fact">${esc(chapter.fact)}</p>`,
      '</div>',
    ].join('');
  }

  function renderLayer(layer, i) {
    // В разметке стоит только нулевой кадр, остальные — в <noscript>: в пролёте
    // все слои лежат в области просмотра, и loading="lazy" их бы не удержал.
    //
    // Нулевой оставлен инлайном не ради пролёта, а потому что это тот же файл,
    // что и фон первого экрана: разведи их — и одна загрузка станет двумя.
    // Остальные кадры пролёта до первого действия пользователя не нужны, а
    // весом соревнуются с кадром LCP; их поднимает main.js после отрисовки.
    const inHtml = i < 1;
    const photoInner = inHtml
      ? picture(layer, { eager: true, priority: true })
      : `<noscript>${picture(layer)}</noscript>`;

    const chapter = layer.chapter;
    const number = chapter ? C.chapters.findIndex((c) => c.index === i) : -1;
    const label = chapter ? `${chapter.kicker}. ${stripTags(chapter.title)}` : layer.alt;

    return [
      `<article class="layer${layer.tall ? ' layer--tall' : ''}" style="--i:${i}"`,
      ` data-index="${i}" data-chapter="${esc(label)}"`,
      layer.bright ? ' data-bright' : '',
      chapter ? ` aria-labelledby="chapter-${number + 1}-title"` : ` aria-label="${esc(layer.alt)}"`,
      '>',
      `<div class="layer__photo" data-photo="${esc(layer.photo)}">${photoInner}</div>`,
      chapter ? caption(chapter, number, C.chapters.length) : '',
      '</article>',
    ].join('');
  }

  /** Первый экран: фотография, поверх неё видео, если оно собрано. */
  function renderOpener() {
    const heroLayer = C.layers.find((l) => l.photo === C.hero.photo) || C.layers[0];
    const videoEl = video.sources?.length
      ? `<video class="opener__video" muted loop playsinline preload="metadata" aria-hidden="true" tabindex="-1"` +
        (video.poster?.find((p) => p.ext === 'jpg')
          ? ` poster="/assets/photo/${video.poster.find((p) => p.ext === 'jpg').file}"` : '') +
        ` data-sources='${JSON.stringify(video.sources.map((s) => ({ src: `/assets/video/${s.file}`, type: s.mime, width: s.width })))}'></video>`
      : '';

    return [
      '<section class="opener" aria-labelledby="opener-title">',
      '<div class="opener__bg">',
      picture({ ...heroLayer, alt: '' }, { eager: true, priority: true }),
      videoEl,
      `<div class="opener__veil"${heroLayer.bright ? ' data-bright' : ''} aria-hidden="true"></div>`,
      '</div>',
      '<div class="opener__in">',
      `<p class="opener__kicker">${esc(C.hero.kicker)}</p>`,
      `<h1 class="opener__title" id="opener-title">${esc(C.hero.title)}</h1>`,
      `<p class="opener__lede">${esc(C.hero.lede)}</p>`,
      '</div>',
      '</section>',
    ].join('');
  }

  function renderFlight() {
    const layersHtml = C.layers.map(renderLayer).join('');
    const dots = C.chapters.map((c, n) =>
      `<button type="button" class="rail__dot" data-stop="${n + 1}" aria-current="false">` +
      `<span class="visually-hidden">${esc(`${n + 1}. ${c.kicker}. ${stripTags(c.title)}`)}</span></button>`).join('');

    return [
      renderOpener(),
      `<div class="flight" style="--count:${C.layers.length}">`,
      `<div class="flight__world">${layersHtml}</div>`,
      // Затемнение внутри пролёта: один контекст наложения на кадры,
      // затемнение и подписи — тогда порядок отрисовки следует числам
      '<div class="flight__scrim" aria-hidden="true"></div>',
      '</div>',
      `<p class="hint">${esc(C.hero.scrollHint)}</p>`,
      `<nav class="rail" aria-label="${esc(C.ui.railLabel)}">${dots}</nav>`,
      '<p class="visually-hidden" id="flight-live" aria-live="polite"></p>',
    ].join('');
  }

  /* ------------------------------- секции ------------------------------- */

  const section = (id, inner, extra = '') =>
    `<section class="section${extra}" id="${id}"><div class="section__inner reveal">${inner}</div></section>`;

  function renderRequirements() {
    const r = C.requirements;
    const groups = r.groups.map((g) =>
      `<div class="group"><h3 class="group__title">${esc(g.title)}</h3><p class="group__body">${esc(g.body)}</p></div>`).join('');

    const rows = r.table.rows
      .map((row) => ({ row, value: val(row.value) }))
      .filter(({ value }) => value !== null)                  // пустая строка исчезает целиком
      .map(({ row, value }) => `<tr><th scope="row">${esc(row.label)}</th><td>${value}</td></tr>`)
      .join('');

    const table = rows
      ? `<table class="params"><caption>${esc(r.table.caption)}</caption><tbody>${rows}</tbody></table>`
      : '';

    return section(r.id, [
      `<p class="kicker">${esc(r.kicker)}</p>`,
      `<h2 class="section__title">${esc(r.title)}</h2>`,
      `<div class="groups">${groups}</div>`,
      table,
    ].join(''));
  }

  function renderStats() {
    const s = C.statsSection;
    if (!any(s.items.map((i) => i.value))) return '';       // все слоты пусты — блока нет
    const items = s.items
      .map((i) => ({ i, value: val(i.value) }))
      .filter(({ value }) => value !== null)
      .map(({ i, value }) => `<div class="figure"><p class="figure__value">${value}</p><p class="figure__label">${esc(i.label)}</p></div>`)
      .join('');
    if (!items) return '';
    return section(s.id, `<h2 class="section__title">${esc(s.title)}</h2><div class="figures">${items}</div>`);
  }

  function renderRepertoire() {
    const r = C.repertoire;
    const items = r.items.map((i) =>
      `<li><span class="repertoire__title">${esc(i.title)}</span><span class="repertoire__period">${esc(i.period)}</span></li>`).join('');
    return section(r.id, [
      `<p class="kicker">${esc(r.kicker)}</p>`,
      `<h2 class="section__title">${esc(r.title)}</h2>`,
      `<ul class="repertoire">${items}</ul>`,
      `<p class="repertoire__note">${esc(r.note)}</p>`,
    ].join(''));
  }

  function renderModels() {
    const m = C.models;
    const head = m.columns.map((c) => `<th scope="col">${esc(c.title)}</th>`).join('');
    const body = m.rows.map((row) => {
      const cells = row.values
        .map((v, n) => `<td data-column="${esc(m.columns[n].title)}"><span>${esc(v)}</span></td>`).join('');
      return `<tr><th scope="row">${esc(row.label)}</th>${cells}</tr>`;
    }).join('');

    return section(m.id, [
      `<p class="kicker">${esc(m.kicker)}</p>`,
      `<h2 class="section__title">${esc(m.title)}</h2>`,
      `<p class="section__lede">${esc(m.lede)}</p>`,
      `<table class="models"><thead><tr><td></td>${head}</tr></thead><tbody>${body}</tbody></table>`,
      `<p class="models__closing">${esc(m.closing)}</p>`,
    ].join(''));
  }

  function renderContact() {
    const s = C.contactSection;
    const linkFor = (key, value) => {
      if (blank(value)) return null;
      if (key === 'phone') return `<a href="tel:${esc(String(value).replace(/[^\d+]/g, ''))}">${esc(value)}</a>`;
      if (key === 'email') return `<a href="mailto:${esc(value)}">${esc(value)}</a>`;
      if (key === 'telegram') {
        const handle = String(value).replace(/^@/, '');
        return `<a href="https://t.me/${esc(handle)}" rel="noopener">${esc(value)}</a>`;
      }
      return esc(value);
    };

    const entries = Object.entries(s.labels)
      .map(([key, label]) => ({ label, value: linkFor(key, C.contact[key]) ?? val(C.contact[key]) }))
      .filter(({ value }) => value !== null);

    const list = entries.length
      ? `<dl class="contact__list">${entries.map((e) => `<dt>${esc(e.label)}</dt><dd>${e.value}</dd>`).join('')}</dl>`
      : '';

    return section(s.id, [
      `<p class="kicker">${esc(s.kicker)}</p>`,
      `<h2 class="section__title contact__title" tabindex="-1">${esc(s.title)}</h2>`,
      `<p class="contact__body">${esc(s.body)}</p>`,
      list,
      `<p class="contact__note">${esc(s.note)}</p>`,
    ].join(''));
  }

  function renderSections() {
    return `<div class="after">${[
      renderRequirements(),
      renderStats(),
      renderRepertoire(),
      renderModels(),
      renderContact(),
    ].join('')}</div>`;
  }

  function renderTopbar() {
    return [
      '<header class="topbar">',
      `<span class="topbar__name">${esc(C.site.organisation.name)}</span>`,
      `<a class="topbar__link" href="#${esc(C.contactSection.id)}" data-to-contact>${esc(C.ui.toContact)}</a>`,
      '</header>',
    ].join('');
  }

  function renderFooter() {
    const year = C.ui.footer;
    return `<footer class="footer"><span>${esc(year)}</span><span>${esc(C.site.organisation.city)}</span></footer>`;
  }

  /* ----------------------------- метаданные ----------------------------- */

  function renderSocial() {
    const og = images.og ? `${C.site.url.replace(/\/$/, '')}/assets/photo/${images.og.file}` : null;
    const tags = [
      `<meta property="og:type" content="website">`,
      `<meta property="og:locale" content="ru_RU">`,
      `<meta property="og:site_name" content="${esc(C.site.organisation.name)}">`,
      `<meta property="og:title" content="${esc(C.site.ogTitle)}">`,
      `<meta property="og:description" content="${esc(C.site.ogDescription)}">`,
      `<meta property="og:url" content="${esc(C.site.url)}">`,
      og ? `<meta property="og:image" content="${esc(og)}">` : '',
      og ? `<meta property="og:image:width" content="1200">` : '',
      og ? `<meta property="og:image:height" content="630">` : '',
      `<meta name="twitter:card" content="${og ? 'summary_large_image' : 'summary'}">`,
      `<meta name="twitter:title" content="${esc(C.site.ogTitle)}">`,
      `<meta name="twitter:description" content="${esc(C.site.ogDescription)}">`,
      og ? `<meta name="twitter:image" content="${esc(og)}">` : '',
    ];
    return tags.filter(Boolean).join('\n');
  }

  /** JSON-LD. Заглушки не выводим вовсе. */
  function renderJsonLd() {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'PerformingArtsTheatre',
      name: C.site.organisation.name,
      description: C.site.description,
      url: C.site.url,
      address: {
        '@type': 'PostalAddress',
        addressLocality: C.site.organisation.city,
        addressCountry: C.site.organisation.country,
      },
    };
    if (!blank(C.contact.phone)) data.telephone = C.contact.phone;
    if (!blank(C.contact.email)) data.email = C.contact.email;
    if (images.og) data.image = `${C.site.url.replace(/\/$/, '')}/assets/photo/${images.og.file}`;
    return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  }

  /**
   * Нулевой кадр просим заранее и с высоким приоритетом; вместе с ним —
   * кириллические начертания, которыми набран первый экран. Без этого swap
   * успевает перерисовать заголовок и даёт сдвиг макета.
   */
  function renderPreload() {
    const out = [];
    for (const face of fonts.faces || []) {
      if (face.weight !== 400 || !/cyrillic/.test(face.source || '')) continue;
      out.push(`<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/fonts/${face.file}">`);
    }
    // Предзагружаем только нулевой кадр — он же фон первого экрана. Остальные
    // семь появляются в DOM уже после его отрисовки, и предзагрузка отняла бы
    // полосу у кадра LCP ровно тогда, когда она нужнее всего.
    for (const layer of C.layers.slice(0, 1)) {
      const photo = photoOf(layer.photo);
      if (!photo) continue;
      const avif = photo.variants.filter((v) => v.ext === 'avif').sort((a, b) => a.width - b.width);
      if (!avif.length) continue;
      out.push(
        `<link rel="preload" as="image" type="image/avif" fetchpriority="high" ` +
        `imagesrcset="${avif.map((v) => `/assets/photo/${v.file} ${v.width}w`).join(', ')}" imagesizes="${SIZES}">`
      );
    }
    return out.join('\n');
  }

  return {
    renderFlight, renderSections, renderTopbar, renderFooter, renderSocial, renderJsonLd,
    renderPreload, posterPicture,
  };
}

export { PHOTO_WIDTHS };
