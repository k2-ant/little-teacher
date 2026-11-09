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

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const D = (c, img, x, y) => c.drawImage(img, Math.round(x), Math.round(y));
const INK = S.INK;
const inRect = (x, y, r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// ------------------------------------------------------------------ the blocks (her real order)
// calm: interruptions (knocks, raised paws, moods, naughty) may happen; cards: star / green / red shown
export const BLOCKS = [
  { id: 'decorar', words: ['Decorar'], col: '#ff8fb8' },
  { id: 'manana', words: ['Trabajo de', 'la mañana'], col: '#ffc21f', choices: ['pizarra', 'numeros'], calm: true, cards: true },
  { id: 'calendario', words: ['Calendario'], col: '#ef6f6c', choices: ['ayudantes', 'emociones'] },
  { id: 'alfabeto', words: ['Alfabeto'], col: '#64a8e8', choices: ['letras'], calm: true, cards: true },
  { id: 'recreo', words: ['Recreo'], col: '#7dd370', choices: ['recreo'] },
  { id: 'lectura', words: ['Lectura con', 'Maestra'], col: '#b48be6', choices: ['cuento'] },
  { id: 'heggerty', words: ['Heggerty'], col: '#ff9a2e', choices: ['silabas'], calm: true, cards: true },
  { id: 'sla', words: ['S.L.A'], col: '#2f9e9e', choices: ['figuras', 'pizarra'], calm: true, cards: true },
  { id: 'centros', words: ['Centros de', 'Aprendizaje'], col: '#5f86b8', choices: ['centros'], calm: true, cards: true },
  { id: 'almuerzo', words: ['Almuerzo'], col: '#ef4b4b', choices: ['almuerzo'], cards: true },
  { id: 'lector', words: ['Lector', 'Misterioso'], col: '#e0559a', choices: ['lector'] },
  { id: 'casa', words: ['Casa'], col: '#a8703f' },
];
export const CHOICE_WORDS = {
  pizarra: 'Pizarra', numeros: 'Números', letras: 'Letras', silabas: 'Sílabas', figuras: 'Figuras', ayudantes: 'Ayudantes',
  emociones: 'Emociones', recreo: 'Recreo', cuento: 'Cuento', centros: 'Centros', almuerzo: 'Almuerzo', lector: 'Lector',
};
const byId = (id) => BLOCKS.findIndex(b => b.id === id);

// ------------------------------------------------------------------ a tiny 3-px font for the card words
// rows top→bottom: capitals use rows 0-4, lowercase x-height rows 1-4, ascenders row 0, descenders 5-6
const TF = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'], M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  P: ['##.', '#.#', '##.', '#..', '#..'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'], '.': ['.', '.', '.', '.', '#'],
  a: ['...', '.##', '#.#', '#.#', '.##'], b: ['#..', '##.', '#.#', '#.#', '##.'], c: ['...', '.##', '#..', '#..', '.##'],
  d: ['..#', '.##', '#.#', '#.#', '.##'], e: ['...', '.#.', '###', '#..', '.##'], f: ['.##', '#..', '##.', '#..', '#..'],
  g: ['...', '.##', '#.#', '#.#', '.##', '..#', '##.'], h: ['#..', '##.', '#.#', '#.#', '#.#'], i: ['#', '.', '#', '#', '#'],
  j: ['.#', '..', '.#', '.#', '.#', '.#', '#.'], l: ['#.', '#.', '#.', '#.', '.#'], m: ['.....', '####.', '#.#.#', '#.#.#', '#.#.#'],
  n: ['...', '##.', '#.#', '#.#', '#.#'], 'ñ': ['###', '##.', '#.#', '#.#', '#.#'], o: ['...', '.#.', '#.#', '#.#', '.#.'],
  p: ['...', '##.', '#.#', '#.#', '##.', '#..', '#..'], r: ['...', '#.#', '##.', '#..', '#..'], s: ['...', '.##', '#..', '..#', '##.'],
  t: ['.#.', '###', '.#.', '.#.', '..#'], u: ['...', '#.#', '#.#', '#.#', '.##'], 'ú': ['..#', '.#.', '#.#', '#.#', '.##'],
  'í': ['.#', '..', '#.', '#.', '#.'], y: ['...', '#.#', '#.#', '#.#', '.##', '..#', '##.'], z: ['...', '###', '..#', '#..', '###'],
  v: ['...', '#.#', '#.#', '#.#', '.#.'],
};
/** the words of a card (one or two lines) as a tiny sprite */
export function tinyText(lines, col = INK) {
  if (typeof lines === 'string') lines = [lines];
  return cached('tiny' + lines.join('|') + col, () => {
    const wOf = (s) => [...s].reduce((n, ch) => n + (ch === ' ' ? 2 : (TF[ch] ? TF[ch][0].length : 3) + 1), -1);
    const w = Math.max(1, ...lines.map(wOf)), lh = 7;
    const p = new Pix(w, lh * (lines.length - 1) + 7);
    lines.forEach((s, k) => {
      let x = 0;
      for (const ch of s) {
        if (ch === ' ') { x += 2; continue; }
        const g = TF[ch] || TF[ch.toLowerCase()] || ['###', '#.#', '#.#', '#.#', '###'];
        p.map(x, k * lh, g, { '#': col });
        x += g[0].length + 1;
      }
    });
    return p.canvas();
  });
}

// ------------------------------------------------------------------ 14x14 card pictures
export function blockIcon(id) {
  return cached('bicon' + id, () => {
    const p = new Pix(14, 14);
    if (id === 'decorar') { // rainbow paintbrush stroke
      ['#ef6f6c', '#ffa65c', '#ffd23f', '#7dd370', '#64a8e8'].forEach((c, i) => { for (let x = 0; x < 9; x++) p.px(x, 11 - i + Math.round(Math.sin(x / 2)), c); });
      p.line(8, 7, 13, 1, '#a8703f'); p.line(9, 7, 13, 2, '#c98c55'); p.rect(6, 7, 3, 3, '#9aa7b8'); p.rect(4, 9, 3, 3, '#ff8fb8');
    }
    if (id === 'manana') { // morning sun + a pencil on a worksheet
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; p.px(4 + Math.cos(a) * 4, 4 + Math.sin(a) * 4, '#ffb020'); }
      p.ball(4, 4, 2.4, 2.4, '#ffd23f', { hi: false });
      p.rect(5, 7, 8, 7, '#fffaf0'); p.hline(6, 11, 9, '#9fc4ea'); p.hline(6, 11, 11, '#9fc4ea');
      p.line(13, 3, 8, 12, '#ef6f6c'); p.line(12, 3, 7, 12, '#ff9a8a'); p.px(7, 13, INK); p.px(13, 2, '#ffb7c9');
    }
    if (id === 'calendario') {
      p.rect(1, 2, 12, 11, '#fffaf0'); p.rect(1, 2, 12, 3, '#ef6f6c'); p.px(4, 1, '#7d899c'); p.px(9, 1, '#7d899c');
      for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) p.px(2 + q * 3, 6 + r * 2, r === 1 && q === 2 ? '#2f7de1' : '#d8c7a8');
      p.rect(7, 7, 3, 3, '#ffd23f'); p.px(8, 8, '#ef6f6c');
    }
    if (id === 'alfabeto') { // A (red) b (blue) on little blocks
      p.rect(0, 3, 7, 8, '#ffd8d6'); p.map(1, 4, ['.#.', '#.#', '###', '#.#', '#.#'], { '#': '#ef4b4b' }, 1);
      p.rect(7, 4, 7, 8, '#d6eaff'); p.map(9, 5, ['#..', '#..', '##.', '#.#', '##.'], { '#': '#2f7de1' }, 1);
      p.rect(0, 10, 7, 1, '#ef9a96'); p.rect(7, 11, 7, 1, '#8fb9e8');
    }
    if (id === 'recreo') { // the slide
      p.vline(2, 2, 13, '#64a8e8'); p.vline(5, 2, 13, '#64a8e8'); for (let y = 4; y < 13; y += 3) p.hline(2, 5, y, '#bfe0ff');
      for (let i = 0; i < 9; i++) { p.px(5 + i, 2 + i, '#ffd23f'); p.px(5 + i, 3 + i, '#ffd23f'); p.px(5 + i, 4 + i, '#f5b000'); }
      p.rect(1, 1, 6, 2, '#ef6f6c'); p.hline(0, 13, 13, '#7dd370');
    }
    if (id === 'lectura') { // the teacher reads a big book to the class
      p.ell(7, 3, 2.4, 2.4, '#f6d2b8'); p.rect(4, 1, 7, 2, '#8a5730'); p.px(6, 3, INK); p.px(8, 3, INK);
      p.rect(1, 6, 6, 7, '#fffaf0'); p.rect(7, 6, 6, 7, '#fffaf0'); p.vline(7, 6, 12, '#b48be6'); p.hline(1, 12, 13, '#b48be6');
      heart(p, 2, 8, '#ff6f91'); p.hline(8, 11, 8, '#c9b8e8'); p.hline(8, 11, 10, '#c9b8e8');
    }
    if (id === 'heggerty') { // an ear listening to sounds
      p.ell(5, 7, 3.6, 5.4, '#f6c08a'); p.ell(5.5, 7, 1.6, 3, '#e09a6a'); p.px(6, 9, '#f6c08a');
      for (const r of [3, 5]) for (let a = -0.9; a <= 0.9; a += 0.15) p.px(9 + Math.cos(a) * r, 7 + Math.sin(a) * r, r === 3 ? '#ff9a2e' : '#ffc21f');
    }
    if (id === 'sla') { // a paper with lines + a pencil
      p.rect(1, 1, 9, 12, '#fffaf0'); for (let y = 3; y < 12; y += 2) p.hline(2, 8, y, y === 3 ? '#ef6f6c' : '#9fc4ea');
      p.line(13, 2, 7, 12, '#2f9e9e'); p.line(12, 2, 6, 12, '#7ad0c8'); p.px(6, 13, INK); p.px(13, 1, '#ffb7c9');
    }
    if (id === 'centros') {
      p.rect(0, 1, 14, 12, '#5f86b8'); p.rect(1, 2, 12, 10, '#dfeefc');
      ['#ef6f6c', '#64a8e8', '#ffd23f', '#7dd370'].forEach((c, i) => { const x = 1 + (i % 2) * 6, y = 2 + Math.floor(i / 2) * 5; p.rect(x + 1, y + 1, 4, 3, c); });
    }
    if (id === 'almuerzo') { // a lunchbox and an apple
      p.rect(0, 6, 9, 7, '#ef4b4b'); p.rect(0, 6, 9, 2, '#ff8080'); p.rect(3, 3, 3, 1, '#7d899c'); p.vline(3, 3, 5, '#7d899c'); p.vline(5, 3, 5, '#7d899c'); p.rect(4, 9, 1, 2, '#ffd23f');
      p.ball(11, 9, 2.6, 2.8, '#7dd370', { hi: false }); p.px(11, 5, '#8a5730'); p.px(12, 6, '#3cb44b');
    }
    if (id === 'lector') { // a book with a big ?
      p.rect(1, 2, 12, 11, '#e0559a'); p.rect(2, 3, 10, 9, '#ff9ec4'); p.vline(1, 2, 12, '#a8306a');
      p.map(5, 3, ['.##.', '#..#', '...#', '..#.', '.#..', '....', '.#..'], { '#': '#fffaf0' }, 1);
    }
    if (id === 'casa') {
      for (let i = 0; i < 6; i++) p.hline(6 - i, 7 + i, 1 + i, '#ef6f6c');
      p.rect(2, 7, 10, 6, '#ffe7b8'); p.rect(6, 9, 3, 4, '#a8703f'); p.rect(3, 8, 2, 2, '#8fd0ff'); p.px(10, 1, '#8a5730'); p.px(10, 2, '#8a5730');
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
      p.ball(9, 9, 7.5, 7.5, '#ffd23f', { hi: false }); p.rect(6, 6, 2, 3, INK); p.rect(11, 6, 2, 3, INK);
      p.px(5, 12, INK); p.hline(6, 12, 13, INK); p.px(13, 12, INK); p.px(4, 10, '#ff9a9a'); p.px(14, 10, '#ff9a9a');
    }
    if (id === 'lector') { const cv = p.canvas(); cv.getContext('2d').drawImage(blockIcon('lector'), 2, 2); return cv; }
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
  const st = { cur: 0, done: new Set(), t0: 0, pending: null, going: false, casaArm: 0, pinY: null, labelUntil: 0, used: false, wig: 0 };
  let LY = null; // chart layout (full-buffer coordinates)
  let press = null;

  function layout(V, compact) {
    const i = V.inset, top = i.t + 2, x = i.l + 2;
    const w = compact ? 18 : 66, headH = compact ? 0 : 18;
    const n = BLOCKS.length;
    const avail = V.H - i.b - 2 - top - headH - 3;
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
      st.cur = k; st.t0 = G.time; st.used = false; st.labelUntil = G.time + 6;
      if (via === 'next') sfx.bell(); else { sfx.chime(); }
      api.say(LD.SCHED_SAY[id]);
      await api.leave();
      if (id !== 'decorar' && !api.kidsIn()) await api.arrive(id !== 'manana');
      st.t0 = G.time;
      st.going = false;
      await api.enter(id);
    } finally { st.going = false; }
  }
  function next() {
    if (api.locked()) return;
    const k = Math.min(BLOCKS.length - 1, st.cur + 1);
    go(BLOCKS[k].id, 'next');
  }
  function reset() { st.cur = 0; st.done.clear(); st.t0 = G.time; st.pending = null; st.casaArm = 0; st.used = false; st.going = false; }
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
      const bob = asking ? Math.round(Math.abs(Math.sin(G.time * 7)) * 2) : 0;
      const yy = cd.y + (pressed ? 1 : 0) - bob;
      if (on || asking) {
        const fr = cardFrame(cw, cd.h, fill, b.col, 'on');
        c.globalAlpha = 0.7 + 0.3 * Math.sin(G.time * 4);
        D(c, glow(fr, '#ffd23f', 'schedglow' + cw + 'x' + cd.h), cd.x - 2, yy - 2);
        c.globalAlpha = 1;
      }
      D(c, cardFrame(cw, cd.h, fill, b.col, ''), cd.x, yy);
      const ic = blockIcon(b.id);
      D(c, ic, cd.x + (compact ? Math.round((cw - 14) / 2) + 1 : 3), yy + Math.round((cd.h - 14) / 2));
      if (!compact) {
        const tx = tinyText(b.words);
        D(c, tx, cd.x + 19, yy + Math.round((cd.h - (b.words.length > 1 ? 12 : 5)) / 2));
      }
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
  function hitCard(x, y) { return LY && x < LY.right ? LY.cards.find(cd => inRect(x, y, { x: cd.x - 1, y: cd.y - 1, w: cd.w + 4, h: cd.h + 1 })) : null; }
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
    if (cd.k === st.cur && cd.id !== 'casa') { sfx.pop(1.2); st.wig = G.time + 0.4; st.labelUntil = G.time + 3; api.sayUI('b_' + cd.id); return true; }
    sfx.pop(); go(cd.id, 'tap');
    return true;
  }
  const taking = () => !!press;

  // ---- the big choice cards in the room (room coordinates)
  function choiceRects(V, lo, hi) {
    const ids = cur().choices || [];
    const ws = ids.map(id => Math.max(38, tinyText(CHOICE_WORDS[id] || id).width + 8)), ch = 33, gap = 6;
    const tot = ws.reduce((a, w) => a + w, 0) + (ids.length - 1) * gap;
    const x0 = Math.round(clamp((lo + hi) / 2 - tot / 2, lo, Math.max(lo, hi - tot)));
    const y = V.H - V.inset.b - ch - 3;
    let x = x0;
    return ids.map((id, k) => { const r = { id, x, y, w: ws[k], h: ch }; x += ws[k] + gap; return r; });
  }
  function drawChoices(c, rects, btnFrame, pressId) {
    const pulse = !st.used && !purposeDone();
    rects.forEach((r, k) => {
      const bob = pulse && Math.floor(G.time * 2) % 4 === k % 4 ? -1 : 0;
      const dn = pressId === r.id ? 1 : 0, y = r.y + bob + dn;
      if (pulse) { c.globalAlpha = 0.5 + 0.4 * Math.sin(G.time * 4 + k); D(c, glow(btnFrame(r.w, r.h, '#fff6c8', 'ch'), '#ffd23f', 'chglow' + r.w), r.x - 2, y - 2); c.globalAlpha = 1; }
      D(c, btnFrame(r.w, r.h, '#fff6c8', 'ch'), r.x, y);
      D(c, choiceIcon(r.id), r.x + Math.round((r.w - 18) / 2), y + 3);
      const tx = tinyText(CHOICE_WORDS[r.id] || r.id);
      D(c, tx, r.x + Math.round((r.w - tx.width) / 2), y + 22);
    });
  }

  // test hooks
  window.__ltSched = () => ({ cur: cur().id, done: [...st.done], pending: st.pending && st.pending.id, going: st.going, calm: calmNow(), purpose: purposeDone() });

  return {
    BLOCKS, layout, go, next, reset, tick, calmNow, purposeDone, drawChart, drawLabel, down, up, taking, choiceRects, drawChoices,
    get cur() { return cur(); }, get curId() { return cur().id; }, get t0() { return st.t0; }, get going() { return st.going; },
    get casaAsking() { return G.time < st.casaArm; }, get layoutInfo() { return LY; },
    markUsed() { st.used = true; },
    get nextId() { return BLOCKS[Math.min(BLOCKS.length - 1, st.cur + 1)].id; }, get used() { return st.used; },
    cardPt(id) { const cd = LY && LY.cards.find(q => q.id === id); return cd ? { x: cd.x + cd.w / 2, y: cd.y + cd.h / 2 } : null; },
  };
}
