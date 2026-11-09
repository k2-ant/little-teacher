// Decorations, desk supplies, paint swatches and the teacher (Louise) sprite.
import { Pix, cached, darken, lighten } from './raster.js';
import { INK, heartPix, starPix } from './sprites.js';

// ------------------------------------------------------------------ catalog
// layer: floor items stand on the floor (anchor = bottom centre), wall items hang on the wall.
export const DECOR = {
  beanbag: { layer: 'floor', w: 28, h: 20, variants: ['#ff8fb8', '#7ec8ff', '#ffd23f', '#8fd67a', '#c9a2ff'] },
  teddy: { layer: 'floor', w: 20, h: 24, variants: ['#c58b5a', '#ffb3c6', '#f6efe1'] },
  toybox: { layer: 'floor', w: 28, h: 24, variants: ['#ef6f6c', '#64a8e8', '#7dd370'] },
  easel: { layer: 'floor', w: 24, h: 40, variants: ['heart', 'sun', 'flower'] },
  fishtank: { layer: 'floor', w: 30, h: 36, variants: ['#ffa65c', '#ff8fb8', '#ffd23f'] },
  globe: { layer: 'floor', w: 18, h: 28, variants: ['#64a8e8'] },
  flowers: { layer: 'floor', w: 16, h: 24, variants: ['#ff6f91', '#ffd23f', '#b48be6', '#ffffff'] },
  balloons: { layer: 'floor', w: 24, h: 46, variants: [['#ef6f6c', '#ffd23f', '#64a8e8'], ['#ff8fb8', '#c9a2ff', '#ffffff'], ['#7dd370', '#ffa65c', '#7ec8ff']] },
  lamp: { layer: 'floor', w: 16, h: 42, variants: ['#ffd23f', '#ff9ec4', '#9fd8ff'] },
  rainbow: { layer: 'wall', w: 34, h: 20, variants: [0] },
  poster: { layer: 'wall', w: 24, h: 30, variants: ['#ffd8e4', '#d6f0ff', '#fff0b8'] },
  frame: { layer: 'wall', w: 22, h: 22, variants: ['heart', 'star', 'flower'] },
  butterflies: { layer: 'wall', w: 30, h: 18, variants: [['#ff9ec4', '#b48be6', '#ffd23f'], ['#7ec8ff', '#7dd370', '#ffa65c']] },
  garland: { layer: 'wall', w: 48, h: 16, variants: [['#ffd23f'], ['#ff9ec4', '#ffd23f', '#7ec8ff']] },
  sun: { layer: 'wall', w: 22, h: 22, variants: [0] },
  moon: { layer: 'wall', w: 18, h: 18, variants: [0] },
  clock: { layer: 'wall', w: 19, h: 19, variants: ['#ef6f6c', '#64a8e8', '#7dd370'] },
  // learning areas (always in the room, can be moved)
  abc: { layer: 'wall', w: 48, h: 34, variants: [0] },
  calendar: { layer: 'wall', w: 26, h: 28, variants: [0] },
  shapetable: { layer: 'floor', w: 34, h: 26, variants: [0] },
};
export const FLOOR_ITEMS = ['beanbag', 'teddy', 'toybox', 'easel', 'fishtank', 'globe', 'flowers', 'balloons', 'lamp'];
export const WALL_ITEMS = ['rainbow', 'poster', 'frame', 'butterflies', 'garland', 'sun', 'moon', 'clock'];
export const DESK_ITEMS = ['apple', 'pencils', 'books', 'crayons', 'cactus', 'snowglobe'];

export const WALLS = [
  ['#f7e6c4', '#f2dcb3'], ['#ffe6ee', '#fbd6e2'], ['#e0f4e6', '#d0ebd9'], ['#ece3fb', '#e0d4f7'], ['#dff0ff', '#cee6fb'], ['#fff3b8', '#fbe89a'],
];
export const FLOORS = [
  ['#dcab70', '#d7a46a', '#bd8650'], ['#b9814f', '#b07a4a', '#94613a'], ['#efd7ac', '#e9cf9f', '#cfb184'], ['#f6c8d4', '#f2bccb', '#dc9eb0'], ['#bfe3f2', '#b3dbec', '#8fc2d8'],
];
export const RUGS = [
  ['#e8738a', '#ffd166', '#6cc2b8', '#fff6e6', '#b892e0'],
  ['#64a8e8', '#bfe6ff', '#7dd370', '#fffaf0', '#ffd23f'],
  ['#b48be6', '#ffb3d1', '#fff2a0', '#ffffff', '#ff8fb8'],
  ['#7dd370', '#ffd23f', '#ffa65c', '#fff6e6', '#ef6f6c'],
];

const mk = (key, w, h, draw) => cached(key, () => { const p = new Pix(w, h); draw(p); p.outline(); return p.canvas(); });

export function decor(type, v = 0) {
  const def = DECOR[type];
  const val = def.variants[v % def.variants.length];
  return mk('dec' + type + v, def.w, def.h, p => DRAW[type](p, val, def));
}

const DRAW = {
  beanbag(p, c) {
    p.ball(14, 12, 13, 7.6, c); p.ball(14, 7.5, 8.5, 5, lighten(c, 0.15));
    p.ell(14, 8, 5, 2.6, darken(c, 0.12), null, true);
    p.px(6, 9, lighten(c, 0.6)); p.px(7, 8, lighten(c, 0.6));
  },
  teddy(p, c) {
    const s = darken(c, 0.2), m = lighten(c, 0.5);
    p.ball(5, 20, 3.4, 2.6, c); p.ball(15, 20, 3.4, 2.6, c);
    p.ball(10, 15, 6.5, 6.2, c); p.ell(10, 16, 3.6, 3.6, m, null, true);
    p.ball(3.5, 13, 2.6, 3.4, c); p.ball(16.5, 13, 2.6, 3.4, c);
    p.ball(4.5, 2.8, 2.4, 2.4, c); p.ball(15.5, 2.8, 2.4, 2.4, c); p.px(4, 2, s); p.px(15, 2, s);
    p.ball(10, 6.5, 6.4, 5.6, c);
    p.ell(10, 8.4, 2.6, 1.8, m);
    p.px(7, 6, INK); p.px(12, 6, INK); p.px(9, 8, INK); p.px(10, 8, INK); p.px(10, 9, INK);
    p.rect(7, 11, 6, 1, '#ef6f6c'); p.px(10, 12, '#ef6f6c');
  },
  toybox(p, c) {
    p.ball(7, 8, 4.5, 4.5, '#ffd23f'); p.rect(15, 2, 7, 7, '#7dd370'); p.rect(16, 3, 5, 5, '#a6e69a');
    p.line(10, 1, 12, 8, '#ff8fb8'); p.ball(11.5, 1.6, 1.6, 1.6, '#ff8fb8');
    p.rect(1, 9, 26, 15, c); p.rect(1, 9, 26, 2, lighten(c, 0.35)); p.rect(1, 22, 26, 2, darken(c, 0.25));
    starPix(p, 9, 12, '#ffffff', '#ffffff');
  },
  easel(p, v) {
    p.line(4, 39, 10, 2, '#a8703f'); p.line(20, 39, 14, 2, '#a8703f'); p.line(12, 4, 12, 39, '#8a5730');
    p.rect(3, 28, 18, 2, '#c98c55');
    p.rect(3, 6, 18, 21, '#fffaf0'); p.hline(3, 20, 6, '#ffffff');
    if (v === 'heart') heartPix(p, 7, 12);
    if (v === 'sun') { p.ball(12, 16, 4, 4, '#ffd23f'); for (let a = 0; a < 8; a++) p.px(12 + Math.cos(a * .785) * 6.5, 16 + Math.sin(a * .785) * 6.5, '#ffb020'); }
    if (v === 'flower') { for (let a = 0; a < 5; a++) p.ell(12 + Math.cos(a * 1.257) * 3, 14 + Math.sin(a * 1.257) * 3, 2, 2, '#ff8fb8'); p.ell(12, 14, 1.4, 1.4, '#ffd23f'); p.vline(12, 17, 25, '#4fae45'); }
  },
  fishtank(p, c) {
    p.rect(3, 22, 24, 14, '#a8703f'); p.rect(3, 22, 24, 2, '#c98c55'); p.rect(5, 26, 20, 8, '#8a5730');
    p.rect(1, 2, 28, 20, '#bfe9ff'); p.rect(2, 3, 26, 18, '#7fd0f5'); p.rect(2, 3, 26, 3, '#bfe9ff');
    p.rect(2, 18, 26, 3, '#f3dc9c');
    for (const x of [6, 23]) for (let y = 11; y < 18; y++) p.px(x + (y % 3 === 0 ? 1 : 0), y, '#4fae45');
    p.ball(13, 11, 3.6, 2.6, c); for (let i = 0; i < 3; i++) p.vline(17 + i, 11 - i, 11 + i, darken(c, 0.15)); p.px(11, 10, INK);
    p.px(20, 7, '#ffffff'); p.px(19, 5, '#ffffff'); p.rect(0, 1, 30, 1, '#6f7b8f');
  },
  globe(p) {
    p.rect(5, 25, 8, 3, '#a8703f'); p.vline(9, 18, 25, '#c98c55');
    p.ball(9, 10, 7.6, 7.6, '#64a8e8');
    p.ell(6, 8, 2.6, 3.2, '#7dd370', null, true); p.ell(12, 12, 2.4, 2, '#7dd370', null, true); p.ell(11, 5, 1.6, 1, '#7dd370', null, true);
    for (let a = 0.8; a < 3.6; a += 0.15) p.px(9 + Math.cos(a) * 9, 10 - Math.sin(a) * 9 + 1, '#ffd23f');
  },
  flowers(p, c) {
    for (const [x, y] of [[4, 6], [8, 3], [12, 6]]) { p.vline(x, y + 2, 15, '#4fae45'); p.ball(x, y, 2.6, 2.6, c); p.px(x, y, '#ffd23f'); }
    p.ell(3, 12, 2, 1, '#6cc44f'); p.ell(13, 11, 2, 1, '#6cc44f');
    for (let y = 15; y < 24; y++) p.hline(2 + Math.floor((y - 15) / 4), 13 - Math.floor((y - 15) / 4), y, y < 17 ? '#7ec8ff' : '#64a8e8');
  },
  balloons(p, cs) {
    p.line(12, 45, 6, 14, '#a99caa'); p.line(12, 45, 12, 12, '#a99caa'); p.line(12, 45, 18, 15, '#a99caa');
    p.rect(9, 41, 6, 5, '#a8703f');
    [[6, 8], [18, 9], [12, 6]].forEach(([x, y], i) => { p.ball(x, y, 5, 6, cs[i]); p.px(x, y + 6, darken(cs[i], 0.2)); });
  },
  lamp(p, c) {
    p.rect(3, 39, 10, 3, '#7f8ca3'); p.vline(8, 12, 39, '#9aa7b8');
    for (let y = 0; y < 12; y++) p.hline(4 - Math.floor(y / 4), 11 + Math.floor(y / 4), y, y < 2 ? lighten(c, 0.4) : c);
    p.hline(1, 14, 11, darken(c, 0.2));
  },
  rainbow(p) {
    ['#ef6f6c', '#ffa65c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'].forEach((c, i) => p.ell(17, 19, 16 - i * 2, 16 - i * 2, c, { y1: 18 }));
    p.ell(17, 19, 4, 4, 0, { y1: 18 });
    p.ball(4, 17, 4, 2.6, '#ffffff', { hi: false }); p.ball(30, 17, 4, 2.6, '#ffffff', { hi: false });
  },
  poster(p, c) {
    p.rect(0, 0, 24, 30, c); p.rect(0, 29, 24, 1, darken(c, 0.2));
    p.ball(7, 8, 4, 4, '#ef6f6c'); p.rect(14, 4, 7, 7, '#64a8e8');
    for (let i = 0; i < 7; i++) p.hline(7 - Math.floor(i / 1.4) + 0, 7 + Math.floor(i / 1.4), 15 + i, '#7dd370');
    starPix(p, 12, 16, '#ffd23f');
    p.ell(12, 0.5, 1.5, 1.5, '#ef6f6c');
  },
  frame(p, v) {
    p.rect(0, 0, 22, 22, '#d6a35c'); p.rect(2, 2, 18, 18, '#fffaf0'); p.hline(0, 21, 0, '#f0c98a');
    if (v === 'heart') heartPix(p, 6, 7);
    if (v === 'star') starPix(p, 5, 6);
    if (v === 'flower') { for (let a = 0; a < 5; a++) p.ell(11 + Math.cos(a * 1.257) * 3.4, 10 + Math.sin(a * 1.257) * 3.4, 2.2, 2.2, '#b48be6'); p.ell(11, 10, 1.6, 1.6, '#ffd23f'); }
  },
  butterflies(p, cs) {
    [[6, 6], [16, 11], [25, 5]].forEach(([x, y], i) => {
      const c = cs[i];
      p.ball(x - 2.6, y - 1, 2.6, 2.8, c, { hi: false }); p.ball(x + 3.6, y - 1, 2.6, 2.8, c, { hi: false });
      p.ball(x - 1.8, y + 3, 1.8, 1.8, lighten(c, 0.3), { hi: false }); p.ball(x + 2.8, y + 3, 1.8, 1.8, lighten(c, 0.3), { hi: false });
      p.vline(x, y - 2, y + 4, INK); p.vline(x + 1, y - 2, y + 4, INK); p.px(x - 1, y - 4, INK); p.px(x + 2, y - 4, INK);
    });
  },
  garland(p, cs) {
    for (let x = 0; x < 48; x++) p.px(x, 2 + Math.round(Math.sin(x / 48 * Math.PI) * 4), '#5f8f4a');
    for (let k = 0; k < 6; k++) {
      const x = 4 + k * 8, y = 4 + Math.round(Math.sin(x / 48 * Math.PI) * 4), c = cs[k % cs.length];
      p.map(x - 3, y, ['...#...', '..###..', '#######', '.#####.', '.##.##.', '#.....#'], { '#': c }); p.px(x, y + 2, '#ffffff');
    }
  },
  sun(p) {
    for (let a = 0; a < 12; a++) { const ang = a * Math.PI / 6; p.line(11 + Math.cos(ang) * 6, 11 + Math.sin(ang) * 6, 11 + Math.cos(ang) * 10, 11 + Math.sin(ang) * 10, '#ffb020'); }
    p.ball(11, 11, 6.4, 6.4, '#ffd23f');
    p.px(9, 10, INK); p.px(13, 10, INK); p.px(10, 13, INK); p.px(11, 14, INK); p.px(12, 13, INK); p.px(8, 12, '#ff9fb4'); p.px(14, 12, '#ff9fb4');
  },
  clock(p, c) {
    p.ell(9.5, 9.5, 9.5, 9.5, c); p.ell(9.5, 9.5, 7.6, 7.6, '#fffaf0');
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; p.px(9.5 + Math.cos(a) * 6.4 - 0.5, 9.5 + Math.sin(a) * 6.4 - 0.5, k % 3 ? '#d8c7a8' : '#7a5b6a'); }
    p.px(7, 4, '#ffffff'); p.px(6, 5, '#ffffff');
  },
  abc(p) {
    p.rect(0, 0, 48, 34, '#a8703f'); p.hline(0, 47, 0, '#c98c55'); p.rect(2, 2, 44, 30, '#2f6a4f'); p.rect(2, 2, 44, 1, '#3f8a66');
    const F = { A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'] };
    ['A', 'B', 'C'].forEach((ch, i) => p.map(8 + i * 12, 5, F[ch], { '#': ['#ff8f8f', '#ffe066', '#8fd0ff'][i] }, 2));
    ['1', '2', '3'].forEach((ch, i) => p.map(10 + i * 11, 20, F[ch], { '#': ['#a6e69a', '#ffb3d1', '#d5b8ff'][i] }, 2));
    p.rect(30, 30, 8, 2, '#ffffff'); p.rect(12, 32, 24, 2, '#8a5730');
  },
  calendar(p) {
    p.rect(0, 2, 26, 26, '#fffaf0'); p.rect(0, 27, 26, 1, '#d8c7a8');
    p.rect(0, 2, 26, 6, '#ef6f6c'); p.rect(0, 2, 26, 1, '#ff9a9a');
    for (const x of [6, 19]) { p.rect(x, 0, 2, 5, '#9aa7b8'); p.px(x, 0, '#d6dee8'); }
    p.hline(2, 23, 25, '#efe6d8');
  },
  shapetable(p) {
    p.rect(4, 14, 2, 12, '#a8703f'); p.rect(28, 14, 2, 12, '#a8703f');
    p.ell(17, 13, 16.5, 5.5, '#8fd0c8'); p.ell(17, 12, 16, 4.6, '#b8e6e0');
    p.ball(8, 8, 3.6, 3.6, '#ef6f6c'); p.rect(14, 5, 6, 6, '#64a8e8'); p.rect(15, 6, 4, 1, '#9fd0ff');
    for (let i = 0; i < 6; i++) p.hline(26 - Math.floor(i / 1.4), 26 + Math.floor(i / 1.4), 5 + i, '#ffd23f');
    p.rect(9, 12, 8, 3, '#b48be6'); p.ell(23, 13, 3, 1.6, '#7dd370');
  },
  moon(p) {
    p.ball(9, 9, 8, 8, '#ffe58a'); p.ell(13, 6, 6.4, 6.4, 0);
    p.px(5, 9, INK); p.px(6, 12, '#ff9fb4');
    p.px(15, 14, '#ffd23f'); p.px(16, 13, '#ffd23f');
  },
};

// ------------------------------------------------------------------ desk supplies (12x10, sits on the desk top)
export function deskItem(id) {
  return mk('di' + id, 14, 12, p => {
    if (id === 'apple') { p.ball(7, 7, 4.5, 4, '#ef4b4b'); p.px(7, 2, '#7a4a2a'); p.ell(9.5, 2.2, 1.6, 0.9, '#6cc44f'); }
    if (id === 'pencils') { p.rect(3, 5, 8, 7, '#64a8e8'); p.rect(3, 5, 8, 1, '#9fd0ff'); p.vline(4, 1, 4, '#ffd23f'); p.vline(7, 0, 4, '#ef6f6c'); p.vline(9, 2, 4, '#7dd370'); p.px(4, 0, INK); p.px(9, 1, INK); }
    if (id === 'books') { p.rect(1, 8, 12, 3, '#ef6f6c'); p.rect(2, 5, 10, 3, '#64a8e8'); p.rect(3, 2, 9, 3, '#ffd23f'); p.hline(2, 11, 5, '#9fd0ff'); }
    if (id === 'crayons') { p.rect(2, 4, 10, 7, '#ffd23f'); p.rect(2, 7, 10, 2, '#7dd370'); for (const [x, c] of [[3, '#ef4b4b'], [5, '#64a8e8'], [7, '#b48be6'], [9, '#ff9a1f']]) { p.vline(x, 1, 3, c); p.px(x, 0, darken(c, 0.2)); } }
    if (id === 'cactus') { p.rect(4, 8, 6, 4, '#e0805a'); p.rect(6, 1, 3, 7, '#62b95e'); p.rect(4, 4, 2, 3, '#62b95e'); p.rect(9, 3, 2, 3, '#62b95e'); p.px(7, 0, '#ff8fb8'); }
    if (id === 'snowglobe') { p.rect(3, 9, 8, 3, '#a8703f'); p.ball(7, 5.5, 4.5, 4.5, '#d6f0ff'); p.rect(5, 6, 4, 3, '#ffffff'); p.px(6, 5, '#ef6f6c'); p.px(9, 3, '#ffffff'); p.px(5, 3, '#ffffff'); }
  });
}

// ------------------------------------------------------------------ the teacher: Louise
// long light-brown hair with a yellow clip, big toothy grin, blue top with a white
// petal collar and puffy sleeves, and a yellow tulle skirt.
export const TW = 30, TH = 56;
const SKIN = '#f6d2b8', SKIN_S = '#e7b799', HAIR = '#8f6142', HAIR_HI = '#b07b52', HAIR_S = '#6b4530';
const TOP = '#86b2ea', TOP_S = '#6c97d2', SLEEVE = '#cfe0f7', RED = '#e8505b', GOLD = '#e8b84a';
const SKIRT = '#fbe7a1', SKIRT_S = '#ecd27e', SKIRT_HI = '#fff6cf';

export function teacher(st) {
  const key = 'teacher' + [st.eyes, st.mouth, st.armL, st.armR, st.feet | 0, st.sway | 0].join(',');
  return cached(key, () => {
    const p = new Pix(TW, TH);
    const sw = st.sway | 0;
    // hair (back layer) - long, past the shoulders
    p.ell(15, 22, 11, 16, HAIR, { y1: 38 });
    p.ell(15 + sw * 0.5, 30, 10.5, 9, HAIR, { y0: 26, y1: 39 });
    for (const x of [7, 10, 20, 23]) p.vline(x + (x > 15 ? sw : 0), 22, 36, HAIR_S);
    // legs + shoes
    const lift = [st.feet === 1 ? 1 : 0, st.feet === 2 ? 1 : 0];
    p.rect(11, 47, 3, 6 - lift[0], SKIN); p.rect(16, 47, 3, 6 - lift[1], SKIN);
    p.rect(11, 51 - lift[0], 3, 2, '#ffffff'); p.rect(16, 51 - lift[1], 3, 2, '#ffffff');
    p.rect(10, 53 - lift[0], 5, 2, '#f5a9c0'); p.rect(15, 53 - lift[1], 5, 2, '#f5a9c0');
    // tulle skirt
    for (let y = 35; y < 49; y++) {
      const half = 6 + Math.floor((y - 35) * 0.62);
      p.hline(15 - half, 14 + half, y, y % 3 === 0 ? SKIRT_S : SKIRT);
    }
    for (const [x, y] of [[9, 40], [14, 43], [20, 39], [18, 46], [11, 46], [23, 45]]) p.px(x, y, SKIRT_HI);
    p.hline(6, 23, 48, SKIRT_S);
    // arms behind (raised arms are drawn before the body)
    const arm = (side, pose, phase) => {
      const mr = side === 'R';
      const R = (x, y, w, h, c = SKIN) => p.rect(mr ? 30 - x - w : x, y, w, h, c);
      const Ln = (x0, y0, x1, y1) => { p.line(mr ? 29 - x0 : x0, y0, mr ? 29 - x1 : x1, y1, SKIN); p.line(mr ? 28 - x0 : x0 + 1, y0, mr ? 28 - x1 : x1 + 1, y1, SKIN); };
      const up = pose === 'up' || pose === 'wave1' || pose === 'wave2' || pose === 'point';
      if ((phase === 'back') !== up) return;
      if (pose === 'down') { R(5, 30, 3, 7); R(5, 36, 3, 1, SKIN_S); }
      if (pose === 'front') { Ln(6, 30, 10, 34); R(10, 33, 3, 2); }
      if (pose === 'clap') { Ln(6, 30, 12, 33); R(12, 31, 3, 3); }
      if (pose === 'up') { R(4, 15, 2, 12); R(3, 12, 3, 4); }
      if (pose === 'wave1') { Ln(5, 28, 2, 17); R(1, 13, 3, 4); }
      if (pose === 'wave2') { Ln(6, 28, 5, 17); R(4, 13, 3, 4); }
      if (pose === 'point') { Ln(5, 28, 1, 23); R(0, 21, 2, 2); }
    };
    arm('L', st.armL, 'back'); arm('R', st.armR, 'back');
    // bodice
    p.rect(10, 26, 10, 10, TOP); p.vline(10, 26, 35, TOP_S); p.vline(19, 26, 35, TOP_S);
    p.hline(10, 19, 35, TOP_S);
    // white petal collar
    p.hline(10, 19, 25, '#ffffff'); p.hline(10, 19, 26, '#ffffff');
    for (const x of [10, 12, 14, 16, 18]) { p.px(x, 27, '#ffffff'); p.px(x + 1, 27, '#ffffff'); p.px(x + 0.5, 28, '#ffffff'); }
    p.px(10, 28, '#ffffff'); p.px(18, 28, '#ffffff');
    // puff sleeves with red panels + gold trim
    for (const cx of [8, 22]) {
      p.ball(cx, 27.5, 3.4, 3, SLEEVE, { hi: false });
      p.ell(cx + (cx < 15 ? -1 : 1), 27, 1.3, 1.8, RED, null, true);
      p.hline(cx - 3, cx + 2, 30, GOLD);
    }
    p.rect(13, 23, 4, 3, SKIN); // neck
    // head
    p.ball(15, 14, 9.6, 9.2, SKIN, { shadow: SKIN_S, hi: false });
    // hair on top + bangs swept to one side
    p.ell(15, 9, 10.4, 6.6, HAIR, { y1: 10 });
    p.ell(15, 11, 10.6, 6, HAIR, { y1: 7 });
    p.hline(6, 13, 8, HAIR); p.hline(6, 11, 9, HAIR); p.hline(6, 9, 10, HAIR); p.px(6, 11, HAIR);
    p.hline(19, 24, 8, HAIR); p.hline(21, 24, 9, HAIR); p.hline(22, 24, 10, HAIR);
    for (let y = 9; y < 22; y++) { p.px(5, y, HAIR); p.px(6, y + 2, HAIR); p.px(24, y, HAIR); p.px(25, y, HAIR); }
    p.vline(4, 14, 22, HAIR); p.vline(26, 13, 22, HAIR);
    p.hline(10, 17, 3, HAIR_HI); p.hline(18, 21, 4, HAIR_HI); p.px(8, 5, HAIR_HI);
    p.vline(25, 12, 20, HAIR_HI);
    // yellow hair clip
    p.rect(7, 9, 2, 3, '#ffd23f'); p.px(7, 9, '#fff2a0'); p.px(8, 12, '#e0a820');
    // face
    const e = st.eyes || 'happy';
    const eyeC = '#3a2a24';
    for (const x of [10, 18]) {
      if (e === 'open') { p.rect(x, 13, 2, 3, eyeC); p.px(x, 13, '#ffffff'); }
      else if (e === 'blink') p.hline(x - 1, x + 2, 15, eyeC);
      else { p.px(x - 1, 15, eyeC); p.px(x, 14, eyeC); p.px(x + 1, 14, eyeC); p.px(x + 2, 15, eyeC); } // squinty smile eyes
      p.hline(x - 1, x + 2, 11, HAIR_S); // brows
    }
    p.px(7, 17, '#ff9fb4'); p.px(8, 17, '#ff9fb4'); p.px(21, 17, '#ff9fb4'); p.px(22, 17, '#ff9fb4');
    p.px(14, 16, SKIN_S); // nose
    const m = st.mouth || 'grin';
    if (m === 'grin') { // big toothy smile
      p.hline(11, 18, 18, eyeC); p.hline(11, 18, 19, '#ffffff'); p.hline(12, 17, 20, '#ffffff'); p.px(11, 20, eyeC); p.px(18, 20, eyeC); p.hline(12, 17, 21, eyeC);
      p.px(10, 18, eyeC); p.px(19, 18, eyeC);
    } else if (m === 'open') {
      p.hline(12, 17, 18, eyeC); p.hline(12, 17, 19, '#ffffff'); p.rect(12, 20, 6, 1, '#c94f6a'); p.hline(13, 16, 21, eyeC); p.px(11, 19, eyeC); p.px(18, 19, eyeC);
    } else { p.px(12, 18, eyeC); p.hline(13, 16, 19, eyeC); p.px(17, 18, eyeC); }
    arm('L', st.armL, 'front'); arm('R', st.armR, 'front');
    p.outline();
    return p.canvas();
  });
}

// ------------------------------------------------------------------ small UI icons for the decorate tray
export function trayIcon(name) {
  return mk('tray' + name, 18, 18, p => {
    if (name === 'paint') { p.rect(3, 2, 12, 6, '#ff8fb8'); p.rect(3, 2, 12, 2, '#ffc0d6'); p.rect(14, 4, 2, 5, '#9aa7b8'); p.rect(8, 8, 8, 1, '#9aa7b8'); p.rect(8, 9, 2, 7, '#a8703f'); }
    if (name === 'floor') { const c = '#ff8fb8'; p.ball(9, 11, 8, 5, c); p.ball(9, 7.5, 5, 3, lighten(c, 0.2)); }
    if (name === 'wall') { p.rect(2, 2, 14, 14, '#d6a35c'); p.rect(4, 4, 10, 10, '#fffaf0'); heartPix(p, 5, 6); }
    if (name === 'desk') { p.ball(9, 10, 6, 5.4, '#ef4b4b'); p.px(9, 3, '#7a4a2a'); p.ell(12, 3.5, 2, 1, '#6cc44f'); }
    if (name === 'decorate') { // rainbow paintbrush
      ['#ef6f6c', '#ffa65c', '#ffd23f', '#7dd370', '#64a8e8'].forEach((c, i) => { for (let x = 1; x < 11; x++) p.px(x, 13 - i + Math.round(Math.sin(x / 2) * 1), c); });
      p.line(10, 9, 16, 2, '#a8703f'); p.line(11, 9, 17, 2, '#c98c55'); p.rect(8, 9, 3, 3, '#9aa7b8'); p.rect(6, 11, 3, 3, '#ff8fb8');
      return;
    }
    if (name === 'decorateOld') { p.rect(2, 3, 11, 6, '#ffd23f'); p.rect(2, 3, 11, 2, '#fff2a0'); p.rect(12, 5, 3, 1, '#9aa7b8'); p.rect(14, 5, 1, 5, '#9aa7b8'); p.rect(7, 10, 8, 1, '#9aa7b8'); p.rect(7, 11, 3, 6, '#ef6f6c'); p.px(3, 10, '#ff8fb8'); p.px(4, 12, '#7ec8ff'); p.px(2, 14, '#7dd370'); }
    if (name === 'cardGreen' || name === 'cardRed') {
      const c = name === 'cardGreen' ? '#3cb44b' : '#ef4b4b';
      p.rect(4, 1, 11, 16, darken(c, 0.25)); p.rect(5, 2, 9, 14, c); p.rect(6, 3, 3, 6, lighten(c, 0.45)); p.px(12, 13, lighten(c, 0.3));
      if (name === 'cardGreen') { p.px(9, 10, '#ffffff'); p.px(10, 11, '#ffffff'); p.px(11, 10, '#ffffff'); p.px(12, 9, '#ffffff'); }
    }
    if (name === 'palette') {
      p.ball(9, 10, 8, 6.5, '#e8b06a', { hi: false }); p.ell(12, 13, 2, 1.6, 0);
      for (const [x, y, c] of [[5, 8, '#ef4b4b'], [8, 6, '#ffd23f'], [12, 6, '#3cb44b'], [15, 9, '#2f7de1']]) p.ball(x, y, 1.6, 1.6, c, { hi: false });
      p.line(13, 16, 17, 11, '#a8703f');
    }
    if (name === 'aa') { p.rect(1, 2, 16, 14, '#fffaf0'); p.map(3, 5, ['.#.', '#.#', '###', '#.#', '#.#'], { '#': '#ef5b5b' }, 2); p.map(10, 9, ['.##', '#.#', '.##'], { '#': '#2f7de1' }, 2); }
    if (name === 'centros') { // a little pocket chart with four stations
      p.rect(0, 1, 18, 16, '#5f86b8'); p.rect(1, 2, 16, 14, '#dfeefc');
      const cs = ['#ef6f6c', '#64a8e8', '#ffd23f', '#7dd370'];
      cs.forEach((c, i) => { const x = 2 + i * 4; p.rect(x, 3, 3, 3, c); p.rect(x, 8, 3, 3, '#fff4ee'); p.px(x + 1, 9, '#2b1d2e'); p.rect(x, 12, 3, 1, '#c9dff2'); });
    }
    if (name === 'bell') { p.ball(9, 9, 6, 6.5, '#ffd23f', { clip: { y1: 12 } }); p.rect(2, 12, 14, 2, '#e0a820'); p.ball(9, 15, 1.6, 1.6, '#a8703f'); p.rect(8, 1, 2, 2, '#a8703f'); }
  });
}
export function trash(open) {
  return mk('trash' + open, 26, 30, p => {
    const body = '#7fb7e0', dark = '#4f86b8';
    for (let y = 9; y < 30; y++) { const inset = Math.floor((y - 9) / 7); p.hline(3 + inset, 22 - inset, y, y % 5 === 0 ? dark : body); }
    for (const x of [8, 13, 18]) p.vline(x, 12, 26, dark);
    if (open) { p.line(2, 7, 16, 0, '#5f96c8'); p.line(2, 8, 17, 1, '#5f96c8'); p.line(3, 8, 17, 2, '#5f96c8'); p.rect(14, 0, 3, 2, '#3f6f9a'); }
    else { p.rect(1, 6, 24, 3, '#5f96c8'); p.rect(10, 4, 6, 2, '#3f6f9a'); }
    p.px(6, 13, '#bfe0f5'); p.px(6, 14, '#bfe0f5'); p.px(6, 15, '#bfe0f5');
  });
}
export function hand() {
  return mk('hand', 16, 18, p => {
    const S = '#f6d2b8', SS = '#e7b799';
    p.rect(1, 1, 3, 9, S); p.px(1, 1, '#fff2e8');               // pointing finger (tip at top-left)
    p.rect(3, 6, 9, 7, S); p.rect(4, 5, 2, 2, S); p.rect(7, 5, 2, 2, S); p.rect(10, 6, 2, 2, S);
    p.hline(4, 11, 12, SS); p.px(6, 7, SS); p.px(9, 7, SS);
    p.rect(4, 13, 9, 4, '#86b2ea'); p.hline(4, 12, 13, '#cfe0f7');   // sleeve like Louise's
  });
}
export function swatch(kind, i) {
  return mk('sw' + kind + i, 18, 18, p => {
    if (kind === 'wall') { const [a, b] = WALLS[i]; p.rect(1, 1, 16, 16, a); for (let x = 2; x < 17; x += 4) p.rect(x, 1, 2, 16, b); }
    else { const [a, b, s] = FLOORS[i]; for (let y = 1; y < 17; y += 4) { p.rect(1, y, 16, 4, (y >> 2) % 2 ? a : b); p.hline(1, 16, y + 3, s); } }
  });
}
