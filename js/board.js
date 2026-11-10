import { G, makeView, persist, rand, pick, wait } from './state.js';
import { Pix, cached, hex, darken, lighten } from './raster.js';
import * as S from './sprites.js';
import { WALLS } from './decor.js';
import { sfx, strokeStart, strokeSpeed, strokeEnd } from './audio.js';
import { sayHint, sayUI, drawHand } from './hints.js';
import { numberWord, letterName } from './i18n.js';
import { textSprite } from './schoolfont.js';
import { STAR_COUNT_LINE } from './learndata.js';
import { act, acting, hop, talk, speak, animalSound, coax, physics, pose, traits, startle, randomCheer, tapEscalate, crowned } from './students.js';

export const BW = 192, BH = 108;
const BG = '#f8fbff';
export const MARKERS = [
  { c: '#2d2a3e', name: 'Black' }, { c: '#ef4b4b', name: 'Red' }, { c: '#ff9a1f', name: 'Orange' },
  { c: '#3cb44b', name: 'Green' }, { c: '#2f7de1', name: 'Blue' }, { c: '#ff6fb5', name: 'Pink' },
];
const WORDS = { star: 'Star!', heart: 'Heart!', apple: 'Apple!', sun: 'Sun!', 1: 'One!', 2: 'Two!', 3: 'Three!', 4: 'Four!', 5: 'Five!', A: 'Ay!', B: 'Bee!', C: 'See!' };

function circleMask(r) {
  const out = [];
  const R = Math.ceil(r);
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (x * x + y * y <= r * r + 0.3) out.push([x, y]);
  return out;
}
const MARKER_MASK = circleMask(2.6), ERASER_MASK = circleMask(7);

function markerSprite(col, sel) {
  return cached('marker' + col + sel, () => {
    const p = new Pix(26, 11);
    p.rect(0, 2, 6, 7, col); p.hline(0, 5, 2, lighten(col, 0.4)); // cap
    p.rect(6, 1, 13, 9, '#fffaf0'); p.hline(6, 18, 1, '#ffffff'); p.hline(6, 18, 9, '#d8d0c8');
    p.rect(9, 3, 7, 5, col); p.hline(9, 15, 3, lighten(col, 0.35));
    p.rect(19, 2, 3, 7, '#e0dcd4'); // collar
    for (let k = 0; k < 4; k++) p.vline(22 + k, 3 + Math.floor(k / 2), 7 - Math.floor(k / 2), col); // tip
    if (sel) { p.px(24, 5, lighten(col, 0.5)); }
    p.outline();
    return p.canvas();
  });
}
function squeegee() {
  return cached('squeegee', () => {
    const p = new Pix(14, BH + 8);
    p.rect(0, 0, 5, BH + 8, '#3a3a52'); p.vline(1, 0, BH + 7, '#5a5a78');
    p.rect(5, BH / 2 - 8, 9, 16, '#ffd23f'); p.rect(5, BH / 2 - 8, 9, 2, '#fff2a0');
    p.outline();
    return p.canvas();
  });
}
function btnFrame(w, h, col = '#fff3dc', on = false) {
  return cached('bbtn' + w + h + col + on, () => {
    const p = new Pix(w, h);
    const rim = on ? '#ff9f3a' : darken(col, 0.5);
    p.rect(1, 0, w - 2, h - 1, rim); p.rect(0, 1, w, h - 3, rim);
    p.rect(1, 1, w - 2, h - 3, on ? '#fff6c8' : col); p.hline(2, w - 3, 1, lighten(col, 0.6));
    if (on) { p.rect(1, 1, w - 2, 1, '#ffd23f'); p.rect(1, h - 3, w - 2, 1, '#ffd23f'); }
    p.rect(1, h - 2, w - 2, 1, darken(col, 0.35));
    return p.canvas();
  });
}

export function createBoard(students, hooks) {
  let V = null;
  const cv = document.createElement('canvas'); cv.width = BW; cv.height = BH;
  const bctx = cv.getContext('2d');
  const img = bctx.createImageData(BW, BH);
  const px = new Uint32Array(img.data.buffer);
  const bg = hex(BG);
  px.fill(bg);
  let dirty = true;
  let changed = false;
  if (G.save.board) {
    const im = new Image();
    im.onload = () => {
      bctx.clearRect(0, 0, BW, BH); bctx.drawImage(im, 0, 0);
      const d = new Uint32Array(bctx.getImageData(0, 0, BW, BH).data.buffer);
      px.set(d); dirty = true;
    };
    im.src = G.save.board;
  }

  let L = {};
  let color = 1, tool = 'marker', stampId = null;
  let stroke = null;
  let wipe = null;
  let press = null;
  let starsStamped = 0;
  let inkSince = 0, lastReact = 0, idleSince = 0, drewThisVisit = false;
  const parts = [];

  function flush() { if (dirty) { bctx.putImageData(img, 0, 0); dirty = false; } }

  // ---------------------------------------------------------------- layout
  function resize() {
    V = makeView(175, 250, 180);
    const { W, H, inset } = V;
    const bx = Math.round((W - BW) / 2), by = 5;
    L = { bx, by };
    const wide = W - BW >= 2 * 76;
    L.wide = wide;
    const small = V.s / G.dpr < 3.4; // phone: everything has to be bigger to be tappable
    const leftX0 = inset.l + 2, leftX1 = bx - 4;
    const rightX0 = bx + BW + 4, rightX1 = W - inset.r - 2;
    const B = 26;
    // back: always top-left (like the letters and shapes corners); markers in the left column
    L.back = { x: leftX0, y: by, w: B, h: B };
    L.mk = wide && small && leftX1 - leftX0 >= 90 ? 2 : 1; // marker sprite scale
    if (wide) {
      const mh = L.mk === 2 ? 24 : 18;
      L.markers = MARKERS.map((m, k) => ({ k, x: leftX0 + B + 4, y: by + k * mh, w: leftX1 - leftX0 - B - 4, h: mh - 1 }));
      L.markerX = leftX1 - 26 * L.mk;
      // eraser + wipe under the back button; the whole right column is stamps
      L.eraser = { x: leftX0, y: by + B + 6, w: B, h: B };
      L.wipeBtn = { x: leftX0, y: by + 2 * (B + 6), w: B, h: B };
      const tw = rightX1 - rightX0;
      const cols = small ? 3 : 4, cell = small ? Math.min(32, Math.floor(tw / cols)) : Math.min(20, Math.floor(tw / cols));
      L.stampK = small && cell >= 30 ? 2 : 1;
      L.stampTile = small;
      L.stamps = S.STAMPS.map((id, k) => ({ id, x: rightX0 + (k % cols) * cell + Math.floor((tw - cols * cell) / 2), y: by + Math.floor(k / cols) * cell, w: cell - 1, h: cell - 1 }));
    } else {
      L.markers = MARKERS.map((m, k) => ({ k, x: leftX0, y: by + B + 4 + k * 18, w: leftX1 - leftX0, h: 17 }));
      L.markerX = leftX1 - 26;
      const cx = rightX0 + Math.floor((rightX1 - rightX0 - B) / 2);
      L.eraser = { x: cx, y: by, w: B, h: B };
      L.wipeBtn = { x: cx, y: by + 30, w: B, h: B };
      const cell = 16;
      L.stampK = 1; L.stampTile = false;
      L.stamps = S.STAMPS.map((id, k) => ({ id, x: bx + k * cell, y: by + BH + 5, w: cell, h: 18 }));
    }
    // students along the bottom
    L.ledge = H - 7 - Math.min(inset.b, 4);
    const n = students.length;
    const sp = Math.min(48, Math.floor((W - inset.l - inset.r - 20) / n));
    L.seats = students.map((s, k) => ({ x: Math.round(W / 2 + (k - (n - 1) / 2) * sp) }));
    return V;
  }

  // ---------------------------------------------------------------- painting
  function dab(x, y, mask, v) {
    x = Math.round(x); y = Math.round(y);
    for (const [dx, dy] of mask) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= BW || Y >= BH) continue;
      px[Y * BW + X] = v;
    }
    dirty = true; changed = true;
  }
  function segment(x0, y0, x1, y1) {
    const v = tool === 'erase' ? bg : hex(MARKERS[color].c);
    const mask = tool === 'erase' ? ERASER_MASK : MARKER_MASK;
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(d / 0.7));
    for (let i = 0; i <= n; i++) dab(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, mask, v);
    return d;
  }
  function placeStamp(id, x, y) {
    const c = S.stamp(id, MARKERS[color].c);
    const d = new Uint32Array(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.buffer);
    const ox = Math.round(x - c.width / 2), oy = Math.round(y - c.height / 2);
    for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
      const v = d[j * c.width + i];
      if (!v) continue;
      const X = ox + i, Y = oy + j;
      if (X < 0 || Y < 0 || X >= BW || Y >= BH) continue;
      px[Y * BW + X] = v;
    }
    dirty = true; changed = true;
    sfx.pop(1 + Math.random() * 0.3);
    burst('spark', L.bx + x, L.by + y, 6, ['#ffd23f', '#ff9ec4', '#7ec8ff']);
    const aw = awake();
    if (id === 'star') starsStamped++;
    if (aw.length && /^[1-5]$/.test(id)) { countAlong(+id, aw); return; }
    if (aw.length && /^[A-Z]$/.test(id)) { letterChorus(id, aw); return; }
    // students react: one says what it is, the rest gasp and clap
    if (aw.length) {
      const talker = pick(aw);
      wait(0.25).then(() => speak(talker, WORDS[id] || 'Ooh!', 'yay'));
      for (const s of aw) {
        act(s, 'gasp', 0.6);
        wait(0.6).then(() => { if (Math.random() < 0.6) act(s, 'clap', 1); else act(s, 'raise', 2); });
      }
      wait(0.7).then(() => sfx.clap(3, 0.5));
      if (id === 'star' && starsStamped === 3) wait(1.6).then(() => { const s = pick(awake()); if (s) { speak(s, STAR_COUNT_LINE, 'yay'); act(s, 'cheer', 1.4); hop(s, 70); } });
    }
  }
  // number stamp: the class counts up to it, one friend after another (in seat order)
  let counting = 0;
  function countAlong(n, aw) {
    const run = ++counting;
    const order = [...aw].sort((a, b) => a.idx - b.idx);
    (async () => {
      await wait(0.3);
      for (let k = 1; k <= n; k++) {
        if (run !== counting) return;
        const s = order[(k - 1) % order.length];
        if (s.mode === 'away') continue;
        speak(s, numberWord(k), 'here'); act(s, 'cheer', 0.5); hop(s, 60); sfx.pop(1 + k * 0.08);
        const r = studentRect(s.idx);
        burst('star', r.x + S.SW / 2, r.y + 8, 3 + k, ['#ffd23f', '#ff9ec4', '#7ec8ff'], { up: true, sp: 45 });
        await wait(0.55);
      }
      if (run !== counting) return;
      await wait(0.2);
      sfx.clap(5, 0.7);
      for (const s of awake()) act(s, 'clap', 1.1);
    })();
  }
  // letter stamp: everyone says the letter's name together (a little staggered so it sounds like a class)
  function letterChorus(ch, aw) {
    const name = letterName(ch);
    aw.forEach((s, i) => wait(0.25 + i * 0.08).then(() => { if (s.mode !== 'away') { speak(s, name, 'here'); act(s, 'raise', 0.9); hop(s, 40); } }));
    wait(1.1).then(() => sfx.clap(3, 0.5));
  }

  // ---------------------------------------------------------------- students
  const awake = () => students.filter(s => s.mode !== 'away' && !s.sleep && !(s.hide > 0));
  function shown() { return students.filter(s => s.mode !== 'away'); }
  function studentRect(k) { return { x: L.seats[k].x - S.SW / 2, y: L.ledge + 14 - S.SH }; }
  function burst(kind, x, y, n, colors, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.up ? rand(-2.6, -0.5) : rand(0, Math.PI * 2), sp = rand(20, o.sp ?? 60);
      parts.push({ kind, color: pick(colors), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g ?? 60, life: rand(0.6, 1.1), t: 0 });
    }
  }
  function tapStudent(s) {
    const r = studentRect(s.idx);
    const hx = r.x + S.SW / 2, hy = r.y + 10;
    if (coax(s)) return;
    if (!acting(s, 'raise') && tapEscalate(s, { burst: (k, n, cols, o) => burst(k, hx, hy - s.z, n, cols, o), neighbours: awake })) return;
    if (acting(s, 'raise')) {
      act(s, 'cheer', 1.2); hop(s, 80); sfx.cheer(1.2); speak(s, randomCheer(), 'yay');
      burst('star', hx, hy, 6, ['#ffd23f', '#ff9ec4', '#7ec8ff'], { up: true });
    } else if (s.kind === 'frog') {
      act(s, 'giggle', 1.2); sfx.giggle(1.3, 6); burst('note', hx, hy, 3, ['#7a5bc0', '#ff6f91'], { up: true });
    } else {
      act(s, 'happy', 0.9); hop(s, 70); animalSound(s); burst('heart', hx, hy, 2, ['#ff6f91'], { up: true, sp: 30 });
    }
  }
  function reactToInk(dist) {
    inkSince += dist;
    if (inkSince < 70 || G.time - lastReact < 1.2) return;
    inkSince = 0; lastReact = G.time;
    const aw = awake().filter(s => !s.act);
    if (!aw.length) return;
    const s = aw.find(x => x.kind === 'owl' && Math.random() < 0.5) || pick(aw);
    const r = Math.random();
    if (r < 0.5) { act(s, 'raise', rand(2.5, 4)); sfx.softPop(); }
    else if (r < 0.8) { act(s, 'clap', 1.2); sfx.clap(3, 0.4); }
    else { act(s, 'look', 1); sfx.ooh(1.3); }
  }

  // ---------------------------------------------------------------- update / render
  function update(dt) {
    for (const s of students) {
      physics(s, dt);
      if (s.mode !== 'away') {
        const sm = s.mode; if (sm === 'walk' || sm === 'stand') s.mode = 'seated';
        traits(s, dt, { sounds: !stroke });
        if (sm === 'walk') { s.mode = 'seated'; s.target = null; s.onArrive?.(); s.onArrive = null; }
      }
      if (s.sleep && Math.random() < dt * 0.9) {
        const r = studentRect(s.idx);
        parts.push({ kind: 'z', color: '#6f8fd6', x: r.x + 22, y: r.y + 8, vx: rand(4, 9), vy: -14, g: 0, life: 1.4, t: 0 });
      }
    }
    if (stroke) {
      const sx = L.bx + stroke.x;
      for (const s of students) {
        const dx = sx - L.seats[s.idx].x;
        s.look = Math.abs(dx) > 18 ? Math.sign(dx) : 0;
      }
    }
    if (wipe) {
      wipe.x += dt * 260;
      const x1 = Math.min(BW, Math.floor(wipe.x));
      for (let x = Math.max(0, wipe.last); x < x1; x++) for (let y = 0; y < BH; y++) px[y * BW + x] = bg;
      wipe.last = x1; dirty = true;
      if (Math.random() < 0.6) parts.push({ kind: 'bubble', color: '#fff', x: L.bx + wipe.x, y: L.by + rand(0, BH), vx: rand(-20, 10), vy: rand(-30, -5), g: 0, life: rand(0.4, 0.9), t: 0 });
      if (wipe.x > BW + 14) {
        wipe = null; changed = true;
        sfx.chime();
        burst('spark', L.bx + BW / 2, L.by + BH / 2, 14, ['#bfe6ff', '#ffffff', '#ffd23f'], { sp: 90 });
      }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt;
      if (p.t > p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const D = (c, im, x, y) => c.drawImage(im, Math.round(x), Math.round(y));

  function render() {
    const c = V.ctx, { W, H } = V;
    // wall behind the board
    const [wa, wb] = WALLS[G.save.paint.wall] || WALLS[0];
    R(c, 0, 0, W, H, wa);
    for (let x = 2; x < W; x += 9) R(c, x, 0, 3, H, wb);
    // board frame + surface
    const { bx, by } = L;
    R(c, bx - 4, by - 4, BW + 8, BH + 8, '#6f7b8f');
    R(c, bx - 3, by - 3, BW + 6, BH + 6, '#c9d3df'); R(c, bx - 3, by - 3, BW + 6, 1, '#eef3f8');
    R(c, bx - 1, by - 1, BW + 2, BH + 2, '#9aa7b8');
    flush();
    c.drawImage(cv, bx, by);
    // soft shine
    for (let k = 0; k < 18; k++) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(bx + BW - 40 + k, by + 2 + k * 2, 2, 2); }
    if (wipe) D(c, squeegee(), bx + wipe.x - 2, by - 4);
    // marker tray
    R(c, bx - 6, by + BH + 3, BW + 12, 2, '#7d899c');
    // markers (left)
    for (const m of L.markers) {
      const sel = tool === 'marker' && color === m.k;
      const out = sel ? 4 : 0;
      const ms = markerSprite(MARKERS[m.k].c, sel), k = L.mk;
      c.drawImage(ms, Math.round(L.markerX - 2 * k + out * k), Math.round(m.y + (m.h - ms.height * k) / 2), ms.width * k, ms.height * k);
      if (sel) R(c, L.markerX - 6 * k, m.y + Math.round((m.h - 3 * k) / 2), 3 * k, 3 * k, MARKERS[m.k].c);
    }
    // tools (right)
    const tb = (b, icon, on) => { D(c, btnFrame(b.w, b.h, '#fff3dc', on), b.x, b.y + (press && press.btn === b ? 1 : 0)); D(c, icon(), b.x + 4, b.y + 3 + (press && press.btn === b ? 1 : 0)); };
    tb(L.back, S.ICONS.back, false);
    tb(L.eraser, S.ICONS.eraser, tool === 'erase');
    tb(L.wipeBtn, S.ICONS.wipe, false);
    // stamps
    for (const st of L.stamps) {
      const on = tool === 'stamp' && stampId === st.id;
      if (L.stampTile) D(c, btnFrame(st.w, st.h, '#fffaf0', on), st.x, st.y);
      else if (on) { R(c, st.x, st.y, st.w, st.h, '#ffd23f'); R(c, st.x + 1, st.y + 1, st.w - 2, st.h - 2, '#fff6c8'); }
      const bob = on ? Math.round(Math.sin(G.time * 8)) * L.stampK : 0;
      if (/^[0-9A-Z]$/.test(st.id)) { // letters/numbers: the round school font, smooth (stamped into the drawing as pixels)
        const ch = Math.min(st.h - 4, L.stampK > 1 ? 21 : 13), g = textSprite(st.id, { h: ch, col: MARKERS[color].c, weight: 0.24 });
        D(c, g, st.x + (st.w - g.width) / 2, Math.round(st.y + (st.h + ch) / 2) - g.lt.base + bob);
        continue;
      }
      const im = S.stamp(st.id, MARKERS[color].c), k = L.stampK;
      c.drawImage(im, Math.round(st.x + (st.w - im.width * k) / 2), Math.round(st.y + (st.h - im.height * k) / 2 + bob), im.width * k, im.height * k);
    }
    // students watching from their desks
    for (const s of shown()) {
      const r = studentRect(s.idx);
      const { st, dx } = pose(s);
      D(c, S.student(s.kind, st), r.x + dx, r.y - s.z);
      if (crowned(s)) { const o = S.CROWN_AT[s.kind]; D(c, S.crown(), r.x + dx + o[0] - 1, r.y - s.z + (s.hide > 0 ? 19 : o[1]) - 1); }
      if (s.bubble) D(c, S.bubbleImg(s.bubble.kind), r.x + 20, r.y - 6 - s.z);
    }
    R(c, 0, L.ledge, W, H - L.ledge, '#dca46a'); R(c, 0, L.ledge, W, 1, '#f0c792'); R(c, 0, L.ledge + 3, W, 1, '#b77942');
    for (const p of parts) {
      if (p.life - p.t < 0.25 && Math.floor(p.t * 20) % 2) continue;
      const im = S.particle(p.kind, p.color);
      D(c, im, p.x - im.width / 2, p.y - im.height / 2);
    }
    if (!drewThisVisit && !stroke && G.time - idleSince > 8) {
      const owl = students.find(s => s.kind === 'owl');
      const k = ((G.time - idleSince) % 3) / 3;
      drawHand(c, L.bx + BW * (0.3 + 0.4 * k), L.by + BH * (0.5 + Math.sin(k * 6.28) * 0.2));
      sayHint(owl, 'draw');
    }
  }

  // ---------------------------------------------------------------- input
  const inR = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  function down(x, y) {
    press = { x, y };
    idleSince = G.time;
    const lx = x - L.bx, ly = y - L.by;
    if (lx >= -3 && ly >= -3 && lx < BW + 3 && ly < BH + 3 && !wipe) {
      if (tool === 'stamp') { press.stampAt = { lx, ly, x, y }; return; } // tap = stamp, drag = draw
      stroke = { x: lx, y: ly, t: G.time }; drewThisVisit = true;
      segment(lx, ly, lx, ly);
      strokeStart(tool === 'erase' ? 'erase' : 'marker');
      return;
    }
    for (const b of [L.back, L.eraser, L.wipeBtn]) if (inR(x, y, b)) { press.btn = b; return; }
    for (const m of L.markers) if (inR(x, y, m)) { press.marker = m; return; }
    for (const st of L.stamps) if (inR(x, y, st)) { press.stamp = st; return; }
    for (const s of shown()) {
      const r = studentRect(s.idx);
      if (x >= r.x + 4 && x <= r.x + S.SW - 4 && y >= r.y + 4 && y <= L.ledge + 4) { press.s = s; return; }
    }
  }
  function move(x, y) {
    if (press && press.stampAt && Math.hypot(x - press.stampAt.x, y - press.stampAt.y) > 4) {
      // she started dragging: draw with the marker instead (and leave stamp mode)
      const { lx, ly } = press.stampAt; press.stampAt = null;
      tool = 'marker';
      stroke = { x: lx, y: ly, t: G.time }; segment(lx, ly, lx, ly); strokeStart('marker');
    }
    if (!stroke) return;
    const lx = x - L.bx, ly = y - L.by;
    const d = segment(stroke.x, stroke.y, lx, ly);
    const dt = Math.max(0.008, G.time - stroke.t);
    strokeSpeed(d / dt / 60);
    stroke.x = lx; stroke.y = ly; stroke.t = G.time;
    if (tool !== 'erase') reactToInk(d);
  }
  function up() {
    if (stroke) {
      stroke = null; strokeEnd();
      for (const s of students) s.look = 0;
      press = null;
      return;
    }
    const p = press; press = null;
    if (!p) return;
    if (p.stampAt) { placeStamp(stampId, Math.max(0, Math.min(BW - 1, p.stampAt.lx)), Math.max(0, Math.min(BH - 1, p.stampAt.ly))); return; }
    const owlS = students.find(s => s.kind === 'owl');
    if (p.btn === L.back) { sfx.whoosh(); sayUI(owlS, 'back'); close(); return; }
    if (p.btn === L.eraser) { tool = 'erase'; sfx.pop(0.8); sayUI(owlS, 'eraser'); return; }
    if (p.btn === L.wipeBtn && !wipe) {
      wipe = { x: -8, last: 0 }; starsStamped = 0; sfx.whoosh(); sayUI(owlS, 'wipe');
      for (const s of awake()) { act(s, 'gasp', 0.9); }
      wait(0.7).then(() => { sfx.ooh(1.25); students.forEach(startle); });
      return;
    }
    if (p.marker) {
      color = p.marker.k; tool = 'marker'; // tapping a marker always goes back to drawing
      sfx.pop(1.2);
      const aw = awake(); if (aw.length) speak(pick(aw), MARKERS[color].name + '!', 'yay');
      return;
    }
    if (p.stamp) {
      if (tool === 'stamp' && stampId === p.stamp.id) { tool = 'marker'; sfx.softPop(); }
      else { tool = 'stamp'; stampId = p.stamp.id; sfx.pop(1.4); speak(owlS, WORDS[p.stamp.id], 'tap'); }
      return;
    }
    if (p.s) tapStudent(p.s);
  }
  function close() {
    strokeEnd();
    if (changed) {
      flush();
      try { G.save.board = cv.toDataURL('image/png'); persist(); } catch (e) { /* ignore */ }
    }
    const drew = changed; changed = false;
    hooks.close(drew);
  }

  window.__ltBoardBtn = (kind, i) => {
    const r = kind === 'marker' ? L.markers[i] : kind === 'stamp' ? L.stamps[i] : L[kind];
    const k = V.s / G.dpr; return [(r.x + r.w / 2) * k, (r.y + r.h / 2) * k];
  };
  return {
    resize, update, render, down, move, up,
    canvas() { flush(); return cv; },
    opened() { idleSince = G.time; drewThisVisit = false; },
    rect() { return { x: L.bx, y: L.by, w: BW, h: BH }; },
    get view() { return V; },
  };
}
