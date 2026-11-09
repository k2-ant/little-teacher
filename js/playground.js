// v2.0 outdoor playground ("el patio"): recess happens outside now.
// classroom.js recessTime() walks the class out of the door and calls hooks.openYard(kids), which
// resolves when the whistle has called everyone back in. The yard follows today's weather.
import { G, makeView, wait, rand, pick, clamp } from './state.js';
import { Pix, cached, glow, darken, lighten, mix } from './raster.js';
import * as S from './sprites.js';
import { sfx } from './audio.js';
import { act, speak, animalSound, pose, tapEscalate } from './students.js';
import * as LD from './learndata.js';
import { drawHand, sayUI } from './hints.js';
import { weatherPic, scarf } from './rituals.js';
import { FONT, numberWord } from './i18n.js';

Object.assign(LD.HINTS, LD.YARD_HINTS);

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const D = (c, img, x, y) => c.drawImage(img, Math.round(x), Math.round(y));
const inR = (x, y, r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const WEATHERS = ['sol', 'nubes', 'lluvia', 'nieve'];
const SKY = { sol: ['#8fd0ff', '#d6f0ff'], nubes: ['#aebfcf', '#d8e2ec'], lluvia: ['#7f90a6', '#a9b8c8'], nieve: ['#c3d1df', '#e6eef6'] };
const GRASS = { sol: ['#8fd46e', '#84cb63', '#6fb455'], nubes: ['#86c96a', '#7cbf60', '#66a852'], lluvia: ['#74b25e', '#6aa855', '#55904a'], nieve: ['#f4f8fc', '#e8eff8', '#cfdcea'] };
const NOTES = [523, 587, 659, 698, 784, 880, 988, 1047];
const UMB = { bunny: '#ff8fb8', puppy: '#ef4b4b', turtle: '#ffd23f', owl: '#b48be6', frog: '#64a8e8' };
const UMB_MORE = ['#ff9a2e', '#3cb44b', '#2f7de1', '#ff5fa8', '#9b59d0'];
// what each friend likes to do at recess (new animals get a bit of everything)
const LIKES = {
  puppy: ['ball', 'ball', 'chase', 'slide', 'seesaw'], bunny: ['swing', 'hop', 'swing', 'chase', 'slide'],
  turtle: ['sand', 'sand', 'swing', 'hop'], owl: ['hop', 'slide', 'seesaw', 'swing'], frog: ['seesaw', 'slide', 'ball', 'chase'],
  // v2.0: the cat climbs and chases, the bear digs and seesaws, the tiny mouse slides and hops
  cat: ['slide', 'chase', 'swing', 'ball'], bear: ['sand', 'seesaw', 'sand', 'swing'], mouse: ['slide', 'hop', 'slide', 'sand'],
};
const ALL = ['ball', 'slide', 'swing', 'sand', 'seesaw', 'hop', 'chase'];

// ------------------------------------------------------------------ sprites
function btnFrame(w, h, col = '#fff3dc', key = '') {
  return cached('ybtn' + w + 'x' + h + col + key, () => {
    const p = new Pix(w, h);
    p.rect(1, 0, w - 2, h - 1, darken(col, 0.5)); p.rect(0, 1, w, h - 3, darken(col, 0.5));
    p.rect(1, 1, w - 2, h - 3, col); p.hline(2, w - 3, 1, lighten(col, 0.6));
    p.rect(1, h - 2, w - 2, 1, darken(col, 0.35));
    return p.canvas();
  });
}
function whistleIcon() {
  return cached('ywhistle', () => {
    const p = new Pix(22, 18);
    p.ball(9, 11, 6.5, 5.5, '#ffd23f', { shadow: '#e0a800', hi: '#fff3a8' });
    p.rect(13, 6, 8, 5, '#ffd23f'); p.hline(13, 20, 6, '#fff3a8'); p.hline(13, 20, 10, '#e0a800');
    p.rect(6, 7, 4, 2, '#2b1d2e'); // the hole on top
    p.ell(4, 13, 2.2, 2.2, '#ef4b4b'); p.px(4, 13, '#ffffff'); // ring for the lanyard
    for (const [x, y] of [[2, 3], [4, 1], [7, 0]]) p.px(x, y, '#64a8e8');
    p.outline();
    return p.canvas();
  });
}
function slideImg() {
  return cached('yslide', () => {
    const p = new Pix(62, 50);
    const chuteY = (x) => x < 54 ? 11 + (x - 18) * (31 / 36) : 42;
    // ladder
    for (const x of [3, 11]) { p.rect(x, 6, 2, 44, '#4f97d6'); p.vline(x, 6, 49, '#7ec0f0'); }
    for (let y = 14; y < 48; y += 6) p.hline(5, 10, y, '#9aa7b8');
    // platform + hand rails
    p.rect(3, 9, 18, 3, '#ef6f6c'); p.hline(3, 20, 9, '#ff9a9a');
    for (const x of [3, 19]) p.vline(x, 1, 8, '#4f97d6');
    p.hline(3, 19, 1, '#4f97d6');
    // chute with a red rim
    for (let x = 18; x < 62; x++) {
      const y = Math.round(chuteY(x));
      p.vline(x, y - 1, y + 3, '#ffd23f'); p.px(x, y - 1, '#fff3a8'); p.px(x, y + 3, '#e0a800'); p.px(x, y + 4, '#ef6f6c'); p.px(x, y - 2, '#ef6f6c');
    }
    // legs
    p.rect(36, Math.round(chuteY(36)) + 5, 2, 50 - Math.round(chuteY(36)) - 5, '#4f97d6');
    p.rect(58, 47, 2, 3, '#4f97d6');
    p.outline();
    return p.canvas();
  });
}
const SLIDE_TOPZ = 38;
const slideZ = (lx) => 49 - (lx < 54 ? 11 + (lx - 18) * (31 / 36) : 42) - 1; // height of the chute at sprite x
function swingFrame() {
  return cached('yswingf', () => {
    const p = new Pix(90, 56);
    for (const [top, a, b] of [[8, 2, 15], [81, 75, 88]]) { p.line(a, 55, top, 3, '#4f97d6'); p.line(a + 1, 55, top + 1, 3, '#4f97d6'); p.line(b, 55, top, 3, '#3f7fbf'); p.line(b - 1, 55, top - 1, 3, '#3f7fbf'); }
    p.rect(4, 1, 82, 3, '#ef6f6c'); p.hline(4, 85, 1, '#ff9a9a');
    for (const x of [8, 81]) { p.ell(x + 0.5, 2.5, 2.5, 2.5, '#ffd23f'); }
    p.outline();
    return p.canvas();
  });
}
const SWING_PIV = [27, 63], CHAIN = 40;
function seatImg() { return cached('yseat', () => { const p = new Pix(18, 4); p.rect(0, 0, 18, 3, '#c98a55'); p.hline(0, 17, 0, '#e3ab72'); p.outline(); return p.canvas(); }); }
function sandImg(snow) {
  return cached('ysand' + snow, () => {
    const p = new Pix(70, 26);
    const wood = '#c98a55', wd = '#a8703f', sand = snow ? '#f4f8fc' : '#f3d58c', sd = snow ? '#dce6f2' : '#e3bf6a';
    p.rect(2, 3, 66, 21, sand);
    for (let i = 0; i < 40; i++) p.px(4 + (i * 37) % 62, 5 + (i * 13) % 17, i % 2 ? sd : lighten(sand, 0.4));
    p.rect(0, 0, 70, 4, wood); p.hline(0, 69, 0, '#e3ab72'); p.hline(0, 69, 3, wd);
    p.rect(0, 0, 3, 26, wood); p.rect(67, 0, 3, 26, wood);
    // bucket + spade
    p.rect(55, 8, 7, 7, '#64a8e8'); p.hline(55, 61, 8, '#9fd0ff'); p.line(55, 7, 58, 4, '#3f7fbf'); p.line(58, 4, 61, 7, '#3f7fbf');
    p.rect(9, 9, 2, 6, '#a8703f'); p.ell(10, 16, 2.4, 2, '#ef6f6c');
    p.outline();
    return p.canvas();
  });
}
function sandFront() {
  return cached('ysandf', () => { const p = new Pix(70, 7); p.rect(0, 0, 70, 6, '#c98a55'); p.hline(0, 69, 0, '#e3ab72'); p.hline(0, 69, 5, '#a8703f'); for (const x of [12, 34, 56]) p.px(x, 3, '#a8703f'); p.outline(); return p.canvas(); });
}
function castleImg(n) {
  return cached('ycastle' + n, () => {
    const p = new Pix(12, 12);
    const c = '#e9c46a', d = '#c9a24a';
    p.rect(1, 5, 10, 6, c); p.rect(1, 3, 2, 2, c); p.rect(5, 3, 2, 2, c); p.rect(9, 3, 2, 2, c);
    p.rect(5, 8, 2, 3, d); p.hline(1, 10, 10, d);
    p.vline(6, 0, 3, '#7a5b4a'); p.rect(7, 0, 3, 2, ['#ef4b4b', '#64a8e8', '#ff8fb8'][n % 3]);
    p.outline();
    return p.canvas();
  });
}
function seesawImg(q) { // q: quantised tilt, -4..4 (positive = left end up)
  return cached('ysee' + q, () => {
    const p = new Pix(84, 36);
    const a = q * 0.05, cx = 42, cy = 25, half = 38;
    for (let t = -half; t <= half; t += 0.5) {
      const x = cx + t * Math.cos(a), y = cy + t * Math.sin(a);
      p.px(x, y - 1, '#ff9a9a'); p.px(x, y, '#ef6f6c'); p.px(x, y + 1, '#c94f4f');
    }
    for (const t of [-30, 30]) { const x = cx + t * Math.cos(a), y = cy + t * Math.sin(a); p.rect(x, y - 6, 1, 5, '#4f97d6'); p.rect(x - 1, y - 7, 3, 1, '#4f97d6'); }
    for (let y = 0; y < 9; y++) p.hline(cx - 1 - y * 0.8, cx + 1 + y * 0.8, cy + 2 + y, y < 2 ? '#7ec0f0' : '#4f97d6');
    p.outline();
    return p.canvas();
  });
}
const seeEndY = (a, side) => 25 + (side ? 1 : -1) * 38 * Math.sin(a) * (30 / 38); // y of a seat in the seesaw sprite
function treeImg(wt) {
  return cached('ytree' + wt, () => {
    const p = new Pix(70, 84);
    const tr = '#9a6a42';
    p.rect(30, 46, 10, 38, tr); p.vline(31, 46, 83, '#b98458'); p.vline(39, 46, 83, '#7a5232');
    p.line(34, 56, 22, 42, tr); p.line(35, 56, 23, 42, tr); p.line(37, 52, 48, 40, tr);
    p.rect(26, 81, 18, 3, tr);
    const leaf = wt === 'nieve' ? '#5f9a6a' : wt === 'lluvia' ? '#4f9e48' : '#5fbf4f';
    for (const [x, y, rx, ry] of [[20, 34, 16, 13], [50, 34, 16, 13], [35, 22, 20, 17], [24, 18, 13, 11], [47, 17, 13, 11], [35, 40, 18, 9]]) p.ball(x, y, rx, ry, leaf, { hi: lighten(leaf, 0.3) });
    if (wt === 'nieve') for (const [x, y, rx] of [[35, 6, 14], [23, 9, 9], [48, 8, 9], [12, 25, 6], [58, 25, 6]]) p.ell(x, y, rx, 3.2, '#ffffff');
    p.outline();
    return p.canvas();
  });
}
const APPLE_AT = [[-16, -52], [10, -64], [17, -44], [-4, -40]];
function appleImg() { return cached('yapple', () => { const p = new Pix(7, 8); p.ball(3.5, 4.5, 3.2, 3.2, '#ef4b4b'); p.vline(3, 0, 1, '#7a5232'); p.px(4, 1, '#62b95e'); p.px(5, 0, '#62b95e'); p.outline(); return p.canvas(); }); }
function ballImg() { return cached('yball', () => { const p = new Pix(12, 12); p.ball(6, 6, 5.4, 5.4, '#ef6f6c'); p.ell(6, 6, 5.4, 5.4, '#ffd23f', { y0: 5, y1: 6 }, true); p.ell(6, 6, 5.4, 5.4, '#ffffff', { x0: 5, x1: 6, y0: 0, y1: 4 }, true); p.outline(); return p.canvas(); }); }
function umbrellaImg(col) {
  return cached('yumb' + col, () => {
    const p = new Pix(28, 18);
    p.ell(14, 10, 13.5, 9.5, darken(col, 0.15), { y1: 9 });
    p.ell(14, 10, 12.5, 8.5, col, { y1: 9 });
    for (const x of [7, 14, 21]) p.line(14, 1, x, 9, lighten(col, 0.35));
    for (let x = 2; x < 27; x += 4) { p.px(x, 10, darken(col, 0.15)); p.px(x + 1, 10, darken(col, 0.15)); }
    p.px(14, 0, '#7a5b4a');
    p.vline(14, 10, 16, '#7a5b4a'); p.px(13, 17, '#7a5b4a'); p.px(12, 16, '#7a5b4a');
    p.outline();
    return p.canvas();
  });
}
function snowmanImg(stage) {
  return cached('ysnowman' + stage, () => {
    const p = new Pix(30, 44);
    const w = '#ffffff', sh = '#cfdeee', I = S.INK;
    if (stage === 0) { p.ball(15, 38, 13, 6, w, { shadow: sh, hi: false }); p.ball(10, 35, 6, 4, w, { shadow: sh, hi: false }); }
    if (stage >= 1) p.ball(15, 35, 10, 8.5, w, { shadow: sh, hi: false });
    if (stage >= 2) p.ball(15, 22, 7.5, 6.5, w, { shadow: sh, hi: false });
    if (stage >= 3) { p.ball(15, 11, 6, 5.5, w, { shadow: sh, hi: false }); p.px(13, 10, I); p.px(17, 10, I); p.hline(15, 18, 12, '#ff9a2e'); p.px(14, 14, I); p.px(16, 14, I); p.px(15, 22, I); p.px(15, 26, I); }
    if (stage >= 4) {
      p.rect(9, 5, 12, 2, I); p.rect(11, 0, 8, 6, I); p.hline(11, 18, 4, '#ef4b4b');
      p.rect(9, 16, 13, 2, '#ef4b4b'); p.rect(18, 17, 3, 6, '#ef4b4b');
      p.line(8, 21, 1, 15, '#7a5232'); p.line(22, 21, 29, 15, '#7a5232'); p.px(1, 14, '#7a5232'); p.px(29, 14, '#7a5232');
    }
    p.outline();
    return p.canvas();
  });
}
function cloudImg(k, dark) {
  return cached('ycloud' + k + dark, () => {
    const p = new Pix(36, 16);
    const w = dark ? '#8a98ab' : '#ffffff', sh = dark ? '#76849a' : '#dce8f4';
    p.ball(10, 10, 7, 5, w, { shadow: sh, hi: false }); p.ball(19, 7, 9, 7, w, { shadow: sh, hi: false }); p.ball(28, 10, 6.5, 5, w, { shadow: sh, hi: false });
    p.rect(4, 10, 29, 5, w); p.hline(4, 32, 15, sh);
    return p.canvas();
  });
}

// ------------------------------------------------------------------ the scene
export function createPlayground(students, hooks) {
  let V = null, bg0 = null, bg1 = null, bgKey = '';
  const L = {}, E = {};
  const kids = [], parts = [];
  let isOpen = false, resolve = null, leaving = null, openT = 0, doorOpen = 0, doorUntil = 0;
  let press = null, held = null, hint = null, lastInput = 0, nextHintAt = 0, hintIdx = 0, lastTalk = 0, idleNag = 0;
  let wt = 'sol';
  // equipment state
  const slide = { q: [], cur: null };
  const swings = [0, 1].map(() => ({ kid: null, a: 0, amp: 0, ph: 0, pushT: 0 }));
  const sandSlots = [null, null, null];
  let castles = [];
  const see = { seats: [null, null], a: 0.15, ph: 0, lastSign: 1 };
  const hop = { cur: null, flash: Array(8).fill(-9) };
  const ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, held: false };
  let apples = [], fallen = [], treeShake = -9, snowStage = 0, snowBusy = 0;
  const owl = () => students.find(s => s.kind === 'owl') || students[0];

  function weatherNow() {
    const w = G.save.weather;
    return w && w.day === (G.save.day || 1) && WEATHERS.includes(w.w) ? w.w : 'sol';
  }
  const playBall = () => wt === 'sol' || wt === 'nubes';

  // ---------------------------------------------------------------- layout
  function resize() {
    V = makeView(200, 300);
    const { W, H, inset } = V;
    L.gy = Math.round(H * 0.44); const gy = L.gy, ph = H - gy;
    L.door = { x: Math.max(10, inset.l + 6), y: gy - 44, w: 26, h: 44 };
    L.doorPt = { x: L.door.x + 13, y: gy + 3 };
    L.win = { x: L.door.x + L.door.w + 12, y: gy - 50, w: 42, h: 30 };
    L.wallX1 = Math.max(Math.round(W * 0.3), L.win.x + L.win.w + 12);
    L.wallY0 = gy - 66;
    E.slide = { x: L.wallX1 + 4, y: Math.round(gy + ph * 0.40) };
    E.swing = { x: Math.max(E.slide.x + 62 + 58, Math.round(W * 0.68)), y: Math.round(gy + ph * 0.36) };
    E.tree = { x: W - Math.max(38, inset.r + 34), y: gy + 12 };
    E.sand = { x: Math.max(Math.round(W * 0.2), inset.l + 74), y: Math.round(gy + ph * 0.86) };
    E.see = { x: Math.min(Math.round(W * 0.82), W - inset.r - 46), y: Math.round(gy + ph * 0.86) };
    const hopW = 84;
    E.hop = { x: Math.round((E.sand.x + 35 + E.see.x - 42) / 2 - hopW / 2), cy: Math.round(gy + ph * 0.80), cw: 14, ch: 11 };
    E.mid = { x: Math.round(W * 0.5), y: Math.round(gy + ph * 0.57) };
    E.puddles = [{ x: E.mid.x - 4, y: E.mid.y, rx: 17, ry: 5 }, { x: Math.round(W * 0.2), y: Math.round(gy + ph * 0.48), rx: 14, ry: 4 }, { x: Math.round(W * 0.86), y: Math.round(gy + ph * 0.62), rx: 14, ry: 4 }];
    E.snow = { x: Math.round(Math.max(E.sand.x - 6, W * 0.16)), y: Math.round(gy + ph * 0.52) };
    const B = 26;
    L.whistle = { x: inset.l + 4, y: H - inset.b - 34, w: 34, h: 30 };
    L.help = { x: W - inset.r - B - 4, y: inset.t + 4, w: B, h: B };
    bgKey = '';
    for (const k of kids) { if (k.st !== 'gone') { k.x = clamp(k.x, 12, W - 12); k.y = clamp(k.y, gy + 8, H - 4); } }
    ball.x = clamp(ball.x || E.mid.x, 10, W - 10); ball.y = clamp(ball.y || E.mid.y, gy + 8, H - 4);
    return V;
  }
  function hopCell(i) { // cells 1-3 in a row, 4|5 side by side, 6, 7|8 (drawn left → right on the ground)
    const { x, cy, cw, ch } = E.hop;
    const col = [0, 1, 2, 3, 3, 4, 5, 5][i], row = [0, 0, 0, -1, 1, 0, -1, 1][i];
    const cx = x + col * cw, y = row === 0 ? cy - ch / 2 : row < 0 ? cy - ch : cy;
    return { x: cx, y, w: cw, h: ch, mx: cx + cw / 2, my: y + ch / 2 };
  }
  const hopRect = () => ({ x: E.hop.x - 4, y: E.hop.cy - E.hop.ch - 4, w: 6 * E.hop.cw + 8, h: E.hop.ch * 2 + 8 });
  const slideRect = () => ({ x: E.slide.x - 2, y: E.slide.y - 50, w: 66, h: 54 });
  const swingRect = () => ({ x: E.swing.x - 45, y: E.swing.y - 56, w: 90, h: 60 });
  const sandRect = () => ({ x: E.sand.x - 35, y: E.sand.y - 26, w: 70, h: 28 });
  const seeRect = () => ({ x: E.see.x - 42, y: E.see.y - 30, w: 84, h: 34 });
  const treeRect = () => ({ x: E.tree.x - 34, y: E.tree.y - 84, w: 68, h: 86 });
  const snowRect = () => ({ x: E.snow.x - 16, y: E.snow.y - 42, w: 32, h: 46 });
  const pivot = (i) => ({ x: E.swing.x - 45 + SWING_PIV[i], y: E.swing.y - 54 });
  function seatPos(i) { const sw = swings[i], pv = pivot(i); return { x: pv.x + Math.sin(sw.a) * CHAIN, y: pv.y + Math.cos(sw.a) * CHAIN }; }
  function seeEnd(side) { return { x: E.see.x + (side ? 30 : -30) * Math.cos(see.a), y: E.see.y - 36 + seeEndY(see.a, side) }; }

  // ---------------------------------------------------------------- background
  function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function buildBg() {
    const { W, H } = V, gy = L.gy;
    bgKey = W + 'x' + H + wt;
    // sky + far hills
    bg0 = document.createElement('canvas'); bg0.width = W; bg0.height = H;
    let c = bg0.getContext('2d');
    const [s0, s1] = SKY[wt];
    for (let k = 0; k < 6; k++) R(c, 0, Math.floor(gy * k / 6), W, Math.ceil(gy / 6) + 1, mix(s0, s1, k / 5));
    const hill = wt === 'nieve' ? '#e6eef6' : mix(GRASS[wt][0], s1, 0.45), hill2 = wt === 'nieve' ? '#d6e2ee' : mix(GRASS[wt][1], s1, 0.25);
    for (let x = 0; x < W; x++) {
      const h1 = 14 + Math.sin(x / 23) * 6 + Math.sin(x / 9 + 1) * 2, h2 = 7 + Math.sin(x / 31 + 2) * 4;
      R(c, x, gy - h1, 1, h1, hill); R(c, x, gy - h2, 1, h2, hill2);
    }
    // ground, building, fence, path, hopscotch
    bg1 = document.createElement('canvas'); bg1.width = W; bg1.height = H;
    c = bg1.getContext('2d');
    const [g0, g1, g2] = GRASS[wt];
    for (let y = gy, r = 0; y < H; y += 8, r++) R(c, 0, y, W, 8, r % 2 ? g1 : g0);
    R(c, 0, gy, W, 1, g2);
    for (let i = 0; i < 140; i++) {
      const x = Math.floor(rnd(i) * W), y = gy + 4 + Math.floor(rnd(i + 500) * (H - gy - 4));
      if (wt === 'nieve') { R(c, x, y, 2, 1, i % 3 ? '#dce6f2' : '#ffffff'); continue; }
      R(c, x, y, 1, 2, g2); R(c, x + 2, y, 1, 2, g2); R(c, x + 1, y + 1, 1, 1, g2);
      if (i % 9 === 0 && wt === 'sol') { const fc = ['#ffffff', '#ffd23f', '#ff9ec4'][i % 3]; R(c, x + 4, y - 1, 1, 1, fc); R(c, x + 3, y, 3, 1, fc); R(c, x + 4, y + 1, 1, 1, fc); R(c, x + 4, y, 1, 1, '#ffb020'); }
    }
    // fence along the back
    for (let x = L.wallX1 + 2; x < W; x += 7) {
      R(c, x, gy - 13, 4, 14, '#fffaf0'); R(c, x + 3, gy - 12, 1, 13, '#d8c7a8'); R(c, x + 1, gy - 14, 2, 1, '#fffaf0');
      if (wt === 'nieve') R(c, x, gy - 15, 4, 2, '#ffffff');
    }
    R(c, L.wallX1, gy - 10, W - L.wallX1, 2, '#efe2c8'); R(c, L.wallX1, gy - 4, W - L.wallX1, 2, '#efe2c8');
    R(c, L.wallX1, gy - 8, W - L.wallX1, 1, '#c9b48e'); R(c, L.wallX1, gy - 2, W - L.wallX1, 1, '#c9b48e');
    // the school: a warm brick wall with the classroom window and the door
    const x1 = L.wallX1, y0 = L.wallY0;
    R(c, 0, y0, x1, gy - y0, '#f6dfb0');
    for (let y = y0 + 4, r = 0; y < gy - 4; y += 5, r++) { R(c, 0, y, x1, 1, '#ecd09a'); for (let x = (r % 2) * 6; x < x1; x += 12) R(c, x, y - 4, 1, 4, '#ecd09a'); }
    R(c, x1 - 3, y0, 3, gy - y0, '#e3c592');
    R(c, 0, gy - 4, x1, 4, '#c9a77a'); R(c, 0, gy - 4, x1, 1, '#dcbf94');
    R(c, 0, y0 - 7, x1 + 4, 7, '#d9655a'); R(c, 0, y0 - 7, x1 + 4, 1, '#ef8f7f'); R(c, 0, y0 - 1, x1 + 4, 1, '#a8443d');
    for (let x = 2; x < x1 + 2; x += 6) R(c, x, y0 - 5, 3, 1, '#c25248');
    if (wt === 'nieve') { R(c, 0, y0 - 10, x1 + 5, 3, '#ffffff'); R(c, 0, y0 - 7, x1 + 5, 1, '#dce6f2'); }
    // pennants under the roof (like inside)
    const cols = ['#ef6f6c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6', '#ff9ec4'];
    for (let x = L.win.x - 2, k = 0; x < L.win.x + L.win.w - 4; x += 8, k++) for (let j = 0; j < 5; j++) R(c, x + j * 0.5, y0 + 2 + j, 6 - j, 1, cols[k % cols.length]);
    // classroom window: the pink curtains are inside
    const w = L.win;
    R(c, w.x - 3, w.y - 3, w.w + 6, w.h + 6, '#fffaf0'); R(c, w.x - 3, w.y + w.h + 3, w.w + 6, 1, '#d8c7a8');
    R(c, w.x, w.y, w.w, w.h, '#f3e3c0'); R(c, w.x, w.y + w.h - 9, w.w, 9, '#bfe0d0'); R(c, w.x + 8, w.y + 5, 26, 12, '#f4f8ff'); R(c, w.x + 8, w.y + 17, 26, 2, '#9aa7b8');
    for (const x of [w.x, w.x + w.w - 7]) { R(c, x, w.y, 7, w.h, '#ff9ec4'); R(c, x + 2, w.y, 1, w.h, '#ef7fae'); R(c, x + 5, w.y, 1, w.h, '#ef7fae'); }
    c.fillStyle = 'rgba(255,255,255,0.35)'; for (let k = 0; k < 10; k++) { c.fillRect(w.x + 4 + k, w.y + w.h - 4 - k * 2, 3, 2); c.fillRect(w.x + 22 + k, w.y + w.h - 4 - k * 2, 2, 2); }
    R(c, w.x + w.w / 2 - 1, w.y, 2, w.h, '#fffaf0'); R(c, w.x, w.y + w.h / 2 - 1, w.w, 2, '#fffaf0');
    R(c, w.x - 5, w.y + w.h + 3, w.w + 10, 3, '#e9d7b4');
    R(c, w.x + 2, w.y + w.h + 6, 9, 5, '#e0805a'); R(c, w.x + w.w - 11, w.y + w.h + 6, 9, 5, '#e0805a'); // flower boxes
    for (const fx of [w.x + 3, w.x + 7, w.x + w.w - 10, w.x + w.w - 6]) { R(c, fx, w.y + w.h + 3, 2, 3, '#4fae45'); R(c, fx, w.y + w.h + 2, 2, 2, wt === 'nieve' ? '#ffffff' : '#ff8fb8'); }
    // the path from the door to the blacktop with the hopscotch
    const pc = wt === 'nieve' ? '#9aa0ae' : wt === 'lluvia' ? '#7f7a8c' : '#a39caf', pe = darken(pc, 0.15), pl = lighten(pc, 0.2);
    const hr = hopRect(), top = { x0: hr.x - 8, x1: hr.x + hr.w + 8, y0: hr.y - 3, y1: Math.min(H, hr.y + hr.h + 5) };
    for (let y = gy; y < H; y++) {
      const k = (y - gy) / Math.max(1, top.y0 - gy);
      if (y < top.y0) { const cx = L.doorPt.x + (hr.x + 10 - L.doorPt.x) * k * k, hw = 8 + k * 4; R(c, cx - hw, y, hw * 2, 1, pc); R(c, cx - hw, y, 1, 1, pe); R(c, cx + hw - 1, y, 1, 1, pe); }
    }
    R(c, top.x0, top.y0, top.x1 - top.x0, top.y1 - top.y0, pc);
    R(c, top.x0, top.y0, top.x1 - top.x0, 1, pe); R(c, top.x0, top.y0, 1, top.y1 - top.y0, pe); R(c, top.x1 - 1, top.y0, 1, top.y1 - top.y0, pe); R(c, top.x0, top.y1 - 1, top.x1 - top.x0, 1, pe);
    for (let i = 0; i < 40; i++) R(c, top.x0 + 2 + rnd(i + 900) * (top.x1 - top.x0 - 4), top.y0 + 2 + rnd(i + 950) * (top.y1 - top.y0 - 4), 1, 1, pl);
    const chalk = ['#ffffff', '#ffe066', '#ffaed2', '#a9dcff', '#b4f0a4', '#ffc08a', '#e2c8ff', '#ffffff'];
    for (let i = 0; i < 8; i++) {
      const r = hopCell(i), col = chalk[i];
      R(c, r.x, r.y, r.w, 1, col); R(c, r.x, r.y + r.h - 1, r.w, 1, col); R(c, r.x, r.y, 1, r.h, col); R(c, r.x + r.w - 1, r.y, 1, r.h, col);
      const rows = FONT[String(i + 1)];
      rows.forEach((row, j) => { for (let q = 0; q < row.length; q++) if (row[q] === '#') R(c, r.x + 5 + q, r.y + 2 + j, 1, 1, col); });
    }
  }
  function drawDoor(c) {
    const d = L.door, o = doorOpen;
    R(c, d.x - 3, d.y - 3, d.w + 6, d.h + 3, '#8c5a3c'); R(c, d.x - 3, d.y - 3, d.w + 6, 1, '#a8714a');
    R(c, d.x, d.y, d.w, d.h, '#4a3640');
    R(c, d.x + 2, d.y + d.h - 8, d.w - 4, 8, '#e6c79a'); // the classroom floor peeks out
    const w = Math.round(d.w * (1 - o * 0.8));
    R(c, d.x, d.y, w, d.h, '#c98a55'); R(c, d.x, d.y, 1, d.h, '#e3ab72');
    if (w > 10) { R(c, d.x + 4, d.y + 5, w - 8, 12, '#bfe6ff'); R(c, d.x + 5, d.y + 6, 2, 3, '#ffffff'); R(c, d.x + 4, d.y + 22, w - 8, 8, '#b5794a'); R(c, d.x + 4, d.y + 33, w - 8, 8, '#b5794a'); R(c, d.x + w - 5, d.y + 24, 2, 2, '#ffd23f'); }
    if (wt === 'nieve') R(c, d.x - 3, d.y - 5, d.w + 6, 2, '#ffffff');
  }

  // ---------------------------------------------------------------- kids
  function mkKid(s, i) {
    return { s, i, x: 0, y: 0, z: 0, vz: 0, look: 0, st: 'gone', eq: null, go: null, t: 0, idleT: 1, until: 0, slot: -1, enterAt: 0, land: false };
  }
  const freeKid = (k) => k.st === 'idle' || k.st === 'wander' || k.st === 'ball' || (k.st === 'chase' && !k.forced);
  const active = () => kids.filter(k => k.st !== 'gone' && k.st !== 'enter');
  function goTo(k, x, y, sp, then) { k.go = { x, y, sp, then }; }
  function stepGo(k, dt) {
    const g = k.go; if (!g) return;
    const dx = g.x - k.x, dy = g.y - k.y, d = Math.hypot(dx, dy), v = g.sp * dt;
    if (Math.abs(dx) > 2) k.look = Math.sign(dx);
    if (d <= v) { k.x = g.x; k.y = g.y; k.go = null; if (g.then) g.then(); return; }
    k.x += dx / d * v; k.y += dy / d * v;
  }
  function spot() { return { x: rand(20, V.W - 20), y: rand(L.gy + 14, V.H - 8) }; }
  function talkLine(s, line, fb = 'yay', force = false) {
    if (!force && G.time - lastTalk < 2.2) return;
    lastTalk = G.time; speak(s, line, fb);
  }
  function burst(kind, x, y, n, colors, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.up ? rand(-2.7, -0.4) : rand(0, Math.PI * 2), sp = rand(o.min ?? 15, o.sp ?? 55);
      parts.push({ kind, color: pick(colors), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g ?? 60, life: rand(0.6, 1.1) * (o.life ?? 1), t: 0 });
    }
  }
  /** take a kid off whatever they are doing (slots freed; they fall back to the ground) */
  function release(k) {
    if (k.st === 'swing' || k.st === 'toSwing') { const sw = swings[k.slot]; if (sw && sw.kid === k) { sw.kid = null; if (k.st === 'swing') { const p = seatPos(k.slot); k.x = p.x; k.y = E.swing.y + 4; k.z = Math.max(0, E.swing.y - p.y - 6); } } }
    if (k.st === 'see' || k.st === 'toSee') { if (see.seats[k.slot] === k) { see.seats[k.slot] = null; if (k.st === 'see') { const p = seeEnd(k.slot); k.x = p.x; k.y = E.see.y + 3; k.z = Math.max(0, E.see.y - p.y); } } }
    if (sandSlots[k.slot] === k && (k.st === 'dig' || k.st === 'toSand')) { sandSlots[k.slot] = null; if (k.st === 'dig') k.y = E.sand.y + 4; }
    slide.q = slide.q.filter(q => q !== k);
    if (slide.cur === k) slide.cur = null;
    if (hop.cur === k) hop.cur = null;
    if (k.partner) { const o = k.partner; k.partner = null; if (o.partner === k) { o.partner = null; if (o.st === 'chase') idle(o); } }
    k.go = null; k.eq = null; k.slot = -1; k.forced = false; k.land = false;
  }
  function idle(k, t = rand(0.8, 2.6)) { release(k); k.st = 'idle'; k.idleT = t; }
  function likes(k) {
    let l = (LIKES[k.s.kind] || ALL).slice();
    if (!playBall()) l = l.map(x => (x === 'ball' ? (wt === 'lluvia' ? 'puddle' : 'snow') : x));
    if (wt === 'lluvia') l.push('puddle'); if (wt === 'nieve') l.push('snow');
    return l;
  }
  function canDo(eq, k) {
    if (eq === 'slide') return slide.q.length < 3;
    if (eq === 'swing') return swings.some(s => !s.kid);
    if (eq === 'sand') return sandSlots.some(x => !x);
    if (eq === 'seesaw') return see.seats.some(x => !x);
    if (eq === 'hop') return !hop.cur;
    if (eq === 'chase') return active().some(o => o !== k && (o.st === 'idle' || o.st === 'wander'));
    if (eq === 'snow') return (snowStage < 4 || Math.random() < 0.3) && busyAt(['toSnow', 'roll']) < 2;
    // v2.0: eight friends; a few at a time on the ball and in each puddle so nobody piles up
    if (eq === 'ball') return busyAt(['ball']) < 3;
    if (eq === 'puddle') return busyAt(['toPuddle', 'splash']) < E.puddles.length + 1;
    return true;
  }
  const busyAt = (sts) => active().filter(o => sts.includes(o.st)).length;
  function choose(k) {
    const opts = likes(k).filter(e => canDo(e, k));
    if (!opts.length || Math.random() < 0.15) return wander(k);
    assign(k, pick(opts));
  }
  function wander(k) {
    release(k); k.st = 'wander';
    const p = spot(); goTo(k, p.x, p.y, rand(40, 58), () => idle(k));
  }
  /** send a kid to a piece of equipment. Returns false if it's full. */
  function assign(k, eq, forced = false) {
    if (!canDo(eq, k) && eq !== 'chase') return false;
    release(k); k.eq = eq; k.forced = forced;
    const sp = forced ? 70 : 54;
    if (eq === 'slide') { slide.q.push(k); k.st = 'queue'; return true; }
    if (eq === 'swing') {
      const i = swings.findIndex(s => !s.kid); swings[i].kid = k; k.slot = i; k.st = 'toSwing';
      goTo(k, pivot(i).x, E.swing.y + 4, sp, () => { k.st = 'swing'; k.until = G.time + rand(12, 20); swings[i].amp = Math.max(swings[i].amp, 0.15); act(k.s, 'happy', 1); });
      return true;
    }
    if (eq === 'sand') {
      const i = sandSlots.findIndex(x => !x); sandSlots[i] = k; k.slot = i; k.st = 'toSand';
      goTo(k, E.sand.x + (i - 1) * 20, E.sand.y + 6, sp, () => { k.st = 'dig'; k.y = E.sand.y - 2; k.until = G.time + rand(12, 20); k.t = 0; });
      return true;
    }
    if (eq === 'seesaw') {
      const i = see.seats.findIndex(x => !x); see.seats[i] = k; k.slot = i; k.st = 'toSee';
      goTo(k, E.see.x + (i ? 34 : -34), E.see.y + 3, sp, () => { k.st = 'see'; k.look = i ? -1 : 1; k.until = G.time + rand(12, 18); sfx.lift(); });
      return true;
    }
    if (eq === 'hop') {
      hop.cur = k; k.st = 'toHop';
      const c0 = hopCell(0); goTo(k, c0.x - 8, c0.my + 4, sp, () => { k.st = 'hopping'; k.hopI = -1; k.t = 0.4; k.look = 1; });
      return true;
    }
    if (eq === 'ball') { k.st = 'ball'; k.until = G.time + rand(10, 18); k.t = 0; return true; }
    if (eq === 'puddle') {
      const n = (p) => active().filter(o => o.pd === p && (o.st === 'toPuddle' || o.st === 'splash')).length;
      const pd = pick(E.puddles.filter(p => n(p) === Math.min(...E.puddles.map(n)))); k.st = 'toPuddle'; k.pd = pd;
      goTo(k, pd.x + rand(-6, 6), pd.y + 1, sp, () => { k.st = 'splash'; k.n = 0; k.t = 0.2; });
      return true;
    }
    if (eq === 'snow') {
      k.st = 'toSnow'; const side = Math.random() < 0.5 ? -1 : 1;
      goTo(k, E.snow.x + side * 16, E.snow.y + 2, sp, () => { k.st = 'roll'; k.look = -side; k.t = rand(1.6, 2.4); });
      return true;
    }
    if (eq === 'chase') {
      const others = active().filter(o => o !== k && (o.st === 'idle' || o.st === 'wander'));
      if (!others.length) { wander(k); return true; }
      const o = pick(others); release(o);
      k.st = 'chase'; o.st = 'chase'; k.partner = o; o.partner = k; k.it = true; o.it = false; k.eq = o.eq = 'chase';
      k.until = o.until = G.time + rand(8, 13);
      return true;
    }
    if (eq === 'apple') {
      const a = fallen.find(f => !f.taken && f.z <= 0); if (!a) return false;
      a.taken = k; k.st = 'toApple';
      goTo(k, a.x - 6, a.y + 1, 66, () => { fallen = fallen.filter(f => f !== a); k.st = 'munch'; k.t = 2; act(k.s, 'munch', 2); sfx.crunch(); talkLine(k.s, '¡Qué rico!', 'yay', true); });
      return true;
    }
    return false;
  }
  function nearestFree(x, y, not) {
    const c = active().filter(k => k.st !== 'held' && k !== not && !k.leaving);
    const free = c.filter(freeKid);
    const pool = free.length ? free : c.filter(k => !['swing', 'see', 'climb', 'top', 'slideDown', 'hopping'].includes(k.st));
    return pool.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] || null;
  }

  // ---------------------------------------------------------------- open / close
  function open(list, done) {
    resolve = done || null; isOpen = true; leaving = null; openT = G.time;
    wt = weatherNow(); bgKey = '';
    kids.length = 0; parts.length = 0;
    (list && list.length ? list : students.filter(s => s.mode !== 'away')).forEach((s, i) => { const k = mkKid(s, i); k.enterAt = G.time + 0.5 + i * 0.45; kids.push(k); });
    slide.q = []; slide.cur = null; swings.forEach(s => { s.kid = null; s.amp = 0; s.a = 0; }); sandSlots.fill(null); castles = []; see.seats = [null, null];
    hop.cur = null; held = null; press = null; hint = null;
    Object.assign(ball, { x: E.mid.x + 10, y: E.mid.y + 6, z: 0, vx: 0, vy: 0, vz: 0, held: false });
    apples = wt === 'nieve' ? [] : [0, 1, 2]; fallen = []; snowStage = 0; snowBusy = 0;
    lastInput = G.time; nextHintAt = G.time + 10; idleNag = 0;
    doorUntil = G.time + 0.6 + kids.length * 0.45;
  }
  function whistle() {
    if (leaving || !isOpen) return;
    leaving = { t0: G.time, stage: 'line' };
    hint = null;
    sfx.whistle();
    wait(0.8).then(() => speak(owl(), LD.UI_WORDS.bell, 'tap'));
    const order = kids.filter(k => k.st !== 'gone');
    order.forEach((k, i) => {
      if (k.st === 'held') held = null;
      release(k); k.st = 'line'; k.leaving = true;
      act(k.s, 'look', 0.6);
      const x = L.doorPt.x + 18 + i * 19, y = L.gy + 10 + (i % 2);
      goTo(k, Math.min(x, V.W - 14), y, 62, () => { k.look = -1; });
    });
  }
  function finish() {
    if (!isOpen) return;
    isOpen = false;
    hooks.close();
    const r = resolve; resolve = null;
    wait(0.45).then(() => r && r());
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    if (!V) return;
    if (!isOpen && !kids.length) return;
    const t = G.time;
    const wantDoor = (isOpen && t < doorUntil) || (leaving && leaving.stage === 'in');
    doorOpen += ((wantDoor ? 1 : 0) - doorOpen) * Math.min(1, dt * 8);
    // arrivals: out of the door one by one
    for (const k of kids) {
      if (k.st === 'gone' && !leaving && isOpen && k.enterAt && t > k.enterAt) {
        k.enterAt = 0; k.st = 'enter'; k.x = L.doorPt.x; k.y = L.doorPt.y - 2; k.z = 0;
        if (k.i === 0) talkLine(k.s, '¡Recreo!', 'yay', true);
        if (k.i === 1 && wt === 'lluvia') wait(1.2).then(() => talkLine(k.s, LD.YARD_LINES.puddles, 'yay', true));
        if (k.i === 1 && wt === 'nieve') wait(1.2).then(() => talkLine(k.s, LD.WEATHER_RECESS.nieve, 'here', true));
        act(k.s, 'cheer', 0.8); k.vz = 60;
        goTo(k, L.doorPt.x + 10 + rand(0, 24), L.gy + rand(14, 26), 60, () => { k.st = 'idle'; k.idleT = 0.1; });
      }
    }
    // equipment physics
    for (const sw of swings) {
      const base = sw.kid && sw.kid.st === 'swing' ? 0.4 : 0;
      if (sw.amp > base) sw.amp = Math.max(base, sw.amp - dt * (base ? 0.04 : 0.25)); else sw.amp = Math.min(base, sw.amp + dt * 0.12);
      sw.ph += dt * 2.5; sw.a = sw.amp * Math.sin(sw.ph);
    }
    {
      const [a, b] = see.seats, on = (k) => k && k.st === 'see';
      if (on(a) && on(b)) {
        see.ph += dt * 2.4; see.a = 0.2 * Math.sin(see.ph);
        const sg = Math.sign(Math.cos(see.ph));
        if (sg !== see.lastSign) { see.lastSign = sg; sfx.boing(); const up = see.a > 0 ? a : b; act(up.s, 'cheer', 0.7); if (Math.random() < 0.25) talkLine(up.s, LD.YARD_LINES.up); }
      } else {
        const target = on(a) ? -0.2 : on(b) ? 0.2 : 0.2;
        see.a += (target - see.a) * Math.min(1, dt * 4);
      }
    }
    // ball
    if (!ball.held) {
      ball.vz -= 300 * dt; ball.z += ball.vz * dt;
      if (ball.z < 0) { ball.z = 0; if (ball.vz < -40) { ball.vz = -ball.vz * 0.55; sfx.tap(); } else ball.vz = 0; }
      ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.vx *= 1 - dt * 0.8; ball.vy *= 1 - dt * 0.8;
      if (ball.x < 8 || ball.x > V.W - 8) { ball.vx = -ball.vx * 0.8; ball.x = clamp(ball.x, 8, V.W - 8); }
      if (ball.y < L.gy + 6 || ball.y > V.H - 4) { ball.vy = -ball.vy * 0.8; ball.y = clamp(ball.y, L.gy + 6, V.H - 4); }
    }
    // fallen apples
    for (const f of fallen) { if (f.z > 0 || f.vz > 0) { f.vz -= 300 * dt; f.z += f.vz * dt; if (f.z <= 0) { f.z = 0; if (f.vz < -50) { f.vz = -f.vz * 0.35; sfx.tap(); } else f.vz = 0; } } }
    if (fallen.some(f => !f.taken && f.z <= 0) && !leaving) { const k = nearestFree(fallen[0].x, fallen[0].y); if (k && Math.random() < dt * 2) assign(k, 'apple', true); }
    if (apples.length < 3 && wt !== 'nieve' && Math.random() < dt / 18) apples.push([0, 1, 2, 3].find(i => !apples.includes(i)));
    // kids
    for (const k of kids) {
      if (k.st === 'gone') continue;
      const onEq = ['climb', 'top', 'slideDown', 'swing', 'see', 'held'].includes(k.st);
      if (!onEq && (k.z > 0 || k.vz > 0)) {
        k.vz -= 380 * dt; k.z += k.vz * dt;
        if (k.z <= 0) { k.z = 0; k.vz = 0; if (k.land) { k.land = false; landed(k); } }
      }
      if (k.st !== 'held') stepGo(k, dt);
      tickKid(k, dt);
    }
    // leaving: line up, then in through the door
    if (leaving) {
      const line = kids.filter(k => k.st === 'line');
      if (leaving.stage === 'line' && (line.every(k => !k.go) || G.time - leaving.t0 > 7)) {
        leaving.stage = 'in'; leaving.t1 = G.time; sfx.door();
        line.forEach((k, i) => wait(0.3 + i * 0.4).then(() => goTo(k, L.doorPt.x, L.doorPt.y - 3, 60, () => { k.st = 'gone'; })));
      }
      if (leaving.stage === 'in' && (kids.every(k => k.st === 'gone') || G.time - leaving.t1 > 8)) { leaving.stage = 'done'; sfx.door(); wait(0.35).then(finish); }
    }
    // hints: a pointing hand after a quiet moment, the whistle after a long one
    if (isOpen && !leaving && !held) {
      const quiet = t - lastInput;
      if (quiet > 9 && t > nextHintAt && !hint) { showHint(false, quiet > 90); nextHintAt = t + 16; }
    }
    if (hint && t > hint.until) hint = null;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt;
      if (p.t > p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.wob) p.x += Math.sin(p.t * 6 + p.wob) * 0.4;
    }
  }
  function landed(k) {
    if (k.st === 'hopping') {
      const i = k.hopI; hop.flash[i] = G.time;
      sfx.note(NOTES[i]); speak(k.s, numberWord(i + 1), 'tap');
      const c = hopCell(i); burst('spark', c.mx, c.my, 3, ['#ffd23f', '#ffffff']);
      return;
    }
    if (k.st === 'splash' && k.pd) {
      sfx.splash(); burst('puff', k.x, k.y - 1, 8, ['#9fd0ff', '#d6eeff', '#7ec8ff'], { up: true, sp: 50, g: 160, life: 0.6 });
      if (Math.random() < 0.4) sfx.giggle(1.2, 3);
    }
  }
  function tickKid(k, dt) {
    const t = G.time, s = k.s;
    switch (k.st) {
      case 'idle':
        k.idleT -= dt;
        if (k.idleT < 0 && !leaving) choose(k);
        break;
      case 'queue': {
        const i = slide.q.indexOf(k);
        if (i < 0) { idle(k); break; }
        const tx = E.slide.x + 7 - i * 14, ty = E.slide.y + 3 + i;
        if (Math.hypot(k.x - tx, k.y - ty) > 1.5) { if (!k.go || k.go.x !== tx) goTo(k, tx, ty, k.forced ? 70 : 54); }
        else if (i === 0 && !slide.cur && !k.go) { slide.q.shift(); slide.cur = k; k.st = 'climb'; k.t = 0; k.look = 1; if (Math.random() < 0.35) talkLine(s, LD.YARD_LINES.myTurn); }
        break;
      }
      case 'climb':
        k.t += dt; { const u = Math.min(1, k.t / 0.8); k.x = E.slide.x + 7 + u * 5; k.y = E.slide.y + 1; k.z = u * SLIDE_TOPZ; if (Math.floor(k.t * 6) !== Math.floor((k.t - dt) * 6)) sfx.step(Math.floor(k.t * 6)); if (u >= 1) { k.st = 'top'; k.t = 0; act(s, 'cheer', 0.5); } }
        break;
      case 'top':
        k.t += dt; if (k.t > 0.45) { k.st = 'slideDown'; k.t = 0; sfx.whoosh(); act(s, 'cheer', 0.9); }
        break;
      case 'slideDown': {
        k.t += dt; const u = Math.min(1, k.t / 0.7), e = u * u;
        const lx = 20 + e * 38; k.x = E.slide.x + lx; k.z = slideZ(lx) - 3; k.y = E.slide.y + 1;
        if (u >= 1) {
          slide.cur = null; k.st = 'idle'; k.z = 2; k.vz = 55; k.x += 2;
          burst('star', k.x, k.y - 20, 3, ['#ffd23f', '#ff9ec4', '#7ec8ff'], { up: true });
          if (Math.random() < 0.45) talkLine(s, LD.YARD_LINES.yay);
          if (Math.random() < 0.55 && slide.q.length < 3 && !leaving) { k.eq = 'slide'; slide.q.push(k); k.st = 'queue'; } else k.idleT = rand(0.8, 2);
        }
        break;
      }
      case 'swing':
        if (Math.random() < dt * 0.25) act(s, swings[k.slot].amp > 0.6 ? 'cheer' : 'happy', 1);
        if (t > k.until && t - swings[k.slot].pushT > 5) idle(k);
        break;
      case 'dig':
        k.t -= dt;
        if (k.t < 0) {
          k.t = rand(0.5, 0.9); act(s, 'paint', 0.6); sfx.step(1);
          burst('crumb', k.x + rand(-6, 6), k.y - 6, 3, wt === 'nieve' ? ['#ffffff', '#dce6f2'] : ['#e3bf6a', '#f3d58c'], { up: true, sp: 30, g: 120, life: 0.5 });
          if (Math.random() < 0.06 && castles.length < 4) addCastle(k);
        }
        if (t > k.until) idle(k);
        break;
      case 'see':
        if (t > k.until && !see.seats[1 - k.slot]) idle(k);
        else if (t > k.until + 6) idle(k);
        break;
      case 'hopping':
        k.t -= dt;
        if (k.t < 0 && k.z <= 0 && !k.land) {
          if (k.hopI >= 7) {
            hop.cur = null; act(s, 'cheer', 1.2); k.vz = 80; sfx.chime();
            burst('star', k.x, k.y - 30, 6, ['#ffd23f', '#ff9ec4', '#7ec8ff'], { up: true });
            wait(0.8).then(() => talkLine(s, pick(['¡Bien!', '¡Hurra!']), 'yay', true));
            k.st = 'idle'; k.idleT = rand(1, 2); k.eq = null;
            break;
          }
          k.hopI++; const c = hopCell(k.hopI);
          goTo(k, c.mx, c.my + 4, 34); k.vz = 85; k.land = true; k.t = 0.62; act(s, 'happy', 0.5);
        }
        break;
      case 'ball': {
        const d = Math.hypot(k.x - ball.x, k.y - ball.y);
        if (!ball.held && d > 8 && (!k.go || Math.random() < dt * 3)) { const a = k.i * 1.7 + t * 0.4; goTo(k, clamp(ball.x + Math.cos(a) * 7, 12, V.W - 12), clamp(ball.y + Math.sin(a) * 3, L.gy + 8, V.H - 4), 60); }
        if (!ball.held && d < 10 && ball.z < 6 && Math.random() < dt * 5) kick(k);
        if (t > k.until || !playBall()) idle(k);
        break;
      }
      case 'chase': {
        const o = k.partner;
        if (!o || o.st !== 'chase') { idle(k); break; }
        if (k.it) {
          if (!k.go || Math.random() < dt * 4) goTo(k, o.x, o.y, 64);
          if (Math.hypot(k.x - o.x, k.y - o.y) < 9 && t - (k.tagT || 0) > 1.2) { // tag! you're it
            k.it = false; o.it = true; o.tagT = t; k.tagT = t;
            act(k.s, 'giggle', 1); act(o.s, 'gasp', 0.6); sfx.giggle(1.2, 4); o.vz = 50;
            if (Math.random() < 0.5) talkLine(k.s, LD.YARD_LINES.caught);
            const p = spot(); goTo(k, p.x, p.y, 62);
            o.go = null;
          }
        } else if (!k.go) { const p = spot(); goTo(k, p.x, p.y, t - (k.tagT || 0) < 1 ? 30 : 58); }
        if (t > k.until) { idle(k); }
        break;
      }
      case 'splash':
        k.t -= dt;
        if (k.t < 0 && k.z <= 0 && !k.land) {
          if (k.n >= 3) { idle(k); break; }
          k.n++; k.vz = 75; k.land = true; k.t = 0.45; act(s, 'cheer', 0.5);
        }
        break;
      case 'roll':
        k.t -= dt; if (Math.random() < dt * 3) act(s, 'paint', 0.5);
        if (k.t < 0) {
          if (snowStage < 4 && (k.forced || t > snowBusy)) growSnowman(k);
          idle(k);
        }
        break;
      case 'munch':
        k.t -= dt; if (k.t < 0) idle(k);
        break;
      case 'line': case 'held': case 'enter': case 'wander': case 'toSwing': case 'toSand': case 'toSee': case 'toHop': case 'toPuddle': case 'toSnow': case 'toApple':
        break;
    }
  }
  function kick(k, dir) {
    const dx = dir ?? (Math.sign(ball.x - k.x) || pick([-1, 1]));
    ball.vz = 110; ball.vx = dx * rand(50, 85); ball.vy = rand(-40, 40);
    sfx.boing(); act(k.s, 'cheer', 0.8); k.vz = 50;
  }
  function addCastle(k) {
    const xs = [-22, -8, 8, 22].filter(x => !castles.some(c => c.x === x));
    if (!xs.length) return;
    castles.push({ x: pick(xs), n: castles.length, t: G.time });
    sfx.pop(1.1); burst('spark', E.sand.x, E.sand.y - 14, 5, ['#ffd23f', '#ffffff']);
    if (k) { act(k.s, 'cheer', 1); talkLine(k.s, LD.YARD_LINES.castle); }
  }
  function growSnowman(k) {
    snowStage++; snowBusy = G.time + 12;
    sfx.crunch(); burst('puff', E.snow.x, E.snow.y - 10, 8, ['#ffffff', '#dce6f2'], { sp: 40 });
    if (snowStage >= 4) {
      sfx.fanfare();
      for (const o of active()) if (!o.leaving) act(o.s, 'cheer', 1.4);
      burst('star', E.snow.x, E.snow.y - 40, 10, ['#ffd23f', '#9fd0ff', '#ffffff'], { up: true });
      wait(0.6).then(() => talkLine(k ? k.s : owl(), LD.YARD_LINES.snowman, 'yay', true));
    } else if (k) act(k.s, 'happy', 1);
  }

  // ---------------------------------------------------------------- her taps
  function shakeTree() {
    treeShake = G.time; sfx.rustle();
    const { x, y } = E.tree;
    const cols = wt === 'nieve' ? ['#ffffff', '#e6eef6'] : wt === 'lluvia' ? ['#9fd0ff', '#5fbf4f'] : ['#5fbf4f', '#8fdc6f', '#3f9a3f'];
    for (let i = 0; i < 12; i++) parts.push({ kind: wt === 'nieve' ? 'puff' : 'confetti', color: pick(cols), x: x + rand(-28, 28), y: y - rand(40, 70), vx: rand(-8, 8), vy: rand(0, 10), g: 30, life: rand(1.2, 1.9), t: 0, wob: rand(0, 6) });
    if (apples.length) {
      const i = pick(apples); apples = apples.filter(a => a !== i);
      const [ax, ay] = APPLE_AT[i];
      fallen.push({ x: clamp(x + ax + rand(-4, 4), 10, V.W - 10), y: y + rand(4, 12), z: -ay - 8, vz: 0, taken: null });
      wait(0.3).then(() => sfx.ooh(1.1));
    }
    for (const k of active()) if (Math.hypot(k.x - x, k.y - y) < 60 && freeKid(k)) act(k.s, 'gasp', 0.7);
  }
  function tapEquipment(eq, x, y) {
    const pullTo = (e) => { const k = nearestFree(x, y); if (!k) { sfx.softPop(); return null; } if (!assign(k, e, true)) { sfx.softPop(); return null; } act(k.s, 'cheer', 0.7); k.vz = 50; sfx.pop(); return k; };
    if (eq === 'swing') {
      // a friend on the swing gets a push; an empty seat gets a friend
      const near = swings.map((sw, i) => ({ sw, i, d: Math.hypot(seatPos(i).x - x, seatPos(i).y - y) })).sort((a, b) => a.d - b.d);
      const onIt = near.find(n => n.sw.kid && n.sw.kid.st === 'swing' && n.d < 22) || (swings.every(s => s.kid) ? near.find(n => n.sw.kid && n.sw.kid.st === 'swing') : null);
      if (onIt) { push(onIt.i); return; }
      pullTo('swing'); return;
    }
    if (eq === 'sand') {
      if (sandSlots.some(k => k && k.st === 'dig') && (castles.length < 4) && (Math.random() < 0.6 || !sandSlots.some(k => !k))) { addCastle(sandSlots.find(k => k && k.st === 'dig')); return; }
      if (!pullTo('sand') && castles.length >= 4) { castles = []; sfx.crunch(); burst('crumb', E.sand.x, E.sand.y - 10, 10, ['#e3bf6a', '#f3d58c'], { up: true, sp: 40, g: 120 }); }
      return;
    }
    if (eq === 'seesaw') {
      if (see.seats.every(k => k && k.st === 'see')) { see.ph += 0.6; sfx.boing(); for (const k of see.seats) { act(k.s, 'cheer', 0.8); k.until = Math.max(k.until, G.time + 6); } return; }
      pullTo('seesaw'); return;
    }
    if (eq === 'hop') {
      const i = [0, 1, 2, 3, 4, 5, 6, 7].find(j => inR(x, y, hopCell(j)));
      if (i !== undefined) { hop.flash[i] = G.time; sfx.note(NOTES[i]); speak(owl(), numberWord(i + 1), 'tap'); }
      if (!hop.cur) pullTo('hop');
      return;
    }
    if (eq === 'slide') { if (slide.q.length >= 3) { sfx.softPop(); return; } pullTo('slide'); return; }
    if (eq === 'tree') { shakeTree(); return; }
    if (eq === 'puddle') {
      sfx.splash(); burst('puff', x, y, 8, ['#9fd0ff', '#d6eeff', '#7ec8ff'], { up: true, sp: 50, g: 160, life: 0.6 });
      pullTo('puddle'); return;
    }
    if (eq === 'snow') {
      const k = pullTo('snow');
      if (!k) { if (snowStage < 4) growSnowman(null); else { sfx.boing(); burst('puff', E.snow.x, E.snow.y - 30, 6, ['#ffffff']); } }
      return;
    }
  }
  function push(i) {
    const sw = swings[i]; sw.amp = Math.min(0.95, sw.amp + 0.3); sw.pushT = G.time; sfx.whoosh();
    const k = sw.kid; act(k.s, 'cheer', 1.2); k.until = Math.max(k.until, G.time + 8);
    const p = seatPos(i); burst('heart', p.x, p.y - 30, 2, ['#ff6f91', '#ff9ec4'], { up: true, sp: 30 });
    if (sw.amp > 0.6 && Math.random() < 0.6) talkLine(k.s, LD.YARD_LINES.higher);
  }
  function tapKid(k) {
    if (k.st === 'swing') { push(k.slot); return; }
    if (k.st === 'see') { tapEquipment('seesaw', 0, 0); return; }
    const f = kidFoot(k);
    const fx = { burst: (kind, n, cols, o) => burst(kind, f.x, f.y - 30, n, cols, o), neighbours: () => active().map(q => q.s) };
    if (tapEscalate(k.s, fx)) return;
    act(k.s, 'happy', 0.9); if (k.z <= 0 && !['climb', 'top', 'slideDown'].includes(k.st)) k.vz = 70; animalSound(k.s);
    burst('heart', f.x, f.y - 30, 2, ['#ff6f91'], { up: true, sp: 30 });
  }
  function equipAt(x, y) {
    if (!playBall() && wt === 'nieve' && inR(x, y, snowRect())) return 'snow';
    if (wt === 'lluvia') for (const p of E.puddles) if (Math.hypot((x - p.x) / (p.rx + 4), (y - p.y) / (p.ry + 5)) < 1) return 'puddle';
    if (inR(x, y, swingRect())) return 'swing';
    if (inR(x, y, slideRect())) return 'slide';
    if (inR(x, y, seeRect())) return 'seesaw';
    if (inR(x, y, sandRect())) return 'sand';
    if (inR(x, y, hopRect())) return 'hop';
    if (inR(x, y, treeRect())) return 'tree';
    return null;
  }
  function kidFoot(k) {
    if (k.st === 'swing') { const p = seatPos(k.slot); return { x: p.x, y: p.y + 9 }; }
    if (k.st === 'see') { const p = seeEnd(k.slot); return { x: p.x, y: p.y + 5 }; }
    return { x: k.x, y: k.y - k.z };
  }
  function kidAt(x, y) {
    const c = kids.filter(k => !['gone', 'enter', 'line'].includes(k.st)).sort((a, b) => sortY(b) - sortY(a));
    return c.find(k => { const f = kidFoot(k); return x > f.x - 12 && x < f.x + 12 && y > f.y - 36 && y < f.y; }) || null;
  }
  const ballHit = (x, y) => playBall() && Math.hypot(x - ball.x, y - (ball.y - 6 - ball.z)) < 13;

  function down(x, y) {
    if (!isOpen) return;
    lastInput = G.time; nextHintAt = G.time + 14; hint = null;
    if (leaving) return;
    if (inR(x, y, L.whistle)) { press = { btn: 'whistle', x, y }; return; }
    if (inR(x, y, L.help)) { press = { btn: 'help', x, y }; return; }
    if (ballHit(x, y)) { press = { ball: true, x, y, x0: x, y0: y, trail: [[x, y, G.time]] }; ball.held = true; ball.vx = ball.vy = 0; return; }
    const k = kidAt(x, y);
    press = { k, x, y, x0: x, y0: y, moved: false };
  }
  function move(x, y) {
    if (!press) return;
    if (press.ball) {
      press.trail.push([x, y, G.time]); if (press.trail.length > 8) press.trail.shift();
      ball.x = clamp(x, 8, V.W - 8); ball.y = clamp(y + 6, L.gy + 6, V.H - 4); ball.z = Math.max(0, ball.y - 6 - y);
      press.moved = press.moved || Math.hypot(x - press.x0, y - press.y0) > 4;
      return;
    }
    if (press.k && !press.moved && Math.hypot(x - press.x0, y - press.y0) > 5) { // pick the friend up
      const k = press.k; press.moved = true;
      release(k); k.st = 'held'; k.z = 0; k.vz = 0; held = k; sfx.lift(); act(k.s, 'happy', 0.6);
    }
    if (held) { held.x = clamp(x, 10, V.W - 10); held.y = clamp(y + 22, L.gy + 6, V.H + 10); held.hy = y; }
  }
  function up(x, y) {
    const p = press; press = null;
    if (!p) return;
    if (p.btn) {
      if (!inR(x, y, p.btn === 'whistle' ? L.whistle : L.help)) return;
      if (p.btn === 'whistle') whistle();
      else { sfx.pop(); sayUI(owl(), 'help'); wait(1).then(() => showHint(true, G.time - openT > 90)); }
      return;
    }
    if (p.ball) {
      ball.held = false;
      const tr = p.trail, a = tr[0], b = tr[tr.length - 1], dt = Math.max(0.03, b[2] - a[2]);
      const vx = (b[0] - a[0]) / dt, vy = (b[1] - a[1]) / dt, sp = Math.hypot(vx, vy);
      if (!p.moved || sp < 30) { ball.vz = 120; ball.vx = rand(-60, 60); ball.vy = rand(-30, 30); }
      else { const m = Math.min(1, 260 / sp); ball.vx = vx * m; ball.vy = vy * m * 0.7; ball.vz = 70 + Math.min(90, sp * 0.25); }
      sfx.boing();
      for (const k of active()) if (freeKid(k) && Math.random() < 0.6 && !leaving) { if (k.st !== 'ball') assign(k, 'ball'); }
      return;
    }
    if (held) {
      const k = held; held = null;
      const eq = equipAt(x, y);
      k.st = 'idle'; k.idleT = 1.5; k.y = clamp(k.y, L.gy + 8, V.H - 4); k.z = Math.max(0, (k.y - 22) - (k.hy ?? y)); k.vz = 0;
      const map = { swing: 'swing', slide: 'slide', seesaw: 'seesaw', sand: 'sand', hop: 'hop', puddle: 'puddle', snow: 'snow' };
      if (eq && map[eq]) { if (assign(k, map[eq], true)) { sfx.pop(); act(k.s, 'cheer', 0.8); } else { sfx.softPop(); } }
      else { sfx.thump(); }
      return;
    }
    if (p.k) { tapKid(p.k); return; }
    const eq = equipAt(x, y);
    if (eq) tapEquipment(eq, x, y);
    else { sfx.tap(); burst('spark', x, y, 3, ['#ffffff', '#ffd23f']); }
  }

  // ---------------------------------------------------------------- hints
  function hintList() {
    const l = ['yardSwing', 'yardSlide', playBall() ? 'yardBall' : wt === 'lluvia' ? 'yardPuddle' : 'yardSnow', 'yardSand', 'yardSeesaw', 'yardHop', 'yardTree'];
    return l;
  }
  function hintPt(key) {
    if (key === 'yardSwing') { const p = seatPos(swings[0].kid ? 1 : 0); return { x: p.x, y: p.y - 2 }; }
    if (key === 'yardSlide') return { x: E.slide.x + 40, y: E.slide.y - 20 };
    if (key === 'yardBall') return { x: ball.x, y: ball.y - 6 - ball.z };
    if (key === 'yardPuddle') return { x: E.puddles[0].x, y: E.puddles[0].y };
    if (key === 'yardSnow') return { x: E.snow.x, y: E.snow.y - 10 };
    if (key === 'yardSand') return { x: E.sand.x + 4, y: E.sand.y - 12 };
    if (key === 'yardSeesaw') return { x: E.see.x, y: E.see.y - 12 };
    if (key === 'yardHop') { const c = hopCell(0); return { x: c.mx, y: c.my }; }
    if (key === 'yardTree') return { x: E.tree.x - 6, y: E.tree.y - 50 };
    if (key === 'yardWhistle') return { x: L.whistle.x + 18, y: L.whistle.y + 12 };
    return null;
  }
  function showHint(force, nag) {
    const key = nag ? 'yardWhistle' : hintList()[hintIdx++ % hintList().length];
    hint = { key, until: G.time + 6 };
    if (nag) idleNag = G.time;
    speak(owl(), LD.HINTS[key], 'tap');
    void force;
  }

  // ---------------------------------------------------------------- render
  function sortY(k) {
    if (k.st === 'held') return 9999;
    if (k.st === 'swing') return E.swing.y + 2;
    if (k.st === 'see') return E.see.y + 1;
    if (k.st === 'dig') return E.sand.y - 3;
    if (['climb', 'top', 'slideDown'].includes(k.st)) return E.slide.y + 1;
    return k.y;
  }
  function shadow(c, x, y, w) {
    c.fillStyle = wt === 'nieve' ? 'rgba(80,110,150,0.22)' : 'rgba(30,60,30,0.22)';
    c.fillRect(Math.round(x - w / 2), Math.round(y - 1), Math.round(w), 2);
    c.fillRect(Math.round(x - w / 2 + 2), Math.round(y - 2), Math.round(w - 4), 4);
  }
  function drawKid(c, k) {
    const s = k.s;
    const proxy = Object.create(s);
    proxy.mode = k.st === 'held' ? 'held' : k.go ? 'walk' : 'stand'; proxy.look = k.look;
    if (['climb', 'top', 'slideDown', 'swing', 'see', 'dig'].includes(k.st)) proxy.mode = 'stand';
    const { st, dx } = pose(proxy);
    if (k.st === 'swing' || k.st === 'see') { st.armL = st.armR = 'up'; }
    const img = S.student(s.kind, st);
    const f = kidFoot(k);
    let x = f.x - S.SW / 2 + dx, y = f.y - S.SH;
    if (k.st === 'held') y = (k.hy ?? f.y) - 10;
    if (k.st !== 'swing' && k.st !== 'see' && k.st !== 'held') shadow(c, k.x, k.y, 16);
    if (s.glowT > 0) D(c, glow(img, '#ffe36e', s.kind + JSON.stringify(st)), x - 2, y - 2);
    D(c, img, x, y);
    if (wt === 'nieve') { const ny = { bunny: 25, puppy: 25, turtle: 25, owl: 26, frog: 25 }[s.kind] ?? 25; D(c, scarf(s.kind), x + 6, y + ny); }
    if (wt === 'lluvia' && !['swing', 'see', 'climb', 'top', 'slideDown', 'held', 'dig', 'hopping', 'splash'].includes(k.st)) {
      const col = UMB[s.kind] || UMB_MORE[k.i % UMB_MORE.length];
      D(c, umbrellaImg(col), x + 10, y - 9);
    }
    if (s.bubble) D(c, S.bubbleImg(s.bubble.kind), x + 20, y - 6);
  }
  function render() {
    const c = V.ctx, { W, H } = V, t = G.time;
    if (bgKey !== W + 'x' + H + wt) buildBg();
    D(c, bg0, 0, 0);
    // sun + clouds
    if (wt === 'sol') { const sp = weatherPic('sol'); D(c, sp, Math.round(W * 0.47), 4 + Math.round(Math.sin(t * 0.8))); }
    const nC = wt === 'sol' ? 2 : 4, span = W + 60;
    for (let k = 0; k < nC; k++) {
      const x = ((t * (2 + k * 0.4) + k * span / nC) % span) - 40, y = 6 + ((k * 13) % 26);
      D(c, cloudImg(k % 2, wt === 'lluvia'), x, y);
    }
    D(c, bg1, 0, 0);
    drawDoor(c);
    // hopscotch glow when a number is said
    for (let i = 0; i < 8; i++) {
      const a = 1 - (t - hop.flash[i]) / 0.8; if (a <= 0) continue;
      const r = hopCell(i); c.globalAlpha = a * 0.6; R(c, r.x + 1, r.y + 1, r.w - 2, r.h - 2, '#fff6b8'); c.globalAlpha = 1;
    }
    // puddles
    if (wt === 'lluvia') for (const [i, p] of E.puddles.entries()) {
      c.fillStyle = '#5f8fc0'; ellFill(c, p.x, p.y, p.rx + 1, p.ry + 1); c.fillStyle = '#8fbfe8'; ellFill(c, p.x, p.y, p.rx, p.ry);
      R(c, p.x - p.rx + 4, p.y - 1, 6, 1, '#d6eeff'); R(c, p.x + 3, p.y + 1, 4, 1, '#bfe0f8');
      const f = (t * 1.3 + i * 0.37) % 1, rx = 1 + f * 5; c.globalAlpha = 1 - f; c.fillStyle = '#e6f4ff';
      const qx = p.x + Math.sin(i * 7 + Math.floor(t * 1.3 + i * 0.37) * 3) * (p.rx - 6);
      c.fillRect(Math.round(qx - rx), Math.round(p.y), Math.round(rx * 2), 1); c.globalAlpha = 1;
    }
    // y-sorted world
    const objs = [];
    objs.push({ y: E.tree.y, draw: () => {
      const sh = t - treeShake < 0.6 ? Math.round(Math.sin((t - treeShake) * 40) * 2) : 0;
      shadow(c, E.tree.x, E.tree.y, 40);
      D(c, treeImg(wt), E.tree.x - 35 + sh, E.tree.y - 84);
      for (const i of apples) { const [ax, ay] = APPLE_AT[i]; D(c, appleImg(), E.tree.x + ax - 3 + sh, E.tree.y + ay); }
    } });
    objs.push({ y: E.slide.y, draw: () => { shadow(c, E.slide.x + 30, E.slide.y, 56); D(c, slideImg(), E.slide.x, E.slide.y - 50); } });
    objs.push({ y: E.swing.y, draw: () => { shadow(c, E.swing.x, E.swing.y, 84); D(c, swingFrame(), E.swing.x - 45, E.swing.y - 56); } });
    objs.push({ y: E.swing.y + 1, draw: () => { // chains (behind whoever is swinging)
      swings.forEach((sw, i) => {
        const pv = pivot(i), sp = seatPos(i);
        for (const ox of [-8, 8]) { const ex = sp.x + ox * Math.cos(sw.a), ey = sp.y - ox * Math.sin(sw.a); for (let u = 0; u <= 1; u += 1 / 40) R(c, pv.x + ox * 0.75 + (ex - pv.x - ox * 0.75) * u, pv.y + (ey - pv.y) * u, 1, 1, Math.floor(u * 40) % 3 ? '#8a97a8' : '#c9d3df'); }
      });
    } });
    objs.push({ y: E.swing.y + 3, draw: () => swings.forEach((sw, i) => { const sp = seatPos(i); D(c, seatImg(), sp.x - 9, sp.y - 1); }) });
    objs.push({ y: E.sand.y - 26, draw: () => D(c, sandImg(wt === 'nieve'), E.sand.x - 35, E.sand.y - 26) });
    for (const cs of castles) objs.push({ y: E.sand.y - 12, draw: () => { const pop = G.time - cs.t < 0.3 ? -2 : 0; D(c, castleImg(cs.n), E.sand.x + cs.x - 6, E.sand.y - 20 + pop); } });
    objs.push({ y: E.sand.y, draw: () => D(c, sandFront(), E.sand.x - 35, E.sand.y - 7) });
    objs.push({ y: E.see.y, draw: () => { shadow(c, E.see.x, E.see.y, 70); D(c, seesawImg(Math.round(see.a / 0.05)), E.see.x - 42, E.see.y - 36); } });
    if (wt === 'nieve') objs.push({ y: E.snow.y, draw: () => { shadow(c, E.snow.x, E.snow.y, 26); const wob = snowStage >= 4 ? Math.round(Math.sin(t * 2) * 0.6) : 0; D(c, snowmanImg(snowStage), E.snow.x - 15 + wob, E.snow.y - 44); } });
    if (playBall()) objs.push({ y: ball.y, draw: () => { shadow(c, ball.x, ball.y, 9); D(c, ballImg(), ball.x - 6, ball.y - 12 - ball.z); } });
    for (const f of fallen) objs.push({ y: f.y, draw: () => { shadow(c, f.x, f.y, 6); D(c, appleImg(), f.x - 3, f.y - 8 - f.z); } });
    for (const k of kids) if (k.st !== 'gone') objs.push({ y: sortY(k), draw: () => drawKid(c, k) });
    objs.sort((a, b) => a.y - b.y);
    for (const o of objs) o.draw();
    for (const p of parts) {
      if (p.life - p.t < 0.25 && Math.floor(p.t * 20) % 2) continue;
      const img = S.particle(p.kind, p.color); D(c, img, p.x - img.width / 2, p.y - img.height / 2);
    }
    // weather in front
    if (wt === 'lluvia') {
      for (let k = 0; k < 46; k++) {
        const x = ((k * 37.3 + t * 30) % (W + 20)) - 10, y = ((k * 53.1 + t * 140) % (H + 20)) - 10;
        R(c, x, y, 1, 3, 'rgba(230,244,255,0.8)'); R(c, x - 1, y + 3, 1, 2, 'rgba(190,224,248,0.7)');
      }
    }
    if (wt === 'nieve') {
      for (let k = 0; k < 50; k++) {
        const x = ((k * 41.7 + Math.sin(t * 1.3 + k) * 4 + t * 4) % W + W) % W, y = ((k * 29.3 + t * (10 + (k % 4) * 3)) % (H + 4)) - 2;
        R(c, x, y, k % 3 ? 1 : 2, k % 3 ? 1 : 2, '#ffffff');
      }
    }
    // HUD: the whistle (big, glows when it's time to go back) and ?
    const nag = (hint && hint.key === 'yardWhistle') || (isOpen && t - lastInput > 90);
    const wb = L.whistle, bob = nag ? Math.round(Math.abs(Math.sin(t * 7)) * 2) : 0;
    if (!leaving) {
      if (nag) D(c, glow(btnFrame(wb.w, wb.h, '#fff6c8', 'w'), '#ffd23f', 'ywglow'), wb.x - 2, wb.y - 2 - bob);
      const pr = press && press.btn === 'whistle' ? 1 : 0;
      D(c, btnFrame(wb.w, wb.h, nag ? '#fff6c8' : '#fff3dc', 'w'), wb.x, wb.y - bob + pr);
      D(c, whistleIcon(), wb.x + 6, wb.y + 6 - bob + pr);
      const hb = L.help, hp = press && press.btn === 'help' ? 1 : 0;
      D(c, btnFrame(hb.w, hb.h), hb.x, hb.y + hp); D(c, S.bubble('q'), hb.x + 5, hb.y + 5 + hp);
    }
    if (hint && !leaving) { const pt = hintPt(hint.key); if (pt) drawHand(c, pt.x, pt.y); }
  }
  function ellFill(c, cx, cy, rx, ry) {
    for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry))); c.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1); }
  }

  // ---------------------------------------------------------------- debug hook for automated tests
  const css = (x, y) => [x * V.s / G.dpr, y * V.s / G.dpr];
  window.__ltYard = () => (isOpen || kids.length ? {
    open: isOpen, leaving: leaving ? leaving.stage : null, weather: wt, snowStage, castles: castles.length, hint: hint ? hint.key : null,
    kids: kids.map(k => ({ kind: k.s.kind, st: k.st, pt: css(kidFoot(k).x, kidFoot(k).y - 18) })),
    swings: swings.map(s => (s.kid ? { kind: s.kid.s.kind, amp: +s.amp.toFixed(2) } : null)), see: see.seats.map(k => k && k.st),
    pts: {
      swing: css(seatPos(0).x, seatPos(0).y - 4), swing1: css(seatPos(1).x, seatPos(1).y - 4), slide: css(E.slide.x + 40, E.slide.y - 16), sand: css(E.sand.x, E.sand.y - 12),
      seesaw: css(E.see.x, E.see.y - 10), hop: css(hopCell(2).mx, hopCell(2).my), tree: css(E.tree.x, E.tree.y - 55), ball: css(ball.x, ball.y - 6 - ball.z),
      puddle: css(E.puddles[0].x, E.puddles[0].y), snow: css(E.snow.x, E.snow.y - 14), whistle: css(L.whistle.x + 17, L.whistle.y + 15), help: css(L.help.x + 13, L.help.y + 13),
      empty: css(V.W * 0.5, L.gy + 6),
    },
    setWeather(id) { G.save.weather = { day: G.save.day || 1, w: id }; wt = weatherNow(); bgKey = ''; apples = wt === 'nieve' ? [] : [0, 1, 2]; snowStage = 0; for (const k of kids) if (k.st !== 'gone' && !k.leaving) idle(k, 0.2); },
    whistle,
  } : null);

  return {
    resize, update, render, down, move, up, open,
    get view() { return V; }, get isOpen() { return isOpen; },
    get musicTrack() { return 'recess'; },
  };
}
