import { G, makeView, wait, persist, rand, pick, clamp } from './state.js';
import { Pix, cached, glow, darken, lighten } from './raster.js';
import * as S from './sprites.js';
import { sfx, hush } from './audio.js';
import { act, acting, hop, talk, speak, animalSound, coax, physics, walkStep, walkTo, pose, traits, startle, GREETINGS, BYES, randomCheer } from './students.js';
import { PAGES } from './pages.js';

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const D = (c, img, x, y) => c.drawImage(img, Math.round(x), Math.round(y));

const FURN_DEFAULT = {
  desk0: [0.30, 0.34], desk1: [0.50, 0.34], desk2: [0.70, 0.34], desk3: [0.40, 0.77], desk4: [0.60, 0.77],
  rug: [0.15, 0.93], plant: [0.93, 0.62], shelf: [0.9, 0.13],
};
const FURN_SIZE = { desk: [S.DESK_W, S.DESK_H], rug: [84, 32], plant: [28, 38], shelf: [38, 46] };

// ------------------------------------------------------------------ mini faces for the attendance chart
function miniFace(kind, on) {
  return cached('mini' + kind + on, () => {
    const p = new Pix(13, 13);
    const C = S.PAL[kind];
    const g = (c) => on ? c : darken(lighten(c, 0.5), 0.15);
    if (kind === 'bunny') { p.ell(4.5, 3, 1.5, 3.4, g(C.fur)); p.ell(8.5, 3, 1.5, 3.4, g(C.fur)); p.px(4, 2, g(C.inner)); p.px(8, 2, g(C.inner)); }
    if (kind === 'owl') { p.ell(3, 3.5, 1.5, 2, g(C.fur)); p.ell(10, 3.5, 1.5, 2, g(C.fur)); }
    if (kind === 'frog') { p.ell(4, 4.5, 2.4, 2.2, g(C.fur)); p.ell(9, 4.5, 2.4, 2.2, g(C.fur)); }
    p.ball(6.5, 7.5, 5.5, 4.6, g(C.fur), { hi: false });
    if (kind === 'puppy') { p.ell(1.6, 7, 1.5, 3, g(C.ear)); p.ell(11.4, 7, 1.5, 3, g(C.ear)); }
    if (kind === 'turtle') p.ell(6.5, 4.6, 5, 2.4, g(C.accent), { y1: 4 });
    if (kind === 'owl') { p.ell(4.5, 7.5, 2, 2, g(C.disk)); p.ell(8.5, 7.5, 2, 2, g(C.disk)); p.px(6, 9, g('#ffae4a')); }
    const e = on ? S.INK : '#9a8d98';
    if (kind === 'frog') { p.px(4, 4, e); p.px(9, 4, e); } else { p.px(4, 7, e); p.px(8, 7, e); }
    if (on) { p.px(5, 10, S.INK); p.px(6, 10, S.INK); p.px(7, 10, S.INK); }
    p.outline();
    return p.canvas();
  });
}
function btnFrame(w, h, col = '#fff3dc', key = '') {
  return cached('btn' + w + 'x' + h + col + key, () => {
    const p = new Pix(w, h);
    p.rect(1, 0, w - 2, h - 1, darken(col, 0.5)); p.rect(0, 1, w, h - 3, darken(col, 0.5));
    p.rect(1, 1, w - 2, h - 3, col); p.hline(2, w - 3, 1, lighten(col, 0.6));
    p.rect(1, h - 2, w - 2, 1, darken(col, 0.35));
    return p.canvas();
  });
}
function scaled(img, k) {
  return cached('scaled' + k + (img.__id ||= Math.random()), () => {
    const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, c.width, c.height); return c;
  });
}

export function createClassroom(students, hooks) {
  let V = null;
  const L = {};
  let bg = null;
  const furn = {};
  for (const id of Object.keys(FURN_DEFAULT)) {
    const type = id.startsWith('desk') ? 'desk' : id;
    const saved = G.save.furniture[id];
    const [fx, fy] = saved || FURN_DEFAULT[id];
    furn[id] = { id, type, i: type === 'desk' ? +id.slice(4) : 0, fx, fy, x: 0, y: 0, lift: 0 };
  }
  if (G.save.seats) students.forEach(s => { if (G.save.seats[s.kind] !== undefined) s.desk = G.save.seats[s.kind]; });
  students.forEach(s => { s.stars = G.save.stars[s.kind] || 0; });

  const desks = [0, 1, 2, 3, 4].map(i => furn['desk' + i]);
  const parts = [];
  let phase = 'title';
  let busy = false;
  let doorOpen = 0, doorTarget = 0;
  let dusk = 0, duskTarget = 0, sky = 'morning';
  let drag = null; // {kind:'furn'|'student'|'star', ...}
  let press = null;
  let menu = null; // free-time chooser
  let story = null, recess = null;
  let reward = null, bookOpen = null;
  let hintT = 6;
  let attendanceDone = false;
  let btns = [];
  let lastTap = 0;

  // ---------------------------------------------------------------- layout
  function resize() {
    V = makeView(200, 300);
    const { W, H } = V;
    L.wallH = Math.round(H * 0.43);
    L.floorTop = L.wallH;
    L.floorH = H - L.wallH;
    L.board = { x: Math.round(W / 2 - 52), y: 12, w: 104, h: 64 };
    L.door = { x: 12, y: L.wallH - 52, w: 28, h: 52 };
    L.win = { x: W - 86, y: 22, w: 50, h: 40 };
    L.clock = { x: Math.round((L.door.x + L.door.w + L.board.x) / 2), y: 50 };
    L.doorPt = { x: L.door.x + 14, y: L.floorTop + 5 };
    for (const f of Object.values(furn)) place(f);
    const i = V.inset, B = 26;
    btns = [
      { id: 'stickers', x: i.l + 4, y: i.t + 4, w: B, h: B, icon: S.ICONS.stickers },
      { id: 'home', x: V.W - i.r - B - 4, y: i.t + 4, w: B, h: B, icon: S.ICONS.home },
      { id: 'toys', x: i.l + 4, y: V.H - i.b - B - 4, w: B, h: B, icon: S.ICONS.toys },
      { id: 'star', x: V.W - i.r - B - 4, y: V.H - i.b - B - 4, w: B, h: B, icon: S.ICONS.star },
    ];
    L.chart = { x: i.l + 34, y: i.t + 7 };
    bg = drawBg();
    return V;
  }
  function place(f) {
    const [w] = FURN_SIZE[f.type];
    f.x = clamp(Math.round(f.fx * V.W), w / 2 + 2, V.W - w / 2 - 2);
    const minY = L.floorTop + (f.type === 'rug' ? 22 : f.type === 'shelf' ? 8 : 12);
    f.y = clamp(Math.round(L.floorTop + f.fy * L.floorH), minY, V.H - 2);
  }
  function seat(s) { const d = desks[s.desk]; return { x: d.x, y: d.y - 13 }; }

  // ---------------------------------------------------------------- background (static, cached per size)
  function drawBg() {
    const { W, H } = V;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const wh = L.wallH;
    R(c, 0, 0, W, wh, '#f7e6c4');
    for (let x = 2; x < W; x += 9) R(c, x, 3, 3, wh - 22, '#f2dcb3');
    for (let x = 6; x < W; x += 18) for (let y = 10; y < wh - 24; y += 14) { R(c, x, y, 1, 1, '#f9c8b0'); R(c, x + 9, y + 7, 1, 1, '#cde3c8'); }
    R(c, 0, 0, W, 3, '#e3c592'); R(c, 0, 3, W, 1, '#fff3d9');
    R(c, 0, wh - 20, W, 20, '#bfe0d0');
    R(c, 0, wh - 21, W, 2, '#8fc0a9'); R(c, 0, wh - 22, W, 1, '#d9f0e4');
    for (let x = 3; x < W; x += 22) { R(c, x, wh - 16, 17, 10, '#cfeadc'); R(c, x, wh - 6, 17, 1, '#a3cdb9'); R(c, x + 17, wh - 16, 1, 11, '#a3cdb9'); }
    R(c, 0, wh - 4, W, 4, '#8c5a3c'); R(c, 0, wh - 4, W, 1, '#a8714a');
    // floor planks
    for (let y = wh, r = 0; y < H; y += 7, r++) {
      R(c, 0, y, W, 7, r % 2 ? '#d7a46a' : '#dcab70');
      R(c, 0, y + 6, W, 1, '#bd8650');
      for (let x = (r * 23) % 44; x < W; x += 44) R(c, x, y, 1, 6, '#c48e57');
      for (let x = (r * 37) % 31; x < W; x += 31) R(c, x + 5, y + 2, 2, 1, '#e4b67e');
    }
    R(c, 0, wh, W, 2, '#bf8a55');
    // sun patch from the window
    for (let j = 0; j < 46; j++) {
      const y = wh + 2 + j; if (y >= H) break;
      const x0 = L.win.x - 14 - j * 0.9;
      c.fillStyle = 'rgba(255,240,190,0.22)'; c.fillRect(Math.round(x0), y, 46 + Math.round(j * 0.3), 1);
    }
    // pennant banner
    const bx0 = L.board.x - 6, bx1 = Math.min(L.win.x - 4, W - 36);
    const cols = ['#ef6f6c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6', '#ff9ec4'];
    for (let x = bx0, k = 0; x < bx1 - 6; x += 10, k++) {
      const col = cols[k % cols.length];
      for (let j = 0; j < 7; j++) R(c, x + j * 0.5, 5 + j, 8 - j, 1, col);
      R(c, x + 1, 5, 6, 1, lighten(col, 0.4));
    }
    R(c, bx0 - 2, 4, bx1 - bx0, 1, '#a06a44');
    // poster between board and window when there is room
    const gap = L.win.x - (L.board.x + L.board.w);
    if (gap > 40) {
      const px = L.board.x + L.board.w + Math.round(gap / 2) - 13, py = 24;
      R(c, px, py, 26, 32, '#fffaf0'); R(c, px, py + 31, 26, 1, '#d8c7a8');
      const sh = [['#ef6f6c', 3, 4], ['#ffd23f', 14, 4], ['#64a8e8', 3, 17], ['#7dd370', 14, 17]];
      for (const [col, ox, oy] of sh) R(c, px + ox, py + oy, 9, 9, col);
      R(c, px + 12, py - 1, 2, 2, '#ef6f6c');
    }
    // cubbies under the clock-side wall
    return cv;
  }

  // ---------------------------------------------------------------- live wall pieces
  function drawWindow(c) {
    const w = L.win, t = G.time;
    R(c, w.x - 3, w.y - 3, w.w + 6, w.h + 6, '#fffaf0');
    R(c, w.x - 3, w.y + w.h + 3, w.w + 6, 1, '#d8c7a8');
    const skies = { morning: ['#a8dcff', '#d6f0ff'], day: ['#8fd0ff', '#c6ebff'], sunset: ['#ff9f7a', '#ffd29a'], night: ['#202650', '#3a3f78'] };
    const [s0, s1] = skies[sky];
    for (let y = 0; y < w.h; y++) R(c, w.x, w.y + y, w.w, 1, y < w.h * 0.55 ? s0 : s1);
    if (sky === 'night') {
      D(c, cached('winmoon', () => { const p = new Pix(11, 11); p.ball(5, 5.5, 4.6, 4.6, '#ffe58a', { hi: false }); p.ell(7.5, 3.8, 3.6, 3.6, 0); p.px(3, 5, '#2b1d2e'); return p.canvas(); }), w.x + 33, w.y + 4);
      for (const [x, y] of [[6, 5], [14, 14], [24, 6], [44, 20], [9, 24]]) R(c, w.x + x, w.y + y, 1, 1, Math.floor(t * 2 + x) % 3 ? '#fff6b8' : '#8f93c8');
    } else {
      const sy = sky === 'sunset' ? 24 : 8;
      R(c, w.x + 36, w.y + sy, 8, 8, '#ffe066'); R(c, w.x + 35, w.y + sy + 1, 10, 6, '#ffe066'); R(c, w.x + 37, w.y + sy + 1, 2, 2, '#fff6c0');
      for (let k = 0; k < 2; k++) {
        const cx = w.x + ((t * (2 + k) + k * 30) % (w.w + 30)) - 15, cy = w.y + 8 + k * 9;
        c.save(); c.beginPath(); c.rect(w.x, w.y, w.w, w.h); c.clip();
        R(c, cx, cy, 14, 4, '#ffffff'); R(c, cx + 3, cy - 2, 7, 2, '#ffffff'); R(c, cx + 1, cy + 4, 12, 1, '#e3f3ff');
        c.restore();
      }
    }
    // hills + tree outside
    R(c, w.x, w.y + w.h - 8, w.w, 8, sky === 'night' ? '#2f5a47' : '#7dc96b');
    R(c, w.x + 6, w.y + w.h - 18, 9, 10, sky === 'night' ? '#244a3a' : '#4fae45'); R(c, w.x + 9, w.y + w.h - 9, 3, 4, '#8a5730');
    // mullions
    R(c, w.x + w.w / 2 - 1, w.y, 2, w.h, '#fffaf0'); R(c, w.x, w.y + w.h / 2 - 1, w.w, 2, '#fffaf0');
    // curtains
    for (const [x, d] of [[w.x - 7, 1], [w.x + w.w - 1, -1]]) {
      R(c, x, w.y - 5, 8, w.h + 12, '#ff9ec4');
      for (let k = 0; k < 3; k++) R(c, x + 1 + k * 2 + (d < 0 ? 1 : 0), w.y - 5, 1, w.h + 12, '#ef7fae');
      R(c, x, w.y + w.h - 2, 8, 2, '#ffd23f');
    }
    R(c, w.x - 10, w.y - 7, w.w + 20, 2, '#a06a44');
    // sill + little pot
    R(c, w.x - 5, w.y + w.h + 3, w.w + 10, 3, '#e9d7b4');
    R(c, w.x + 4, w.y + w.h - 2, 7, 5, '#e0805a'); R(c, w.x + 5, w.y + w.h - 6, 2, 4, '#62b95e'); R(c, w.x + 8, w.y + w.h - 7, 2, 5, '#4fae45'); R(c, w.x + 6, w.y + w.h - 8, 3, 2, '#ff8fb8');
  }
  function clockFace() {
    return cached('clock', () => {
      const p = new Pix(19, 19);
      p.ell(9.5, 9.5, 9.5, 9.5, '#ef6f6c'); p.ell(9.5, 9.5, 7.6, 7.6, '#fffaf0');
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; p.px(9.5 + Math.cos(a) * 6.4 - 0.5, 9.5 + Math.sin(a) * 6.4 - 0.5, k % 3 ? '#d8c7a8' : '#7a5b6a'); }
      p.px(7, 4, '#ffffff'); p.px(6, 5, '#ffffff');
      p.outline();
      return p.canvas();
    });
  }
  function drawClock(c) {
    const x = L.clock.x - 9, y = L.clock.y - 9;
    D(c, clockFace(), x, y);
    const d = new Date();
    const hand = (ang, len, col) => {
      for (let r = 0; r <= len; r += 0.5) R(c, L.clock.x + 0.5 + Math.sin(ang) * r - 0.5, L.clock.y + 0.5 - Math.cos(ang) * r - 0.5, 1, 1, col);
    };
    hand((d.getHours() % 12 + d.getMinutes() / 60) * Math.PI / 6, 3.5, '#2b1d2e');
    hand(d.getMinutes() * Math.PI / 30, 5.5, '#5a4560');
    R(c, L.clock.x, L.clock.y, 1, 1, '#ef6f6c');
  }
  function drawDoor(c) {
    const d = L.door;
    R(c, d.x - 3, d.y - 3, d.w + 6, d.h + 3, '#a8703f'); R(c, d.x - 3, d.y - 3, d.w + 6, 1, '#c98c55');
    if (doorOpen > 0.5) {
      R(c, d.x, d.y, d.w, d.h, '#4a3b5c');
      R(c, d.x, d.y + d.h - 10, d.w, 10, '#6d5a7d');
      R(c, d.x + 4, d.y + 6, d.w - 8, 14, '#ffe9b8'); // hallway light
      R(c, d.x - 2, d.y, 5, d.h, '#c27c48'); R(c, d.x - 2, d.y, 1, d.h, '#dc985f');
    } else {
      R(c, d.x, d.y, d.w, d.h, '#c27c48');
      R(c, d.x + 3, d.y + 4, d.w - 6, 14, '#bfe6ff'); R(c, d.x + 3, d.y + 4, d.w - 6, 1, '#8fc6ea');
      R(c, d.x + 5, d.y + 6, 3, 2, '#ffffff');
      R(c, d.x + 4, d.y + 24, d.w - 8, 10, '#b06c3c'); R(c, d.x + 4, d.y + 37, d.w - 8, 11, '#b06c3c');
      R(c, d.x + 4, d.y + 24, d.w - 8, 1, '#d48e58'); R(c, d.x + 4, d.y + 37, d.w - 8, 1, '#d48e58');
      R(c, d.x + d.w - 6, d.y + 30, 3, 3, '#ffd23f'); R(c, d.x + d.w - 6, d.y + 30, 1, 1, '#fff6b8');
    }
    // welcome sign: a heart
    const hp = cached('doorheart', () => { const p = new Pix(11, 10); S.heartPix(p, 1, 1); p.outline(); return p.canvas(); });
    D(c, hp, d.x + d.w / 2 - 5, d.y - 14);
  }
  function drawBoard(c) {
    const b = L.board;
    R(c, b.x - 1, b.y - 1, b.w + 2, b.h + 2, '#6f7b8f');
    R(c, b.x, b.y, b.w, b.h, '#c9d3df'); R(c, b.x, b.y, b.w, 1, '#eef3f8');
    R(c, b.x + 3, b.y + 3, b.w - 6, b.h - 6, '#9aa7b8');
    c.imageSmoothingEnabled = true;
    c.drawImage(hooks.boardCanvas(), b.x + 4, b.y + 4, 96, 54);
    c.imageSmoothingEnabled = false;
    // tray + markers
    R(c, b.x - 4, b.y + b.h, b.w + 8, 3, '#b3bfcd'); R(c, b.x - 4, b.y + b.h + 3, b.w + 8, 1, '#7d899c');
    const mc = ['#ef4b4b', '#2f7de1', '#3cb44b'];
    mc.forEach((col, k) => { R(c, b.x + 8 + k * 9, b.y + b.h - 1, 7, 2, col); R(c, b.x + 13 + k * 9, b.y + b.h - 1, 2, 2, '#fffaf0'); });
    R(c, b.x + b.w - 20, b.y + b.h - 2, 10, 3, '#ff9ec4');
    // gentle "tap me" hint
    if (phase === 'class' && hintT < 1.2) {
      const bob = Math.round(Math.sin(G.time * 10) * 2);
      const pen = cached('hintpen', () => { const p = new Pix(14, 14); for (let k = 0; k < 9; k++) { p.px(3 + k, 10 - k, '#ef4b4b'); p.px(4 + k, 10 - k, '#ef4b4b'); p.px(3 + k, 9 - k, '#ff8080'); } p.px(2, 11, '#2b1d2e'); p.px(3, 11, '#2b1d2e'); p.outline(); return p.canvas(); });
      D(c, pen, b.x + b.w - 16, b.y + 20 + bob);
    }
  }

  // ---------------------------------------------------------------- particles
  function burst(kind, x, y, n, colors, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = opts.up ? rand(-2.6, -0.5) : rand(0, Math.PI * 2);
      const sp = rand(opts.spMin ?? 20, opts.sp ?? 60);
      parts.push({ kind, color: pick(colors), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: opts.g ?? 60, life: rand(0.6, 1.1) * (opts.life ?? 1), t: 0 });
    }
  }
  function floatUp(kind, color, x, y, life = 1.4) { parts.push({ kind, color, x, y, vx: rand(4, 9), vy: -14, g: 0, life, t: 0, wob: true }); }

  // ---------------------------------------------------------------- student placement helpers
  function spriteRect(s) {
    if (s.mode === 'seated') { const d = desks[s.desk]; return { x: d.x - S.SW / 2, y: d.y - 15 - S.SH }; }
    return { x: s.x - S.SW / 2, y: s.y - S.SH };
  }
  function hitStudent(x, y) {
    const order = students.filter(s => s.mode !== 'away').sort((a, b) => sortY(b) - sortY(a));
    for (const s of order) {
      const r = spriteRect(s);
      const top = r.y + (s.kind === 'turtle' && s.hide > 0 ? 22 : 6) - s.z;
      const bottom = s.mode === 'seated' ? r.y + S.SH - 6 : r.y + S.SH;
      if (x >= r.x + 5 && x <= r.x + S.SW - 5 && y >= top && y <= bottom - s.z) return s;
    }
    return null;
  }
  function sortY(s) { return s.mode === 'seated' ? desks[s.desk].y : s.y; }
  function hitFurn(x, y) {
    const list = Object.values(furn).sort((a, b) => (b.type === 'rug' ? -1e4 : b.y) - (a.type === 'rug' ? -1e4 : a.y));
    for (const f of list) {
      const [w, h] = FURN_SIZE[f.type];
      const top = f.type === 'desk' ? f.y - h + 2 : f.y - h;
      if (x >= f.x - w / 2 && x <= f.x + w / 2 && y >= top && y <= f.y) {
        if (f.type === 'rug') { const dx = (x - f.x) / (w / 2), dy = (y - (f.y - h / 2)) / (h / 2); if (dx * dx + dy * dy > 1) continue; }
        return f;
      }
    }
    return null;
  }
  const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const awake = () => students.filter(s => s.mode !== 'away' && !s.sleep && !(s.hide > 0));

  // ---------------------------------------------------------------- tapping students
  function tapStudent(s) {
    hintT = Math.min(hintT, 8);
    if (s.mode === 'walk') { hop(s, 60); sfx.boing(); return; }
    if (coax(s)) {
      if (!s.here && !s.sleep && !(s.hide > 0)) markHere(s, 0.5);
      return;
    }
    if (!s.here) { markHere(s, 0); return; }
    if (s.kind === 'puppy' && s.mode === 'stand' && !story && !recess) { // wandering puppy goes back to his seat
      hop(s, 70); sfx.woof(); talk(s, 'heart', 1.2);
      wait(0.5).then(() => sendToSeat(s));
      return;
    }
    if (acting(s, 'raise')) {
      act(s, 'cheer', 1.2); hop(s, 85); sfx.cheer(1.2); speak(s, randomCheer(), 'yay');
      burst('star', ...headPos(s), 6, ['#ffd23f', '#ff9ec4', '#7ec8ff'], { up: true });
      return;
    }
    s.tapCount++;
    if (s.kind === 'frog') { act(s, 'giggle', 1.2); sfx.giggle(1.3, 6); burst('note', ...headPos(s), 3, ['#7a5bc0', '#ff6f91'], { up: true }); return; }
    act(s, 'happy', 0.9); hop(s, 70); animalSound(s);
    burst('heart', ...headPos(s), 2, ['#ff6f91', '#ff9ec4'], { up: true, sp: 30 });
  }
  function headPos(s) { const r = spriteRect(s); return [r.x + S.SW / 2, r.y + 10 - s.z]; }
  function markHere(s, delay) {
    s.here = true;
    wait(delay).then(() => {
      act(s, 'here', 1.3); hop(s, 55); talk(s, 'check', 1.6);
      speak(s, s.kind === 'turtle' ? 'here...' : 'Here!');
      burst('spark', ...headPos(s), 5, ['#7dd370', '#ffd23f']);
      if (students.every(t => t.here) && !attendanceDone) {
        attendanceDone = true;
        wait(1.4).then(() => {
          sfx.chime();
          for (const t of awake()) { act(t, 'cheer', 1.3); hop(t, 60); }
          burst('confetti', V.W / 2, 30, 40, ['#ef6f6c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'], { sp: 90, g: 80, life: 1.6 });
        });
      }
    });
  }
  function sendToSeat(s) {
    const p = seat(s);
    walkTo(s, p.x, p.y, 46).then(() => { s.mode = 'seated'; s.look = 0; });
  }
  async function gatherSeats() {
    for (const s of students) if (s.mode !== 'seated' && s.mode !== 'away') sendToSeat(s);
    for (let i = 0; i < 60 && students.some(s => s.mode !== 'seated' && s.mode !== 'away'); i++) await wait(0.15);
  }

  // ---------------------------------------------------------------- gold star
  function awardStar(s) {
    if (s.sleep) { s.sleep = false; s.sleepT = rand(25, 45); }
    if (s.hide > 0) { s.hide = 0; s.hideT = rand(40, 60); }
    s.glowT = 2.2; s.stars++;
    G.save.stars[s.kind] = s.stars; persist();
    act(s, 'wiggle', 2); hop(s, 80);
    sfx.sparkle(); speak(s, pick(['Thank you!', 'Yay! A star!', 'Wow!', 'I love it!']), 'yay');
    burst('spark', ...headPos(s), 12, ['#ffd23f', '#fff6b8', '#ffb020'], { sp: 70 });
    talk(s, 'star', 1.8);
    for (const t of awake()) if (t !== s && !t.act && Math.random() < 0.6) act(t, 'clap', 1.2);
    wait(0.3).then(() => sfx.clap(4, 0.8));
  }

  // ---------------------------------------------------------------- the daily loop
  async function startDay() {
    busy = true; phase = 'morning';
    sky = 'morning'; duskTarget = 0;
    attendanceDone = false;
    for (const s of students) Object.assign(s, { mode: 'away', here: false, sleep: false, hide: 0, act: null, bubble: null, glowT: 0, z: 0, vz: 0, snack: null, sleepT: rand(14, 24), wanderT: rand(20, 32), hideT: 0 });
    await wait(0.5);
    sfx.bell();
    await wait(2.2);
    for (const s of students) {
      doorTarget = 1; sfx.door();
      await wait(0.35);
      s.x = L.doorPt.x; s.y = L.doorPt.y; s.mode = 'walk';
      const p = seat(s);
      // walk out of the door, then to the seat
      await walkTo(s, L.doorPt.x + 4, L.doorPt.y + 8, 40);
      walkTo(s, p.x, p.y, 44).then(() => {
        s.mode = 'seated'; s.look = 0;
        act(s, 'wave', 1.6); talk(s, 'sun', 1.8);
        speak(s, GREETINGS[s.kind], 'hi');
        if (s.kind === 'turtle') wait(1.8).then(() => { s.hide = 1; s.hideT = rand(30, 45); sfx.softPop(); });
        if (s.kind === 'bunny') s.sleepT = rand(8, 14);
      });
      await wait(1.5);
    }
    doorTarget = 0; sfx.door();
    for (let i = 0; i < 40 && students.some(s => s.mode !== 'seated'); i++) await wait(0.2);
    busy = false; phase = 'class'; sky = 'day';
    hintT = 3;
  }

  async function goodbye() {
    busy = true; phase = 'goodbye'; menu = null;
    sfx.bell();
    sky = 'sunset'; duskTarget = 0.35;
    await wait(1.2);
    await gatherSeats();
    for (const s of students) { s.sleep = false; s.hide = 0; s.snack = null; }
    for (const s of students) { s.mode = 'stand'; Object.assign(s, seat(s)); s.y += 2; }
    await wait(0.4);
    for (const s of students) { act(s, 'wave', 2.4); talk(s, 'heart', 2.4); }
    speak(students[3], 'Goodbye, teacher!', 'bye'); sfx.bye(1.2);
    await wait(2.4);
    for (const s of students) {
      doorTarget = 1;
      walkTo(s, L.doorPt.x + 4, L.doorPt.y + 8, 52).then(() => walkTo(s, L.doorPt.x, L.doorPt.y - 2, 40)).then(() => { s.mode = 'away'; });
      speak(s, BYES[s.kind], 'bye');
      await wait(1.3);
    }
    for (let i = 0; i < 50 && students.some(s => s.mode !== 'away'); i++) await wait(0.2);
    doorTarget = 0; sfx.door();
    await wait(0.8);
    duskTarget = 0.5; sky = 'night';
    await wait(0.8);
    // earn a sticker
    const owned = G.save.stickers;
    const fresh = S.STICKERS.filter(id => !owned.includes(id));
    const id = fresh.length ? fresh[0] : pick(S.STICKERS);
    reward = { id, t: G.time, collected: false };
    sfx.fanfare();
    phase = 'reward';
    busy = false;
  }
  function collectReward() {
    if (!reward || reward.collected) return;
    reward.collected = true; reward.ct = G.time;
    sfx.peel();
    G.save.stickers.push(reward.id);
    G.save.day = (G.save.day || 1) + 1;
    persist();
    wait(1.0).then(() => { sfx.chime(); reward = null; phase = 'night'; });
  }

  // ---------------------------------------------------------------- free time
  async function snackTime() {
    busy = true; phase = 'activity';
    await gatherSeats();
    sfx.ding(880);
    for (const s of students) { s.sleep = false; if (s.hide > 0) s.hide = 0; s.snack = { bites: 0 }; }
    await wait(0.8);
    for (const s of students) { act(s, 'gasp', 0.7); }
    speak(students[1], 'Yummy!', 'yay');
    await wait(1);
    for (let b = 0; b < 3; b++) {
      for (const s of students) {
        act(s, 'munch', 1.1);
        wait(rand(0, 0.5)).then(() => { s.snack.bites = b + 1; sfx.crunch(); const d = desks[s.desk]; burst('crumb', d.x, d.y - 18, 4, ['#e8b06a', '#ff9a3c', '#ff4f6a'], { up: true, sp: 30, g: 140 }); });
      }
      await wait(1.5);
    }
    for (const s of students) { s.snack = null; act(s, 'happy', 1.2); burst('heart', ...headPos(s), 2, ['#ff6f91'], { up: true, sp: 25 }); }
    sfx.yay(1.2); speak(students[4], 'Thank you!', 'yay');
    await wait(1.2);
    busy = false; phase = 'class';
  }
  async function storyTime() {
    busy = true; phase = 'activity';
    const rug = furn.rug;
    const spots = [-30, -15, 0, 15, 30].map((dx, k) => ({ x: clamp(rug.x + dx, 14, V.W - 14), y: clamp(rug.y - 12 - [0, 3, 4, 3, 0][k], L.floorTop + 14, V.H - 2) }));
    for (const s of students) { s.sleep = false; s.hide = 0; s.snack = null; }
    sfx.ding(660);
    await Promise.all(students.map((s, k) => {
      if (s.mode === 'seated') { Object.assign(s, seat(s)); s.mode = 'stand'; }
      return walkTo(s, spots[k].x, spots[k].y, 50);
    }));
    for (const s of students) s.look = 0;
    story = { page: -1, t: G.time, flipT: G.time };
    sfx.page();
    busy = false;
  }
  function turnPage() {
    if (!story) return;
    if (G.time - story.flipT < 0.6) return;
    story.flipT = G.time;
    story.page++;
    sfx.page();
    if (story.page >= PAGES.length) { endStory(); return; }
    const reacts = [['gasp', 'ooh'], ['happy', 'yay'], ['giggle', 'giggle'], ['gasp', 'ooh'], ['clap', 'clap']][story.page];
    wait(0.4).then(() => {
      for (const s of students) act(s, reacts[0], 1.4);
      if (reacts[1] === 'clap') sfx.cheer(1.1); else if (reacts[1] === 'giggle') sfx.giggle(1.2, 6); else sfx[reacts[1]](1.2);
    });
  }
  async function endStory() {
    busy = true;
    story = null;
    for (const s of students) { act(s, 'clap', 1.4); }
    sfx.cheer(1);
    await wait(1.4);
    await gatherSeats();
    busy = false; phase = 'class';
  }
  async function recessTime() {
    busy = true; phase = 'activity';
    for (const s of students) { s.sleep = false; s.hide = 0; s.snack = null; }
    sfx.ding(988);
    recess = { until: G.time + 30, ball: { x: V.W / 2, y: L.floorTop + L.floorH * 0.6, z: 0, vx: 0, vy: 0, vz: 0 } };
    speak(students[1], 'Recess! Yay!', 'yay');
    for (const s of students) {
      if (s.mode === 'seated') { Object.assign(s, seat(s)); s.mode = 'stand'; }
      act(s, 'cheer', 1); hop(s, 60);
    }
    busy = false;
  }
  function kickBall(dirx = rand(-1, 1)) {
    const b = recess.ball;
    b.vz = 110; b.vx = dirx * 70 + rand(-20, 20); b.vy = rand(-40, 40);
    sfx.boing();
  }
  async function endRecess() {
    busy = true;
    recess = null;
    sfx.ding(784);
    await gatherSeats();
    busy = false; phase = 'class';
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    doorOpen += (doorTarget - doorOpen) * Math.min(1, dt * 10);
    dusk += (duskTarget - dusk) * Math.min(1, dt * 1.5);
    if (phase === 'class') hintT -= dt; if (hintT < 0) hintT = rand(10, 16);
    const calm = phase === 'class' && !drag;
    for (const s of students) {
      physics(s, dt);
      walkStep(s, dt);
      if (s.mode === 'seated' || (s.mode === 'stand' && s.kind === 'puppy')) {
        if (calm) traits(s, dt);
        if (s.kind === 'bunny' && s.sleep && Math.random() < dt * 0.9) floatUp('z', '#6f8fd6', ...headPos(s));
      }
      // wiggly puppy wanders
      if (s.kind === 'puppy' && calm && s.mode === 'seated' && s.here && !s.act) {
        s.wanderT -= dt;
        if (s.wanderT < 0) {
          s.wanderT = rand(22, 35);
          const tx = rand(24, V.W - 24), ty = rand(L.floorTop + 16, V.H - 6);
          Object.assign(s, seat(s)); s.mode = 'stand';
          hop(s, 50); sfx.woof();
          walkTo(s, tx, ty, 36).then(() => {
            if (phase !== 'class') return;
            act(s, 'happy', 1.5); talk(s, 'note', 1.5);
            wait(rand(8, 12)).then(() => { if (s.mode === 'stand' && phase === 'class' && !drag) sendToSeat(s); });
          });
        }
      }
    }
    // recess: ball physics + chasing
    if (recess) {
      const b = recess.ball;
      b.vz -= 300 * dt; b.z += b.vz * dt;
      if (b.z < 0) { b.z = 0; if (b.vz < -40) { b.vz = -b.vz * 0.55; sfx.tap(); } else b.vz = 0; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 1 - dt * 0.9; b.vy *= 1 - dt * 0.9;
      if (b.x < 10 || b.x > V.W - 10) { b.vx = -b.vx; b.x = clamp(b.x, 10, V.W - 10); }
      if (b.y < L.floorTop + 10 || b.y > V.H - 4) { b.vy = -b.vy; b.y = clamp(b.y, L.floorTop + 10, V.H - 4); }
      students.forEach((s, k) => {
        if (s.mode === 'stand' && Math.random() < dt * 0.8) {
          const a = k * 1.3 + G.time * 0.3;
          walkTo(s, clamp(b.x + Math.cos(a) * 22, 14, V.W - 14), clamp(b.y + Math.sin(a) * 10, L.floorTop + 14, V.H - 3), 55);
        }
        if (s.mode !== 'held' && Math.hypot(s.x - b.x, s.y - b.y) < 9 && b.z < 6 && Math.random() < dt * 4) { kickBall(Math.sign(b.x - s.x) || 1); act(s, 'cheer', 0.8); hop(s, 60); }
      });
      if (G.time > recess.until && !busy) endRecess();
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t > p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.wob) p.x += Math.sin(p.t * 5) * 0.3;
    }
  }

  // ---------------------------------------------------------------- render
  function drawStudent(c, s, x, y) {
    const { st, dx } = pose(s);
    const img = S.student(s.kind, st);
    const yy = y - s.z;
    if (s.glowT > 0 && (s.glowT > 0.6 || Math.floor(G.time * 10) % 2)) {
      D(c, glow(img, Math.floor(G.time * 6) % 2 ? '#ffe36e' : '#fff6b8', s.kind + JSON.stringify(st)), x + dx - 2, yy - 2);
    }
    D(c, img, x + dx, yy);
    if (s.mode === 'held') return;
  }
  function drawDeskUnit(c, d) {
    D(c, S.chair(d.i), d.x - 12, d.y - 34 - d.lift);
    const s = students.find(t => t.desk === d.i && t.mode === 'seated');
    if (s) drawStudent(c, s, d.x - S.SW / 2, d.y - 15 - S.SH - d.lift);
    D(c, S.desk(d.i), d.x - S.DESK_W / 2, d.y - S.DESK_H - d.lift);
    if (s && s.snack) D(c, S.snack(s.kind, s.snack.bites), d.x - 6, d.y - 26 - d.lift);
    if (s && s.stars) {
      const n = Math.min(3, s.stars);
      for (let k = 0; k < n; k++) D(c, S.particle('star', '#ffd23f'), d.x - n * 4 + k * 8, d.y - 10 - d.lift);
    }
  }
  function shadow(c, x, y, w) {
    c.fillStyle = 'rgba(80,40,30,0.18)';
    c.fillRect(Math.round(x - w / 2), Math.round(y - 1), Math.round(w), 2);
    c.fillRect(Math.round(x - w / 2 + 2), Math.round(y - 2), Math.round(w - 4), 4);
  }

  function render() {
    const c = V.ctx, { W, H } = V;
    c.drawImage(bg, 0, 0);
    drawWindow(c); drawClock(c); drawDoor(c); drawBoard(c);
    // rug
    const rug = furn.rug;
    if (rug.lift) shadow(c, rug.x, rug.y, 80);
    D(c, S.rug(), rug.x - 42, rug.y - 32 - rug.lift);
    // y-sorted objects
    const objs = [];
    for (const f of Object.values(furn)) if (f.type !== 'rug' && !(drag && drag.f === f)) objs.push({ y: f.y, f });
    for (const s of students) if (s.mode !== 'seated' && s.mode !== 'away' && s.mode !== 'held') objs.push({ y: s.y, s });
    if (recess) objs.push({ y: recess.ball.y, ball: recess.ball });
    objs.sort((a, b) => a.y - b.y);
    for (const o of objs) {
      if (o.f) {
        const f = o.f;
        if (f.type === 'desk') drawDeskUnit(c, f);
        else if (f.type === 'plant') D(c, S.plant(), f.x - 14, f.y - 38);
        else if (f.type === 'shelf') D(c, S.bookshelf(), f.x - 19, f.y - 46);
      } else if (o.s) {
        shadow(c, o.s.x, o.s.y, 16);
        drawStudent(c, o.s, o.s.x - S.SW / 2, o.s.y - S.SH);
      } else if (o.ball) {
        const b = o.ball;
        shadow(c, b.x, b.y, 8);
        D(c, cached('rball', () => { const p = new Pix(10, 10); p.ball(5, 5, 4.6, 4.6, '#ef6f6c'); p.ell(5, 5, 4.6, 4.6, '#ffd23f', { y0: 4, y1: 5 }, true); p.outline(); return p.canvas(); }), b.x - 5, b.y - 10 - b.z);
      }
    }
    // things being dragged float on top
    if (drag && drag.f) {
      const f = drag.f, [w, h] = FURN_SIZE[f.type];
      shadow(c, f.x, f.y, w * 0.8);
      if (f.type === 'desk') drawDeskUnit(c, f);
      else if (f.type === 'plant') D(c, S.plant(), f.x - 14, f.y - 38 - f.lift);
      else if (f.type === 'shelf') D(c, S.bookshelf(), f.x - 19, f.y - 46 - f.lift);
      else if (f.type === 'rug') { /* drawn above */ }
      void h;
    }
    // particles + bubbles
    for (const p of parts) {
      if (p.life - p.t < 0.25 && Math.floor(p.t * 20) % 2) continue;
      const img = S.particle(p.kind, p.color);
      D(c, img, p.x - img.width / 2, p.y - img.height / 2);
    }
    for (const s of students) {
      if (!s.bubble || s.mode === 'away') continue;
      const r = spriteRect(s);
      D(c, S.bubble(s.bubble.kind), r.x + 20, r.y - 4 - s.z + Math.round(Math.sin(G.time * 4)));
    }
    // dusk tint
    if (dusk > 0.01) { c.fillStyle = `rgba(40,30,90,${dusk * 0.55})`; c.fillRect(0, 0, W, H); }
    // held student
    const held = students.find(s => s.mode === 'held');
    if (held) {
      shadow(c, held.x, held.y + 10, 16);
      drawStudent(c, held, held.x - S.SW / 2, held.y - S.SH);
      const tgt = deskAt(held.x, held.y + 8);
      if (tgt) { c.fillStyle = 'rgba(255,230,110,0.5)'; c.fillRect(tgt.x - 17, tgt.y - 4, 34, 3); }
    }
    drawHud(c);
    if (drag && drag.kind === 'star') {
      const st = S.ICONS.star();
      const hov = hitStudent(drag.x, drag.y);
      if (hov) D(c, glow(st, '#fff6b8', 'starhud'), drag.x - 11, drag.y - 11);
      D(c, st, drag.x - 9, drag.y - 9);
    }
    drawOverlays(c);
  }

  function drawButton(c, b, pressed) {
    D(c, btnFrame(b.w, b.h), b.x, b.y + (pressed ? 1 : 0));
    D(c, b.icon(), b.x + (b.w - 18) / 2, b.y + (b.h - 18) / 2 - 1 + (pressed ? 1 : 0));
  }
  function hudVisible() { return phase === 'class' || phase === 'activity'; }
  function drawHud(c) {
    if (!hudVisible()) return;
    for (const b of btns) {
      if (b.id === 'toys' && (story || recess)) continue;
      drawButton(c, b, press && press.btn === b);
    }
    if (recess) { // bell to end recess early
      const b = btns.find(x => x.id === 'toys');
      D(c, btnFrame(b.w, b.h, '#fff3dc'), b.x, b.y);
      D(c, cached('bellicon', bellIcon), b.x + 4, b.y + 3);
    }
    // attendance chart
    const ch = L.chart;
    D(c, btnFrame(5 * 14 + 4, 18, '#fffaf0', 'chart'), ch.x, ch.y);
    students.forEach((s, k) => {
      const img = miniFace(s.kind, s.here);
      const bob = s.here && acting(s, 'here') ? -1 : 0;
      D(c, img, ch.x + 2 + k * 14, ch.y + 2 + bob);
      if (s.here) D(c, cached('tick', () => { const p = new Pix(6, 5); p.line(0, 2, 2, 4, '#3cb44b'); p.line(2, 4, 5, 0, '#3cb44b'); p.line(1, 2, 2, 3, '#3cb44b'); return p.canvas(); }), ch.x + 9 + k * 14, ch.y + 10);
    });
  }
  function bellIcon() {
    const p = new Pix(18, 18);
    p.ball(9, 9, 6, 6.5, '#ffd23f', { clip: { y1: 12 } }); p.rect(2, 12, 14, 2, '#e0a820'); p.ball(9, 15, 1.6, 1.6, '#a8703f'); p.rect(8, 1, 2, 2, '#a8703f');
    p.outline(); return p.canvas();
  }

  function drawOverlays(c) {
    const { W, H } = V;
    if (phase === 'title' || phase === 'night') {
      c.fillStyle = phase === 'title' ? 'rgba(255,240,220,0.35)' : 'rgba(20,16,50,0.35)'; c.fillRect(0, 0, W, H);
      const k = 3;
      const ic = phase === 'title' ? S.ICONS.play() : S.ICONS.sun();
      const big = scaled(ic, k);
      const pulse = Math.round(Math.sin(G.time * 4) * 2);
      const bx = Math.round(W / 2 - big.width / 2), by = Math.round(H * 0.58 - big.height / 2) + pulse;
      D(c, btnFrame(big.width + 12, big.height + 12, '#fff3dc', 'big'), bx - 6, by - 6);
      D(c, big, bx, by);
      L.bigBtn = { x: bx - 6, y: by - 6, w: big.width + 12, h: big.height + 12 };
      if (phase === 'title') {
        // a row of the five friends peeking up to say hello
        students.forEach((s, i) => {
          const img = S.student(s.kind, { eyes: Math.floor(G.time * 1.3 + i) % 5 === 0 ? 'blink' : 'happy', mouth: 'smile', armL: i % 2 ? 'wave1' : 'down', armR: 'down', feet: 0, look: 0, blush: true, hide: 0, wag: false, earUp: false, tongue: s.kind === 'puppy' });
          D(c, img, W / 2 + (i - 2) * 38 - 17, H * 0.58 - 92 + Math.round(Math.abs(Math.sin(G.time * 3 + i)) * -3));
        });
      } else {
        const n = G.save.stickers.length;
        const stk = n ? S.sticker(G.save.stickers[n - 1]) : null;
        if (stk) D(c, scaled(stk, 2), W / 2 - 32, H * 0.58 - 100);
      }
    }
    if (menu) {
      c.fillStyle = 'rgba(40,30,60,0.45)'; c.fillRect(0, 0, W, H);
      for (const m of menu.items) {
        D(c, btnFrame(m.w, m.h, '#fff3dc', 'menu'), m.x, m.y);
        D(c, scaled(m.icon(), 2), m.x + 6, m.y + 6);
      }
    }
    if (story) drawStory(c);
    if (reward) drawReward(c);
    if (bookOpen) drawStickerBook(c);
  }
  function drawStory(c) {
    const { W, H } = V;
    const bw = 124, bh = 64;
    const x = Math.round(W / 2 - bw / 2), y = Math.round(H - bh - 10 - V.inset.b);
    L.storyBook = { x, y, w: bw, h: bh };
    R(c, x - 2, y - 2, bw + 4, bh + 4, '#7a3f2a'); R(c, x, y, bw, bh, '#c95f4a');
    R(c, x + 4, y + 3, bw / 2 - 4, bh - 6, '#fffaf0'); R(c, x + bw / 2, y + 3, bw / 2 - 4, bh - 6, '#fff3e0');
    R(c, x + bw / 2 - 1, y + 2, 2, bh - 4, '#d8c7a8');
    if (story.page < 0) {
      // cover: a star
      R(c, x + 4, y + 3, bw - 8, bh - 6, '#ff9ec4');
      D(c, scaled(S.ICONS.book(), 2), x + bw / 2 - 18, y + bh / 2 - 18);
    } else {
      const pg = PAGES[Math.min(story.page, PAGES.length - 1)]();
      D(c, pg, x + 6, y + 10);
      // facing page: a few big "words" of coloured dots, like a picture book with no reading needed
      for (let k = 0; k <= story.page; k++) D(c, S.particle('star', ['#ffd23f', '#ff6f91', '#64a8e8', '#7dd370', '#b48be6'][k]), x + bw / 2 + 8 + k * 10, y + 28);
    }
    if (Math.floor(G.time * 2) % 2) D(c, S.ICONS.play(), x + bw - 14, y + bh - 14);
  }
  function drawReward(c) {
    const { W, H } = V;
    c.fillStyle = 'rgba(20,16,50,0.45)'; c.fillRect(0, 0, W, H);
    const k = G.time - reward.t;
    const big = scaled(S.sticker(reward.id), 3);
    let cx = W / 2, cy = H / 2;
    let scale = Math.min(1, k * 3);
    if (reward.collected) {
      const q = Math.min(1, (G.time - reward.ct) / 0.8);
      const b = btns[0];
      cx = cx + (b.x + 13 - cx) * q; cy = cy + (b.y + 13 - cy) * q; scale = 1 - q * 0.8;
    }
    const sw = big.width * scale, sh = big.height * scale;
    // sunburst
    if (!reward.collected) {
      c.save(); c.translate(Math.round(cx), Math.round(cy));
      for (let a = 0; a < 12; a++) {
        const ang = a * Math.PI / 6 + G.time * 0.4;
        c.fillStyle = a % 2 ? 'rgba(255,230,120,0.35)' : 'rgba(255,255,255,0.25)';
        c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ang) * 140, Math.sin(ang) * 140); c.lineTo(Math.cos(ang + 0.26) * 140, Math.sin(ang + 0.26) * 140); c.fill();
      }
      c.restore();
    }
    c.drawImage(big, Math.round(cx - sw / 2), Math.round(cy - sh / 2 + Math.sin(G.time * 3) * 2), Math.round(sw), Math.round(sh));
    L.rewardRect = { x: cx - 40, y: cy - 40, w: 80, h: 80 };
  }
  function drawStickerBook(c) {
    const { W, H } = V;
    c.fillStyle = 'rgba(40,30,60,0.5)'; c.fillRect(0, 0, W, H);
    const bw = Math.min(W - 40, 236), bh = Math.min(H - 30, 150);
    const x = Math.round(W / 2 - bw / 2), y = Math.round(H / 2 - bh / 2);
    R(c, x - 3, y - 3, bw + 6, bh + 6, '#4f97d6'); R(c, x, y, bw, bh, '#7ec8ff');
    R(c, x + 4, y + 4, bw / 2 - 5, bh - 8, '#fffaf0'); R(c, x + bw / 2 + 1, y + 4, bw / 2 - 5, bh - 8, '#fffaf0');
    R(c, x + bw / 2 - 1, y + 3, 2, bh - 6, '#bcd8ee');
    const cols = 3, rows = 3, cell = Math.min(Math.floor((bw / 2 - 10) / cols), Math.floor((bh - 14) / rows));
    const all = G.save.stickers;
    const pageSize = cols * rows * 2;
    const pg = bookOpen.page;
    for (let side = 0; side < 2; side++) {
      const ox = x + 6 + side * (bw / 2 + 1) + Math.floor((bw / 2 - 10 - cols * cell) / 2), oy = y + 7 + Math.floor((bh - 14 - rows * cell) / 2);
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const idx = pg * pageSize + side * cols * rows + r * cols + q;
        const cx = ox + q * cell, cy = oy + r * cell;
        R(c, cx + 2, cy + 2, cell - 4, cell - 4, '#f1e9dc');
        if (idx < all.length) {
          const img = S.sticker(all[idx]);
          const isNew = idx === all.length - 1 && G.time - bookOpen.t < 2;
          const bob = isNew ? Math.round(Math.sin(G.time * 8)) : 0;
          D(c, img, cx + cell / 2 - 16, cy + cell / 2 - 16 + bob);
        }
      }
    }
    // page arrows when needed + close button
    const pages = Math.max(1, Math.ceil(all.length / pageSize));
    L.bookClose = { x: x + bw - 14, y: y - 12, w: 26, h: 26 };
    D(c, btnFrame(26, 26), L.bookClose.x, L.bookClose.y); D(c, S.ICONS.check(), L.bookClose.x + 4, L.bookClose.y + 3);
    L.bookNext = pages > 1 ? { x: x + bw - 12, y: y + bh - 14, w: 26, h: 26 } : null;
    if (L.bookNext) { D(c, btnFrame(26, 26), L.bookNext.x, L.bookNext.y); D(c, S.ICONS.play(), L.bookNext.x + 4, L.bookNext.y + 3); }
  }

  // ---------------------------------------------------------------- input
  function deskAt(x, y) {
    let best = null, bd = 26;
    for (const d of desks) { const dd = Math.hypot(d.x - x, (d.y - 20) - y); if (dd < bd) { bd = dd; best = d; } }
    return best;
  }
  function down(x, y) {
    press = { x0: x, y0: y, x, y, moved: false, t: G.time };
    if (phase === 'title' || phase === 'night') { if (L.bigBtn && inRect(x, y, L.bigBtn)) press.big = true; return; }
    if (reward) { press.reward = true; return; }
    if (bookOpen) { press.book = true; return; }
    if (menu) { press.menu = true; return; }
    if (story) { press.story = true; return; }
    for (const b of btns) if (inRect(x, y, b) && hudVisible()) {
      press.btn = b;
      if (b.id === 'star' && !busy) { drag = { kind: 'star', x, y }; sfx.lift(); }
      return;
    }
    if (inRect(x, y, L.chart)) { press.chart = true; return; }
    if (phase !== 'class' && phase !== 'activity') return;
    const s = hitStudent(x, y);
    if (s) { press.s = s; return; }
    if (busy) return;
    const f = hitFurn(x, y);
    if (f) { press.f = f; return; }
    if (inRect(x, y, L.board)) { press.board = true; }
    else if (inRect(x, y, L.door)) { press.door = true; }
  }
  function move(x, y) {
    if (!press) return;
    press.x = x; press.y = y;
    if (!press.moved && Math.hypot(x - press.x0, y - press.y0) > 6) {
      press.moved = true;
      if (press.f && !busy && !story) {
        drag = { kind: 'furn', f: press.f, ox: press.f.x - press.x0, oy: press.f.y - press.y0 };
        press.f.lift = 3; sfx.lift();
      } else if (press.s && !busy && !story && !recess && (press.s.mode === 'seated' || press.s.mode === 'stand')) {
        const s = press.s;
        if (coax(s)) { /* waking up first */ }
        s.prevMode = s.mode; s.mode = 'held'; s.sleep = false; s.hide = 0; s.act = null;
        drag = { kind: 'student', s };
        sfx.boing(); talk(s, 'heart', 0.8);
      }
    }
    if (!drag) return;
    if (drag.kind === 'star') { drag.x = x; drag.y = y; }
    if (drag.kind === 'furn') {
      const f = drag.f, [w, h] = FURN_SIZE[f.type];
      f.x = clamp(x + drag.ox, w / 2 + 2, V.W - w / 2 - 2);
      f.y = clamp(y + drag.oy, L.floorTop + (f.type === 'rug' ? 22 : f.type === 'shelf' ? 8 : 12), V.H - 2);
      void h;
    }
    if (drag.kind === 'student') { drag.s.x = x; drag.s.y = y + 16; }
  }
  function up() {
    const p = press; press = null;
    if (!p) return;
    if (drag) {
      const d = drag; drag = null;
      if (d.kind === 'star') {
        const s = hitStudent(d.x, d.y);
        if (s && !p.moved) { /* tapped the jar without dragging */ }
        if (s) awardStar(s);
        else if (!p.moved || inRect(d.x, d.y, p.btn)) { // quick tap on the jar: show the star wiggling as a hint
          sfx.tap(); burst('spark', p.btn.x + 13, p.btn.y + 13, 6, ['#ffd23f']);
        } else sfx.softPop();
        return;
      }
      if (d.kind === 'furn') {
        const f = d.f; f.lift = 0;
        f.fx = f.x / V.W; f.fy = (f.y - L.floorTop) / L.floorH;
        G.save.furniture[f.id] = [+f.fx.toFixed(4), +f.fy.toFixed(4)];
        persist(); sfx.thump();
        burst('crumb', f.x, f.y, 6, ['#d9c3a0', '#c9b08a'], { up: true, sp: 25, g: 100, life: 0.5 });
        return;
      }
      if (d.kind === 'student') {
        const s = d.s;
        const tgt = deskAt(s.x, s.y - 8);
        s.mode = 'stand';
        sfx.boing();
        if (tgt && tgt.i !== s.desk) {
          const other = students.find(t => t.desk === tgt.i);
          const old = s.desk;
          s.desk = tgt.i;
          if (other) { other.desk = old; if (other.mode === 'seated') { Object.assign(other, seat(other)); other.y -= 0; other.mode = 'stand'; hop(other, 60); talk(other, 'heart', 1); sendToSeat(other); } }
          G.save.seats = Object.fromEntries(students.map(t => [t.kind, t.desk])); persist();
          act(s, 'happy', 0.8);
        }
        sendToSeat(s);
        return;
      }
    }
    if (p.moved) return;
    const { x, y } = p;
    if (p.big && inRect(x, y, L.bigBtn)) { sfx.pop(); hooks.unlock?.(); startDay(); return; }
    if (p.reward) { if (!reward.collected && G.time - reward.t > 0.6) collectReward(); return; }
    if (p.book) {
      if (inRect(x, y, L.bookClose)) { sfx.pop(); bookOpen = null; }
      else if (L.bookNext && inRect(x, y, L.bookNext)) { sfx.page(); bookOpen.page = (bookOpen.page + 1) % Math.max(1, Math.ceil(G.save.stickers.length / 18)); }
      return;
    }
    if (p.menu) {
      const m = menu.items.find(m => inRect(x, y, m));
      menu = null; sfx.pop();
      if (m) m.go();
      return;
    }
    if (p.story) { turnPage(); return; }
    if (p.btn) {
      sfx.pop();
      const id = p.btn.id;
      if (id === 'stickers') bookOpen = { page: 0, t: G.time };
      if (id === 'home' && !busy) {
        if (story) story = null;
        if (recess) recess = null;
        goodbye();
      }
      if (id === 'toys' && !busy) {
        if (recess) { endRecess(); return; }
        const sz = 48, gap = 12, tot = sz * 3 + gap * 2;
        const x0 = Math.round(V.W / 2 - tot / 2), y0 = Math.round(V.H / 2 - sz / 2);
        menu = { items: [
          { icon: S.ICONS.ball, go: recessTime },
          { icon: S.ICONS.apple, go: snackTime },
          { icon: S.ICONS.book, go: storyTime },
        ].map((m, k) => ({ ...m, x: x0 + k * (sz + gap), y: y0, w: sz, h: sz })) };
      }
      return;
    }
    if (p.chart) { // tapping the chart: everyone who's here waves
      for (const s of students) if (s.here && s.mode !== 'away' && !s.sleep && !(s.hide > 0)) { act(s, 'raise', 1); }
      sfx.tap();
      return;
    }
    if (p.s) { tapStudent(p.s); return; }
    if (recess) {
      const b = recess.ball;
      if (Math.hypot(x - b.x, y - (b.y - 5 - b.z)) < 16) { kickBall(); return; }
    }
    if (p.f) { // tap on furniture: a little wobble/sound
      p.f.lift = 2; setTimeout(() => { p.f.lift = 0; }, 120); sfx.tap();
      if (p.f.type === 'shelf') sfx.page();
      return;
    }
    if (p.board && (phase === 'class') && !busy) {
      sfx.whoosh();
      const now = G.time;
      if (now - lastTap > 0.3) { lastTap = now; hooks.openBoard(L.board, V.s); }
      return;
    }
    if (p.door) { sfx.door(); }
  }

  function watchBoard() { // after a lesson: students react to the new drawing
    for (const s of students) if (s.mode === 'seated' && !s.sleep && !(s.hide > 0)) { act(s, Math.random() < 0.5 ? 'clap' : 'happy', 1.4); }
    sfx.clap(6, 1); sfx.ooh(1.2);
  }

  // hooks for automated screenshot tests
  const css = (x, y) => [x * V.s / G.dpr, y * V.s / G.dpr];
  window.__ltDeskPts = () => students.map(s => { const r = spriteRect(s); return css(r.x + 17, r.y + 20); });
  window.__ltBtn = (id) => { const b = btns.find(q => q.id === id); return css(b.x + 13, b.y + 13); };
  window.__ltFurn = (id) => { const f = furn[id]; return css(f.x, f.y - 8); };
  window.__ltBoardPt = () => css(L.board.x + 52, L.board.y + 30);
  window.__ltMenu = () => (menu ? menu.items.map(m => css(m.x + 24, m.y + 24)) : []);

  return {
    resize, update, render, down, move, up, startDay, watchBoard, startle: () => students.forEach(startle),
    get view() { return V; }, get phase() { return phase; },
  };
}
