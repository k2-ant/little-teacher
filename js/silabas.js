// Sílabas: syllable families (ma me mi mo mu) and a word builder (pa + to = ¡pato!).
import { G, wait, rand, pick } from './state.js';
import { Pix, cached, darken, lighten } from './raster.js';
import * as S from './sprites.js';
import { sfx } from './audio.js';
import { speak } from './students.js';
import { picture } from './pictures.js';
import { wordSprite, FONT, DESC } from './i18n.js';
import { FAMILIES, VOWELS, WORDS } from './learndata.js';

const COLS = ['#ef5b5b', '#ff9a2e', '#e0a800', '#3cb44b', '#2f7de1', '#9b59d0', '#ff5fa8'];
function block(w, h, col) {
  return cached('sblk' + w + h + col, () => {
    const p = new Pix(w, h);
    p.rect(1, 0, w - 2, h, darken(col, 0.3)); p.rect(0, 1, w, h - 2, darken(col, 0.3));
    p.rect(1, 1, w - 2, h - 3, col); p.rect(2, 1, w - 4, 2, lighten(col, 0.45));
    return p.canvas();
  });
}
function slot(w, h) {
  return cached('sslot' + w + h, () => {
    const p = new Pix(w, h);
    for (let x = 0; x < w; x += 3) { p.px(x, 0, '#cdbfa9'); p.px(x, h - 1, '#cdbfa9'); }
    for (let y = 0; y < h; y += 3) { p.px(0, y, '#cdbfa9'); p.px(w - 1, y, '#cdbfa9'); }
    p.rect(2, h - 4, w - 4, 2, '#e8dccb');
    return p.canvas();
  });
}

export function createSilabas({ owl, row, tAct }) {
  let mode = 'fam', fam = 'm', wi = 0, A = null;
  let built = [], cards = [], doneAt = 0, singing = -1, shake = { i: -1, t: 0 };
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const D = (c, im, x, y) => c.drawImage(im, Math.round(x), Math.round(y));
  const inR = (x, y, r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const say = (t) => speak(owl, t, 'here');
  // top of a word sprite inside a card: same baseline whether or not it has a tail (p q g y j)
  const ty = (y, h, scale) => y + Math.floor((h - (9 + DESC) * scale) / 2);

  function setWord(i) {
    wi = (i + WORDS.length) % WORDS.length;
    const w = WORDS[wi];
    built = [];
    const pool = [...new Set(WORDS.flatMap(x => x.s))].filter(s => !w.s.includes(s));
    const extra = [pick(pool)];
    cards = [...w.s, ...extra].map((s, k) => ({ s, used: false, col: COLS[(k * 3 + wi) % COLS.length], k: Math.random() })).sort((a, b) => a.k - b.k);
    doneAt = 0;
  }
  setWord(0);

  const api = {
    gridItems() { return [...FAMILIES.map(c => ({ id: 'f' + c, ch: c })), { id: 'words', ch: null }]; },
    isSel(it) { return it.id === 'words' ? mode === 'words' : mode === 'fam' && fam === it.ch; },
    select(it) {
      if (it.id === 'words') { mode = 'words'; setWord(wi); sfx.pop(1.2); say('¡Vamos a leer!'); return; }
      mode = 'fam'; fam = it.ch; sfx.pop(1.2); singing = -1;
      say(fam + 'a');
    },
    layout(area) {
      A = area;
    },
    render(c) {
      const a = A;
      if (mode === 'fam') {
        // consonant + vowels = syllables
        const bw = Math.min(30, Math.floor((a.w * 0.9 - 4 * 6) / 5)), bh = Math.round(bw * 0.9);
        const tot = 5 * bw + 4 * 6, x0 = a.x + (a.w - tot) / 2, y0 = a.y + a.h / 2 - bh / 2 + 6;
        const big = wordSprite(fam, '#5a4560', 3);
        D(c, big, a.x + a.w / 2 - big.width / 2, a.y + 8);
        api.blocks = VOWELS.map((v, i) => ({ x: x0 + i * (bw + 6), y: y0, w: bw, h: bh, syl: fam + v, v, col: COLS[i] }));
        api.vowelBtns = VOWELS.map((v, i) => ({ x: x0 + i * (bw + 6) + bw / 2 - 8, y: y0 - 22, w: 16, h: 16, v }));
        for (const vb of api.vowelBtns) { const im = wordSprite(vb.v, COLS[VOWELS.indexOf(vb.v)], 2); D(c, im, vb.x + 8 - im.width / 2, vb.y + 2); }
        api.blocks.forEach((b, i) => {
          const lift = singing === i || (b.pop > G.time) ? 3 : 0;
          D(c, block(b.w, b.h, b.col), b.x, b.y - lift);
          const sc = b.w >= 28 ? 2 : 1, t = wordSprite(b.syl, '#ffffff', sc);
          D(c, t, b.x + b.w / 2 - t.width / 2, ty(b.y, b.h, sc) - lift);
        });
        api.sing = { x: a.x + a.w / 2 - 13, y: y0 + bh + 10, w: 26, h: 24 };
        D(c, block(26, 24, '#fff3dc'), api.sing.x, api.sing.y); D(c, S.ICONS.play(), api.sing.x + 4, api.sing.y + 3);
      } else {
        const w = WORDS[wi];
        const pic = picture(w.pic);
        const done = built.length === w.s.length;
        if (pic) { const k = Math.max(1, Math.min(2, Math.floor(Math.min((a.w * 0.4) / pic.width, (a.h * 0.42) / pic.height)))); const bob = done ? Math.round(Math.sin(G.time * 6) * 2) : 0; c.drawImage(pic, Math.round(a.x + a.w / 2 - pic.width * k / 2), Math.round(a.y + 6 + bob), pic.width * k, pic.height * k); }
        const sh = 28, gap = 4, wOf = (syl) => Math.max(30, wordSprite(syl, '#fff', 2).width + 8);
        const sws = w.s.map(wOf), tot = sws.reduce((n, x) => n + x, 0) + (w.s.length - 1) * gap;
        let sx = a.x + (a.w - tot) / 2; const sy = a.y + a.h * 0.5;
        w.s.forEach((syl, i) => {
          const sw = sws[i], r = { x: sx, y: sy, w: sw, h: sh }; sx += sw + gap;
          if (built[i]) { D(c, block(sw, sh, built[i].col), r.x, r.y - (done ? Math.round(Math.abs(Math.sin(G.time * 5 + i)) * 2) : 0)); const t = wordSprite(syl, '#ffffff', 2); D(c, t, r.x + sw / 2 - t.width / 2, ty(r.y, sh, 2) - (done ? Math.round(Math.abs(Math.sin(G.time * 5 + i)) * 2) : 0)); }
          else D(c, slot(sw, sh), r.x, r.y);
        });
        if (done) { const t = wordSprite(w.w, '#5a4560', 2); D(c, t, a.x + a.w / 2 - t.width / 2, sy + sh + 10); api.cardRects = []; }
        else {
          // the answer cards must fit inside the paper (mariposa has 5 cards): squeeze if needed
          let cg = 6, cws = cards.map(cd => wOf(cd.s));
          const fit = () => cws.reduce((n, x) => n + x, 0) + (cards.length - 1) * cg;
          if (fit() > a.w - 6) { cg = 3; cws = cards.map(cd => Math.max(26, wordSprite(cd.s, '#fff', 2).width + 4)); }
          const cy = a.y + a.h - sh - 6, ctot = fit();
          let cx = a.x + (a.w - ctot) / 2;
          api.cardRects = cards.map((cd, i) => { const r = { x: cx, y: cy, w: cws[i], h: sh, cd }; cx += cws[i] + cg; return r; });
          for (const r of api.cardRects) {
            if (r.cd.used) { D(c, slot(r.w, sh), r.x, r.y); continue; }
            const dx = shake.i === cards.indexOf(r.cd) && G.time - shake.t < 0.4 ? (Math.floor(G.time * 30) % 2 ? 2 : -2) : 0;
            D(c, block(r.w, sh, r.cd.col), r.x + dx, r.y); const t = wordSprite(r.cd.s, '#ffffff', 2); D(c, t, r.x + dx + r.w / 2 - t.width / 2, ty(r.y, sh, 2));
          }
        }
        api.next = done ? { x: a.x + a.w - 30, y: a.y + 4, w: 26, h: 24 } : null;
        if (api.next) { D(c, block(26, 24, '#fff6c8'), api.next.x, api.next.y - (Math.floor(G.time * 4) % 2)); D(c, S.ICONS.play(), api.next.x + 4, api.next.y + 3); }
      }
    },
    tap(x, y) {
      if (mode === 'fam') {
        for (const b of api.blocks || []) if (inR(x, y, b)) { b.pop = G.time + 0.25; say(b.syl); sfx.note(523 + VOWELS.indexOf(b.v) * 110); row.burst('spark', b.x + b.w / 2, b.y, 3, [b.col, '#ffd23f'], { up: true, sp: 30 }); tAct('point', 0.8); return true; }
        for (const v of api.vowelBtns || []) if (inR(x, y, v)) { say(v.v); sfx.tap(); return true; }
        if (inR(x, y, api.sing) && singing < 0) {
          (async () => { for (let i = 0; i < 5; i++) { singing = i; say(fam + VOWELS[i]); sfx.note(523 + i * 110); await wait(0.8); } singing = -1; row.cheer(); sfx.chime(); })();
          return true;
        }
        return false;
      }
      if (api.next && inR(x, y, api.next)) { setWord(wi + 1); sfx.pop(); return true; }
      const w = WORDS[wi];
      for (const r of api.cardRects || []) if (!r.cd.used && inR(x, y, r)) {
        say(r.cd.s);
        if (r.cd.s === w.s[built.length]) {
          r.cd.used = true; built.push(r.cd); sfx.pop(1.2 + built.length * 0.1);
          if (built.length === w.s.length) {
            doneAt = G.time;
            (async () => {
              await wait(0.9);
              for (const s of w.s) { say(s); await wait(0.6); }
              say(w.w); sfx.fanfare(); row.cheer(); tAct('cheer', 1.4);
              row.burst('confetti', A.x + A.w / 2, A.y + 10, 30, COLS, { sp: 90, g: 80, life: 1.3 });
            })();
          }
        } else { shake = { i: cards.indexOf(r.cd), t: G.time }; sfx.boing(); wait(0.7).then(() => speak(row.talker() || owl, 'Hmm?', 'giggle')); }
        return true;
      }
      if (inR(x, y, { x: A.x + A.w / 2 - 40, y: A.y, w: 80, h: A.h * 0.45 })) { say(w.w); return true; }
      return false;
    },
  };
  window.__ltSilNext = () => {
    if (mode !== 'words' || !api.cardRects) return null;
    const need = WORDS[wi].s[built.length]; const r = api.cardRects.find(r => !r.cd.used && r.cd.s === need);
    const k = G.V ? 1 : 1; return r ? window.__ltLetterCss(r.x + r.w / 2, r.y + r.h / 2) : null;
  };
  window.__ltSilNextBtn = () => (mode === 'words' && api.next ? window.__ltLetterCss(api.next.x + api.next.w / 2, api.next.y + api.next.h / 2) : null);
  return api;
}
