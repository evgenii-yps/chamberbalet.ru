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
  function picture(slide, { eager = false, priority = false } = {}) {
    const photo = photoOf(slide.photo);
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
      `alt="${esc(slide.alt)}"`,
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

  function renderSlide(slide, i) {
    const inHtml = i < 3;                 // первые три кадра в разметке, дальше — из манифеста
    const chapter = slide.chapter;
    const headingId = `slide-${slide.id}-title`;

    const photoInner = inHtml
      ? picture(slide, { eager: i < 2, priority: i < 2 })
      : `<noscript>${picture(slide)}</noscript>`;

    const videoEl = slide.isHero && video.sources?.length
      ? `<video class="slide__video" muted loop playsinline preload="metadata" aria-hidden="true" tabindex="-1"` +
        (video.poster?.find((p) => p.ext === 'jpg') ? ` poster="/assets/photo/${video.poster.find((p) => p.ext === 'jpg').file}"` : '') +
        ` data-sources='${JSON.stringify(video.sources.map((s) => ({ src: `/assets/video/${s.file}`, type: s.mime, width: s.width })))}'></video>`
      : '';

    let caption = '';
    if (slide.isHero) {
      caption = [
        '<div class="slide__caption">',
        C.hero.kicker ? `<p class="kicker">${esc(C.hero.kicker)}</p>` : '',
        `<h1 class="slide__title" id="${headingId}">${esc(C.hero.title)}</h1>`,
        `<p class="slide__body">${esc(C.hero.lede)}</p>`,
        '</div>',
      ].join('');
    } else if (chapter) {
      caption = [
        '<div class="slide__caption">',
        `<p class="kicker">${esc(chapter.kicker)}</p>`,
        `<h2 class="slide__title" id="${headingId}">${esc(chapter.title)}</h2>`,
        `<p class="slide__body">${esc(chapter.body)}</p>`,
        `<p class="fact">${esc(chapter.fact)}</p>`,
        '</div>',
      ].join('');
    }

    // Объявляем каждый кадр, а не только главы: иначе на кадрах без текста
    // зритель с экранным диктором не понимает, где он
    const label = chapter ? `${chapter.kicker}. ${chapter.title}`
      : slide.isHero ? C.hero.title
      : slide.alt;

    return [
      `<article class="slide${slide.isHero ? ' slide--hero' : ''}" style="--i:${i}"`,
      ` data-index="${i}"`,
      ` data-chapter="${esc(label)}"`,
      caption ? ` aria-labelledby="${headingId}"` : ` aria-label="${esc(slide.alt)}"`,
      '>',
      '<div class="slide__frame">',
      `<div class="slide__photo" data-photo="${esc(slide.photo)}">${photoInner}</div>`,
      videoEl,
      `<div class="slide__scrim"${slide.scrim === 'strong' ? ' data-scrim="strong"' : ''} aria-hidden="true"></div>`,
      '</div>',
      caption,
      slide.isHero && C.hero.scrollHint ? `<p class="scroll-hint" aria-hidden="true">${esc(C.hero.scrollHint)}</p>` : '',
      '</article>',
    ].join('');
  }

  function renderFlight() {
    const slideHtml = C.slides.map(renderSlide).join('');

    const dots = C.slides
      .map((slide, i) => ({ slide, i }))
      .filter(({ slide }) => slide.chapter)
      .map(({ slide, i }, n) =>
        `<button type="button" class="rail__dot" data-index="${i}" aria-current="false">` +
        `<span class="visually-hidden">${esc(`${n + 1}. ${slide.chapter.kicker}. ${slide.chapter.title}`)}</span></button>`)
      .join('');

    return [
      `<div class="flight" style="--count:${C.slides.length}">`,
      slideHtml,
      `<nav class="rail" aria-label="${esc(C.ui.railLabel)}">${dots}</nav>`,
      `<p class="visually-hidden" id="flight-live" aria-live="polite"></p>`,
      '</div>',
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
   * Первые два кадра просим заранее и с высоким приоритетом; вместе с ними —
   * кириллические начертания, которыми набран первый экран. Без этого swap
   * успевает перерисовать заголовок и даёт сдвиг макета.
   */
  function renderPreload() {
    const out = [];
    for (const face of fonts.faces || []) {
      if (face.weight !== 400 || !/cyrillic/.test(face.source || '')) continue;
      out.push(`<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/fonts/${face.file}">`);
    }
    for (const slide of C.slides.slice(0, 2)) {
      const photo = photoOf(slide.photo);
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
