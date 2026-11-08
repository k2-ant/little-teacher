// Shared game state, views (integer pixel scaling), timers and saving.
export const G = {
  time: 0,
  devW: 1, devH: 1, dpr: 1,
  insets: { t: 0, r: 0, b: 0, l: 0 }, // css px
  mode: 'title',
  save: null,
};

/** A view is a low-res buffer that is blitted to the screen at an integer scale. */
export function makeView(targetH, minW, minH = 120) {
  const byH = Math.round(G.devH / targetH);
  const s = Math.max(1, Math.min(byH, Math.floor(G.devW / minW), Math.floor(G.devH / minH)));
  const W = Math.ceil(G.devW / s), H = Math.ceil(G.devH / s);
  const buf = document.createElement('canvas');
  buf.width = W; buf.height = H;
  const ctx = buf.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const k = G.dpr / s;
  const inset = {
    t: Math.ceil(G.insets.t * k), r: Math.ceil(G.insets.r * k),
    b: Math.ceil(G.insets.b * k), l: Math.ceil(G.insets.l * k),
  };
  return { s, W, H, buf, ctx, inset };
}

// ---- game-time timers usable with await
const timers = [];
export function wait(sec) { return new Promise(r => timers.push({ t: G.time + sec, r })); }
export function tickTimers() {
  for (let i = timers.length - 1; i >= 0; i--) {
    if (timers[i].t <= G.time) { const r = timers[i].r; timers.splice(i, 1); r(); }
  }
}

// ---- save
const KEY = 'littleTeacher.v1';
export function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
  if (!s || s.v !== 1) s = { v: 1, day: 1, furniture: {}, seats: null, board: null, stickers: [], stars: {} };
  s.stickers ||= []; s.furniture ||= {}; s.stars ||= {};
  G.save = s;
  return s;
}
let saveQueued = false;
export function persist() {
  if (saveQueued) return;
  saveQueued = true;
  setTimeout(() => {
    saveQueued = false;
    try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { /* storage full or private mode */ }
  }, 300);
}
export function persistNow() { try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { /* ignore */ } }

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
