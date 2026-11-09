// Alphabet & numbers board: pick a letter/number, trace it block by block.
import { G, makeView, persist, rand, pick, wait } from './state.js';
import { Pix, cached, darken, lighten } from './raster.js';
import * as S from './sprites.js';
import * as DC from './decor.js';
import { sfx } from './audio.js';
import { speak } from './students.js';
import { makeRow } from './row.js';
import { picture } from './pictures.js';
import { LETTERS, NUMS, FONT, letterName, numberWord, letterWord, letterSentence, lang, setLang, flag, tr } from './i18n.js';

const RAINBOW = ['#ef6f6c', '#ffa65c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6', '#ff8fb8'];

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
function mini(ch, col) {
  return cached('mini' + ch + col, () => {
    const rows = FONT[ch];
    const p = new Pix(rows[0].length, rows.length);
    p.map(0, 0, rows, { '#': col });
    return p.canvas();
  });
}
function block(col, size) {
  return cached('blk' + col + size, () => {
    const p = new Pix(size, size);
    p.rect(1, 0, size - 2, size, col); p.rect(0, 1, size, size - 2, col);
    p.rect(1, 1, size - 2, Math.max(1, Math.floor(size / 4)), lighten(col, 0.45));
    p.rect(1, size - 2, size - 2, 1, darken(col, 0.25));
    return p.canvas();
  });
}
function hole(size) {
  return cached('lhole' + size, () => {
    const p = new Pix(size, size);
    p.rect(1, 0, size - 2, size, '#ebe2d4'); p.rect(0, 1, size, size - 2, '#ebe2d4');
    p.rect(1, 1, size - 2, 1, '#d9cdbb');
    const m = Math.floor(size / 2); p.rect(m - 1, m - 1, 2, 2, '#cdbfa9');
    return p.canvas();
  });
}

export function createLetters(students, hooks) {
  let V = null, L = {};
  let set = 'abc', cur = 'A', lit = new Map(), done = false, doneAt = 0, ci = 0;
  let tracing = false, last = null, press = null, counting = [];
  const row = makeRow(students);
  G.save.traced ||= {};
  const teach = { act: null, t0: 0, dur: 0 };
  const tAct = (name, dur = 1.2) => { teach.act = name; teach.t0 = G.time; teach.dur = dur; };
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const D = (c, im, x, y) => c.drawImage(im, Math.round(x), Math.round(y));
  const inR = (x, y, r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const owl = students.find(s => s.kind === 'owl');

  function resize() {
    V = makeView(175, 250, 180);
    const { W, H, inset } = V;
    L.ledge = H - 6 - Math.min(inset.b, 4);
    L.back = { x: inset.l + 3, y: 3, w: 26, h: 26 };
    L.flag = { x: inset.l + 3, y: 32, w: 26, h: 22 };
    const cols = set === 'abc' ? 4 : 3, cell = 14;
    L.cols = cols; L.cell = cell;
    L.pick = { x: W - inset.r - 3 - 4 * cell, y: 24 };
    L.tabs = [{ id: 'abc', x: L.pick.x, y: 3, w: 2 * cell - 1, h: 18 }, { id: '123', x: L.pick.x + 2 * cell, y: 3, w: 2 * cell - 1, h: 18 }];
    L.area = { x: inset.l + 34, y: 3, w: L.pick.x - 5 - (inset.l + 34), h: L.ledge - 34 - 3 };
    row.layout(W, L.ledge, inset.l + 38, W - inset.r - 4);
    layoutGlyph();
  }
  function items() { return set === 'abc' ? LETTERS : NUMS; }
  function gridRects() {
    const cols = set === 'abc' ? 4 : 3, cell = set === 'abc' ? 14 : 18;
    return items().map((ch, k) => ({ ch, x: L.pick.x + (k % cols) * cell, y: L.pick.y + Math.floor(k / cols) * cell, w: cell - 1, h: cell - 1 }));
  }
  function layoutGlyph() {
    const rows = FONT[cur], R0 = rows.length, C0 = rows[0].length;
    const a = L.area;
    const cell = Math.max(6, Math.min(Math.floor((a.h - 14) / R0), Math.floor((a.w * 0.6) / C0)));
    const gw = cell * C0, gh = cell * R0;
    L.g = { x: a.x + 8 + Math.floor((a.w * 0.62 - 8 - gw) / 2), y: a.y + Math.floor((a.h - gh) / 2), cell, rows, R0, C0 };
    L.cells = [];
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') L.cells.push({ k: j * 100 + i, i, j, cx: L.g.x + i * cell + cell / 2, cy: L.g.y + j * cell + cell / 2 }); });
    L.pic = { x: a.x + a.w * 0.64, y: a.y + 8, w: a.w * 0.36 - 6, h: a.h - 40 };
    L.next = { x: a.x + a.w - 30, y: a.y + a.h - 28, w: 26, h: 24 };
  }
  function select(ch, silent) {
    cur = ch; lit = new Map(); done = false; counting = []; ci = 0;
    layoutGlyph();
    if (!silent) {
      sfx.pop(1.2);
      const name = /\d/.test(ch) ? numberWord(+ch) : letterName(ch);
      speak(owl, name, 'here');
      tAct('point', 1.2);
    }
  }
  const NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];
  function trace(x, y) {
    const rad = L.g.cell * 0.8;
    for (const c of L.cells) {
      if (lit.has(c.k)) continue;
      if (Math.hypot(c.cx - x, c.cy - y) < rad) {
        lit.set(c.k, RAINBOW[ci++ % RAINBOW.length]);
        sfx.note(NOTES[Math.min(NOTES.length - 1, Math.floor(lit.size / L.cells.length * NOTES.length))]);
        row.burst('spark', c.cx, c.cy, 2, ['#ffd23f', '#ffffff', '#ff9ec4'], { sp: 30 });
      }
    }
    if (!done && lit.size === L.cells.length) complete();
  }
  function complete() {
    done = true; doneAt = G.time;
    G.save.traced[cur] = true; persist();
    sfx.fanfare(); row.cheer(); tAct('cheer', 1.6);
    const a = L.area;
    row.burst('confetti', a.x + a.w / 2, a.y + 10, 30, RAINBOW, { sp: 90, g: 80, life: 1.4 });
    const talker = row.talker() || owl;
    if (/\d/.test(cur)) {
      const n = +cur;
      wait(0.9).then(async () => {
        for (let k = 1; k <= n; k++) {
          counting.push(G.time);
          speak(talker, numberWord(k), 'here'); sfx.pop(1 + k * 0.08);
          await wait(0.75);
        }
        speak(talker, 'Great job!', 'yay');
      });
    } else {
      wait(0.9).then(() => speak(talker, letterSentence(cur), 'here'));
    }
  }

  function update(dt) { row.update(dt); }

  function render() {
    const c = V.ctx, { W, H } = V;
    const [wa, wb] = DC.WALLS[G.save.paint.wall] || DC.WALLS[0];
    R(c, 0, 0, W, H, wa); for (let x = 2; x < W; x += 9) R(c, x, 0, 3, H, wb);
    // the alphabet board
    const a = L.area;
    R(c, a.x - 3, a.y - 1, a.w + 6, a.h + 5, '#a8703f'); R(c, a.x - 3, a.y - 1, a.w + 6, 1, '#c98c55');
    R(c, a.x, a.y + 2, a.w, a.h - 2, '#fffaf0');
    // handwriting guide lines
    const g = L.g;
    for (const [yy, col] of [[g.y, '#c9d9f0'], [g.y + g.cell * g.R0, '#c9d9f0'], [g.y + Math.round(g.cell * g.R0 / 2), '#f3c6cf']]) {
      for (let x = a.x + 4; x < a.x + a.w * 0.62; x += 4) R(c, x, yy, 2, 1, col);
    }
    // glyph
    const first = L.cells[0];
    for (const cl of L.cells) {
      const x = g.x + cl.i * g.cell + 1, y = g.y + cl.j * g.cell + 1;
      const col = lit.get(cl.k);
      const bob = done ? Math.round(Math.sin(G.time * 6 + cl.i + cl.j) * 1) : 0;
      if (col) D(c, block(col, g.cell - 2), x, y + bob);
      else {
        D(c, hole(g.cell - 2), x, y);
        if (cl === first && lit.size === 0 && Math.floor(G.time * 3) % 2) { R(c, cl.cx - 2, cl.cy - 2, 4, 4, '#7dd370'); }
      }
    }
    // picture + counting stars
    const pic = /\d/.test(cur) ? null : picture(letterWord(cur)[1]);
    const P = L.pic;
    if (pic) {
      const k = Math.max(1, Math.min(2, Math.floor(Math.min(P.w / pic.width, P.h / pic.height))));
      const bob = done ? Math.round(Math.sin(G.time * 5) * 2) : 0;
      c.drawImage(pic, Math.round(P.x + (P.w - pic.width * k) / 2), Math.round(P.y + (P.h - pic.height * k) / 2) + bob, pic.width * k, pic.height * k);
    } else {
      const n = +cur, per = P.w >= 62 ? 3 : 2, star = S.ICONS.star();
      for (let k = 0; k < n; k++) {
        const shown = done ? counting.length > k : true;
        const x = P.x + 2 + (k % per) * 20, y = P.y + Math.floor(k / per) * 19;
        if (shown) D(c, star, x, y - (done && counting[k] && G.time - counting[k] < 0.3 ? 3 : 0));
        else R(c, x + 7, y + 7, 4, 4, '#e3d6c4');
      }
    }
    // next arrow
    D(c, btnFrame(L.next.w, L.next.h, done ? '#fff6c8' : '#fff3dc', done), L.next.x, L.next.y - (done && Math.floor(G.time * 4) % 2 ? 1 : 0));
    D(c, S.ICONS.play(), L.next.x + 4, L.next.y + 3);
    // Louise
    const tk = teach.act && G.time - teach.t0 < teach.dur ? teach.act : null;
    const alt = Math.floor(G.time * 6) % 2;
    const st = { eyes: 'happy', mouth: tk ? 'open' : 'grin', armL: tk === 'point' ? 'point' : tk === 'cheer' ? (alt ? 'up' : 'wave1') : 'down', armR: tk === 'cheer' ? 'up' : 'down', sway: Math.floor(G.time * 1.2) % 2 };
    const tim = DC.teacher(st);
    c.save(); c.translate(Math.round(V.inset.l + 3 + DC.TW), Math.round(L.ledge - DC.TH + 4)); c.scale(-1, 1); c.drawImage(tim, 0, 0); c.restore();
    // students
    row.render(c, W, H);
    // left buttons
    D(c, btnFrame(26, 26), L.back.x, L.back.y); D(c, S.ICONS.back(), L.back.x + 4, L.back.y + 3);
    D(c, btnFrame(L.flag.w, L.flag.h), L.flag.x, L.flag.y); D(c, flag(lang()), L.flag.x + 4, L.flag.y + 3);
    // picker
    for (const t of L.tabs) {
      const on = set === t.id;
      D(c, btnFrame(t.w, t.h, on ? '#ffe08a' : '#fffaf0', on), t.x, t.y);
      const chs = t.id === 'abc' ? ['A', 'B'] : ['1', '2'];
      D(c, mini(chs[0], '#ef6f6c'), t.x + 6, t.y + 5); D(c, mini(chs[1], '#64a8e8'), t.x + 14, t.y + 5);
    }
    for (const r of gridRects()) {
      const sel = r.ch === cur;
      R(c, r.x, r.y, r.w, r.h, sel ? '#ffd23f' : '#fffaf0');
      R(c, r.x, r.y + r.h - 1, r.w, 1, sel ? '#e0a820' : '#e3cfae');
      const im = mini(r.ch, sel ? '#7a3f2a' : '#5a4560');
      D(c, im, r.x + Math.floor((r.w - im.width) / 2), r.y + Math.floor((r.h - im.height) / 2));
      if (G.save.traced[r.ch]) R(c, r.x + r.w - 3, r.y + 1, 2, 2, '#7dd370');
    }
    row.renderParts(c);
  }

  function down(x, y) {
    press = { x, y };
    if (x >= L.g.x - 6 && x <= L.g.x + L.g.cell * L.g.C0 + 6 && y >= L.g.y - 6 && y <= L.g.y + L.g.cell * L.g.R0 + 6) {
      tracing = true; last = [x, y]; trace(x, y); row.look(x); return;
    }
  }
  function move(x, y) {
    if (!tracing) return;
    const [x0, y0] = last;
    const d = Math.hypot(x - x0, y - y0), n = Math.max(1, Math.ceil(d / 2));
    for (let i = 1; i <= n; i++) trace(x0 + (x - x0) * i / n, y0 + (y - y0) * i / n);
    last = [x, y]; row.look(x);
  }
  function up() {
    if (tracing) { tracing = false; for (const s of students) s.look = 0; press = null; return; }
    const p = press; press = null; if (!p) return;
    const { x, y } = p;
    if (inR(x, y, L.back)) { sfx.whoosh(); hooks.close(); return; }
    if (inR(x, y, L.flag)) { setLang(lang() === 'en' ? 'es' : 'en'); sfx.pop(); speak(owl, lang() === 'es' ? 'Spanish time!' : 'English time!', 'yay'); return; }
    for (const t of L.tabs) if (inR(x, y, t)) { if (set !== t.id) { set = t.id; resize(); select(items()[0]); } return; }
    for (const r of gridRects()) if (inR(x, y, r)) { select(r.ch); return; }
    if (inR(x, y, L.next)) { const it = items(); select(it[(it.indexOf(cur) + 1) % it.length]); return; }
    if (inR(x, y, L.pic)) { sfx.pop(1.3); speak(row.talker() || owl, /\d/.test(cur) ? numberWord(+cur) : letterSentence(cur), 'here'); return; }
    const s = row.hit(x, y); if (s) row.tap(s);
  }
  window.__ltLetters = () => {
    const k = V.s / G.dpr;
    return { cells: L.cells.map(c => [c.cx * k, c.cy * k]), grid: gridRects().map(r => [(r.x + r.w / 2) * k, (r.y + r.h / 2) * k]), tabs: L.tabs.map(t => [(t.x + t.w / 2) * k, (t.y + t.h / 2) * k]), back: [(L.back.x + 13) * k, (L.back.y + 13) * k], flag: [(L.flag.x + 13) * k, (L.flag.y + 11) * k] };
  };
  return {
    resize, update, render, down, move, up,
    open() { select(cur, true); setTimeout(() => select(cur), 300); },
    get view() { return V; },
  };
}
