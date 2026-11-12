// Alphabet & numbers board: pick a letter/number and trace it stroke by stroke.
import { G, makeView, persist, rand, pick, wait } from './state.js';
import { earnStar, drawChip } from './jar.js';
import * as UI from './ui.js';
import { Pix, cached, darken, lighten } from './raster.js';
import * as S from './sprites.js';
import * as DC from './decor.js';
import { sfx, strokeStart, strokeSpeed, strokeEnd } from './audio.js';
import { speak, act, hop } from './students.js';
import { makeRow } from './row.js';
import { picture } from './pictures.js';
import { strokesFor } from './strokes.js';
import { createSilabas } from './silabas.js';
import { sayHint, sayUI, drawHand } from './hints.js';
import { LETTERS, NUMS, letterName, numberWord, letterWord, letterSentence } from './i18n.js';
import { textSprite, blitText, paperLines, INK } from './schoolfont.js';
import { hiDraw } from './hires.js';

const inkCol = (s, i) => RAINBOW[(s * 2 + Math.floor(i / 9)) % RAINBOW.length];
const RAINBOW = ['#ef5b5b', '#ff9a2e', '#f5c000', '#3cb44b', '#2f7de1', '#9b59d0', '#ff5fa8'];
const NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];

function btnFrame(w, h, col = '#fff3dc', on = false) {
  return cached('lbtn' + w + h + col + on, () => {
    const p = new Pix(w, h);
    const rim = on ? '#ff9f3a' : darken(col, 0.5);
    p.rect(1, 0, w - 2, h - 1, rim); p.rect(0, 1, w, h - 3, rim);
    p.rect(1, 1, w - 2, h - 3, col); p.hline(2, w - 3, 1, lighten(col, 0.6));
    p.rect(1, h - 2, w - 2, 1, darken(col, 0.35));
    return p.canvas();
  });
}
/**
 * A letter tile's label in the school font, on school-paper lines (faint baseline, dashed pink midline), so
 * b d rise above the midline and p q g hang below the baseline. Drawn at device resolution.
 * caps: true when everything on the tile is a capital or a number (they sit centred; no room kept for tails).
 */
export function tileLabel(c, r, text, col = INK, { caps = false, lines = true, capH } = {}) {
  const ch = capH || Math.max(5, Math.round(caps ? r.h * 0.56 : (r.h - 3) / 1.5));
  const base = r.y + Math.round(caps ? (r.h + ch) / 2 : (r.h - ch * 1.45) / 2 + ch);
  if (lines) hiDraw(c, r.x, r.y, r.w, r.h, (o, k) => paperLines(o, r.x + 1, r.x + r.w - 1, base, ch / 2, k));
  const sp = textSprite(text, { h: ch, col });
  c.drawImage(sp, Math.round(r.x + (r.w - sp.width) / 2), base - sp.lt.base);
}
// smooth filled circle / chevron (into a device-resolution context)
function disc(o, x, y, r, col) { o.fillStyle = col; o.beginPath(); o.arc(x, y, Math.max(0.3, r), 0, Math.PI * 2); o.fill(); }
function arrow(o, x, y, dx, dy, col, sz = 3) { // chevron pointing along (dx,dy)
  const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
  const px = -dy, py = dx;
  o.strokeStyle = col; o.lineWidth = Math.max(2, sz * 0.62); o.lineCap = 'round'; o.lineJoin = 'round';
  o.beginPath();
  o.moveTo(x + px * sz, y + py * sz); o.lineTo(x + dx * sz, y + dy * sz); o.lineTo(x - px * sz, y - py * sz);
  o.stroke();
}

export function createLetters(students, hooks) {
  let V = null, L = {};
  let set = 'abc', cur = 'A';
  let strokes = [], si = 0, prog = 0, done = false, doneAt = 0, counting = [];
  let page = 0; // letter picker page (phones only: bigger cells don't all fit)
  let tracing = false, last = null, press = null, idleSince = 0, lastNoteStep = 0, flashT = 0;
  let ink = null, guide = null, tip = null;
  // v2.1: she lifted her finger partway and waits: the place to carry on pulses and a friend cheers her on
  let nudgedFor = -1, nudgeSaid = -99;
  // v2.1: tapping the ★ row on a number: a sparkle runs along the stars and a friend counts them
  let starTaps = [], starRun = 0;
  const row = makeRow(students);
  G.save.traced ||= {};
  const teach = { act: null, t0: 0, dur: 0 };
  const tAct = (name, dur = 1.2) => { teach.act = name; teach.t0 = G.time; teach.dur = dur; };
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const D = (c, im, x, y) => c.drawImage(im, Math.round(x), Math.round(y));
  const inR = (x, y, r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const owl = students.find(s => s.kind === 'owl');
  const isNum = () => /\d/.test(cur);
  const sil = createSilabas({ owl, row, tAct: (n, d) => tAct(n, d) });

  function resize() {
    V = makeView(175, 250, 180);
    const { W, H, inset } = V;
    L.ledge = H - 6 - Math.min(inset.b, 4);
    L.back = { x: inset.l + 3, y: 3, w: 26, h: 26 };
    // phones get bigger picker cells (3 per row, paged); the iPad keeps the 4-column grid
    L.small = V.s / G.dpr < 3.4;
    if (L.small) {
      L.cell = 22; L.cols = 3;
      L.pick = { x: W - inset.r - 3 - L.cols * L.cell, y: 26 };
      L.tabs = ['abc', '123', 'ma'].map((id, k) => ({ id, x: L.pick.x + k * 22, y: 3, w: 21, h: 20 }));
    } else {
      L.cell = 14; L.cols = 4;
      L.pick = { x: W - inset.r - 3 - 4 * 14, y: 24 };
      L.tabs = ['abc', '123', 'ma'].map((id, k) => ({ id, x: L.pick.x + k * 19, y: 3, w: 18, h: 18 }));
    }
    L.area = { x: inset.l + 34, y: 3, w: L.pick.x - 5 - (inset.l + 34), h: L.ledge - 34 - 3 };
    row.layout(W, L.ledge, inset.l + 38, W - inset.r - 4);
    layoutGlyph();
    sil.layout(L.area, L.small);
  }
  function items() { return set === 'abc' ? LETTERS : NUMS; }
  function gridRects() {
    if (set === 'ma') {
      const c = L.cols, cl = L.cell, rowsF = Math.ceil((sil.gridItems().length - 1) / c);
      return sil.gridItems().map((it, k) => ({ it, ch: it.ch, x: L.pick.x + (it.id === 'words' ? 0 : (k % c) * cl), y: L.pick.y + (it.id === 'words' ? rowsF * cl + 2 : Math.floor(k / c) * cl), w: it.id === 'words' ? c * cl - 1 : cl - 1, h: it.id === 'words' ? (L.small ? 20 : 16) : cl - 1 }));
    }
    const cols = L.small ? L.cols : set === 'abc' ? 4 : 3, cell = L.small ? L.cell : set === 'abc' ? 14 : 18;
    const all = items(), pp = perPage(cols, cell);
    if (all.length <= pp) return all.map((ch, k) => ({ ch, x: L.pick.x + (k % cols) * cell, y: L.pick.y + Math.floor(k / cols) * cell, w: cell - 1, h: cell - 1 }));
    // paged: the last cell is a ▶ that shows the next page
    const n = pp - 1, pages = Math.ceil(all.length / n);
    page = Math.min(page, pages - 1);
    const out = all.slice(page * n, page * n + n).map((ch, k) => ({ ch, x: L.pick.x + (k % cols) * cell, y: L.pick.y + Math.floor(k / cols) * cell, w: cell - 1, h: cell - 1 }));
    out.push({ more: true, pages, x: L.pick.x + (n % cols) * cell, y: L.pick.y + Math.floor(n / cols) * cell, w: cell - 1, h: cell - 1 });
    return out;
  }
  function perPage(cols, cell) {
    if (!L.small) return Infinity;
    const rows = Math.max(2, Math.floor((L.ledge - 37 - L.pick.y) / cell));
    return rows * cols;
  }
  function pageOf(ch) {
    if (!L.small) return 0;
    const all = items(), pp = perPage(L.cols, L.cell);
    return all.length <= pp ? 0 : Math.floor(all.indexOf(ch) / (pp - 1));
  }
  function layoutGlyph() {
    const a = L.area;
    const k = Math.min((a.h - 22) / 140, (a.w * 0.6 - 20) / 100);
    const r = Math.max(3, Math.round(8.5 * k));
    const gw = 100 * k, gh = 140 * k;
    const gx = a.x + 12 + r + Math.max(0, Math.floor((a.w * 0.62 - 24 - 2 * r - gw) / 2)), gy = a.y + Math.floor((a.h - gh) / 2);
    L.g = { x: gx, y: gy, w: gw, h: gh, k, r, tol: r * 2.4 + 4 };
    strokes = (strokesFor(cur) || []).map(st => st.map(([x, y]) => [gx + x * k, gy + y * k]));
    L.pic = { x: a.x + a.w * 0.64, y: a.y + 8, w: a.w * 0.36 - 6, h: a.h - 40 };
    L.next = { x: a.x + a.w - 30, y: a.y + a.h - 28, w: 26, h: 24 };
    L.again = { x: a.x + a.w - 60, y: a.y + a.h - 28, w: 26, h: 24 };
    // guide + ink layers, painted smooth at device resolution (V.s device px per logical px) over the glyph's box
    const pts = strokes.flat(), m = r + 3;
    const gb = L.gb = { x: Math.floor(Math.min(gx, ...pts.map(p => p[0])) - m), y: Math.floor(Math.min(gy, ...pts.map(p => p[1])) - m) };
    gb.w = Math.ceil(Math.max(gx + gw, ...pts.map(p => p[0])) + m) - gb.x; gb.h = Math.ceil(Math.max(gy + gh, ...pts.map(p => p[1])) + m) - gb.y;
    const layer = () => {
      const cv = document.createElement('canvas'); cv.width = gb.w * V.s; cv.height = gb.h * V.s;
      const x = cv.getContext('2d'); x.setTransform(V.s, 0, 0, V.s, -gb.x * V.s, -gb.y * V.s); x.lineCap = 'round'; x.lineJoin = 'round';
      return [cv, x];
    };
    let g;
    [guide, g] = layer();
    const path = (st) => { g.beginPath(); st.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    g.strokeStyle = '#d9cbb5'; g.lineWidth = 2 * r + 2; strokes.forEach(path);
    g.strokeStyle = '#f1e8da'; g.lineWidth = 2 * r; strokes.forEach(path);
    for (const st of strokes) st.forEach(([x, y], i) => { if (i % 4 === 0) disc(g, x, y, Math.max(0.5, r * 0.11), '#bfae96'); }); // the dotted middle to follow
    [ink] = layer();
    // re-ink progress (after a resize)
    for (let s = 0; s < strokes.length; s++) {
      const upto = s < si ? strokes[s].length - 1 : s === si ? prog : -1;
      if (upto >= 0) inkSeg(s, 0, upto);
    }
  }
  /** the rainbow crayon from point i0 to i1 of stroke s */
  function inkSeg(s, i0, i1) {
    const ic = ink.getContext('2d'), st = strokes[s], w = 2 * (L.g.r - 1);
    ic.lineCap = 'round'; ic.lineJoin = 'round'; ic.lineWidth = w;
    if (i0 === 0) disc(ic, st[0][0], st[0][1], w / 2, inkCol(s, 0));
    for (let i = i0 + 1; i <= i1; i++) {
      ic.strokeStyle = inkCol(s, i);
      ic.beginPath(); ic.moveTo(st[i - 1][0], st[i - 1][1]); ic.lineTo(st[i][0], st[i][1]); ic.stroke();
    }
  }
  function select(ch, silent) {
    cur = ch; si = 0; prog = 0; done = false; counting = []; idleSince = G.time; starTaps = []; starRun++;
    if (set !== 'ma' && items().includes(ch)) page = Math.max(0, pageOf(ch));
    layoutGlyph();
    if (!silent) {
      sfx.pop(1.2);
      speak(owl, isNum() ? numberWord(+ch) : letterName(ch), 'here');
      tAct('point', 1.2);
    }
  }
  function inkTo(newProg) {
    const st = strokes[si], col = inkCol(si, newProg);
    inkSeg(si, prog, newProg);
    prog = newProg;
    tip = st[prog];
    const step = Math.floor(prog / (st.length - 1) * 4);
    if (step > lastNoteStep) { lastNoteStep = step; sfx.note(NOTES[Math.min(NOTES.length - 1, si * 2 + step)]); }
    if (Math.random() < 0.5) row.burst('spark', tip[0], tip[1], 1, ['#ffd23f', '#ffb020', col], { sp: 25, life: 0.6 });
    if (prog >= st.length - 2) finishStroke();
  }
  function finishStroke() {
    const st = strokes[si];
    inkTo0(st.length - 1);
    sfx.pop(1.3 + si * 0.1);
    row.burst('star', st[st.length - 1][0], st[st.length - 1][1], 4, [RAINBOW[si % RAINBOW.length], '#ffd23f'], { up: true, sp: 40 });
    si++; prog = 0; lastNoteStep = 0; idleSince = G.time;
    tracing = false; strokeEnd();
    if (si >= strokes.length) complete();
  }
  function inkTo0(i) { if (i > prog) inkSeg(si, prog, i); }
  function advance(fx, fy) {
    if (done || si >= strokes.length) return;
    const st = strokes[si], LOOK = 9;
    let best = -1;
    for (let j = prog + 1; j <= Math.min(st.length - 1, prog + LOOK); j++) if (Math.hypot(st[j][0] - fx, st[j][1] - fy) < L.g.tol) best = j;
    if (best > prog) inkTo(best);
  }
  function complete() {
    done = true; doneAt = G.time;
    G.save.traced[cur] = true; persist(); earnStar();
    sfx.fanfare(); row.cheer(); tAct('cheer', 1.6);
    const a = L.area;
    row.burst('confetti', a.x + a.w / 2, a.y + 10, 34, RAINBOW, { sp: 90, g: 80, life: 1.4 });
    const talker = row.talker() || owl;
    if (isNum()) {
      const n = +cur;
      wait(0.9).then(async () => {
        for (let k = 1; k <= n; k++) { counting.push(G.time); speak(talker, numberWord(k), 'here'); sfx.pop(1 + k * 0.08); await wait(0.8); }
        speak(talker, 'Great job!', 'yay');
      });
    } else wait(0.9).then(() => speak(talker, letterSentence(cur), 'here'));
  }

  function update(dt) { row.update(dt); }

  function render() {
    const c = V.ctx, { W, H } = V;
    const [wa, wb] = DC.WALLS[G.save.paint.wall] || DC.WALLS[0];
    R(c, 0, 0, W, H, wa); for (let x = 2; x < W; x += 9) R(c, x, 0, 3, H, wb);
    const a = L.area, g = L.g;
    R(c, a.x - 3, a.y - 1, a.w + 6, a.h + 5, '#a8703f'); R(c, a.x - 3, a.y - 1, a.w + 6, 1, '#c98c55');
    R(c, a.x, a.y + 2, a.w, a.h - 2, '#fffaf0');
    if (set === 'ma') { sil.layout(a); sil.render(c); renderChrome(c); return; }
    // handwriting lines (top, dashed midline, baseline), the guide letter, her rainbow crayon and the
    // stroke helpers: all smooth, at device resolution
    const lx0 = a.x + 4, lx1 = a.x + a.w * 0.63, gb = L.gb;
    const st = !done && si < strokes.length ? strokes[si] : null;
    const pulse = Math.floor(G.time * 3) % 2 || flashT > G.time, idle = G.time - idleSince;
    const ring = st ? nudge(st) : null;
    if (done) { // shimmer along the letter
      for (let k = 0; k < 3; k++) { const st = pick(strokes); const p = pick(st); if (Math.random() < 0.5) row.burst('spark', p[0], p[1], 1, ['#ffd23f', '#ffb020'], { sp: 10, life: 0.5 }); }
    }
    const top = Math.min(gb.y, g.y - 2), bot = Math.max(gb.y + gb.h, g.y + g.h + 2);
    hiDraw(c, Math.min(lx0, gb.x) - 12, top - 12, Math.max(lx1, gb.x + gb.w) - Math.min(lx0, gb.x) + 24, bot - top + 24, (o, k) => {
      const lw = Math.max(1, Math.round(k * 0.6)) / k;
      o.lineWidth = lw; o.strokeStyle = '#9fc4ea';
      o.beginPath(); o.moveTo(lx0, g.y); o.lineTo(lx1, g.y); o.moveTo(lx0, g.y + g.h); o.lineTo(lx1, g.y + g.h); o.stroke();
      o.strokeStyle = '#f3a8b4'; o.setLineDash([3, 2]);
      o.beginPath(); o.moveTo(lx0, g.y + g.h / 2); o.lineTo(lx1, g.y + g.h / 2); o.stroke(); o.setLineDash([]);
      o.drawImage(guide, gb.x, gb.y, gb.w, gb.h);
      o.drawImage(ink, gb.x, gb.y, gb.w, gb.h);
      if (!st) return;
      // direction chevrons on what's left of this stroke
      const az = Math.max(3, g.r * 0.5);
      for (let i = prog + 6; i < st.length - 3; i += 10) arrow(o, st[i][0], st[i][1], st[i + 2][0] - st[i - 2][0], st[i + 2][1] - st[i - 2][1], '#2f9e44', az);
      // start dot with the stroke number
      if (prog === 0) {
        disc(o, st[0][0], st[0][1], g.r + (pulse ? 2 : 1), '#2f9e44');
        disc(o, st[0][0], st[0][1], g.r - (pulse ? 0 : 1), '#7dd370');
        const nh = Math.max(5, Math.round(g.r * 1.2)), num = textSprite(String(si + 1), { h: nh, col: '#ffffff', outline: '#2f9e44' });
        blitText(o, num, Math.round(st[0][0] - num.width / 2), Math.round(st[0][1] + nh / 2 - num.lt.base), k);
      } else if (tip && !tracing) { disc(o, tip[0], tip[1], g.r, '#ffffff'); disc(o, tip[0], tip[1], g.r - 2, inkCol(si, prog)); }
      if (ring) ring(o);
      // demo: a star shows how to draw this stroke
      if (!tracing && idle > 1.2) {
        const t = ((idle - 1.2) % 2.6) / 1.8;
        if (t <= 1) {
          const i = Math.min(st.length - 1, prog + Math.floor((st.length - 1 - prog) * t));
          for (let q = Math.max(prog, i - 12); q < i; q += 3) disc(o, st[q][0], st[q][1], 0.9, '#ffd23f');
          const im = S.particle('star', '#ffd23f');
          o.imageSmoothingEnabled = false;
          o.drawImage(im, Math.round(st[i][0] - 3), Math.round(st[i][1] - 3 + (Math.floor(G.time * 10) % 2)));
        }
      }
    });
    // picture + counting stars
    const P = L.pic;
    if (!isNum()) {
      const pic = picture(letterWord(cur)[1]);
      if (pic) {
        const k = Math.max(1, Math.min(2, Math.floor(Math.min(P.w / pic.width, P.h / pic.height))));
        const bob = done ? Math.round(Math.sin(G.time * 5) * 2) : 0;
        c.drawImage(pic, Math.round(P.x + (P.w - pic.width * k) / 2), Math.round(P.y + (P.h - pic.height * k) / 2) + bob, pic.width * k, pic.height * k);
      }
    } else {
      const n = +cur, per = P.w >= 62 ? 3 : 2, star = S.ICONS.star();
      for (let k = 0; k < n; k++) {
        const shown = done ? counting.length > k : true;
        const x = P.x + 2 + (k % per) * 20, y = P.y + Math.floor(k / per) * 19;
        const tb = starTaps[k] && G.time - starTaps[k] < 0.35;
        if (shown) D(c, star, x, y - (done && counting[k] && G.time - counting[k] < 0.3 ? 3 : 0) - (tb ? 3 : 0));
        else R(c, x + 7, y + 7, 4, 4, '#e3d6c4');
      }
    }
    // again + next buttons
    // v2.5: the same chunky buttons as everywhere else (blue = tool, green = go)
    const dn = (r) => !!press && press.x >= r.x && press.x <= r.x + r.w && press.y >= r.y && press.y <= r.y + r.h;
    if (done || si > 0) UI.drawBtn(c, L.again.x, L.again.y, L.again.w, L.again.h, UI.FACE.blue, dn(L.again), againIcon());
    UI.drawBtn(c, L.next.x, L.next.y - (done && Math.floor(G.time * 4) % 2 ? 1 : 0), L.next.w, L.next.h, UI.FACE.green, dn(L.next), S.ICONS.play());
    renderChrome(c);
  }
  function renderChrome(c) {
    const { W, H } = V;
    // Louise
    const tk = teach.act && G.time - teach.t0 < teach.dur ? teach.act : null;
    const alt = Math.floor(G.time * 6) % 2;
    const st = { eyes: 'happy', mouth: tk ? 'open' : 'grin', armL: tk === 'point' ? 'point' : tk === 'cheer' ? (alt ? 'up' : 'wave1') : 'down', armR: tk === 'cheer' ? 'up' : 'down', sway: Math.floor(G.time * 1.2) % 2 };
    const tim = DC.teacher(st);
    c.save(); c.translate(Math.round(V.inset.l + 3 + DC.TW), Math.round(L.ledge - DC.TH + 4)); c.scale(-1, 1); c.drawImage(tim, 0, 0); c.restore();
    row.render(c, W, H);
    UI.drawBtn(c, L.back.x, L.back.y, 26, 26, UI.FACE.blue, !!press && press.x >= L.back.x && press.x <= L.back.x + 26 && press.y >= L.back.y && press.y <= L.back.y + 26, S.ICONS.back());
    drawChip(c, L.back.x + 5, L.back.y + 31, W, H); // the class star jar
    for (const t of L.tabs) {
      const on = set === t.id;
      D(c, btnFrame(t.w, t.h, on ? '#ffe08a' : '#fffaf0', on), t.x, t.y);
      const chs = t.id === 'abc' ? ['A', 'B'] : t.id === '123' ? ['1', '2'] : ['m', 'a'];
      const low = t.id === 'ma';
      let th = Math.round(t.h * (low ? 0.8 : 0.5)), a0, a1;
      for (; ; th--) { // as big as fits the tab
        a0 = textSprite(chs[0], { h: th, col: '#ef6f6c' }); a1 = textSprite(chs[1], { h: th, col: '#4f95dc' });
        if (a0.width + a1.width - 1 <= t.w - 4 || th <= 5) break;
      }
      const base = t.y + Math.round((t.h - 2 + (low ? th / 2 : th)) / 2), x0 = Math.round(t.x + (t.w - a0.width - a1.width + 1) / 2);
      D(c, a0, x0, base - a0.lt.base); D(c, a1, x0 + a0.width - 1, base - a1.lt.base);
    }
    for (const r of gridRects()) {
      if (set === 'ma') {
        const sel = sil.isSel(r.it);
        R(c, r.x, r.y, r.w, r.h, sel ? '#ffd23f' : '#fffaf0'); R(c, r.x, r.y + r.h - 1, r.w, 1, sel ? '#e0a820' : '#e3cfae');
        const tr = { x: r.x, y: r.y, w: r.w, h: r.h - 1 };
        if (r.it.id === 'words') tileLabel(c, tr, 'pato', sel ? '#7a3f2a' : '#2f6fb8');
        else tileLabel(c, tr, r.ch, sel ? '#7a3f2a' : INK);
        continue;
      }
      if (r.more) { // next page of letters
        const bob = Math.floor(G.time * 3) % 2;
        D(c, btnFrame(r.w, r.h, '#fff6c8'), r.x, r.y);
        const ic = S.ICONS.play(); D(c, ic, r.x + Math.floor((r.w - ic.width) / 2), r.y + Math.floor((r.h - ic.height) / 2) - bob);
        continue;
      }
      const sel = r.ch === cur;
      R(c, r.x, r.y, r.w, r.h, sel ? '#ffd23f' : '#fffaf0');
      R(c, r.x, r.y + r.h - 1, r.w, 1, sel ? '#e0a820' : '#e3cfae');
      tileLabel(c, { x: r.x, y: r.y, w: r.w, h: r.h - 1 }, r.ch, sel ? '#7a3f2a' : INK, { caps: true });
      const gk = L.small ? 2 : 1;
      if (G.save.traced[r.ch]) R(c, r.x + r.w - 2 - gk * 2, r.y + 1, gk * 2, gk * 2, '#3cb44b');
    }
    row.renderParts(c);
    // hint: show where to start
    if (set !== 'ma' && !done && !tracing && si < strokes.length && G.time - idleSince > 7) {
      const p = strokes[si][prog];
      drawHand(c, p[0], p[1]);
      sayHint(owl, 'trace');
    }
  }
  function nudge(st) { // after a lift partway (not before she starts a letter), ~4 s of nothing: returns the ring drawer
    if (tracing || (si === 0 && prog === 0) || G.time - idleSince < 4) return null;
    const p = prog > 0 ? st[prog] : st[0], g = L.g, t0 = G.time - idleSince;
    if (nudgedFor !== idleSince && G.time - nudgeSaid > 15) {
      nudgedFor = idleSince; nudgeSaid = G.time;
      const s = row.talker();
      if (s) { act(s, 'cheer', 1); hop(s, 60); speak(s, 'Great job!', 'yay'); } // "¡Muy bien!": keep going
      row.burst('spark', p[0], p[1], 4, ['#ffd23f', '#ffffff'], { sp: 20, life: 0.6 });
    }
    return (o) => {
      o.strokeStyle = '#ffb020'; o.lineWidth = 1.2;
      const a0 = o.globalAlpha;
      for (let k = 0; k < 2; k++) {
        const t = (t0 * 1.4 + k * 0.5) % 1, rr = g.r + 2 + t * 7;
        o.globalAlpha = a0 * (1 - t);
        o.beginPath(); o.arc(p[0], p[1], rr, 0, Math.PI * 2); o.stroke();
      }
      o.globalAlpha = a0;
    };
  }
  async function countStars() {
    const n = +cur, ch = cur, run = ++starRun, talker = row.talker() || owl;
    const P = L.pic, per = P.w >= 62 ? 3 : 2;
    sfx.sparkle();
    if (!n) { speak(talker, numberWord(0), 'here'); return; }
    if (talker !== owl) act(talker, 'raise', n * 0.8 + 0.4);
    for (let k = 0; k < n; k++) {
      if (run !== starRun || cur !== ch || set !== '123') return;
      starTaps[k] = G.time;
      const x = P.x + 2 + (k % per) * 20 + 9, y = P.y + Math.floor(k / per) * 19 + 6;
      row.burst('spark', x, y, 4, ['#ffd23f', '#ffffff', '#ffb020'], { sp: 30, life: 0.6 });
      speak(talker, numberWord(k + 1), 'here'); sfx.pop(1 + k * 0.08);
      await wait(0.8);
    }
  }
  function againIcon() {
    return cached('again', () => {
      const p = new Pix(18, 18);
      p.ball(9, 9, 8, 8, '#ffa65c');
      for (let a = -2.4; a < 2.2; a += 0.08) { p.px(9 + Math.cos(a) * 4.5, 9 + Math.sin(a) * 4.5, '#ffffff'); p.px(9 + Math.cos(a) * 5.2, 9 + Math.sin(a) * 5.2, '#ffffff'); }
      p.px(12, 3, '#ffffff'); p.px(13, 4, '#ffffff'); p.px(11, 4, '#ffffff'); p.px(13, 5, '#ffffff'); p.px(14, 5, '#ffffff');
      p.outline(); return p.canvas();
    });
  }

  function down(x, y) {
    press = { x, y };
    idleSince = G.time;
    if (set === 'ma') return;
    if (done || si >= strokes.length) return;
    const g = L.g;
    if (x < g.x - g.r * 3 || x > g.x + g.w + g.r * 3 || y < g.y - g.r * 3 || y > g.y + g.h + g.r * 3) return;
    const st = strokes[si];
    let near = false;
    for (let j = prog; j <= Math.min(st.length - 1, prog + 6); j++) if (Math.hypot(st[j][0] - x, st[j][1] - y) < L.g.tol * 1.3) near = true;
    press.onGlyph = true;
    if (!near) { flashT = G.time + 0.8; idleSince = G.time - 1.2; sfx.tap(); return; } // show where to start
    tracing = true; last = [x, y]; idleSince = G.time;
    strokeStart('marker'); row.look(x);
    advance(x, y);
  }
  function move(x, y) {
    if (!tracing) return;
    const [x0, y0] = last;
    const d = Math.hypot(x - x0, y - y0), n = Math.max(1, Math.ceil(d / 2));
    for (let i = 1; i <= n && tracing; i++) advance(x0 + (x - x0) * i / n, y0 + (y - y0) * i / n);
    strokeSpeed(d);
    last = [x, y]; row.look(x); idleSince = G.time;
  }
  function up() {
    if (tracing) { tracing = false; strokeEnd(); for (const s of students) s.look = 0; idleSince = G.time; press = null; return; }
    const p = press; press = null; if (!p) return;
    const { x, y } = p;
    if (inR(x, y, L.back)) { sfx.whoosh(); sayUI(owl, 'back'); hooks.close(); return; }
    for (const t of L.tabs) if (inR(x, y, t)) {
      sayUI(owl, { abc: 'letras', 123: 'numeros', ma: 'silabas' }[t.id]);
      if (set !== t.id) { set = t.id; resize(); if (set === 'ma') sil.select(sil.gridItems()[0]); else select(items()[0]); }
      return;
    }
    for (const r of gridRects()) if (inR(x, y, r)) {
      if (r.more) { page = (page + 1) % r.pages; sfx.pop(1.3); sayUI(owl, 'next'); return; }
      if (set === 'ma') sil.select(r.it); else select(r.ch); return; }
    if (set === 'ma') { if (sil.tap(x, y)) return; const s = row.hit(x, y); if (s) row.tap(s); return; }
    if (inR(x, y, L.next)) { sayUI(owl, 'next'); const it = items(); select(it[(it.indexOf(cur) + 1) % it.length]); return; }
    if ((done || si > 0) && inR(x, y, L.again)) { select(cur, true); sfx.whoosh(); sayUI(owl, 'again'); return; }
    if (inR(x, y, L.pic)) {
      if (isNum() && !(done && counting.length < +cur)) { countStars(); return; } // (not over the counting after she finishes)
      sfx.pop(1.3); speak(row.talker() || owl, isNum() ? numberWord(+cur) : letterSentence(cur), 'here'); return;
    }
    if (p.onGlyph) return;
    const s = row.hit(x, y); if (s) row.tap(s);
  }
  window.__ltLetterCss = (x, y) => { const k = V.s / G.dpr; return [x * k, y * k]; };
  window.__ltLetters = () => {
    const k = V.s / G.dpr;
    return { si, prog, starTaps: starTaps.filter(Boolean).length, pic: [(L.pic.x + 11) * k, (L.pic.y + 8) * k], strokes: strokes.map(st => st.map(([x, y]) => [x * k, y * k])), grid: gridRects().map(r => [(r.x + r.w / 2) * k, (r.y + r.h / 2) * k]), tabs: L.tabs.map(t => [(t.x + t.w / 2) * k, (t.y + t.h / 2) * k]), back: [(L.back.x + 13) * k, (L.back.y + 13) * k] };
  };
  return {
    resize, update, render, down, move, up,
    open(tab) { // v2.0: the Horario's choice cards open a tab directly (abc / 123 / ma)
      if (tab && tab !== set) { set = tab; resize(); if (set === 'ma') { sil.select(sil.gridItems()[0]); return; } cur = items()[0]; }
      else if (tab === 'ma') return;
      select(cur, true); setTimeout(() => select(cur), 300);
    },
    get view() { return V; },
  };
}
