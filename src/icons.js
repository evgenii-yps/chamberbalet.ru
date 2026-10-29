/**
 * Собственный набор пиктограмм: сетка 24 × 24, линия 1.5 px, концы round,
 * без заливок, цвет — currentColor. Каждая фигура — path с pathLength="1",
 * чтобы линию можно было «рисовать» через stroke-dashoffset.
 */
export const ICONS = {
  /* что привозим */
  light: ['M8 3h8l2 8H6z', 'M8 14.5l-2 5.5M12 14.5V20M16 14.5l2 5.5'],
  floor: ['M10 12a4 4 0 1 0-8 0a4 4 0 0 0 8 0z', 'M6 8h14v8H6', 'M6 12h0.01'],
  costume: ['M10 3h4l.8 6H9.2z', 'M9.5 9C6 10 3.5 13 2 17c4 3 16 3 20 0-1.5-4-4-7-7.5-8'],
  candle: ['M12 2c2 2.5 3 4 3 5.5a3 3 0 0 1-6 0C9 6 10 4.5 12 2z', 'M9 12h6v9H9z', 'M7 21h10'],
  backdrop: ['M3 4h18v14H3z', 'M3 15l5-5 4 3 4-4 5 5', 'M8 21h8'],
  wrench: ['M15 5.5a4 4 0 0 0-5.2 5.1L3.5 17a2 2 0 0 0 3 3l6.4-6.3a4 4 0 0 0 5.1-5.2l-2.6 2.6-2.3-.5-.5-2.3z'],

  /* заказчикам */
  direction: ['M4 11h16v9H4z', 'M4 11l-.6-4 15.6-3 .6 4', 'M8 8l2 3M13 7l2 3'],
  pointe: ['M4 20h16', 'M6 20c0-5 2-8 5-10l1-4 3 1-1 4c3 2 5 5 5 9', 'M9 15c2 1 4 1 7 0'],
  troupe: ['M12 4a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5z', 'M7.5 20v-3a4.5 4.5 0 0 1 9 0v3', 'M5 8a2 2 0 1 1 0 4a2 2 0 0 1 0-4z', 'M19 8a2 2 0 1 1 0 4a2 2 0 0 1 0-4z', 'M2 18v-1.5A3.5 3.5 0 0 1 5.5 13', 'M22 18v-1.5a3.5 3.5 0 0 0-3.5-3.5'],
  scenography: ['M4 20h16', 'M6 20V9h12v11', 'M3 9l9-5 9 5', 'M10 20v-6h4v6'],
  lightsound: ['M4 9h3l5-4v14l-5-4H4z', 'M16 9a4 4 0 0 1 0 6', 'M18.5 6.5a8 8 0 0 1 0 11'],

  /* почему с нами удобно */
  scales: ['M3 14h6v6H3z', 'M11 6h10v14H11z', 'M14 10h4M14 14h4'],
  team: ['M9 4a3 3 0 1 1 0 6a3 3 0 0 1 0-6z', 'M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2', 'M16 4.5a3 3 0 0 1 0 5.5', 'M18 13.2a5 5 0 0 1 3 4.8v2'],
  estimate: ['M6 3h9l4 4v14H6z', 'M15 3v4h4', 'M9 12h7M9 15h7M9 18h4'],

  /* как пригласить театр */
  mail: ['M3 6h18v12H3z', 'M3 7l9 7 9-7'],
  program: ['M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17', 'M11 6.5h9M11 12.5h9M11 18.5h9'],
  calc: ['M6 3h12v18H6z', 'M8.5 6.5h7v3h-7z', 'M9 13h.01M12 13h.01M15 13h.01M9 16.5h.01M12 16.5h.01M15 16.5h.01'],
  contract: ['M6 3h9l4 4v14H6z', 'M15 3v4h4', 'M9 11h7M9 14h4', 'M15.5 18a2 2 0 1 1-4 0a2 2 0 0 1 4 0z'],

  /* контакты и футер */
  phone: ['M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M11 18h2'],
  telegram: ['M21.5 3.5L2.5 10.8l5.7 2.2 2.2 6.5 3-3.8 4.6 3.4z', 'M8.2 13l9.3-6.5'],
  archive: ['M3 6h6l2 2h10v11H3z'],
  qr: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h3v3', 'M20 14v.01M14 20h.01M17 20h3v-3'],
  pin: ['M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z', 'M12 12.5a2.5 2.5 0 1 1 0-5a2.5 2.5 0 0 1 0 5z'],

  /* интерфейс */
  play: ['M8 5l11 7-11 7z'],
  pause: ['M8 5v14M16 5v14'],
  'sound-on': ['M4 9h3l5-4v14l-5-4H4z', 'M16 9a4 4 0 0 1 0 6', 'M18.5 6.5a8 8 0 0 1 0 11'],
  'sound-off': ['M4 9h3l5-4v14l-5-4H4z', 'M16 9l5 6M21 9l-5 6'],
  close: ['M5 5l14 14M19 5L5 19'],
  plus: ['M12 5v14M5 12h14'],
  arrow: ['M4 12h16M14 6l6 6-6 6'],
  fullscreen: ['M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5'],
};

export const spriteSvg = () =>
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
  Object.entries(ICONS).map(([id, paths]) =>
    `<symbol id="i-${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">` +
    paths.map((d) => `<path pathLength="1" d="${d}"/>`).join('') + '</symbol>').join('') +
  '</defs></svg>';

export const ico = (name, cls = '') =>
  `<svg class="ico${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
