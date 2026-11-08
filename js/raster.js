// Tiny pixel-art rasterizer: draws into a Uint32 buffer with no anti-aliasing,
// then converts to a canvas that gets blitted with nearest-neighbour scaling.

const hexCache = new Map();
export function hex(c) {
  if (typeof c === 'number') return c;
  let v = hexCache.get(c);
  if (v === undefined) {
    const n = parseInt(c.slice(1), 16);
    v = ((0xff << 24) | ((n & 0xff) << 16) | (((n >> 8) & 0xff) << 8) | ((n >> 16) & 0xff)) >>> 0;
    hexCache.set(c, v);
  }
  return v;
}
function unpack(v) { return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff]; }
function pack(r, g, b) {
  return ((0xff << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
}
export function toCss(v) {
  const [r, g, b] = unpack(hex(v));
  return `rgb(${r},${g},${b})`;
}
/** Mix two colours (hex strings or packed) t=0 -> a, t=1 -> b. Returns hex string. */
export function mix(a, b, t) {
  const A = unpack(hex(a)), B = unpack(hex(b));
  const r = A.map((x, i) => Math.round(x + (B[i] - x) * t));
  return '#' + r.map(x => x.toString(16).padStart(2, '0')).join('');
}
export const darken = (c, t = 0.25) => mix(c, '#2a1630', t);
export const lighten = (c, t = 0.3) => mix(c, '#fffaf0', t);

export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint32Array(w * h);
  }
  px(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = hex(c);
  }
  /** set pixel and its mirror across the vertical centre line */
  pxm(x, y, c) { this.px(x, y, c); this.px(this.w - 1 - x, y, c); }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[y * this.w + x];
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  hline(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.px(x, y, c); }
  vline(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.px(x, y, c); }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** filled ellipse; optional clip {x0,x1,y0,y1} and onlyOver (only paint over opaque px) */
  ell(cx, cy, rx, ry, c, clip, onlyOver) {
    const v = hex(c);
    const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      if (clip && (y < (clip.y0 ?? -1e9) || y > (clip.y1 ?? 1e9))) continue;
      for (let x = x0; x <= x1; x++) {
        if (clip && (x < (clip.x0 ?? -1e9) || x > (clip.x1 ?? 1e9))) continue;
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
          if (onlyOver && !this.d[y * this.w + x]) continue;
          this.d[y * this.w + x] = v;
        }
      }
    }
  }
  /** shaded ball: shadow rim bottom-right, base, highlight top-left */
  ball(cx, cy, rx, ry, base, opts = {}) {
    const sh = opts.shadow || darken(base, 0.22);
    const hi = opts.hi || lighten(base, 0.35);
    this.ell(cx, cy, rx, ry, sh, opts.clip);
    this.ell(cx - 0.6, cy - 0.8, rx - 0.7, ry - 0.9, base, opts.clip, true);
    if (opts.hi !== false) this.ell(cx - rx * 0.38, cy - ry * 0.45, Math.max(1, rx * 0.32), Math.max(0.8, ry * 0.22), hi, opts.clip, true);
  }
  /** limb with its own darker rim so it reads against the body */
  limb(cx, cy, rx, ry, base) {
    this.ell(cx, cy, rx, ry, darken(base, 0.45));
    this.ell(cx, cy - 0.3, rx - 1, ry - 1, base);
    this.px(Math.floor(cx - rx * 0.3), Math.floor(cy - ry * 0.4), lighten(base, 0.4));
  }
  /** shade the row of pixels directly beneath an ellipse (chin shadow) */
  under(cx, cy, rx, ry, c, rows = 1) {
    const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx;
      if (Math.abs(dx) >= 1) continue;
      const yb = cy + ry * Math.sqrt(1 - dx * dx);
      const y = Math.floor(yb - 0.5) + 1;
      for (let r = 0; r < rows; r++) if (this.get(x, y + r)) this.px(x, y + r, c);
    }
  }
  /** draw a string bitmap: rows of chars mapped through palette (space/'.' = transparent) */
  map(x, y, rows, pal, scale = 1) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === ' ' || ch === '.') continue;
        const c = pal[ch];
        if (!c) continue;
        for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) this.px(x + i * scale + a, y + j * scale + b, c);
      }
    });
  }
  /** 1px outline around opaque area, colour derived from the neighbour for a soft "selout" look */
  outline(base = '#2a1630', t = 0.72) {
    const { w, h, d } = this;
    const src = d.slice();
    const outC = new Map();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (src[y * w + x]) continue;
      let n = 0;
      if (x > 0 && src[y * w + x - 1]) n = src[y * w + x - 1];
      else if (x < w - 1 && src[y * w + x + 1]) n = src[y * w + x + 1];
      else if (y > 0 && src[(y - 1) * w + x]) n = src[(y - 1) * w + x];
      else if (y < h - 1 && src[(y + 1) * w + x]) n = src[(y + 1) * w + x];
      if (!n) continue;
      let o = outC.get(n);
      if (o === undefined) {
        const [r, g, b] = unpack(n), [R, G, B] = unpack(hex(base));
        o = pack(r + (R - r) * t, g + (G - g) * t, b + (B - b) * t);
        outC.set(n, o);
      }
      d[y * w + x] = o;
    }
    return this;
  }
  /** recolour every opaque pixel (used for glows / silhouettes) */
  silhouette(c) {
    const v = hex(c);
    for (let i = 0; i < this.d.length; i++) if (this.d[i]) this.d[i] = v;
    return this;
  }
  canvas() {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const cx = cv.getContext('2d');
    const img = cx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.d);
    cx.putImageData(img, 0, 0);
    return cv;
  }
}

/** memoising sprite cache */
const cache = new Map();
export function cached(key, make) {
  let c = cache.get(key);
  if (!c) { c = make(); cache.set(key, c); }
  return c;
}

/** 1px glow halo canvas around a sprite canvas */
export function glow(src, color, key) {
  return cached('glow:' + key, () => {
    const w = src.width + 4, h = src.height + 4;
    const sctx = src.getContext('2d');
    const data = new Uint32Array(sctx.getImageData(0, 0, src.width, src.height).data.buffer);
    const p = new Pix(w, h);
    const v = hex(color);
    for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
      if (!data[y * src.width + x]) continue;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
        if (Math.abs(i) + Math.abs(j) > 3) continue;
        p.d[(y + 2 + j) * w + (x + 2 + i)] = v;
      }
    }
    return p.canvas();
  });
}
