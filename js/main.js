import { G, loadSave, tickTimers, persistNow } from './state.js';
import { unlock, sfx, loadClips, prefetchClips, music } from './audio.js';
import { makeStudents } from './students.js';
import { createClassroom } from './classroom.js';
import { createBoard, BW, BH } from './board.js';
import { createLetters } from './letters.js';
import { createShapes } from './shapes.js';
import { createPlayground } from './playground.js';
import { VERSION } from './version.js';
import { Pix, cached } from './raster.js';
import { beginPresent, endPresent } from './hires.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const probe = document.getElementById('safe');

loadSave();
loadClips();
let prefetched = false;
const students = makeStudents();
let mode = 'class';
let trans = null; // {from, to, kind:'zoom'|'fade', t}
const go = (to, kind = 'fade', extra = {}) => { trans = { from: mode, to, kind, t: 0, ...extra }; };

const board = createBoard(students, { close(drew) { go('class', 'zoom', { drew }); } });
const letters = createLetters(students, { close() { go('class'); } });
const shapes = createShapes(students, { close() { go('class'); } });
const yard = createPlayground(students, { close() { go('class'); } }); // v2.0: recess outside
const room = createClassroom(students, {
  boardCanvas: () => board.canvas(),
  openBoard() { board.opened(); go('board', 'zoom'); },
  openLetters(tab) { letters.open(tab); go('letters'); },
  openShapes() { shapes.open(); go('shapes'); },
  // recess: the class walks out to the playground; resolves when the whistle has called everyone back in
  openYard(kids) { return new Promise(res => { yard.open(kids, res); go('yard'); }); },
  unlock() { goFullscreen(); },
  // grown-up refresh: only when we can really reach the server, so an offline tap never bricks the app.
  // Returns false (and changes nothing) when offline.
  async forceUpdate() {
    if (navigator.onLine === false) return false;
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 5000);
      // HEAD is not answered by sw.js (it only serves GETs), so this really asks the network
      const r = await fetch('js/version.js?probe=' + Date.now(), { method: 'HEAD', cache: 'no-store', signal: ctl.signal });
      clearTimeout(to);
      if (!r.ok) return false;
    } catch (e) { return false; }
    try {
      const regs = navigator.serviceWorker && navigator.serviceWorker.getRegistrations ? await navigator.serviceWorker.getRegistrations() : [];
      await Promise.race([Promise.all(regs.map(r => r.update().catch(() => {}))), new Promise(res => setTimeout(res, 4000))]);
    } catch (e) { /* ignore */ }
    location.reload();
    return true;
  },
  setMusic(onOff) { G.save.music = onOff; music.setOn(onOff); },
  showing: () => mode === 'class' && !trans, // v2.1: the room's hints only talk while the room is on screen
});
const scenes = { class: room, board, letters, shapes, yard };

function readInsets() {
  const cs = getComputedStyle(probe);
  G.insets = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
}
function resize() {
  G.dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = window.innerWidth, h = window.innerHeight;
  G.devW = Math.round(w * G.dpr); G.devH = Math.round(h * G.dpr);
  canvas.width = G.devW; canvas.height = G.devH;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  readInsets();
  room.resize(); board.resize(); letters.resize(); shapes.resize(); yard.resize();
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

const portrait = () => window.innerHeight > window.innerWidth * 1.05;

// ------------------------------------------------------------------ input (one finger at a time)
let activeId = null;
function view() { return scenes[mode]; }
function toLocal(e) {
  const v = view().view;
  return [e.clientX * G.dpr / v.s, e.clientY * G.dpr / v.s];
}
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  unlock();
  if (!prefetched) { prefetched = true; setTimeout(prefetchClips, 3000); music.setOn(G.save.music !== false); music.start(); }
  if (activeId !== null || trans || portrait()) return;
  activeId = e.pointerId;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  view().down(...toLocal(e));
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== activeId) return;
  e.preventDefault();
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (evs.length ? evs : [e])) view().move(...toLocal(ev));
});
const end = (e) => {
  if (e.pointerId !== activeId) return;
  activeId = null;
  view().up(...toLocal(e));
};
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);
for (const ev of ['touchstart', 'touchmove', 'gesturestart', 'gesturechange', 'dblclick', 'contextmenu']) {
  document.addEventListener(ev, (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
}

function goFullscreen() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const el = document.documentElement;
  if (!standalone && !document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
}

document.addEventListener('visibilitychange', () => { if (document.hidden) persistNow(); });
window.addEventListener('pagehide', persistNow);

// ------------------------------------------------------------------ loop
let last = performance.now();
const SPEED = /[?&]fast\b/.test(location.search) ? 4 : 1;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000) * SPEED;
  last = now;
  G.time += dt;
  tickTimers();
  room.update(dt);
  music.play(yard.isOpen ? yard.musicTrack : room.musicTrack);
  if (mode !== 'class') scenes[mode].update(dt);
  render();
  requestAnimationFrame(frame);
}

/** render a scene onto the screen: its pixel buffer, scaled up, with its smooth letters at device resolution */
function show(scene, alpha = 1) {
  const v = scene.view;
  beginPresent(v, ctx, alpha);
  scene.render();
  endPresent(v, ctx, alpha);
}
const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function render() {
  ctx.fillStyle = '#2b1d2e'; ctx.fillRect(0, 0, G.devW, G.devH);
  if (portrait()) { drawRotate(); return; }
  if (trans && trans.kind === 'fade') {
    trans.t += 1 / 60 / 0.35;
    const k = ease(Math.min(1, trans.t));
    const A = scenes[trans.from], B = scenes[trans.to];
    show(A);
    show(B, k);
    if (trans.t >= 1) { mode = trans.to; trans = null; }
    return;
  }
  if (trans) {
    trans.dir = trans.to === 'board' ? 'in' : 'out';
    trans.t += 1 / 60 / 0.45;
    const t = ease(Math.min(1, trans.t));
    const k = trans.dir === 'in' ? t : 1 - t;
    const rv = room.view, bv = board.view;
    show(room);
    // zoom the drawing from the wall board to the full-screen board
    const ba = room.boardAt ? room.boardAt() : { x: Math.round(rv.W / 2 - 52) + 4, y: 16 };
    const b0 = { x: ba.x * rv.s, y: ba.y * rv.s, w: 96 * rv.s, h: 54 * rv.s };
    const br = board.rect();
    const b1 = { x: br.x * bv.s, y: br.y * bv.s, w: BW * bv.s, h: BH * bv.s };
    if (k > 0.55) {
      show(board, (k - 0.55) / 0.45);
    }
    const lerp = (a, b) => a + (b - a) * k;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#c9d3df';
    const x = lerp(b0.x, b1.x), y = lerp(b0.y, b1.y), w = lerp(b0.w, b1.w), h = lerp(b0.h, b1.h);
    const pad = 3 * lerp(rv.s, bv.s);
    if (k < 0.98) { ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2); ctx.drawImage(board.canvas(), x, y, w, h); }
    if (trans.t >= 1) {
      mode = trans.dir === 'in' ? 'board' : 'class';
      if (trans.dir === 'out' && trans.drew) room.watchBoard();
      trans = null;
    }
    return;
  }
  show(view());
}

function drawRotate() {
  const img = cached('rotate', () => {
    const p = new Pix(40, 40);
    // tablet tipped on its side + curved arrow
    p.rect(6, 12, 28, 18, '#fff3dc'); p.rect(8, 14, 24, 14, '#7ec8ff'); p.rect(32, 20, 1, 2, '#c58b5a');
    p.ball(16, 22, 3, 3, '#fff4ee'); p.ell(14, 17, 1, 3, '#fff4ee'); p.ell(18, 17, 1, 3, '#fff4ee');
    for (let a = -2.6; a < -0.6; a += 0.05) p.px(20 + Math.cos(a) * 16, 22 + Math.sin(a) * 16, '#ffd23f');
    p.rect(33, 11, 3, 3, '#ffd23f'); p.px(35, 10, '#ffd23f'); p.px(32, 14, '#ffd23f');
    p.outline();
    return p.canvas();
  });
  const k = Math.max(2, Math.floor(Math.min(G.devW, G.devH) / 60));
  const bob = Math.round(Math.sin(performance.now() / 300) * k);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(G.devW / 2 - 20 * k), Math.round(G.devH / 2 - 20 * k) + bob, 40 * k, 40 * k);
}

requestAnimationFrame(frame);

// offline support
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=' + VERSION).catch(() => {}));
}
// expose a tiny debug hook for automated screenshots
window.__lt = { G, room, board, yard, students, sfx };
