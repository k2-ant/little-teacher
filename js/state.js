// Shared game state, views (integer pixel scaling), timers and saving.
import { hookView } from './hires.js';
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
  hookView(ctx, buf, s); // smooth letters are painted at device resolution on top (hires.js)
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
// v2.4: three teachers can share the iPad, each with her own classroom, stickers and look. Teacher 1 keeps the
// original key, so an existing classroom is untouched; the others get their own key.
const KEY0 = 'littleTeacher.v1', WHO = 'littleTeacher.who';
export const SLOTS = 3;
const slotKey = (i) => (i ? KEY0 + '.p' + (i + 1) : KEY0);
function readWho() { try { const n = parseInt(localStorage.getItem(WHO), 10); return n >= 0 && n < SLOTS ? n : 0; } catch (e) { return 0; } }
export const SLOT = readWho(); // fixed for this page load, so a late save can never land in another teacher's classroom
const KEY = slotKey(SLOT);
/** a peek at another teacher's save (for the "who is teaching today?" picker); null if she hasn't played yet */
export function peekSlot(i) {
  if (i === SLOT) return G.save;
  try { const s = JSON.parse(localStorage.getItem(slotKey(i))); return s && s.v === 1 ? s : null; } catch (e) { return null; }
}
/** hand the classroom over to another teacher: save, remember who, and start again with her classroom */
export function switchSlot(i) {
  if (i === SLOT || !(i >= 0 && i < SLOTS)) return;
  persistNow();
  try { localStorage.setItem(WHO, String(i)); sessionStorage.setItem('littleTeacher.pick', '1'); } catch (e) { return; }
  location.reload();
}
export function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
  if (!s || s.v !== 1) s = { v: 1, day: 1, furniture: {}, seats: null, board: null, stickers: [], stars: {} };
  s.stickers ||= []; s.furniture ||= {}; s.stars ||= {};
  s.decor ||= []; s.deskItems ||= {}; s.paint ||= { wall: 0, floor: 0 }; s.rugV ||= 0;
  s.decorStamp ||= 0; s.decorSeen ||= 0;
  // v2.0 decorating: placed things may carry s (size 0-2) and f (flipped); gallery = her last whiteboard drawings (small PNGs) for the art wall
  if (!Array.isArray(s.decor)) s.decor = [];
  s.decor = s.decor.filter(d => d && typeof d.t === 'string' && Number.isFinite(d.fx) && Number.isFinite(d.fy));
  if (!Array.isArray(s.gallery)) s.gallery = [];
  s.gallery = s.gallery.filter(g => typeof g === 'string').slice(0, 3);
  if (!s.paint || typeof s.paint !== 'object') s.paint = { wall: 0, floor: 0 };
  if (!Array.isArray(s.gifts)) s.gifts = []; // v1.9: decorations delivered in a parcel at the door
  if (!Array.isArray(s.abcShown)) s.abcShown = []; if (!s.crown || typeof s.crown !== 'object') s.crown = null; // v1.9: alphabet line, star-of-the-week crown
  // v1.9 rituals: today's weather { day, w } and the class jobs { day, assign: {kind: job}, watered }
  if (!s.weather || typeof s.weather !== 'object' || typeof s.weather.w !== 'string') s.weather = null;
  if (!s.jobs || typeof s.jobs !== 'object' || !s.jobs.assign || typeof s.jobs.assign !== 'object') s.jobs = null;
  s.jar = Math.max(0, s.jar | 0); s.parties = Math.max(0, s.parties | 0); // v2.4: the class star jar
  if (s.look && typeof s.look !== 'object') s.look = null; // v2.4: this teacher's look (decor.js fills in the default)
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

/** v2.6 "little one" mode: this teacher is two or three years old, so everything is more forgiving */
export const little = () => !!(G.save && G.save.little);
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
