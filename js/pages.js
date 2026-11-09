// Picture-book pages for story time, drawn in pixel art directly with fillRect.
import { Pix, cached } from './raster.js';

function page(id, draw) {
  return cached('page' + id, () => { const p = new Pix(52, 44); draw(p); return p.canvas(); });
}
export const PAGES = [
  // 1. sunny morning hills
  () => page(1, p => {
    p.rect(0, 0, 52, 44, '#bfe8ff');
    p.ball(40, 10, 6, 6, '#ffd23f'); for (let a = 0; a < 8; a++) p.px(40 + Math.cos(a * .785) * 9, 10 + Math.sin(a * .785) * 9, '#ffb020');
    p.ell(12, 44, 22, 14, '#7dd370'); p.ell(38, 46, 24, 14, '#62b95e');
    p.ball(10, 8, 5, 3, '#ffffff', { hi: false }); p.ball(16, 9, 4, 2.4, '#ffffff', { hi: false });
    for (const [x, y, c] of [[8, 36, '#ff8fb8'], [14, 33, '#ffd23f'], [30, 38, '#ffffff'], [42, 35, '#ff8fb8']]) { p.px(x, y, c); p.px(x - 1, y + 1, c); p.px(x + 1, y + 1, c); p.px(x, y + 2, c); p.px(x, y + 1, '#ffb020'); }
  }),
  // 2. rain cloud and rainbow
  () => page(2, p => {
    p.rect(0, 0, 52, 44, '#d6ecff');
    ['#ef6f6c', '#ffa65c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'].forEach((c, i) => p.ell(30, 44, 22 - i * 2.4, 22 - i * 2.4, c));
    p.ell(30, 44, 7.5, 7.5, '#d6ecff');
    p.ball(14, 12, 7, 5, '#ffffff', { hi: false }); p.ball(21, 10, 6, 5, '#ffffff', { hi: false }); p.ball(9, 14, 5, 3.5, '#ffffff', { hi: false });
    p.px(13, 12, '#2b1d2e'); p.px(18, 12, '#2b1d2e'); p.px(15, 14, '#ff9fb4'); p.px(16, 14, '#ff9fb4');
    for (const [x, y] of [[9, 21], [14, 25], [19, 21], [11, 30], [22, 28]]) { p.px(x, y, '#64a8e8'); p.px(x, y + 1, '#64a8e8'); }
  }),
  // 3. under the sea
  () => page(3, p => {
    for (let y = 0; y < 44; y++) p.hline(0, 51, y, y < 15 ? '#7fd6ff' : y < 30 ? '#4fb8ea' : '#3a9bd0');
    p.rect(0, 39, 52, 5, '#f3dc9c');
    p.ball(16, 18, 6, 4.5, '#ffa65c'); for (let i = 0; i < 5; i++) p.vline(22 + i, 18 - i, 18 + i, '#ff8a3c'); p.px(13, 17, '#2b1d2e');
    p.ball(36, 30, 5, 3.6, '#ff8fb8'); for (let i = 0; i < 4; i++) p.vline(30 - i, 30 - i, 30 + i, '#ff6fa5'); p.px(38, 29, '#2b1d2e');
    for (const x of [6, 9, 45, 48]) for (let y = 30; y < 40; y++) p.px(x + (y % 4 < 2 ? 0 : 1), y, '#4fae45');
    for (const [x, y] of [[24, 9], [27, 5], [40, 20], [42, 15]]) { p.px(x, y, '#ffffff'); p.px(x + 1, y, '#d8f0ff'); }
  }),
  // 4. moon and stars
  () => page(4, p => {
    p.rect(0, 0, 52, 44, '#2c3466');
    p.ball(34, 14, 8, 8, '#ffe58a'); p.ell(38, 11, 6.5, 6.5, '#2c3466');
    p.px(30, 15, '#2b1d2e'); p.px(31, 18, '#ff9fb4');
    for (const [x, y] of [[6, 6], [14, 14], [9, 26], [22, 8], [46, 30], [20, 33], [44, 4], [30, 30]]) { p.px(x, y, '#fff6b8'); p.px(x - 1, y, '#ffd23f'); p.px(x + 1, y, '#ffd23f'); p.px(x, y - 1, '#ffd23f'); p.px(x, y + 1, '#ffd23f'); }
    p.ell(26, 46, 30, 8, '#3f7a52');
  }),
  // 5. the end: big heart
  () => page(5, p => {
    p.rect(0, 0, 52, 44, '#fff0f5');
    p.map(10, 8, ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'], { '#': '#ff6f91' }, 3.5 | 0);
    p.rect(14, 12, 3, 3, '#ffd0dc');
    for (const [x, y] of [[5, 6], [46, 8], [7, 36], [44, 38]]) { p.px(x, y, '#ffd23f'); p.px(x - 1, y, '#ffd23f'); p.px(x + 1, y, '#ffd23f'); p.px(x, y - 1, '#ffd23f'); p.px(x, y + 1, '#ffd23f'); }
  }),
];

// ------------------------------------------------------------------ v1.9 story books (3 books x 4 pages, plus a cover picture)
// The words live in learndata.js BOOK_TEXT; covers are pictures only, so she can choose without reading.
const INKC = '#2b1d2e';
function duck(p, x, y, o = {}) { // a little yellow duck, facing right; anchor = body centre
  p.ball(x, y, 6, 4.5, '#ffd23f');
  p.ell(x - 1, y - 0.5, 3.4, 2, '#f5c000', null, true); // wing
  if (o.wingUp) p.ell(x - 2, y - 5, 2, 3, '#f5c000');
  p.ball(x + 5, y - 5, 3.6, 3.4, '#ffd23f');
  p.rect(x + 8, y - 5, 3, 2, '#ff9a2e');
  if (o.open) p.rect(x + 8, y - 3, 2, 1, '#e07a1a');
  p.px(x + 6, y - 6, INKC); p.px(x + 4, y - 4, '#ff9fb4');
  p.rect(x - 3, y + 4, 2, 2, '#ff9a2e'); p.rect(x + 1, y + 4, 2, 2, '#ff9a2e');
}
function drop(p, x, y) { p.px(x, y, '#64a8e8'); p.px(x, y + 1, '#64a8e8'); p.px(x - 1, y + 2, '#64a8e8'); p.px(x + 1, y + 2, '#64a8e8'); p.px(x, y + 2, '#bfe6ff'); }
function sunAt(p, x, y, r = 5) {
  for (let a = 0; a < 8; a++) p.px(x + Math.cos(a * 0.785) * (r + 3), y + Math.sin(a * 0.785) * (r + 3), '#ffb020');
  p.ball(x, y, r, r, '#ffd23f');
}
function cloud(p, x, y, c = '#ffffff', face = false) {
  p.ball(x, y, 6, 4, c, { hi: false }); p.ball(x + 6, y - 1, 5, 4.4, c, { hi: false }); p.ball(x - 5, y + 1, 4, 3, c, { hi: false });
  if (face) { p.px(x - 1, y, INKC); p.px(x + 4, y, INKC); p.px(x + 1, y + 2, '#ff9fb4'); p.px(x + 2, y + 2, '#ff9fb4'); }
}
function arc(p, cx, cy, r) { ['#ef6f6c', '#ffa65c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'].forEach((c, i) => p.ell(cx, cy, r - i * 2.2, r - i * 2.2, c, { y1: cy - 1 })); }
function flower(p, x, y, r, petal = '#ff8fb8', face = false) {
  for (let a = 0; a < 6; a++) p.ball(x + Math.cos(a * 1.047) * r, y + Math.sin(a * 1.047) * r, r * 0.62, r * 0.62, petal, { hi: false });
  p.ball(x, y, r * 0.6, r * 0.6, '#ffd23f', { hi: false });
  if (face) { p.px(x - 2, y - 1, INKC); p.px(x + 1, y - 1, INKC); p.hline(x - 1, x, y + 1, INKC); }
}
function sprout(p, x, ground, h) {
  p.vline(x, ground - h, ground - 1, '#4fae45');
  for (let k = 1; k <= Math.floor(h / 6); k++) { const yy = ground - k * 6, d = k % 2 ? -1 : 1; p.ell(x + d * 3, yy, 2.6, 1.4, '#6cc44f'); }
  p.ell(x + 1, ground - h, 2, 1.4, '#7dd370');
}
function rocketPix(p, x, y, c = '#ef6f6c', flame = 0) { // nose at (x+5, y); about 15 wide, 20 tall
  for (let i = 0; i < 6; i++) p.hline(x + 5 - Math.floor(i * 0.9), x + 5 + Math.floor(i * 0.9), y + i, c);
  p.rect(x + 1, y + 6, 9, 11, '#fffaf0'); p.rect(x + 1, y + 6, 1, 11, '#e9dfcf');
  p.ball(x + 5.5, y + 10, 2.4, 2.4, '#7ec8ff', { hi: false }); p.px(x + 5, y + 9, '#ffffff');
  for (let i = 0; i < 4; i++) { p.hline(x - 2 + Math.floor(i / 2), x, y + 14 + i, c); p.hline(x + 11, x + 13 - Math.floor(i / 2), y + 14 + i, c); }
  if (flame) { p.rect(x + 3, y + 17, 5, 3, '#ffd23f'); p.rect(x + 4, y + 20, 3, 2 + flame, '#ffa65c'); p.px(x + 5, y + 22 + flame, '#ef6f6c'); }
}
const DIG = { 3: ['##.', '..#', '.#.', '..#', '##.'], 2: ['##.', '..#', '.#.', '#..', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'] };
function twinkle(p, x, y) { p.px(x, y, '#fff6b8'); p.px(x - 1, y, '#ffd23f'); p.px(x + 1, y, '#ffd23f'); p.px(x, y - 1, '#ffd23f'); p.px(x, y + 1, '#ffd23f'); }
function grass(p, y, c = '#7dd370') { p.rect(0, y, 52, 44 - y, c); for (let x = 1; x < 52; x += 4) p.px(x, y - 1, c); }

function bookPage(id, draw) { return cached('bk' + id, () => { const p = new Pix(52, 44); draw(p); return p.canvas(); }); }
export const BOOKS = [
  { // 0. Pato y la lluvia: a yellow book with a duck
    color: '#ffd23f', dark: '#c99a10',
    cover: () => bookPage('0c', p => { p.rect(0, 0, 52, 44, '#bfe8ff'); arc(p, 38, 44, 16); cloud(p, 12, 9); drop(p, 10, 16); drop(p, 16, 19); grass(p, 39); duck(p, 22, 31, { open: true }); }),
    pages: [
      () => bookPage('00', p => { p.rect(0, 0, 52, 44, '#bfe8ff'); sunAt(p, 42, 9); cloud(p, 12, 8); grass(p, 30); p.ell(36, 37, 12, 4, '#64a8e8'); p.ell(34, 36, 6, 1.4, '#9fd8ff'); duck(p, 14, 31, { open: true }); for (const x of [4, 26, 48]) { p.px(x, 33, '#ff8fb8'); p.px(x, 34, '#ffd23f'); } }),
      () => bookPage('01', p => { p.rect(0, 0, 52, 44, '#c9d6e6'); cloud(p, 14, 8, '#eef2f8'); cloud(p, 36, 6, '#e3e9f2'); for (let k = 0; k < 14; k++) drop(p, 3 + (k * 11) % 48, 15 + (k * 7) % 14); grass(p, 34, '#62b95e'); duck(p, 24, 33, { open: true, wingUp: true }); }),
      () => bookPage('02', p => { p.rect(0, 0, 52, 44, '#d6ecff'); cloud(p, 40, 7, '#eef3f8'); grass(p, 34, '#62b95e'); p.ell(26, 38, 16, 4, '#64a8e8'); p.ell(24, 37, 8, 1.5, '#9fd8ff'); duck(p, 24, 18, { wingUp: true, open: true }); for (const [x, y] of [[10, 30], [14, 27], [38, 28], [42, 31], [18, 25], [34, 25]]) drop(p, x, y); }),
      () => bookPage('03', p => { p.rect(0, 0, 52, 44, '#bfe8ff'); arc(p, 26, 40, 22); p.ell(26, 40, 8.6, 8.6, '#bfe8ff', { y1: 39 }); sunAt(p, 45, 7, 4); grass(p, 36); duck(p, 24, 33, { open: true }); }),
    ],
  },
  { // 1. La semillita: a green book with a smiling flower
    color: '#7dd370', dark: '#3f9a3a',
    cover: () => bookPage('1c', p => { p.rect(0, 0, 52, 44, '#fff3b8'); sunAt(p, 43, 8, 4); p.rect(0, 36, 52, 8, '#a8703f'); sprout(p, 26, 36, 18); flower(p, 26, 15, 6, '#ff8fb8', true); }),
    pages: [
      () => bookPage('10', p => { p.rect(0, 0, 52, 44, '#d6ecff'); p.rect(0, 24, 52, 20, '#a8703f'); p.rect(0, 24, 52, 2, '#7dd370'); for (let k = 0; k < 10; k++) p.px(3 + k * 5, 30 + (k * 3) % 10, '#8a5730'); p.ball(26, 35, 4, 3, '#e8b06a'); p.hline(24, 25, 35, INKC); p.hline(27, 28, 35, INKC); for (const [x, y] of [[32, 26], [36, 21], [40, 16]]) p.map(x, y, ['###', '.#.', '###'], { '#': '#6f8fd6' }); }),
      () => bookPage('11', p => { p.rect(0, 0, 52, 44, '#d6ecff'); sunAt(p, 40, 9); cloud(p, 12, 8, '#ffffff', true); for (const [x, y] of [[8, 16], [13, 20], [17, 15], [11, 25]]) drop(p, x, y); p.rect(0, 30, 52, 14, '#a8703f'); p.rect(0, 30, 52, 2, '#7dd370'); p.ball(26, 37, 4, 3, '#e8b06a'); p.ell(26, 31, 1.5, 2, '#6cc44f'); }),
      () => bookPage('12', p => { p.rect(0, 0, 52, 44, '#e6f6ff'); p.rect(0, 36, 52, 8, '#a8703f'); p.rect(0, 36, 52, 2, '#7dd370'); sprout(p, 10, 36, 6); sprout(p, 26, 36, 14); sprout(p, 42, 36, 24); for (const x of [17, 33]) { p.hline(x - 2, x + 2, 24, '#64a8e8'); p.px(x + 1, 23, '#64a8e8'); p.px(x + 1, 25, '#64a8e8'); } }),
      () => bookPage('13', p => { p.rect(0, 0, 52, 44, '#fff3b8'); sunAt(p, 8, 8, 4); p.rect(0, 38, 52, 6, '#7dd370'); sprout(p, 26, 38, 22); flower(p, 26, 14, 8, '#ff8fb8', true); p.ball(41, 10, 2, 2.4, '#b48be6', { hi: false }); p.ball(45, 10, 2, 2.4, '#b48be6', { hi: false }); p.vline(43, 8, 12, INKC); }),
    ],
  },
  { // 2. El cohete: a navy book with a rocket and stars
    color: '#4a5aa8', dark: '#26306a',
    cover: () => bookPage('2c', p => { p.rect(0, 0, 52, 44, '#2c3466'); for (const [x, y] of [[6, 6], [44, 8], [10, 30], [40, 36], [30, 4], [8, 18]]) twinkle(p, x, y); p.ball(42, 22, 5, 5, '#ffe58a'); rocketPix(p, 20, 10, '#ef6f6c', 2); }),
    pages: [
      () => bookPage('20', p => { p.rect(0, 0, 52, 44, '#a8dcff'); cloud(p, 10, 8); grass(p, 38); p.rect(16, 35, 20, 3, '#9aa7b8'); rocketPix(p, 20, 15, '#ef6f6c'); }),
      () => bookPage('21', p => { p.rect(0, 0, 52, 44, '#8fd0ff'); grass(p, 40); [3, 2, 1].forEach((n, i) => p.map(3 + i * 8, 4 + i * 4, DIG[n], { '#': ['#ef6f6c', '#ffa65c', '#ffd23f'][i] }, 2)); rocketPix(p, 32, 8, '#ef6f6c', 4); for (const [x, y] of [[30, 36], [46, 37], [34, 39], [42, 34]]) p.ball(x, y, 2.6, 2, '#ffffff', { hi: false }); }),
      () => bookPage('22', p => { p.rect(0, 0, 52, 44, '#2c3466'); for (const [x, y] of [[5, 5], [14, 30], [44, 6], [30, 38], [48, 26], [8, 18], [24, 8], [40, 16]]) twinkle(p, x, y); p.ball(9, 36, 5, 5, '#ff9ec4'); p.ell(9, 36, 9, 1.5, '#b48be6', { y0: 36, y1: 37 }); rocketPix(p, 22, 12, '#ef6f6c', 3); }),
      () => bookPage('23', p => { p.rect(0, 0, 52, 44, '#2c3466'); for (const [x, y] of [[5, 5], [44, 6], [24, 4], [12, 14]]) twinkle(p, x, y); p.ell(26, 52, 34, 18, '#ffe58a'); for (const [x, y, r] of [[12, 40, 2], [36, 38, 2.6], [24, 42, 1.6]]) p.ell(x, y, r, r * 0.6, '#e8c860'); p.px(20, 39, INKC); p.px(30, 39, INKC); p.hline(23, 27, 41, INKC); rocketPix(p, 38, 13, '#ef6f6c'); }),
    ],
  },
];
