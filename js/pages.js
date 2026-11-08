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
