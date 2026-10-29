/**
 * Полноэкранный плеер и лайтбокс. Свой, на нативном <video>.
 * Открытие: рамка вырастает из места кадра на странице (FLIP, 500 мс).
 * Esc, клик по фону и крестик закрывают с обратной анимацией; фокус внутри
 * плеера, после закрытия возвращается на кнопку; стрелки листают группу.
 */
import { reduced } from './reveal.js';

const data = JSON.parse(document.getElementById('app-data').textContent);
const T = data.ui;
const EASE = 'cubic-bezier(.2,.7,.2,1)';
const root = document.documentElement;
const ico = (n) => `<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let el = null;           // корень плеера
let st = null;           // { id, group, trigger, video }
const refs = {};

function build() {
  el = document.createElement('div');
  el.className = 'player';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', T.playerDialog);
  el.hidden = true;
  el.innerHTML =
    '<div class="player__bg" data-close></div>' +
    '<div class="player__stage"><div class="player__frame"></div></div>' +
    '<p class="player__cap"></p>' +
    `<div class="player__bar"><button type="button" class="pbtn" data-act="toggle" aria-label="${esc(T.playerPause)}">${ico('pause')}</button>` +
    `<div class="pbar" role="slider" tabindex="0" aria-label="${esc(T.playerProgress)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i class="pbar__f"></i></div>` +
    `<button type="button" class="pbtn" data-act="mute" aria-label="${esc(T.playerMute)}">${ico('sound-on')}</button>` +
    `<button type="button" class="pbtn" data-act="full" aria-label="${esc(T.playerFullscreen)}">${ico('fullscreen')}</button></div>` +
    `<button type="button" class="pbtn pnav pnav--prev" data-act="prev" aria-label="${esc(T.playerPrev)}">${ico('arrow')}</button>` +
    `<button type="button" class="pbtn pnav pnav--next" data-act="next" aria-label="${esc(T.playerNext)}">${ico('arrow')}</button>` +
    `<button type="button" class="pbtn pclose" data-act="close" aria-label="${esc(T.playerClose)}">${ico('close')}</button>`;
  document.body.appendChild(el);
  refs.frame = el.querySelector('.player__frame');
  refs.cap = el.querySelector('.player__cap');
  refs.bar = el.querySelector('.player__bar');
  refs.prog = el.querySelector('.pbar');
  refs.fill = el.querySelector('.pbar__f');
  refs.toggle = el.querySelector('[data-act="toggle"]');
  refs.mute = el.querySelector('[data-act="mute"]');
  refs.prev = el.querySelector('.pnav--prev');
  refs.next = el.querySelector('.pnav--next');

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) return close();
    const b = e.target.closest('[data-act]');
    if (!b) return;
    ({ close, prev: () => go(-1), next: () => go(1), toggle, mute, full })[b.dataset.act]();
  });
  el.addEventListener('keydown', onKey);
  const seek = (e) => {
    const v = st?.video; if (!v || !v.duration) return;
    const r = refs.prog.getBoundingClientRect();
    v.currentTime = v.duration * Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };
  refs.prog.addEventListener('pointerdown', (e) => { seek(e); refs.prog.setPointerCapture(e.pointerId); refs.prog.onpointermove = seek; });
  refs.prog.addEventListener('pointerup', () => { refs.prog.onpointermove = null; });
  refs.prog.addEventListener('keydown', (e) => {
    const v = st?.video; if (!v) return;
    if (e.key === 'ArrowLeft') { v.currentTime = Math.max(0, v.currentTime - 5); e.preventDefault(); e.stopPropagation(); }
    if (e.key === 'ArrowRight') { v.currentTime = Math.min(v.duration || 0, v.currentTime + 5); e.preventDefault(); e.stopPropagation(); }
  });
}

const groupOf = (trigger) => {
  const g = trigger.dataset.group;
  return g ? [...document.querySelectorAll(`[data-play][data-group="${g}"]`)].filter((b) => !b.closest('[hidden]')) : [trigger];
};
const hostOf = (btn) => btn.closest('.tile') || btn.closest('.media') || btn.parentElement;

/** Содержимое рамки: видео, кадр или красивая заглушка. */
function fill(item, hostRatio) {
  refs.frame.innerHTML = '';
  st.video = null;
  const isVideo = item.kind === 'video';
  el.classList.toggle('is-image', item.kind === 'img');
  el.classList.toggle('is-ph', item.kind === 'ph');
  if (item.kind === 'img') {
    refs.frame.innerHTML = `<img src="${esc(item.src)}" alt="${esc(item.caption || '')}">`;
  } else if (isVideo && item.src) {
    const v = document.createElement('video');
    v.playsInline = true; v.preload = 'auto'; v.src = item.src;
    if (item.poster) v.poster = item.poster;
    refs.frame.appendChild(v);
    st.video = v;
    v.addEventListener('timeupdate', () => {
      const k = v.duration ? v.currentTime / v.duration : 0;
      refs.fill.style.transform = `scaleX(${k})`;
      refs.prog.setAttribute('aria-valuenow', String(Math.round(k * 100)));
    });
    v.addEventListener('play', syncToggle); v.addEventListener('pause', syncToggle);
    v.addEventListener('ended', syncToggle);
    v.play().catch(() => {});
  } else {
    refs.frame.innerHTML = '<div class="media is-ph"><div class="media__in"></div></div>';
  }
  refs.cap.textContent = item.caption || '';
  refs.bar.hidden = item.kind === 'img';
  refs.fill.style.transform = 'scaleX(0)';
  syncToggle(); syncMute();
}

function syncToggle() {
  const playing = st?.video && !st.video.paused && !st.video.ended;
  refs.toggle.innerHTML = ico(playing ? 'pause' : 'play');
  refs.toggle.setAttribute('aria-label', playing ? T.playerPause : T.playerPlay);
}
function syncMute() {
  const m = st?.video ? st.video.muted : false;
  refs.mute.innerHTML = ico(m ? 'sound-off' : 'sound-on');
  refs.mute.setAttribute('aria-label', m ? T.playerUnmute : T.playerMute);
}
const toggle = () => { const v = st?.video; if (v) (v.paused ? v.play() : v.pause()); };
const mute = () => { const v = st?.video; if (v) { v.muted = !v.muted; syncMute(); } };
const full = () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else el.requestFullscreen?.().catch(() => {});
};

/** Размер рамки: по пропорции кадра на странице, вписанный в окно. */
function sizeFrame(ratio) {
  const maxW = innerWidth * (innerWidth < 700 ? 0.94 : 0.9);
  const maxH = innerHeight * 0.76;
  const w = Math.min(maxW, maxH * ratio);
  refs.frame.style.width = `${w}px`;
  refs.frame.style.height = `${w / ratio}px`;
}

function navState() {
  const many = st.list.length > 1;
  refs.prev.hidden = refs.next.hidden = !many;
}

function flipFrom(host, dir) {
  const fr = refs.frame.getBoundingClientRect();
  const sr = host.getBoundingClientRect();
  const dx = sr.left - fr.left, dy = sr.top - fr.top;
  const sx = sr.width / fr.width, sy = sr.height / fr.height;
  const kf = [{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: 'none' }];
  return refs.frame.animate(dir === 'in' ? kf : kf.slice().reverse(), { duration: 500, easing: EASE, fill: 'both' });
}

export function open(trigger) {
  const item = data.media[trigger.dataset.play];
  if (!item) return;
  if (!el) build();
  const host = hostOf(trigger);
  st = { trigger, host, list: groupOf(trigger), item };
  st.index = Math.max(0, st.list.indexOf(trigger));
  el.hidden = false;
  root.classList.add('player-open');
  document.querySelectorAll('body > :not(.player):not(script):not(svg)').forEach((n) => { n.inert = true; });
  const hr = host.getBoundingClientRect();
  const ratio = (hr.width / hr.height) || 16 / 9;
  st.ratio = ratio;
  fill(item, ratio);
  navState();
  sizeFrame(ratio);
  refs.cap.hidden = !item.caption;
  if (!reduced()) {
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'backwards' });
    flipFrom(host, 'in').onfinish = (e) => e.target.cancel();
  }
  refs.prog.closest('.player__bar').hidden || refs.toggle.focus();
  if (refs.bar.hidden) el.querySelector('.pclose').focus();
}

function go(dir) {
  const n = st.list.length;
  if (n < 2) return;
  st.index = (st.index + dir + n) % n;
  const trigger = st.list[st.index];
  const item = data.media[trigger.dataset.play];
  if (!item) return;
  st.trigger = trigger; st.host = hostOf(trigger);
  const hr = st.host.getBoundingClientRect();
  const swap = () => {
    fill(item, 0);
    st.ratio = (hr.width / hr.height) || 16 / 9;
    sizeFrame(st.ratio);
    refs.cap.hidden = !item.caption;
  };
  if (reduced()) { swap(); return; }
  refs.frame.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }).onfinish = (e) => {
    swap();
    e.target.cancel();
    refs.frame.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: EASE });
  };
}

export function close() {
  if (!el || el.hidden) return;
  if (document.fullscreenElement) document.exitFullscreen?.();
  st.video?.pause();
  const done = () => {
    el.hidden = true;
    refs.frame.innerHTML = '';
    root.classList.remove('player-open');
    document.querySelectorAll('body > [inert]').forEach((n) => { n.inert = false; });
    const t = st.trigger; st = null;
    t.focus({ preventScroll: true });
  };
  if (reduced()) { done(); return; }
  const host = st.host;
  const hr = host.getBoundingClientRect();
  const visible = hr.bottom > 0 && hr.top < innerHeight;
  el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 100, fill: 'forwards' });
  if (visible) flipFrom(host, 'out').onfinish = done;
  else setTimeout(done, 500);
}

function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (e.target.closest?.('.pbar') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  else if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); toggle(); }
  else if (e.key === 'Tab') {                                 // фокус не уходит из плеера
    const items = [...el.querySelectorAll('button, [tabindex="0"]')].filter((n) => !n.hidden && !n.closest('[hidden]'));
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

export function initPlayer() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-play]');
    if (b) { e.preventDefault(); open(b); }
  });
  addEventListener('resize', () => { if (el && !el.hidden && st) sizeFrame(st.ratio); });
}
