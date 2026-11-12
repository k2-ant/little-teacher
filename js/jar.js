// v2.4 the class star jar ("el frasco de estrellas"): a reason to come back.
// Finishing something (a traced letter, a built word, a sorted round of shapes, an answered question, a helped
// friend, a watered plant…) drops a star into the jar. The count is saved straight away, so a five-minute visit
// still adds to it. When the jar is full she taps it: a class party, and a new sticker for the book.
import { G, persist } from './state.js';
import { Pix, cached } from './raster.js';

export const JAR_MAX = 12;
export const JAR_W = 30, JAR_H = 36;
/** stars saved (may run past JAR_MAX: the extra ones wait for the next jar instead of being lost) */
export const jarTotal = () => Math.max(0, Math.min(JAR_MAX * 2, (G.save && G.save.jar) | 0));
/** stars showing in the jar */
export const jarCount = () => Math.min(JAR_MAX, jarTotal());
let lastEarn = -9;
/** a star for the jar; the classroom shows it flying in the next time the room is on screen */
export function earnStar(n = 1) {
  if (!G.save) return;
  G.save.jar = Math.min(JAR_MAX * 2, jarTotal() + n);
  lastEarn = G.time;
  persist();
}
export function emptyJar() { G.save.jar = Math.max(0, jarTotal() - JAR_MAX); G.save.parties = (G.save.parties | 0) + 1; persist(); }

/** the little jar shown in the tracing and shapes scenes: a star flies into it each time one is earned there */
export function drawChip(c, x, y, W, H) {
  const n = jarCount(), k = (G.time - lastEarn) / 0.8, landed = k >= 1 && k < 1.35;
  const img = cached('jarchip' + n, () => {
    const p = new Pix(15, 18);
    p.rect(3, 3, 9, 14, '#eaf6ff'); p.rect(2, 5, 11, 11, '#eaf6ff'); p.vline(2, 5, 15, '#9cc7e6'); p.vline(12, 5, 15, '#9cc7e6'); p.hline(3, 11, 16, '#9cc7e6');
    const h = Math.round(n / JAR_MAX * 11); if (h) { p.rect(3, 16 - h, 9, h, '#ffc21a'); p.hline(3, 11, 16 - h, '#ffe066'); for (let yy = 15; yy > 16 - h; yy -= 3) p.px(4 + (yy % 2) * 4, yy, '#fff2a0'); }
    p.vline(4, 6, 10, '#ffffff');
    p.rect(3, 1, 9, 2, n >= JAR_MAX ? '#ffd23f' : '#ef6f6c'); p.hline(2, 12, 3, n >= JAR_MAX ? '#e0a820' : '#c94f4f');
    p.outline(); return p.canvas();
  });
  c.drawImage(img, Math.round(x), Math.round(y) - (landed ? 2 : 0));
  if (k >= 0 && k < 1) { // the new star, on its way from the middle of the screen
    const e = k * k * (3 - 2 * k), sx = W / 2 + (x + 7 - W / 2) * e, sy = H * 0.4 + (y + 4 - H * 0.4) * e - Math.sin(k * Math.PI) * 22;
    const st = cached('jarchipstar', () => { const p = new Pix(11, 11); p.map(1, 1, ['....#....', '....#....', '...###...', '#########', '.#######.', '..#####..', '..#####..', '.###.###.', '.#.....#.'], { '#': '#ffd23f' }); p.px(5, 4, '#fff6b8'); p.outline(); return p.canvas(); });
    c.drawImage(st, Math.round(sx - 5), Math.round(sy - 5));
  }
}

const STAR5 = ['..#..', '.###.', '#####', '.###.', '.#.#.'];
/** the jar on its little stool, holding n stars (they pile up from the bottom, three to a row) */
export function jarSprite(n, full = false) {
  return cached('jar' + n + (full ? 'f' : ''), () => {
    const p = new Pix(JAR_W, JAR_H);
    // stool
    p.rect(4, 26, 22, 3, '#c58b5a'); p.hline(4, 25, 26, '#dba877'); p.rect(6, 29, 2, 6, '#a8703f'); p.rect(22, 29, 2, 6, '#a8703f'); p.hline(7, 22, 32, '#a8703f');
    // glass
    const GL = '#eaf6ff', RIM = '#9cc7e6';
    p.rect(5, 5, 20, 21, GL); p.rect(4, 7, 22, 17, GL);
    p.vline(4, 7, 23, RIM); p.vline(25, 7, 23, RIM); p.hline(6, 23, 25, RIM); p.px(5, 24, RIM); p.px(24, 24, RIM); p.px(5, 6, RIM); p.px(24, 6, RIM);
    // stars
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 3), col = i % 3;
      const x = 6 + col * 7 + (row % 2), y = 20 - row * 5;
      p.map(x, y, STAR5, { '#': '#ffb800' }); p.px(x + 2, y + 2, '#fff2a0'); p.px(x + 2, y + 1, '#ffe066');
    }
    p.vline(6, 9, 15, '#ffffff'); // shine
    // lid (a gold one when the jar is full)
    p.rect(6, 2, 18, 3, full ? '#ffd23f' : '#ef6f6c'); p.hline(6, 23, 2, full ? '#fff6b8' : '#ff9a97'); p.rect(5, 4, 20, 1, full ? '#e0a820' : '#c94f4f');
    p.outline();
    return p.canvas();
  });
}
