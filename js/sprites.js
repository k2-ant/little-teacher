import { Pix, cached, darken, lighten } from './raster.js';

export const INK = '#2b1d2e';
const WHITE = '#ffffff';
const BLUSH = '#ff9fb4';
const PINK = '#ff8fae';

// ---------------------------------------------------------------- students
export const KINDS = ['bunny', 'puppy', 'turtle', 'owl', 'frog'];
export const PAL = {
  bunny: { fur: '#fff4ee', shadow: '#ead2d4', inner: '#ffb7c9', top: '#b9a5ec', feet: '#fff4ee', voice: 1.9, accent: '#b9a5ec' },
  puppy: { fur: '#f1c27c', shadow: '#d39b55', ear: '#8f5a3a', muzzle: '#fff1d8', top: '#f1c27c', feet: '#f1c27c', voice: 1.5, accent: '#e0475b' },
  turtle: { fur: '#97d883', shadow: '#6db35d', shell: '#3f9a72', shellHi: '#6fcb9b', rim: '#e3c97a', top: '#f3e09e', feet: '#97d883', voice: 1.2, accent: '#ffcf4a' },
  owl: { fur: '#ad7d5a', shadow: '#87583c', disk: '#f6e3c2', top: '#ad7d5a', belly: '#ecd2a4', feet: '#ff9f3a', voice: 1.4, accent: '#7a5bc0' },
  frog: { fur: '#86d36a', shadow: '#5fae4c', belly: '#e3f5b0', top: '#86d36a', feet: '#86d36a', voice: 1.7, accent: '#ff7fb5' },
};
export const SW = 34, SH = 42; // student sprite size; anchor = bottom centre

function arms(p, C, st, phase) {
  const col = C.top;
  const big = C === PAL.owl;
  const rx = big ? 3 : 2.6, ry = big ? 4.6 : 3.6;
  const sides = [['L', st.armL || 'down'], ['R', st.armR || 'down']];
  for (const [side, pose] of sides) {
    const m = side === 'L' ? (x) => x : (x) => 34 - x;
    const up = pose === 'up' || pose === 'wave1' || pose === 'wave2';
    if ((phase === 'back') !== up) continue;
    if (pose === 'down') p.limb(m(9.4), 31, rx, ry, col);
    else if (pose === 'up') p.limb(m(5.6), 17, rx, ry + 1, col);
    else if (pose === 'wave1') p.limb(m(4.6), 15.5, rx, ry + 1, col);
    else if (pose === 'wave2') p.limb(m(7), 16.5, rx, ry + 1, col);
    else if (pose === 'front') p.limb(m(13.8), 30, rx, ry - 0.6, col);
    else if (pose === 'clap') p.limb(m(15.8), 29.2, rx, ry - 0.6, col);
  }
}

function feet(p, C, f) {
  const lift = [0, 0, 0];
  if (f === 1) lift[0] = 1.2; if (f === 2) lift[1] = 1.2;
  p.ball(12.8, 39 - lift[0], 3.2, 2, C.feet, { hi: false });
  p.ball(21.2, 39 - lift[1], 3.2, 2, C.feet, { hi: false });
}

/** generic chibi face (bunny, puppy, turtle) */
function face(p, st, my, opts = {}) {
  const l = st.look || 0;
  const ey = opts.ey ?? 17;
  eyes(p, st.eyes || 'open', 12 + l, ey, 20 + l);
  if (st.blush !== false) {
    p.px(10, ey + 4, BLUSH); p.px(11, ey + 4, BLUSH);
    p.px(22, ey + 4, BLUSH); p.px(23, ey + 4, BLUSH);
  }
  mouth(p, st.mouth || 'smile', my, 0);
}
function eyes(p, kind, xl, y, xr) {
  for (const x of [xl, xr]) {
    if (kind === 'open') { p.rect(x, y, 2, 3, INK); p.px(x, y, WHITE); p.px(x + 1, y + 2, '#5a4560'); }
    else if (kind === 'wide') { p.rect(x - 1, y - 1, 3, 4, INK); p.px(x - 1, y - 1, WHITE); p.px(x, y, WHITE); }
    else if (kind === 'closed') { p.px(x - 1, y + 1, INK); p.px(x, y + 2, INK); p.px(x + 1, y + 2, INK); p.px(x + 2, y + 1, INK); }
    else if (kind === 'blink') { p.rect(x - 1, y + 2, 4, 1, INK); }
    else if (kind === 'happy') { p.px(x - 1, y + 2, INK); p.px(x, y + 1, INK); p.px(x + 1, y + 1, INK); p.px(x + 2, y + 2, INK); }
    else if (kind === 'sleepy') { p.rect(x, y + 1, 2, 2, INK); p.rect(x - 1, y + 1, 4, 1, darken('#fff4ee', 0.5)); }
  }
}
function mouth(p, kind, my, dx) {
  const X = (x) => x + dx;
  if (kind === 'smile') { p.px(X(15), my, INK); p.px(X(16), my + 1, INK); p.px(X(17), my + 1, INK); p.px(X(18), my, INK); }
  else if (kind === 'open') { p.rect(X(15), my, 4, 3, INK); p.px(X(16), my + 2, '#ff7b93'); p.px(X(17), my + 2, '#ff7b93'); p.px(X(16), my + 1, '#7a2e45'); p.px(X(17), my + 1, '#7a2e45'); }
  else if (kind === 'o') { p.rect(X(16), my, 2, 2, INK); p.px(X(16), my + 1, '#7a2e45'); }
  else if (kind === 'grin') { p.px(X(14), my, INK); p.px(X(19), my, INK); p.rect(X(15), my + 1, 4, 2, INK); p.px(X(16), my + 2, '#ff7b93'); p.px(X(17), my + 2, '#ff7b93'); }
  else if (kind === 'flat') { p.rect(X(15), my + 1, 4, 1, INK); }
  else if (kind === 'frown') { p.px(X(15), my + 1, INK); p.px(X(16), my, INK); p.px(X(17), my, INK); p.px(X(18), my + 1, INK); }
  else if (kind === 'munch') { p.rect(X(15), my, 4, 2, INK); p.px(X(16), my + 1, '#7a2e45'); p.px(X(17), my + 1, '#7a2e45'); }
}

function drawBunny(p, C, st) {
  const tw = st.earUp ? -1 : 0;
  // left ear (upright)
  p.ball(12.4, 8 + tw, 2.9, 7.6, C.fur, { shadow: C.shadow });
  p.ell(12.4, 9 + tw, 1.3, 5.4, C.inner);
  // right ear (floppy)
  p.ball(21.8, 9.5, 2.9, 4.6, C.fur, { shadow: C.shadow, hi: false });
  p.ball(25.4, 6.6 - tw * 0.5, 3.8, 2.4, C.fur, { shadow: C.shadow, hi: false });
  p.ell(21.8, 10.5, 1.3, 2.6, C.inner); p.ell(25.6, 6.6 - tw * 0.5, 2.2, 1, C.inner);
  feet(p, C, st.feet);
  arms(p, C, st, 'back');
  p.ball(17, 31, 7.6, 6.6, C.top, { shadow: darken(C.top, 0.2) });
  // sweater collar + heart
  p.ell(17, 25, 4.5, 1.6, '#fff8f2', null, true);
  p.px(16, 31, '#ff8fb8'); p.px(18, 31, '#ff8fb8'); p.rect(16, 32, 3, 1, '#ff8fb8'); p.px(17, 33, '#ff8fb8'); p.px(17, 31, '#ff8fb8');
  arms(p, C, st, 'front');
  p.ball(17, 18, 10.5, 9, C.fur, { shadow: C.shadow });
  p.under(17, 18, 10.5, 9, darken(C.top, 0.35));
  face(p, st, 23);
  p.px(16, 21, PINK); p.px(17, 21, PINK); p.px(16, 22, darken(PINK, 0.2));
}

function drawPuppy(p, C, st) {
  const w = st.wag ? 1 : -1;
  p.ball(26.5 + w, 29 - (st.wag ? 1 : 0), 1.9, 3.4, C.fur, { shadow: C.shadow, hi: false }); // tail
  feet(p, C, st.feet);
  arms(p, C, st, 'back');
  p.ball(17, 31, 7.6, 6.6, C.fur, { shadow: C.shadow });
  p.ell(17, 32.5, 4.4, 4, C.muzzle, null, true);
  p.ell(17, 31, 7.6, 6.6, C.accent, { y0: 25, y1: 26 }, true); // collar
  p.rect(16, 27, 2, 2, '#ffd447'); p.px(16, 27, '#fff2a0');
  arms(p, C, st, 'front');
  p.ball(17, 18, 10.5, 9, C.fur, { shadow: C.shadow });
  p.under(17, 18, 10.5, 9, C.shadow);
  p.ell(21.2, 17.8, 3.7, 3.4, C.ear); // eye patch
  p.ell(17, 22.6, 4.6, 3, C.muzzle);
  const eu = st.earUp ? -2 : 0;
  p.ball(7.4, 19 + eu, 3.1, 6.4, C.ear, { hi: false });
  p.ball(26.6, 19 + eu, 3.1, 6.4, C.ear, { hi: false });
  face(p, st, 23);
  p.ell(17, 20.8, 1.9, 1.2, INK); p.px(16, 20, '#8a7c90');
  if (st.mouth === 'smile' && st.tongue) { p.px(16, 25, '#ff7b93'); p.px(17, 25, '#ff7b93'); }
}

function drawTurtle(p, C, st) {
  const hide = st.hide || 0;
  if (hide > 0) {
    p.ell(17, 37.5, 12.5, 3.4, C.rim);
    p.ball(17, 32, 11.6, 8.6, C.shell, { shadow: darken(C.shell, 0.2) });
    for (const [x, y] of [[11, 31], [17, 28], [23, 31], [14, 35], [20, 35]]) p.ell(x, y, 2.4, 1.9, C.shellHi, null, true);
    p.px(15, 26, lighten(C.shell, 0.6)); p.px(14, 27, lighten(C.shell, 0.6));
    p.rect(13, 25, 8, 1, '#ffcf4a'); // little beanie poking out
    if (hide < 1) {
      p.ell(17, 37.6, 5, 2, '#1d2a24');
      const l = st.look || 0;
      p.px(15 + l, 37, WHITE); p.px(18 + l, 37, WHITE); p.px(15 + l, 38, INK); p.px(18 + l, 38, INK);
    }
    return;
  }
  feet(p, C, st.feet);
  arms(p, C, st, 'back');
  p.ell(17, 31, 10.8, 8.2, C.rim);
  p.ball(17, 30.4, 9.8, 7.3, C.shell, { hi: false });
  p.ell(8.8, 29, 1.6, 2.4, C.shellHi, null, true); p.ell(25.2, 29, 1.6, 2.4, C.shellHi, null, true);
  p.ball(17, 32, 6.6, 5.8, C.top, { hi: false });
  p.hline(13, 21, 31, darken(C.top, 0.15)); p.vline(17, 27, 36, darken(C.top, 0.15));
  arms(p, C, st, 'front');
  p.ball(17, 18, 10.3, 8.8, C.fur, { shadow: C.shadow });
  p.under(17, 18, 10.3, 8.8, C.shadow);
  // beanie
  p.ell(17, 13.5, 9.6, 5.4, C.accent, { y1: 12 });
  p.hline(9, 25, 13, '#f0a93a'); p.hline(8, 26, 12, '#f0a93a');
  p.px(12, 10, lighten(C.accent, 0.5)); p.px(13, 9, lighten(C.accent, 0.5));
  p.ball(17, 7.6, 2.3, 2.2, '#ff7f6e', { hi: false });
  face(p, st, 22);
}

function ring(p, cx, cy, r0, r1, c) {
  for (let y = Math.floor(cy - r1); y <= cy + r1; y++) for (let x = Math.floor(cx - r1); x <= cx + r1; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d >= r0 && d <= r1) p.px(x, y, c);
  }
}
function drawOwl(p, C, st) {
  const l = st.look || 0;
  feet(p, C, st.feet);
  arms(p, C, st, 'back');
  p.ball(17, 31, 8, 6.8, C.fur, { shadow: C.shadow });
  p.ell(17, 32, 5, 4.6, C.belly, null, true);
  for (const [x, y] of [[15, 30], [19, 30], [17, 32], [15, 34], [19, 34]]) { p.px(x, y, '#c99e6e'); p.px(x + 1, y + 1, '#c99e6e'); p.px(x - 1, y + 1, '#c99e6e'); }
  arms(p, C, st, 'front');
  // ear tufts
  p.ball(9.2, 10 - (st.earUp ? 1 : 0), 2.4, 3.6, C.fur, { shadow: C.shadow, hi: false });
  p.ball(24.8, 10 - (st.earUp ? 1 : 0), 2.4, 3.6, C.fur, { shadow: C.shadow, hi: false });
  p.ball(17, 18, 10.6, 9, C.fur, { shadow: C.shadow });
  p.under(17, 18, 10.6, 9, C.shadow);
  // head stripe
  p.px(16, 10, C.shadow); p.px(17, 10, C.shadow); p.px(16, 11, C.shadow); p.px(17, 11, C.shadow);
  p.ell(12.8, 18.4, 4.7, 4.6, C.disk); p.ell(21.2, 18.4, 4.7, 4.6, C.disk);
  const e = st.eyes || 'open';
  eyes(p, e === 'open' ? 'wide' : e, 13 + l, 17, 21 + l);
  ring(p, 12.8, 18.4, 3.2, 4.1, C.accent); ring(p, 21.2, 18.4, 3.2, 4.1, C.accent);
  p.px(16, 18, C.accent); p.px(17, 18, C.accent);
  p.px(12, 14, lighten(C.accent, 0.6)); p.px(20, 14, lighten(C.accent, 0.6));
  // beak
  p.rect(16, 21, 2, 2, '#ffae4a'); p.px(16, 21, '#ffd08a'); p.px(16, 23, '#e07a20'); p.px(17, 23, '#e07a20');
  const m = st.mouth || 'smile';
  if (m === 'open' || m === 'grin' || m === 'munch') { p.rect(15, 24, 4, 2, INK); p.px(16, 25, '#ff7b93'); p.px(17, 25, '#ff7b93'); }
  else if (m === 'o') { p.rect(16, 24, 2, 2, INK); }
  if (st.blush !== false) { p.px(8, 22, BLUSH); p.px(9, 22, BLUSH); p.px(24, 22, BLUSH); p.px(25, 22, BLUSH); }
}

function drawFrog(p, C, st) {
  const l = st.look || 0;
  feet(p, C, st.feet);
  arms(p, C, st, 'back');
  p.ball(17, 32, 7.8, 6, C.fur, { shadow: C.shadow });
  p.ell(17, 33, 5.2, 4.2, C.belly, null, true);
  arms(p, C, st, 'front');
  p.ball(17, 20, 11.6, 8, C.fur, { shadow: C.shadow });
  p.under(17, 20, 11.6, 8, C.shadow);
  p.ball(11, 13.4, 4.4, 4.1, C.fur, { shadow: C.shadow, hi: false });
  p.ball(23, 13.4, 4.4, 4.1, C.fur, { shadow: C.shadow, hi: false });
  const e = st.eyes || 'open';
  if (e === 'open' || e === 'wide') {
    for (const cx of [11, 23]) {
      p.ell(cx, 13.2, 2.9, 2.7, WHITE);
      const w = e === 'wide' ? 3 : 2;
      p.rect(cx - 1 + l, 12, w, 3, INK); p.px(cx - 1 + l, 12, WHITE);
    }
  } else eyes(p, e, 10 + l, 11, 22 + l);
  const m = st.mouth || 'smile';
  if (m === 'smile') { p.px(11, 22, INK); p.px(12, 23, INK); p.hline(13, 20, 24, INK); p.px(21, 23, INK); p.px(22, 22, INK); }
  else if (m === 'open' || m === 'grin') { p.px(11, 22, INK); p.px(22, 22, INK); p.rect(12, 23, 10, 2, INK); p.rect(13, 25, 8, 1, INK); p.hline(14, 19, 25, '#ff7b93'); }
  else if (m === 'o') { p.rect(16, 23, 2, 2, INK); }
  else if (m === 'frown') { p.px(12, 24, INK); p.hline(13, 20, 23, INK); p.px(21, 24, INK); }
  else mouth(p, m, 23, 0);
  if (st.blush !== false) { p.px(8, 22, BLUSH); p.px(9, 22, BLUSH); p.px(24, 22, BLUSH); p.px(25, 22, BLUSH); }
  // bow
  p.map(14, 15, ['#...#', '##@##', '#...#'], { '#': C.accent, '@': darken(C.accent, 0.25) });
  p.px(14, 15, lighten(C.accent, 0.4));
  p.px(15, 9, lighten(C.fur, 0.5)); // shine
}

const DRAW = { bunny: drawBunny, puppy: drawPuppy, turtle: drawTurtle, owl: drawOwl, frog: drawFrog };
// feelings overlays: eyebrows, tears, anger marks, sweat drops
const EYES = { bunny: [12, 20, 17], puppy: [12, 20, 17], turtle: [12, 20, 17], owl: [13, 21, 16], frog: [10, 22, 11] };
function drawMood(p, kind, mood, look) {
  const [xl0, xr0, ey] = EYES[kind];
  const xl = xl0 + look, xr = xr0 + look, by = ey - 2, B = '#5a3a4a';
  if (mood === 'sad') {
    p.px(xl - 1, by + 1, B); p.px(xl, by, B); p.px(xl + 1, by, B);
    p.px(xr + 2, by + 1, B); p.px(xr + 1, by, B); p.px(xr, by, B);
    p.px(xl, ey + 3, '#7ec8ff'); p.px(xl, ey + 4, '#7ec8ff'); p.px(xl - 1, ey + 5, '#bfe6ff');
  } else if (mood === 'angry') {
    p.px(xl - 1, by, B); p.px(xl, by, B); p.px(xl + 1, by + 1, B);
    p.px(xr + 2, by, B); p.px(xr + 1, by, B); p.px(xr, by + 1, B);
    for (const [x, y] of [[26, 8], [28, 8], [27, 9], [26, 10], [28, 10]]) p.px(x, y, '#ef4b4b');
  } else if (mood === 'scared') {
    p.hline(xl - 1, xl + 1, by - 1, B); p.hline(xr, xr + 2, by - 1, B);
    p.px(27, 12, '#9fd8ff'); p.px(27, 13, '#9fd8ff'); p.px(26, 13, '#bfe6ff'); p.px(27, 14, '#7ec8ff');
  }
}
export function student(kind, st) {
  const key = kind + '|' + [st.eyes, st.mouth, st.armL, st.armR, st.feet | 0, st.look | 0, st.blush, st.hide, st.wag ? 1 : 0, st.earUp ? 1 : 0, st.tongue ? 1 : 0, st.mood || ''].join(',');
  return cached(key, () => {
    const p = new Pix(SW, SH);
    DRAW[kind](p, PAL[kind], st);
    if (st.mood && !(st.hide > 0)) drawMood(p, kind, st.mood, st.look | 0);
    p.outline();
    return p.canvas();
  });
}

// ---------------------------------------------------------------- furniture
export const CHAIR_COLS = ['#ef7a63', '#64a8e8', '#f6c445', '#79c96b', '#b48be6', '#ff9ec4'];
export const DESK_W = 32, DESK_H = 22;
export function desk(i, bare = false) {
  return cached('desk' + i + bare, () => {
    const p = new Pix(DESK_W, DESK_H);
    const wood = '#dca46a';
    p.rect(3, 11, 2, 10, '#7f8ca3'); p.rect(27, 11, 2, 10, '#7f8ca3');
    p.px(3, 11, '#a9b5c9'); p.px(27, 11, '#a9b5c9');
    p.rect(2, 20, 4, 2, '#5e6a80'); p.rect(26, 20, 4, 2, '#5e6a80');
    p.rect(4, 11, 24, 4, '#a86b3a'); p.hline(4, 27, 11, '#8e5730');
    p.rect(1, 4, 30, 6, wood); p.hline(1, 30, 4, '#f0c792'); p.hline(2, 29, 5, '#e8b67e');
    p.rect(1, 9, 30, 2, '#b77942');
    p.px(8, 7, '#c88f55'); p.px(9, 7, '#c88f55'); p.px(20, 6, '#c88f55'); p.px(21, 6, '#c88f55'); p.px(22, 6, '#c88f55');
    // a little thing on each desk
    const k = bare ? -1 : i % 5;
    if (k === 0) { p.hline(21, 27, 6, '#ffcf4a'); p.px(28, 6, '#ff9aa8'); p.px(20, 6, INK); }
    if (k === 1) { p.rect(4, 5, 6, 3, '#6fb6ff'); p.hline(4, 9, 5, '#a9d4ff'); p.vline(7, 5, 7, '#fff'); }
    if (k === 2) { p.rect(23, 5, 4, 3, '#ff8f8f'); p.px(24, 4, '#7dc96b'); }
    if (k === 3) { p.rect(4, 5, 5, 3, '#c9a2ff'); p.rect(5, 4, 5, 1, '#e3d0ff'); }
    if (k === 4) { p.hline(20, 25, 7, '#7dc96b'); p.hline(20, 25, 6, '#ff8fb8'); }
    p.outline();
    return p.canvas();
  });
}
export function chair(i) {
  return cached('chair' + i, () => {
    const p = new Pix(24, 14);
    const c = CHAIR_COLS[i % CHAIR_COLS.length];
    p.rect(2, 0, 20, 9, c); p.hline(2, 21, 0, lighten(c, 0.4)); p.hline(3, 20, 1, lighten(c, 0.2));
    p.rect(2, 7, 20, 2, darken(c, 0.2));
    p.rect(4, 9, 2, 5, '#7f8ca3'); p.rect(18, 9, 2, 5, '#7f8ca3');
    p.outline();
    return p.canvas();
  });
}
export function rug(cols = ['#e8738a', '#ffd166', '#6cc2b8', '#fff6e6', '#b892e0']) {
  return cached('rug' + cols.join(), () => {
    const p = new Pix(84, 32);
    const rings = [[cols[0], 40.5, 15], [cols[1], 35, 12.5], [cols[2], 28.5, 10], [cols[3], 21, 7.2], [cols[4], 12, 4.2]];
    for (const [c, rx, ry] of rings) p.ell(42, 16, rx, ry, c);
    // stars on the yellow ring
    for (const a of [0.3, 1.1, 2.0, 2.9, 3.6, 4.5, 5.3]) {
      const x = 42 + Math.cos(a) * 31.5, y = 16 + Math.sin(a) * 11.2;
      p.px(x, y, '#ff9f3a'); p.px(x - 1, y, '#ffb85c'); p.px(x + 1, y, '#ffb85c'); p.px(x, y - 1, '#ffb85c'); p.px(x, y + 1, '#ffb85c');
    }
    for (let a = 0; a < Math.PI * 2; a += 0.25) p.px(42 + Math.cos(a) * 38, 16 + Math.sin(a) * 13.6, lighten(cols[0], 0.45));
    p.outline('#5a2a3a', 0.5);
    return p.canvas();
  });
}
export function plant() {
  return cached('plant', () => {
    const p = new Pix(28, 38);
    const L = ['#4f9e52', '#62b95e', '#7fd370'];
    p.line(14, 26, 8, 12, '#3d7d40'); p.line(14, 26, 20, 10, '#3d7d40'); p.line(14, 26, 14, 6, '#3d7d40');
    p.ball(8, 13, 6, 4.6, L[1]); p.ball(20, 11, 6, 4.4, L[1]);
    p.ball(14, 7, 5, 4.6, L[2]); p.ball(6, 21, 5, 3.5, L[0]); p.ball(22, 20, 5, 3.6, L[0]);
    p.ball(14, 16, 4.6, 4.4, L[2]);
    for (const [x, y] of [[8, 13], [20, 11], [14, 7], [14, 16]]) p.px(x, y, '#3d7d40');
    // pot
    for (let y = 25; y < 37; y++) { const inset = Math.floor((y - 25) / 4); p.hline(6 + inset, 21 - inset, y, y < 28 ? '#e0805a' : '#c96643'); }
    p.hline(5, 22, 25, '#f09a74'); p.hline(5, 22, 26, '#e0805a'); p.hline(5, 22, 27, '#b85a38');
    p.px(10, 31, '#e88a64'); p.px(11, 31, '#e88a64'); p.px(15, 32, '#ff9ec4'); p.px(16, 31, '#ff9ec4'); p.px(17, 32, '#ff9ec4'); p.px(16, 33, '#ff9ec4');
    p.outline();
    return p.canvas();
  });
}
export function bookshelf() {
  return cached('shelf', () => {
    const p = new Pix(38, 46);
    p.rect(0, 4, 38, 42, '#a8703f'); p.rect(2, 6, 34, 38, '#6e4223');
    p.hline(0, 37, 4, '#c98c55');
    for (const y of [18, 31]) { p.rect(2, y, 34, 2, '#a8703f'); p.hline(2, 35, y, '#c98c55'); }
    p.rect(0, 44, 38, 2, '#8a5730');
    const cols = ['#ef6f6c', '#6fb6ff', '#ffcf4a', '#7dd370', '#c9a2ff', '#ff9ec4', '#ffa65c', '#5fd3c8'];
    let s = 7;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (const [y0, y1] of [[6, 18], [20, 31], [33, 44]]) {
      let x = 3;
      while (x < 34) {
        const w = 2 + Math.floor(rnd() * 3); const h = 7 + Math.floor(rnd() * 4);
        if (x + w > 35) break;
        const c = cols[Math.floor(rnd() * cols.length)];
        if (rnd() < 0.12 && x > 6) { // lying book stack
          p.rect(x, y1 - 2, 6, 2, c); p.rect(x, y1 - 4, 5, 2, cols[(cols.indexOf(c) + 3) % 8]); x += 7; continue;
        }
        p.rect(x, y1 - h, w, h, c); p.vline(x, y1 - h, y1 - 1, lighten(c, 0.35));
        p.hline(x, x + w - 1, y1 - h + 2, darken(c, 0.25));
        x += w + (rnd() < 0.2 ? 1 : 0);
      }
    }
    p.outline();
    return p.canvas();
  });
}

// ---------------------------------------------------------------- small bitmaps
const FONT = {
  '1': ['..#..', '.##..', '#.#..', '..#..', '..#..', '..#..', '#####'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  'D': ['###..', '#..#.', '#...#', '#...#', '#...#', '#..#.', '###..'],
  'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
};
export function glyph(ch, color, scale = 2) {
  return cached('g' + ch + color + scale, () => {
    const rows = FONT[ch];
    const p = new Pix(5 * scale + 2, 7 * scale + 2);
    p.map(1, 1, rows, { '#': color }, scale);
    return p.canvas();
  });
}
export function glyphPix(ch) { return FONT[ch]; }

const STAR = [
  '.....#.....',
  '....###....',
  '....###....',
  '###########',
  '.#########.',
  '..#######..',
  '..#######..',
  '.####.####.',
  '.###...###.',
  '##.......##',
];
const HEART = [
  '.##...##.',
  '####.####',
  '#########',
  '#########',
  '.#######.',
  '..#####..',
  '...###...',
  '....#....',
];
export function starPix(p, x, y, c = '#ffd23f', hi = '#fff3a8') {
  p.map(x, y, STAR, { '#': c });
  p.px(x + 4, y + 3, hi); p.px(x + 5, y + 2, hi); p.px(x + 3, y + 4, hi);
}
export function heartPix(p, x, y, c = '#ff6f91') {
  p.map(x, y, HEART, { '#': c });
  p.px(x + 1, y + 1, lighten(c, 0.6)); p.px(x + 2, y + 1, lighten(c, 0.4));
}
function applePix(p, x, y) {
  p.ball(x + 5.5, y + 7, 5.4, 4.8, '#ef4b4b');
  p.px(x + 5, y + 2, '#2b1d2e'); p.px(x + 5, y + 1, '#7a4a2a'); p.px(x + 6, y + 1, '#7a4a2a');
  p.ell(x + 8.5, y + 1.5, 2, 1, '#6cc44f');
}
function sunPix(p, x, y) {
  for (let a = 0; a < 8; a++) {
    const ang = a * Math.PI / 4;
    p.line(x + 6 + Math.cos(ang) * 4, y + 6 + Math.sin(ang) * 4, x + 6 + Math.cos(ang) * 6.3, y + 6 + Math.sin(ang) * 6.3, '#ffb020');
  }
  p.ball(x + 6, y + 6, 3.8, 3.8, '#ffd23f');
  p.px(x + 5, y + 6, INK); p.px(x + 7, y + 6, INK);
}

/** stamps: return a canvas of the stamp (colour-aware for letters/numbers) */
export const STAMPS = ['star', 'heart', 'apple', 'sun', '1', '2', '3', '4', '5', 'A', 'B', 'C'];
export function stamp(id, color) {
  return cached('stamp' + id + (FONT[id] ? color : ''), () => {
    if (FONT[id]) {
      const p = new Pix(12, 16);
      p.map(1, 1, FONT[id], { '#': color }, 2);
      return p.canvas();
    }
    const p = new Pix(13, 13);
    if (id === 'star') starPix(p, 1, 1);
    if (id === 'heart') heartPix(p, 2, 2);
    if (id === 'apple') applePix(p, 1, 1);
    if (id === 'sun') sunPix(p, 0, 0);
    p.outline('#2a1630', 0.5);
    return p.canvas();
  });
}

// ---------------------------------------------------------------- UI icons (18x18)
function icon(name, draw) { return cached('icon:' + name, () => { const p = new Pix(18, 18); draw(p); p.outline(); return p.canvas(); }); }
export const ICONS = {
  star: () => icon('star', p => { p.map(1, 1, ['.......#.......', '......###......', '......###......', '.....#####.....', '###############', '.#############.', '..###########..', '...#########...', '...#########...', '..#####.#####..', '..####...####..', '.###.......###.', '.##.........##.'].map(r => r), { '#': '#ffd23f' }); p.px(7, 4, '#fff6b8'); p.px(6, 6, '#fff6b8'); p.px(7, 5, '#fff6b8'); }),
  home: () => icon('home', p => {
    for (let i = 0; i < 8; i++) p.hline(8 - i, 9 + i, 2 + i, '#ef6f6c');
    p.rect(3, 9, 12, 7, '#ffe7b8'); p.rect(7, 11, 4, 5, '#a8703f'); p.px(10, 13, '#ffd23f');
    p.rect(12, 2, 2, 4, '#8a5730'); p.rect(4, 10, 2, 2, '#8fd0ff'); p.hline(1, 16, 9, '#c94f4f');
  }),
  play: () => icon('play', p => { p.ball(9, 9, 8, 8, '#7dd370'); for (let i = 0; i < 9; i++) p.vline(6 + Math.floor(i * 0.8), 5 + Math.floor(i / 2), 13 - Math.floor(i / 2), '#ffffff'); }),
  back: () => icon('back', p => {
    p.ball(9, 9, 8, 8, '#64a8e8');
    for (let i = 0; i < 5; i++) p.vline(4 + i, 9 - i, 9 + i, '#ffffff');
    p.rect(8, 7, 6, 5, '#ffffff');
  }),
  book: () => icon('book', p => {
    p.rect(2, 3, 14, 12, '#ef6f6c'); p.rect(3, 4, 12, 10, '#ff8f8f'); p.vline(9, 3, 14, '#c94f4f');
    p.rect(2, 14, 14, 2, '#fff2d6'); heartPix(p, 4, 6, '#ffd23f');
  }),
  stickers: () => icon('stickers', p => {
    p.rect(2, 2, 14, 14, '#7ec8ff'); p.rect(3, 3, 12, 12, '#a9dcff'); p.vline(9, 2, 15, '#4f97d6');
    starPix(p, 3, 4, '#ffd23f'); p.px(12, 6, '#ff6f91'); p.rect(11, 9, 3, 3, '#ff6f91');
  }),
  ball: () => icon('ball', p => {
    p.ball(9, 9, 7.5, 7.5, '#ffffff');
    p.ell(9, 9, 7.5, 7.5, '#ef6f6c', { x1: 6 }, true); p.ell(9, 9, 7.5, 7.5, '#64a8e8', { x0: 12 }, true);
    p.ell(9, 9, 7.5, 7.5, '#ffd23f', { y0: 13 }, true); p.px(6, 4, '#fff');
  }),
  apple: () => icon('apple', p => applePix(p, 3, 3)),
  toys: () => icon('toys', p => {
    p.ball(6, 11, 4.6, 4.6, '#ef6f6c'); p.px(4, 9, '#ffb3b3');
    p.rect(10, 4, 6, 6, '#64a8e8'); p.rect(11, 5, 4, 4, '#8fd0ff');
    p.rect(9, 11, 7, 5, '#ffd23f'); p.rect(10, 12, 5, 3, '#ffe98a');
  }),
  eraser: () => icon('eraser', p => {
    for (let i = 0; i < 8; i++) { p.hline(3 + i, 10 + i, 4 + i, i < 3 ? '#6fb6ff' : '#ff9ec4'); }
    p.rect(3, 12, 13, 2, '#e07aa0');
  }),
  wipe: () => icon('wipe', p => {
    p.rect(2, 8, 14, 7, '#ffd23f'); p.rect(2, 8, 14, 2, '#7dd370');
    for (const [x, y] of [[4, 12], [8, 11], [12, 13], [6, 14]]) p.px(x, y, '#e0a820');
    p.ball(4, 4, 2, 2, '#bfe6ff'); p.ball(10, 3, 1.6, 1.6, '#bfe6ff'); p.ball(14, 5, 1.4, 1.4, '#bfe6ff');
  }),
  sun: () => icon('sun', p => sunPix(p, 3, 3)),
  moon: () => icon('moon', p => { p.ball(9, 9, 6.5, 6.5, '#ffe58a'); p.ell(12, 7, 5, 5, '#000000'); for (let i = 0; i < p.d.length; i++) if (p.d[i] === 0xff000000) p.d[i] = 0; }),
  check: () => icon('check', p => { p.ball(9, 9, 8, 8, '#7dd370'); p.line(5, 9, 8, 12, '#fff'); p.line(8, 12, 13, 6, '#fff'); p.line(5, 10, 8, 13, '#fff'); p.line(8, 13, 13, 7, '#fff'); }),
};

/** 8x8 icons for speech bubbles */
const BUB = {
  heart: ['.##.##..', '#######.', '#######.', '.#####..', '..###...', '...#....'],
  star: ['...#....', '..###...', '#######.', '.#####..', '.##.##..', '#.....#.'],
  sun: ['#..#..#.', '.#####..', '##ooo##.', '.#ooo#..', '##ooo##.', '.#####..', '#..#..#.'],
  check: ['......##', '.....##.', '#...##..', '##.##...', '.###....', '..#.....'],
  note: ['..####..', '..#..#..', '..#..#..', '###.###.', '###.###.'],
  bang: ['.##.', '.##.', '.##.', '.##.', '....', '.##.'],
  wave: ['.#.#.#..', '.#.#.#..', '.######.', '#######.', '.######.', '..####..'],
  zzz: ['####....', '..#.....', '.#..###.', '####.#..', '....###.'],
  q: ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'],
  sad: ['.####..', '######.', '.####..', '.......', '.#..#..', '#..#...'],
  angry: ['#.#.#..', '.#.#.#.', '#.#.#..', '.#.#.#.'],
  scared: ['.##.', '.##.', '.##.', '.##.', '....', '.##.'],
};
const BUBC = { sad: { '#': '#7ea8d6' }, angry: { '#': '#ef4b4b' }, scared: { '#': '#ff9a2e' }, heart: { '#': '#ff6f91' }, star: { '#': '#ffc21f' }, sun: { '#': '#ffb020', o: '#ffd23f' }, check: { '#': '#4fbf5a' }, note: { '#': '#7a5bc0' }, bang: { '#': '#ef6f6c' }, wave: { '#': '#f1c27c' }, zzz: { '#': '#6f8fd6' }, q: { '#': '#64a8e8' } };
export function bubble(kind) {
  return cached('bub' + kind, () => {
    const p = new Pix(16, 15);
    p.ell(8, 6, 7.5, 6, '#ffffff');
    p.px(5, 12, '#ffffff'); p.px(5, 13, '#ffffff'); p.px(6, 12, '#ffffff'); p.px(4, 14, '#ffffff');
    const rows = BUB[kind];
    const w = rows[0].length;
    p.map(Math.floor(8 - w / 2), Math.floor(6 - rows.length / 2) + 1, rows, BUBC[kind]);
    p.outline('#5a3e5e', 0.75);
    return p.canvas();
  });
}

/** particles */
export function particle(kind, c) {
  return cached('pt' + kind + c, () => {
    let p;
    if (kind === 'spark') { p = new Pix(5, 5); p.px(2, 0, c); p.px(2, 4, c); p.px(0, 2, c); p.px(4, 2, c); p.px(2, 1, '#fff'); p.px(1, 2, '#fff'); p.px(3, 2, '#fff'); p.px(2, 3, '#fff'); p.px(2, 2, '#fff'); }
    else if (kind === 'heart') { p = new Pix(7, 6); p.map(0, 0, ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'], { '#': c }); p.px(1, 1, '#fff'); }
    else if (kind === 'note') { p = new Pix(5, 6); p.map(0, 0, ['..###', '..#.#', '..#.#', '###..', '###..', '.....'], { '#': c }); }
    else if (kind === 'z') { p = new Pix(5, 5); p.map(0, 0, ['#####', '...#.', '..#..', '.#...', '#####'], { '#': c }); }
    else if (kind === 'confetti') { p = new Pix(2, 3); p.rect(0, 0, 2, 3, c); p.px(0, 0, lighten(c, 0.5)); return p.canvas(); }
    else if (kind === 'star') { p = new Pix(7, 7); p.map(0, 0, ['...#...', '..###..', '#######', '.#####.', '.##.##.', '#.....#'], { '#': c }); }
    else if (kind === 'crumb') { p = new Pix(2, 2); p.rect(0, 0, 2, 2, c); return p.canvas(); }
    else if (kind === 'bubble') { p = new Pix(5, 5); p.ell(2.5, 2.5, 2.5, 2.5, '#d8f0ff'); p.ell(2.5, 2.5, 1.5, 1.5, '#ffffff'); }
    p.outline('#2a1630', 0.55);
    return p.canvas();
  });
}

// ---------------------------------------------------------------- snacks
export function snack(kind, bites) {
  return cached('snack' + kind + bites, () => {
    const p = new Pix(12, 12);
    if (kind === 'bunny') { // carrot
      for (let i = 0; i < 9 - bites * 3; i++) p.hline(3 + Math.floor(i / 3), 8 - Math.floor(i / 3), 3 + i, i % 3 ? '#ff9a3c' : '#e8802a');
      p.ell(5, 2, 1.2, 2, '#6cc44f'); p.ell(7, 2, 1.2, 2, '#4fae45');
    } else if (kind === 'puppy') { // bone cookie
      p.rect(3, 5, 6 - bites * 2, 3, '#f0d09a'); if (bites < 3) { p.ball(3, 5, 1.8, 1.8, '#f0d09a'); p.ball(3, 8, 1.8, 1.8, '#f0d09a'); }
      if (bites < 1) { p.ball(9, 5, 1.8, 1.8, '#f0d09a'); p.ball(9, 8, 1.8, 1.8, '#f0d09a'); }
    } else if (kind === 'turtle') { // strawberry
      if (bites < 3) { p.ball(6, 7, 4 - bites, 4 - bites, '#ff4f6a'); p.px(5, 7, '#ffe58a'); p.px(7, 8, '#ffe58a'); }
      p.hline(4, 8, 3, '#4fae45'); p.px(6, 2, '#4fae45');
    } else if (kind === 'owl') { // muffin
      if (bites < 3) { p.ball(6, 5, 4.4 - bites, 3 - bites * 0.6, '#b07040'); p.px(5, 4, '#5a3a2a'); p.px(7, 5, '#5a3a2a'); }
      p.rect(3, 7, 7, 4, '#ff9ec4'); p.vline(5, 7, 10, '#e07aa0'); p.vline(7, 7, 10, '#e07aa0');
    } else { // frog: blueberry cupcake
      if (bites < 3) p.ball(6, 5, 4.4 - bites, 3.2 - bites * 0.6, '#c9a2ff');
      if (bites < 2) p.px(6, 2, '#ef4b4b');
      p.rect(3, 7, 7, 4, '#7ec8ff'); p.vline(5, 7, 10, '#4f97d6'); p.vline(7, 7, 10, '#4f97d6');
    }
    p.outline();
    return p.canvas();
  });
}

// ---------------------------------------------------------------- stickers (24x24 with die-cut white edge)
export const STICKERS = ['star', 'heart', 'rainbow', 'sun', 'flower', 'cupcake', 'balloon', 'moon', 'butterfly', 'icecream', 'strawberry', 'fish', 'mushroom', 'crown', 'cloud', 'rocket'];
export function sticker(id) {
  return cached('stk' + id, () => {
    const p = new Pix(26, 26);
    const o = 3;
    switch (id) {
      case 'star': p.map(o + 1, o + 2, STAR, { '#': '#ffd23f' }, 2); p.px(o + 9, o + 7, '#fff6b8'); break;
      case 'heart': p.map(o + 1, o + 3, HEART, { '#': '#ff6f91' }, 2); p.rect(o + 3, o + 5, 2, 2, '#ffd0dc'); break;
      case 'rainbow': {
        const cs = ['#ef6f6c', '#ffa65c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'];
        cs.forEach((c, i) => p.ell(13, 17, 11 - i * 1.4, 11 - i * 1.4, c, { y1: 16 }));
        p.ell(13, 17, 2.6, 2.6, 0, { y1: 16 }); for (let i = 0; i < p.d.length; i++) if (p.d[i] === 0xff000000) p.d[i] = 0;
        p.ball(5, 17, 3.5, 2.4, '#ffffff', { hi: false }); p.ball(21, 17, 3.5, 2.4, '#ffffff', { hi: false });
        break;
      }
      case 'sun': sunPix(p, 7, 7); p.ell(13, 13, 1, 1, '#ffd23f'); break;
      case 'flower':
        for (let a = 0; a < 5; a++) p.ball(13 + Math.cos(a * 1.257) * 5, 11 + Math.sin(a * 1.257) * 5, 3.6, 3.6, '#ff9ec4');
        p.ball(13, 11, 3, 3, '#ffd23f'); p.vline(13, 15, 22, '#4fae45'); p.ell(16, 19, 2.6, 1.3, '#6cc44f'); break;
      case 'cupcake':
        p.ball(13, 10, 7.5, 5, '#ffb3d1'); p.ball(13, 7, 4.5, 3, '#ffd0e2'); p.ball(13, 3.6, 1.8, 1.8, '#ef4b4b');
        for (let y = 14; y < 22; y++) p.hline(7 + Math.floor((y - 14) / 3), 19 - Math.floor((y - 14) / 3), y, '#7ec8ff');
        for (const x of [9, 12, 15]) p.vline(x, 14, 20, '#4f97d6');
        for (const [x, y] of [[9, 9], [15, 8], [12, 11], [17, 11]]) p.px(x, y, ['#7dd370', '#ffd23f', '#64a8e8', '#fff'][x % 4]);
        break;
      case 'balloon': p.ball(13, 9, 6.5, 7.5, '#ef6f6c'); p.rect(12, 16, 3, 2, '#c94f4f'); p.line(13, 18, 11, 24, '#8a7c90'); break;
      case 'moon':
        p.ball(12, 13, 9, 9, '#ffe58a'); p.ell(17, 9, 7.4, 7.4, '#000000');
        for (let i = 0; i < p.d.length; i++) if (p.d[i] === 0xff000000) p.d[i] = 0;
        p.px(7, 14, INK); p.px(9, 17, '#ff9fb4'); p.px(20, 18, '#fff6b8'); p.px(22, 6, '#fff6b8'); break;
      case 'butterfly':
        p.ball(8, 8, 5, 5, '#b48be6'); p.ball(18, 8, 5, 5, '#b48be6'); p.ball(9, 17, 4, 4, '#ff9ec4'); p.ball(17, 17, 4, 4, '#ff9ec4');
        p.ell(8, 8, 2, 2, '#ffd23f'); p.ell(18, 8, 2, 2, '#ffd23f');
        p.rect(12, 5, 2, 15, INK); p.px(11, 3, INK); p.px(14, 3, INK); break;
      case 'icecream':
        for (let y = 12; y < 24; y++) p.hline(8 + Math.floor((y - 12) / 2.2), 17 - Math.floor((y - 12) / 2.2), y, (y % 3) ? '#e8b06a' : '#c98c4a');
        p.ball(13, 9, 6, 5, '#ffb3d1'); p.ball(13, 4.5, 4, 3, '#fff2d6'); p.px(13, 1, '#ef4b4b'); p.px(13, 2, '#ef4b4b'); break;
      case 'strawberry':
        p.ball(13, 14, 8, 8.5, '#ff4f6a'); for (const [x, y] of [[9, 12], [13, 11], [17, 13], [11, 16], [15, 17], [13, 20]]) p.px(x, y, '#ffe58a');
        for (let i = -3; i <= 3; i++) p.ell(13 + i * 1.6, 6, 1.4, 2, '#4fae45'); p.vline(13, 2, 5, '#3d7d40'); break;
      case 'fish':
        p.ball(11, 13, 8, 6, '#ffa65c'); for (let i = 0; i < 6; i++) p.vline(18 + i, 13 - i, 13 + i, '#ff8a3c');
        p.rect(6, 11, 2, 2, INK); p.px(6, 11, '#fff'); p.vline(12, 8, 18, '#ffd23f'); p.ball(4, 4, 1.4, 1.4, '#bfe6ff'); break;
      case 'mushroom':
        p.ball(13, 10, 10, 6.5, '#ef4b4b', { clip: { y1: 12 } }); p.hline(3, 23, 12, '#c93a3a');
        for (const [x, y, r] of [[8, 7, 1.8], [15, 6, 1.5], [19, 9, 1.4], [11, 10, 1.2]]) p.ell(x, y, r, r, '#ffffff');
        p.rect(9, 13, 8, 8, '#fff2d6'); p.px(11, 16, INK); p.px(15, 16, INK); p.px(12, 18, INK); p.px(13, 18, INK); p.px(14, 18, INK); break;
      case 'crown':
        p.rect(4, 12, 18, 8, '#ffd23f'); for (const x of [4, 11, 18]) for (let i = 0; i < 6; i++) p.hline(x + Math.floor(i / 2), x + 3 - Math.floor(i / 2), 11 - i, '#ffd23f');
        p.ball(13, 15, 2, 2, '#ef4b4b'); p.ball(7, 16, 1.5, 1.5, '#64a8e8'); p.ball(19, 16, 1.5, 1.5, '#7dd370'); p.hline(4, 21, 19, '#e0a820'); break;
      case 'cloud':
        p.ball(8, 14, 5, 4.5, '#ffffff'); p.ball(14, 11, 6, 6, '#ffffff'); p.ball(19, 15, 4.5, 4, '#ffffff'); p.rect(8, 15, 12, 4, '#ffffff');
        p.px(11, 13, INK); p.px(16, 13, INK); p.px(13, 15, '#ff9fb4'); p.px(14, 15, '#ff9fb4');
        p.px(9, 21, '#64a8e8'); p.px(14, 22, '#64a8e8'); p.px(19, 21, '#64a8e8'); break;
      case 'rocket':
        p.ball(13, 11, 4.5, 8, '#f6f0ff'); p.ell(13, 5, 3, 3, '#ef6f6c', { y1: 5 }); p.ball(13, 10, 2, 2, '#64a8e8');
        p.rect(7, 15, 3, 5, '#ef6f6c'); p.rect(16, 15, 3, 5, '#ef6f6c'); p.ell(13, 21, 2, 2.5, '#ffa65c'); p.px(13, 23, '#ffd23f'); break;
    }
    p.outline('#2a1630', 0.6);
    // re-home into a bigger canvas so the die-cut edge never clips
    const q = new Pix(32, 32);
    for (let y = 0; y < 26; y++) for (let x = 0; x < 26; x++) if (p.d[y * 26 + x]) q.d[(y + 3) * 32 + x + 3] = p.d[y * 26 + x];
    q.outline('#ffffff', 1); q.outline('#ffffff', 1);
    q.outline('#b9a9a0', 1);
    return q.canvas();
  });
}
