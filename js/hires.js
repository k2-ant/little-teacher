// Smooth things at full device resolution, inside the pixel-art views.
//
// A view (makeView) is a low-res buffer blitted to the screen at an integer scale s. Smooth text drawn into it
// would just be blown up, so instead its context is hooked: drawing a text sprite (schoolfont.textSprite: a
// canvas with a .lt renderer) or calling hiDraw() does not touch the buffer, it queues the item to be painted
// straight onto the device canvas, with the context's current transform and globalAlpha. Z-order is kept: as
// soon as an ordinary draw call would land on a queued item, the buffer drawn so far is blitted to the screen,
// the buffer is cleared, and the queued items are painted on top of it (source-over layers compose exactly).
// Draw calls that don't overlap anything queued run untouched, so a grid of tiles costs no extra blits.
// main.js brackets every scene render with beginPresent / endPresent.

const P = typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype : null;
const ORIG = P ? Object.fromEntries(['save', 'restore', 'translate', 'scale', 'rotate', 'transform', 'setTransform', 'resetTransform',
  'fillRect', 'strokeRect', 'clearRect', 'drawImage', 'fill', 'stroke', 'putImageData', 'fillText', 'strokeText'].map(k => [k, P[k]])) : {};

const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
function bounds(m, x, y, w, h) { // axis-aligned box (buffer px) of a rect under matrix m
  if (!m[1] && !m[2]) {
    const xa = m[0] * x + m[4], xb = m[0] * (x + w) + m[4], ya = m[3] * y + m[5], yb = m[3] * (y + h) + m[5];
    return [Math.min(xa, xb), Math.min(ya, yb), Math.max(xa, xb), Math.max(ya, yb)];
  }
  const xs = [], ys = [];
  for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { xs.push(m[0] * px + m[2] * py + m[4]); ys.push(m[1] * px + m[3] * py + m[5]); }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** hook a view's context (called by makeView) */
export function hookView(ctx, buf, s) {
  if (!P) return;
  const st = { ctx, buf, s, out: null, alpha: 1, pend: [], m: [1, 0, 0, 1, 0, 0], stack: [] };
  ctx.__hi = st;
  const o = ORIG;
  ctx.save = function () { st.stack.push(st.m.slice()); o.save.call(this); };
  ctx.restore = function () { if (st.stack.length) st.m = st.stack.pop(); o.restore.call(this); };
  ctx.translate = function (x, y) { const m = st.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; o.translate.call(this, x, y); };
  ctx.scale = function (x, y) { const m = st.m; m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y; o.scale.call(this, x, y); };
  ctx.rotate = function (a) { const c = Math.cos(a), sn = Math.sin(a); st.m = mul(st.m, [c, sn, -sn, c, 0, 0]); o.rotate.call(this, a); };
  ctx.transform = function (a, b, c, d, e, f) { st.m = mul(st.m, [a, b, c, d, e, f]); o.transform.call(this, a, b, c, d, e, f); };
  ctx.setTransform = function (a, b, c, d, e, f) {
    if (a && typeof a === 'object') st.m = [a.a, a.b, a.c, a.d, a.e, a.f];
    else if (arguments.length >= 6) st.m = [a, b, c, d, e, f];
    else st.m = [1, 0, 0, 1, 0, 0];
    o.setTransform.apply(this, arguments);
  };
  ctx.resetTransform = function () { st.m = [1, 0, 0, 1, 0, 0]; o.resetTransform.call(this); };
  const rectOp = (name) => function (x, y, w, h) { if (st.pend.length) touch(st, bounds(st.m, x, y, w, h)); o[name].call(this, x, y, w, h); };
  ctx.fillRect = rectOp('fillRect'); ctx.strokeRect = rectOp('strokeRect'); ctx.clearRect = rectOp('clearRect');
  for (const name of ['fill', 'stroke', 'putImageData', 'fillText', 'strokeText']) {
    ctx[name] = function () { if (st.pend.length) flush(st); return o[name].apply(this, arguments); };
  }
  ctx.drawImage = function (img, a, b, c, d) {
    const n = arguments.length;
    if (img && img.lt && st.out && n <= 5) { // a smooth text sprite: paint it at device resolution
      const w = n === 5 ? c : img.width, h = n === 5 ? d : img.height;
      queue(st, bounds(st.m, a, b, w, h), (out, k) => out.drawImage(img.lt.hi(k * w / img.width), a, b, w, h), this.globalAlpha);
      return;
    }
    if (st.pend.length) {
      if (n <= 5) touch(st, bounds(st.m, a, b, n === 5 ? c : img.width, n === 5 ? d : img.height));
      else touch(st, bounds(st.m, arguments[5], arguments[6], arguments[7], arguments[8]));
    }
    return o.drawImage.apply(this, arguments);
  };
}
function queue(st, b, fn, alpha) {
  st.pend.push({ m: st.m.slice(), a: alpha, b, fn });
}
function touch(st, b) {
  for (const it of st.pend) {
    const q = it.b;
    if (b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]) { flush(st); return; }
  }
}
function blitBuf(st) {
  const out = st.out;
  out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = st.alpha; out.imageSmoothingEnabled = false;
  out.drawImage(st.buf, 0, 0, st.buf.width * st.s, st.buf.height * st.s);
  out.restore();
}
function paintPend(st) {
  const { out, s } = st;
  for (const it of st.pend) {
    const m = it.m;
    out.save();
    out.setTransform(s * m[0], s * m[1], s * m[2], s * m[3], s * m[4], s * m[5]);
    out.globalAlpha = st.alpha * it.a;
    out.imageSmoothingEnabled = true; out.imageSmoothingQuality = 'high';
    it.fn(out, s * Math.hypot(m[0], m[1]));
    out.restore();
  }
  st.pend.length = 0;
}
function flush(st) {
  if (!st.out) { st.pend.length = 0; return; }
  blitBuf(st);
  const c = st.ctx, o = ORIG;
  o.save.call(c); o.setTransform.call(c, 1, 0, 0, 1, 0, 0); o.clearRect.call(c, 0, 0, st.buf.width, st.buf.height); o.restore.call(c);
  paintPend(st);
}

/**
 * Draw something smooth at device resolution, in the context's logical coordinates.
 * (x, y, w, h) = the area it covers (for keeping draw order); fn(o, k) draws into o, a context whose transform
 * maps logical px to device px, k = device px per logical px. On a context that isn't a presenting view, fn
 * just runs on c itself (k = 1).
 */
export function hiDraw(c, x, y, w, h, fn) {
  const st = c.__hi;
  if (!st || !st.out) { c.save(); fn(c, 1); c.restore(); return; }
  queue(st, bounds(st.m, x, y, w, h), fn, c.globalAlpha);
}

/** main.js: a view is about to render, its frame goes onto `out` (the device canvas) at `alpha` */
export function beginPresent(v, out, alpha = 1) {
  const st = v.ctx.__hi;
  if (!st) return;
  st.out = out; st.alpha = alpha; st.pend.length = 0;
}
/** main.js: the view finished rendering: blit what's left of its buffer, then the smooth items on top */
export function endPresent(v, out, alpha = 1) {
  const st = v.ctx.__hi;
  if (!st || !st.out) {
    out.save(); out.globalAlpha = alpha; out.imageSmoothingEnabled = false; out.drawImage(v.buf, 0, 0, v.W * v.s, v.H * v.s); out.restore();
    return;
  }
  blitBuf(st);
  paintPend(st);
  st.out = null;
}
