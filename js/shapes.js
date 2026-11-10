// Shape corner: a wooden shape sorter. Drag each shape into its hole, or tap a shape and then tap its hole.
import { G, makeView, rand, pick, wait } from './state.js';
import { Pix, cached, darken, lighten, glow } from './raster.js';
import * as S from './sprites.js';
import * as UI from './ui.js';
import * as DC from './decor.js';
import { sfx } from './audio.js';
import { speak } from './students.js';
import { makeRow } from './row.js';
import { sayHint, sayUI, drawHand } from './hints.js';
import { SHAPES, shapeName, lang, setLang, flag } from './i18n.js';

const COLORS = ['#ef6f6c', '#ffa65c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6', '#ff8fb8'];
const SIZE = { circle: [26, 26], square: [24, 24], triangle: [28, 25], rectangle: [32, 20], star: [28, 27], heart: [28, 25], oval: [32, 22], diamond: [24, 30] };

function inside(shape, x, y, w, h) { // x,y in pixel centres, 0..w, 0..h
  const u = (x / w) * 2 - 1, v = (y / h) * 2 - 1;
  switch (shape) {
    case 'circle': case 'oval': return u * u + v * v <= 1;
    case 'square': case 'rectangle': return true;
    case 'triangle': return v >= -1 + 2 * Math.abs(u) * 1.0 - 0.02 && v <= 1;
    case 'diamond': return Math.abs(u) + Math.abs(v) <= 1;
    case 'heart': { const X = u * 1.15, Y = -v * 1.2 + 0.25; const q = X * X + Y * Y - 1; return q * q * q - X * X * Y * Y * Y <= 0; }
    case 'star': {
      const ang = Math.atan2(v, u) + Math.PI / 2, r = Math.hypot(u, v);
      const k = ((ang % (Math.PI * 2 / 5)) + Math.PI * 2 / 5) % (Math.PI * 2 / 5);
      const t = Math.abs(k - Math.PI / 5) / (Math.PI / 5); // 0 at point, 1 at valley
      return r <= 1 - t * 0.55 + 0.02 && (v < 0.95);
    }
  }
  return false;
}
export function shapeSprite(shape, col, kind = 'piece', k = 1) { // k: v2.3 bigger pieces for the quiz cards
  return cached('shp' + shape + col + kind + k, () => {
    const [w, h] = SIZE[shape].map(v => Math.round(v * k));
    const p = new Pix(w + 2, h + 2);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(shape, x + 0.5, y + 0.5, w, h)) p.px(x + 1, y + 1, col);
    if (kind === 'piece') {
      // bevel: light top-left edge, dark bottom-right edge
      const src = p.d.slice();
      for (let y = 1; y < h + 1; y++) for (let x = 1; x < w + 1; x++) {
        if (!src[y * (w + 2) + x]) continue;
        if (!src[(y - 1) * (w + 2) + x] || !src[y * (w + 2) + x - 1]) p.px(x, y, lighten(col, 0.45));
        else if (!src[(y + 1) * (w + 2) + x] || !src[y * (w + 2) + x + 1]) p.px(x, y, darken(col, 0.25));
      }
      p.outline();
    } else if (kind === 'hole') {
      const src = p.d.slice();
      for (let y = 1; y < h + 1; y++) for (let x = 1; x < w + 1; x++) if (src[y * (w + 2) + x] && (!src[(y - 1) * (w + 2) + x] || !src[(y - 2) * (w + 2) + x])) p.px(x, y, '#3a2416');
    }
    return p.canvas();
  });
}

export function createShapes(students, hooks) {
  let V = null, L = {};
  let holes = [], pieces = [], drag = null, press = null, roundDone = false, idleSince = 0;
  let sel = null; // tap-then-tap: the piece she tapped (it glows and bobs) until she taps a hole
  const SNAP = 45; // a dropped piece finds a hole this close (logical px)
  const row = makeRow(students);
  const teach = { act: null, t0: 0, dur: 0 };
  const tAct = (name, dur = 1.2) => { teach.act = name; teach.t0 = G.time; teach.dur = dur; };
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const D = (c, im, x, y) => c.drawImage(im, Math.round(x), Math.round(y));
  const inR = (x, y, r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const owl = students.find(s => s.kind === 'owl');

  function resize() {
    V = makeView(175, 250, 180);
    const { W, H, inset } = V;
    L.ledge = H - 6 - Math.min(inset.b, 4);
    L.back = { x: inset.l + 3, y: 3, w: 26, h: 26 };
    L.flag = { x: inset.l + 3, y: 32, w: 26, h: 22 };
    L.area = { x: inset.l + 36, y: 3, w: W - inset.r - 4 - (inset.l + 36), h: L.ledge - 34 - 3 };
    row.layout(W, L.ledge, inset.l + 38, W - inset.r - 4);
    if (!holes.length) newRound(true); else placeAll();
  }
  function placeAll() {
    const a = L.area, n = holes.length;
    const sp = Math.min(46, Math.floor((a.w - 16) / n));
    L.box = { x: a.x + a.w / 2 - (sp * n) / 2 - 6, y: a.y + 6, w: sp * n + 12, h: 44 };
    holes.forEach((h, k) => { h.x = L.box.x + 6 + sp * k + sp / 2; h.y = L.box.y + 23; });
    const order = pieces.map((_, k) => k);
    pieces.forEach((p, k) => {
      p.home = { x: a.x + a.w / 2 + (p.slot - (n - 1) / 2) * sp, y: a.y + a.h - 26 };
      if (!p.placed && !(drag && drag.p === p)) { p.x = p.home.x; p.y = p.home.y; }
      if (p.placed) { p.x = holes[p.hole].x; p.y = holes[p.hole].y; }
    });
    void order;
  }
  function newRound(silent) {
    const n = 4;
    const shapes = [...SHAPES].sort(() => Math.random() - 0.5).slice(0, n);
    const cols = [...COLORS].sort(() => Math.random() - 0.5);
    holes = shapes.map(s => ({ shape: s, x: 0, y: 0 }));
    const slots = shapes.map((_, k) => k).sort(() => Math.random() - 0.5);
    pieces = shapes.map((s, k) => ({ shape: s, col: cols[k], slot: slots[k], placed: false, hole: k, x: 0, y: 0, pop: 0 }));
    roundDone = false; sel = null;
    if (V) placeAll();
    if (!silent) sfx.chime();
  }
  function sayShape(sh) { speak(row.talker() || owl, shapeName(sh), 'here'); }

  function update(dt) {
    row.update(dt);
    for (const p of pieces) {
      if (p.placed) { if (p.fly) { const h = holes[p.hole], k = Math.min(1, dt * 16); p.x += (h.x - p.x) * k; p.y += (h.y - p.y) * k; if (Math.hypot(h.x - p.x, h.y - p.y) < 0.6) { p.x = h.x; p.y = h.y; p.fly = false; } } continue; }
      if (drag && drag.p === p) continue;
      p.x += (p.home.x - p.x) * Math.min(1, dt * 10); p.y += (p.home.y - p.y) * Math.min(1, dt * 10);
    }
  }
  function render() {
    const c = V.ctx, { W, H } = V;
    const [wa, wb] = DC.WALLS[G.save.paint.wall] || DC.WALLS[0];
    R(c, 0, 0, W, H, wa); for (let x = 2; x < W; x += 9) R(c, x, 0, 3, H, wb);
    const a = L.area;
    // play table
    R(c, a.x - 2, a.y + 54, a.w + 4, a.h - 52, '#8fd0c8'); R(c, a.x - 2, a.y + 54, a.w + 4, 2, '#b8e6e0'); R(c, a.x - 2, a.y + a.h, a.w + 4, 2, '#5fa8a0');
    // sorter box
    const b = L.box;
    R(c, b.x, b.y, b.w, b.h, '#d99a5c'); R(c, b.x, b.y, b.w, 2, '#f0c08a'); R(c, b.x, b.y + b.h - 3, b.w, 3, '#b07440');
    R(c, b.x + 2, b.y + b.h, b.w - 4, 4, '#a8703f');
    for (const h of holes) { const im = shapeSprite(h.shape, '#5a3a24', 'hole'); D(c, im, h.x - im.width / 2, h.y - im.height / 2); }
    // pieces (placed ones first, dragged on top)
    const list = [...pieces].sort((p, q) => (p.placed ? 0 : 1) - (q.placed ? 0 : 1) || (drag && drag.p === p ? 1 : 0) - (drag && drag.p === q ? 1 : 0));
    for (const p of list) {
      const im = shapeSprite(p.shape, p.col);
      const lifted = drag && drag.p === p, chosen = sel === p && !lifted;
      let bob = p.pop > G.time ? -2 : roundDone ? Math.round(Math.sin(G.time * 6 + p.slot)) : 0;
      if (chosen) bob = -3 - Math.round(Math.abs(Math.sin(G.time * 5)) * 3); // the chosen piece bobs above its spot
      const wig = p.wig > G.time ? Math.round(Math.sin((p.wig - G.time) * 40) * 2) : 0; // not that hole: a gentle wiggle
      if (lifted || chosen) { c.globalAlpha = 0.25; D(c, shapeSprite(p.shape, '#2b1d2e', 'shadow'), p.x - im.width / 2 + 3, p.y - im.height / 2 + 5); c.globalAlpha = 1; }
      if (chosen) { c.globalAlpha = 0.8 + 0.2 * Math.sin(G.time * 6); D(c, glow(im, '#ffd23f', 'shpsel' + p.shape + p.col), p.x - im.width / 2 - 2 + wig, p.y - im.height / 2 - 2 + bob); c.globalAlpha = 1; }
      D(c, im, p.x - im.width / 2 + wig, p.y - im.height / 2 - (lifted ? 3 : 0) + bob);
    }
    // Louise
    const tk = teach.act && G.time - teach.t0 < teach.dur ? teach.act : null;
    const alt = Math.floor(G.time * 6) % 2;
    const st = { eyes: 'happy', mouth: tk ? 'open' : 'grin', armL: tk === 'clap' ? (alt ? 'clap' : 'front') : tk === 'cheer' ? 'up' : 'down', armR: tk === 'clap' ? (alt ? 'clap' : 'front') : tk === 'cheer' ? 'up' : 'down', sway: Math.floor(G.time * 1.2) % 2 };
    D(c, DC.teacher(st), V.inset.l + 3, L.ledge - DC.TH + 4);
    row.render(c, W, H);
    UI.drawBtn(c, L.back.x, L.back.y, 26, 26, UI.FACE.blue, !!(press && !press.moved && press.x0 >= L.back.x && press.x0 <= L.back.x + 26 && press.y0 >= L.back.y && press.y0 <= L.back.y + 26), S.ICONS.back());
    row.renderParts(c);
    // hint: a hand carries a shape to its hole
    const free = sel || pieces.find(p => !p.placed);
    if (free && !drag && !roundDone && G.time - idleSince > 8) {
      const h = holes[free.hole], k = Math.min(1, ((G.time - idleSince - 8) % 2.4) / 1.6);
      drawHand(c, free.x + (h.x - free.x) * k, free.y + (h.y - free.y) * k);
      sayHint(owl, 'shapes');
    }
  }
  function pieceAt(x, y) {
    for (let k = pieces.length - 1; k >= 0; k--) {
      const p = pieces[k]; const [w, h] = SIZE[p.shape];
      if (Math.abs(x - p.x) <= w / 2 + 3 && Math.abs(y - p.y) <= h / 2 + 3) return p;
    }
    return null;
  }
  function down(x, y) {
    press = { x, y, x0: x, y0: y, moved: false };
    idleSince = G.time;
    const p = pieceAt(x, y);
    if (p && !p.placed) { press.p = p; drag = { p, ox: p.x - x, oy: p.y - y }; sfx.lift(); }
    else if (p) press.placed = p;
  }
  function move(x, y) {
    if (!press) return;
    if (Math.hypot(x - press.x0, y - press.y0) > 5) press.moved = true;
    if (drag) { drag.p.x = x + drag.ox; drag.p.y = y + drag.oy; row.look(x); }
  }
  const holeFree = (k) => !pieces.some(q => q.placed && q.hole === k);
  function holeAt(x, y) { // a tap on a hole: generous, but never past half way to the next hole
    const half = holes.length > 1 ? Math.abs(holes[1].x - holes[0].x) / 2 : 22;
    let best = -1, bd = 1e9;
    holes.forEach((h, k) => {
      const [w, hh] = SIZE[h.shape];
      if (Math.abs(x - h.x) > Math.min(half, w / 2 + 8) || Math.abs(y - h.y) > hh / 2 + 8) return;
      const d = Math.hypot(x - h.x, y - h.y); if (d < bd) { bd = d; best = k; }
    });
    return best;
  }
  function placeIn(p, k, flying) { // the right hole: it drops in and everyone claps
    sel = null;
    p.placed = true; p.hole = k; p.pop = G.time + 0.3; p.fly = !!flying;
    if (!flying) { p.x = holes[k].x; p.y = holes[k].y; }
    sfx.thump(); sfx.pop(1.3); sayShape(p.shape);
    row.burst('star', holes[k].x, holes[k].y, 6, [p.col, '#ffd23f', '#ffffff'], { up: true });
    row.react('clap', 1); sfx.clap(4, 0.6); tAct('clap', 1);
    if (pieces.every(q => q.placed)) {
      roundDone = true;
      wait(0.8).then(() => {
        sfx.fanfare(); row.cheer('cheer'); tAct('cheer', 1.6);
        row.burst('confetti', L.box.x + L.box.w / 2, L.box.y, 36, COLORS, { sp: 90, g: 80, life: 1.4 });
        speak(row.talker() || owl, 'Great job!', 'yay');
      });
      wait(3.4).then(() => newRound());
    }
  }
  function notThatOne(p) { // a wrong hole: a gentle wiggle, no fail
    p.wig = G.time + 0.45;
    sfx.boing(); const t = row.talker(); if (t) { speak(t, 'Hmm?', 'giggle'); } row.react('giggle', 0.8);
  }
  function choose(p) { // tap a free piece: she picks it up (it glows and bobs) and hears its name
    sel = p; p.pop = G.time + 0.25; sfx.lift(); sfx.pop(1.2); sayShape(p.shape);
    row.burst('spark', p.x, p.y, 4, [p.col, '#ffffff']);
  }
  function up() {
    const pr = press; press = null;
    if (!pr) return;
    for (const s of students) s.look = 0;
    if (drag) {
      const p = drag.p; drag = null;
      if (!pr.moved) { choose(p); return; }
      sel = null;
      // the nearest free hole of the same shape within reach wins over a closer wrong hole
      let same = -1, ds = SNAP, any = -1, da = SNAP;
      for (let k = 0; k < holes.length; k++) {
        if (!holeFree(k)) continue;
        const d = Math.hypot(holes[k].x - p.x, holes[k].y - p.y);
        if (holes[k].shape === p.shape && d < ds) { ds = d; same = k; }
        if (d < da) { da = d; any = k; }
      }
      if (same >= 0) { placeIn(p, same); return; }
      if (any < 0) { sfx.softPop(); return; }
      notThatOne(p); // not that one: it slides back home
      return;
    }
    const { x, y } = pr;
    if (inR(x, y, L.back)) { sel = null; sfx.whoosh(); sayUI(owl, 'back'); hooks.close(); return; }
    const hk = holeAt(x, y);
    if (sel && hk >= 0 && !roundDone) { // tap-then-tap: try the chosen piece in this hole
      const p = sel;
      if (holes[hk].shape === p.shape && holeFree(hk)) placeIn(p, hk, true);
      else notThatOne(p); // it stays chosen: she can try another hole
      return;
    }
    if (pr.placed) { pr.placed.pop = G.time + 0.25; sfx.pop(1.2); sayShape(pr.placed.shape); return; }
    if (hk >= 0) { sfx.tap(); sayShape(holes[hk].shape); return; }
    if (sel) { sel = null; sfx.softPop(); } // a tap anywhere else puts it back
    const s = row.hit(x, y); if (s) row.tap(s);
  }
  window.__ltShapes = () => {
    const k = V.s / G.dpr;
    return {
      pieces: pieces.map(p => ({ shape: p.shape, at: [p.x * k, p.y * k], placed: p.placed })),
      holes: holes.map((h, i) => ({ shape: h.shape, at: [h.x * k, h.y * k], free: holeFree(i) })),
      back: [(L.back.x + 13) * k, (L.back.y + 13) * k], sel: sel ? pieces.indexOf(sel) : -1, done: roundDone, snap: SNAP * k,
    };
  };
  return { resize, update, render, down, move, up, open() { idleSince = G.time; sel = null; }, get view() { return V; } };
}
