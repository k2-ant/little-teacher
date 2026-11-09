import { G, makeView, wait, persist, rand, pick, clamp } from './state.js';
import { Pix, cached, glow, darken, lighten, mix } from './raster.js';
import * as S from './sprites.js';
import { sfx, hush } from './audio.js';
import { act, acting, hop, talk, speak, animalSound, coax, physics, walkStep, walkTo, pose, traits, startle, GREETINGS, BYES, randomCheer } from './students.js';
import { BOOKS } from './pages.js';
import * as DC from './decor.js';
import { createQuiz, makeQuestion, feelingsSteps } from './quiz.js';
import * as LD from './learndata.js';
import { VERSION } from './version.js';
import { drawHand } from './hints.js';
import { createRituals, jobsButtonIcon } from './rituals.js';
import { wordSprite as wsprite } from './i18n.js';
import { lang, setLang, flag, DAY_WORDS, DAY_SHORT, DAY_COLORS, dayIndex, daySentence, wordSprite } from './i18n.js';
import { LETTERS, letterSentence } from './i18n.js';
import { tapEscalate, crowned } from './students.js';

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const D = (c, img, x, y) => c.drawImage(img, Math.round(x), Math.round(y));

const FURN_DEFAULT = {
  desk0: [0.30, 0.34], desk1: [0.50, 0.34], desk2: [0.70, 0.34], desk3: [0.40, 0.77], desk4: [0.60, 0.77],
  rug: [0.15, 0.93], plant: [0.93, 0.62], shelf: [0.9, 0.13],
};
const FURN_SIZE = { desk: [S.DESK_W, S.DESK_H], rug: [84, 32], plant: [28, 38], shelf: [38, 46], teacher: [22, DC.TH] };
const sizeOf = (f) => FURN_SIZE[f.type] || [DC.DECOR[f.type].w, DC.DECOR[f.type].h];
const layerOf = (f) => (DC.DECOR[f.type] ? DC.DECOR[f.type].layer : 'floor');
let uid = 0;

// ------------------------------------------------------------------ mini faces for the attendance chart
function miniFace(kind, on) {
  return cached('mini' + kind + on, () => {
    const p = new Pix(13, 13);
    const C = S.PAL[kind];
    const g = (c) => on ? c : darken(lighten(c, 0.5), 0.15);
    if (kind === 'bunny') { p.ell(4.5, 3, 1.5, 3.4, g(C.fur)); p.ell(8.5, 3, 1.5, 3.4, g(C.fur)); p.px(4, 2, g(C.inner)); p.px(8, 2, g(C.inner)); }
    if (kind === 'owl') { p.ell(3, 3.5, 1.5, 2, g(C.fur)); p.ell(10, 3.5, 1.5, 2, g(C.fur)); }
    if (kind === 'frog') { p.ell(4, 4.5, 2.4, 2.2, g(C.fur)); p.ell(9, 4.5, 2.4, 2.2, g(C.fur)); }
    p.ball(6.5, 7.5, 5.5, 4.6, g(C.fur), { hi: false });
    if (kind === 'puppy') { p.ell(1.6, 7, 1.5, 3, g(C.ear)); p.ell(11.4, 7, 1.5, 3, g(C.ear)); }
    if (kind === 'turtle') p.ell(6.5, 4.6, 5, 2.4, g(C.accent), { y1: 4 });
    if (kind === 'owl') { p.ell(4.5, 7.5, 2, 2, g(C.disk)); p.ell(8.5, 7.5, 2, 2, g(C.disk)); p.px(6, 9, g('#ffae4a')); }
    const e = on ? S.INK : '#9a8d98';
    if (kind === 'frog') { p.px(4, 4, e); p.px(9, 4, e); } else { p.px(4, 7, e); p.px(8, 7, e); }
    if (on) { p.px(5, 10, S.INK); p.px(6, 10, S.INK); p.px(7, 10, S.INK); }
    p.outline();
    return p.canvas();
  });
}
function btnFrame(w, h, col = '#fff3dc', key = '') {
  return cached('btn' + w + 'x' + h + col + key, () => {
    const p = new Pix(w, h);
    p.rect(1, 0, w - 2, h - 1, darken(col, 0.5)); p.rect(0, 1, w, h - 3, darken(col, 0.5));
    p.rect(1, 1, w - 2, h - 3, col); p.hline(2, w - 3, 1, lighten(col, 0.6));
    p.rect(1, h - 2, w - 2, 1, darken(col, 0.35));
    return p.canvas();
  });
}
function scaled(img, k) {
  return cached('scaled' + k + (img.__id ||= Math.random()), () => {
    const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, c.width, c.height); return c;
  });
}

export function createClassroom(students, hooks) {
  let V = null;
  const L = {};
  let bg = null;
  const furn = {};
  for (const id of Object.keys(FURN_DEFAULT)) {
    const type = id.startsWith('desk') ? 'desk' : id;
    const saved = G.save.furniture[id];
    const [fx, fy] = saved || FURN_DEFAULT[id];
    furn[id] = { id, type, i: type === 'desk' ? +id.slice(4) : 0, fx, fy, x: 0, y: 0, lift: 0 };
  }
  {
    const t = G.save.furniture.teacher;
    furn.teacher = { id: 'teacher', type: 'teacher', fx: t ? t[0] : -1, fy: t ? t[1] : 0.08, x: 0, y: 0, lift: 0 };
  }
  for (const id of ['abc', 'shapetable', 'calendar']) {
    const sv = G.save.furniture[id];
    furn[id] = { id, type: id, v: 0, fx: sv ? sv[0] : -1, fy: sv ? sv[1] : -1, x: 0, y: 0, lift: 0 };
  }
  for (const d of G.save.decor) {
    if (!DC.DECOR[d.t]) continue;
    const id = 'd' + (uid++);
    furn[id] = { id, type: d.t, deco: true, v: d.v || 0, fx: d.fx, fy: d.fy, x: 0, y: 0, lift: 0 };
  }
  if (G.save.seats) students.forEach(s => { if (G.save.seats[s.kind] !== undefined) s.desk = G.save.seats[s.kind]; });
  students.forEach(s => { s.stars = G.save.stars[s.kind] || 0; });

  const desks = [0, 1, 2, 3, 4].map(i => furn['desk' + i]);
  const parts = [];
  let phase = 'title';
  let busy = false;
  let doorOpen = 0, doorTarget = 0;
  let dusk = 0, duskTarget = 0, sky = 'morning';
  let drag = null; // {kind:'furn'|'student'|'star', ...}
  let press = null;
  let menu = null; // free-time chooser
  let story = null, recess = null, centros = null;
  let naughtyT = 55;
  let updateAvail = null, updateChecked = false;
  let homeArm = 0; // first tap on 🏠 asks "¿Ya nos vamos?"; a second tap before this time goes home
  let armed = null; // sticky pick-up: tap the star / a card, then tap a student { id, until }
  let hurry = false; // morning: a tap on the floor speeds everyone up
  let bellBob = 0, prepHintN = 0, snackOn = false;
  // ---- spoken button names + "what do I do next?" hints
  let lastInput = 0, nextHintAt = 12, hint = null, hintIdx = 0, prepStamp = 0;
  const saidHint = {};
  const helper = () => students[3];
  function sayUI(key) { if (LD.UI_WORDS[key]) speak(helper(), LD.UI_WORDS[key], 'tap'); }
  function sayItem(key) { if (LD.ITEM_WORDS[key]) speak(helper(), LD.ITEM_WORDS[key], 'tap'); }
  const btnPt = (id) => { const b = btns.find(q => q.id === id); return { x: b.x + 13, y: b.y + 12 }; };
  const ARM_IDS = ['star', 'cardGreen', 'cardRed'];
  function computeHint() {
    const rh = RT.hint(); if (rh) return rh; // the jobs chart is open
    if (phase === 'prep') {
      if (G.save.decorStamp === prepStamp) {
        // alternate "decorate" and "ring the bell"; start with the bell when the room is already decorated
        const ringFirst = G.save.decor.length > 0 || (G.save.day || 1) > 1;
        const key = (prepHintN++ + (ringFirst ? 1 : 0)) % 2 ? 'ring' : 'decorate';
        if (key === 'ring') return { key, ...btnPt('bell') };
        if (deco) { const it = trayItems()[0]; return { key: 'decorate', x: it.x + it.w / 2, y: it.y + 8 }; }
        return { key: 'decorate', ...btnPt('decorate') };
      }
      return { key: 'ring', ...btnPt('bell') };
    }
    if (centros && centros.stage === 'chart') { const { start } = centrosLayout(); return { key: 'chart', x: start.x + 18, y: start.y + 10 }; }
    if (recess) return { key: 'recessEnd', ...btnPt('toys') };
    if (centros && centros.stage === 'run') return { key: 'centrosEnd', ...btnPt('cdone') };
    { const v = v19Hint(); if (v) return v; }
    if (story && L.storyBook) return { key: 'storyPage', x: L.storyBook.x + L.storyBook.w - 14, y: L.storyBook.y + L.storyBook.h - 16 };
    if (snackOn) return { key: 'snackWait', x: null };
    if (phase !== 'class' || busy) return null;
    const t = classHint();
    // the open decorate tray hides the star / card / toys buttons: first ask her to put the tray away
    if (t && deco && ['star', 'play', 'naughty'].includes(t.key)) { const q = btnPt('decorate'); return { key: 'closeTray', x: q.x + 2, y: q.y - 6 }; }
    return t;
  }
  function classHint() {
    const at = (s, key) => { const [x, y] = headPos(s); return { key, x, y: y + 12 }; };
    const absent = students.find(s => !s.here && s.mode === 'seated'); if (absent) return at(absent, 'attendance');
    const moody = students.find(s => s.mood && (s.mode === 'seated' || s.mode === 'stand')); if (moody) return at(moody, 'mood');
    // star / cards: the hand carries the icon from the button onto a student's head
    const carry = (key, btn, s) => { const [hx, hy] = headPos(s); const b = btnPt(btn); return { key, x: b.x, y: b.y, from: b, to: { x: hx, y: hy + 6 }, icon: btn }; };
    const naughty = students.find(s => s.naughty && s.mode !== 'away'); if (naughty) return carry('naughty', 'cardRed', naughty);
    const raised = students.find(s => acting(s, 'raise') && s.mode === 'seated'); if (raised) return at(raised, 'question');
    const rt = RT.classHint(G.time - (classStart || 0), btnPt, !!deco); if (rt) return rt; // thirsty plant / helpers chart
    const order = ['board', 'star', 'play', 'abc', 'home'];
    for (let k = 0; k < order.length; k++) {
      const key = order[(hintIdx + k) % order.length];
      if (key === 'home' && G.time - (classStart || 0) < 150) continue;
      hintIdx = (hintIdx + k + 1) % order.length;
      if (key === 'board') return { key, x: L.board.x + L.board.w / 2, y: L.board.y + 30 };
      if (key === 'star') { const c = students.filter(s => s.mode === 'seated' && s.here); return c.length ? carry(key, 'star', pick(c)) : { key, ...btnPt('star') }; }
      if (key === 'play') return { key, ...btnPt('toys') };
      if (key === 'abc') { const f = furn.abc, [, h] = sizeOf(f); return { key, x: f.x, y: f.y - h / 2 }; }
      if (key === 'home') return { key, ...btnPt('home') };
    }
    return null;
  }
  let classStart = 0;
  function showHint(force) {
    const t = computeHint(); if (!t) return;
    hint = { ...t, t0: G.time, until: G.time + 6 };
    if (force || !saidHint[t.key] || G.time - saidHint[t.key] > 45) { saidHint[t.key] = G.time; speak(helper(), LD.HINTS[t.key], 'tap'); }
  }
  function drawHint(c) {
    if (!hint) return;
    if (G.time > hint.until) { hint = null; return; }
    if (hint.x == null) return; // spoken only
    if (hint.to) { // carry the star / card from its button to a student
      const k = Math.min(1, ((G.time - hint.t0) % 2.2) / 1.5), e = k * k * (3 - 2 * k);
      const x = hint.from.x + (hint.to.x - hint.from.x) * e, y = hint.from.y + (hint.to.y - hint.from.y) * e;
      const ic = hint.img || (hint.icon === 'star' ? S.ICONS.star() : DC.trayIcon(hint.icon));
      D(c, ic, x - 9, y - 16);
      drawHand(c, x, y);
      return;
    }
    drawHand(c, hint.x, hint.y);
  }
  function drawArmed(c) { // a picked-up star / card bobs above its button until she taps a student
    if (!armed) return;
    const b = shownBtns().find(q => q.id === armed.id);
    if (!b || G.time > armed.until || busy || quiz.active || menu || bookOpen || story) { armed = null; return; }
    const ic = armed.id === 'star' ? S.ICONS.star() : DC.trayIcon(armed.id);
    const bob = Math.round(Math.sin(G.time * 6) * 2);
    D(c, glow(btnFrame(b.w, b.h, '#fff6c8', 'on'), '#ffd23f', 'homeglow'), b.x - 2, b.y - 2);
    D(c, btnFrame(b.w, b.h, '#fff6c8', 'on'), b.x, b.y);
    c.globalAlpha = 0.35; D(c, ic, b.x + (b.w - ic.width) / 2, b.y + (b.h - ic.height) / 2 - 1); c.globalAlpha = 1;
    D(c, glow(ic, '#fff6b8', 'armed' + armed.id), b.x + b.w / 2 - 11, b.y - 24 + bob);
    D(c, ic, b.x + b.w / 2 - 9, b.y - 22 + bob);
    if (Math.random() < 0.08) burst('spark', b.x + b.w / 2 + rand(-8, 8), b.y - 14 + bob, 1, ['#ffd23f', '#ffffff'], { sp: 15 });
  }
  let reward = null, bookOpen = null;
  let hintT = 6;
  let attendanceDone = false;
  let btns = [];
  let lastTap = 0;
  let deco = null; // decorate tray: { tab }
  let dayCard = null; // morning 'today is...' card
  let lastQ = -99, feelT = 40;
  const MOOD_BUBBLE = { triste: 'm:triste', enojado: 'm:enojado', asustado: 'm:asustado', cansado: 'm:cansado' };
  const MOOD_COL = { triste: '#7ec8ff', enojado: '#ff6b5b', asustado: '#c9a2ff', cansado: '#cbbbe8' };
  const quiz = createQuiz({ burst: (x, y, cols) => burst('star', x, y, 8, cols, { up: true }), teacher: (n) => teacherAct(n, 1.2) });
  function askQuestion(s) {
    lastQ = G.time;
    quiz.open(s, [makeQuestion(s, students)], () => {
      for (const t of awake()) if (t !== s) act(t, 'clap', 1.2);
      sfx.clap(5, 0.8);
    }, LD.Q_INTRO);
  }
  // ---------------------------------------------------------------- behaviour cards
  function giveCard(s, color) {
    s.card = color; s.cardT = G.time;
    if (color === 'red') redToday = true;
    if (s.sleep) { s.sleep = false; s.sleepT = rand(25, 45); }
    if (s.hide > 0) { s.hide = 0; s.hideT = rand(40, 60); }
    if (color === 'green') {
      s.naughty = null;
      act(s, 'wiggle', 1.6); hop(s, 70); sfx.sparkle();
      burst('spark', ...headPos(s), 8, ['#3cb44b', '#a6e69a', '#ffd23f'], { sp: 60 });
      speak(s, LD.CARD_LINES.thanks, 'yay'); teacherAct('clap', 1.2);
    } else {
      s.naughty = null; s.bubble = null;
      act(s, 'sorry', 2.4); sfx.boing();
      speak(s, LD.CARD_LINES.sorry, 'here');
      for (const t of awake()) if (t !== s && !t.act) act(t, 'gasp', 0.8);
      teach.pointRight = s.mode === 'seated' ? desks[s.desk].x > furn.teacher.x : s.x > furn.teacher.x; teacherAct('point', 1.2);
      if (s.kind === 'puppy' && (s.mode === 'stand' || s.mode === 'walk') && !centros) wait(1.2).then(() => sendToSeat(s));
    }
  }
  function naughtyTick(dt, calm) {
    if (calm && !busy && !story && !recess && !centros) {
      naughtyT -= dt;
      if (naughtyT < 0) {
        naughtyT = rand(55, 90);
        const c = students.filter(s => s.mode === 'seated' && s.here && !s.sleep && !(s.hide > 0) && !s.mood && !s.naughty && (LD.NAUGHTY_LINES[s.kind] || s.kind === 'turtle'));
        if (c.length) { const s = pick(c); s.naughty = { until: G.time + 22, next: 0 }; }
      }
    }
    for (const s of students) {
      const n = s.naughty;
      if (!n || s.kind === 'puppy') continue;
      if (G.time > n.until || s.mode !== 'seated') { s.naughty = null; if (s.bubble && s.bubble.kind === 'bang') s.bubble = null; continue; }
      if (G.time < n.next || quiz.active) continue;
      n.next = G.time + rand(2, 3.2);
      talk(s, 'bang', 2.4);
      if (s.kind === 'frog') { act(s, 'giggle', 1.6); sfx.giggle(1.35, 7); if (Math.random() < 0.45) speak(s, LD.NAUGHTY_LINES.frog, 'giggle'); }
      if (s.kind === 'owl') { act(s, 'cheer', 1.2); hop(s, 70); if (Math.random() < 0.55) speak(s, LD.NAUGHTY_LINES.owl, 'yay'); }
      if (s.kind === 'bunny') { act(s, 'wave', 1.6); s.look = Math.random() < 0.5 ? -1 : 1; if (Math.random() < 0.45) speak(s, LD.NAUGHTY_LINES.bunny, 'here'); }
      if (s.kind === 'turtle') shellPlay(s);
    }
  }

  // ---------------------------------------------------------------- centros
  const C_ICONS = [() => DC.trayIcon('palette'), S.ICONS.book, () => DC.trayIcon('aa'), S.ICONS.toys];
  function centerSpot(ci, k, n) {
    const W = V.W;
    let x, y;
    if (ci === 0) { x = clamp(L.board.x + L.board.w + 16, 20, W - 40); y = L.floorTop + 16; }
    if (ci === 1) { x = furn.rug.x; y = furn.rug.y - 12; }
    if (ci === 2) { x = furn.abc.x; y = L.floorTop + 14; }
    if (ci === 3) { x = furn.shapetable.x; y = furn.shapetable.y - 20; }
    return { x: clamp(x + (k - (n - 1) / 2) * 18, 14, W - 14), y: clamp(y, L.floorTop + 12, V.H - 4) };
  }
  function openCentrosChart() {
    const assign = {};
    students.forEach((s, i) => { assign[s.kind] = i % 4; });
    centros = { stage: 'chart', assign, drag: null };
    sfx.chime();
  }
  function centrosLayout() {
    const pw = Math.min(V.W - 16, 250), ph = Math.min(V.H - 16, 170);
    const P = { x: Math.round(V.W / 2 - pw / 2), y: Math.round(V.H / 2 - ph / 2), w: pw, h: ph };
    const cw = Math.floor((pw - 16) / 4);
    const cols = [0, 1, 2, 3].map(ci => ({ ci, x: P.x + 8 + ci * cw, y: P.y + 8, w: cw - 4, h: ph - 52 }));
    const start = { x: P.x + pw / 2 - 18, y: P.y + ph - 40, w: 36, h: 32 };
    return { P, cols, start };
  }
  function faceRects() {
    const { cols } = centrosLayout(), out = [];
    for (const col of cols) {
      const ks = students.filter(s => centros.assign[s.kind] === col.ci);
      ks.forEach((s, j) => out.push({ s, x: col.x + col.w / 2 - 13, y: col.y + 30 + j * 30, w: 26, h: 26 }));
    }
    return out;
  }
  function drawCentrosChart(c) {
    const { W, H } = V, { P, cols, start } = centrosLayout();
    c.fillStyle = 'rgba(40,30,60,0.45)'; c.fillRect(0, 0, W, H);
    R(c, P.x - 2, P.y - 2, P.w + 4, P.h + 4, '#5f86b8'); R(c, P.x, P.y, P.w, P.h, '#dfeefc');
    const colsC = ['#ef6f6c', '#64a8e8', '#ffd23f', '#7dd370'];
    for (const col of cols) {
      R(c, col.x, col.y, col.w, col.h, '#fffaf0'); R(c, col.x, col.y, col.w, 26, colsC[col.ci]);
      for (let yy = col.y + 56; yy < col.y + col.h; yy += 30) R(c, col.x + 3, yy, col.w - 6, 2, '#c9dff2'); // pockets
      D(c, scaled(C_ICONS[col.ci](), 1), col.x + col.w / 2 - 9, col.y + 4);
    }
    for (const f of faceRects()) {
      if (centros.drag && centros.drag.s === f.s) continue;
      D(c, scaled(miniFace(f.s.kind, true), 2), f.x, f.y);
    }
    if (centros.drag) D(c, scaled(miniFace(centros.drag.s.kind, true), 2), centros.drag.x - 13, centros.drag.y - 13);
    const k = Math.sin(G.time * 5) > 0.3 ? 1 : 0;
    D(c, btnFrame(start.w, start.h, k ? '#fff6c8' : '#fff3dc', 'cstart'), start.x, start.y - k);
    D(c, cached('bellicon', bellIcon), start.x + 9, start.y + 7 - k);
    const bk = chartBack();
    D(c, btnFrame(26, 26), bk.x, bk.y); D(c, S.ICONS.back(), bk.x + 4, bk.y + 3);
  }
  function chartBack() { const { P } = centrosLayout(); return { x: Math.max(V.inset.l + 2, P.x - 12), y: Math.max(V.inset.t + 2, P.y - 12), w: 26, h: 26 }; }
  function runCentros() {
    centros.stage = 'run'; phase = 'activity'; calmMoods();
    speak(students[3], LD.CENTRO_LINES.start, 'yay'); sfx.bell();
    for (const s of students) { s.sleep = false; s.hide = 0; s.snack = null; s.naughty = null; }
    sendToCenters();
  }
  function sendToCenters() {
    for (let ci = 0; ci < 4; ci++) {
      const ks = students.filter(s => centros.assign[s.kind] === ci && s.mode !== 'away');
      ks.forEach((s, k) => {
        if (s.mode === 'seated') { Object.assign(s, seat(s)); s.mode = 'stand'; }
        const p = centerSpot(ci, k, ks.length);
        s.center = ci; s.centerT = rand(2, 4);
        walkTo(s, p.x, p.y, 48).then(() => { s.look = 0; });
      });
    }
  }
  function rotateCentros() {
    for (const s of students) centros.assign[s.kind] = (centros.assign[s.kind] + 1) % 4;
    speak(students[4], LD.CENTRO_LINES.change, 'yay'); sfx.ding(988);
    sendToCenters();
  }
  async function endCentros() {
    centros = null; busy = true;
    for (const s of students) s.center = undefined;
    sfx.ding(784);
    await gatherSeats();
    busy = false; phase = 'class';
  }
  function centrosTick(dt) {
    if (!centros || centros.stage !== 'run') return;
    for (const s of students) {
      if (s.center === undefined || s.mode !== 'stand') continue;
      s.centerT -= dt;
      if (s.centerT > 0) continue;
      s.centerT = rand(2.5, 4.5);
      const [hx, hy] = headPos(s);
      if (s.center === 0) { act(s, 'paint', 1.6); burst('confetti', hx + 8, hy + 14, 4, ['#ef4b4b', '#ffd23f', '#2f7de1', '#3cb44b'], { sp: 25, g: 40 }); }
      if (s.center === 1) { act(s, 'look', 1.6); if (Math.random() < 0.4) sfx.page(); }
      if (s.center === 2) { act(s, 'raise', 1.4); burst('spark', hx + 10, hy - 4, 2, ['#ef5b5b', '#2f7de1']); }
      if (s.center === 3) { act(s, 'clap', 1.2); burst('crumb', hx, hy + 18, 5, ['#ef6f6c', '#64a8e8', '#ffd23f', '#7dd370'], { up: true, sp: 35, g: 120 }); }
      if (Math.random() < 0.12) speak(s, LD.CENTERS[s.center].line, 'yay');
    }
  }
  function centerSigns() {
    if (!centros || centros.stage !== 'run') return [];
    return [0, 1, 2, 3].map(ci => { const p = centerSpot(ci, 0, 1); return { ci, x: p.x - 11 + (ci === 3 ? 26 : ci === 1 ? -34 : 22), y: p.y - 58, w: 22, h: 22 }; });
  }
  function drawCenterProps(c) {
    if (!centros || centros.stage !== 'run') return;
    const p0 = centerSpot(0, 0, 1);
    const easel = DC.decor('easel', 1); D(c, easel, p0.x + 24 - easel.width / 2, p0.y + 4 - easel.height);
    for (const sg of centerSigns()) {
      R(c, sg.x + 10, sg.y + 20, 2, 10, '#a8703f');
      D(c, btnFrame(sg.w, sg.h, ['#ffd8d6', '#d6eaff', '#fff2b8', '#dff5d6'][sg.ci], 'sign' + sg.ci), sg.x, sg.y + Math.round(Math.sin(G.time * 3 + sg.ci)));
      const ic = C_ICONS[sg.ci](); D(c, ic, sg.x + 2, sg.y + 2 + Math.round(Math.sin(G.time * 3 + sg.ci)));
    }
  }

  function helpFeelings(s) {
    quiz.open(s, feelingsSteps(s), (o) => {
      s.mood = null; s.bubble = null;
      act(s, 'wiggle', 1.6); hop(s, 70); sfx.chime();
      burst('heart', ...headPos(s), 6, ['#ff6f91', '#ff9ec4'], { up: true, sp: 45 });
      if (o && o.help === 'agua') burst('bubble', ...headPos(s), 5, ['#fff'], { up: true });
      for (const t of awake()) if (t !== s) act(t, 'clap', 1.2);
      teacherAct('cheer', 1.2);
    });
  }
  let T = null; // tray layout
  const teach = { act: null, z: 0, vz: 0, blinkT: 2, blink: 0, pointRight: true };
  function teacherAct(name, dur = 1.2) { teach.act = { name, t0: G.time, dur }; }
  function teacherPose() {
    const t = G.time;
    const a = teach.act && t < teach.act.t0 + teach.act.dur ? teach.act : null;
    const st = { eyes: teach.blink > 0 ? 'blink' : 'happy', mouth: 'grin', armL: 'down', armR: 'down', feet: 0, sway: Math.floor(t * 1.2) % 2 };
    let flip = false;
    if (a) {
      const k = t - a.t0, alt = (hz) => Math.floor(k * hz) % 2 === 0;
      if (a.name === 'wave') { st.armL = alt(5) ? 'wave1' : 'wave2'; st.mouth = 'open'; }
      if (a.name === 'clap') { st.armL = st.armR = alt(7) ? 'clap' : 'front'; st.mouth = 'open'; }
      if (a.name === 'point') { st.armL = 'point'; st.eyes = 'open'; st.mouth = alt(3) ? 'open' : 'grin'; flip = teach.pointRight; }
      if (a.name === 'twirl') { flip = alt(8); st.armL = st.armR = 'up'; st.mouth = 'open'; }
      if (a.name === 'cheer') { st.armL = st.armR = 'up'; st.mouth = 'open'; }
    }
    return { st, flip };
  }

  // ---------------------------------------------------------------- layout
  function resize() {
    V = makeView(200, 300);
    const { W, H } = V;
    L.wallH = Math.round(H * 0.43);
    L.floorTop = L.wallH;
    L.floorH = H - L.wallH;
    L.board = { x: Math.round(W / 2 - 52), y: 12, w: 104, h: 64 };
    L.door = { x: 12, y: L.wallH - 52, w: 28, h: 52 };
    L.win = { x: W - 86, y: 22, w: 50, h: 40 };
    L.clock = { x: Math.round((L.door.x + L.door.w + L.board.x) / 2), y: 50 };
    L.doorPt = { x: L.door.x + 14, y: L.floorTop + 5 };
    for (const f of Object.values(furn)) place(f);
    const i = V.inset, B = 26;
    btns = [
      { id: 'stickers', x: i.l + 4, y: i.t + 4, w: B, h: B, icon: S.ICONS.stickers },
      { id: 'home', x: V.W - i.r - B - 4, y: i.t + 4, w: B, h: B, icon: S.ICONS.home },
      { id: 'bell', x: V.W - i.r - B - 4, y: i.t + 4, w: B, h: B, icon: () => DC.trayIcon('bell') },
      { id: 'help', x: V.W - i.r - 3 * B - 12, y: i.t + 4, w: B, h: B, icon: () => S.bubble('q') }, // a gap away from 🏠
      { id: 'decorate', x: i.l + 4, y: V.H - i.b - B - 4, w: B, h: B, icon: () => DC.trayIcon('decorate') },
      { id: 'toys', x: i.l + 4 + B + 4, y: V.H - i.b - B - 4, w: B, h: B, icon: S.ICONS.toys },
      { id: 'star', x: V.W - i.r - B - 4, y: V.H - i.b - B - 4, w: B, h: B, icon: S.ICONS.star },
      { id: 'cardGreen', x: V.W - i.r - 2 * B - 8, y: V.H - i.b - B - 4, w: B, h: B, icon: () => DC.trayIcon('cardGreen') },
      { id: 'cardRed', x: V.W - i.r - 3 * B - 12, y: V.H - i.b - B - 4, w: B, h: B, icon: () => DC.trayIcon('cardRed') },
      { id: 'cdone', x: i.l + 4 + 2 * (B + 4), y: V.H - i.b - B - 4, w: B, h: B, icon: S.ICONS.check },
    ];
    btns.push({ id: 'jobs', x: i.l + 4 + 3 * (B + 4), y: V.H - i.b - B - 4, w: B, h: B, icon: jobsButtonIcon }); // Ayudantes chart
    const db = btns.find(b => b.id === 'decorate');
    T = { x: db.x + db.w + 3, y: V.H - i.b - 52, h: 50 };
    T.w = V.W - i.r - 2 - T.x;
    L.chart = { x: i.l + 34, y: i.t + 7 };
    layoutAbc();
    bg = drawBg();
    return V;
  }
  function place(f) {
    if (f.type === 'teacher' && f.fx < 0) f.fx = (L.door.x + L.door.w + 17) / V.W;
    if (f.type === 'abc' && f.fx < 0) { f.fx = ((L.door.x + L.door.w + L.board.x) / 2 + 4) / V.W; f.fy = (L.wallH - 22) / L.wallH; }
    if (f.type === 'shapetable' && f.fx < 0) { f.fx = 0.8; f.fy = 0.72; }
    if (f.type === 'calendar' && f.fx < 0) { f.fx = (V.W - V.inset.r - 20) / V.W; f.fy = (L.wallH - 24) / L.wallH; }
    const [w] = sizeOf(f);
    f.x = clamp(Math.round(f.fx * V.W), w / 2 + 2, V.W - w / 2 - 2);
    if (layerOf(f) === 'wall') { f.y = Math.round(f.fy * L.wallH); clampItem(f); return; }
    f.y = Math.round(L.floorTop + f.fy * L.floorH);
    clampItem(f);
  }
  function clampItem(f) {
    const [w, h] = sizeOf(f);
    f.x = clamp(f.x, w / 2 + 2, V.W - w / 2 - 2);
    if (layerOf(f) === 'wall') f.y = clamp(f.y, h + 4, L.wallH - 20);
    else f.y = clamp(f.y, L.floorTop + (f.type === 'rug' ? 22 : f.type === 'shelf' ? 8 : 12), V.H - 2);
  }
  function remember(f) {
    if (layerOf(f) === 'wall') { f.fx = f.x / V.W; f.fy = f.y / L.wallH; }
    else { f.fx = f.x / V.W; f.fy = (f.y - L.floorTop) / L.floorH; }
    if (f.deco) saveDecor();
    else G.save.furniture[f.id] = [+f.fx.toFixed(4), +f.fy.toFixed(4)];
    persist();
  }
  function saveDecor() {
    G.save.decor = Object.values(furn).filter(f => f.deco).map(f => ({ t: f.type, fx: +f.fx.toFixed(4), fy: +f.fy.toFixed(4), v: f.v }));
    G.save.decorStamp++;
    persist();
  }
  function seat(s) { const d = desks[s.desk]; return { x: d.x, y: d.y - 13 }; }

  // ---------------------------------------------------------------- background (static, cached per size)
  function drawBg() {
    const { W, H } = V;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const wh = L.wallH;
    const [wa, wb] = DC.WALLS[G.save.paint.wall] || DC.WALLS[0];
    const [fa, fb, fs] = DC.FLOORS[G.save.paint.floor] || DC.FLOORS[0];
    R(c, 0, 0, W, wh, wa);
    for (let x = 2; x < W; x += 9) R(c, x, 3, 3, wh - 22, wb);
    for (let x = 6; x < W; x += 18) for (let y = 10; y < wh - 24; y += 14) { R(c, x, y, 1, 1, '#f9c8b0'); R(c, x + 9, y + 7, 1, 1, '#cde3c8'); }
    R(c, 0, 0, W, 3, '#e3c592'); R(c, 0, 3, W, 1, '#fff3d9');
    R(c, 0, wh - 20, W, 20, '#bfe0d0');
    R(c, 0, wh - 21, W, 2, '#8fc0a9'); R(c, 0, wh - 22, W, 1, '#d9f0e4');
    for (let x = 3; x < W; x += 22) { R(c, x, wh - 16, 17, 10, '#cfeadc'); R(c, x, wh - 6, 17, 1, '#a3cdb9'); R(c, x + 17, wh - 16, 1, 11, '#a3cdb9'); }
    R(c, 0, wh - 4, W, 4, '#8c5a3c'); R(c, 0, wh - 4, W, 1, '#a8714a');
    // floor planks
    for (let y = wh, r = 0; y < H; y += 7, r++) {
      R(c, 0, y, W, 7, r % 2 ? fb : fa);
      R(c, 0, y + 6, W, 1, fs);
      for (let x = (r * 23) % 44; x < W; x += 44) R(c, x, y, 1, 6, mix(fa, fs, 0.6));
      for (let x = (r * 37) % 31; x < W; x += 31) R(c, x + 5, y + 2, 2, 1, lighten(fa, 0.25));
    }
    R(c, 0, wh, W, 2, fs);
    // sun patch from the window
    for (let j = 0; j < 46; j++) {
      const y = wh + 2 + j; if (y >= H) break;
      const x0 = L.win.x - 14 - j * 0.9;
      c.fillStyle = `rgba(255,240,190,${RT.sunPatch()})`; c.fillRect(Math.round(x0), y, 46 + Math.round(j * 0.3), 1);
    }
    // pennant banner
    const bx0 = L.board.x - 6, bx1 = Math.min(L.win.x - 4, W - 36);
    const cols = ['#ef6f6c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6', '#ff9ec4'];
    for (let x = bx0, k = 0; x < bx1 - 6; x += 10, k++) {
      const col = cols[k % cols.length];
      for (let j = 0; j < 7; j++) R(c, x + j * 0.5, 5 + j, 8 - j, 1, col);
      R(c, x + 1, 5, 6, 1, lighten(col, 0.4));
    }
    R(c, bx0 - 2, 4, bx1 - bx0, 1, '#a06a44');
    // poster between board and window when there is room
    const gap = L.win.x - (L.board.x + L.board.w);
    if (gap > 40) {
      const px = L.board.x + L.board.w + Math.round(gap / 2) - 13, py = 24;
      R(c, px, py, 26, 32, '#fffaf0'); R(c, px, py + 31, 26, 1, '#d8c7a8');
      const sh = [['#ef6f6c', 3, 4], ['#ffd23f', 14, 4], ['#64a8e8', 3, 17], ['#7dd370', 14, 17]];
      for (const [col, ox, oy] of sh) R(c, px + ox, py + oy, 9, 9, col);
      R(c, px + 12, py - 1, 2, 2, '#ef6f6c');
    }
    // cubbies under the clock-side wall
    return cv;
  }

  // ---------------------------------------------------------------- live wall pieces
  function drawWindow(c) {
    const w = L.win, t = G.time;
    R(c, w.x - 3, w.y - 3, w.w + 6, w.h + 6, '#fffaf0');
    R(c, w.x - 3, w.y + w.h + 3, w.w + 6, 1, '#d8c7a8');
    const skies = { morning: ['#a8dcff', '#d6f0ff'], day: ['#8fd0ff', '#c6ebff'], sunset: ['#ff9f7a', '#ffd29a'], night: ['#202650', '#3a3f78'] };
    const [s0, s1] = skies[sky];
    for (let y = 0; y < w.h; y++) R(c, w.x, w.y + y, w.w, 1, y < w.h * 0.55 ? s0 : s1);
    if (sky === 'night') {
      D(c, cached('winmoon', () => { const p = new Pix(11, 11); p.ball(5, 5.5, 4.6, 4.6, '#ffe58a', { hi: false }); p.ell(7.5, 3.8, 3.6, 3.6, 0); p.px(3, 5, '#2b1d2e'); return p.canvas(); }), w.x + 33, w.y + 4);
      for (const [x, y] of [[6, 5], [14, 14], [24, 6], [44, 20], [9, 24]]) R(c, w.x + x, w.y + y, 1, 1, Math.floor(t * 2 + x) % 3 ? '#fff6b8' : '#8f93c8');
    } else if (!RT.windowSky(c, w, sky)) { // cloudy / rainy / snowy days draw their own sky
      const sy = sky === 'sunset' ? 24 : 8;
      R(c, w.x + 36, w.y + sy, 8, 8, '#ffe066'); R(c, w.x + 35, w.y + sy + 1, 10, 6, '#ffe066'); R(c, w.x + 37, w.y + sy + 1, 2, 2, '#fff6c0');
      for (let k = 0; k < 2; k++) {
        const cx = w.x + ((t * (2 + k) + k * 30) % (w.w + 30)) - 15, cy = w.y + 8 + k * 9;
        c.save(); c.beginPath(); c.rect(w.x, w.y, w.w, w.h); c.clip();
        R(c, cx, cy, 14, 4, '#ffffff'); R(c, cx + 3, cy - 2, 7, 2, '#ffffff'); R(c, cx + 1, cy + 4, 12, 1, '#e3f3ff');
        c.restore();
      }
    }
    // hills + tree outside
    R(c, w.x, w.y + w.h - 8, w.w, 8, sky === 'night' ? '#2f5a47' : '#7dc96b');
    R(c, w.x + 6, w.y + w.h - 18, 9, 10, sky === 'night' ? '#244a3a' : '#4fae45'); R(c, w.x + 9, w.y + w.h - 9, 3, 4, '#8a5730');
    RT.windowFront(c, w); // rain / snow
    // mullions
    R(c, w.x + w.w / 2 - 1, w.y, 2, w.h, '#fffaf0'); R(c, w.x, w.y + w.h / 2 - 1, w.w, 2, '#fffaf0');
    // curtains
    for (const [x, d] of [[w.x - 7, 1], [w.x + w.w - 1, -1]]) {
      R(c, x, w.y - 5, 8, w.h + 12, '#ff9ec4');
      for (let k = 0; k < 3; k++) R(c, x + 1 + k * 2 + (d < 0 ? 1 : 0), w.y - 5, 1, w.h + 12, '#ef7fae');
      R(c, x, w.y + w.h - 2, 8, 2, '#ffd23f');
    }
    R(c, w.x - 10, w.y - 7, w.w + 20, 2, '#a06a44');
    // sill + little pot
    R(c, w.x - 5, w.y + w.h + 3, w.w + 10, 3, '#e9d7b4');
    R(c, w.x + 4, w.y + w.h - 2, 7, 5, '#e0805a'); R(c, w.x + 5, w.y + w.h - 6, 2, 4, '#62b95e'); R(c, w.x + 8, w.y + w.h - 7, 2, 5, '#4fae45'); R(c, w.x + 6, w.y + w.h - 8, 3, 2, '#ff8fb8');
  }
  function clockFace() {
    return cached('clock', () => {
      const p = new Pix(19, 19);
      p.ell(9.5, 9.5, 9.5, 9.5, '#ef6f6c'); p.ell(9.5, 9.5, 7.6, 7.6, '#fffaf0');
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; p.px(9.5 + Math.cos(a) * 6.4 - 0.5, 9.5 + Math.sin(a) * 6.4 - 0.5, k % 3 ? '#d8c7a8' : '#7a5b6a'); }
      p.px(7, 4, '#ffffff'); p.px(6, 5, '#ffffff');
      p.outline();
      return p.canvas();
    });
  }
  function drawClock(c) {
    const x = L.clock.x - 9, y = L.clock.y - 9;
    D(c, clockFace(), x, y);
    const d = new Date();
    const hand = (ang, len, col) => {
      for (let r = 0; r <= len; r += 0.5) R(c, L.clock.x + 0.5 + Math.sin(ang) * r - 0.5, L.clock.y + 0.5 - Math.cos(ang) * r - 0.5, 1, 1, col);
    };
    hand((d.getHours() % 12 + d.getMinutes() / 60) * Math.PI / 6, 3.5, '#2b1d2e');
    hand(d.getMinutes() * Math.PI / 30, 5.5, '#5a4560');
    R(c, L.clock.x, L.clock.y, 1, 1, '#ef6f6c');
  }
  function drawDoor(c) {
    const d = knockShift(L.door);
    R(c, d.x - 3, d.y - 3, d.w + 6, d.h + 3, '#a8703f'); R(c, d.x - 3, d.y - 3, d.w + 6, 1, '#c98c55');
    if (doorOpen > 0.5) {
      R(c, d.x, d.y, d.w, d.h, '#4a3b5c');
      R(c, d.x, d.y + d.h - 10, d.w, 10, '#6d5a7d');
      R(c, d.x + 4, d.y + 6, d.w - 8, 14, '#ffe9b8'); // hallway light
      R(c, d.x - 2, d.y, 5, d.h, '#c27c48'); R(c, d.x - 2, d.y, 1, d.h, '#dc985f');
    } else {
      R(c, d.x, d.y, d.w, d.h, '#c27c48');
      R(c, d.x + 3, d.y + 4, d.w - 6, 14, '#bfe6ff'); R(c, d.x + 3, d.y + 4, d.w - 6, 1, '#8fc6ea');
      R(c, d.x + 5, d.y + 6, 3, 2, '#ffffff');
      R(c, d.x + 4, d.y + 24, d.w - 8, 10, '#b06c3c'); R(c, d.x + 4, d.y + 37, d.w - 8, 11, '#b06c3c');
      R(c, d.x + 4, d.y + 24, d.w - 8, 1, '#d48e58'); R(c, d.x + 4, d.y + 37, d.w - 8, 1, '#d48e58');
      R(c, d.x + d.w - 6, d.y + 30, 3, 3, '#ffd23f'); R(c, d.x + d.w - 6, d.y + 30, 1, 1, '#fff6b8');
    }
    // welcome sign: a heart
    const hp = cached('doorheart', () => { const p = new Pix(11, 10); S.heartPix(p, 1, 1); p.outline(); return p.canvas(); });
    D(c, hp, d.x + d.w / 2 - 5, d.y - 14);
  }
  function drawBoard(c) {
    const b = L.board;
    R(c, b.x - 1, b.y - 1, b.w + 2, b.h + 2, '#6f7b8f');
    R(c, b.x, b.y, b.w, b.h, '#c9d3df'); R(c, b.x, b.y, b.w, 1, '#eef3f8');
    R(c, b.x + 3, b.y + 3, b.w - 6, b.h - 6, '#9aa7b8');
    c.imageSmoothingEnabled = true;
    c.drawImage(hooks.boardCanvas(), b.x + 4, b.y + 4, 96, 54);
    c.imageSmoothingEnabled = false;
    // tray + markers
    R(c, b.x - 4, b.y + b.h, b.w + 8, 3, '#b3bfcd'); R(c, b.x - 4, b.y + b.h + 3, b.w + 8, 1, '#7d899c');
    const mc = ['#ef4b4b', '#2f7de1', '#3cb44b'];
    mc.forEach((col, k) => { R(c, b.x + 8 + k * 9, b.y + b.h - 1, 7, 2, col); R(c, b.x + 13 + k * 9, b.y + b.h - 1, 2, 2, '#fffaf0'); });
    R(c, b.x + b.w - 20, b.y + b.h - 2, 10, 3, '#ff9ec4');
    // gentle "tap me" hint
    if (phase === 'class' && hintT < 1.2) {
      const bob = Math.round(Math.sin(G.time * 10) * 2);
      const pen = cached('hintpen', () => { const p = new Pix(14, 14); for (let k = 0; k < 9; k++) { p.px(3 + k, 10 - k, '#ef4b4b'); p.px(4 + k, 10 - k, '#ef4b4b'); p.px(3 + k, 9 - k, '#ff8080'); } p.px(2, 11, '#2b1d2e'); p.px(3, 11, '#2b1d2e'); p.outline(); return p.canvas(); });
      D(c, pen, b.x + b.w - 16, b.y + 20 + bob);
    }
  }

  // ---------------------------------------------------------------- particles
  function burst(kind, x, y, n, colors, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = opts.up ? rand(-2.6, -0.5) : rand(0, Math.PI * 2);
      const sp = rand(opts.spMin ?? 20, opts.sp ?? 60);
      parts.push({ kind, color: pick(colors), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: opts.g ?? 60, life: rand(0.6, 1.1) * (opts.life ?? 1), t: 0 });
    }
  }
  function floatUp(kind, color, x, y, life = 1.4) { parts.push({ kind, color, x, y, vx: rand(4, 9), vy: -14, g: 0, life, t: 0, wob: true }); }

  // ---------------------------------------------------------------- student placement helpers
  function spriteRect(s) {
    if (s.mode === 'seated') { const d = desks[s.desk]; return { x: d.x - S.SW / 2, y: d.y - 15 - S.SH }; }
    return { x: s.x - S.SW / 2, y: s.y - S.SH };
  }
  function hitStudent(x, y) {
    const order = students.filter(s => s.mode !== 'away').sort((a, b) => sortY(b) - sortY(a));
    for (const s of order) {
      const r = spriteRect(s);
      const top = r.y + (s.kind === 'turtle' && s.hide > 0 ? 14 : 6) - s.z;
      const bottom = s.mode === 'seated' ? r.y + S.SH - 6 : r.y + S.SH;
      if (x >= r.x + 5 && x <= r.x + S.SW - 5 && y >= top && y <= bottom - s.z) return s;
    }
    return null;
  }
  function sortY(s) { return s.mode === 'seated' ? desks[s.desk].y : s.y; }
  function hitFurn(x, y) {
    const key = (f) => (f.type === 'rug' ? -1e5 : layerOf(f) === 'wall' ? -1e4 + f.y : f.y);
    const list = Object.values(furn).sort((a, b) => key(b) - key(a));
    for (const f of list) {
      const [w, h] = sizeOf(f);
      const top = f.type === 'desk' ? f.y - h + 2 : f.y - h;
      if (x >= f.x - w / 2 && x <= f.x + w / 2 && y >= top && y <= f.y) {
        if (f.type === 'rug') { const dx = (x - f.x) / (w / 2), dy = (y - (f.y - h / 2)) / (h / 2); if (dx * dx + dy * dy > 1) continue; }
        return f;
      }
    }
    return null;
  }
  const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const awake = () => students.filter(s => s.mode !== 'away' && !s.sleep && !(s.hide > 0));

  // ---------------------------------------------------------------- tapping students
  function tapStudent(s) {
    hintT = Math.min(hintT, 8);
    if (doorTapStudent(s)) return;
    if (s.mode === 'walk') { hop(s, 60); sfx.boing(); return; }
    if (coax(s)) {
      if (!s.here && s.hide > 0) { // shy turtle peeks out: a moment later she comes all the way out and says ¡Presente!
        s.here = true;
        wait(0.6).then(() => { if (s.hide > 0) { s.hide = 0; s.hideT = rand(30, 50); sfx.boing(); } s.here = false; markHere(s, 0); });
      } else if (!s.here && !s.sleep && !(s.hide > 0)) markHere(s, 0.5);
      return;
    }
    if (!s.here) { markHere(s, 0); return; }
    if (s.mood && (s.mode === 'seated' || s.mode === 'stand')) { helpFeelings(s); return; }
    if (s.kind === 'puppy' && s.mode === 'stand' && !story && !recess) { // wandering puppy goes back to his seat
      hop(s, 70); sfx.woof(); talk(s, 'heart', 1.2);
      wait(0.5).then(() => sendToSeat(s));
      return;
    }
    if (acting(s, 'raise') && (s.kind !== 'owl' || (G.time - lastQ > 10 && Math.random() < 0.75))) { askQuestion(s); return; } // a rare raised paw is always a question
    if (acting(s, 'raise')) {
      act(s, 'cheer', 1.2); hop(s, 85); sfx.cheer(1.2); speak(s, randomCheer(), 'yay');
      burst('star', ...headPos(s), 6, ['#ffd23f', '#ff9ec4', '#7ec8ff'], { up: true });
      return;
    }
    if (tapEscalate(s, { burst: (k, n, cols, o) => burst(k, ...headPos(s), n, cols, o), neighbours: awake })) { s.tapCount++; return; }
    s.tapCount++;
    if (s.kind === 'frog') { act(s, 'giggle', 1.2); sfx.giggle(1.3, 6); burst('note', ...headPos(s), 3, ['#7a5bc0', '#ff6f91'], { up: true }); return; }
    act(s, 'happy', 0.9); hop(s, 70); animalSound(s);
    burst('heart', ...headPos(s), 2, ['#ff6f91', '#ff9ec4'], { up: true, sp: 30 });
  }
  function headPos(s) { const r = spriteRect(s); return [r.x + S.SW / 2, r.y + 10 - s.z]; }
  function markHere(s, delay) {
    s.here = true;
    wait(delay).then(() => {
      act(s, 'here', 1.3); hop(s, 55); talk(s, 'check', 1.6);
      speak(s, s.kind === 'turtle' ? 'here...' : 'Here!');
      burst('spark', ...headPos(s), 5, ['#7dd370', '#ffd23f']);
      if (students.every(t => t.here) && !attendanceDone) {
        attendanceDone = true;
        wait(1.4).then(() => {
          sfx.chime(); teacherAct('clap', 1.4);
          for (const t of awake()) { act(t, 'cheer', 1.3); hop(t, 60); }
          burst('confetti', V.W / 2, 30, 40, ['#ef6f6c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'], { sp: 90, g: 80, life: 1.6 });
        });
      }
    });
  }
  function sendToSeat(s) {
    const p = seat(s);
    walkTo(s, p.x, p.y, 46).then(() => { s.mode = 'seated'; s.look = 0; if (s.kind === 'puppy') s.naughty = null; });
  }
  // feelings can only be helped in class: an activity (or going back to the seats) clears them
  function calmMoods() {
    for (const s of students) if (s.mood) { s.mood = null; if (s.bubble && s.bubble.kind.startsWith('m:')) s.bubble = null; }
  }
  async function gatherSeats() {
    calmMoods();
    for (const s of students) if (s.mode !== 'seated' && s.mode !== 'away') sendToSeat(s);
    for (let i = 0; i < 60 && students.some(s => s.mode !== 'seated' && s.mode !== 'away'); i++) await wait(0.15);
  }

  // ---------------------------------------------------------------- gold star
  function awardStar(s) {
    if (s.sleep) { s.sleep = false; s.sleepT = rand(25, 45); }
    if (s.hide > 0) { s.hide = 0; s.hideT = rand(40, 60); }
    s.glowT = 2.2; s.stars++; teacherAct('clap', 1.3);
    G.save.stars[s.kind] = s.stars; persist();
    if (s.stars % 5 === 0) starOfWeek(s);
    act(s, 'wiggle', 2); hop(s, 80);
    sfx.sparkle(); speak(s, pick(['Thank you!', 'Yay! A star!', 'Wow!', 'I love it!']), 'yay');
    burst('spark', ...headPos(s), 12, ['#ffd23f', '#fff6b8', '#ffb020'], { sp: 70 });
    talk(s, 'star', 1.8);
    for (const t of awake()) if (t !== s && !t.act && Math.random() < 0.6) act(t, 'clap', 1.2);
    wait(0.3).then(() => sfx.clap(4, 0.8));
  }

  // ---------------------------------------------------------------- v1.9 alive: star of the week, all-green party, turtle shell, alphabet line
  let redToday = false, danceUntil = 0, crowning = false, lastAbc = 0;
  const abcPop = {};
  function starOfWeek(s) { // every 5th star: she walks up to Louise and gets a paper crown for the day
    if (crowning) return;
    crowning = true;
    wait(1.6).then(async () => {
      if (phase !== 'class' || s.mode === 'held' || s.mode === 'away') { crowning = false; G.save.crown = { kind: s.kind, day: G.save.day || 1 }; persist(); return; }
      if (s.mode === 'seated') { Object.assign(s, seat(s)); s.mode = 'stand'; }
      s.naughty = null; s.sleep = false; s.hide = 0;
      const t = furn.teacher, tx = clamp(t.x + 20, 14, V.W - 14), ty = clamp(t.y + 1, L.floorTop + 14, V.H - 3);
      sfx.fanfare(); hop(s, 70);
      await Promise.race([walkTo(s, tx, ty, 64), wait(5)]);
      if (s.mode !== 'stand' || phase !== 'class') { crowning = false; return; }
      s.look = -1; teach.pointRight = true; teacherAct('cheer', 1.6); teach.vz = 50;
      G.save.crown = { kind: s.kind, day: G.save.day || 1 }; persist();
      act(s, 'wiggle', 2.2); hop(s, 90); sfx.sparkle(); s.glowT = 2;
      burst('confetti', s.x, s.y - 50, 34, ['#ef6f6c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'], { sp: 80, g: 80, life: 1.5 });
      burst('star', s.x, s.y - 34, 6, ['#ffd23f', '#fff6b8'], { up: true });
      speak(s, LD.ALIVE_LINES.starWeek, 'yay');
      for (const o of awake()) if (o !== s) { act(o, 'cheer', 1.4); hop(o, rand(40, 70)); }
      wait(0.5).then(() => { sfx.cheer(1.1); sfx.clap(6, 1); });
      await wait(2.8);
      crowning = false;
      if (s.mode === 'stand' && phase === 'class') sendToSeat(s);
    });
  }
  function shellPlay(s) { // a naughty turtle plays with her shell: in, out, in, out... and hums
    s.hideT = Math.max(s.hideT, 12); s.hide = 1; sfx.hum();
    wait(0.3).then(() => { if (s.naughty) s.hide = 0; });
    wait(0.6).then(() => { if (s.naughty) s.hide = 1; });
    wait(0.95).then(() => { if (s.naughty) { s.hide = 0; act(s, 'giggle', 1); } });
    if (Math.random() < 0.45) wait(1).then(() => { if (s.naughty) speak(s, LD.ALIVE_LINES.shell, 'here'); });
  }
  async function allGreenParty() { // nobody got a red card today: a little dance (with recess music on viernes)
    const fri = dayIndex() === 4;
    speak(helper(), LD.ALIVE_OWL.allGreen, 'yay');
    for (const s of students) { s.cardT = G.time; burst('spark', desks[s.desk].x - 11, desks[s.desk].y - 10, 4, ['#3cb44b', '#a6e69a', '#ffd23f']); }
    await wait(2.2);
    if (fri) { danceUntil = G.time + 3.4; speak(helper(), LD.ALIVE_OWL.friday, 'yay'); await wait(1.1); }
    teacherAct('twirl', 0.9); teach.vz = 60;
    burst('confetti', V.W / 2, 24, 44, ['#ef6f6c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'], { sp: 90, g: 80, life: 1.7 });
    sfx.cheer(1.1);
    for (let b = 0; b < 4; b++) {
      for (const s of students) { act(s, 'wiggle', 0.6); wait(rand(0, 0.15)).then(() => hop(s, 55 + b * 8)); }
      if (b === 2) { teacherAct('cheer', 0.8); teach.vz = 50; }
      await wait(0.5);
    }
    sfx.clap(6, 0.8);
    await wait(0.6);
  }
  function drawChartExtras(c, s, x, y) {
    if (crowned(s)) D(c, cached('minicrown', () => { const p = new Pix(7, 5); p.map(1, 1, ['#.#.#', '#####', '#####'], { '#': '#ffd23f' }); p.px(3, 3, '#ef4b4b'); p.outline(); return p.canvas(); }), x + 3, y - 3);
    const n = s.stars % 5; // tally toward the next crown
    for (let j = 0; j < n; j++) { R(c, x + 1 + j * 3, y + 19, 2, 2, '#ffd23f'); R(c, x + 1 + j * 3, y + 20, 2, 1, '#e0a020'); }
  }
  // the alphabet line: a string of 27 little cards on the wall under the board
  const ABC_COLS = ['#ef5b5b', '#ff8a1e', '#d9a000', '#3cb44b', '#2f9e9e', '#2f7de1', '#8b4fd0', '#e0559a'];
  function layoutAbc() {
    const x0 = L.door.x + L.door.w + 32, x1 = V.W - V.inset.r - 56;
    const pitch = clamp(Math.floor((x1 - x0) / LETTERS.length), 6, 8), w = pitch * LETTERS.length;
    L.abc = { x: Math.round((x0 + x1) / 2 - w / 2), y: clamp(L.board.y + L.board.h + 1, L.wallH - 18, L.wallH - 9), pitch, w }; // under the board (short walls: over its tray)
  }
  const abcShown = () => (Array.isArray(G.save.abcShown) ? G.save.abcShown : []);
  function abcCardX(k) { return L.abc.x + k * L.abc.pitch; }
  function drawAbcLine(c) {
    const A = L.abc, shown = abcShown();
    R(c, A.x - 3, A.y, A.w + 4, 1, '#a06a44');
    LETTERS.forEach((ch, k) => {
      const pk = abcPop[ch] !== undefined ? G.time - abcPop[ch] : 9;
      const bob = pk >= 0 && pk < 0.6 ? -Math.round(Math.sin(pk / 0.6 * Math.PI) * 4) : 0;
      const col = shown.includes(ch) && pk >= 0 ? ABC_COLS[k % ABC_COLS.length] : null;
      const sway = Math.round(Math.sin(G.time * 1.3 + k * 0.7) * 0.4);
      if (pk >= 0 && pk < 0.6 && col) D(c, glow(S.abcCard(ch, col), '#fff6b8', 'abcg' + ch), abcCardX(k) - 2 + sway, A.y + bob);
      D(c, S.abcCard(ch, col), abcCardX(k) - 1 + sway, A.y + 1 + bob);
    });
  }
  function abcAt(x, y) {
    const A = L.abc;
    if (!A || y < A.y - 2 || y > A.y + 12 || x < A.x - 2 || x > A.x + A.w) return null;
    return LETTERS[clamp(Math.floor((x - A.x + 1) / A.pitch), 0, LETTERS.length - 1)];
  }
  function tapAbc(ch) { // a friend reads the card: "¡A de arcoíris!"
    if (G.time - lastAbc < 0.5) return;
    lastAbc = G.time;
    const k = LETTERS.indexOf(ch), x = abcCardX(k) + 2;
    abcPop[ch] = G.time; sfx.pop(1.3);
    const lit = abcShown().includes(ch);
    burst('spark', x, L.abc.y + 4, lit ? 6 : 3, lit ? [ABC_COLS[k % ABC_COLS.length], '#ffd23f'] : ['#ffffff', '#ffd23f'], { sp: 30 });
    const aw = awake().filter(s => s.here);
    const t = aw.length ? pick(aw) : helper();
    if (t.mode === 'seated' && !t.act) act(t, 'raise', 1.2);
    wait(0.15).then(() => speak(t, letterSentence(ch), 'here'));
  }
  async function abcMorning() { // letters she traced pop onto the line the next morning
    const traced = G.save.traced || {}, shown = abcShown().slice();
    const fresh = LETTERS.filter(ch => traced[ch] && !shown.includes(ch));
    if (!fresh.length) return;
    const vowels = ['A', 'E', 'I', 'O', 'U'], hadVowels = vowels.every(v => shown.includes(v));
    for (const ch of fresh) abcPop[ch] = G.time + 999; // blank until their turn
    shown.push(...fresh); G.save.abcShown = shown;
    await hw(0.3);
    speak(helper(), LD.ALIVE_OWL.newLetter, 'yay');
    teach.pointRight = L.abc.x + L.abc.w / 2 > furn.teacher.x; teacherAct('point', 1.6);
    for (const s of students) if (s.mode === 'seated') { s.sleep = false; act(s, 'gasp', 0.8); }
    await hw(1.2);
    const step = fresh.length > 6 ? 0.12 : 0.35;
    for (const [n, ch] of fresh.entries()) {
      const k = LETTERS.indexOf(ch);
      abcPop[ch] = G.time;
      if (n < 8) sfx.note(523 * Math.pow(2, n / 8));
      burst('star', abcCardX(k) + 2, L.abc.y + 4, 3, [ABC_COLS[k % ABC_COLS.length], '#ffd23f'], { up: true, sp: 40 });
      await hw(step);
    }
    persist();
    for (const s of students) if (s.mode === 'seated') act(s, 'clap', 1.2);
    sfx.clap(5, 0.7);
    await hw(1);
    if (!hadVowels && vowels.every(v => shown.includes(v))) { // the whole class sings a-e-i-o-u, one voice each
      for (const [i, v] of vowels.entries()) {
        const s = students[i];
        if (s.mode === 'away') continue;
        s.sleep = false; if (s.hide > 0) s.hide = 0;
        act(s, 'cheer', 0.8); hop(s, 60); abcPop[v] = G.time;
        speak(s, v.toLowerCase(), 'here');
        burst('note', ...headPos(s), 2, ['#7a5bc0', '#ff6f91'], { up: true });
        await hw(0.7);
      }
      for (const s of students) if (s.mode === 'seated') act(s, 'cheer', 1.2);
      sfx.cheer(1.1); teacherAct('clap', 1.2);
      await hw(1);
    }
  }

  // ---------------------------------------------------------------- the daily loop
  // morning waits that shrink to half once she taps to hurry everyone along
  async function hw(sec) { const t0 = G.time; while (G.time - t0 < (hurry ? sec / 2 : sec)) await wait(0.05); }
  function hurryUp(x, y) {
    hurry = true;
    sfx.pop(1.25); teacherAct('clap', 1);
    burst('spark', x, y, 6, ['#ffd23f', '#ffffff']);
    for (const s of students) if (s.mode === 'walk') s.speed *= 1.8;
    if (dayCard && G.time - dayCard.t0 < 2.4) dayCard.t0 = G.time - 2.4;
  }
  async function startDay() {
    busy = true; phase = 'morning'; hurry = false; redToday = false;
    RT.dayStart();
    sky = 'morning'; duskTarget = 0;
    attendanceDone = false;
    feelT = rand(35, 50);
    for (const s of students) Object.assign(s, { card: 'green', naughty: null, center: undefined, mood: null, mode: 'away', here: false, sleep: false, hide: 0, act: null, bubble: null, glowT: 0, z: 0, vz: 0, snack: null, sleepT: rand(14, 24), wanderT: rand(20, 32), hideT: 0 });
    planDoor(); // maybe a friend is late today, and 1-2 knocks at the door later
    await hw(0.5);
    sfx.bell();
    await hw(1.2);
    dayCard = { t0: G.time, day: dayIndex() };
    sfx.chime(); teacherAct('point', 1.4);
    teach.pointRight = furn.calendar.x > furn.teacher.x;
    wait(0.4).then(() => speak(RT.calSpeaker(), daySentence(), 'here')); // the calendar helper
    await hw(3.2);
    for (const s of students) {
      if (s.lateToday) continue;
      doorTarget = 1; sfx.door();
      await hw(0.35);
      s.x = L.doorPt.x; s.y = L.doorPt.y; s.mode = 'walk';
      const p = seat(s);
      // walk out of the door, then to the seat
      await walkTo(s, L.doorPt.x + 4, L.doorPt.y + 8, hurry ? 72 : 40);
      walkTo(s, p.x, p.y, hurry ? 80 : 44).then(() => {
        s.mode = 'seated'; s.look = 0;
        act(s, 'wave', 1.6); talk(s, 'sun', 1.8); teacherAct('wave', 1.4);
        if (G.save.deskItems[s.desk]) wait(1.7).then(() => talk(s, 'heart', 1.4));
        speak(s, GREETINGS[s.kind], 'hi');
        if (s.kind === 'turtle') wait(1.8).then(() => { s.hide = 1; s.hideT = rand(30, 45); sfx.softPop(); });
        if (s.kind === 'bunny') s.sleepT = rand(8, 14);
      });
      await hw(1.5);
    }
    doorTarget = 0; sfx.door();
    for (let i = 0; i < 40 && students.some(s => s.mode !== 'seated' && !s.lateToday); i++) await wait(0.2);
    await hw(0.3);
    speak(students[3], LD.CARD_LINES.allGreen, 'yay');
    for (const s of students) { s.cardT = G.time; burst('spark', desks[s.desk].x - 11, desks[s.desk].y - 10, 3, ['#3cb44b', '#a6e69a']); }
    await hw(1.8);
    if (G.save.decorStamp !== G.save.decorSeen) { // they notice what she did to the room!
      G.save.decorSeen = G.save.decorStamp; persist();
      await hw(0.4);
      for (const s of students) { s.sleep = false; act(s, 'gasp', 0.9); }
      sfx.ooh(1.25);
      await hw(0.9);
      for (const s of students.filter(t => t.mode !== 'away')) { act(s, 'clap', 1.4); burst('star', ...headPos(s), 2, ['#ffd23f', '#ff9ec4'], { up: true }); }
      speak(students[4], 'Ooh, so pretty!', 'yay'); sfx.clap(8, 1);
      teacherAct('cheer', 1.2);
      await hw(1.2);
    }
    await RT.morningWeather(); // circle time: what's the weather today?
    await abcMorning();
    busy = false; phase = 'class'; sky = 'day';
    hintT = 3; classStart = G.time; lastInput = G.time; nextHintAt = G.time + 6;
  }

  async function goodbye() {
    busy = true; phase = 'goodbye'; menu = null;
    sfx.bell();
    sky = 'sunset'; duskTarget = 0.35;
    await wait(1.2);
    await gatherSeats();
    for (const s of students) { s.sleep = false; s.hide = 0; s.snack = null; s.naughty = null; s.mood = null; }
    if (students.some(s => s.card === 'red')) {
      speak(students[3], LD.CARD_LINES.newDay, 'here');
      for (const s of students) if (s.card === 'red') { s.card = 'green'; s.cardT = G.time; burst('spark', desks[s.desk].x - 11, desks[s.desk].y - 10, 4, ['#3cb44b', '#a6e69a']); }
      await wait(2);
    } else await allGreenParty();
    for (const s of students) { s.mode = 'stand'; Object.assign(s, seat(s)); s.y += 2; }
    await wait(0.4);
    for (const s of students) { act(s, 'wave', 2.4); talk(s, 'heart', 2.4); }
    teacherAct('wave', 3);
    speak(students[3], 'Goodbye, teacher!', 'bye'); sfx.bye(1.2);
    await wait(2.4);
    await RT.leaderGo(); // the line leader goes first: "¡Síganme!"
    for (const s of RT.lineOrder()) {
      doorTarget = 1;
      walkTo(s, L.doorPt.x + 4, L.doorPt.y + 8, 52).then(() => walkTo(s, L.doorPt.x, L.doorPt.y - 2, 40)).then(() => { s.mode = 'away'; });
      speak(s, BYES[s.kind], 'bye');
      await wait(1.3);
    }
    for (let i = 0; i < 50 && students.some(s => s.mode !== 'away'); i++) await wait(0.2);
    doorTarget = 0; sfx.door();
    await wait(0.8);
    duskTarget = 0.5; sky = 'night';
    await wait(0.8);
    // earn a sticker
    const owned = G.save.stickers;
    const fresh = S.STICKERS.filter(id => !owned.includes(id));
    const id = fresh.length ? fresh[0] : pick(S.STICKERS);
    reward = { id, t: G.time, collected: false };
    sfx.fanfare();
    phase = 'reward';
    busy = false;
  }
  function collectReward() {
    if (!reward || reward.collected) return;
    reward.collected = true; reward.ct = G.time;
    sfx.peel();
    G.save.stickers.push(reward.id);
    G.save.day = (G.save.day || 1) + 1;
    persist();
    wait(1.0).then(() => { sfx.chime(); reward = null; phase = 'night'; deco = null; });
  }

  // ---------------------------------------------------------------- free time
  // ================================================================ v1.9 activities
  // ---------------------------------------------------------------- A5: she serves snack
  // a tray with five snacks: drag one onto a friend, or tap it (it bobs up) and then tap a friend
  let serve = null; // { slots:[{k, taken}], served, eating, armed:{i, until}, drag:{i,x,y}, done, hintAt }
  const SNACK_KINDS = ['bunny', 'puppy', 'turtle', 'owl', 'frog'];
  const eaters = () => students.filter(s => s.mode !== 'away');
  const seatedAt = (x, y) => { const d = deskAt(x, y); return d ? students.find(s => s.desk === d.i && s.mode === 'seated') : null; };
  function snackLayout() {
    const sw = 24, w = SNACK_KINDS.length * sw + 8;
    const x0 = Math.round(V.W / 2 - w / 2), y0 = V.H - V.inset.b - 31;
    return { tray: { x: x0, y: y0, w, h: 28 }, slot: (i) => ({ x: x0 + 4 + i * sw, y: y0 + 2, w: sw, h: 24 }) };
  }
  async function serveSnack() {
    busy = true; phase = 'activity'; snackOn = true; armed = null;
    await gatherSeats();
    for (const s of students) { s.sleep = false; if (s.hide > 0) s.hide = 0; s.snack = null; s.naughty = null; s.fed = false; }
    serve = { slots: SNACK_KINDS.map(k => ({ k, taken: false })), served: 0, eating: 0, armed: null, drag: null, done: false, hintAt: G.time + 8 };
    sfx.ding(880);
    for (const s of awake()) act(s, 'gasp', 0.7);
    speak(students[1], 'Yummy!', 'yay');
    busy = false; lastInput = G.time;
  }
  function giveSnack(i, s) {
    const slot = serve && serve.slots[i];
    if (!slot || slot.taken || !s) return false;
    if (s.fed || s.mode !== 'seated') { act(s, 'happy', 0.8); hop(s, 40); talk(s, 'heart', 1); if (s.fed) speak(s, LD.SNACK_FULL, 'yay'); sfx.softPop(); return false; }
    slot.taken = true; s.fed = true; serve.served++; serve.eating++;
    s.sleep = false; if (s.hide > 0) s.hide = 0;
    s.snack = { bites: 0, k: slot.k };
    act(s, 'gasp', 0.7); hop(s, 60); sfx.pop(1.2); teacherAct('clap', 0.8);
    burst('spark', ...headPos(s), 6, ['#ffd23f', '#ffffff', '#ff9ec4'], { sp: 50 });
    const n = serve.served;
    wait(0.45).then(() => speak(helper(), LD.COUNT_WORDS[n - 1], 'here')); // the owl counts: uno, dos, tres…
    munchSnack(s);
    return true;
  }
  async function munchSnack(s) {
    const sv = serve;
    await wait(1.0);
    for (let b = 0; b < 3; b++) {
      if (serve !== sv || !s.snack) return;
      act(s, 'munch', 0.9); s.snack.bites = b + 1; sfx.crunch();
      const d = desks[s.desk]; burst('crumb', d.x, d.y - 18, 4, ['#e8b06a', '#ff9a3c', '#ff4f6a'], { up: true, sp: 30, g: 140 });
      await wait(0.85);
    }
    if (serve !== sv) return;
    s.snack = null; act(s, 'happy', 1.2); burst('heart', ...headPos(s), 3, ['#ff6f91'], { up: true, sp: 25 });
    speak(s, pick(LD.SNACK_THANKS), 'yay');
    sv.eating--;
    if (sv.served >= eaters().length && sv.eating === 0) snackDone();
  }
  async function snackDone() {
    const sv = serve;
    if (!sv || sv.done) return;
    sv.done = true; sv.armed = null;
    await wait(0.5);
    sfx.yay(1.2); sfx.chime(); teacherAct('cheer', 1.4);
    for (const s of awake()) { act(s, 'cheer', 1.3); hop(s, 60); burst('heart', ...headPos(s), 4, ['#ff6f91', '#ff9ec4'], { up: true, sp: 40 }); }
    await wait(1.8);
    const pup = students.find(s => s.kind === 'puppy' && s.mode === 'seated');
    if (serve === sv && pup) { // the puppy comes to beg at the empty tray
      const { tray } = snackLayout();
      Object.assign(pup, seat(pup)); pup.mode = 'stand';
      await walkTo(pup, tray.x + tray.w / 2, tray.y - 1, 70);
      if (serve !== sv) return;
      act(pup, 'raise', 2); sfx.woof(); talk(pup, 'heart', 2); hop(pup, 50);
      await wait(0.6);
      for (const s of awake()) if (s !== pup && s.mode === 'seated') act(s, 'giggle', 1.4);
      sfx.giggle(1.2, 5);
      await wait(1.8);
    }
    if (serve !== sv) return;
    serve = null; snackOn = false;
    busy = true; await gatherSeats(); busy = false; phase = 'class';
  }
  function snackHint() {
    const i = serve.slots.findIndex(sl => !sl.taken);
    const s = students.find(t => t.mode === 'seated' && !t.fed);
    if (i < 0 || !s) return { key: 'snackWait', x: null };
    const r = snackLayout().slot(i), [hx, hy] = headPos(s);
    const from = { x: r.x + 12, y: r.y + 14 };
    return { key: 'snackServe', ...from, from, to: { x: hx, y: hy + 6 }, img: S.snack(serve.slots[i].k, 0) };
  }
  function snackDown(x, y) { // true when this press belongs to the snack tray
    if (!serve || serve.done || (deco && inRect(x, y, T))) return false;
    const { slot } = snackLayout();
    const i = serve.slots.findIndex((sl, k) => !sl.taken && inRect(x, y, slot(k)));
    if (i >= 0) { press.snack = i; return true; }
    if (serve.armed) {
      if (shownBtns().some(q => inRect(x, y, q))) { serve.armed = null; return false; }
      const s = hitStudent(x, y) || seatedAt(x, y);
      if (s) { press.snackS = s; return true; }
      serve.armed = null; sfx.softPop(); press.swallow = true; return true;
    }
    return false;
  }
  function snackMove(x, y) {
    if (press.snack === undefined) return false;
    if (!press.moved && Math.hypot(x - press.x0, y - press.y0) > 6) { press.moved = true; sfx.lift(); if (serve) serve.armed = null; }
    if (press.moved && serve) serve.drag = { i: press.snack, x, y };
    return true;
  }
  function snackUp(p) {
    if (p.snack === undefined && !p.snackS) return false;
    const sv = serve; if (!sv) return true;
    if (p.snackS) { const a = sv.armed; sv.armed = null; if (a && !p.moved) giveSnack(a.i, p.snackS); return true; }
    const d = sv.drag; sv.drag = null;
    if (d) { const s = hitStudent(d.x, d.y) || seatedAt(d.x, d.y + 6); if (!giveSnack(p.snack, s) && !s) sfx.softPop(); return true; }
    // a tap picks the snack up (it bobs over the tray); tap a friend next, or tap it again to put it back
    if (sv.armed && sv.armed.i === p.snack) { sv.armed = null; sfx.softPop(); return true; }
    sv.armed = { i: p.snack, until: G.time + 8 }; sfx.lift();
    const r = snackLayout().slot(p.snack); burst('spark', r.x + 12, r.y + 2, 6, ['#ffd23f', '#ffffff']);
    return true;
  }
  function drawSnackTray(c) {
    if (!serve) return;
    const { tray, slot } = snackLayout();
    c.fillStyle = 'rgba(80,40,30,0.2)'; c.fillRect(tray.x + 3, tray.y + tray.h - 1, tray.w - 6, 3);
    D(c, btnFrame(tray.w, tray.h, '#d6ecff', 'snacktray'), tray.x, tray.y);
    R(c, tray.x + 3, tray.y + 3, tray.w - 6, 1, '#ffffff');
    serve.slots.forEach((sl, i) => {
      const r = slot(i);
      R(c, r.x + 4, r.y + 17, 16, 3, '#bcd8ee'); // little plate
      if (sl.taken || (serve.drag && serve.drag.i === i)) return;
      const img = scaled(S.snack(sl.k, 0), 2);
      if (serve.armed && serve.armed.i === i) { c.globalAlpha = 0.35; D(c, img, r.x, r.y - 2); c.globalAlpha = 1; return; }
      D(c, img, r.x, r.y - 2 + (serve.hintAt < G.time && Math.floor(G.time * 2 + i) % 5 === 0 ? -1 : 0));
    });
  }
  function drawSnackHeld(c) { // the snack being dragged / picked up floats on top of everything
    if (!serve) return;
    if (serve.armed && (G.time > serve.armed.until || busy)) serve.armed = null;
    const pickImg = (i) => scaled(S.snack(serve.slots[i].k, 0), 2);
    if (serve.drag) {
      const d = serve.drag, img = pickImg(d.i), hov = hitStudent(d.x, d.y) || seatedAt(d.x, d.y + 6);
      if (hov && !hov.fed) D(c, glow(img, '#fff6b8', 'snackglow' + d.i), d.x - 13, d.y - 13);
      D(c, img, d.x - 12, d.y - 12);
    } else if (serve.armed) {
      const r = snackLayout().slot(serve.armed.i), img = pickImg(serve.armed.i), bob = Math.round(Math.sin(G.time * 6) * 2);
      D(c, glow(img, '#fff6b8', 'snackglow' + serve.armed.i), r.x - 1, r.y - 27 + bob);
      D(c, img, r.x, r.y - 26 + bob);
      if (Math.random() < 0.08) burst('spark', r.x + 12 + rand(-8, 8), r.y - 16 + bob, 1, ['#ffd23f', '#ffffff'], { sp: 15 });
    }
  }

  // ---------------------------------------------------------------- A7: knock-knock, who's at the door?
  // 1-2 knocks per class day, only in calm class time: a late friend, a parcel with a new decoration, or a ball
  let door = null; // { queue, nextAt, knock: { kind, n, nextT }, late, bob }
  let parcel = null, rollBall = null;
  let doorPlanNext = null; // test hook: force tomorrow's plan
  function nextGift() {
    return DC.PARCEL_ITEMS.find(t => !G.save.gifts.includes(t)) || DC.PARCEL_ITEMS.find(t => !Object.values(furn).some(f => f.type === t));
  }
  function planDoor() {
    for (const s of students) s.lateToday = false;
    let late = null, q;
    if (doorPlanNext) { q = [...doorPlanNext.q]; late = doorPlanNext.late != null ? students[doorPlanNext.late] : null; doorPlanNext = null; }
    else {
      late = Math.random() < 0.25 ? pick(students.filter(s => s !== helper())) : null;
      const extras = (nextGift() ? ['parcel', 'ball'] : ['ball']).sort(() => Math.random() - 0.5);
      q = late ? ['late'] : [extras.shift()];
      if (Math.random() < 0.45 && extras.length) q.push(extras.shift());
    }
    if (late) late.lateToday = true;
    door = { queue: q, nextAt: Infinity, knock: null, late, bob: -9 };
  }
  const doorQuiet = () => phase === 'class' && !busy && !quiz.active && !menu && !bookOpen && !drag && !dayCard && !reward
    && !story && !recess && !centros && !serve && !parcel && !rollBall && !(press && press.moved);
  function knockShift(d) { // the door jiggles with each knock
    if (!door || G.time - door.bob > 0.7) return d;
    return ((G.time - door.bob) % 0.24) < 0.08 ? { ...d, x: d.x + 1 } : d;
  }
  function knock() {
    door.bob = G.time;
    [0, 0.24, 0.48].forEach(t => wait(t).then(() => { sfx.thump(); burst('spark', L.door.x + L.door.w / 2 + rand(-6, 6), L.door.y + 22 + rand(-6, 6), 2, ['#ffffff', '#ffd23f'], { sp: 25 }); }));
    for (const s of students) if (s.mode === 'seated' && !s.sleep && !(s.hide > 0) && !s.act) { s.look = -1; act(s, 'look', 1.4); }
    teach.pointRight = false; teacherAct('point', 1);
    hint = { key: 'door', x: L.door.x + L.door.w / 2, y: L.door.y + 28, t0: G.time, until: G.time + 6 };
    if (door.knock.n === 1) wait(0.8).then(() => speak(helper(), LD.HINTS.door, 'tap'));
  }
  function doorTick(dt) {
    if (serve && phase !== 'activity') { serve = null; snackOn = false; } // home pressed mid-snack
    if (!door) return;
    if (phase === 'goodbye' || phase === 'reward' || phase === 'night' || phase === 'prep' || phase === 'title') {
      if (door.late && door.late.mode === 'away' && phase === 'goodbye') door.late.mode = 'seated'; // never came in: at least say goodbye
      door = null; parcel = null; rollBall = null; return;
    }
    if (door.nextAt === Infinity && phase === 'class') door.nextAt = G.time + (door.late ? rand(10, 16) : rand(30, 55));
    if (parcel) { parcel.x += (parcel.tx - parcel.x) * Math.min(1, dt * 5); }
    if (rollBall) ballTick(dt);
    if (!door.knock) {
      if (door.queue.length && G.time > door.nextAt && doorQuiet()) door.knock = { kind: door.queue.shift(), n: 0, nextT: G.time };
      return;
    }
    const k = door.knock;
    if (G.time < k.nextT) return;
    if (!doorQuiet()) { k.nextT = G.time + 2; return; } // wait for a calm moment, never during activities
    if (k.n >= 3) { // nobody answered: the late friend lets themselves in, other surprises are skipped today
      door.knock = null; door.nextAt = G.time + rand(50, 80);
      if (k.kind === 'late') arriveLate();
      return;
    }
    k.n++; k.nextT = G.time + 9;
    knock();
  }
  function answerDoor() {
    if (!door || !door.knock || door.knock.n === 0 || phase !== 'class' || busy) return false;
    const kind = door.knock.kind;
    door.knock = null; door.nextAt = G.time + rand(70, 110); hint = null;
    for (const s of students) if (s.mode === 'seated' && s.look === -1) s.look = 0;
    sfx.door(); teach.pointRight = false; teacherAct('wave', 1.2);
    if (kind === 'late') arriveLate();
    else if (kind === 'parcel') deliverParcel();
    else rollInBall();
    return true;
  }
  async function arriveLate() {
    const s = door && door.late;
    if (!s || s.mode !== 'away') return;
    doorTarget = 1; sfx.door();
    await wait(0.4);
    s.x = L.doorPt.x; s.y = L.doorPt.y; s.mode = 'walk'; s.lateToday = false;
    await walkTo(s, L.doorPt.x + 4, L.doorPt.y + 10, 40);
    act(s, 'sorry', 1.8); talk(s, 'heart', 1.8); speak(s, LD.DOOR_LINES.late, 'here');
    for (const t of students) if (t !== s && t.mode === 'seated' && !t.sleep && !(t.hide > 0)) { t.look = 0; act(t, 'wave', 1.4); }
    await wait(1.8);
    doorTarget = 0; sfx.door();
    if (s.mode !== 'stand') return;
    const p = seat(s);
    walkTo(s, p.x, p.y, 44).then(() => { s.mode = 'seated'; s.look = 0; act(s, 'happy', 1); }); // still needs ¡Presente! on the chart
  }
  function deliverParcel() {
    const type = nextGift();
    if (!type) { rollInBall(); return; }
    doorTarget = 1;
    parcel = { type, x: L.doorPt.x, y: L.doorPt.y + 14, tx: clamp(L.doorPt.x + 62, 30, V.W - 30), ready: false };
    sfx.whoosh();
    for (const s of awake()) if (s.mode === 'seated') act(s, 'gasp', 0.9);
    wait(0.8).then(() => { if (parcel) { parcel.ready = true; sfx.thump(); burst('crumb', parcel.x, parcel.y, 6, ['#d9c3a0', '#c9b08a'], { up: true, sp: 25, g: 100, life: 0.5 }); } doorTarget = 0; sfx.door(); sfx.ooh(1.2); });
  }
  function openParcel() {
    const pc = parcel; parcel = null; hint = null;
    sfx.fanfare(); teacherAct('cheer', 1.2);
    burst('confetti', pc.x, pc.y - 12, 34, ['#ef6f6c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'], { sp: 90, g: 80, life: 1.5 });
    if (!G.save.gifts.includes(pc.type)) G.save.gifts.push(pc.type);
    addDecor(pc.type, pc.x, pc.y - DC.DECOR[pc.type].h / 2); // saves the room too
    persist();
    wait(1.6).then(() => {
      speak(helper(), LD.DOOR_LINES.parcel, 'yay'); sfx.clap(6, 1);
      for (const s of students) if (s.mode === 'seated' && !s.sleep && !(s.hide > 0)) act(s, 'clap', 1.4);
    });
  }
  function parcelImg() {
    return cached('parcel', () => {
      const p = new Pix(18, 17);
      p.rect(1, 5, 16, 11, '#d9a066'); p.rect(1, 5, 16, 2, '#e8b884'); p.rect(1, 14, 16, 2, '#b8804a');
      p.rect(8, 5, 2, 11, '#ef6f6c'); p.rect(1, 9, 16, 2, '#ef6f6c');
      p.ell(6, 3, 3, 2.2, '#ff8fb8'); p.ell(12, 3, 3, 2.2, '#ff8fb8'); p.ball(9, 4, 1.6, 1.6, '#ef6f6c', { hi: false });
      p.outline(); return p.canvas();
    });
  }
  function rollInBall() {
    doorTarget = 1;
    rollBall = { x: L.doorPt.x, y: L.doorPt.y + 6, z: 6, vx: 75, vy: rand(12, 28), vz: 50, state: 'roll', t: 0, pup: null, nudge: 0 };
    sfx.boing();
    wait(0.7).then(() => { doorTarget = 0; sfx.door(); });
    const pup = students.find(s => s.kind === 'puppy' && s.mode === 'seated' && s.here);
    for (const s of students) if (s.mode === 'seated' && s !== pup && !s.sleep && !(s.hide > 0)) act(s, 'gasp', 0.8);
    if (pup) {
      rollBall.pup = pup;
      wait(0.5).then(() => { if (!rollBall || pup.mode !== 'seated') { ballBack(); return; } Object.assign(pup, seat(pup)); pup.mode = 'stand'; rollBall.up = true; pup.sleep = false; hop(pup, 70); sfx.woof(); talk(pup, 'note', 1.4); });
    }
  }
  function ballTick(dt) {
    const b = rollBall;
    if (phase !== 'class' && phase !== 'activity') { rollBall = null; return; }
    b.t += dt;
    if (b.state === 'back') { // bounce back out of the door
      const k = Math.min(1, (G.time - b.t0) / 1.1);
      b.x = b.fx + (L.doorPt.x - b.fx) * k; b.y = b.fy + (L.doorPt.y + 2 - b.fy) * k; b.z = Math.abs(Math.sin(k * Math.PI * 2.5)) * 10;
      if (k >= 1) { rollBall = null; doorTarget = 0; sfx.door(); }
      return;
    }
    b.vz -= 300 * dt; b.z += b.vz * dt;
    if (b.z < 0) { b.z = 0; if (b.vz < -40) { b.vz = -b.vz * 0.5; sfx.tap(); } else b.vz = 0; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 1 - dt * 0.8; b.vy *= 1 - dt * 0.8;
    b.x = clamp(b.x, 12, V.W - 12); b.y = clamp(b.y, L.floorTop + 10, V.H - 6);
    const pup = b.pup;
    if (!pup) { if (b.t > 6) ballBack(); return; }
    if (!b.up) return; // he jumps up first
    if (pup.mode === 'held' || pup.mode === 'seated' || phase !== 'class') { ballBack(); return; } // someone put him back
    const dist = Math.hypot(pup.x - b.x, pup.y - b.y);
    if (pup.mode === 'stand' && dist > 12) walkTo(pup, clamp(b.x - 9, 14, V.W - 14), b.y, 62);
    if (pup.mode === 'stand' && dist <= 12) {
      if (b.state === 'roll') { b.state = 'play'; b.playT = G.time; act(pup, 'happy', 1.4); speak(pup, LD.DOOR_LINES.ball, 'yay'); }
      b.nudge -= dt;
      if (b.nudge < 0) { b.nudge = rand(1.4, 2.2); hop(pup, 50); b.vz = 70; sfx.woof(); talk(pup, 'heart', 1); }
      if (G.time - b.playT > 25) ballBack(); // he gives it back by himself after a while
    }
  }
  function ballBack() {
    const b = rollBall;
    if (!b || b.state === 'back') return;
    b.state = 'back'; b.t0 = G.time; b.fx = b.x; b.fy = b.y; b.vz = 0;
    doorTarget = 1; sfx.boing(); hint = null;
    const pup = b.pup;
    if (pup && (pup.mode === 'stand' || pup.mode === 'walk')) {
      act(pup, 'cheer', 1.2); hop(pup, 70); wait(1).then(() => { if (pup.mode === 'stand' || pup.mode === 'walk') sendToSeat(pup); });
    }
    for (const s of students) if (s.mode === 'seated' && !s.sleep && !(s.hide > 0)) act(s, 'clap', 1);
  }
  function doorTapStudent(s) { // tapping the puppy who's playing with the ball sends it back
    if (!rollBall || rollBall.pup !== s || rollBall.state === 'back') return false;
    ballBack(); return true;
  }
  function v19Down(x, y) {
    if (busy || phase !== 'class') return false;
    if (parcel && parcel.ready && Math.abs(x - parcel.x) < 14 && y > parcel.y - 22 && y < parcel.y + 5) { press.v19 = 'parcel'; return true; }
    if (rollBall && rollBall.state !== 'back' && Math.hypot(x - rollBall.x, y - (rollBall.y - 5 - rollBall.z)) < 13) { press.v19 = 'ball'; return true; }
    return false;
  }
  function v19Tap(what) {
    if (what === 'parcel' && parcel && parcel.ready) openParcel();
    if (what === 'ball' && rollBall) ballBack();
  }
  function v19Objs(objs) { // y-sorted things on the floor
    if (rollBall) objs.push({ y: rollBall.y, ball: rollBall });
    if (parcel) objs.push({ y: parcel.y, draw: (c) => {
      const hopY = parcel.ready && Math.floor(G.time * 1.5) % 3 === 0 ? -Math.round(Math.abs(Math.sin(G.time * 9)) * 2) : 0;
      shadow(c, parcel.x, parcel.y, 16); D(c, parcelImg(), parcel.x - 9, parcel.y - 17 + hopY);
    } });
  }
  function v19Tick(dt) { doorTick(dt); snackIdle(); }
  function snackIdle() { // after 8 s idle the hint hand carries a snack to a hungry friend
    if (!serve || serve.done || busy || hint || drag || quiz.active || menu || bookOpen) return;
    if (G.time - lastInput > 8 && G.time > serve.hintAt) { showHint(false); serve.hintAt = G.time + 14; }
  }
  function v19Hint() {
    if (serve && !serve.done) return snackHint();
    if (story && story.stage === 'choose') { const r = coverRects()[story.def]; return { key: 'storyPick', x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
    if (phase !== 'class' || busy) return null;
    if (door && door.knock && door.knock.n > 0) return { key: 'door', x: L.door.x + L.door.w / 2, y: L.door.y + 28 };
    if (parcel && parcel.ready) return { key: 'parcel', x: parcel.x, y: parcel.y - 6 };
    if (rollBall && rollBall.pup && rollBall.state === 'play') { const [hx, hy] = headPos(rollBall.pup); return { key: 'ballBack', x: hx, y: hy + 12 }; }
    return null;
  }

  // ---------------------------------------------------------------- A4: story books
  function coverRects() {
    const cw = 64, ch = 76, gap = 14, tot = BOOKS.length * cw + (BOOKS.length - 1) * gap;
    const x0 = Math.round(V.W / 2 - tot / 2), y0 = Math.round(V.H / 2 - ch / 2 - 6);
    return BOOKS.map((_, k) => ({ x: x0 + k * (cw + gap), y: y0, w: cw, h: ch }));
  }
  function storyBack() { const r = coverRects()[0]; return { x: Math.max(V.inset.l + 2, r.x - 30), y: Math.max(V.inset.t + 2, r.y - 22), w: 26, h: 26 }; }
  function storyTap(x, y) {
    if (story.stage !== 'choose') { turnPage(); return; }
    if (inRect(x, y, storyBack())) { sfx.whoosh(); sayUI('back'); endStory(); return; }
    const k = coverRects().findIndex(r => inRect(x, y, r));
    if (k < 0) { sfx.tap(); return; }
    story.stage = 'read'; story.book = k; story.page = -1; story.flipT = G.time;
    sfx.page(); sfx.sparkle();
    for (const s of students) act(s, 'gasp', 0.9);
    const st = story;
    wait(0.4).then(() => { if (story === st && st.page < 0) speak(helper(), LD.BOOK_TEXT[k].title, 'yay'); });
  }
  function readPage(b, pg) { // the owl reads one line, then a friend echoes the key word
    const t = LD.BOOK_TEXT[b], st = story;
    wait(0.6).then(() => { if (story === st && st.page === pg) speak(helper(), t.lines[pg], 'here'); });
    wait(2.9).then(() => {
      if (story !== st || st.page !== pg) return;
      const kids = students.filter(s => s !== helper() && s.mode !== 'away');
      if (!kids.length) return;
      const s = kids[(pg + b * 2) % kids.length];
      act(s, 'cheer', 1.3); hop(s, 70); speak(s, t.words[pg], 'yay');
      burst('star', ...headPos(s), 5, ['#ffd23f', '#ff9ec4', '#7ec8ff'], { up: true });
    });
  }
  function drawBookChooser(c) {
    c.fillStyle = 'rgba(40,30,60,0.45)'; c.fillRect(0, 0, V.W, V.H);
    coverRects().forEach((r, k) => {
      const bk = BOOKS[k], bob = k === story.def ? Math.round(Math.sin(G.time * 4) * 1.5) : 0, y = r.y + bob;
      c.fillStyle = 'rgba(30,20,40,0.3)'; c.fillRect(r.x + 3, y + 4, r.w, r.h);
      R(c, r.x - 1, y - 1, r.w + 2, r.h + 2, darken(bk.dark, 0.3));
      R(c, r.x, y, r.w, r.h, bk.color); R(c, r.x, y, 6, r.h, bk.dark); R(c, r.x + 6, y, 1, r.h, lighten(bk.color, 0.4));
      R(c, r.x + 9, y + 6, 54, 46, '#fffaf0'); D(c, bk.cover(), r.x + 10, y + 7);
      for (let q = 0; q < 3; q++) D(c, S.particle('star', '#fff6b8'), r.x + 15 + q * 15, y + 60);
      R(c, r.x + 6, y + r.h - 3, r.w - 7, 2, '#fffaf0');
      if (k === story.def && Math.random() < 0.06) burst('spark', r.x + rand(0, r.w), y + rand(0, r.h), 1, ['#ffd23f', '#ffffff'], { sp: 15 });
    });
    const bk = storyBack();
    D(c, btnFrame(26, 26), bk.x, bk.y); D(c, S.ICONS.back(), bk.x + 4, bk.y + 3);
  }
  async function storyTime() {
    busy = true; phase = 'activity'; calmMoods();
    const rug = furn.rug;
    const spots = [-30, -15, 0, 15, 30].map((dx, k) => ({ x: clamp(rug.x + dx, 14, V.W - 14), y: clamp(rug.y - 12 - [0, 3, 4, 3, 0][k], L.floorTop + 14, V.H - 2) }));
    for (const s of students) { s.sleep = false; s.hide = 0; s.snack = null; }
    sfx.ding(660);
    await Promise.all(students.map((s, k) => {
      if (s.mode === 'away') return null;
      if (s.mode === 'seated') { Object.assign(s, seat(s)); s.mode = 'stand'; }
      return walkTo(s, spots[k].x, spots[k].y, 50);
    }));
    for (const s of students) s.look = 0;
    story = { stage: 'choose', book: 0, def: dayIndex() % BOOKS.length, page: -1, t: G.time, flipT: G.time }; // pick a book first
    sfx.page(); wait(0.3).then(() => speak(helper(), LD.HINTS.storyPick, 'tap'));
    busy = false;
  }
  function turnPage() {
    if (!story || story.stage !== 'read') return;
    if (G.time - story.flipT < 0.9) return;
    story.flipT = G.time;
    story.page++;
    sfx.page();
    if (story.page >= BOOKS[story.book].pages.length) { endStory(); return; }
    const reacts = [['gasp', 'ooh'], ['happy', 'yay'], ['giggle', 'giggle'], ['gasp', 'ooh'], ['clap', 'clap']][story.page];
    wait(0.4).then(() => {
      for (const s of students) act(s, reacts[0], 1.4);
      if (reacts[1] === 'clap') sfx.cheer(1.1); else if (reacts[1] === 'giggle') sfx.giggle(1.2, 6); else sfx[reacts[1]](1.2);
    });
    readPage(story.book, story.page);
  }
  async function endStory() {
    busy = true;
    story = null;
    for (const s of students) { act(s, 'clap', 1.4); }
    sfx.cheer(1);
    await wait(1.4);
    await gatherSeats();
    busy = false; phase = 'class';
  }
  async function recessTime() {
    // v2.0: recess is outside. Line up, walk out of the door, play in the yard (playground.js),
    // and when the whistle calls everyone back in, come through the door and sit. Resolves when recess is over.
    busy = true; phase = 'activity'; calmMoods(); menu = null;
    for (const s of students) { s.sleep = false; s.hide = 0; s.snack = null; }
    sfx.ding(988);
    const out = students.filter(s => s.mode !== 'away');
    speak(students[1], 'Recess! Yay!', 'yay');
    for (const s of out) {
      if (s.mode === 'seated') { Object.assign(s, seat(s)); s.mode = 'stand'; }
      act(s, 'cheer', 1); hop(s, 60);
    }
    await wait(1);
    await RT.leaderGo(); // the line leader goes first: "¡Síganme!"
    const order = RT.lineOrder().filter(s => out.includes(s));
    for (const s of order) {
      doorTarget = 1;
      walkTo(s, L.doorPt.x + 4, L.doorPt.y + 8, 56).then(() => walkTo(s, L.doorPt.x, L.doorPt.y - 2, 40)).then(() => { s.mode = 'away'; });
      await wait(0.45);
    }
    for (let i = 0; i < 60 && order.some(s => s.mode !== 'away'); i++) await wait(0.15);
    for (const s of order) { s.mode = 'away'; s.target = null; s.onArrive = null; }
    doorTarget = 0; sfx.door();
    if (hooks.openYard) await hooks.openYard(order);
    // back inside: in through the door and to the seats
    for (const s of order) {
      doorTarget = 1;
      s.x = L.doorPt.x; s.y = L.doorPt.y; s.z = 0; s.vz = 0; s.mode = 'walk'; s.act = null;
      walkTo(s, L.doorPt.x + 4, L.doorPt.y + 10, 56).then(() => sendToSeat(s));
      await wait(0.4);
    }
    for (let i = 0; i < 80 && order.some(s => s.mode !== 'seated'); i++) await wait(0.15);
    await gatherSeats();
    doorTarget = 0; sfx.door();
    busy = false; phase = 'class';
  }
  function kickBall(dirx = rand(-1, 1)) {
    const b = recess.ball;
    b.vz = 110; b.vx = dirx * 70 + rand(-20, 20); b.vy = rand(-40, 40);
    sfx.boing();
  }
  async function endRecess() {
    busy = true;
    recess = null;
    sfx.ding(784);
    await gatherSeats();
    busy = false; phase = 'class';
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    teach.blinkT -= dt; if (teach.blinkT < 0) { teach.blink = 0.14; teach.blinkT = rand(2, 5); } if (teach.blink > 0) teach.blink -= dt;
    if (teach.z > 0 || teach.vz > 0) { teach.vz -= 380 * dt; teach.z += teach.vz * dt; if (teach.z <= 0) { teach.z = 0; teach.vz = 0; } }
    doorOpen += (doorTarget - doorOpen) * Math.min(1, dt * 10);
    if (press && press.upd && !press.updFired) { // grown-up refresh needs a 1.5 s hold on the button
      const r = L.updBtn;
      if (!inRect(press.x, press.y, { x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 })) press.upd = false;
      else if (performance.now() - press.updT0 > 1500) {
        press.updFired = true; sfx.chime();
        Promise.resolve(hooks.forceUpdate ? hooks.forceUpdate() : false).then(ok => { if (ok === false) sayNo(); }).catch(sayNo);
      }
    }
    dusk += (duskTarget - dusk) * Math.min(1, dt * 1.5);
    if (phase === 'class') hintT -= dt; if (hintT < 0) hintT = rand(10, 16);
    const hintable = phase === 'prep' || phase === 'class' || (centros && centros.stage === 'chart') || (phase === 'activity' && (story || recess || (centros && centros.stage === 'run')));
    if (hintable && !drag && !quiz.active && !menu && !bookOpen && !reward && !dayCard && !busy) {
      if (G.time - lastInput > 9 && G.time > nextHintAt && !hint) { showHint(false); nextHintAt = G.time + 16; }
    }
    const calm = phase === 'class' && !drag && !quiz.active;
    naughtyTick(dt, calm);
    for (const s of students) {
      if (!s.mood || s.mode === 'away' || quiz.active) continue;
      const [hx, hy] = headPos(s);
      if (s.mood === 'enojado' && Math.random() < dt * 5) parts.push({ kind: 'puff', color: Math.random() < 0.5 ? '#f0e6e6' : '#ffb3a8', x: hx + (Math.random() < 0.5 ? -9 : 9), y: hy + 2, vx: rand(-6, 6), vy: -18, g: 0, life: 0.8, t: 0 });
      if (s.mood === 'cansado' && Math.random() < dt * 0.8) floatUp('z', '#6f8fd6', hx + 6, hy);
      s.moodT = (s.moodT ?? 2) - dt;
      if (s.moodT < 0) {
        s.moodT = rand(4.5, 6.5);
        if (s.mood === 'triste') { sfx.sniff(); act(s, 'sorry', 1.4); }
        if (s.mood === 'enojado') { sfx.grumble(); hop(s, 30); }
        if (s.mood === 'asustado') { sfx.whimper(); }
        if (s.mood === 'cansado') { sfx.yawn(); act(s, 'yawn', 1.2); }
      }
    }
    centrosTick(dt);
    v19Tick(dt);
    RT.update(dt);
    if (calm && !busy && !story && !recess && !bookOpen) {
      feelT -= dt;
      if (feelT < 0) {
        feelT = rand(70, 115);
        const cands = students.filter(s => s.mode === 'seated' && s.here && !s.sleep && !(s.hide > 0) && !s.mood);
        if (cands.length) { const s = pick(cands); s.mood = pick(LD.MOODS); talk(s, MOOD_BUBBLE[s.mood], 9999); speak(s, LD.FEEL_CALL, 'here'); }
      }
    }
    for (const s of students) {
      physics(s, dt);
      walkStep(s, dt);
      if (s.mode === 'seated' || (s.mode === 'stand' && s.kind === 'puppy')) {
        if (calm) traits(s, dt);
        if (s.kind === 'bunny' && s.sleep && Math.random() < dt * 0.9) floatUp('z', '#6f8fd6', ...headPos(s));
      }
      // wiggly puppy wanders
      if (s.kind === 'puppy' && calm && s.mode === 'seated' && s.here && !s.act) {
        s.wanderT -= dt;
        if (s.wanderT < 0) {
          s.wanderT = rand(22, 35);
          const tx = rand(24, V.W - 24), ty = rand(L.floorTop + 16, V.H - 6);
          Object.assign(s, seat(s)); s.mode = 'stand'; s.naughty = { until: G.time + 60 };
          hop(s, 50); sfx.woof();
          walkTo(s, tx, ty, 36).then(() => {
            if (phase !== 'class') return;
            act(s, 'happy', 1.5); talk(s, 'note', 1.5);
            wait(rand(8, 12)).then(() => { if (s.mode === 'stand' && phase === 'class' && !drag) sendToSeat(s); });
          });
        }
      }
    }
    // recess: ball physics + chasing
    if (recess) {
      const b = recess.ball;
      b.vz -= 300 * dt; b.z += b.vz * dt;
      if (b.z < 0) { b.z = 0; if (b.vz < -40) { b.vz = -b.vz * 0.55; sfx.tap(); } else b.vz = 0; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 1 - dt * 0.9; b.vy *= 1 - dt * 0.9;
      if (b.x < 10 || b.x > V.W - 10) { b.vx = -b.vx; b.x = clamp(b.x, 10, V.W - 10); }
      if (b.y < L.floorTop + 10 || b.y > V.H - 4) { b.vy = -b.vy; b.y = clamp(b.y, L.floorTop + 10, V.H - 4); }
      students.forEach((s, k) => {
        if (s.mode === 'stand' && Math.random() < dt * 0.8) {
          const a = k * 1.3 + G.time * 0.3;
          walkTo(s, clamp(b.x + Math.cos(a) * 22, 14, V.W - 14), clamp(b.y + Math.sin(a) * 10, L.floorTop + 14, V.H - 3), 55);
        }
        if (s.mode !== 'held' && Math.hypot(s.x - b.x, s.y - b.y) < 9 && b.z < 6 && Math.random() < dt * 4) { kickBall(Math.sign(b.x - s.x) || 1); act(s, 'cheer', 0.8); hop(s, 60); }
      });
      if (G.time > recess.until && !busy) endRecess();
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t > p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.wob) p.x += Math.sin(p.t * 5) * 0.3;
    }
  }

  // ---------------------------------------------------------------- render
  function drawStudent(c, s, x, y) {
    const { st, dx } = pose(s);
    const img = S.student(s.kind, st);
    const yy = y - s.z;
    if (s.mood && !(s.hide > 0)) {
      c.globalAlpha = 0.7 + 0.3 * Math.sin(G.time * 4);
      D(c, glow(img, MOOD_COL[s.mood], s.kind + JSON.stringify(st) + s.mood), x + dx - 2, yy - 2);
      c.globalAlpha = 1;
      if (s.mood === 'asustado' && Math.floor(G.time * 8) % 2) { for (const sx of [x + 4, x + S.SW - 5]) { R(c, sx, yy + 14, 1, 3, '#9a8db8'); R(c, sx + (sx < x + 10 ? -2 : 2), yy + 16, 1, 3, '#9a8db8'); } }
    }
    if (s.glowT > 0 && (s.glowT > 0.6 || Math.floor(G.time * 10) % 2)) {
      D(c, glow(img, Math.floor(G.time * 6) % 2 ? '#ffe36e' : '#fff6b8', s.kind + JSON.stringify(st)), x + dx - 2, yy - 2);
    }
    D(c, img, x + dx, yy);
    if (crowned(s)) { const o = S.CROWN_AT[s.kind]; D(c, S.crown(), x + dx + o[0] - 1, yy + (s.hide > 0 ? 19 : o[1]) - 1); }
    if (s.mode === 'held') return;
  }
  function drawDeskUnit(c, d) {
    D(c, S.chair(d.i), d.x - 12, d.y - 34 - d.lift);
    const s = students.find(t => t.desk === d.i && t.mode === 'seated');
    if (s) drawStudent(c, s, d.x - S.SW / 2, d.y - 15 - S.SH - d.lift);
    const item = G.save.deskItems[d.i];
    D(c, S.desk(d.i, !!item), d.x - S.DESK_W / 2, d.y - S.DESK_H - d.lift);
    if (item) D(c, DC.deskItem(item), d.x + 3, d.y - 28 - d.lift);
    if (s && s.snack) D(c, S.snack(s.snack.k || s.kind, s.snack.bites), d.x - 6, d.y - 26 - d.lift);
    const owner = students.find(t => t.desk === d.i);
    if (owner && owner.card && owner.mode !== 'away') {
      const cc = owner.card === 'red' ? '#ef4b4b' : '#3cb44b', fl = owner.cardT && G.time - owner.cardT < 0.4;
      R(c, d.x - 14, d.y - 13 - d.lift, fl ? 2 : 5, 7, darken(cc, 0.3)); if (!fl) R(c, d.x - 13, d.y - 12 - d.lift, 3, 5, cc);
    }
    if (s && s.stars) {
      const n = Math.min(3, s.stars);
      for (let k = 0; k < n; k++) D(c, S.particle('star', '#ffd23f'), d.x - n * 4 + k * 8, d.y - 10 - d.lift);
    }
  }
  function shadow(c, x, y, w) {
    c.fillStyle = 'rgba(80,40,30,0.18)';
    c.fillRect(Math.round(x - w / 2), Math.round(y - 1), Math.round(w), 2);
    c.fillRect(Math.round(x - w / 2 + 2), Math.round(y - 2), Math.round(w - 4), 4);
  }

  function drawItem(c, f) {
    const lift = f.lift || 0;
    if (f.type === 'desk') return drawDeskUnit(c, f);
    if (f.type === 'rug') { shadow(c, f.x, f.y, 80); return D(c, S.rug(DC.RUGS[G.save.rugV % DC.RUGS.length]), f.x - 42, f.y - 32 - lift); }
    if (f.type === 'plant') { D(c, S.plant(), f.x - 14, f.y - 38 - lift); RT.drawPlantExtra(c, f, lift); return; }
    if (f.type === 'shelf') return D(c, S.bookshelf(), f.x - 19, f.y - 46 - lift);
    if (f.type === 'teacher') return drawTeacher(c, f);
    const [w, h] = sizeOf(f);
    const bob = f.pop && G.time < f.pop ? -1 : 0;
    if (layerOf(f) === 'floor') shadow(c, f.x, f.y, w * 0.7);
    D(c, DC.decor(f.type, f.v), f.x - w / 2, f.y - h - lift + bob);
    if (f.type === 'clock') {
      const cx = f.x - 0.5, cy = f.y - h / 2 - 0.5 + bob, d = new Date();
      const hand = (ang, len, col) => { for (let r = 0; r <= len; r += 0.5) R(c, cx + Math.sin(ang) * r, cy - Math.cos(ang) * r, 1, 1, col); };
      hand((d.getHours() % 12 + d.getMinutes() / 60) * Math.PI / 6, 3.5, '#2b1d2e'); hand(d.getMinutes() * Math.PI / 30, 5.5, '#5a4560');
    }
    if (f.type === 'calendar') {
      const di = dayIndex(), top = f.y - h - lift + bob;
      const wd = wordSprite(DAY_SHORT[di], DAY_COLORS[di]);
      D(c, wd, f.x - wd.width / 2, top + 9);
      for (let k = 0; k < 5; k++) R(c, f.x - 12 + k * 5, top + 21, 4, 3, k === di ? DAY_COLORS[k] : '#e6dccb');
      RT.calBadge(c, f.x + w / 2 - 7, top - 3); // today's weather
    }
    if ((f.type === 'abc' || f.type === 'shapetable') && phase === 'class' && Math.floor(G.time * 2) % 9 === 0) {
      D(c, S.particle('spark', '#ffd23f'), f.x + w / 2 - 4, f.y - h - 2 + Math.round(Math.sin(G.time * 8)));
    }
    if (f.type === 'fishtank' && Math.floor(G.time * 2 + f.x) % 3 === 0) R(c, f.x + 5, f.y - h + 6 - Math.floor(G.time * 6) % 8, 1, 1, '#ffffff');
    if (f.type === 'lamp' && (sky === 'night' || sky === 'sunset' || dusk > 0.1)) { c.fillStyle = 'rgba(255,240,170,0.18)'; c.fillRect(Math.round(f.x - 14), Math.round(f.y - h + 10), 28, h - 10); }
  }
  function drawTeacher(c, f) {
    const { st, flip } = teacherPose();
    const img = DC.teacher(st);
    const x = Math.round(f.x - DC.TW / 2), y = Math.round(f.y - DC.TH - (f.lift || 0) - teach.z);
    shadow(c, f.x, f.y, 18);
    if (flip) { c.save(); c.translate(x + DC.TW, y); c.scale(-1, 1); c.drawImage(img, 0, 0); c.restore(); }
    else D(c, img, x, y);
  }
  function drawPoofHint(c, f) {
    const [w, h] = sizeOf(f);
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(Math.round(f.x - w / 2), Math.round(f.y - h), w, h);
  }
  function drawNewGhost(c) {
    const d = drag;
    if (d.desk) {
      const tgt = deskAt(d.px, d.py + 6);
      if (tgt) { c.fillStyle = 'rgba(255,230,110,0.6)'; c.fillRect(tgt.x - 16, tgt.y - 19, 32, 6); }
      D(c, scaled(DC.deskItem(d.type), 2), d.px - 14, d.py - 12);
      return;
    }
    const def = DC.DECOR[d.type];
    D(c, DC.decor(d.type, 0), d.px - def.w / 2, d.py - def.h / 2);
  }

  function render() {
    const c = V.ctx, { W, H } = V;
    c.drawImage(bg, 0, 0);
    drawWindow(c); drawDoor(c); drawBoard(c); drawAbcLine(c);
    RT.drawSwitch(c);
    // wall decorations
    for (const f of Object.values(furn)) if (layerOf(f) === 'wall' && !(drag && drag.f === f)) drawItem(c, f);
    // rug
    const rug = furn.rug;
    if (!(drag && drag.f === rug)) D(c, S.rug(DC.RUGS[G.save.rugV % DC.RUGS.length]), rug.x - 42, rug.y - 32);
    drawCenterProps(c);
    // y-sorted objects
    const objs = [];
    for (const f of Object.values(furn)) if (f.type !== 'rug' && layerOf(f) === 'floor' && !(drag && drag.f === f)) objs.push({ y: f.y, f });
    for (const s of students) if (s.mode !== 'seated' && s.mode !== 'away' && s.mode !== 'held') objs.push({ y: s.y, s });
    if (recess) objs.push({ y: recess.ball.y, ball: recess.ball });
    v19Objs(objs);
    objs.sort((a, b) => a.y - b.y);
    for (const o of objs) {
      if (o.f) drawItem(c, o.f);
      else if (o.s) {
        shadow(c, o.s.x, o.s.y, 16);
        drawStudent(c, o.s, o.s.x - S.SW / 2, o.s.y - S.SH);
        RT.overStudent(c, o.s, o.s.x - S.SW / 2, o.s.y - S.SH - o.s.z);
      } else if (o.ball) {
        const b = o.ball;
        if (RT.drawBall(c, b)) continue; // rainy recess: a soap bubble
        shadow(c, b.x, b.y, 8);
        D(c, cached('rball', () => { const p = new Pix(10, 10); p.ball(5, 5, 4.6, 4.6, '#ef6f6c'); p.ell(5, 5, 4.6, 4.6, '#ffd23f', { y0: 4, y1: 5 }, true); p.outline(); return p.canvas(); }), b.x - 5, b.y - 10 - b.z);
      } else if (o.draw) o.draw(c);
    }
    // particles + bubbles
    for (const p of parts) {
      if (p.life - p.t < 0.25 && Math.floor(p.t * 20) % 2) continue;
      const img = S.particle(p.kind, p.color);
      D(c, img, p.x - img.width / 2, p.y - img.height / 2);
    }
    for (const s of students) {
      if (s.mode === 'away') continue;
      const r = spriteRect(s);
      if (s.mood === 'triste' && !(s.hide > 0)) D(c, S.rainCloud(Math.floor(G.time * 4) % 2), r.x - 2, r.y - 6 - s.z + Math.round(Math.sin(G.time * 2)));
      if (!s.bubble) continue;
      const bk = s.bubble.kind;
      const im = bk.startsWith('m:') ? S.moodBubble(bk.slice(2)) : S.bubble(bk);
      D(c, im, r.x + 20, r.y - 4 - s.z + Math.round(Math.sin(G.time * 4)) - (bk.startsWith('m:') ? 8 : 0));
    }
    // dusk tint
    if (dusk > 0.01) { c.fillStyle = `rgba(40,30,90,${dusk * 0.55})`; c.fillRect(0, 0, W, H); }
    // held student
    const held = students.find(s => s.mode === 'held');
    if (held) {
      shadow(c, held.x, held.y + 10, 16);
      drawStudent(c, held, held.x - S.SW / 2, held.y - S.SH);
      const tgt = deskAt(held.x, held.y + 8);
      if (tgt) { c.fillStyle = 'rgba(255,230,110,0.5)'; c.fillRect(tgt.x - 17, tgt.y - 4, 34, 3); }
    }
    drawSnackTray(c);
    drawHud(c);
    drawTrash(c);
    // things being dragged float on top of everything (also the trash can)
    if (drag && drag.f) {
      const f = drag.f;
      if (layerOf(f) === 'floor') shadow(c, f.x, f.y, sizeOf(f)[0] * 0.8);
      drawItem(c, f);
      if (deco && overTray(drag.px, drag.py) && f.deco) drawPoofHint(c, f);
    }
    if (drag && drag.kind === 'new') drawNewGhost(c);
    drawArmed(c);
    drawSnackHeld(c);
    if (dayCard) drawDayCard(c);
    if (drag && drag.kind === 'star') {
      const st = drag.card ? DC.trayIcon(drag.card === 'green' ? 'cardGreen' : 'cardRed') : S.ICONS.star();
      const hov = hitStudent(drag.x, drag.y);
      if (hov) D(c, glow(st, '#fff6b8', 'starhud'), drag.x - 11, drag.y - 11);
      D(c, st, drag.x - 9, drag.y - 9);
    }
    drawOverlays(c);
  }

  function drawButton(c, b, pressed) {
    D(c, btnFrame(b.w, b.h), b.x, b.y + (pressed ? 1 : 0));
    D(c, b.icon(), b.x + (b.w - 18) / 2, b.y + (b.h - 18) / 2 - 1 + (pressed ? 1 : 0));
  }
  function hudVisible() { return phase === 'class' || phase === 'activity' || phase === 'prep'; }
  function shownBtns() {
    if (phase === 'prep') return btns.filter(b => ['stickers', 'bell', 'decorate', 'help'].includes(b.id));
    if (phase !== 'class' && phase !== 'activity') return [];
    return btns.filter(b => ['stickers', 'home', 'decorate', 'help'].includes(b.id) || (!deco && !serve && ['star', 'toys', 'cardGreen', 'cardRed'].includes(b.id)) || ((recess || centros) && b.id === 'toys') || (centros && centros.stage === 'run' && b.id === 'cdone') || (b.id === 'jobs' && phase === 'class' && !deco && !serve));
  }
  function drawHud(c) {
    if (!hudVisible()) return;
    if (deco && !(drag && drag.kind === 'new' && drag.left)) drawTray(c);
    for (const b of shownBtns()) {
      if (b.id === 'toys' && (story || recess || centros)) continue;
      if (b.id === 'bell') { // big pulsing "start class" bell
        const k = G.time < bellBob ? Math.round(Math.abs(Math.sin(G.time * 12)) * 3) : Math.sin(G.time * 5) > 0.3 ? 1 : 0;
        D(c, btnFrame(b.w, b.h, k ? '#fff6c8' : '#fff3dc'), b.x, b.y - k);
        D(c, b.icon(), b.x + 4, b.y + 3 - k + (Math.floor(G.time * 6) % 2 && k ? 1 : 0));
        continue;
      }
      if (b.id === 'home' && G.time < homeArm) { // asked "¿Ya nos vamos a casa?": tap again to go
        const k = Math.round(Math.abs(Math.sin(G.time * 7)) * 2);
        D(c, glow(btnFrame(b.w, b.h, '#fff6c8', 'on'), '#ffd23f', 'homeglow'), b.x - 2, b.y - 2 - k);
        D(c, btnFrame(b.w, b.h, '#fff6c8', 'on'), b.x, b.y - k);
        const ic = b.icon(); D(c, ic, b.x + (b.w - ic.width) / 2, b.y + (b.h - ic.height) / 2 - 1 - k);
        continue;
      }
      const on = b.id === 'decorate' && deco;
      D(c, btnFrame(b.w, b.h, on ? '#fff6c8' : '#fff3dc', on ? 'on' : ''), b.x, b.y + (press && press.btn === b ? 1 : 0));
      const ic = b.icon();
      D(c, ic, b.x + (b.w - ic.width) / 2, b.y + (b.h - ic.height) / 2 - 1 + (press && press.btn === b ? 1 : 0));
    }
    if ((recess || (centros && centros.stage === 'run')) && !deco) { // bell: end recess / rotate centros
      const b = btns.find(x => x.id === 'toys');
      D(c, btnFrame(b.w, b.h, '#fff3dc'), b.x, b.y);
      D(c, cached('bellicon', bellIcon), b.x + 4, b.y + 3);
    }
    // attendance chart
    if (phase === 'prep') return;
    const ch = L.chart;
    D(c, btnFrame(5 * 14 + 4, 18, '#fffaf0', 'chart'), ch.x, ch.y);
    students.forEach((s, k) => {
      const img = miniFace(s.kind, s.here);
      const bob = s.here && acting(s, 'here') ? -1 : 0;
      D(c, img, ch.x + 2 + k * 14, ch.y + 2 + bob);
      if (s.card) R(c, ch.x + 2 + k * 14, ch.y + 14, 4, 2, s.card === 'red' ? '#ef4b4b' : '#3cb44b');
      drawChartExtras(c, s, ch.x + 2 + k * 14, ch.y);
      if (s.here) D(c, cached('tick', () => { const p = new Pix(6, 5); p.line(0, 2, 2, 4, '#3cb44b'); p.line(2, 4, 5, 0, '#3cb44b'); p.line(1, 2, 2, 3, '#3cb44b'); return p.canvas(); }), ch.x + 9 + k * 14, ch.y + 10);
    });
  }
  function sayNo() { sfx.thump(); setTimeout(() => sfx.thump(), 170); } // "not now" (e.g. offline refresh)
  function bellIcon() {
    const p = new Pix(18, 18);
    p.ball(9, 9, 6, 6.5, '#ffd23f', { clip: { y1: 12 } }); p.rect(2, 12, 14, 2, '#e0a820'); p.ball(9, 15, 1.6, 1.6, '#a8703f'); p.rect(8, 1, 2, 2, '#a8703f');
    p.outline(); return p.canvas();
  }

  // ---------------------------------------------------------------- decorate tray
  function trayItems() {
    const tab = deco.tab, out = [];
    const ix0 = T.x + 48, iw = T.x + T.w - ix0 - 3;
    if (tab === 'floor' || tab === 'wall') {
      const list = tab === 'floor' ? DC.FLOOR_ITEMS : DC.WALL_ITEMS;
      const sum = list.reduce((a, t) => a + DC.DECOR[t].w, 0);
      const gap = Math.max(0, (iw - sum) / list.length);
      let x = ix0 + gap / 2;
      for (const t of list) {
        const d = DC.DECOR[t];
        out.push({ kind: tab, id: t, x, y: T.y + 2, w: d.w, h: T.h - 4, img: DC.decor(t, 0), ix: x, iy: T.y + T.h - 3 - Math.min(d.h, T.h - 6) - (tab === 'wall' ? Math.floor((T.h - 6 - d.h) / 2) : 0) });
        x += d.w + gap;
      }
    } else if (tab === 'desk') {
      const n = DC.DESK_ITEMS.length, cw = Math.min(34, Math.floor(iw / n));
      DC.DESK_ITEMS.forEach((t, k) => out.push({ kind: 'desk', id: t, x: ix0 + k * cw, y: T.y + 2, w: cw, h: T.h - 4, img: scaled(DC.deskItem(t), 2), ix: ix0 + k * cw + (cw - 28) / 2, iy: T.y + 13 }));
    } else {
      DC.WALLS.forEach((_, k) => out.push({ kind: 'paintWall', id: k, x: ix0 + k * 22, y: T.y + 3, w: 21, h: 21, img: DC.swatch('wall', k), ix: ix0 + k * 22 + 1, iy: T.y + 4 }));
      DC.FLOORS.forEach((_, k) => out.push({ kind: 'paintFloor', id: k, x: ix0 + k * 22, y: T.y + 26, w: 21, h: 21, img: DC.swatch('floor', k), ix: ix0 + k * 22 + 1, iy: T.y + 27 }));
      const k = DC.FLOORS.length;
      out.push({ kind: 'rug', id: 0, x: ix0 + k * 22 + 4, y: T.y + 26, w: 30, h: 21, img: cached('rugicon', () => { const c2 = document.createElement('canvas'); c2.width = 28; c2.height = 11; const x2 = c2.getContext('2d'); x2.imageSmoothingEnabled = false; x2.drawImage(S.rug(DC.RUGS[0]), 0, 0, 84, 32, 0, 0, 28, 11); return c2; }), ix: ix0 + k * 22 + 5, iy: T.y + 31 });
    }
    return out;
  }
  const TABS = ['floor', 'wall', 'desk', 'paint'];
  function tabRect(k) { return { x: T.x + 3 + (k % 2) * 22, y: T.y + 3 + Math.floor(k / 2) * 22, w: 21, h: 21 }; }
  function overTray(x, y) { return deco && x >= T.x && y >= T.y; }
  function drawTray(c) {
    D(c, btnFrame(Math.round(T.w), T.h, '#fff3dc', 'tray'), T.x, T.y);
    R(c, T.x + 47, T.y + 3, 1, T.h - 7, '#e3cfae');
    TABS.forEach((t, k) => {
      const r = tabRect(k), on = deco.tab === t;
      D(c, btnFrame(r.w, r.h, on ? '#ffe08a' : '#fffaf0', 'tab' + on), r.x, r.y);
      D(c, DC.trayIcon(t), r.x + 1, r.y + 1);
    });
    for (const it of trayItems()) {
      const sel = (it.kind === 'paintWall' && G.save.paint.wall === it.id) || (it.kind === 'paintFloor' && G.save.paint.floor === it.id);
      if (sel) R(c, it.x - 1, it.y - 1, it.w + 1, it.h + 1, '#ffd23f');
      const lifted = press && press.trayItem && press.trayItem.id === it.id && press.trayItem.kind === it.kind;
      D(c, it.img, it.ix, it.iy - (lifted ? 2 : 0));
    }
  }
  function cheerDecor(x, y) {
    burst('spark', x, y, 10, ['#ffd23f', '#ff9ec4', '#7ec8ff', '#ffffff'], { sp: 60 });
    sfx.sparkle();
    teacherAct(Math.random() < 0.5 ? 'clap' : 'cheer', 1);
    const aw = awake().filter(s => s.mode === 'seated');
    if (aw.length && Math.random() < 0.6) { const s = pick(aw); act(s, 'gasp', 0.8); speak(s, pick(['Ooh!', 'Pretty!', 'Wow!', 'I like it!']), 'ooh'); }
  }
  function addDecor(type, x, y) {
    if (Object.values(furn).filter(f => f.deco).length >= 40) { sfx.softPop(); return; }
    const id = 'd' + (uid++);
    const def = DC.DECOR[type];
    const f = { id, type, deco: true, v: 0, x, y: y + def.h / 2, fx: 0, fy: 0, lift: 0, pop: G.time + 0.25 };
    furn[id] = f;
    clampItem(f); remember(f);
    sfx.thump(); cheerDecor(f.x, f.y - def.h / 2); sayItem(type);
  }
  function quickPlace(type) {
    const def = DC.DECOR[type];
    if (def.layer === 'wall') addDecor(type, rand(30, V.W - 30), rand(def.h / 2 + 8, L.wallH - 22 - def.h / 2));
    else addDecor(type, rand(30, V.W - 30), rand(L.floorTop + 20, T.y - 10) - def.h / 2);
  }
  function setDeskItem(d, type) {
    G.save.deskItems[d.i] = type; G.save.decorStamp++; persist(); sayItem(type);
    sfx.pop(1.3); burst('spark', d.x + 9, d.y - 24, 8, ['#ffd23f', '#ffffff', '#ff9ec4']);
    const s = students.find(t => t.desk === d.i && t.mode === 'seated');
    if (s) { act(s, 'happy', 1); talk(s, 'heart', 1.4); speak(s, 'Thank you!', 'yay'); }
    if (desks.every(q => G.save.deskItems[q.i])) wait(0.4).then(() => { sfx.chime(); teacherAct('cheer', 1.2); for (const q of desks) burst('star', q.x, q.y - 26, 3, ['#ffd23f'], { up: true }); });
  }
  function removeDecor(f) {
    delete furn[f.id];
    saveDecor();
    sfx.whoosh(); burst('spark', f.x, f.y - sizeOf(f)[1] / 2, 8, ['#ffffff', '#d8f0ff']);
  }
  function cycleVariant(f) {
    if (f.type === 'rug') { G.save.rugV = (G.save.rugV + 1) % DC.RUGS.length; G.save.decorStamp++; persist(); }
    else { f.v = (f.v + 1) % DC.DECOR[f.type].variants.length; saveDecor(); }
    f.pop = G.time + 0.2; sfx.pop(1.2);
    burst('spark', f.x, f.y - sizeOf(f)[1] / 2, 5, ['#ffd23f', '#ffffff']);
  }
  function enterPrep() {
    phase = 'prep'; sky = 'morning'; duskTarget = 0; busy = false;
    for (const s of students) Object.assign(s, { mode: 'away', act: null, bubble: null, snack: null });
    deco = { tab: 'floor' };
    teacherAct('wave', 1.6);
    prepStamp = G.save.decorStamp; lastInput = G.time; nextHintAt = G.time + 8;
  }

  // ---------------------------------------------------------------- trash can
  function trashRect() { return { x: Math.round(V.W / 2 - 13), y: (deco ? T.y : V.H - V.inset.b) - 34, w: 26, h: 30 }; }
  // only things already in the room can be thrown away; a fresh drag from the tray never is
  function trashing() { return drag && ((drag.kind === 'furn' && drag.f.deco) || (drag.kind === 'new' && drag.from !== undefined)); }
  function overTrash(x, y) { if (!trashing()) return false; return nearTrash(x, y); }
  function nearTrash(x, y) { const r = trashRect(); return x >= r.x - 10 && x <= r.x + r.w + 10 && y >= r.y - 10 && y <= r.y + r.h + 8; }
  function drawTrash(c) {
    if (!trashing()) return;
    const r = trashRect(), over = overTrash(drag.px, drag.py);
    c.fillStyle = 'rgba(40,30,60,0.2)'; c.fillRect(r.x + 2, r.y + r.h - 1, r.w - 4, 2);
    D(c, DC.trash(over), r.x, r.y - (over ? 1 : 0) + (over ? 0 : Math.round(Math.sin(G.time * 5))));
  }
  function trashIt(x, y) {
    sfx.trash(); sayUI('trash');
    burst('crumb', x, y, 10, ['#d8d0c8', '#bfe0f5', '#ffffff'], { up: true, sp: 50, g: 120 });
    const r = trashRect(); burst('spark', r.x + 13, r.y + 4, 5, ['#ffffff', '#bfe6ff']);
  }
  function drawDayCard(c) {
    const k = G.time - dayCard.t0, di = dayCard.day;
    if (k > 3.1) { dayCard = null; return; }
    const card = cached('daycard' + di, () => {
      const cv = document.createElement('canvas'); const w = 132, h = 66; cv.width = w; cv.height = h;
      const x = cv.getContext('2d');
      const r = (a, b, cw, ch, col) => { x.fillStyle = col; x.fillRect(a, b, cw, ch); };
      r(2, 4, w - 4, h - 6, '#b9a99a'); r(0, 3, w - 2, h - 5, '#fffaf0');
      r(0, 3, w - 2, 12, DAY_COLORS[di]); r(0, 3, w - 2, 2, lighten(DAY_COLORS[di], 0.4));
      for (const rx of [24, w - 30]) { r(rx, 0, 4, 9, '#9aa7b8'); r(rx, 0, 4, 1, '#d6dee8'); }
      const wd = wordSprite(DAY_WORDS[di], DAY_COLORS[di], 2);
      x.drawImage(wd, Math.round((w - 2 - wd.width) / 2), 22);
      for (let q = 0; q < 5; q++) r(Math.round((w - 2) / 2 - 31 + q * 13), 48, 10, 8, q === di ? DAY_COLORS[q] : '#e6dccb');
      return cv;
    });
    const { W, H } = V;
    let cx = W / 2, cy = H * 0.42, s = Math.min(1, k / 0.25);
    if (k > 2.4) { // fly to the wall calendar
      const q = Math.min(1, (k - 2.4) / 0.6), cal = furn.calendar, [, ch] = sizeOf(cal);
      cx += (cal.x - cx) * q; cy += (cal.y - ch / 2 - cy) * q; s = 1 - q * 0.8;
    }
    const w = Math.round(card.width * s), h = Math.round(card.height * s);
    c.drawImage(card, Math.round(cx - w / 2), Math.round(cy - h / 2 + (k < 2.4 ? Math.sin(G.time * 3) * 2 : 0)), w, h);
    if (k > 0.3 && k < 2.4 && Math.random() < 0.3) burst('spark', cx + rand(-60, 60), cy + rand(-30, 30), 1, ['#ffd23f', DAY_COLORS[di]], { sp: 20 });
  }

  function drawOverlays(c) {
    const { W, H } = V;
    if (phase === 'title' || phase === 'night') {
      c.fillStyle = phase === 'title' ? 'rgba(255,240,220,0.35)' : 'rgba(20,16,50,0.35)'; c.fillRect(0, 0, W, H);
      const k = 3;
      const ic = phase === 'title' ? S.ICONS.play() : S.ICONS.sun();
      const big = scaled(ic, k);
      const pulse = Math.round(Math.sin(G.time * 4) * 2);
      const bx = Math.round(W / 2 - big.width / 2), by = Math.round(H * 0.58 - big.height / 2) + pulse;
      D(c, btnFrame(big.width + 12, big.height + 12, '#fff3dc', 'big'), bx - 6, by - 6);
      D(c, big, bx, by);
      L.bigBtn = { x: bx - 6, y: by - 6, w: big.width + 12, h: big.height + 12 };
      if (phase === 'title' || phase === 'night') { // grown-up corner: version, refresh, music on/off
        const vt = wsprite('v' + VERSION, '#8a7a90');
        const vx = W - V.inset.r - vt.width - 4, vy = H - V.inset.b - vt.height - 3;
        D(c, vt, vx, vy);
        L.updBtn = { x: vx - 24, y: vy - 8, w: 22, h: 22 };
        const glowOn = updateAvail && Math.floor(G.time * 3) % 2;
        D(c, btnFrame(22, 22, glowOn ? '#fff3a0' : '#fff3dc', 'upd' + !!glowOn), L.updBtn.x, L.updBtn.y);
        // grey, for grown-ups (not the green of Play or the letters' ↻); hold 1.5 s, a ring fills while held
        D(c, cached('updicon2', () => { const p = new Pix(16, 16), g = '#9a8ea0'; for (let a = -2.6; a < 2.0; a += 0.06) { p.px(8 + Math.cos(a) * 5.5, 8 + Math.sin(a) * 5.5, g); p.px(8 + Math.cos(a) * 4.6, 8 + Math.sin(a) * 4.6, g); } p.map(10, 1, ['###', '.##', '..#'], { '#': g }); return p.canvas(); }), L.updBtn.x + 3, L.updBtn.y + 2);
        if (press && press.upd) {
          const k = Math.min(1, (performance.now() - press.updT0) / 1500), cx = L.updBtn.x + 11, cy = L.updBtn.y + 11;
          for (let a = 0; a < k * Math.PI * 2; a += 0.05) for (const rr of [12, 13]) R(c, cx + Math.sin(a) * rr - 0.5, cy - Math.cos(a) * rr - 0.5, 1, 1, k >= 1 ? '#7a5bc0' : '#8a7a90');
        }
        L.musBtn = { x: W - V.inset.r - 26, y: V.inset.t + 4, w: 22, h: 22 };
        const mOn = G.save.music !== false;
        D(c, btnFrame(22, 22, '#fff3dc', 'mus'), L.musBtn.x, L.musBtn.y);
        D(c, cached('musicon' + mOn, () => { const p = new Pix(16, 16); p.map(3, 2, ['....######', '....#....#', '....#....#', '....#....#', '..###..###', '.####.####', '..##...##.'], { '#': mOn ? '#7a5bc0' : '#b9a9c0' }); if (!mOn) { p.line(1, 14, 14, 1, '#ef4b4b'); p.line(2, 14, 15, 1, '#ef4b4b'); } p.outline(); return p.canvas(); }), L.musBtn.x + 3, L.musBtn.y + 3);
        if (!updateChecked) { updateChecked = true; fetch('js/version.js', { cache: 'no-store' }).then(r => r.text()).then(t => { const m = t.match(/VERSION = '([^']+)'/); if (m && m[1] !== VERSION) updateAvail = m[1]; }).catch(() => {}); }
      }
      if (phase === 'title') {
        // a row of the five friends peeking up to say hello
        D(c, DC.teacher({ eyes: Math.floor(G.time * 1.1) % 6 === 0 ? 'blink' : 'happy', mouth: 'grin', armL: Math.floor(G.time * 4) % 2 ? 'wave1' : 'wave2', armR: 'down', sway: Math.floor(G.time * 1.2) % 2 }), W / 2 - 15, H * 0.58 - 106);
        students.forEach((s, i) => {
          const img = S.student(s.kind, { eyes: Math.floor(G.time * 1.3 + i) % 5 === 0 ? 'blink' : 'happy', mouth: 'smile', armL: i % 2 ? 'wave1' : 'down', armR: 'down', feet: 0, look: 0, blush: true, hide: 0, wag: false, earUp: false, tongue: s.kind === 'puppy' });
          D(c, img, W / 2 + [-110, -74, 40, 76, 112][i] - 17, H * 0.58 - 92 + Math.round(Math.abs(Math.sin(G.time * 3 + i)) * -3));
        });
      } else {
        const n = G.save.stickers.length;
        const stk = n ? S.sticker(G.save.stickers[n - 1]) : null;
        if (stk) D(c, scaled(stk, 2), W / 2 - 32, H * 0.58 - 100);
      }
    }
    if (menu) {
      c.fillStyle = 'rgba(40,30,60,0.45)'; c.fillRect(0, 0, W, H);
      for (const m of menu.items) {
        D(c, btnFrame(m.w, m.h, '#fff3dc', 'menu'), m.x, m.y);
        D(c, scaled(m.icon(), 2), m.x + 6, m.y + 6);
      }
    }
    if (story) drawStory(c);
    if (reward) drawReward(c);
    if (bookOpen) drawStickerBook(c);
    quiz.render(c, V);
    if (centros && centros.stage === 'chart') drawCentrosChart(c);
    RT.render(c); // weather picker + jobs chart
    drawHint(c);
  }
  function drawStory(c) {
    if (story.stage === 'choose') { drawBookChooser(c); return; }
    const { W, H } = V, bk = BOOKS[story.book];
    const pw = 104, ph = 88, rw = 46; // the picture is the page art at 2x; the right page shows how far we've read
    const open = story.page >= 0;
    const bw = open ? pw + rw + 14 : pw + 18, bh = ph + 12;
    const x = Math.round(W / 2 - bw / 2), y = clamp(Math.round(L.floorTop - bh / 2 - 4), V.inset.t + 30, Math.max(V.inset.t + 30, H - bh - 4));
    L.storyBook = { x, y, w: bw, h: bh };
    c.fillStyle = 'rgba(30,20,40,0.3)'; c.fillRect(x + 3, y + 4, bw, bh);
    R(c, x - 2, y - 2, bw + 4, bh + 4, darken(bk.dark, 0.3)); R(c, x, y, bw, bh, bk.color);
    if (!open) { // the cover, big
      R(c, x, y, 7, bh, bk.dark); R(c, x + 7, y, 1, bh, lighten(bk.color, 0.4));
      R(c, x + 10, y + 4, pw + 4, ph + 4, '#fffaf0'); D(c, scaled(bk.cover(), 2), x + 12, y + 6);
    } else {
      R(c, x + 4, y + 3, pw + 4, bh - 6, '#fffaf0');
      const pages = bk.pages;
      D(c, scaled(pages[Math.min(story.page, pages.length - 1)](), 2), x + 6, y + 6);
      const rx = x + pw + 8;
      R(c, rx, y + 3, rw + 2, bh - 6, '#fff3e0'); R(c, rx - 1, y + 2, 2, bh - 4, '#d8c7a8');
      pages.forEach((_, k) => { // one star per page, lit up to here
        const sx = rx + 8 + (k % 2) * 18, sy = y + 10 + Math.floor(k / 2) * 18;
        const on = k <= story.page, img = scaled(S.particle('star', on ? ['#ffd23f', '#ff6f91', '#64a8e8', '#7dd370'][k % 4] : '#e6dccb'), 2);
        D(c, img, sx, sy - (k === story.page ? Math.round(Math.abs(Math.sin(G.time * 4)) * 2) : 0));
      });
    }
    const k = Math.floor(G.time * 2) % 2;
    D(c, scaled(S.ICONS.play(), open ? 2 : 1), x + bw - (open ? 42 : 22), y + bh - (open ? 42 : 22) - k);
  }
  function drawReward(c) {
    const { W, H } = V;
    c.fillStyle = 'rgba(20,16,50,0.45)'; c.fillRect(0, 0, W, H);
    const k = G.time - reward.t;
    const big = scaled(S.sticker(reward.id), 3);
    let cx = W / 2, cy = H / 2;
    let scale = Math.min(1, k * 3);
    if (reward.collected) {
      const q = Math.min(1, (G.time - reward.ct) / 0.8);
      const b = btns[0];
      cx = cx + (b.x + 13 - cx) * q; cy = cy + (b.y + 13 - cy) * q; scale = 1 - q * 0.8;
    }
    const sw = big.width * scale, sh = big.height * scale;
    // sunburst
    if (!reward.collected) {
      c.save(); c.translate(Math.round(cx), Math.round(cy));
      for (let a = 0; a < 12; a++) {
        const ang = a * Math.PI / 6 + G.time * 0.4;
        c.fillStyle = a % 2 ? 'rgba(255,230,120,0.35)' : 'rgba(255,255,255,0.25)';
        c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ang) * 140, Math.sin(ang) * 140); c.lineTo(Math.cos(ang + 0.26) * 140, Math.sin(ang + 0.26) * 140); c.fill();
      }
      c.restore();
    }
    c.drawImage(big, Math.round(cx - sw / 2), Math.round(cy - sh / 2 + Math.sin(G.time * 3) * 2), Math.round(sw), Math.round(sh));
    L.rewardRect = { x: cx - 40, y: cy - 40, w: 80, h: 80 };
  }
  function drawStickerBook(c) {
    const { W, H } = V;
    c.fillStyle = 'rgba(40,30,60,0.5)'; c.fillRect(0, 0, W, H);
    const bw = Math.min(W - 40, 236), bh = Math.min(H - 30, 150);
    const x = Math.round(W / 2 - bw / 2), y = Math.round(H / 2 - bh / 2);
    R(c, x - 3, y - 3, bw + 6, bh + 6, '#4f97d6'); R(c, x, y, bw, bh, '#7ec8ff');
    R(c, x + 4, y + 4, bw / 2 - 5, bh - 8, '#fffaf0'); R(c, x + bw / 2 + 1, y + 4, bw / 2 - 5, bh - 8, '#fffaf0');
    R(c, x + bw / 2 - 1, y + 3, 2, bh - 6, '#bcd8ee');
    const cols = 3, rows = 3, cell = Math.min(Math.floor((bw / 2 - 10) / cols), Math.floor((bh - 14) / rows));
    const all = G.save.stickers;
    const pageSize = cols * rows * 2;
    const pg = bookOpen.page;
    for (let side = 0; side < 2; side++) {
      const ox = x + 6 + side * (bw / 2 + 1) + Math.floor((bw / 2 - 10 - cols * cell) / 2), oy = y + 7 + Math.floor((bh - 14 - rows * cell) / 2);
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const idx = pg * pageSize + side * cols * rows + r * cols + q;
        const cx = ox + q * cell, cy = oy + r * cell;
        R(c, cx + 2, cy + 2, cell - 4, cell - 4, '#f1e9dc');
        if (idx < all.length) {
          const img = S.sticker(all[idx]);
          const isNew = idx === all.length - 1 && G.time - bookOpen.t < 2;
          const bob = isNew ? Math.round(Math.sin(G.time * 8)) : 0;
          D(c, img, cx + cell / 2 - 16, cy + cell / 2 - 16 + bob);
        }
      }
    }
    // page arrows when needed + close button
    const pages = Math.max(1, Math.ceil(all.length / pageSize));
    L.bookRect = { x: x - 3, y: y - 3, w: bw + 6, h: bh + 6 };
    L.bookBack = { x: Math.max(V.inset.l + 2, x - 12), y: Math.max(V.inset.t + 2, y - 12), w: 26, h: 26 };
    D(c, btnFrame(26, 26), L.bookBack.x, L.bookBack.y); D(c, S.ICONS.back(), L.bookBack.x + 4, L.bookBack.y + 3);
    L.bookNext = pages > 1 ? { x: x + bw - 12, y: y + bh - 14, w: 26, h: 26 } : null;
    if (L.bookNext) { D(c, btnFrame(26, 26), L.bookNext.x, L.bookNext.y); D(c, S.ICONS.play(), L.bookNext.x + 4, L.bookNext.y + 3); }
  }

  // ---------------------------------------------------------------- input
  function deskAt(x, y) {
    let best = null, bd = 30;
    for (const d of desks) { const dd = Math.hypot(d.x - x, (d.y - 20) - y); if (dd < bd) { bd = dd; best = d; } }
    return best;
  }
  function down(x, y) {
    press = { x0: x, y0: y, x, y, moved: false, t: G.time };
    lastInput = G.time; hint = null;
    if (quiz.active) { press.quiz = true; return; }
    if (RT.down(x, y)) { press.rt = true; return; } // weather picker / jobs chart
    if (centros && centros.stage === 'chart') {
      press.cchart = true;
      const f = faceRects().find(r => inRect(x, y, r));
      if (f) { centros.drag = { s: f.s, x, y }; sfx.lift(); }
      return;
    }
    if (centros && centros.stage === 'run') {
      const sg = centerSigns().find(r => inRect(x, y, { x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 }));
      if (sg) { press.sign = sg; return; }
    }
    if (phase === 'title' || phase === 'night') {
      if (L.updBtn && inRect(x, y, L.updBtn)) { press.upd = true; press.updT0 = performance.now(); return; }
      if (L.musBtn && inRect(x, y, L.musBtn)) { press.mus = true; return; }
      if (L.bigBtn && inRect(x, y, L.bigBtn)) press.big = true; return;
    }
    if (reward) { press.reward = true; return; }
    if (bookOpen) { press.book = true; return; }
    if (menu) { press.menu = true; return; }
    if (phase === 'morning' && !hurry) hurryUp(x, y);
    if (snackDown(x, y)) return;
    if (armed) { // holding a star / card: the next student tap gets it, a tap anywhere else puts it back
      const b = shownBtns().find(q => inRect(x, y, q));
      if (!b) {
        const s = hitStudent(x, y);
        if (s) { press.armedS = s; return; }
        armed = null; sfx.softPop(); press.swallow = true; return;
      }
      if (!ARM_IDS.includes(b.id)) armed = null;
    }
    if (story && !shownBtns().some(q => inRect(x, y, q) && ['help', 'home', 'stickers'].includes(q.id))) { press.story = true; return; }
    for (const b of shownBtns()) if (inRect(x, y, b)) {
      press.btn = b;
      if (b.id === 'star' && !busy) { drag = { kind: 'star', x, y }; sfx.lift(); }
      if (['star', 'cardGreen', 'cardRed'].includes(b.id)) sayUI(b.id);
      if ((b.id === 'cardGreen' || b.id === 'cardRed') && !busy) { drag = { kind: 'star', x, y, card: b.id === 'cardGreen' ? 'green' : 'red' }; sfx.lift(); }
      return;
    }
    if (deco && inRect(x, y, T)) {
      press.tray = true;
      TABS.forEach((t, k) => { if (inRect(x, y, tabRect(k))) press.tab = t; });
      if (!press.tab) press.trayItem = trayItems().find(it => inRect(x, y, it));
      return;
    }
    if (phase !== 'prep' && inRect(x, y, L.chart)) { press.chart = true; return; }
    if (phase !== 'class' && phase !== 'activity' && phase !== 'prep') return;
    if (RT.hitSwitch(x, y)) { press.lightSw = true; return; }
    if (!busy && !story) for (const d of desks) {
      if (G.save.deskItems[d.i] && inRect(x, y, { x: d.x + 1, y: d.y - 30, w: 18, h: 16 })) { press.deskItem = d; break; }
    }
    if (press.deskItem) return;
    if (v19Down(x, y)) return;
    const s = hitStudent(x, y);
    if (s) { press.s = s; return; }
    if (busy) return;
    const f = hitFurn(x, y);
    if (f) { press.f = f; return; }
    const ab = abcAt(x, y);
    if (ab) { press.abc = ab; return; }
    if (inRect(x, y, L.board)) { press.board = true; }
    else if (inRect(x, y, L.door)) { press.door = true; }
  }
  function move(x, y) {
    if (!press) return;
    press.x = x; press.y = y;
    if (press.rt) { RT.move(x, y); return; }
    if (snackMove(x, y)) return;
    if (press.cchart) { if (centros && centros.drag) { centros.drag.x = x; centros.drag.y = y; } return; }
    if (!press.moved && Math.hypot(x - press.x0, y - press.y0) > 6) {
      press.moved = true;
      const ti = press.trayItem;
      if (press.deskItem) {
        const d = press.deskItem, type = G.save.deskItems[d.i];
        delete G.save.deskItems[d.i]; persist();
        drag = { kind: 'new', type, desk: true, from: d.i, px: x, py: y, left: true };
        sfx.lift();
      } else if (ti && ['floor', 'wall', 'desk'].includes(ti.kind)) {
        drag = { kind: 'new', type: ti.id, desk: ti.kind === 'desk', px: x, py: y };
        sfx.lift();
      } else if (press.f && !busy && !story) {
        drag = { kind: 'furn', f: press.f, ox: press.f.x - press.x0, oy: press.f.y - press.y0, px: x, py: y };
        press.f.lift = 3; sfx.lift();
      } else if (press.s && !busy && !story && !recess && (press.s.mode === 'seated' || press.s.mode === 'stand')) {
        const s = press.s;
        if (coax(s)) { /* waking up first */ }
        s.prevMode = s.mode; s.mode = 'held'; s.sleep = false; s.hide = 0; s.act = null;
        drag = { kind: 'student', s };
        sfx.boing(); talk(s, 'heart', 0.8);
      }
    }
    if (!drag) return;
    if (drag.kind === 'star') { drag.x = x; drag.y = y; }
    if (drag.kind === 'new') { drag.px = x; drag.py = y; if (y < T.y - 4 || drag.desk) drag.left = true; }
    if (drag.kind === 'furn') {
      const f = drag.f;
      drag.px = x; drag.py = y;
      f.x = x + drag.ox; f.y = y + drag.oy;
      clampItem(f);
    }
    if (drag.kind === 'student') { drag.s.x = x; drag.s.y = y + 16; }
  }
  function up() {
    const p = press; press = null;
    if (!p) return;
    if (p.rt) { RT.up(p.x, p.y, p.moved); return; }
    if (snackUp(p)) return;
    if (drag) {
      const d = drag; drag = null;
      if (d.kind === 'star') {
        const s = hitStudent(d.x, d.y);
        if (s && p.moved) { armed = null; if (d.card) giveCard(s, d.card); else awardStar(s); }
        else if (!p.moved || inRect(d.x, d.y, p.btn)) { // a tap picks the star / card up (tap a student next); tap again to put it back
          if (armed && armed.id === p.btn.id) { armed = null; sfx.softPop(); }
          else { armed = { id: p.btn.id, t0: G.time, until: G.time + 6 }; sfx.lift(); burst('spark', p.btn.x + 13, p.btn.y + 2, 6, [p.btn.id === 'cardRed' ? '#ef4b4b' : p.btn.id === 'cardGreen' ? '#3cb44b' : '#ffd23f', '#ffffff']); }
        } else sfx.softPop();
        return;
      }
      if (d.kind === 'new') {
        if (d.from !== undefined && nearTrash(d.px, d.py)) { trashIt(d.px, d.py); G.save.decorStamp++; persist(); return; }
        if (d.desk) {
          const tgt = deskAt(d.px, d.py + 6);
          if (d.from !== undefined && (!tgt || tgt.i === d.from)) { G.save.deskItems[d.from] = d.type; persist(); sfx.softPop(); return; }
          if (d.from !== undefined && tgt && G.save.deskItems[tgt.i]) G.save.deskItems[d.from] = G.save.deskItems[tgt.i]; // swap
        }
        if (d.desk) { const tgt = deskAt(d.px, d.py + 6); if (tgt) setDeskItem(tgt, d.type); else sfx.softPop(); return; }
        if (!d.left && overTray(d.px, d.py)) { sfx.softPop(); return; }
        addDecor(d.type, d.px, d.py);
        return;
      }
      if (d.kind === 'furn') {
        const f = d.f; f.lift = 0;
        if (f.deco && nearTrash(d.px, d.py)) { delete furn[f.id]; saveDecor(); trashIt(f.x, f.y - sizeOf(f)[1] / 2); return; }
        if (f.deco && overTray(d.px, d.py)) { removeDecor(f); return; }
        remember(f); sfx.thump();
        if (f.type === 'teacher') teacherAct('wave', 1);
        burst('crumb', f.x, f.y, 6, ['#d9c3a0', '#c9b08a'], { up: true, sp: 25, g: 100, life: 0.5 });
        return;
      }
      if (d.kind === 'student') {
        const s = d.s;
        const tgt = deskAt(s.x, s.y - 8);
        s.mode = 'stand';
        sfx.boing();
        if (tgt && tgt.i !== s.desk) {
          const other = students.find(t => t.desk === tgt.i);
          const old = s.desk;
          s.desk = tgt.i;
          if (other) { other.desk = old; if (other.mode === 'seated') { Object.assign(other, seat(other)); other.y -= 0; other.mode = 'stand'; hop(other, 60); talk(other, 'heart', 1); sendToSeat(other); } }
          G.save.seats = Object.fromEntries(students.map(t => [t.kind, t.desk])); persist();
          act(s, 'happy', 0.8);
        }
        sendToSeat(s);
        return;
      }
    }
    const { x, y } = p;
    if (p.swallow) return;
    if (p.quiz) { quiz.tap(x, y); return; }
    if (p.armedS) {
      if (!p.moved && armed) { const a = armed; armed = null; if (a.id === 'star') awardStar(p.armedS); else giveCard(p.armedS, a.id === 'cardGreen' ? 'green' : 'red'); }
      return;
    }
    if (p.cchart) {
      const { cols, start, P } = centrosLayout();
      if (centros.drag) {
        const col = cols.find(cl => x >= cl.x && x <= cl.x + cl.w);
        if (col) { centros.assign[centros.drag.s.kind] = col.ci; sfx.pop(1.2); speak(centros.drag.s, LD.CENTERS[col.ci].id, 'here'); }
        centros.drag = null; return;
      }
      if (inRect(x, y, chartBack())) { centros = null; sfx.whoosh(); sayUI('back'); return; }
      if (inRect(x, y, start)) { runCentros(); return; }
      const col = cols.find(cl => inRect(x, y, { x: cl.x, y: cl.y, w: cl.w, h: 26 }));
      if (col) { sfx.pop(); speak(students[3], LD.CENTERS[col.ci].id, 'here'); return; }
      if (!inRect(x, y, P)) { centros = null; sfx.softPop(); }
      return;
    }
    if (p.sign) {
      const ci = p.sign.ci; sfx.whoosh();
      if (ci === 0) hooks.openBoard(L.board, V.s);
      else if (ci === 2) hooks.openLetters();
      else if (ci === 3) hooks.openShapes();
      else { const r = students.filter(s => s.center === 1); const t = r.length ? pick(r) : students[3]; act(t, 'happy', 1.2); sfx.page(); speak(t, LD.CENTERS[1].line, 'yay'); }
      return;
    }
    if (p.v19) { if (!p.moved) v19Tap(p.v19); return; }
    if (p.moved) return;
    if (p.lightSw) { RT.tapSwitch(); return; }
    if (p.upd) { if (!p.updFired) sfx.tap(); return; } // a grown-up holds it for 1.5 s (see update())
    if (p.mus) { const on = G.save.music === false; hooks.setMusic?.(on); persist(); sfx.pop(on ? 1.3 : 0.8); return; }
    if (p.big && inRect(x, y, L.bigBtn)) { sfx.pop(); hooks.unlock?.(); enterPrep(); return; }
    if (p.reward) { if (!reward.collected && G.time - reward.t > 0.6) collectReward(); return; }
    if (p.book) {
      if (L.bookNext && inRect(x, y, L.bookNext)) { sfx.page(); bookOpen.page = (bookOpen.page + 1) % Math.max(1, Math.ceil(G.save.stickers.length / 18)); }
      else if (inRect(x, y, L.bookBack)) { sfx.whoosh(); sayUI('back'); bookOpen = null; }
      else if (!inRect(x, y, L.bookRect)) { sfx.pop(); bookOpen = null; } // tap outside the book closes it
      return;
    }
    if (p.menu) {
      const m = menu.items.find(m => inRect(x, y, m));
      menu = null; sfx.pop();
      if (m) { sayUI(m.key); m.go(); }
      return;
    }
    if (p.story) { storyTap(x, y); return; }
    if (p.tray) {
      if (p.tab) { deco.tab = p.tab; sfx.pop(1.1); sayUI(p.tab); return; }
      const it = p.trayItem;
      if (!it) return;
      if (it.kind === 'paintWall' || it.kind === 'paintFloor') {
        G.save.paint[it.kind === 'paintWall' ? 'wall' : 'floor'] = it.id; G.save.decorStamp++; persist();
        bg = drawBg(); cheerDecor(V.W / 2, it.kind === 'paintWall' ? L.wallH / 2 : L.floorTop + 30);
      } else if (it.kind === 'rug') cycleVariant(furn.rug);
      else if (it.kind === 'desk') { const d = desks.find(q => !G.save.deskItems[q.i]) || pick(desks); setDeskItem(d, it.id); }
      else quickPlace(it.id);
      return;
    }
    if (p.btn) {
      sfx.pop();
      const id = p.btn.id;
      if (!['star', 'cardGreen', 'cardRed', 'help', 'home'].includes(id) && !(id === 'toys' && (recess || centros))) sayUI(id);
      if (id === 'help') { hint = null; showHint(true); return; }
      if (id === 'decorate') { deco = deco ? null : { tab: 'floor' }; return; }
      if (id === 'lang') {
        setLang(lang() === 'en' ? 'es' : 'en');
        const aw = awake();
        if (aw.length) {
          speak(aw.find(s => s.kind === 'owl') || aw[0], lang() === 'es' ? 'Spanish time!' : 'English time!', 'yay');
          for (const s of aw) { act(s, 'cheer', 1); hop(s, rand(40, 70)); }
        } else sfx.chime();
        teacherAct('wave', 1.2);
        burst('confetti', p.btn.x + 13, p.btn.y + 26, 16, lang() === 'es' ? ['#1f8a4c', '#ffffff', '#d93a3a'] : ['#e0404b', '#ffffff', '#3a5fb0'], { sp: 70, g: 90 });
        return;
      }
      if (id === 'bell') { deco = null; startDay(); return; }
      if (id === 'cdone') { endCentros(); return; }
      if (id === 'jobs') { if (!busy) RT.openJobs(); return; }
      if (id === 'cardGreen' || id === 'cardRed') return;
      if (id === 'stickers') bookOpen = { page: 0, t: G.time };
      if (id === 'home' && !busy && G.time > homeArm) { // first tap only asks; the 🏠 pulses for 4 s
        homeArm = G.time + 4; teacherAct('wave', 1.6); speak(helper(), LD.HINTS.homeAsk, 'tap');
        return;
      }
      if (id === 'home' && !busy) {
        homeArm = 0; sayUI('home');
        if (story) story = null;
        if (recess) recess = null;
        if (centros) { centros = null; }
        goodbye();
      }
      if (id === 'toys' && !busy) {
        if (recess) { endRecess(); return; }
        if (centros) { rotateCentros(); return; }
        const sz = 48, gap = 12, tot = sz * 4 + gap * 3;
        const x0 = Math.round(V.W / 2 - tot / 2), y0 = Math.round(V.H / 2 - sz / 2);
        menu = { items: [
          { icon: S.ICONS.ball, go: recessTime, key: 'recess' },
          { icon: S.ICONS.apple, go: serveSnack, key: 'snack' },
          { icon: S.ICONS.book, go: storyTime, key: 'story' },
          { icon: () => DC.trayIcon('centros'), go: openCentrosChart, key: 'centros' },
        ].map((m, k) => ({ ...m, x: x0 + k * (sz + gap), y: y0, w: sz, h: sz })) };
      }
      return;
    }
    if (p.chart) { // tapping the chart: everyone who's here waves
      for (const s of students) if (s.here && s.mode !== 'away' && !s.sleep && !(s.hide > 0)) { act(s, 'raise', 1); }
      sfx.tap();
      return;
    }
    if (p.deskItem) {
      const s = students.find(t => t.desk === p.deskItem.i && t.mode === 'seated');
      if (s) tapStudent(s); else { sfx.pop(1.3); burst('spark', p.deskItem.x + 10, p.deskItem.y - 24, 4, ['#ffd23f']); }
      return;
    }
    if (p.s) { tapStudent(p.s); return; }
    if (p.abc) { tapAbc(p.abc); return; }
    if (recess) {
      const b = recess.ball;
      if (Math.hypot(x - b.x, y - (b.y - 5 - b.z)) < 16) { kickBall(); return; }
    }
    if (p.f && p.f.type === 'teacher') { // twirl!
      teacherAct('twirl', 0.9); teach.vz = 70; sfx.giggle(1.05, 4);
      burst('heart', p.f.x, p.f.y - 50, 3, ['#ff6f91', '#ff9ec4'], { up: true, sp: 30 });
      return;
    }
    if (p.f && p.f.type === 'calendar') {
      p.f.pop = G.time + 0.25; sfx.pop(1.2);
      const t = RT.calHelper(awake()) || awake().find(s => s.kind === 'owl') || pick(awake().length ? awake() : students);
      speak(t, daySentence(), 'here');
      teach.pointRight = p.f.x > furn.teacher.x; teacherAct('point', 1.2);
      burst('spark', p.f.x, p.f.y - 14, 6, [DAY_COLORS[dayIndex()], '#ffd23f']);
      return;
    }
    if (p.f && (p.f.type === 'abc' || p.f.type === 'shapetable')) {
      if (busy || (phase !== 'class' && phase !== 'prep')) { sfx.tap(); return; }
      sfx.whoosh(); deco = null;
      if (p.f.type === 'abc') hooks.openLetters(); else hooks.openShapes();
      return;
    }
    if (p.f && p.f.type === 'shelf' && phase === 'class' && !busy) { sfx.page(); sayUI('story'); storyTime(); return; } // pick a story book
    if (p.f && (p.f.deco || p.f.type === 'rug')) { cycleVariant(p.f); return; }
    if (p.f && p.f.type === 'plant' && RT.tapPlant(p.f)) return; // the plant helper waters it
    if (p.f) { // tap on furniture: a little wobble/sound
      p.f.lift = 2; setTimeout(() => { p.f.lift = 0; }, 120); sfx.tap();
      if (p.f.type === 'shelf') sfx.page();
      return;
    }
    if (p.board && phase === 'prep') { // the board opens once class starts: point at the bell
      sfx.tap(); bellBob = G.time + 1.8; speak(helper(), LD.HINTS.ring, 'tap');
      hint = { key: 'ring', ...btnPt('bell'), t0: G.time, until: G.time + 3 };
      return;
    }
    if (p.board && (phase === 'class') && !busy) {
      sfx.whoosh();
      const now = G.time;
      if (now - lastTap > 0.3) { lastTap = now; hooks.openBoard(L.board, V.s); }
      return;
    }
    if (p.door) { if (!answerDoor()) sfx.door(); }
  }

  function watchBoard() { // after a lesson: students react to the new drawing
    for (const s of students) if (s.mode === 'seated' && !s.sleep && !(s.hide > 0)) { act(s, Math.random() < 0.5 ? 'clap' : 'happy', 1.4); }
    sfx.clap(6, 1); sfx.ooh(1.2);
    teach.pointRight = furn.teacher.x < L.board.x + 52;
    teacherAct('point', 1.6);
  }

  // ---------------------------------------------------------------- v1.9 daily rituals (js/rituals.js)
  const RT = createRituals({
    students, furn, V: () => V, L: () => L, phase: () => phase, busy: () => busy, recess: () => recess,
    burst, headPos, seat, sendToSeat, teacherAct, awake, shadow, miniFace, btnFrame, scaled, sayUI,
    setDusk: (v) => { duskTarget = v; }, redrawBg: () => { if (V) bg = drawBg(); },
    pointAt: (x) => { teach.pointRight = x > furn.teacher.x; teacherAct('point', 1.4); },
    css: (x, y) => [x * V.s / G.dpr, y * V.s / G.dpr], overBtn: (x, y) => shownBtns().some(b => inRect(x, y, b)),
  });

  // hooks for automated screenshot tests
  const css = (x, y) => [x * V.s / G.dpr, y * V.s / G.dpr];
  window.__ltDeskPts = () => students.map(s => { const r = spriteRect(s); return css(r.x + 17, r.y + 20); });
  window.__ltBtn = (id) => { const b = btns.find(q => q.id === id); return css(b.x + 13, b.y + 13); };
  window.__ltFurn = (id) => { const f = furn[id]; return css(f.x, f.y - 8); };
  window.__ltBoardPt = () => css(L.board.x + 52, L.board.y + 30);
  window.__ltTray = () => (deco ? { tabs: TABS.map((t, k) => { const r = tabRect(k); return css(r.x + 10, r.y + 10); }), items: trayItems().map(it => css(it.x + it.w / 2, it.y + it.h / 2)) } : null);
  window.__ltDesks = () => desks.map(d => css(d.x, d.y - 18));
  window.__ltFurnPt = (id) => { const f = furn[id]; const [, h] = sizeOf(f); return css(f.x, f.y - h / 2); };
  window.__ltDeskItem = (i) => { const d = desks[i]; return css(d.x + 10, d.y - 22); };
  window.__ltTrash = () => { const r = trashRect(); return css(r.x + 13, r.y + 15); };
  window.__ltAsk = (i) => askQuestion(students[i]);
  window.__ltFeel = (i, m) => { const s = students[i]; s.mood = m; talk(s, MOOD_BUBBLE[m], 9999); helpFeelings(s); };
  window.__ltQuiz = () => { const k = V.s / G.dpr; return quiz.active ? { opts: [0, 1, 2].map(i => { const r = quiz._L?.opts?.[i]; return r ? [(r.x + r.w / 2) * k, (r.y + r.h / 2) * k] : null; }) } : null; };
  window.__ltQuizQ = () => quiz._Q;
  window.__ltCentros = () => { if (!centros) return null; const k = V.s / G.dpr; const lay = centrosLayout(); return { stage: centros.stage, start: [(lay.start.x + 18) * k, (lay.start.y + 16) * k], signs: centerSigns().map(r => [(r.x + 11) * k, (r.y + 11) * k]) }; };
  window.__ltNaughty = (i) => { students[i].naughty = { until: G.time + 22, next: 0 }; };
  window.__ltHint = () => ({ hint, lastInput, nextHintAt, time: G.time, phase, busy, story: !!story, reward: !!reward, dayCard: !!dayCard, menu: !!menu, book: !!bookOpen, q: quiz.active });
  window.__ltTeacher = () => css(furn.teacher.x, furn.teacher.y - 30);
  window.__ltMenu = () => (menu ? menu.items.map(m => css(m.x + 24, m.y + 24)) : []);
  window.__ltAbc = (ch) => css(abcCardX(LETTERS.indexOf(ch)) + 2, L.abc.y + 5);
  window.__ltUpd = () => (L.updBtn ? css(L.updBtn.x + 11, L.updBtn.y + 11) : null);
  // v1.9 activities
  window.__ltSnack = () => (serve ? { slots: serve.slots.map((sl, i) => { const r = snackLayout().slot(i); return sl.taken ? null : css(r.x + 12, r.y + 12); }), served: serve.served, done: serve.done, armed: !!serve.armed } : null);
  window.__ltDoorPlan = (q, late) => { doorPlanNext = { q, late }; };
  window.__ltKnock = (kind) => { if (!door) planDoor(); door.queue.unshift(kind); door.nextAt = G.time; };
  window.__ltDoor = () => ({ pt: css(L.door.x + L.door.w / 2, L.door.y + 30), door: door && { queue: door.queue, knock: door.knock, late: door.late && door.late.kind }, parcel: parcel && css(parcel.x, parcel.y - 8), ball: rollBall && { state: rollBall.state, pt: css(rollBall.x, rollBall.y - 5 - rollBall.z) } });
  window.__ltStory = () => (story ? { stage: story.stage, book: story.book, page: story.page, covers: story.stage === 'choose' ? coverRects().map(r => css(r.x + r.w / 2, r.y + r.h / 2)) : null, book_pt: L.storyBook ? css(L.storyBook.x + L.storyBook.w / 2, L.storyBook.y + L.storyBook.h / 2) : null } : null);

  return {
    resize, update, render, down, move, up, startDay, watchBoard, startle: () => students.forEach(startle),
    get view() { return V; }, get phase() { return phase; },
    get musicTrack() { return G.time < danceUntil ? 'recess' : ['goodbye', 'reward', 'night'].includes(phase) ? 'night' : recess ? 'recess' : 'class'; },
  };
}
