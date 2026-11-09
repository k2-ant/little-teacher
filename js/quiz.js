// A friendly question card that a student asks the teacher. No wrong answers end anything:
// a miss just gets "Mmm... creo que no." and the right answer glows.
import { G, wait, rand, pick } from './state.js';
import { Pix, cached, darken, lighten } from './raster.js';
import * as S from './sprites.js';
import { sfx } from './audio.js';
import { speak, act, hop, talk, pose } from './students.js';
import { picture } from './pictures.js';
import { shapeSprite } from './shapes.js';
import { wordSprite, numberWord, letterName, shapeName } from './i18n.js';
import * as LD from './learndata.js';

function card(w, h, col = '#fffaf0', rim = '#c9a77a') {
  return cached('qcard' + w + h + col + rim, () => {
    const p = new Pix(w, h);
    p.rect(2, 0, w - 4, h, rim); p.rect(0, 2, w, h - 4, rim); p.rect(1, 1, w - 2, h - 2, rim);
    p.rect(2, 1, w - 4, h - 3, col); p.rect(1, 2, w - 2, h - 5, col);
    p.hline(3, w - 4, 1, lighten(col, 0.6)); p.rect(2, h - 2, w - 4, 1, darken(col, 0.18));
    return p.canvas();
  });
}
function splat(col) {
  return cached('splat' + col, () => {
    const p = new Pix(30, 28);
    p.ball(15, 14, 11, 10, col, { shadow: darken(col, 0.15) });
    for (const [x, y, r] of [[4, 8, 3], [26, 7, 2.5], [25, 22, 3], [6, 22, 2], [15, 2, 2]]) p.ball(x, y, r, r, col, { hi: false });
    p.outline('#2a1630', col === '#ffffff' ? 0.35 : 0.6);
    return p.canvas();
  });
}
/** a little speaker with 0-3 sound waves: "listen!" (for questions with no picture) */
function speaker(n) {
  return cached('qspk' + n, () => {
    const p = new Pix(26, 18);
    const C = '#7a5bc0', H = '#a98be6';
    p.rect(1, 6, 4, 6, C); p.rect(2, 7, 2, 2, H);
    for (let i = 0; i < 5; i++) p.vline(5 + i, 6 - i, 11 + i, C);
    p.vline(6, 5, 7, H);
    p.outline('#2a1630', 0.6);
    const W = '#2f9ee8';
    for (let k = 0; k < n; k++) {
      const r = 4 + k * 4;
      for (let a = -0.85; a <= 0.85; a += 0.05) p.px(Math.round(10 + Math.cos(a) * r), Math.round(8.5 + Math.sin(a) * r), W);
    }
    return p.canvas();
  });
}
/** just the head of a student sprite (so faces can be shown big) */
function headOf(im, kind, mood) {
  return cached('qhead' + kind + mood, () => {
    // start at the first painted row (ears/hats included) and keep ~the head
    const d = im.getContext('2d').getImageData(0, 0, im.width, im.height).data;
    let top = 0;
    while (top < im.height - 1 && ![...Array(im.width).keys()].some(x => d[(top * im.width + x) * 4 + 3])) top++;
    const h = Math.min(29, im.height - top), cv = document.createElement('canvas');
    cv.width = im.width; cv.height = h;
    cv.getContext('2d').drawImage(im, 0, top, im.width, h, 0, 0, im.width, h);
    return cv;
  });
}
const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
const sample = (arr, n, not) => shuffle(arr.filter(x => x !== not)).slice(0, n);

/** build a random question for a student */
export function makeQuestion(asker, students) {
  const kind = pick(['color', 'color', 'shape', 'count', 'animal', 'letter', 'size']);
  if (kind === 'color') {
    const q = pick(LD.COLOR_QS);
    const opts = shuffle([q.a, ...sample(Object.keys(LD.COLORS), 2, q.a)]);
    return { prompt: q.q, promptPic: picture(q.pic), options: opts.map(c => ({ img: splat(LD.COLORS[c]), say: c, right: c === q.a })) };
  }
  if (kind === 'shape') {
    const shapes = Object.keys(LD.SHAPE_QS), a = pick(shapes);
    const cols = shuffle(Object.values(LD.COLORS).filter(c => c !== '#ffffff'));
    const opts = shuffle([a, ...sample(shapes, 2, a)]);
    return { prompt: LD.SHAPE_QS[a], promptPic: null, options: opts.map((sh, i) => ({ img: shapeSprite(sh, cols[i]), say: shapeName(sh), right: sh === a })) };
  }
  if (kind === 'count') {
    const n = 1 + Math.floor(Math.random() * 5);
    const nums = shuffle([n, ...sample([1, 2, 3, 4, 5], 2, n)]);
    return { prompt: LD.COUNT_Q, stars: n, options: nums.map(k => ({ img: wordSprite(String(k), '#2f7de1', 4), say: numberWord(k), right: k === n })) };
  }
  if (kind === 'animal') {
    const kinds = Object.keys(LD.ANIMAL_QS).filter(k => S.KINDS.includes(k)), a = pick(kinds);
    const opts = shuffle([a, ...sample(kinds, 2, a)]);
    return { prompt: LD.ANIMAL_QS[a], options: opts.map(k => ({ img: S.student(k, { eyes: 'happy', mouth: 'smile', armL: 'down', armR: 'down', feet: 0, look: 0, blush: true, hide: 0, tongue: k === 'puppy' }), say: LD.ANIMAL_WORD[k], right: k === a })) };
  }
  if (kind === 'letter') {
    const ls = Object.keys(LD.LETTER_QS), a = pick(ls);
    const opts = shuffle([a, ...sample(ls, 2, a)]);
    const cols = ['#ef5b5b', '#3cb44b', '#9b59d0'];
    return { prompt: LD.LETTER_QS[a], options: opts.map((l, i) => ({ img: wordSprite(l, cols[i], 4), say: letterName(l), right: l === a })) };
  }
  const which = pick(['grande', 'pequeño']);
  const big = { img: picture('apple'), big: true, say: 'grande', right: which === 'grande' };
  const small = { img: S.stamp('apple'), small: true, say: 'pequeño', right: which === 'pequeño' };
  return { prompt: LD.SIZE_QS[which], options: shuffle([big, small]) };
}

export function feelingsSteps(asker) {
  const mood = asker.mood;
  const others = sample(LD.MOODS, 2, mood);
  const face = (m) => headOf(S.student(asker.kind, { ...pose({ ...asker, act: null, mood: m, blink: 0, sleep: false, mode: 'seated' }).st, armL: 'down', armR: 'down' }), asker.kind, m);
  return [
    { prompt: LD.FEEL_Q1, wide: true, options: shuffle([mood, ...others]).map(m => ({ img: face(m), face: true, mood: m, say: LD.moodWord(m, asker.kind), right: m === mood })), after: LD.moodLine(mood, asker.kind) },
    { prompt: LD.FEEL_Q2, after: LD.FEEL_DONE, options: sample(LD.HELPS, 3).map(h => ({ img: picture({ abrazo: 'hug', juguete: 'toy', agua: 'water', descansar: 'pillow', respirar: 'wind' }[h.id]), say: h.word, right: true, help: h.id })) },
  ];
}

export function createQuiz(fx) {
  let Q = null; // { asker, steps, i, picked, rightAt, wrong:Set, onDone }
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const D = (c, im, x, y) => c.drawImage(im, Math.round(x), Math.round(y));
  const inR = (x, y, r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  let L = {};

  function ask() {
    const st = Q.steps[Q.i];
    Q.wrong = new Set(); Q.done = false; Q.t0 = G.time; Q.repeated = false;
    speak(Q.asker, st.prompt, 'here');
  }
  const api = {
    get _L() { return L; },
    get _Q() { return Q; },
    get active() { return !!Q; },
    open(asker, steps, onDone, intro) {
      Q = { asker, steps, i: 0, onDone, wrong: new Set() };
      act(asker, 'raise', 1.5);
      if (intro) { speak(asker, intro, 'here'); Q.wait = true; wait(1.7).then(() => { if (Q && Q.asker === asker) { Q.wait = false; ask(); } }); }
      else ask();
      sfx.pop(1.1);
    },
    close() { Q = null; },
    layout(V) {
      const { W, H } = V, st = Q && Q.steps[Q.i];
      const pw = Math.min(W - 16, 250), ph = Math.min(H - 16, 176);
      L.panel = { x: Math.round(W / 2 - pw / 2), y: Math.round(H / 2 - ph / 2), w: pw, h: ph };
      L.close = { x: L.panel.x + pw - 22, y: L.panel.y - 6, w: 26, h: 26 };
      L.prompt = { x: L.panel.x + 82, y: L.panel.y + 10, w: pw - 92, h: 72 };
      // faces get wider cards so they can be drawn at 2x
      const gap = st && st.wide ? 6 : 10, n = 3;
      const ow = st && st.wide ? Math.max(58, Math.min(74, Math.floor((pw - 12 - (n - 1) * gap) / n))) : 58, oh = st && st.wide ? 70 : 58;
      const tot = n * ow + (n - 1) * gap;
      L.opts = [0, 1, 2].map(k => ({ x: Math.round(L.panel.x + pw / 2 - tot / 2 + k * (ow + gap)), y: L.panel.y + ph - oh - 12, w: ow, h: oh }));
    },
    render(c, V) {
      if (!Q) return;
      api.layout(V);
      const { W, H } = V, P = L.panel, st = Q.steps[Q.i];
      c.fillStyle = 'rgba(40,30,60,0.45)'; c.fillRect(0, 0, W, H);
      D(c, card(P.w, P.h, '#fff6e6', '#b9875a'), P.x, P.y);
      // the asking student, big
      const { st: ps } = pose(Q.asker);
      const im = S.student(Q.asker.kind, ps);
      c.drawImage(im, P.x + 6, P.y + 4 - Math.round(Q.asker.z || 0), im.width * 2, im.height * 2);
      // speech bubble with the question picture
      const B = L.prompt;
      D(c, card(B.w, B.h, '#ffffff', '#c9b8d8'), B.x, B.y);
      for (let k = 0; k < 4; k++) R(c, B.x - 4 + k, B.y + 30 + k, 4 - k, 1, '#c9b8d8');
      if (st.promptPic) { const p = st.promptPic, k = Math.max(1, Math.min(2, Math.floor(Math.min((B.w - 10) / p.width, (B.h - 10) / p.height)))); c.drawImage(p, Math.round(B.x + (B.w - p.width * k) / 2), Math.round(B.y + (B.h - p.height * k) / 2), p.width * k, p.height * k); }
      else if (st.stars) { const s = S.ICONS.star(), per = st.stars > 3 ? 3 : st.stars; for (let i = 0; i < st.stars; i++) D(c, s, B.x + (B.w - per * 20) / 2 + (i % per) * 20, B.y + 8 + Math.floor(i / per) * 20 + (st.stars <= 3 ? 12 : 0)); }
      else { // nothing to look at: a pulsing speaker says "listen!"
        const q = speaker(Math.floor(G.time * 3) % 4), k = 3, bob = Math.floor(G.time * 3) % 4 === 3 ? 1 : 0;
        c.drawImage(q, Math.round(B.x + B.w / 2 - q.width * k / 2), Math.round(B.y + B.h / 2 - q.height * k / 2) - bob, q.width * k, q.height * k);
      }
      // nothing picked for a while: ask once more
      if (!Q.wait && !Q.done && !Q.repeated && Q.picked == null && !Q.wrong.size && G.time - Q.t0 > 5) {
        Q.repeated = true; speak(Q.asker, st.prompt, 'here'); act(Q.asker, 'raise', 1.2);
      }
      // answers
      st.options.forEach((o, k) => {
        const r = L.opts[k];
        const glow = Q.hint && o.right && Math.floor(G.time * 4) % 2;
        const picked = Q.picked === k;
        D(c, card(r.w, r.h, picked && o.right ? '#e8ffd8' : glow ? '#fff3b0' : '#fffaf0', glow ? '#ffb020' : '#c9a77a'), r.x, r.y - (picked ? 2 : 0));
        let img = o.img, pad = o.face ? 6 : 10, kk = Math.max(1, Math.floor(Math.min((r.w - pad) / img.width, (r.h - pad) / img.height)));
        if (o.big) kk = Math.max(2, kk); else if (o.small) kk = 1;
        if (Q.wrong.has(k)) c.globalAlpha = 0.35;
        c.drawImage(img, Math.round(r.x + (r.w - img.width * kk) / 2), Math.round(r.y + (r.h - img.height * kk) / 2) - (picked ? 2 : 0), img.width * kk, img.height * kk);
        if (o.face) { const mb = S.moodBubble(o.mood); D(c, mb, r.x + r.w - mb.width + 4, r.y - 8 - (picked ? 2 : 0)); }
        c.globalAlpha = 1;
      });
      D(c, card(26, 26, '#ffe0e0', '#c97a7a'), L.close.x, L.close.y);
      c.fillStyle = '#c94f4f';
      for (let i = 0; i < 10; i++) { c.fillRect(L.close.x + 8 + i, L.close.y + 8 + i, 2, 2); c.fillRect(L.close.x + 17 - i, L.close.y + 8 + i, 2, 2); }
    },
    tap(x, y) {
      if (!Q) return false;
      if (inR(x, y, L.close)) { sfx.softPop(); Q = null; return true; }
      if (Q.wait || Q.done) return true;
      const st = Q.steps[Q.i];
      if (inR(x, y, L.prompt) || inR(x, y, { x: L.panel.x, y: L.panel.y, w: 80, h: 90 })) { speak(Q.asker, st.prompt, 'here'); return true; }
      const k = L.opts.findIndex(r => inR(x, y, r));
      if (k < 0) return true;
      const o = st.options[k];
      Q.picked = k; sfx.pop(1.2);
      if (o.say) speak(Q.asker, o.say, 'here');
      const q = Q;
      if (o.right) {
        Q.done = true;
        wait(o.say ? 1.0 : 0.3).then(() => {
          if (Q !== q) return;
          sfx.sparkle(); fx.burst(L.opts[k].x + L.opts[k].w / 2, L.opts[k].y + 20, ['#ffd23f', '#7dd370', '#ff9ec4']);
          act(q.asker, 'cheer', 1.2); hop(q.asker, 70); fx.teacher?.('clap');
          const line = st.after || (Q.i === Q.steps.length - 1 ? pick(LD.Q_RIGHT) : null);
          if (st.help) { }
          if (line) speak(q.asker, line, 'yay');
          wait(line ? 1.9 : 0.8).then(() => {
            if (Q !== q) return;
            q.i++; q.picked = null; q.hint = false;
            if (q.i < q.steps.length) ask();
            else { const done = q.onDone; Q = null; done?.(o); }
          });
        });
      } else {
        Q.wrong.add(k);
        wait(0.9).then(() => { if (Q === q) { speak(q.asker, LD.Q_WRONG, 'giggle'); act(q.asker, 'giggle', 1); q.hint = true; } });
      }
      return true;
    },
  };
  return api;
}
