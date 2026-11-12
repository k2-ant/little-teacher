import { Pix, cached, darken, lighten, mix } from './raster.js';
import { pixelText } from './schoolfont.js';

export const INK = '#2b1d2e';
const WHITE = '#ffffff';
const BLUSH = '#ff9fb4';
const PINK = '#ff8fae';

// ---------------------------------------------------------------- students
// KINDS is the class roster (v2.0: all eight friends); ALL_KINDS is every student the art, voices and data know about.
export const ALL_KINDS = ['bunny', 'puppy', 'turtle', 'owl', 'frog', 'cat', 'bear', 'mouse'];
export const KINDS = ALL_KINDS;
export const PAL = {
  bunny: { fur: '#fff4ee', shadow: '#ead2d4', inner: '#ffb7c9', top: '#b9a5ec', feet: '#fff4ee', voice: 1.9, accent: '#b9a5ec' },
  puppy: { fur: '#f6c955', shadow: '#d9a234', ear: '#c97f2e', muzzle: '#fff3d6', top: '#f6c955', feet: '#f6c955', voice: 1.5, accent: '#e0475b' },
  turtle: { fur: '#97d883', shadow: '#6db35d', shell: '#3f9a72', shellHi: '#6fcb9b', rim: '#e3c97a', top: '#f3e09e', feet: '#97d883', voice: 1.2, accent: '#ffcf4a' },
  owl: { fur: '#a6899f', shadow: '#7f6479', disk: '#f7eee4', top: '#a6899f', belly: '#e8dce4', feet: '#ff9f3a', marks: '#b49cb4', voice: 1.4, accent: '#7a5bc0' },
  frog: { fur: '#86d36a', shadow: '#5fae4c', belly: '#e3f5b0', top: '#86d36a', feet: '#86d36a', voice: 1.7, accent: '#ff7fb5' },
  // v2.0: gatito (ginger tabby in a striped tee), osito (the biggest, in dungarees), ratoncito (the smallest, shirt + bow tie)
  cat: { fur: '#f7a65e', shadow: '#d9823f', stripe: '#d0702c', muzzle: '#ffe3c6', inner: '#ffb7c9', top: '#46bfb3', stripeTop: '#e6fbf7', feet: '#f7a65e', voice: 1.55, accent: '#46bfb3' },
  bear: { fur: '#a5673d', shadow: '#82492a', muzzle: '#f3d6ab', inner: '#e9b48a', belly: '#f3d6ab', top: '#a5673d', pants: '#5b8fe0', feet: '#a5673d', voice: 0.8, accent: '#5b8fe0' },
  mouse: { fur: '#c9c3d3', shadow: '#a59db3', inner: '#ffb7c9', muzzle: '#f6f2f8', top: '#8fc8ff', feet: '#ffb7c9', tail: '#f7a7bb', voice: 2.0, accent: '#ef5b5b' },
};
export const SW = 34, SH = 42; // student sprite size; anchor = bottom centre

// arm positions per pose: [x, y] of the left arm (the right one is mirrored)
const ARM_POS = { down: [9.4, 31], up: [5.6, 17], wave1: [4.6, 15.5], wave2: [7, 16.5], front: [13.8, 30], clap: [15.8, 29.2] };
const ARMS = {
  bear: { rx: 3.4, ry: 4.8, pos: { down: [7.6, 31.6], up: [4.2, 15.6], wave1: [3.4, 14], wave2: [5.8, 15], front: [12.8, 30.6], clap: [15.2, 29.8] } },
  mouse: { rx: 2.3, ry: 3, pos: { down: [11, 33.6], up: [8.2, 22], wave1: [7.2, 20.5], wave2: [9.2, 21.5], front: [14.4, 33], clap: [16, 32.4] } },
};
function arms(p, C, st, phase, cfg) {
  const col = C.top;
  const big = C === PAL.owl;
  const rx = cfg ? cfg.rx : big ? 3 : 2.6, ry = cfg ? cfg.ry : big ? 4.6 : 3.6;
  const P = cfg ? cfg.pos : ARM_POS;
  const sides = [['L', st.armL || 'down'], ['R', st.armR || 'down']];
  for (const [side, pose] of sides) {
    const m = side === 'L' ? (x) => x : (x) => 34 - x;
    const up = pose === 'up' || pose === 'wave1' || pose === 'wave2';
    if ((phase === 'back') !== up) continue;
    const at = P[pose];
    if (!at) continue;
    p.limb(m(at[0]), at[1], rx, up ? ry + 1 : pose === 'down' ? ry : ry - 0.6, col);
  }
}

function feet(p, C, f, g = { x: [12.8, 21.2], y: 39, rx: 3.2, ry: 2 }) {
  const lift = [0, 0, 0];
  if (f === 1) lift[0] = 1.2; if (f === 2) lift[1] = 1.2;
  p.ball(g.x[0], g.y - lift[0], g.rx, g.ry, C.feet, { hi: false });
  p.ball(g.x[1], g.y - lift[1], g.rx, g.ry, C.feet, { hi: false });
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
    else if (kind === 'sleepy') { p.rect(x, y + 2, 2, 1, INK); p.hline(x - 1, x + 2, y + 1, INK); p.px(x - 1, y + 2, '#7a6a80'); } // v2.3: heavy, droopy lids
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
  // v2.3 feelings mouths: sad turns down, angry is a full-width frown, scared a little open 'o', tired a big yawn
  else if (kind === 'down') { p.hline(X(15), X(18), my, INK); p.px(X(14), my + 1, INK); p.px(X(19), my + 1, INK); }
  else if (kind === 'grr') { p.hline(X(14), X(19), my, INK); p.px(X(13), my + 1, INK); p.px(X(20), my + 1, INK); p.hline(X(15), X(18), my + 1, '#7a2e45'); }
  else if (kind === 'gasp') { p.rect(X(16), my, 2, 3, INK); p.px(X(15), my + 1, INK); p.px(X(18), my + 1, INK); p.rect(X(16), my + 1, 2, 1, '#7a2e45'); }
  else if (kind === 'yawn') { p.rect(X(15), my, 4, 4, INK); p.rect(X(14), my + 1, 6, 2, INK); p.rect(X(15), my + 1, 4, 2, '#7a2e45'); p.hline(X(15), X(18), my + 3, '#ff7b93'); }
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
  if (hide > 0) { // v2.3: clearly a turtle in her shell (not a bush): plated shell, a yellow rim, feet and peeking eyes
    const l = st.look || 0, RIM = '#f5cf4f';
    p.ball(7, 38.4, 2.6, 1.8, C.fur, { hi: false }); p.ball(27, 38.4, 2.6, 1.8, C.fur, { hi: false }); // little feet
    p.ball(17, 31.6, 11.6, 8.6, C.shell, { shadow: darken(C.shell, 0.2) });
    const ln = darken(C.shell, 0.32); // the shell's plates
    p.hline(14, 20, 27, ln); p.line(14, 27, 12, 30, ln); p.line(20, 27, 22, 30, ln); p.hline(12, 22, 31, ln);
    p.line(12, 31, 14, 35, ln); p.line(22, 31, 20, 35, ln); p.line(12, 30, 7, 31, ln); p.line(22, 30, 27, 31, ln); p.vline(17, 31, 35, ln);
    p.ell(17, 29, 2.2, 1.2, C.shellHi, null, true); p.px(13, 25, lighten(C.shell, 0.6)); p.px(12, 26, lighten(C.shell, 0.6));
    p.ell(17, 37.2, 12.6, 2.6, RIM); p.hline(6, 28, 36, lighten(RIM, 0.4)); p.hline(7, 27, 39, darken(RIM, 0.25)); // the yellow rim
    p.rect(13, 23, 8, 1, '#ffcf4a'); p.px(17, 22, '#ff7f6e'); // the beanie's pompom peeking out
    // the dark opening at the front, and her eyes peeking out of it (high enough to clear the desk top)
    p.ell(17, 34.6, 4.8, 2.4, '#1d2a24'); p.hline(13, 21, 36, darken(C.shell, 0.32));
    p.rect(14 + l, 33, 2, 2, WHITE); p.rect(18 + l, 33, 2, 2, WHITE); p.px(15 + l, 34, INK); p.px(19 + l, 34, INK);
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
  for (const [x, y] of [[15, 30], [19, 30], [17, 32], [15, 34], [19, 34]]) { p.px(x, y, C.marks); p.px(x + 1, y + 1, C.marks); p.px(x - 1, y + 1, C.marks); }
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
  else if (['down', 'grr', 'gasp', 'yawn'].includes(m)) mouth(p, m, 24, 0);
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
  else if (m === 'frown' || m === 'down') { p.px(12, 24, INK); p.hline(13, 20, 23, INK); p.px(21, 24, INK); }
  else if (m === 'grr') { p.px(10, 25, INK); p.px(11, 24, INK); p.hline(12, 21, 23, INK); p.px(22, 24, INK); p.px(23, 25, INK); p.hline(13, 20, 24, '#7a2e45'); }
  else mouth(p, m, 23, 0);
  if (st.blush !== false) { p.px(8, 22, BLUSH); p.px(9, 22, BLUSH); p.px(24, 22, BLUSH); p.px(25, 22, BLUSH); }
  // bow
  p.map(14, 15, ['#...#', '##@##', '#...#'], { '#': C.accent, '@': darken(C.accent, 0.25) });
  p.px(14, 15, lighten(C.accent, 0.4));
  p.px(15, 9, lighten(C.fur, 0.5)); // shine
}

// ---- v2.0 students: gatito, osito, ratoncito
/** whiskers go on after the outline so they stay 1px thin */
function whiskers(p, rows, xl, xr, c) {
  for (const [y, dy] of rows) {
    p.px(xl, y, c); p.px(xl - 1, y + dy, c); p.px(xl - 2, y + dy, c);
    p.px(xr, y, c); p.px(xr + 1, y + dy, c); p.px(xr + 2, y + dy, c);
  }
}
/** a pointy ear: apex at (cx, top), the base leaning in towards the head (dir 1 = left ear) */
function catEar(p, C, cx, top, dir) {
  for (let i = 0; i <= 9; i++) {
    const hw = i * 0.52, x = cx + dir * i * 0.3;
    p.hline(Math.round(x - hw), Math.round(x + hw - 0.01), top + i, i ? C.fur : lighten(C.fur, 0.3));
  }
  for (let i = 3; i <= 8; i++) {
    const hw = (i - 2) * 0.32, x = cx + dir * i * 0.3;
    p.hline(Math.round(x - hw), Math.round(x + hw - 0.01), top + i, C.inner);
  }
}
function drawCat(p, C, st) {
  const sw = st.wag ? 1 : 0, eu = st.earUp ? -1 : 0;
  // tail curling up the right side (swishes with wag)
  const T = [[23.5, 36.5], [26.2, 35.6], [28.2, 33.6], [29.2, 31], [29.4 + sw, 28.4], [29 + sw * 1.6, 26], [27.8 + sw * 2.4, 24.2]];
  T.forEach(([x, y], i) => p.ell(x, y, 1.7, 1.7, i >= 5 || i === 3 ? C.stripe : C.fur));
  feet(p, C, st.feet);
  arms(p, C, st, 'back');
  // striped tee
  p.ball(17, 31, 7.6, 6.6, C.top, { shadow: darken(C.top, 0.2) });
  for (const y of [29, 32, 35]) p.ell(17, 31, 7.6, 6.6, C.stripeTop, { y0: y, y1: y }, true);
  p.ell(17, 25, 4.5, 1.6, C.muzzle, null, true);
  arms(p, C, st, 'front');
  catEar(p, C, 8.5, 4 + eu, 1);
  catEar(p, C, 25.5, 4 + eu, -1);
  p.ball(17, 18.4, 10.8, 8.6, C.fur, { shadow: C.shadow });
  p.under(17, 18.4, 10.8, 8.6, darken(C.top, 0.35));
  // tabby stripes: forehead + cheeks
  p.vline(16, 10, 12, C.stripe); p.vline(17, 10, 12, C.stripe); p.vline(13, 11, 12, C.stripe); p.vline(20, 11, 12, C.stripe);
  p.hline(6, 8, 18, C.stripe); p.hline(6, 7, 20, C.stripe); p.hline(25, 27, 18, C.stripe); p.hline(26, 27, 20, C.stripe);
  p.ell(15, 23.2, 2.3, 1.7, C.muzzle); p.ell(19, 23.2, 2.3, 1.7, C.muzzle); // cheek puffs
  // little bell on the collar, peeking under the chin
  p.rect(16, 27, 2, 2, '#ffd447'); p.px(16, 27, '#fff2a0'); p.px(17, 28, '#d9a520');
  const l = st.look || 0, e = st.eyes || 'open';
  eyes(p, e, 12 + l, 17, 20 + l);
  if (e === 'open') { p.px(13 + l, 19, '#5aa86a'); p.px(21 + l, 19, '#5aa86a'); }
  if (st.blush !== false) { p.px(9, 21, BLUSH); p.px(10, 21, BLUSH); p.px(23, 21, BLUSH); p.px(24, 21, BLUSH); }
  p.hline(15, 18, 21, PINK); p.px(16, 22, darken(PINK, 0.15)); p.px(17, 22, darken(PINK, 0.15)); p.px(15, 21, lighten(PINK, 0.4));
  const m = st.mouth || 'smile';
  if (m === 'smile') { p.px(14, 23, INK); p.px(15, 24, INK); p.px(16, 23, INK); p.px(17, 23, INK); p.px(18, 24, INK); p.px(19, 23, INK); }
  else mouth(p, m, 23, 0);
}
function postCat(p) { whiskers(p, [[21, 0], [23, 1]], 5, 28, '#8a5a4a'); }

function drawBear(p, C, st) {
  const eu = st.earUp ? -1 : 0, l = st.look || 0;
  feet(p, C, st.feet, { x: [11.8, 22.2], y: 39.2, rx: 4, ry: 2.3 });
  arms(p, C, st, 'back', ARMS.bear);
  // round tummy in blue dungarees
  p.ball(17, 31.2, 9.6, 7.6, C.fur, { shadow: C.shadow });
  p.ell(17, 31.6, 6.4, 5.6, C.belly, null, true);
  p.ell(17, 31.2, 9.6, 7.6, C.pants, { y0: 34 }, true);
  p.rect(12, 29, 10, 5, C.pants); p.hline(12, 21, 29, lighten(C.pants, 0.3));
  p.line(12, 29, 10, 25, C.pants); p.line(21, 29, 23, 25, C.pants);
  p.px(12, 30, '#ffd447'); p.px(21, 30, '#ffd447');
  p.hline(15, 18, 31, darken(C.pants, 0.2)); p.px(15, 32, darken(C.pants, 0.2)); p.px(18, 32, darken(C.pants, 0.2)); p.hline(15, 18, 33, darken(C.pants, 0.2));
  arms(p, C, st, 'front', ARMS.bear);
  // round ears
  p.ball(7.2, 9.8 + eu, 3.8, 3.8, C.fur, { shadow: C.shadow, hi: false });
  p.ball(26.8, 9.8 + eu, 3.8, 3.8, C.fur, { shadow: C.shadow, hi: false });
  p.ell(7.4, 10.2 + eu, 1.9, 1.9, C.inner); p.ell(26.6, 10.2 + eu, 1.9, 1.9, C.inner);
  p.ball(17, 17.6, 12, 9.8, C.fur, { shadow: C.shadow });
  p.under(17, 17.6, 12, 9.8, C.shadow);
  p.ell(17, 22.4, 5.2, 3.8, C.muzzle);
  eyes(p, st.eyes || 'open', 11 + l, 16, 21 + l);
  if (st.blush !== false) { p.px(8, 21, BLUSH); p.px(9, 21, BLUSH); p.px(24, 21, BLUSH); p.px(25, 21, BLUSH); }
  p.hline(15, 18, 20, INK); p.hline(16, 17, 21, INK); p.px(15, 20, '#8a7c90');
  const m = st.mouth || 'smile';
  if (m === 'smile') { p.px(16, 22, INK); p.px(17, 22, INK); p.px(14, 23, INK); p.px(15, 24, INK); p.px(16, 24, INK); p.px(17, 24, INK); p.px(18, 24, INK); p.px(19, 23, INK); }
  else mouth(p, m, 23, 0);
}

function drawMouse(p, C, st) {
  const hide = st.hide || 0, l = st.look || 0;
  if (hide > 0) { // ducked down under the desk: the big pink-lined ears, the top of the head and the curly tail show
    p.line(24, 40, 28, 38, C.tail); p.line(28, 38, 30, 34, C.tail); p.line(30, 34, 30, 29, C.tail); p.line(30, 29, 28, 26, C.tail); p.px(27, 26, C.tail); p.px(26, 27, C.tail);
    p.line(29, 38, 31, 34, C.tail); p.line(31, 34, 31, 29, C.tail); // (two pixels thick so it reads)
    p.ball(10, 26.6, 5.2, 5, C.fur, { shadow: C.shadow, hi: false });
    p.ball(24, 26.6, 5.2, 5, C.fur, { shadow: C.shadow, hi: false });
    p.ell(10.2, 27, 3.4, 3.2, C.inner); p.ell(23.8, 27, 3.4, 3.2, C.inner);
    p.ball(17, 34, 8.6, 6.8, C.fur, { shadow: C.shadow });
    if (hide >= 1) { // paws over the eyes
      p.ball(13.4, 31.6, 2.6, 2.2, C.fur, { shadow: C.shadow, hi: false }); p.ball(20.6, 31.6, 2.6, 2.2, C.fur, { shadow: C.shadow, hi: false });
      p.px(12, 31, C.inner); p.px(14, 31, C.inner); p.px(19, 31, C.inner); p.px(21, 31, C.inner);
    } else { // peeking
      eyes(p, 'wide', 14 + l, 30, 20 + l);
      p.ball(11.6, 35, 2.2, 1.8, C.fur, { shadow: C.shadow, hi: false }); p.ball(22.4, 35, 2.2, 1.8, C.fur, { shadow: C.shadow, hi: false });
    }
    p.px(16, 34, PINK); p.px(17, 34, PINK);
    return;
  }
  const eu = st.earUp ? -1 : 0;
  // long pink tail with a curl
  const w = st.wag ? 1 : 0;
  p.line(21, 37, 25, 37, C.tail); p.line(25, 37, 28, 35, C.tail); p.line(28, 35, 29 + w, 32, C.tail);
  p.line(29 + w, 32, 28 + w, 29, C.tail); p.px(27 + w, 29, C.tail); p.px(26 + w, 30, C.tail);
  feet(p, C, st.feet, { x: [14, 20], y: 39.6, rx: 2.4, ry: 1.5 });
  arms(p, C, st, 'back', ARMS.mouse);
  p.ball(17, 33.4, 6.2, 5.2, C.top, { shadow: darken(C.top, 0.2) });
  arms(p, C, st, 'front', ARMS.mouse);
  // big round ears
  p.ball(8.8, 14.4 + eu, 5, 5, C.fur, { shadow: C.shadow, hi: false });
  p.ball(25.2, 14.4 + eu, 5, 5, C.fur, { shadow: C.shadow, hi: false });
  p.ell(9, 14.8 + eu, 3.2, 3.2, C.inner); p.ell(25, 14.8 + eu, 3.2, 3.2, C.inner);
  p.ball(17, 22, 8.6, 7.2, C.fur, { shadow: C.shadow });
  p.under(17, 22, 8.6, 7.2, darken(C.top, 0.3));
  p.ell(17, 25.4, 3.6, 2.4, C.muzzle);
  // red bow tie
  p.map(14, 28, ['#...#', '##@##', '#...#'], { '#': C.accent, '@': darken(C.accent, 0.25) });
  p.px(14, 28, lighten(C.accent, 0.4));
  eyes(p, st.eyes || 'open', 13 + l, 20, 19 + l);
  if (st.blush !== false) { p.px(10, 24, BLUSH); p.px(11, 24, BLUSH); p.px(22, 24, BLUSH); p.px(23, 24, BLUSH); }
  p.px(16, 24, PINK); p.px(17, 24, PINK);
  const m = st.mouth || 'smile';
  if (m === 'smile') { p.px(15, 25, INK); p.px(16, 26, INK); p.px(17, 26, INK); p.px(18, 25, INK); }
  else mouth(p, m, 25, 0);
}
function postMouse(p, st) { if (!(st.hide > 0)) whiskers(p, [[24, 0], [26, 1]], 6, 27, '#7a6a80'); }

const DRAW = { bunny: drawBunny, puppy: drawPuppy, turtle: drawTurtle, owl: drawOwl, frog: drawFrog, cat: drawCat, bear: drawBear, mouse: drawMouse };
const POST = { cat: postCat, mouse: postMouse }; // drawn after the outline
// feelings overlays: eyebrows, tears, a red flush, sweat drops, big scared eyes (v2.3: exaggerated so a 5-year-old reads them)
const EYES = { bunny: [12, 20, 17], puppy: [12, 20, 17], turtle: [12, 20, 17], owl: [13, 21, 16], frog: [10, 22, 13], cat: [12, 20, 17], bear: [11, 21, 16], mouse: [13, 19, 20] };
// where the anger mark / sweat drop sit, relative to the original spot (top-right of the head)
const MOOD_AT = { bear: { angry: [2, -2], scared: [2, -2] }, mouse: { angry: [3, -1], scared: [-2, 11] }, frog: { scared: [1, 2] }, owl: { scared: [0, 1] } };
/** the feelings' colours (cards, glows, bubbles) */
export const MOOD_COL = { triste: '#7ec8ff', enojado: '#ff6b5b', asustado: '#c9a2ff', cansado: '#cbbbe8' };
/** the chin row of each student (head close-ups stop here) */
export const HEAD_Y1 = { bunny: 29, puppy: 29, turtle: 28, owl: 28, frog: 28, cat: 28, bear: 29, mouse: 32 };
/** tint the painted pixels inside an ellipse toward a colour (cheek flush) */
function flush(p, cx, cy, rx, ry, col, t) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    const v = p.get(x, y); if (!v) continue;
    const hx = '#' + [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff].map(n => n.toString(16).padStart(2, '0')).join('');
    if (hx === INK || hx === WHITE) continue;
    p.px(x, y, mix(hx, col, t));
  }
}
function drop(p, x, y, c = '#5fb4ef') { // a 2x3 drop: tear or sweat
  p.px(x, y, '#bfe6ff'); p.px(x + 1, y, c); p.rect(x, y + 1, 2, 1, c); p.px(x, y + 1, '#dff2ff'); p.rect(x, y + 2, 2, 1, darken(c, 0.25));
}
function drawMood(p, kind, mood, look) {
  const [xl0, xr0, ey] = EYES[kind] || EYES.bunny;
  const [mx, my] = (MOOD_AT[kind] && MOOD_AT[kind][mood]) || [0, 0];
  const xl = xl0 + look, xr = xr0 + look, by = ey - 2, B = '#4a2a3a';
  if (mood === 'sad') { // brows up in the middle, a big tear and a small one
    p.px(xl - 1, by + 1, B); p.px(xl, by, B); p.px(xl + 1, by - 1, B);
    p.px(xr + 2, by + 1, B); p.px(xr + 1, by, B); p.px(xr, by - 1, B);
    drop(p, xl, ey + 3); p.px(xr + 1, ey + 3, '#7ec8ff'); p.px(xr + 1, ey + 4, '#5fb4ef');
  } else if (mood === 'angry') { // brows slanting down to the nose, a red flush, the anger mark
    for (const d of [0, 1]) {
      p.px(xl - 2, by - 1 + d, B); p.px(xl - 1, by - 1 + d, B); p.px(xl, by + d, B); p.px(xl + 1, by + 1 + d, B);
      p.px(xr + 3, by - 1 + d, B); p.px(xr + 2, by - 1 + d, B); p.px(xr + 1, by + d, B); p.px(xr, by + 1 + d, B);
    }
    const fy = kind === 'frog' ? 22 : ey + 5, green = kind === 'frog' || kind === 'turtle'; // green + red is mud: green friends get a pinker flush
    flush(p, xl - 1, fy, 3.2, 2.2, green ? '#ff5a6a' : '#ff3a2a', green ? 0.7 : 0.5); flush(p, xr + 3, fy, 3.2, 2.2, green ? '#ff5a6a' : '#ff3a2a', green ? 0.7 : 0.5);
    for (const [x, y] of [[26, 7], [28, 7], [27, 8], [26, 9], [28, 9], [25, 6], [29, 6], [25, 10], [29, 10]]) p.px(x + mx, y + my, '#ef4b4b');
  } else if (mood === 'scared') { // big white eyes with small pupils, raised brows, a sweat drop
    if (kind !== 'frog') for (const x of [xl, xr]) {
      p.hline(x, x + 1, ey - 2, INK); p.hline(x, x + 1, ey + 4, INK); p.px(x - 1, ey - 1, INK); p.px(x + 2, ey - 1, INK); p.px(x - 1, ey + 3, INK); p.px(x + 2, ey + 3, INK);
      p.vline(x - 2, ey, ey + 2, INK); p.vline(x + 3, ey, ey + 2, INK);
      p.hline(x, x + 1, ey - 1, WHITE); p.rect(x - 1, ey, 4, 3, WHITE); p.hline(x, x + 1, ey + 3, WHITE); p.rect(x, ey + 1, 2, 2, INK);
    }
    if (kind !== 'frog') { p.hline(xl - 2, xl + 2, by - 2, B); p.hline(xr - 1, xr + 3, by - 2, B); }
    drop(p, 26 + mx, 11 + my, '#7ec8ff'); p.px(27 + mx, 10 + my, '#9fd8ff');
  } else if (mood === 'tired') { // heavy brows and little bags under the eyes
    p.hline(xl - 1, xl + 2, by, B); p.hline(xr - 1, xr + 2, by, B);
    if (kind !== 'frog') { p.hline(xl, xl + 1, ey + 4, '#b9a3d8'); p.hline(xr, xr + 1, ey + 4, '#b9a3d8'); }
  }
}
export function student(kind, st) {
  const key = kind + '|' + [st.eyes, st.mouth, st.armL, st.armR, st.feet | 0, st.look | 0, st.blush, st.hide, st.wag ? 1 : 0, st.earUp ? 1 : 0, st.tongue ? 1 : 0, st.mood || ''].join(',');
  return cached(key, () => {
    const p = new Pix(SW, SH);
    DRAW[kind](p, PAL[kind], st);
    if (st.mood && !(st.hide > 0)) drawMood(p, kind, st.mood, st.look | 0);
    p.outline();
    if (POST[kind]) POST[kind](p, st);
    return p.canvas();
  });
}

/** 13x13 face for the attendance chart and the centros chart. v2.3: always in full colour (grey heads all
 *  turned to mud); an absent friend just has sleepy closed eyes (the chart adds a little zzz badge) */
export function miniFace(kind, on) {
  return cached('mini9' + kind + on, () => {
    const p = new Pix(13, 13);
    const C = PAL[kind];
    if (kind === 'bunny') { p.ell(4.5, 3, 1.5, 3.4, C.fur); p.ell(8.5, 3, 1.5, 3.4, C.fur); p.px(4, 2, C.inner); p.px(8, 2, C.inner); }
    if (kind === 'owl') { p.ell(3, 3.5, 1.5, 2, C.fur); p.ell(10, 3.5, 1.5, 2, C.fur); }
    if (kind === 'frog') { p.ell(4, 4.5, 2.4, 2.2, C.fur); p.ell(9, 4.5, 2.4, 2.2, C.fur); }
    if (kind === 'cat') { for (let i = 0; i < 4; i++) { p.hline(2 - (i > 1 ? 1 : 0), 2 + Math.floor(i / 2), 1 + i, C.fur); p.hline(10 - Math.floor(i / 2), 10 + (i > 1 ? 1 : 0), 1 + i, C.fur); } p.px(2, 3, C.inner); p.px(10, 3, C.inner); }
    if (kind === 'bear') { p.ell(2.4, 3.4, 2.2, 2.2, C.fur); p.ell(10.6, 3.4, 2.2, 2.2, C.fur); p.px(2, 3, C.inner); p.px(10, 3, C.inner); }
    if (kind === 'mouse') { p.ell(2.6, 4, 2.6, 2.6, C.fur); p.ell(10.4, 4, 2.6, 2.6, C.fur); p.ell(2.6, 4, 1.4, 1.4, C.inner); p.ell(10.4, 4, 1.4, 1.4, C.inner); }
    p.ball(6.5, 7.5, 5.5, 4.6, C.fur, { hi: false });
    if (kind === 'puppy') { p.ell(1.6, 7, 1.5, 3, C.ear); p.ell(11.4, 7, 1.5, 3, C.ear); p.ell(6.5, 9.6, 2.2, 1.4, C.muzzle); p.px(6, 9, INK); }
    if (kind === 'turtle') p.ell(6.5, 4.6, 5, 2.4, C.accent, { y1: 4 });
    if (kind === 'owl') { p.ell(4.5, 7.5, 2, 2, C.disk); p.ell(8.5, 7.5, 2, 2, C.disk); p.px(6, 9, '#ffae4a'); p.px(6, 4, C.shadow); }
    if (kind === 'cat') { p.px(6, 4, C.stripe); p.px(6, 5, C.stripe); p.px(6, 9, PINK); }
    if (kind === 'bear') { p.ell(6.5, 9.4, 2.4, 1.6, C.muzzle); p.px(6, 9, INK); }
    if (kind === 'mouse') p.px(6, 9, PINK);
    if (on) { if (kind === 'frog') { p.px(4, 4, INK); p.px(9, 4, INK); } else { p.px(4, 7, INK); p.px(8, 7, INK); } }
    else if (kind === 'frog') { p.hline(3, 4, 5, INK); p.hline(8, 9, 5, INK); }
    else { p.hline(3, 4, 7, INK); p.hline(8, 9, 7, INK); }
    if (on) { p.px(5, 10, INK); p.px(6, 10, INK); p.px(7, 10, INK); }
    if (kind === 'owl') { p.px(3, 6, C.accent); p.px(10, 6, C.accent); } // the glasses' rims peek out
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
  const text = /^[0-9A-ZÑ]$/.test(id);
  return cached('stamp' + id + (text ? color : ''), () => {
    if (text) return pixelText(id, color, 13); // letters and numbers: the school font, as crisp pixels for her drawing
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
    p.ball(14.5, 3.5, 3, 3, '#ffe58a', { hi: false }); p.ell(16, 2.5, 2.2, 2.2, 0);
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
    p.vline(3, 3, 16, '#64a8e8'); p.vline(6, 3, 16, '#64a8e8'); for (let y = 5; y < 16; y += 3) p.hline(3, 6, y, '#9fd0ff');
    p.rect(2, 2, 6, 2, '#ef6f6c');
    for (let i = 0; i < 11; i++) { p.px(7 + i, 3 + i, '#ffd23f'); p.px(7 + i, 4 + i, '#ffd23f'); p.px(7 + i, 5 + i, '#f5c000'); }
    p.ball(14, 6, 2.6, 2.6, '#7dd370');
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
export function bubbleImg(kind) { return kind.startsWith('m:') ? moodBubble(kind.slice(2)) : bubble(kind); }
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

/** big feeling bubbles with a face in them */
export function moodBubble(mood) {
  return cached('mbub' + mood, () => {
    const p = new Pix(24, 22);
    p.ell(12, 9, 11.5, 9, '#ffffff');
    p.px(7, 18, '#ffffff'); p.px(6, 19, '#ffffff'); p.px(8, 18, '#ffffff'); p.px(5, 20, '#ffffff');
    const col = { triste: '#7ec8ff', enojado: '#ff7b6b', asustado: '#c9a2ff', cansado: '#d8c8f0' }[mood];
    p.ball(12, 9, 7, 6.5, col, { hi: false });
    const I = '#2b1d2e';
    if (mood === 'triste') { p.px(9, 7, I); p.px(15, 7, I); p.px(8, 6, I); p.px(16, 6, I); p.hline(10, 14, 12, I); p.px(9, 13, I); p.px(15, 13, I); p.vline(9, 9, 11, '#2f7de1'); }
    if (mood === 'enojado') { p.px(8, 6, I); p.px(9, 7, I); p.px(16, 6, I); p.px(15, 7, I); p.px(9, 8, I); p.px(15, 8, I); p.hline(10, 14, 12, I); p.px(9, 13, I); p.px(15, 13, I); p.px(19, 3, '#ef4b4b'); p.px(20, 4, '#ef4b4b'); p.px(18, 4, '#ef4b4b'); }
    if (mood === 'asustado') { p.rect(9, 6, 2, 3, I); p.rect(14, 6, 2, 3, I); p.px(9, 6, '#fff'); p.px(14, 6, '#fff'); p.rect(11, 11, 3, 3, I); p.px(18, 5, '#7ec8ff'); p.px(18, 6, '#7ec8ff'); }
    if (mood === 'cansado') { p.hline(8, 10, 8, I); p.hline(14, 16, 8, I); p.rect(11, 11, 3, 2, I); p.map(17, 1, ['###', '..#', '.#.', '###'], { '#': '#6f8fd6' }); }
    p.outline('#5a3e5e', 0.75);
    return p.canvas();
  });
}
export function rainCloud(frame) {
  return cached('rain' + frame, () => {
    const p = new Pix(20, 14);
    p.ball(6, 5, 4.5, 3.5, '#9fb3c8', { hi: false }); p.ball(12, 4, 5, 4, '#b4c6d8', { hi: false }); p.ball(16, 6, 3.5, 3, '#9fb3c8', { hi: false });
    for (let i = 0; i < 4; i++) { const x = 4 + i * 4, y = 10 + ((i + frame) % 2) * 2; p.px(x, y, '#5fb4ef'); p.px(x, y + 1, '#7ec8ff'); }
    p.outline('#4a5a70', 0.5);
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
    else if (kind === 'puff') { p = new Pix(5, 5); p.ell(2.5, 2.5, 2.5, 2.5, c); p.px(1, 1, '#ffffff'); }
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
    } else if (kind === 'cat') { // fish-shaped cracker
      const n = 3 - bites; // 3 = whole, 0 = a crumb
      if (n >= 1) { p.ball(5, 6.5, n >= 2 ? 3.6 : 2.4, n >= 2 ? 2.6 : 2, '#ffa94d'); p.px(3, 5, '#fff2a0'); }
      if (n >= 2) p.px(3, 6, INK);
      if (n >= 3) { for (let i = 0; i < 3; i++) p.vline(8 + i, 5 - i, 8 + i, '#ff9533'); }
      if (n >= 2) { p.px(6, 6, '#e8802a'); p.px(6, 7, '#e8802a'); }
      if (n === 0) { p.rect(5, 7, 2, 2, '#ffa94d'); }
    } else if (kind === 'bear') { // honey pot
      p.ball(6, 7.8, 4.8, 3.6, '#c97b45', { shadow: '#9c5a32' }); // clay pot
      p.rect(3, 3, 7, 2, '#b5683a'); p.hline(3, 9, 3, '#d98f58'); // rim
      if (bites < 3) { p.ell(6.5, 2.6, 3.6 - bites * 0.5, 1.4 - bites * 0.3, '#ffc43a'); p.px(5, 2, '#fff2a0'); } // honey on top
      if (bites < 2) { p.vline(4, 4, 7, '#ffc43a'); p.px(4, 8, '#ffb020'); }
      p.rect(5, 8, 3, 2, '#f6e3c2'); // little label
    } else if (kind === 'mouse') { // cheese wedge
      const w = 9 - bites * 2;
      for (let y = 0; y < 6; y++) p.hline(1 + Math.max(0, Math.floor((5 - y) * w / 6)), 1 + w, 3 + y, y === 0 ? '#ffe680' : '#ffd23f');
      if (bites < 3) p.rect(1, 9, w + 1, 2, '#f0b820');
      if (bites < 2) { p.px(5, 6, '#e0a820'); p.px(7, 8, '#e0a820'); }
      if (bites < 1) p.px(9, 5, '#e0a820');
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
// v2.4: eleven more day stickers, and the party stickers (one friend per star-jar party, then a trophy)
STICKERS.push('apple', 'watermelon', 'donut', 'ladybug', 'bee', 'kite', 'umbrella', 'cherries', 'pencil', 'planet', 'snowman');
export const PARTY_STICKERS = [...ALL_KINDS.map(k => 'f:' + k), 'trophy'];
/** the sticker book's pages, in order: every sticker has its own place (a grey shape until she earns it) */
export const ALBUM = [...STICKERS, ...PARTY_STICKERS];
const FRIEND_BG = { bunny: '#ffd0e2', puppy: '#bfe6ff', turtle: '#fff2a0', owl: '#ffd9b0', frog: '#ffe0f0', cat: '#c9f0d0', bear: '#cfe0f7', mouse: '#e6d6ff' };
const clearBlack = (p) => { for (let i = 0; i < p.d.length; i++) if (p.d[i] === 0xff000000) p.d[i] = 0; };
/** a sticker's shape in flat grey: the empty place in the book */
export function stickerShadow(id) {
  return cached('stkshadow' + id, () => {
    const src = sticker(id), c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#dfd3c3'; x.fillRect(0, 0, c.width, c.height);
    return c;
  });
}
export function sticker(id) {
  return cached('stk' + id, () => {
    const p = new Pix(26, 26);
    const o = 3;
    if (id.startsWith('f:')) { // a friend's face on a round badge (ears may poke out of the top)
      const kind = id.slice(2);
      const src = student(kind, { eyes: 'happy', mouth: 'open', armL: 'down', armR: 'down', feet: 0, look: 0, blush: true, hide: 0, wag: false, earUp: true, tongue: false });
      const px = new Uint32Array(src.getContext('2d').getImageData(0, 0, SW, SH).data.buffer);
      let top = 0; while (top < SH && !px.subarray(top * SW, (top + 1) * SW).some(v => v)) top++;
      let lo = SW, hi = 0; // centre the head (lop ears and big ears lean to one side)
      for (let y = top; y < top + 22; y++) for (let x = 0; x < SW; x++) if (px[y * SW + x]) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
      const x0 = Math.max(0, Math.min(SW - 26, Math.round((lo + hi + 1) / 2) - 13));
      p.ell(13, 14, 11.5, 11.5, FRIEND_BG[kind] || '#fff2a0');
      for (let y = 0; y < 25; y++) for (let x = 0; x < 26; x++) {
        const v = px[(top + y) * SW + x + x0]; if (!v) continue;
        const dx = x - 13, dy = y + 1 - 14;
        if (y + 1 < 14 || dx * dx + dy * dy <= 11.5 * 11.5) p.d[(y + 1) * 26 + x] = v;
      }
    } else
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
      case 'apple':
        p.ball(13, 15, 8.5, 8, '#ef4b4b'); p.ell(9, 12, 1.6, 2.6, '#ff9a9a'); p.vline(13, 3, 8, '#7a4a2a'); p.ell(17, 5, 3.2, 1.8, '#6cc44f'); break;
      case 'watermelon':
        p.ell(13, 8, 11.5, 13, '#4fae45', { y0: 8 }); p.ell(13, 8, 10, 11.5, '#d8f5c0', { y0: 8 }); p.ell(13, 8, 9, 10.5, '#ff5f7a', { y0: 8 });
        for (const [x, y] of [[9, 11], [13, 13], [17, 11], [11, 15], [15, 16]]) { p.px(x, y, INK); p.px(x, y + 1, INK); } break;
      case 'donut':
        p.ball(13, 14, 10.5, 9.5, '#e8b06a'); p.ell(13, 12.5, 9.5, 7.5, '#ff8fc0'); p.ell(13, 13.5, 3.2, 2.6, '#000000'); clearBlack(p);
        for (const [x, y, c] of [[7, 10, '#ffffff'], [11, 7, '#ffd23f'], [17, 8, '#7ec8ff'], [20, 12, '#ffffff'], [8, 15, '#7dd370'], [18, 16, '#ffd23f'], [13, 18, '#7ec8ff']]) { p.px(x, y, c); p.px(x + 1, y, c); } break;
      case 'ladybug':
        p.ball(13, 15, 9.5, 8.5, '#ef4b4b'); p.ell(13, 6.5, 5, 3.5, INK); p.vline(13, 8, 23, INK);
        for (const [x, y] of [[8, 12], [18, 12], [7, 18], [19, 18], [10, 21], [16, 21]]) p.ell(x, y, 1.6, 1.6, INK);
        p.px(11, 6, '#ffffff'); p.px(15, 6, '#ffffff'); p.px(10, 2, INK); p.px(9, 1, INK); p.px(16, 2, INK); p.px(17, 1, INK); break;
      case 'bee':
        p.ball(8, 7, 4.5, 4, '#dff3ff', { hi: false }); p.ball(17, 6, 4.5, 4, '#dff3ff', { hi: false });
        p.ball(13, 15, 10, 7.5, '#ffd23f'); for (const x of [10, 11, 15, 16]) p.vline(x, 8, 22, INK); p.rect(22, 15, 3, 1, INK);
        p.rect(5, 13, 2, 2, INK); p.px(5, 13, '#ffffff'); p.px(7, 17, '#ff9fb4'); break;
      case 'kite':
        for (let y = 0; y < 17; y++) { const h = y < 7 ? Math.floor(y * 1.3) : Math.floor((16 - y) * 0.85); p.hline(13 - h, 13 + h, 1 + y, y < 7 ? '#ef6f6c' : '#ffd23f'); }
        p.vline(13, 1, 17, '#ffffff'); p.hline(5, 21, 8, '#ffffff'); p.line(13, 18, 9, 24, '#8a7c90'); p.rect(10, 20, 2, 2, '#64a8e8'); p.rect(8, 23, 2, 2, '#7dd370'); break;
      case 'umbrella':
        p.ell(13, 12, 11.5, 10, '#b48be6', { y1: 12 }); for (const x of [5, 13, 21]) p.ell(x, 12, 4, 2.4, '#9a6fd6', { y0: 12 });
        p.vline(13, 2, 3, '#5a4560'); p.vline(13, 13, 22, '#5a4560'); p.hline(10, 13, 23, '#5a4560'); p.px(10, 22, '#5a4560'); break;
      case 'cherries':
        p.line(14, 4, 8, 15, '#4fae45'); p.line(14, 4, 18, 16, '#4fae45'); p.ell(18, 4, 3.5, 1.8, '#6cc44f');
        p.ball(8, 18, 5, 5, '#e8344e'); p.ball(18, 19, 5, 5, '#e8344e'); break;
      case 'pencil':
        p.rect(9, 2, 8, 3, '#ff8fb8'); p.rect(9, 5, 8, 2, '#c9d3df'); p.rect(9, 7, 8, 11, '#ffd23f'); p.vline(11, 7, 17, '#f5c000'); p.vline(14, 7, 17, '#f5c000');
        for (let i = 0; i < 4; i++) p.hline(9 + i, 16 - i, 18 + i, '#f3dcb0'); p.rect(12, 22, 2, 2, INK); break;
      case 'planet':
        p.ell(13, 14, 12.5, 3.2, '#b48be6'); p.ell(13, 14, 9, 1.6, '#000000'); clearBlack(p);
        p.ball(13, 13, 7.5, 7.5, '#ff9ec4'); p.hline(8, 18, 11, '#ffc2da'); p.hline(7, 15, 15, '#f47fae');
        p.ell(13, 14, 12.5, 3.2, '#b48be6', { y0: 15 }); p.ell(13, 14, 9, 1.6, '#ff9ec4', { y0: 15 }); p.px(3, 4, '#fff6b8'); p.px(22, 6, '#fff6b8'); break;
      case 'snowman':
        p.ball(13, 18, 7.5, 6.5, '#ffffff'); p.ball(13, 9, 5.5, 5, '#ffffff'); p.rect(9, 2, 8, 3, INK); p.hline(7, 18, 5, INK);
        p.px(11, 8, INK); p.px(15, 8, INK); p.rect(13, 10, 3, 1, '#ff9a2e'); p.hline(8, 18, 13, '#ef6f6c'); p.rect(16, 14, 2, 3, '#ef6f6c');
        p.px(13, 17, INK); p.px(13, 20, INK); break;
      case 'trophy':
        p.rect(7, 4, 12, 7, '#ffd23f'); p.ell(13, 11, 6, 5, '#ffd23f'); p.rect(3, 5, 3, 2, '#e0a820'); p.rect(3, 5, 2, 6, '#e0a820'); p.rect(4, 10, 4, 2, '#e0a820');
        p.rect(20, 5, 3, 2, '#e0a820'); p.rect(21, 5, 2, 6, '#e0a820'); p.rect(18, 10, 4, 2, '#e0a820');
        p.rect(12, 16, 2, 3, '#e0a820'); p.rect(8, 19, 10, 2, '#ffd23f'); p.rect(6, 21, 14, 3, '#a8703f'); p.vline(9, 5, 10, '#fff6b8'); p.map(11, 6, ['.#.', '###', '.#.'], { '#': '#ffffff' }); break;
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

// ---------------------------------------------------------------- paper crown ('star of the week') + tiny alphabet-line cards
export const CROWN_AT = { bunny: [12, 4], puppy: [12, 5], turtle: [12, 2], owl: [12, 5], frog: [12, 3], cat: [12, 5], bear: [12, 2], mouse: [12, 10] }; // top-left on the student sprite
/** crown y while hiding (turtle in her shell, mouse ducked under the desk) */
export const CROWN_HIDE = { turtle: 19, mouse: 23 };
export function crown() {
  return cached('crown', () => {
    const p = new Pix(11, 8);
    p.map(1, 1, ['#...#...#', '##.###.##', '#########', '#r##b##g#', '#########', 'ooooooooo'], { '#': '#ffd23f', r: '#ef4b4b', b: '#64a8e8', g: '#7dd370', o: '#ffb020' });
    p.px(2, 3, '#fff6b8'); p.px(2, 4, '#fff6b8');
    p.outline();
    return p.canvas();
  });
}
/** a 5x8 card for the alphabet line on the wall: blank (cream) until the letter has been traced
 * (its letter is drawn on top in the school font, at device resolution: see classroom.js drawAbcLine) */
export function abcCard(ch, col) {
  return cached('abccard' + (col || ''), () => {
    const p = new Pix(5, 8);
    p.rect(0, 0, 5, 8, col || '#fffaf0');
    p.rect(0, 7, 5, 1, col ? darken(col, 0.25) : '#e6dccb');
    if (col) p.hline(0, 4, 0, lighten(col, 0.45));
    p.px(2, 0, '#a06a44'); // clothes peg
    return p.canvas();
  });
}
