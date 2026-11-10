// v2.0 the day as a picture schedule: a vertical "Horario" pocket chart down the left edge, like the one
// on Louise's classroom wall (cloud header, white cards with a picture + the words, a clothespin on the
// current card). ▶ "siguiente" moves the clothespin to the next card; tapping any card jumps there.
// classroom.js owns the room and the activities; this module owns the chart, its order and the
// day's flow (createSchedule(api) gets small callbacks into the room).
import { G, clamp } from './state.js';
import { Pix, cached, glow, darken, lighten } from './raster.js';
import * as S from './sprites.js';
import * as DC from './decor.js';
import { sfx } from './audio.js';
import * as LD from './learndata.js';
import { wordSprite } from './i18n.js';
import { jobsButtonIcon } from './rituals.js';
import * as UI from './ui.js';

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const D = (c, img, x, y) => c.drawImage(img, Math.round(x), Math.round(y));
const INK = S.INK;
const inRect = (x, y, r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// ------------------------------------------------------------------ the blocks (her real order)
// calm: interruptions (knocks, raised paws, moods, naughty) may happen; cards: star / green / red shown
export const BLOCKS = [
  { id: 'decorar', words: ['Decorar'], col: '#ff8fb8' },
  { id: 'manana', words: ['Mañana'], col: '#ffc21f', choices: ['pizarra', 'numeros'], calm: true, cards: true },
  { id: 'calendario', words: ['Calendario'], col: '#ef6f6c', choices: ['ayudantes', 'emociones'] },
  { id: 'alfabeto', words: ['Alfabeto'], col: '#64a8e8', choices: ['letras'], calm: true, cards: true },
  { id: 'recreo', words: ['Recreo'], col: '#7dd370', choices: ['recreo'] },
  { id: 'lectura', words: ['Lectura'], col: '#b48be6', choices: ['cuento'] },
  { id: 'heggerty', words: ['Heggerty'], col: '#ff9a2e', choices: ['silabas'], calm: true, cards: true },
  { id: 'sla', words: ['S.L.A'], col: '#2f9e9e', choices: ['figuras', 'pizarra'], calm: true, cards: true },
  { id: 'centros', words: ['Centros'], col: '#5f86b8', choices: ['centros'], calm: true, cards: true },
  { id: 'almuerzo', words: ['Almuerzo'], col: '#ef4b4b', choices: ['almuerzo'], cards: true },
  { id: 'lector', words: ['Lector'], col: '#e0559a', choices: ['lector'] },
  { id: 'casa', words: ['Casa'], col: '#a8703f' },
];
export const CHOICE_WORDS = { // (spoken, not drawn: the choice cards are icon-only)
  pizarra: 'Pizarra', numeros: 'Números', letras: 'Letras', silabas: 'Sílabas', figuras: 'Figuras', ayudantes: 'Ayudantes',
  emociones: 'Emociones', recreo: 'Recreo', cuento: 'Cuento', centros: 'Centros', almuerzo: 'Almuerzo', lector: 'Lector',
};
const byId = (id) => BLOCKS.findIndex(b => b.id === id);

// ------------------------------------------------------------------ the card labels' pixel font
// v2.3: one short word per card in a 4-wide pixel face (x-height 5, caps 7, descenders 2), dark plum ink.
// rows 0-6 sit on the baseline at row 6; g / y hang into rows 7-8. (UI labels only: the learning letters are i18n.js)
const TF = {
  A: ['.##.', '#..#', '#..#', '####', '#..#', '#..#', '#..#'], C: ['.###', '#...', '#...', '#...', '#...', '#...', '.###'],
  D: ['###.', '#..#', '#..#', '#..#', '#..#', '#..#', '###.'], H: ['#..#', '#..#', '#..#', '####', '#..#', '#..#', '#..#'],
  L: ['#...', '#...', '#...', '#...', '#...', '#...', '####'], M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  R: ['###.', '#..#', '#..#', '###.', '#.#.', '#..#', '#..#'], S: ['.###', '#...', '#...', '.##.', '...#', '...#', '###.'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  a: ['....', '....', '.##.', '...#', '.###', '#..#', '.###'], b: ['#...', '#...', '###.', '#..#', '#..#', '#..#', '###.'],
  c: ['...', '...', '.##', '#..', '#..', '#..', '.##'], d: ['...#', '...#', '.###', '#..#', '#..#', '#..#', '.###'],
  e: ['....', '....', '.##.', '#..#', '####', '#...', '.###'], f: ['.##', '#..', '###', '#..', '#..', '#..', '#..'],
  g: ['....', '....', '.###', '#..#', '#..#', '#..#', '.###', '...#', '###.'], i: ['#', '.', '#', '#', '#', '#', '#'],
  l: ['#', '#', '#', '#', '#', '#', '#'], m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['....', '....', '###.', '#..#', '#..#', '#..#', '#..#'], 'ñ': ['.#.#', '#.#.', '###.', '#..#', '#..#', '#..#', '#..#'],
  o: ['....', '....', '.##.', '#..#', '#..#', '#..#', '.##.'], r: ['...', '...', '#.#', '##.', '#..', '#..', '#..'],
  s: ['....', '....', '.###', '#...', '.##.', '...#', '###.'], t: ['.#.', '.#.', '###', '.#.', '.#.', '.#.', '..#'],
  u: ['....', '....', '#..#', '#..#', '#..#', '#..#', '.###'], y: ['....', '....', '#..#', '#..#', '#..#', '#..#', '.###', '...#', '###.'],
  z: ['....', '....', '####', '...#', '.##.', '#...', '####'],
};
export const LABEL_INK = '#5a4560';
/** a card's word as a pixel sprite (9 rows: 7 to the baseline + 2 for descenders) */
export function tinyText(lines, col = LABEL_INK) {
  const s = typeof lines === 'string' ? lines : lines.join(' ');
  return cached('tiny2' + s + col, () => {
    const gl = (ch) => TF[ch] || TF[ch.toLowerCase()] || ['####', '#..#', '#..#', '#..#', '#..#', '#..#', '####'];
    const w = Math.max(1, [...s].reduce((n, ch) => n + (ch === ' ' ? 3 : gl(ch)[0].length + 1), -1));
    const p = new Pix(w, 9);
    let x = 0;
    for (const ch of s) {
      if (ch === ' ') { x += 3; continue; }
      const g = gl(ch);
      p.map(x, 0, g, { '#': col });
      x += g[0].length + 1;
    }
    return p.canvas();
  });
}

// ------------------------------------------------------------------ 20x16 card pictures
// v2.1: picture-first cards: bigger, wider pictures (the words are secondary); every block has its own clear scene
export const ICON_W = 20, ICON_H = 16;
const T_SKIN = '#f6d2b8', T_HAIR = '#8f6142', T_TOP = '#86b2ea';
export function blockIcon(id) {
  return cached('bicon2' + id, () => {
    const p = new Pix(ICON_W, ICON_H);
    if (id === 'decorar') { // a rainbow paint stroke and the brush that made it
      ['#ef6f6c', '#ffa65c', '#ffd23f', '#7dd370', '#64a8e8'].forEach((c, i) => { for (let x = 0; x < 13; x++) p.px(x, 13 - i + Math.round(Math.sin(x / 2.2) * 1.5), c); });
      p.line(13, 9, 19, 1, '#a8703f'); p.line(14, 9, 19, 2, '#c98c55'); p.rect(11, 8, 3, 3, '#9aa7b8'); p.px(12, 8, '#d8dee8');
      p.rect(9, 10, 3, 3, '#ff8fb8'); p.px(8, 12, '#ff8fb8');
    }
    if (id === 'manana') { // the morning sun over a worksheet and a pencil
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; p.px(4 + Math.cos(a) * 4.2, 4 + Math.sin(a) * 4.2, '#ffb020'); }
      p.ball(4, 4, 2.6, 2.6, '#ffd23f', { hi: false });
      p.rect(6, 5, 10, 11, '#fffaf0'); p.hline(7, 14, 8, '#ef9a96'); p.hline(7, 14, 10, '#9fc4ea'); p.hline(7, 12, 12, '#9fc4ea'); p.hline(7, 13, 14, '#9fc4ea');
      p.line(19, 3, 13, 14, '#ef6f6c'); p.line(18, 2, 12, 13, '#ff9a8a'); p.px(12, 14, INK); p.px(19, 2, '#ffb7c9'); p.px(18, 1, '#ffb7c9');
    }
    if (id === 'calendario') { // a wall calendar with today circled
      p.rect(2, 2, 16, 14, '#fffaf0'); p.rect(2, 2, 16, 4, '#ef6f6c'); p.px(6, 1, '#7d899c'); p.px(13, 1, '#7d899c'); p.px(6, 2, '#7d899c'); p.px(13, 2, '#7d899c');
      for (let r = 0; r < 3; r++) for (let q = 0; q < 5; q++) p.rect(3 + q * 3, 7 + r * 3, 2, 2, '#e3d6c4');
      p.rect(11, 9, 4, 4, '#ffd23f'); p.rect(12, 10, 2, 2, '#ef6f6c');
    }
    if (id === 'alfabeto') { // big A (red) and b (blue) on two letter blocks
      p.rect(0, 2, 10, 13, '#ffd8d6'); p.map(2, 4, ['.#.', '#.#', '###', '#.#', '#.#'], { '#': '#ef4b4b' }, 2);
      p.rect(10, 3, 10, 13, '#d6eaff'); p.map(12, 5, ['#..', '#..', '##.', '#.#', '##.'], { '#': '#2f7de1' }, 2);
      p.hline(0, 9, 14, '#ef9a96'); p.hline(10, 19, 15, '#8fb9e8');
    }
    if (id === 'recreo') { // the slide and a ball on the grass
      p.vline(2, 2, 14, '#64a8e8'); p.vline(5, 2, 14, '#64a8e8'); for (let y = 4; y < 14; y += 3) p.hline(2, 5, y, '#bfe0ff');
      for (let i = 0; i < 10; i++) { p.px(5 + i, 3 + i, '#ffd23f'); p.px(5 + i, 4 + i, '#ffd23f'); p.px(5 + i, 5 + i, '#f5b000'); }
      p.rect(1, 1, 6, 2, '#ef6f6c'); p.hline(0, 19, 15, '#7dd370');
      p.ball(17, 12, 2.4, 2.4, '#ef6f6c'); p.px(16, 11, '#ffd23f');
    }
    if (id === 'lectura') { // Louise holding an open picture book
      p.ell(5, 5, 4.2, 4.6, T_HAIR); p.rect(1, 5, 2, 6, T_HAIR); p.rect(7, 5, 2, 6, T_HAIR);
      p.ell(5, 5.6, 2.8, 3, T_SKIN); p.rect(2, 2, 6, 2, T_HAIR); p.px(4, 5, INK); p.px(6, 5, INK); p.px(5, 7, '#e8505b');
      p.rect(2, 10, 7, 6, T_TOP); p.vline(5, 10, 15, '#6c97d2');
      p.rect(8, 6, 6, 9, '#fffaf0'); p.rect(14, 6, 6, 9, '#fffaf0'); p.vline(14, 6, 14, '#b48be6'); p.hline(8, 19, 15, '#b48be6');
      heart(p, 9, 8, '#ff6f91'); p.hline(15, 18, 9, '#c9b8e8'); p.hline(15, 18, 11, '#c9b8e8'); p.hline(15, 17, 13, '#c9b8e8');
      p.rect(7, 11, 2, 2, T_SKIN);
    }
    if (id === 'heggerty') { // an ear listening, sound waves and a little note: sounds and rhymes
      const sk = '#f6c08a', sh = '#d98a5a';
      p.ell(5.5, 6, 4.6, 5.6, sk); p.ell(4.6, 11.4, 2.9, 3.6, sk); // the ear and its lobe
      p.ell(6.6, 6.4, 2.5, 3.6, sh); p.ell(6, 6.2, 1.2, 2.5, sk); p.rect(7, 9, 2, 2, '#a85a3a'); p.vline(1, 5, 9, '#e8a870');
      for (const [r, c] of [[6, '#ff9a2e'], [8.2, '#ffc21f']]) for (let a = -0.75; a <= 0.75; a += 0.08) p.px(7 + Math.cos(a) * r, 7 + Math.sin(a) * r, c);
      p.ball(17.4, 13.4, 1.8, 1.4, '#7a5bc0', { hi: false }); p.vline(19, 5, 13, '#7a5bc0'); p.px(18, 5, '#7a5bc0'); p.px(17, 6, '#7a5bc0');
    }
    if (id === 'sla') { // a paper with a little drawing and a line of writing, and the pencil
      p.rect(1, 1, 13, 15, '#fffaf0');
      for (let i = 0; i < 4; i++) p.hline(7 - i, 7 + i, 2 + i, '#ef6f6c'); // a little house: roof
      p.rect(4, 6, 7, 4, '#ffd23f'); p.rect(6, 7, 2, 3, '#a8703f'); p.px(9, 7, '#8fd0ff');
      p.hline(3, 11, 12, '#9fc4ea'); p.hline(3, 8, 14, '#9fc4ea');
      p.line(19, 1, 12, 14, '#2f9e9e'); p.line(18, 1, 11, 14, '#7ad0c8'); p.px(11, 15, INK); p.px(19, 0, '#ffb7c9'); p.px(18, 0, '#ffb7c9');
    }
    if (id === 'centros') { // four stations: paint, books, letters, blocks
      p.rect(0, 0, 20, 16, '#5f86b8'); p.rect(1, 1, 18, 14, '#dfeefc');
      p.rect(2, 2, 7, 5, '#ffd8d6'); p.ball(4, 4, 1.4, 1.4, '#ef6f6c', { hi: false }); p.px(6, 3, '#64a8e8'); p.px(7, 5, '#7dd370');
      p.rect(11, 2, 7, 5, '#e6dcf8'); p.rect(12, 3, 2, 3, '#ef6f6c'); p.rect(14, 3, 2, 3, '#64a8e8'); p.rect(16, 3, 1, 3, '#7dd370');
      p.rect(2, 9, 7, 5, '#fff3c4'); p.map(4, 9, ['.#.', '#.#', '###', '#.#', '#.#'], { '#': '#2f7de1' });
      p.rect(11, 9, 7, 5, '#dff5d8'); p.rect(12, 11, 3, 3, '#ffd23f'); p.rect(15, 11, 2, 3, '#ef6f6c'); p.rect(13, 9, 3, 2, '#64a8e8');
    }
    if (id === 'almuerzo') { // a lunchbox and a red apple
      p.rect(0, 6, 11, 9, '#ef4b4b'); p.rect(0, 6, 11, 2, '#ff8080'); p.hline(3, 7, 3, '#7d899c'); p.vline(3, 3, 5, '#7d899c'); p.vline(7, 3, 5, '#7d899c'); p.rect(4, 10, 3, 2, '#ffd23f');
      p.ball(15.5, 10.5, 3.6, 3.8, '#ef6f6c'); p.px(15, 6, '#8a5730'); p.px(15, 5, '#8a5730'); p.rect(16, 4, 2, 2, '#3cb44b');
    }
    if (id === 'lector') { // someone mysterious behind the door, and a big ?
      p.rect(0, 0, 12, 16, '#a8703f'); p.rect(1, 1, 10, 15, '#ffe9a8');
      p.ball(5, 5, 2.6, 2.6, '#5a4a78', { hi: false }); p.ell(5, 13, 4, 4.5, '#5a4a78', { y1: 15 });
      p.rect(9, 1, 2, 15, '#c98c55'); p.px(9, 9, '#ffd23f');
      p.map(12, 1, ['.##.', '#..#', '...#', '..#.', '.#..', '....', '.#..'], { '#': '#e0559a' }, 2);
    }
    if (id === 'casa') { // home, with a tree by the door
      for (let i = 0; i < 7; i++) p.hline(7 - i, 8 + i, 1 + i, '#ef6f6c');
      p.rect(2, 8, 12, 8, '#ffe7b8'); p.rect(7, 10, 3, 6, '#a8703f'); p.rect(3, 9, 3, 3, '#8fd0ff'); p.rect(11, 9, 2, 2, '#8fd0ff'); p.px(11, 2, '#8a5730'); p.px(11, 3, '#8a5730');
      p.vline(17, 11, 15, '#8a5730'); p.ball(17, 9, 2.6, 3, '#7dd370');
    }
    p.outline();
    return p.canvas();
  });
}
function heart(p, x, y, c) { p.map(x, y, ['.#.#.', '#####', '.###.', '..#..'], { '#': c }); }

/** 18x18 pictures for the big choice cards in the room */
export function choiceIcon(id) {
  if (id === 'letras') return DC.trayIcon('aa');
  if (id === 'ayudantes') return jobsButtonIcon();
  if (id === 'cuento') return S.ICONS.book();
  if (id === 'centros') return DC.trayIcon('centros');
  if (id === 'almuerzo') return S.ICONS.apple();
  if (id === 'recreo') return S.ICONS.ball();
  return cached('cicon' + id, () => {
    const p = new Pix(18, 18);
    if (id === 'pizarra') {
      p.rect(1, 2, 16, 12, '#9aa7b8'); p.rect(2, 3, 14, 10, '#fffaf0');
      p.ball(6, 7, 2.2, 2.2, '#ffd23f', { hi: false }); p.line(9, 11, 12, 5, '#ef4b4b'); p.line(12, 5, 15, 11, '#ef4b4b');
      p.rect(3, 14, 3, 2, '#2f7de1'); p.rect(8, 14, 3, 2, '#3cb44b');
    }
    if (id === 'numeros') { p.rect(0, 3, 18, 12, '#fffaf0'); p.map(1, 5, ['.#..###.###', '##....#...#', '.#..###..##', '.#..#.....#', '###.###.###'], { '#': '#9b59d0' }); p.map(1, 5, ['.#', '##', '.#', '.#', '##'], { '#': '#ef4b4b' }); }
    if (id === 'silabas') { p.rect(0, 4, 9, 10, '#ffd8d6'); p.rect(9, 4, 9, 10, '#d6eaff'); p.map(1, 7, ['####.', '#.#.#', '#.#.#'], { '#': '#ef4b4b' }); p.map(11, 7, ['.##.', '#.#.', '.##.'], { '#': '#2f7de1' }); p.rect(14, 7, 1, 3, '#2f7de1'); }
    if (id === 'figuras') {
      p.ball(5, 5, 3.6, 3.6, '#ef6f6c', { hi: false }); p.rect(10, 2, 7, 7, '#64a8e8');
      for (let i = 0; i < 7; i++) p.hline(8 - i, 8 + i, 10 + i, '#ffd23f');
    }
    if (id === 'emociones') {
      p.ball(9, 9, 7.5, 7.5, '#ff9f4a', { hi: false }); p.rect(6, 6, 2, 3, INK); p.rect(11, 6, 2, 3, INK); // (orange, so it shows on the yellow choice card)
      p.px(5, 12, INK); p.hline(6, 12, 13, INK); p.px(13, 12, INK); p.px(4, 10, '#ff9a9a'); p.px(14, 10, '#ff9a9a');
    }
    if (id === 'lector') { const cv = p.canvas(); cv.getContext('2d').drawImage(blockIcon('lector'), -1, 1); return cv; }
    p.outline();
    return p.canvas();
  });
}

// ------------------------------------------------------------------ chart pieces
function cloud(w, h) {
  return cached('hcloud' + w + 'x' + h, () => {
    const p = new Pix(w, h);
    const n = Math.max(3, Math.round(w / 12));
    for (let k = 0; k < n; k++) { const x = 5 + k * (w - 10) / (n - 1); p.ell(x, h / 2 - (k % 2 ? 2 : 0), 6, h / 2 - 2, '#ffffff'); }
    p.rect(4, 4, w - 8, h - 7, '#ffffff');
    p.outline('#5f86b8', 0.6);
    return p.canvas();
  });
}
function clothespin() { // a wooden clothespin, clipped on sideways like on her classroom chart
  return cached('clothespin2', () => {
    const p = new Pix(9, 22);
    p.rect(1, 0, 3, 22, '#e2ad72'); p.rect(5, 0, 3, 22, '#c98c55'); p.rect(4, 0, 1, 22, '#8a5730');
    p.rect(0, 9, 9, 4, '#b0b8c4'); p.hline(0, 8, 9, '#e6ebf2'); p.hline(0, 8, 12, '#7d899c'); // the metal spring
    p.vline(1, 1, 7, '#f6cf98'); p.vline(1, 14, 20, '#f6cf98');
    p.outline();
    return p.canvas();
  });
}
function tickImg() {
  return cached('schedtick', () => { const p = new Pix(8, 7); p.line(0, 3, 2, 5, '#3cb44b'); p.line(2, 5, 6, 1, '#3cb44b'); p.line(1, 3, 2, 4, '#3cb44b'); p.line(2, 6, 7, 1, '#3cb44b'); p.outline('#ffffff', 0.9); return p.canvas(); });
}
function cardFrame(w, h, fill, edge, key) {
  return cached('scard' + w + 'x' + h + fill + edge + key, () => {
    const p = new Pix(w, h);
    p.rect(1, 0, w - 2, h, '#b9a99a'); p.rect(0, 1, w, h - 2, '#b9a99a');
    p.rect(1, 1, w - 2, h - 2, fill); p.rect(1, 1, 2, h - 2, edge);
    p.rect(1, h - 2, w - 2, 1, darken(fill, 0.12));
    return p.canvas();
  });
}

// ------------------------------------------------------------------ the controller
/**
 * api (from classroom.js): busy(), locked(), kidsIn(), leave(from) → Promise, arrive(fast) → Promise,
 * enter(id) → Promise, done(id) → bool (the block's purpose is done), choose(id), running() → bool,
 * say(text), sayUI(key), askHome()
 */
export function createSchedule(api) {
  const st = { cur: byId('manana'), done: new Set(), t0: 0, pending: null, going: false, casaArm: 0, pinY: null, labelUntil: 0, used: false, wig: 0, bounce: null, ret: null };
  // v2.1: the day starts at Trabajo de la mañana (the class walks in); Decorar is optional: its card opens the tray any time
  // and ▶ then goes back to the block she was in (st.ret)
  let LY = null; // chart layout (full-buffer coordinates)
  let press = null;

  function layout(V, compact) {
    // phones: every pixel of height goes to the cards (12 cards share ~390 CSS px), and a bit more width
    const i = V.inset, top = i.t + (compact ? 1 : 2), x = i.l + 2;
    const w = compact ? ICON_W + 4 : 72, headH = compact ? 0 : 18;
    const n = BLOCKS.length;
    const avail = V.H - i.b - top - headH - (compact ? 2 : 5);
    const pitch = clamp(Math.floor(avail / n), 14, 20), h = pitch - 1;
    const cards = BLOCKS.map((b, k) => ({ id: b.id, k, x, w, h, y: k === 0 ? top : top + headH + 3 + k * pitch }));
    LY = { compact, x, w, cards, head: { x, y: top + pitch + 1, w, h: headH }, right: x + w + (compact ? 4 : 6) };
    return LY.right; // the room starts here
  }
  const cur = () => BLOCKS[st.cur];

  // ---- flow
  async function go(id, via = 'tap') {
    if (api.locked()) return;
    const k = byId(id); if (k < 0) return;
    if (st.going || api.busy()) { st.pending = { id, via }; api.sayUI('b_' + id); st.labelUntil = G.time + 3; return; }
    if (id === 'casa' && G.time > st.casaArm) { // first ask: "¿Ya nos vamos a casa?"; the card pulses for 4 s
      st.casaArm = G.time + 4; api.askHome(); st.labelUntil = G.time + 4; return;
    }
    st.casaArm = 0;
    st.going = true;
    try {
      if (k !== st.cur) st.done.add(cur().id);
      if (id === 'decorar' && cur().id !== 'decorar') st.ret = cur().id; // ▶ comes back here when the room is ready
      st.cur = k; st.t0 = G.time; st.used = false; st.labelUntil = G.time + 6;
      if (via === 'next') sfx.bell(); else { sfx.chime(); }
      api.say(LD.SCHED_SAY[id]); st.bounce = { id, t0: G.time }; // the owl announces it: its card bounces
      await api.leave();
      if (id !== 'decorar' && !api.kidsIn()) await api.arrive(id !== 'manana');
      st.t0 = G.time;
      st.going = false;
      await api.enter(id);
    } finally { st.going = false; }
  }
  function next() {
    if (api.locked()) return;
    go(nextId(), 'next');
  }
  /** ▶: the next card; from Decorar, back to the block she came from */
  function nextId() {
    if (cur().id === 'decorar') return st.ret || 'manana';
    return BLOCKS[Math.min(BLOCKS.length - 1, st.cur + 1)].id;
  }
  function reset() { st.cur = byId('manana'); st.done.clear(); st.t0 = G.time; st.pending = null; st.casaArm = 0; st.used = false; st.going = false; st.ret = null; st.bounce = null; }
  function tick() {
    if (st.pending && !st.going && !api.busy() && !api.locked()) { const p = st.pending; st.pending = null; go(p.id, p.via); }
  }
  /** interruptions (knocks, raised paws, moods, naughty) may start: calm blocks only, never in a block's first 20 s */
  function calmNow() { return !!cur().calm && !st.going && G.time - st.t0 > 20; }
  function purposeDone() { return api.done(cur().id); }

  // ---- the chart
  function drawChart(c, V, phase) {
    if (!LY) return;
    const { compact, x, w } = LY;
    // the wall panel behind the chart
    R(c, 0, 0, LY.right - 2, V.H, '#e9d6b8'); R(c, LY.right - 3, 0, 1, V.H, '#c9ab84');
    if (!compact) { // cloud header "Horario"
      const hd = LY.head, cl = cloud(hd.w, hd.h);
      D(c, cl, hd.x, hd.y);
      const wd = wordSprite('Horario', '#2f6fb8');
      D(c, wd, hd.x + Math.round((hd.w - wd.width) / 2), hd.y + Math.round((hd.h - wd.height) / 2));
    } else R(c, x, LY.cards[1].y - 2, w, 1, '#a8703f'); // phones: a thin rail between Decorar and the day
    const curK = st.cur;
    const pinTarget = LY.cards[curK].y - 1;
    if (st.pinY == null) st.pinY = pinTarget;
    st.pinY += (pinTarget - st.pinY) * Math.min(1, 0.18 * 60 / 60);
    for (const cd of LY.cards) {
      const b = BLOCKS[cd.k], on = cd.k === curK, asking = b.id === 'casa' && G.time < st.casaArm;
      const pressed = press && press.card === cd;
      const cw = on ? cd.w + (compact ? 2 : 4) : cd.w;
      const fill = on ? '#fff6c8' : cd.k === 0 ? '#ffeef4' : '#ffffff';
      const bt = st.bounce && st.bounce.id === b.id ? G.time - st.bounce.t0 : 9;
      const bob = asking ? Math.round(Math.abs(Math.sin(G.time * 7)) * 2) : bt < 1.2 ? Math.round(Math.abs(Math.sin(bt * 8)) * 4 * (1 - bt / 1.2)) : 0;
      const yy = cd.y + (pressed ? 1 : 0) - bob;
      if (on || asking) {
        const fr = cardFrame(cw, cd.h, fill, b.col, 'on');
        c.globalAlpha = 0.7 + 0.3 * Math.sin(G.time * 4);
        D(c, glow(fr, '#ffd23f', 'schedglow' + cw + 'x' + cd.h), cd.x - 2, yy - 2);
        c.globalAlpha = 1;
      }
      // v2.3: cards that aren't now fade as a whole (picture, frame and word together); the word is always dark plum ink
      if (!on && !asking && !pressed) c.globalAlpha = 0.62;
      D(c, cardFrame(cw, cd.h, fill, b.col, ''), cd.x, yy);
      const ic = blockIcon(b.id);
      D(c, ic, cd.x + (compact ? Math.round((cw - ICON_W) / 2) : 2), yy + Math.round((cd.h - ICON_H) / 2));
      if (!compact) { // picture first, then one short word
        const tx = tinyText(b.words);
        D(c, tx, cd.x + ICON_W + 4 + Math.max(0, Math.floor((cw - ICON_W - 6 - (on ? 6 : 0) - tx.width) / 2)), yy + Math.round((cd.h - 7) / 2)); // (clear of the clothespin)
      }
      c.globalAlpha = 1;
      if (st.done.has(b.id) && !on) D(c, tickImg(), cd.x + (compact ? cw - 8 : 1), yy - 1);
    }
    // the clothespin clipped on the right edge of the current card
    const pc = LY.cards[curK], wig = G.time < st.wig ? Math.round(Math.sin(G.time * 30)) : 0;
    D(c, clothespin(), pc.x + pc.w + (compact ? 2 : 4) - 5 + wig, Math.round(st.pinY) + Math.round((pc.h - 22) / 2));
    if (phase === 'title') { c.fillStyle = 'rgba(255,240,220,0.45)'; c.fillRect(0, 0, LY.right - 2, V.H); }
    if (phase === 'night' || phase === 'reward') { c.fillStyle = 'rgba(20,16,50,0.35)'; c.fillRect(0, 0, LY.right - 2, V.H); }
  }
  /** phones: the words of the current card float next to the chart for a moment */
  function drawLabel(c, ox) {
    if (!LY || !LY.compact || G.time > st.labelUntil) return;
    const k = st.pending ? byId(st.pending.id) : st.cur, cd = LY.cards[k], b = BLOCKS[k];
    const tx = tinyText(b.words), w = tx.width + 8, h = tx.height + 6, x = 2, y = clamp(cd.y + cd.h / 2 - h / 2, 2, 400);
    R(c, x - 1 + 0, y, w + 2, h, '#b9a99a'); R(c, x, y - 1, w, h + 2, '#b9a99a'); R(c, x, y, w, h, '#fffaf0');
    R(c, x - 3, y + h / 2 - 1, 3, 3, '#fffaf0');
    D(c, tx, x + 4, y + 3);
  }
  // a card's hit area: on phones the whole width of the column and the whole pitch (no gaps), from the screen's edge
  const hitRect = (cd) => (LY.compact ? { x: 0, y: cd.y - 1, w: LY.right - 2, h: cd.h + 1 } : { x: cd.x - 1, y: cd.y - 1, w: cd.w + 4, h: cd.h + 1 });
  function hitCard(x, y) { return LY && x < LY.right ? LY.cards.find(cd => inRect(x, y, hitRect(cd))) : null; }
  /** a press in full-buffer coordinates; true when the chart takes it */
  function down(x, y) {
    if (!LY || x >= LY.right) return false;
    press = { card: hitCard(x, y) };
    return true;
  }
  function up(x, y) {
    const p = press; press = null;
    if (!p) return false;
    const cd = hitCard(x, y);
    if (!cd || cd !== p.card) { if (!cd) sfx.softPop(); return true; }
    if (api.locked()) { sfx.tap(); return true; }
    if (cd.k === st.cur && cd.id !== 'casa') { sfx.pop(1.2); st.wig = G.time + 0.4; st.labelUntil = G.time + 3; st.bounce = { id: cd.id, t0: G.time }; api.sayUI('b_' + cd.id); return true; }
    sfx.pop(); go(cd.id, 'tap');
    return true;
  }
  const taking = () => !!press;

  // ---- the big choice cards in the room (room coordinates)
  // v2.3: icon-first: no word on the card (it's spoken on tap), the picture at 2x on a yellow chunky button
  const CH_W = 46, CH_H = 42;
  function choiceRects(V, lo, hi) {
    const ids = cur().choices || [];
    const ch = CH_H, gap = 6;
    const tot = ids.length * CH_W + (ids.length - 1) * gap;
    const x0 = Math.round(clamp((lo + hi) / 2 - tot / 2, lo, Math.max(lo, hi - tot)));
    const y = V.H - V.inset.b - ch - 2;
    return ids.map((id, k) => ({ id, x: x0 + k * (CH_W + gap), y, w: CH_W, h: ch }));
  }
  const big = (im) => cached('ch2x' + (im.__chid ||= Math.random()), () => {
    const cv = document.createElement('canvas'); cv.width = im.width * 2; cv.height = im.height * 2;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, cv.width, cv.height); return cv;
  });
  function drawChoices(c, rects, _btnFrame, pressId) {
    const now = !st.used && !purposeDone(); // "pick one!": a gentle 2 px bob and a bright gold rim
    rects.forEach((r, k) => {
      const dn = pressId === r.id;
      const bob = now && !dn ? -Math.round(Math.abs(Math.sin(G.time * 2.6 + k * 1.3)) * 2) : 0;
      UI.drawBtn(c, r.x, r.y + bob, r.w, r.h, UI.FACE.yellow, dn, big(choiceIcon(r.id)), now ? '#e07a00' : null);
    });
  }

  // test hooks
  window.__ltSched = () => ({ cur: cur().id, done: [...st.done], pending: st.pending && st.pending.id, going: st.going, calm: calmNow(), purpose: purposeDone(), bounce: st.bounce && G.time - st.bounce.t0 < 1.2 ? st.bounce.id : null, ret: st.ret });

  return {
    BLOCKS, layout, go, next, reset, tick, calmNow, purposeDone, drawChart, drawLabel, down, up, taking, choiceRects, drawChoices,
    get cur() { return cur(); }, get curId() { return cur().id; }, get t0() { return st.t0; }, get going() { return st.going; },
    get casaAsking() { return G.time < st.casaArm; }, get layoutInfo() { return LY; },
    markUsed() { st.used = true; },
    get nextId() { return nextId(); }, get used() { return st.used; },
    cardRects() { return LY ? LY.cards.map(cd => ({ id: cd.id, art: { x: cd.x, y: cd.y, w: cd.w, h: cd.h }, hit: hitRect(cd) })) : []; },
    cardPt(id) { const cd = LY && LY.cards.find(q => q.id === id); return cd ? { x: cd.x + cd.w / 2, y: cd.y + cd.h / 2 } : null; },
  };
}
