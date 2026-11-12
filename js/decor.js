// Decorations, desk supplies, paint swatches and the teacher (Louise) sprite.
import { Pix, cached, darken, lighten } from './raster.js';
import { G } from './state.js';
import { INK, heartPix, starPix } from './sprites.js';
import { pixelText } from './schoolfont.js';
/** chalk a word onto a Pix in the round school letters (crisp pixels), its left/top at x, y */
function chalkText(p, text, col, h, x, y) {
  const cv = pixelText(text, col, h), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  for (let j = 0; j < cv.height; j++) for (let i = 0; i < cv.width; i++) if (d[(j * cv.width + i) * 4 + 3]) p.px(x + i, y + j, col);
  return cv.width;
}

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
  // v1.9: surprises that arrive in a parcel at the door (not in the tray; unlocked + placed when delivered)
  dino: { layer: 'floor', w: 28, h: 24, variants: ['#7dd370', '#ff9ec4', '#7ec8ff'], parcel: true },
  robot: { layer: 'floor', w: 20, h: 30, variants: ['#9fb4cc', '#ffd23f', '#ff9ec4'], parcel: true },
  rocket: { layer: 'floor', w: 18, h: 36, variants: ['#ef6f6c', '#64a8e8', '#b48be6'], parcel: true },
  // v2.0 decorating: bigger things for the room (frames: animated, drawn per frame)
  teepee: { layer: 'floor', w: 40, h: 44, variants: [['#ff9ec4', '#fffaf0'], ['#7ec8ff', '#fffaf0'], ['#b48be6', '#fff2a0'], ['#7dd370', '#fffaf0']] },
  hamster: { layer: 'floor', w: 30, h: 32, variants: ['#7ec8ff', '#ff9ec4', '#7dd370'], frames: 4 },
  cubbies: { layer: 'floor', w: 44, h: 30, variants: [['#ef6f6c', '#ffd23f', '#64a8e8', '#7dd370'], ['#ff9ec4', '#c9a2ff', '#7ec8ff', '#fff2a0']] },
  pumpkin: { layer: 'floor', w: 22, h: 18, variants: ['#ff9a2e', '#ffd23f', '#f6efe1'] },
  snowman: { layer: 'floor', w: 20, h: 30, variants: ['#ef4b4b', '#64a8e8', '#7dd370'] },
  lights: { layer: 'wall', w: 60, h: 12, variants: [['#ffd75e', '#ffe9a0'], ['#ef6f6c', '#ffd23f', '#7dd370', '#64a8e8', '#ff9ec4']], frames: 2, glow: true },
  lanterns: { layer: 'wall', w: 40, h: 26, variants: [['#ef6f6c', '#ffd23f', '#ff9ec4'], ['#64a8e8', '#7ec8ff', '#b48be6'], ['#ffa65c', '#ffd23f', '#ef6f6c']] },
  artwall: { layer: 'wall', w: 52, h: 28, variants: [['#ef6f6c', '#64a8e8', '#ffd23f'], ['#ff9ec4', '#7dd370', '#b48be6']] },
  wordwall: { layer: 'wall', w: 42, h: 30, variants: ['#64a8e8', '#ef6f6c', '#7dd370'] },
  bulletin: { layer: 'wall', w: 36, h: 26, variants: ['#ef6f6c', '#64a8e8', '#ffd23f'] },
  winplants: { layer: 'wall', w: 34, h: 16, variants: ['#ff6f91', '#ffd23f', '#b48be6'] },
  planet: { layer: 'wall', w: 30, h: 20, variants: ['#ffa65c', '#b48be6', '#64a8e8'] },
  fishmobile: { layer: 'wall', w: 36, h: 26, variants: [['#ffa65c', '#ffd23f', '#ff8fb8'], ['#64a8e8', '#7dd370', '#b48be6']] },
  snowflakes: { layer: 'wall', w: 40, h: 22, variants: ['#ffffff', '#bfe6ff'] },
  leaves: { layer: 'wall', w: 48, h: 14, variants: [['#e8602c', '#ffb020', '#c0392b'], ['#ffd23f', '#ffa65c', '#d9822b']] },
};
export const PARCEL_ITEMS = ['dino', 'robot', 'rocket'];
export const FLOOR_ITEMS = ['teepee', 'hamster', 'beanbag', 'teddy', 'toybox', 'easel', 'fishtank', 'cubbies', 'globe', 'flowers', 'balloons', 'lamp', 'pumpkin', 'snowman'];
export const WALL_ITEMS = ['artwall', 'lights', 'lanterns', 'rainbow', 'garland', 'butterflies', 'poster', 'frame', 'wordwall', 'bulletin', 'sun', 'moon', 'planet', 'fishmobile', 'winplants', 'snowflakes', 'leaves', 'clock'];
// v2.0: sizes a placed decoration can have (the ↔ bubble): small (as drawn), medium, big
export const SCALES = [1, 1.5, 2];
export function decoSize(type, sc = 0) { const d = DECOR[type], k = SCALES[sc] || 1; return [Math.round(d.w * k), Math.round(d.h * k)]; }
export const DESK_ITEMS = ['apple', 'pencils', 'books', 'crayons', 'cactus', 'snowglobe'];

export const WALLS = [
  ['#f7e6c4', '#f2dcb3'], ['#ffe6ee', '#fbd6e2'], ['#e0f4e6', '#d0ebd9'], ['#ece3fb', '#e0d4f7'], ['#dff0ff', '#cee6fb'], ['#fff3b8', '#fbe89a'],
  // v2.0 themes: night sky, peach, leafy green, snow
  ['#3d4280', '#373b77'], ['#ffe2cc', '#fbd5ba'], ['#d9f2c9', '#cdeabb'], ['#f2f8ff', '#e4eefa'],
];
export const FLOORS = [
  ['#dcab70', '#d7a46a', '#bd8650'], ['#b9814f', '#b07a4a', '#94613a'], ['#efd7ac', '#e9cf9f', '#cfb184'], ['#f6c8d4', '#f2bccb', '#dc9eb0'], ['#bfe3f2', '#b3dbec', '#8fc2d8'],
  // v2.0 themes: sand, grass, starry carpet
  ['#f6e2b5', '#f1d9a8', '#dcc08c'], ['#a6d98c', '#9ed183', '#7fb868'], ['#4a4f8f', '#454a88', '#383c73'],
];
export const RUGS = [
  ['#e8738a', '#ffd166', '#6cc2b8', '#fff6e6', '#b892e0'],
  ['#64a8e8', '#bfe6ff', '#7dd370', '#fffaf0', '#ffd23f'],
  ['#b48be6', '#ffb3d1', '#fff2a0', '#ffffff', '#ff8fb8'],
  ['#7dd370', '#ffd23f', '#ffa65c', '#fff6e6', '#ef6f6c'],
  // v2.0 themes: ocean, space, autumn, snow
  ['#3f8fd8', '#ffd23f', '#9fd8ff', '#e8f7ff', '#64a8e8'],
  ['#2f3470', '#ffd23f', '#6c72b8', '#b48be6', '#fff6b8'],
  ['#d9622b', '#ffd23f', '#ffb347', '#fff0d6', '#c0392b'],
  ['#9fd0ff', '#ffffff', '#cfe8ff', '#ffffff', '#ff9ec4'],
];

const mk = (key, w, h, draw) => cached(key, () => { const p = new Pix(w, h); draw(p); p.outline(); return p.canvas(); });

export function decor(type, v = 0, frame = 0) {
  const def = DECOR[type];
  const val = def.variants[v % def.variants.length];
  frame = def.frames ? frame % def.frames : 0;
  return mk('dec' + type + v + '_' + frame, def.w, def.h, p => DRAW[type](p, val, def, frame));
}
// where the art wall's papers are (sprite coords): her whiteboard drawings show in these
export const ART_WIN = [{ x: 17, y: 7, w: 18, h: 11 }, { x: 3, y: 9, w: 10, h: 7 }, { x: 39, y: 9, w: 10, h: 7 }];

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
    // v2.3: the chalk letters are the same round school letters as everywhere else
    let x = 5; ['A', 'B', 'C'].forEach((ch, i) => { x += chalkText(p, ch, ['#ff8f8f', '#ffe066', '#8fd0ff'][i], 12, x, 1) - 1; });
    x = 9; ['1', '2', '3'].forEach((ch, i) => { x += chalkText(p, ch, ['#a6e69a', '#ffb3d1', '#d5b8ff'][i], 11, x, 15) + 1; });
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
  dino(p, c) { // a plush dinosaur
    const d = darken(c, 0.2), m = lighten(c, 0.45);
    for (let i = 0; i < 9; i++) p.ell(3 + i * 0.9, 17 - i * 0.5, 2.6 - i * 0.15, 2.2 - i * 0.15, c); // tail
    p.ball(13, 16, 8, 6, c); p.ell(13, 18, 5, 3, m, null, true);
    p.rect(8, 20, 4, 4, d); p.rect(15, 20, 4, 4, d);
    p.rect(19, 6, 4, 10, c); p.ball(22, 6, 5, 4.4, c); p.px(23, 5, INK); p.px(26, 7, d);
    for (const [x, y] of [[8, 9], [12, 8], [16, 9], [19, 3]]) { p.px(x, y, '#ffd23f'); p.px(x - 1, y + 1, '#ffd23f'); p.px(x + 1, y + 1, '#ffd23f'); }
    p.px(21, 8, '#ff9fb4');
  },
  robot(p, c) { // a toy robot with a blinking antenna
    const d = darken(c, 0.25);
    p.vline(10, 0, 3, '#7a6a80'); p.ball(10, 1, 1.6, 1.6, '#ef4b4b', { hi: false });
    p.rect(3, 4, 15, 10, c); p.rect(3, 4, 15, 1, lighten(c, 0.4));
    p.rect(5, 6, 4, 4, '#fffaf0'); p.rect(12, 6, 4, 4, '#fffaf0'); p.px(7, 8, INK); p.px(14, 8, INK);
    p.hline(7, 13, 12, INK);
    p.rect(4, 15, 13, 10, d); p.rect(7, 17, 7, 6, '#fffaf0'); p.map(8, 18, ['##.##', '#####', '.###.', '..#..'], { '#': '#ef6f6c' });
    p.rect(0, 16, 3, 7, c); p.rect(18, 16, 3, 7, c);
    p.rect(5, 25, 4, 5, c); p.rect(12, 25, 4, 5, c);
  },
  rocket(p, c) { // a toy rocket on three little feet
    for (let y = 0; y < 8; y++) p.hline(9 - Math.floor(y * 0.7), 9 + Math.floor(y * 0.7), y + 1, c);
    p.rect(4, 9, 11, 18, '#fffaf0'); p.rect(4, 9, 2, 18, '#e9dfcf');
    p.ball(9.5, 15, 3.4, 3.4, '#7ec8ff'); p.px(8, 14, '#ffffff');
    p.rect(4, 22, 11, 2, c);
    for (let i = 0; i < 6; i++) { p.hline(0 + Math.floor(i / 2), 4, 21 + i, c); p.hline(15, 18 - Math.floor(i / 2), 21 + i, c); }
    p.rect(6, 27, 7, 2, '#9aa7b8');
    p.rect(7, 29, 5, 3, '#ffd23f'); p.rect(8, 32, 3, 3, '#ffa65c'); p.px(9, 35, '#ef6f6c');
  },
  // ---------------------------------------------------------------- v2.0 decorating
  teepee(p, [c, c2]) { // a striped reading tent with a pillow inside
    p.line(13, 0, 20, 8, '#a8703f'); p.line(27, 0, 20, 8, '#a8703f'); p.line(16, 0, 20, 5, '#8a5730');
    for (let y = 6; y < 44; y++) {
      const hw = Math.floor((y - 5) * 0.47), col = Math.floor((y - 6) / 5) % 2 ? c2 : c;
      p.hline(20 - hw, 20 + hw, y, col);
      p.px(20 - hw, y, darken(col, 0.12));
    }
    for (let x = 4; x < 37; x++) p.px(x, 37 + (x % 4 < 2 ? 0 : 1), darken(c, 0.25));
    for (let y = 21; y < 44; y++) { const hw = Math.floor((y - 20) * 0.38); p.hline(20 - hw, 20 + hw, y, y < 25 ? '#4a3550' : '#5a4060'); }
    for (let y = 23; y < 44; y++) { const hw = Math.floor((y - 20) * 0.38); p.px(20 - hw - 1, y, lighten(c, 0.45)); p.px(20 + hw + 1, y, lighten(c, 0.45)); p.px(20 - hw - 2, y, lighten(c, 0.3)); p.px(20 + hw + 2, y, lighten(c, 0.3)); }
    p.ball(20, 40, 4.5, 2.6, '#ffd23f'); p.rect(15, 41, 3, 2, '#64a8e8'); p.px(15, 41, '#9fd0ff');
    p.ball(20, 12, 1.6, 1.6, '#ffffff', { hi: false }); // a little round window
  },
  hamster(p, c, def, f) { // the class pet: a cage with a wheel (the hamster runs, 4 frames)
    p.rect(1, 25, 28, 7, '#c98c55'); p.rect(1, 25, 28, 1, '#dda36c'); p.rect(3, 27, 11, 4, '#a8703f'); p.rect(16, 27, 11, 4, '#a8703f'); p.px(8, 29, '#ffd23f'); p.px(21, 29, '#ffd23f');
    p.ell(15, 9, 13, 8, '#eef8ff', { y1: 9 }); p.rect(2, 9, 27, 12, '#eef8ff');
    p.rect(2, 19, 27, 5, c); p.rect(2, 19, 27, 1, lighten(c, 0.4)); p.rect(3, 18, 25, 1, '#f5deb0');
    // the wheel
    const wx = 10, wy = 12, a0 = f * Math.PI / 8;
    for (let a = 0; a < 6.28; a += 0.12) p.px(wx + Math.cos(a) * 5.6, wy + Math.sin(a) * 5.6, '#9aa7b8');
    for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 4; p.line(wx - Math.cos(a) * 5, wy - Math.sin(a) * 5, wx + Math.cos(a) * 5, wy + Math.sin(a) * 5, '#c9d3df'); }
    p.rect(wx, wy, 1, 7, '#7f8ca3');
    // the hamster, running at the bottom of the wheel
    const b = f % 2;
    p.ell(wx, 15.5 - b * 0.5, 3.4, 2.4, '#e8a35c'); p.ell(wx + 0.5, 16.5 - b * 0.5, 2, 1.2, '#fff0dc', null, true);
    p.px(wx + 2, 14 - b, INK); p.px(wx - 1, 13 - b, '#f5c08a'); p.px(wx + 3, 15 - b, '#ff9fb4');
    p.px(wx - 2 + b, 18, '#d48a4a'); p.px(wx + 1 - b, 18, '#d48a4a');
    // bowl + water bottle
    p.ell(22, 17.5, 3, 1.6, '#ffd23f'); p.px(21, 16, '#a8703f'); p.px(23, 16, '#7dd370');
    p.rect(25, 6, 2, 6, '#9fd8ff'); p.px(25, 6, '#ffffff'); p.vline(26, 12, 13, '#7f8ca3');
    // bars + roof
    for (let x = 2; x <= 28; x += 3) for (let y = 2; y < 19; y++) { const top = 9 - Math.sqrt(Math.max(0, 1 - ((x - 15) / 13) ** 2)) * 8; if (y >= top + 1) p.px(x, y, '#b9c6d6'); }
    for (let a = 3.2; a < 6.25; a += 0.04) p.px(15 + Math.cos(a) * 13, 9 + Math.sin(a) * 8, '#8f9db0');
    p.hline(2, 28, 9, '#8f9db0'); p.rect(13, 0, 4, 1, '#8f9db0');
  },
  cubbies(p, cs) { // a wooden cubby shelf with bins and a backpack
    p.rect(1, 2, 42, 25, '#c98c55'); p.rect(1, 2, 42, 2, '#dda36c'); p.rect(1, 26, 42, 1, '#a8703f');
    for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) {
      const x = 3 + k * 14, y = 5 + r * 11;
      p.rect(x, y, 12, 9, '#7a4a2a');
      const bin = cs[(k + r * 3) % cs.length];
      if ((k + r) % 3 === 2) { const bc = cs[(k + 1) % cs.length]; p.ball(x + 6, y + 5, 4, 4, bc); p.rect(x + 4, y + 5, 4, 2, lighten(bc, 0.4)); p.px(x + 6, y + 1, '#5a3420'); }
      else { p.rect(x + 1, y + 3, 10, 6, bin); p.rect(x + 1, y + 3, 10, 1, lighten(bin, 0.45)); p.rect(x + 4, y + 5, 4, 1, darken(bin, 0.25)); }
    }
    p.rect(2, 27, 3, 3, '#a8703f'); p.rect(39, 27, 3, 3, '#a8703f');
  },
  pumpkin(p, c) {
    const d = darken(c, 0.18);
    p.ball(6.5, 11.5, 6, 6, c, { hi: false }); p.ball(15.5, 11.5, 6, 6, c, { hi: false }); p.ball(11, 11, 6.4, 6.8, c);
    p.vline(7, 8, 16, d); p.vline(15, 8, 16, d);
    p.rect(10, 1, 2, 4, '#7a5a2a'); p.px(12, 1, '#7a5a2a'); p.ell(15, 3.5, 2.6, 1.3, '#6cc44f'); p.px(8, 3, '#4fae45'); p.px(7, 2, '#4fae45');
  },
  snowman(p, scarf) {
    const W = '#ffffff', sh = { shadow: '#cfe0f2', hi: '#ffffff' };
    p.ball(10, 23, 8, 6.5, W, sh); p.ball(10, 14.5, 6, 4.8, W, sh); p.ball(10, 7.5, 4.6, 4.2, W, sh);
    p.rect(6, 3, 9, 1, '#3a2a40'); p.rect(7, 0, 7, 3, '#3a2a40'); p.rect(7, 2, 7, 1, '#ef4b4b');
    p.px(8, 7, INK); p.px(12, 7, INK); p.hline(10, 13, 9, '#ff9a2e'); p.px(10, 8, '#ff9a2e');
    p.hline(6, 14, 11, scarf); p.hline(6, 14, 12, scarf); p.rect(12, 12, 2, 4, scarf); p.px(12, 13, lighten(scarf, 0.4));
    for (const y of [15, 18, 22]) p.px(10, y, INK);
    p.line(4, 14, 0, 10, '#8a5730'); p.line(16, 14, 19, 10, '#8a5730');
  },
  lights(p, cs, def, f) { // string lights: bulbs twinkle (2 frames); the room adds a glow
    const yAt = (x) => 1 + Math.round(Math.abs(Math.sin(x / 30 * Math.PI)) * 4);
    for (let x = 0; x < 60; x++) p.px(x, yAt(x), '#4f6a4a');
    for (let k = 0; k < 8; k++) {
      const x = Math.round(3 + k * 7.5), y = yAt(x), c = cs[k % cs.length];
      const on = (k + f) % 2 === 0;
      p.px(x, y + 1, '#3a4a3a');
      p.rect(x - 1, y + 2, 3, 3, on ? lighten(c, 0.35) : c); p.px(x, y + 5, on ? lighten(c, 0.2) : darken(c, 0.1));
      if (on) p.px(x - 1, y + 2, '#ffffff');
    }
  },
  lanterns(p, cs) { // round paper lanterns on a string
    p.hline(0, 39, 1, '#7a6a80');
    [[7, 13], [20, 10], [33, 14]].forEach(([x, y], i) => {
      const c = cs[i % cs.length];
      p.vline(x, 1, y - 6, '#7a6a80');
      p.rect(x - 2, y - 6, 5, 2, '#5a4a60');
      p.ball(x, y, 6, 5.2, c);
      for (const dx of [-3, 3]) for (let j = -3; j <= 3; j++) p.px(x + dx, y + j, darken(c, 0.15));
      for (let j = -4; j <= 4; j++) p.px(x, y + j, darken(c, 0.1));
      p.px(x - 4, y - 2, lighten(c, 0.5)); p.px(x - 4, y - 1, lighten(c, 0.5));
      p.rect(x - 2, y + 5, 5, 1, '#5a4a60'); p.vline(x, y + 6, y + 8, '#ffd23f'); p.px(x - 1, y + 8, '#ffd23f'); p.px(x + 1, y + 8, '#ffd23f');
    });
  },
  artwall(p, cs) { // her drawings pinned on a line (the room draws the real drawings in ART_WIN)
    for (let x = 0; x < 52; x++) p.px(x, 2 + Math.round(Math.sin(x / 51 * Math.PI) * 2), '#a8703f');
    ART_WIN.forEach((r, i) => {
      p.rect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, '#fffaf0'); p.rect(r.x - 2, r.y + r.h + 1, r.w + 4, 1, '#e3d5bd');
      p.rect(r.x, r.y, r.w, r.h, '#ffffff');
      // a crayon doodle until she draws something
      if (i === 0) { p.ball(r.x + 4, r.y + 3, 2.4, 2.4, '#ffd23f', { hi: false }); p.hline(r.x + 1, r.x + r.w - 2, r.y + r.h - 2, '#7dd370'); p.rect(r.x + 10, r.y + 4, 5, 4, '#ef6f6c'); p.hline(r.x + 11, r.x + 13, r.y + 3, '#ef6f6c'); p.px(r.x + 12, r.y + 2, '#ef6f6c'); }
      else { p.px(r.x + 3, r.y + 1, '#ff6f91'); p.px(r.x + 5, r.y + 1, '#ff6f91'); p.hline(r.x + 2, r.x + 6, r.y + 2, '#ff6f91'); p.hline(r.x + 3, r.x + 5, r.y + 3, '#ff6f91'); p.px(r.x + 4, r.y + 4, '#ff6f91'); }
      const pin = cs[i % cs.length], px = r.x + Math.floor(r.w / 2) - 1, py = r.y - 4 + (i ? 0 : -1);
      p.rect(px, py, 3, 4, pin); p.px(px + 1, py, lighten(pin, 0.5));
    });
  },
  wordwall(p, c) { // a word wall: letter tiles with little picture cards
    p.rect(0, 0, 42, 30, darken(c, 0.1)); p.rect(1, 1, 40, 28, '#fffaf0'); p.rect(1, 1, 40, 6, c); p.hline(1, 40, 1, lighten(c, 0.45));
    const F = { A: ['.#.', '#.#', '###', '#.#'], M: ['#.#', '###', '#.#', '#.#'], S: ['.##', '#..', '.##', '##.'] };
    ['A', 'M', 'S'].forEach((ch, k) => {
      const x = 3 + k * 13, cc = ['#ef6f6c', '#7dd370', '#b48be6'][k];
      p.map(x + 4, 2, F[ch], { '#': '#ffffff' });
      for (let r = 0; r < 2; r++) {
        const y = 9 + r * 10;
        p.rect(x, y, 11, 8, lighten(cc, 0.65)); p.rect(x, y + 7, 11, 1, lighten(cc, 0.3));
        p.hline(x + 5, x + 9, y + 3, '#9a8d98'); p.hline(x + 5, x + 8, y + 5, '#c8bcc4');
        const pc = [['#ef4b4b', '#ffd23f'], ['#64a8e8', '#ffa65c'], ['#ff8fb8', '#7dd370']][k][r];
        p.ball(x + 2.5, y + 4, 1.8, 1.8, pc, { hi: false });
      }
    });
  },
  bulletin(p, c) { // a cork board with pinned papers
    p.rect(0, 0, 36, 26, c); p.hline(0, 35, 0, lighten(c, 0.45)); p.rect(2, 2, 32, 22, '#d9a066');
    for (let k = 0; k < 18; k++) p.px(3 + (k * 7) % 30, 3 + (k * 5) % 20, '#c58a52');
    p.rect(4, 4, 11, 13, '#fffaf0'); starPix(p, 6, 7, '#ffd23f'); p.px(9, 3, '#ef4b4b');
    p.rect(18, 5, 13, 9, '#7ec8ff'); p.rect(18, 11, 13, 3, '#7dd370'); p.ball(27, 8, 1.6, 1.6, '#ffd23f', { hi: false }); p.px(24, 4, '#64a8e8');
    p.rect(17, 16, 12, 6, '#fff2a0'); p.hline(19, 26, 18, '#d8b860'); p.hline(19, 24, 20, '#d8b860'); p.px(22, 15, '#7dd370');
    p.rect(6, 19, 7, 3, '#ffb3d1'); p.px(9, 18, '#b48be6');
  },
  winplants(p, c) { // little pots on a shelf (for the window sill)
    p.rect(0, 13, 34, 3, '#c98c55'); p.hline(0, 33, 13, '#dda36c');
    for (const x of [3, 14, 25]) { p.rect(x, 8, 7, 5, '#e0805a'); p.rect(x - 1, 7, 9, 2, '#ef9a72'); p.px(x + 1, 10, '#f3b08e'); }
    p.ball(6.5, 4.5, 3, 3, '#62b95e'); p.px(5, 3, '#8fd67a'); p.px(6, 6, '#4f9e52'); // round succulent
    p.vline(17, 3, 7, '#4fae45'); p.ell(15.5, 5.5, 1.6, 1, '#6cc44f');
    for (let a = 0; a < 5; a++) p.ell(17.5 + Math.cos(a * 1.257) * 1.8, 2.5 + Math.sin(a * 1.257) * 1.8, 1.2, 1.2, c);
    p.px(17, 2, '#ffd23f');
    for (const [dx, dy] of [[-2, 2], [0, 0], [2, 1], [3, 4], [-3, 4]]) p.ell(28.5 + dx, 4 + dy, 1.6, 1.2, '#4f9e52');
  },
  planet(p, c) { // a ringed planet with twinkly stars
    p.ball(15, 10, 7, 7, c);
    p.hline(10, 20, 8, darken(c, 0.12)); p.hline(9, 21, 12, lighten(c, 0.25));
    for (let a = 0; a < Math.PI * 2; a += 0.03) {
      const x = 15 + Math.cos(a) * 13.5, y = 11 + Math.sin(a) * 3;
      const inside = ((x - 15) / 7.5) ** 2 + ((y - 10) / 7.5) ** 2 < 1;
      if (Math.sin(a) > 0 || !inside) { p.px(x, y, '#ffe58a'); p.px(15 + Math.cos(a) * 12, 11 + Math.sin(a) * 2.4, '#ffd23f'); }
    }
    for (const [x, y] of [[2, 2], [27, 3], [4, 17]]) { p.px(x, y, '#fff6b8'); p.px(x - 1, y, '#ffe58a'); p.px(x + 1, y, '#ffe58a'); p.px(x, y - 1, '#ffe58a'); p.px(x, y + 1, '#ffe58a'); }
  },
  fishmobile(p, cs) { // paper fish hanging from a stick
    p.rect(1, 1, 34, 2, '#a8703f'); p.hline(1, 34, 1, '#c98c55');
    [[7, 12], [18, 19], [29, 10]].forEach(([x, y], i) => {
      const c = cs[i % cs.length];
      p.vline(x, 3, y - 4, '#9a8da8');
      p.ball(x, y, 4.5, 3.2, c); for (let j = 0; j < 4; j++) p.vline(x + 4 + j, y - j, y + j, darken(c, 0.1));
      p.px(x - 2, y - 1, INK); p.px(x, y + 1, lighten(c, 0.5)); p.px(x + 1, y, lighten(c, 0.5));
    });
    p.px(13, 6, '#ffffff'); p.px(24, 13, '#ffffff'); p.px(33, 20, '#ffffff');
  },
  snowflakes(p, c) {
    [[7, 12, 5], [20, 15, 6], [33, 10, 5]].forEach(([x, y, r]) => {
      p.vline(x, 0, y - r - 1, '#a9b8cc');
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3 + Math.PI / 2, ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r;
        p.line(x, y, ex, ey, c);
        const mx = x + Math.cos(a) * r * 0.6, my = y + Math.sin(a) * r * 0.6;
        p.line(mx, my, mx + Math.cos(a + 0.9) * 2, my + Math.sin(a + 0.9) * 2, c); p.line(mx, my, mx + Math.cos(a - 0.9) * 2, my + Math.sin(a - 0.9) * 2, c);
      }
      p.px(x, y, '#9fd8ff');
    });
  },
  leaves(p, cs) { // an autumn leaf garland
    for (let x = 0; x < 48; x++) p.px(x, 2 + Math.round(Math.sin(x / 47 * Math.PI) * 3), '#8a6a3a');
    for (let k = 0; k < 6; k++) {
      const x = 3 + k * 8, y = 3 + Math.round(Math.sin(x / 47 * Math.PI) * 3), c = cs[k % cs.length];
      p.map(x - 3, y, ['...#...', '.#.#.#.', '#######', '.#####.', '..###..', '...#...'], { '#': c });
      p.vline(x, y + 2, y + 6, darken(c, 0.3)); p.px(x - 1, y + 2, lighten(c, 0.4));
    }
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

// v2.4: each girl has her own teacher. A look is { hair, outfit, skin } (indexes into the lists below);
// look 0/0/0 is Louise, exactly as she was drawn above.
export const HAIRS = [
  [HAIR, HAIR_HI, HAIR_S], ['#e8c25a', '#f6dc8a', '#c79a35'], ['#3a2c3a', '#5a4860', '#241a26'], ['#c8603a', '#e48a58', '#9a4426'],
  ['#5a3a28', '#7a5238', '#3e2619'], ['#ff8fc0', '#ffb9d8', '#e0609a'], ['#9a6fd6', '#b99aea', '#7448b0'],
];
export const OUTFITS = [ // [top, skirt]
  [TOP, SKIRT], ['#ff8fb8', '#d9c2f5'], ['#7dd370', '#ffc2da'], ['#a884e0', '#bfeedd'], ['#ef6f6c', '#fdf6ee'], ['#5cc8c0', '#ffc98a'],
];
export const SKINS = [[SKIN, SKIN_S], ['#ffe3d2', '#f0c4a8'], ['#d9a57a', '#c08a5e'], ['#a8703f', '#8a5730'], ['#7a4a2a', '#5e3620']];
export const DEFAULT_LOOKS = [{ hair: 0, outfit: 0, skin: 0 }, { hair: 1, outfit: 1, skin: 0 }, { hair: 4, outfit: 3, skin: 0 }];
const idx = (v, n) => (((v | 0) % n) + n) % n;
export const cleanLook = (l, slot = 0) => { const d = DEFAULT_LOOKS[slot] || DEFAULT_LOOKS[0]; return l && typeof l === 'object' ? { hair: idx(l.hair, HAIRS.length), outfit: idx(l.outfit, OUTFITS.length), skin: idx(l.skin, SKINS.length) } : { ...d }; };
const myLook = () => (G.save && G.save.look) || DEFAULT_LOOKS[0];

export function teacher(st, look = myLook()) {
  const lk = cleanLook(look);
  const key = 'teacher' + [st.eyes, st.mouth, st.armL, st.armR, st.feet | 0, st.sway | 0, lk.hair, lk.outfit, lk.skin].join(',');
  return cached(key, () => {
    const p = new Pix(TW, TH);
    // this look's colours (they shadow Louise's palette above)
    const [HAIR, HAIR_HI, HAIR_S] = HAIRS[lk.hair], [SKIN, SKIN_S] = SKINS[lk.skin];
    const [TOP, SKIRT] = OUTFITS[lk.outfit];
    const own = lk.outfit === 0;
    const TOP_S = own ? '#6c97d2' : darken(TOP, 0.2), SLEEVE = own ? '#cfe0f7' : lighten(TOP, 0.6);
    const SKIRT_S = own ? '#ecd27e' : darken(SKIRT, 0.14), SKIRT_HI = own ? '#fff6cf' : lighten(SKIRT, 0.6);
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
      if (e === 'open') { const x0 = x < 15 ? x - 1 : x; p.rect(x0, 13, 3, 3, eyeC); p.px(x0, 13, '#ffffff'); p.px(x0 + 2, 15, '#7a5a4a'); } // v2.5: bigger, glossy (like the friends')
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

// ------------------------------------------------------------------ v2.0 decorating: tab + bubble icons, theme emblems
export function decoIcon(name) {
  return mk('dico' + name, 18, 18, p => {
    if (name === 'themes') { // a magic wand: one tap, a whole room
      p.line(2, 16, 10, 8, '#a8703f'); p.line(3, 16, 11, 8, '#c98c55');
      p.map(7, 0, ['....#....', '...###...', '#########', '.#######.', '..#####..', '.###.###.', '.##...##.'], { '#': '#ffd23f' });
      p.px(11, 3, '#fff6b8'); p.px(10, 2, '#fff6b8');
      p.px(3, 3, '#ff9ec4'); p.px(2, 4, '#ff9ec4'); p.px(4, 4, '#ff9ec4'); p.px(3, 5, '#ff9ec4');
      p.px(16, 12, '#7ec8ff'); p.px(15, 13, '#7ec8ff'); p.px(17, 13, '#7ec8ff'); p.px(16, 14, '#7ec8ff');
    }
    if (name === 'desks') { // a little desk with an apple on it
      p.ball(9, 4.5, 3.4, 3, '#ef4b4b'); p.px(9, 1, '#7a4a2a'); p.ell(11, 1.5, 1.4, 0.8, '#6cc44f');
      p.rect(1, 8, 16, 3, '#c98c55'); p.hline(1, 16, 8, '#dda36c'); p.rect(2, 11, 14, 2, '#a8703f');
      p.rect(2, 13, 2, 4, '#6f7b8f'); p.rect(14, 13, 2, 4, '#6f7b8f');
    }
    if (name === 'colors') { // a paint roller with a rainbow stripe
      ['#ef6f6c', '#ffd23f', '#7dd370', '#64a8e8'].forEach((c, i) => p.rect(2, 2 + Math.round(i * 1.5), 12, 2, c));
      p.rect(14, 3, 2, 5, '#9aa7b8'); p.rect(8, 8, 8, 1, '#9aa7b8'); p.rect(8, 9, 2, 8, '#a8703f');
    }
    if (name === 'undo') { // a curly arrow going back
      for (let a = -0.5; a < 3.15; a += 0.04) { p.px(9.5 + Math.cos(a) * 6.5, 11 - Math.sin(a) * 6, '#2f7de1'); p.px(9.5 + Math.cos(a) * 5, 11 - Math.sin(a) * 4.6, '#2f7de1'); p.px(9.5 + Math.cos(a) * 5.75, 11 - Math.sin(a) * 5.3, '#64a8e8'); }
      p.map(0, 11, ['#######', '.#####.', '..###..', '...#...'], { '#': '#2f7de1' }); p.hline(1, 5, 11, '#64a8e8');
    }
    if (name === 'size') { // small box and big box with a ↔ arrow
      p.rect(1, 8, 5, 5, '#7ec8ff'); p.hline(1, 5, 8, '#bfe6ff');
      p.rect(8, 2, 9, 11, '#ff9ec4'); p.hline(8, 16, 2, '#ffd0e2');
      p.hline(2, 15, 15, '#7a5b6a'); p.px(3, 14, '#7a5b6a'); p.px(3, 16, '#7a5b6a'); p.px(14, 14, '#7a5b6a'); p.px(14, 16, '#7a5b6a');
    }
    if (name === 'bin') { // the trash can, small
      const body = '#7fb7e0', dark = '#4f86b8';
      for (let y = 6; y < 17; y++) { const inset = Math.floor((y - 6) / 6); p.hline(4 + inset, 13 - inset, y, body); }
      for (const x of [7, 10]) p.vline(x, 8, 14, dark);
      p.rect(2, 3, 14, 2, '#5f96c8'); p.rect(7, 1, 4, 2, '#3f6f9a'); p.px(5, 8, '#bfe0f5'); p.px(5, 9, '#bfe0f5');
    }
    if (name === 'left' || name === 'right') { // scroll arrows
      for (let j = 0; j < 9; j++) { const w = 5 - Math.abs(j - 4); for (let i = 0; i < w; i++) p.px(name === 'left' ? 11 - i : 7 + i, 4 + j, i === w - 1 ? '#ffd23f' : '#e0a820'); }
    }
  });
}
export function themeIcon(id) {
  return mk('them' + id, 20, 20, p => {
    if (id === 'oceano') { p.ball(9, 10, 7, 5, '#64a8e8'); for (let j = 0; j < 6; j++) p.vline(15 + j, 10 - j, 10 + j, '#4f8fd0'); p.px(5, 8, INK); p.px(6, 7, '#ffffff'); p.hline(6, 11, 12, '#bfe6ff'); p.px(3, 3, '#bfe6ff'); p.px(2, 1, '#bfe6ff'); }
    if (id === 'espacio') { // a rocket
      for (let y = 0; y < 6; y++) p.hline(10 - Math.floor(y * 0.7), 10 + Math.floor(y * 0.7), y + 1, '#ef6f6c');
      p.rect(6, 7, 9, 8, '#fffaf0'); p.ball(10.5, 10, 2.2, 2.2, '#7ec8ff'); p.rect(3, 12, 3, 4, '#ef6f6c'); p.rect(15, 12, 3, 4, '#ef6f6c');
      p.rect(8, 15, 5, 2, '#ffd23f'); p.rect(9, 17, 3, 2, '#ffa65c');
    }
    if (id === 'jardin') { for (let a = 0; a < 5; a++) p.ball(10 + Math.cos(a * 1.257 - 1.57) * 4, 8 + Math.sin(a * 1.257 - 1.57) * 4, 3, 3, '#ff8fb8', { hi: false }); p.ball(10, 8, 2.4, 2.4, '#ffd23f'); p.vline(10, 13, 19, '#4fae45'); p.ell(7, 16, 2.6, 1.2, '#6cc44f'); p.ell(13, 15, 2.6, 1.2, '#6cc44f'); }
    if (id === 'arcoiris') { ['#ef6f6c', '#ffa65c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'].forEach((c, i) => p.ell(10, 16, 9.5 - i * 1.4, 9.5 - i * 1.4, c, { y1: 15 })); p.ell(10, 16, 1.4, 1.4, 0, { y1: 15 }); p.ball(3, 15, 3, 2, '#ffffff', { hi: false }); p.ball(17, 15, 3, 2, '#ffffff', { hi: false }); }
    if (id === 'otono') { p.map(2, 2, ['.......#.......', '.....#.#.#.....', '..#..#####..#..', '..###########..', '.#############.', '###############', '.#############.', '..###########..', '...#########...', '....#######....', '......###......', '.......#.......'], { '#': '#e8602c' }); p.vline(9, 7, 18, '#8a3a1a'); p.px(7, 7, '#ffb020'); p.px(6, 8, '#ffb020'); }
    if (id === 'fiesta') { [[6, 6, '#ef6f6c'], [14, 5, '#64a8e8'], [10, 9, '#ffd23f']].forEach(([x, y, c]) => { p.line(x, y + 5, 10, 19, '#a99caa'); p.ball(x, y, 3.6, 4.4, c); }); }
    if (id === 'invierno') { for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; p.line(10, 10, 10 + Math.cos(a) * 8, 10 + Math.sin(a) * 8, '#7ec8ff'); p.line(10 + Math.cos(a) * 5, 10 + Math.sin(a) * 5, 10 + Math.cos(a + 0.7) * 7, 10 + Math.sin(a + 0.7) * 7, '#bfe6ff'); } p.ball(10, 10, 2, 2, '#ffffff', { hi: false }); }
    if (id === 'cuentos') { p.rect(1, 5, 9, 12, '#ef6f6c'); p.rect(10, 5, 9, 12, '#64a8e8'); p.rect(2, 6, 7, 10, '#fffaf0'); p.rect(11, 6, 7, 10, '#fffaf0'); for (const y of [8, 10, 12, 14]) { p.hline(3, 7, y, '#c8bcc4'); p.hline(12, 16, y, '#c8bcc4'); } p.vline(9, 4, 17, '#a8703f'); p.vline(10, 4, 17, '#a8703f'); }
  });
}
