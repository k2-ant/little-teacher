// "School" letters: a procedural ball-and-stick stroke font, like the letters on a kindergarten wall
// (single-storey a and g, plain stick l, t with a curved foot, 1 with a flag and no base, an unslashed 0).
// Glyphs are pen strokes (lines, arcs, dots) in the order and direction they are taught, so the tracing
// board (strokes.js) uses the very same shapes. They are drawn with a round pen at full device resolution
// (see hires.js): the pixel world stays pixels, only letters and numbers are smooth.
//
// Units: x-height = 1, baseline y = 0, y goes UP. Cap height / ascender = 2 (the top line of school paper,
// so the x-height is exactly the dashed midline), descender = -0.9. Angles in degrees, 0 = right, 90 = up,
// increasing = counter-clockwise on the page.

export const XH = 1, CAP = 2, DESC_U = 0.9;
export const WEIGHT = 0.2; // pen width as a fraction of the x-height
export const INK = '#3b2a4a';
export const BASE_COL = '#9fc4ea', MID_COL = '#f3a8b4';

// ---------------------------------------------------------------- stroke builders
const L = (x1, y1, x2, y2) => [[x1, y1], [x2, y2]];
function A(cx, cy, rx, ry, a0, a1) {
  const n = Math.max(4, Math.ceil(Math.abs(a1 - a0) / 4)), pts = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return pts;
}
/** join pieces into one continuous stroke */
const S = (...parts) => parts.reduce((out, p) => { const q = out.length && p.length && Math.hypot(out[out.length - 1][0] - p[0][0], out[out.length - 1][1] - p[0][1]) < 1e-6 ? p.slice(1) : p; return out.concat(q); }, []);
const D = (x, y) => [[x, y]]; // a dot
/** a wavy tilde (ñ) between x0 and x1 */
function T(x0, x1, y, amp = 0.11) {
  const pts = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([x0 + (x1 - x0) * u, y + Math.sin(u * Math.PI * 2) * amp * (0.75 + 0.25 * Math.sin(u * Math.PI))]); }
  return pts;
}
const acute = (cx, y = 1.32) => L(cx + 0.2, y + 0.4, cx - 0.06, y); // written from the top, down to the left
const move = (strokes, dx, dy = 0) => strokes.map(st => st.map(([x, y]) => [x + dx, y + dy]));

// ---------------------------------------------------------------- the glyphs (strokes in teaching order)
// a glyph is { s: strokes, l, r } where l / r nudge the side bearings (units)
const bowlBack = (cx = 0.5) => A(cx, 0.5, 0.5, 0.5, 62, 422); // "circle back" (counter-clockwise), from just right of the top
const bowlFwd = (cx = 0.5) => A(cx, 0.5, 0.5, 0.5, 180, -180); // "circle forward" (clockwise), from the stick
const G = {
  a: { s: [bowlBack(), L(1, 1, 1, 0)] },
  b: { s: [L(0, 2, 0, 0), bowlFwd()] },
  c: { s: [A(0.5, 0.5, 0.5, 0.5, 48, 312)], r: -0.06 },
  d: { s: [bowlBack(), L(1, 2, 1, 0)] },
  e: { s: [S(L(0.02, 0.5, 0.98, 0.5), A(0.5, 0.5, 0.5, 0.5, 0, 318))], r: -0.06 },
  f: { s: [S(A(0.72, 1.62, 0.36, 0.36, 28, 180), L(0.36, 1.62, 0.36, 0)), L(0, 1, 0.78, 1)], l: -0.04, r: -0.3 },
  g: { s: [bowlBack(), S(L(1, 1, 1, -0.42), A(0.52, -0.42, 0.48, 0.46, 0, -165))] },
  h: { s: [L(0, 2, 0, 0), S(A(0.47, 0.53, 0.47, 0.47, 180, 0), L(0.94, 0.53, 0.94, 0))] },
  i: { s: [L(0, 1, 0, 0), D(0, 1.48)] },
  j: { s: [S(L(0.55, 1, 0.55, -0.45), A(0.13, -0.45, 0.42, 0.44, 0, -165)), D(0.55, 1.48)], l: -0.42 },
  k: { s: [L(0, 2, 0, 0), L(0.86, 1, 0.02, 0.4), L(0.3, 0.6, 0.92, 0)] },
  l: { s: [L(0, 2, 0, 0)] },
  m: { s: [L(0, 1, 0, 0), S(A(0.36, 0.58, 0.36, 0.42, 180, 0), L(0.72, 0.58, 0.72, 0)), S(A(1.08, 0.58, 0.36, 0.42, 180, 0), L(1.44, 0.58, 1.44, 0))] },
  n: { s: [L(0, 1, 0, 0), S(A(0.47, 0.53, 0.47, 0.47, 180, 0), L(0.94, 0.53, 0.94, 0))] },
  o: { s: [bowlBack()] },
  p: { s: [L(0, 1, 0, -DESC_U), bowlFwd()] },
  q: { s: [bowlBack(), L(1, 1, 1, -DESC_U)] },
  r: { s: [L(0, 1, 0, 0), A(0.47, 0.53, 0.47, 0.47, 180, 42)], r: -0.08 },
  s: { s: [S(A(0.42, 0.75, 0.38, 0.25, 32, 270), A(0.42, 0.25, 0.42, 0.25, 90, -152))] },
  t: { s: [S(L(0.3, 1.6, 0.3, 0.3), A(0.62, 0.3, 0.32, 0.3, 180, 318)), L(0, 1, 0.72, 1)], r: -0.08 },
  u: { s: [S(L(0, 1, 0, 0.47), A(0.47, 0.47, 0.47, 0.47, 180, 360), L(0.94, 0.47, 0.94, 1)), L(0.94, 1, 0.94, 0)] },
  v: { s: [S(L(0, 1, 0.46, 0), L(0.46, 0, 0.92, 1))], l: -0.04, r: -0.04 },
  w: { s: [S(L(0, 1, 0.34, 0), L(0.34, 0, 0.68, 0.9), L(0.68, 0.9, 1.02, 0), L(1.02, 0, 1.36, 1))], l: -0.04, r: -0.04 },
  x: { s: [L(0, 1, 0.86, 0), L(0.86, 1, 0, 0)] },
  y: { s: [L(0, 1, 0.5, 0), L(0.94, 1, 0.12, -DESC_U)], l: -0.04, r: -0.04 },
  z: { s: [S(L(0, 1, 0.86, 1), L(0.86, 1, 0, 0), L(0, 0, 0.88, 0))] },

  A: { s: [L(0.76, 2, 0, 0), L(0.76, 2, 1.52, 0), L(0.29, 0.76, 1.23, 0.76)], l: -0.05, r: -0.05 },
  B: { s: [L(0, 2, 0, 0), S(L(0, 2, 0.56, 2), A(0.56, 1.5, 0.46, 0.5, 90, -90), L(0.56, 1, 0, 1)), S(L(0, 1, 0.62, 1), A(0.62, 0.5, 0.5, 0.5, 90, -90), L(0.62, 0, 0, 0))] },
  C: { s: [A(0.92, 1, 0.92, 1, 46, 314)], r: -0.08 },
  D: { s: [L(0, 2, 0, 0), S(L(0, 2, 0.5, 2), A(0.5, 1, 0.76, 1, 90, -90), L(0.5, 0, 0, 0))] },
  E: { s: [L(0, 2, 0, 0), L(0, 2, 1.04, 2), L(0, 1, 0.84, 1), L(0, 0, 1.04, 0)] },
  F: { s: [L(0, 2, 0, 0), L(0, 2, 1.04, 2), L(0, 1, 0.84, 1)] },
  G: { s: [S(A(0.92, 1, 0.92, 1, 46, 360), L(1.84, 1, 1.12, 1))] },
  H: { s: [L(0, 2, 0, 0), L(1.24, 2, 1.24, 0), L(0, 1, 1.24, 1)] },
  I: { s: [L(0.44, 2, 0.44, 0), L(0, 2, 0.88, 2), L(0, 0, 0.88, 0)] },
  J: { s: [S(L(1, 2, 1, 0.56), A(0.52, 0.56, 0.48, 0.56, 0, -172)), L(0.56, 2, 1.44, 2)] },
  K: { s: [L(0, 2, 0, 0), L(1.06, 2, 0.02, 0.84), L(0.4, 1.26, 1.1, 0)] },
  L: { s: [S(L(0, 2, 0, 0), L(0, 0, 1, 0))] },
  M: { s: [L(0, 2, 0, 0), S(L(0, 2, 0.74, 0.62), L(0.74, 0.62, 1.48, 2)), L(1.48, 2, 1.48, 0)] },
  N: { s: [L(0, 2, 0, 0), L(0, 2, 1.24, 0), L(1.24, 0, 1.24, 2)] },
  O: { s: [A(0.94, 1, 0.94, 1, 90, 450)] },
  P: { s: [L(0, 2, 0, 0), S(L(0, 2, 0.56, 2), A(0.56, 1.48, 0.5, 0.52, 90, -90), L(0.56, 0.96, 0, 0.96))] },
  Q: { s: [A(0.94, 1, 0.94, 1, 90, 450), L(1.1, 0.44, 1.7, -0.12)] },
  R: { s: [L(0, 2, 0, 0), S(L(0, 2, 0.56, 2), A(0.56, 1.48, 0.5, 0.52, 90, -90), L(0.56, 0.96, 0, 0.96)), L(0.52, 0.96, 1.16, 0)] },
  S: { s: [S(A(0.66, 1.5, 0.6, 0.5, 26, 270), A(0.66, 0.5, 0.66, 0.5, 90, -154))] },
  T: { s: [L(0, 2, 1.32, 2), L(0.66, 2, 0.66, 0)], l: -0.06, r: -0.06 },
  U: { s: [S(L(0, 2, 0, 0.62), A(0.62, 0.62, 0.62, 0.62, 180, 360), L(1.24, 0.62, 1.24, 2))] },
  V: { s: [S(L(0, 2, 0.72, 0), L(0.72, 0, 1.44, 2))], l: -0.06, r: -0.06 },
  W: { s: [S(L(0, 2, 0.42, 0), L(0.42, 0, 0.84, 1.4), L(0.84, 1.4, 1.26, 0), L(1.26, 0, 1.68, 2))], l: -0.06, r: -0.06 },
  X: { s: [L(0, 2, 1.24, 0), L(1.24, 2, 0, 0)] },
  Y: { s: [L(0, 2, 0.66, 1), L(1.32, 2, 0.66, 1), L(0.66, 1, 0.66, 0)], l: -0.06, r: -0.06 },
  Z: { s: [S(L(0, 2, 1.22, 2), L(1.22, 2, 0, 0), L(0, 0, 1.24, 0))] },

  0: { s: [A(0.64, 1, 0.64, 1, 90, 450)] },
  1: { s: [S(L(0, 1.58, 0.5, 2), L(0.5, 2, 0.5, 0))], l: 0.04, r: 0.04 },
  2: { s: [S(A(0.6, 1.42, 0.56, 0.58, 158, -38), L(1.04, 1.06, 0, 0), L(0, 0, 1.18, 0))] },
  3: { s: [S(A(0.56, 1.5, 0.5, 0.5, 150, -90), A(0.56, 0.5, 0.58, 0.5, 90, -152))] },
  4: { s: [S(L(0.78, 2, 0, 0.64), L(0, 0.64, 1.2, 0.64)), L(0.88, 1.56, 0.88, 0)] },
  5: { s: [S(L(0.14, 2, 0.12, 1.06), A(0.6, 0.6, 0.56, 0.6, 145, -150)), L(0.14, 2, 1.08, 2)] },
  6: { s: [S(A(0.62, 1, 0.62, 1, 58, 270), A(0.62, 0.5, 0.56, 0.5, -90, 180))] },
  7: { s: [S(L(0, 2, 1.16, 2), L(1.16, 2, 0.38, 0))] },
  8: { s: [S(A(0.58, 1.5, 0.46, 0.5, 32, 270), A(0.58, 0.5, 0.56, 0.5, 90, -270), A(0.58, 1.5, 0.46, 0.5, -90, 32))] },
  9: { s: [S(A(0.56, 1.45, 0.52, 0.55, 4, 364), L(1.08, 1.45, 1.04, 0))] },

  '.': { s: [D(0, 0)] },
  ',': { s: [L(0.08, 0.02, -0.06, -0.3)] },
  ':': { s: [D(0, 0.85), D(0, 0)] },
  ';': { s: [D(0.06, 0.85), L(0.1, 0.02, -0.04, -0.3)] },
  '!': { s: [L(0, 2, 0, 0.6), D(0, 0)] },
  '¡': { s: [D(0, 1.1), L(0, 0.5, 0, -0.9)] },
  '?': { s: [S(A(0.46, 1.52, 0.46, 0.46, 160, -90), L(0.46, 1.06, 0.46, 0.6)), D(0.46, 0)] },
  '-': { s: [L(0, 0.6, 0.56, 0.6)] },
  "'": { s: [L(0, 2, 0, 1.6)] },
  '"': { s: [L(0, 2, 0, 1.6), L(0.3, 2, 0.3, 1.6)] },
  '(': { s: [A(0.9, 0.55, 0.9, 1.5, 128, 232)] },
  ')': { s: [A(-0.35, 0.55, 0.9, 1.5, 52, -52)] },
  '/': { s: [L(0.8, 2, 0, -0.3)] },
  '+': { s: [L(0.4, 1.2, 0.4, 0.2), L(0, 0.7, 0.8, 0.7)] },
  '=': { s: [L(0, 0.95, 0.8, 0.95), L(0, 0.45, 0.8, 0.45)] },
};
// ¿ is ? turned upside down (it hangs below the line like ¡)
G['¿'] = { s: G['?'].s.map(st => st.map(([x, y]) => [0.92 - x, 1.1 - y]).reverse()) };
// accented letters
const cx = (ch) => { const xs = G[ch].s.flat().map(p => p[0]); return (Math.min(...xs) + Math.max(...xs)) / 2; };
for (const [v, b] of [['á', 'a'], ['é', 'e'], ['ó', 'o'], ['ú', 'u']]) G[v] = { ...G[b], s: [...G[b].s, acute(cx(b))] };
G['í'] = { s: [L(0, 1, 0, 0), acute(0, 1.3)], l: 0.04, r: 0.04 };
G['ü'] = { s: [...G.u.s, D(0.24, 1.42), D(0.7, 1.42)] };
G['ñ'] = { s: [...G.n.s, T(0.08, 0.86, 1.42)] };
for (const [v, b] of [['Á', 'A'], ['É', 'E'], ['Í', 'I'], ['Ó', 'O'], ['Ú', 'U']]) G[v] = { ...G[b], s: [...G[b].s, acute(cx(b), 2.3)] };
G['Ü'] = { ...G.U, s: [...G.U.s, D(0.36, 2.4), D(0.88, 2.4)] };
G['Ñ'] = { ...G.N, s: [...G.N.s, T(0.18, 1.06, 2.42, 0.13)] };

// ---------------------------------------------------------------- metrics
const SB = 0.15; // side bearing (white space each side of the pen edge)
const SPACE = 0.62;
const META = {};
for (const [ch, g] of Object.entries(G)) {
  const pts = g.s.flat();
  const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0]));
  const y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
  META[ch] = { x0, x1, y0, y1, adv: x1 - x0 + WEIGHT + 2 * SB + (g.l || 0) + (g.r || 0) };
}
export const hasGlyph = (ch) => !!G[ch] || ch === ' ';
const HANGS = /[gjpqy,;¡¿Q]/;
export const hasDescender = (ch) => HANGS.test(ch) && ch !== 'Q';

/** the strokes of one glyph in font units (y up), with the glyph's left pen edge at x = 0 */
export function glyphStrokes(ch) {
  const g = G[ch];
  if (!g) return null;
  const m = META[ch];
  return g.s.map(st => st.map(([x, y]) => [x - m.x0, y]));
}
export function glyphBox(ch) { const m = META[ch]; return m && { w: m.x1 - m.x0, top: m.y1, bottom: m.y0 }; }

/** lay a string out in font units: [{ch, x}] (x = where the glyph's strokes start), width, ink top/bottom */
export function layout(text) {
  let x = 0, top = CAP, bottom = 0;
  const out = [];
  for (const ch of [...text]) {
    if (ch === ' ' || !G[ch]) { x += SPACE; continue; } // unknown characters become a space (never a hole mid-word)
    const g = G[ch], m = META[ch];
    out.push({ ch, x: x + SB + WEIGHT / 2 + (g.l || 0) });
    x += m.adv;
    top = Math.max(top, m.y1); bottom = Math.min(bottom, m.y0);
  }
  return { glyphs: out, w: Math.max(0, x), top, bottom };
}

// ---------------------------------------------------------------- drawing
/** stroke a laid-out string with a round pen into any 2D context. (ox, oy) = left end of the baseline, u = px per unit */
export function strokeText(c, lay, ox, oy, u, col, pen, outline, ow) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  const pass = (colr, width) => {
    c.strokeStyle = colr; c.fillStyle = colr; c.lineWidth = width;
    c.beginPath();
    for (const g of lay.glyphs) for (const st of glyphStrokes(g.ch)) {
      if (st.length === 1) continue;
      st.forEach(([x, y], i) => { const X = ox + (g.x + x) * u, Y = oy - y * u; if (i) c.lineTo(X, Y); else c.moveTo(X, Y); });
    }
    c.stroke();
    for (const g of lay.glyphs) for (const st of glyphStrokes(g.ch)) {
      if (st.length !== 1) continue;
      c.beginPath(); c.arc(ox + (g.x + st[0][0]) * u, oy - st[0][1] * u, width * 0.56, 0, Math.PI * 2); c.fill();
    }
  };
  if (outline) pass(outline, pen + 2 * ow);
  pass(col, pen);
}

/**
 * A word as a sprite: a canvas at LOGICAL size (so callers can measure and position it like any pixel sprite),
 * that carries a .lt renderer. Views made by makeView draw it at full device resolution; anywhere else it falls
 * back to its own smooth low-res copy.
 * opts: h = cap height in logical px (x-height = h / 2), col, outline (colour), ow (outline px), weight,
 *       desc: 'auto' (room below the line only if something hangs) | 'always' | 'never'
 */
const sprites = new Map();
export function textSprite(text, opts = {}) {
  const h = opts.h ?? 14, col = opts.col ?? INK, outline = opts.outline || null;
  const weight = opts.weight ?? WEIGHT, desc = opts.desc ?? 'auto';
  const key = [text, h, col, outline, opts.ow, weight, desc].join('|');
  let sp = sprites.get(key);
  if (sp) return sp;
  const u = h / CAP, pen = Math.max(0.35, weight * u), ow = outline ? (opts.ow ?? Math.max(0.5, pen * 0.32)) : 0;
  const lay = layout(text);
  const padX = ow + 0.5 + Math.max(0, pen - WEIGHT * u) / 2, pad = pen / 2 + ow + 0.5;
  const hangs = desc === 'always' || (desc === 'auto' && [...text].some(hasDescender));
  const above = Math.ceil(Math.max(CAP, lay.top) * u + pad);
  const below = Math.ceil((hangs ? Math.max(DESC_U, -lay.bottom) * u : Math.max(0, -lay.bottom * u)) + pad);
  const W = Math.max(1, Math.ceil(lay.w * u - 2 * SB * u + 2 * padX)), H = above + below;
  const x0 = padX - SB * u; // where the layout's x = 0 lands
  const paint = (k) => {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(W * k)); cv.height = Math.max(1, Math.ceil(H * k));
    strokeText(cv.getContext('2d'), lay, x0 * k, above * k, u * k, col, pen * k, outline, ow * k);
    return cv;
  };
  sp = paint(1);
  const his = new Map();
  sp.lt = {
    base: above, w: W, h: H, text,
    /** the same word painted at k device px per logical px (cached) */
    hi(k) {
      k = Math.abs(k - Math.round(k)) < 0.02 ? Math.round(k) : Math.ceil(k * 4) / 4;
      let cv = his.get(k);
      if (!cv) { if (his.size > 4) his.clear(); cv = paint(k); his.set(k, cv); }
      return cv;
    },
  };
  if (sprites.size > 600) sprites.clear();
  sprites.set(key, sp);
  return sp;
}
/** width in logical px of a word at cap height h (the ink box, as textSprite measures it) */
export function textWidth(text, h) { return textSprite(text, { h }).width; }

/**
 * A word as hard-edged pixels (no smoothing), for bitmaps that really are pixel art (whiteboard stamps).
 * Returns a canvas; h = cap height in px.
 */
export function pixelText(text, col, h, weight = 0.3) {
  const u = h / CAP, pen = Math.max(1.6, weight * u), lay = layout(text);
  const pad = Math.ceil(pen / 2) + 1, above = Math.ceil(Math.max(CAP, lay.top) * u) + pad;
  const below = Math.ceil(-lay.bottom * u) + pad;
  const W = Math.ceil(lay.w * u - 2 * SB * u + pen) + 2, H = above + below;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  strokeText(c, lay, 1 + pen / 2 - (SB + WEIGHT / 2) * u, above, u, '#000', pen);
  const im = c.getImageData(0, 0, W, H), d = im.data;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16));
  for (let i = 0; i < d.length; i += 4) {
    const on = d[i + 3] >= 110;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = on ? 255 : 0;
  }
  c.putImageData(im, 0, 0);
  return cv;
}

/** draw a text sprite into a context that is already at device resolution (k device px per logical px) */
export function blitText(o, sp, x, y, k, w = sp.width, h = sp.height) {
  o.drawImage(sp.lt.hi(k * w / sp.width), x, y, w, h);
}

/**
 * School-paper guide lines (into a device-resolution context with a logical transform):
 * a faint solid baseline and a dashed pink midline at the x-height. k = device px per logical px.
 */
export function paperLines(o, x0, x1, base, xh, k, { top = false } = {}) {
  const lw = Math.max(1, Math.round(k * 0.5)) / k;
  o.save();
  o.lineCap = 'butt'; o.lineWidth = lw;
  o.strokeStyle = BASE_COL;
  o.beginPath(); o.moveTo(x0, base + lw / 2); o.lineTo(x1, base + lw / 2);
  if (top) { o.moveTo(x0, base - 2 * xh + lw / 2); o.lineTo(x1, base - 2 * xh + lw / 2); }
  o.stroke();
  o.strokeStyle = MID_COL; o.setLineDash([Math.max(1.5, xh * 0.3), Math.max(1, xh * 0.22)]);
  o.beginPath(); o.moveTo(x0, base - xh + lw / 2); o.lineTo(x1, base - xh + lw / 2); o.stroke();
  o.restore();
}
