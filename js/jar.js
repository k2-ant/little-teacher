// v2.4 the class star jar ("el frasco de estrellas"): a reason to come back.
// Finishing something (a traced letter, a built word, a sorted round of shapes, an answered question, a helped
// friend, a watered plant…) drops a star into the jar. The count is saved straight away, so a five-minute visit
// still adds to it. When the jar is full she taps it: a class party, and a new sticker for the book.
import { G, persist } from './state.js';
import { Pix, cached } from './raster.js';

export const JAR_MAX = 12;
export const JAR_W = 30, JAR_H = 36;
export const jarCount = () => Math.max(0, Math.min(JAR_MAX, (G.save && G.save.jar) | 0));
/** a star for the jar; the classroom shows it flying in the next time the room is on screen */
export function earnStar(n = 1) {
  if (!G.save) return;
  G.save.jar = Math.min(JAR_MAX, jarCount() + n);
  persist();
}
export function emptyJar() { G.save.jar = 0; G.save.parties = (G.save.parties | 0) + 1; persist(); }

const STAR5 = ['..#..', '#####', '.###.', '##.##'];
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
      p.map(x, y, STAR5, { '#': '#ffc21a' }); p.px(x + 2, y + 1, '#fff2a0'); p.px(x + 2, y + 2, '#ffe066');
    }
    p.vline(6, 9, 15, '#ffffff'); // shine
    // lid (a gold one when the jar is full)
    p.rect(6, 2, 18, 3, full ? '#ffd23f' : '#ef6f6c'); p.hline(6, 23, 2, full ? '#fff6b8' : '#ff9a97'); p.rect(5, 4, 20, 1, full ? '#e0a820' : '#c94f4f');
    p.outline();
    return p.canvas();
  });
}
