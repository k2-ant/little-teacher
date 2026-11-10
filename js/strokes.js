// Handwriting strokes for the tracing board: uppercase letters (incl. Ñ) and numbers 0-10.
// They come straight from the school font (schoolfont.js), so the guide she traces is the very letter on the
// tiles, with its strokes in the order and direction they are taught.
// Coordinates are in a 100 x 140 box (y down): y = 0 is the top line, 70 the dashed midline, 140 the baseline.
import { glyphStrokes, glyphBox, CAP } from './schoolfont.js';

export const BOX_W = 100, BOX_H = 140;
const U = BOX_H / CAP; // box units per font unit
const MAX_W = 124; // wider than this (W, 10) gets squeezed a little sideways

function raw(ch) {
  let strokes, w, top;
  if (ch === '10') { // "1" and "0" side by side, a little closer than in a word
    const one = glyphStrokes('1'), zero = glyphStrokes('0'), w1 = glyphBox('1').w, gap = 0.42;
    strokes = [...one, ...zero.map(st => st.map(([x, y]) => [x + w1 + gap, y]))];
    w = w1 + gap + glyphBox('0').w; top = CAP;
  } else {
    strokes = glyphStrokes(ch);
    if (!strokes) return null;
    const b = glyphBox(ch); w = b.w; top = b.top;
  }
  const k = Math.min(1, CAP / (top + 0.1)); // Ñ: its tilde has to fit under the top line too
  const sx = Math.min(1, MAX_W / (w * U * k));
  return strokes.map(st => st.map(([x, y]) => [BOX_W / 2 + (x - w / 2) * U * k * sx, BOX_H - y * U * k]));
}

/** resample each stroke into evenly spaced points (step in box units) */
export function strokesFor(ch, step = 2.2) {
  const r = raw(ch);
  if (!r) return null;
  return r.map(st => {
    const out = [st[0]];
    for (let i = 1; i < st.length; i++) {
      const [x0, y0] = st[i - 1], [x1, y1] = st[i];
      const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(d / step));
      for (let k = 1; k <= n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
    }
    return out;
  });
}
