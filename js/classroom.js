import { G, makeView, wait, persist, rand, pick, clamp, SLOT, SLOTS, peekSlot, switchSlot } from './state.js';
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
import { textSprite } from './schoolfont.js';
import { LETTERS, letterSentence } from './i18n.js';
import { tapEscalate, crowned, naughtyAct } from './students.js';
import { createSchedule, blockIcon, ICON_W, ICON_H } from './schedule.js';
import { createDecorate } from './decorate.js';
import * as UI from './ui.js';
import * as JAR from './jar.js';

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const D = (c, img, x, y) => c.drawImage(img, Math.round(x), Math.round(y));

const FURN_DEFAULT = {
  // v2.0: eight desks, two staggered rows of four (the Horario now takes the left edge of the screen)
  desk0: [0.32, 0.32], desk1: [0.48, 0.32], desk2: [0.64, 0.32], desk3: [0.80, 0.32],
  desk4: [0.235, 0.72], desk5: [0.395, 0.72], desk6: [0.555, 0.72], desk7: [0.715, 0.72],
  rug: [0.15, 0.93], plant: [0.06, 0.45], shelf: [0.93, 0.13], jar: [0.07, 0.72], // v2.0: the plant moved by the door to make room for desk 7
};
const FURN_SIZE = { desk: [S.DESK_W, S.DESK_H], rug: [84, 32], plant: [28, 38], shelf: [38, 46], teacher: [22, DC.TH], jar: [JAR.JAR_W, JAR.JAR_H] };
const sizeOf = (f) => FURN_SIZE[f.type] || DC.decoSize(f.type, f.sc); // v2.0: placed things can be resized
const layerOf = (f) => (DC.DECOR[f.type] ? DC.DECOR[f.type].layer : 'floor');
let uid = 0;

// v2.0: from five desks to eight. A desk she moved keeps its spot if it's clear of the other desks' new spots
// (and of the shape table, plant and shelf); every other desk takes its new spot. Runs once per save.
function migrateDesks(n) {
  if (G.save.deskN === n) return;
  const F = G.save.furniture, ids = Array.from({ length: n }, (_, i) => 'desk' + i);
  const near = (a, b) => Math.abs(a[0] - b[0]) < 0.13 && Math.abs(a[1] - b[1]) < 0.3;
  const taken = [F.shapetable || [0.9, 0.62], F.plant || FURN_DEFAULT.plant, F.shelf || FURN_DEFAULT.shelf];
  for (const id of ids) {
    const sv = F[id], others = ids.filter(o => o !== id).map(o => FURN_DEFAULT[o]);
    if (Array.isArray(sv) && sv.length === 2 && sv.every(Number.isFinite) && ![...taken, ...others].some(q => near(q, sv))) taken.push(sv);
    else delete F[id];
  }
  for (const k of Object.keys(F)) if (/^desk\d+$/.test(k) && !ids.includes(k)) delete F[k];
  G.save.deskN = n; persist();
}

// ------------------------------------------------------------------ mini faces for the attendance chart (all eight friends: sprites.js)
const miniFace = (kind, on) => S.miniFace(kind, on);
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
  let V = null, Vfull = null, ox = 0, compact = false; // V: the room (right of the Horario chart); Vfull: the whole buffer
  const L = {};
  let bg = null;
  const furn = {};
  migrateDesks(students.length);
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
  function loadDecor() { // (re)builds the placed decorations from the save (also used by ↶ undo)
    for (const f of Object.values(furn)) if (f.deco) delete furn[f.id];
    for (const d of G.save.decor) {
      if (!DC.DECOR[d.t]) continue;
      const id = 'd' + (uid++);
      furn[id] = { id, type: d.t, deco: true, v: d.v || 0, sc: clamp(d.s | 0, 0, DC.SCALES.length - 1), fl: !!d.f, fx: d.fx, fy: d.fy, x: 0, y: 0, lift: 0 };
      if (V) place(furn[id]);
    }
  }
  loadDecor();
  if (G.save.seats) { // saved seats (v1.9 saves only know five friends): keep valid, unique ones, the rest get a free desk
    const used = new Set();
    for (const s of students) { const d = G.save.seats[s.kind]; s.desk = Number.isInteger(d) && d >= 0 && d < students.length && !used.has(d) ? d : -1; if (s.desk >= 0) used.add(s.desk); }
    for (const s of students) if (s.desk < 0) { s.desk = used.has(s.idx) ? students.findIndex((_, k) => !used.has(k)) : s.idx; used.add(s.desk); }
  }
  students.forEach(s => { s.stars = G.save.stars[s.kind] || 0; });

  const desks = students.map((_, i) => furn['desk' + i]);
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
  let wallFade = 0; // v2.3 0..0.15: how much the wall decorations step back while an activity runs
  let lastInput = 0, nextHintAt = 12, hint = null, hintIdx = 0, prepStamp = 0;
  const saidHint = {};
  const helper = () => students[3];
  function sayUI(key) { if (LD.UI_WORDS[key]) speak(helper(), LD.UI_WORDS[key], 'tap'); }
  function sayItem(key) { if (LD.ITEM_WORDS[key]) speak(helper(), LD.ITEM_WORDS[key], 'tap'); }
  const btnPt = (id) => { const b = btns.find(q => q.id === id); return { x: b.x + Math.round(b.w / 2), y: b.y + Math.round(b.h / 2) - 1 }; };
  const RED_HOLD = 600; // ms: the red card needs a short, deliberate press before it comes off its button
  const ARM_IDS = ['star', 'cardGreen', 'cardRed'];
  function computeHint() {
    const rh = RT.hint(); if (rh) return rh; // the jobs chart is open
    if (DZ.on && (phase === 'prep' || SC.curId === 'decorar')) {
      if (G.save.decorStamp === prepStamp) {
        // alternate "tap a theme picture" and "▶ next"; start with ▶ when the room is already decorated
        const ringFirst = G.save.decor.length > 0 || (G.save.day || 1) > 1;
        const key = (prepHintN++ + (ringFirst ? 1 : 0)) % 2 ? 'next' : 'decoTheme';
        if (key === 'next') return { key, ...btnPt('next') };
        return { key, ...DZ.hintPt() };
      }
      if (DZ.tab === 'desks' && desks.some(d => !G.save.deskItems[d.i]) && prepHintN++ % 2 === 0) return { key: 'decoDesk', ...btnPt('next'), x: null };
      return { key: 'next', ...btnPt('next') };
    }
    if (centros && centros.stage === 'chart') { const { start } = centrosLayout(); return { key: 'chart', x: start.x + 18, y: start.y + 10 }; }
    if (recess) return { key: 'next', ...btnPt('next') };
    if (centros && centros.stage === 'run') return centrosHint();
    { const v = v19Hint(); if (v) return v; }
    if (guest && guest.stage === 'knock') return { key: 'door', x: L.door.x + L.door.w / 2, y: L.door.y + 28 };
    if (story && L.storyBook) return { key: 'storyPage', x: L.storyBook.x + L.storyBook.w - 14, y: L.storyBook.y + L.storyBook.h - 16 };
    if (snackOn) return { key: 'snackWait', x: null };
    if (phase !== 'class' || busy) return null;
    return classHint();
  }
  function centrosHint() { // v2.1: an unvisited centro's sign, then the bell, after two rounds ✔
    if (centros.going || quiz.active) return null;
    const sg = centerSigns().find(r => centroWants(r.ci));
    if (sg && !centrosAllDone()) return { key: 'centrosVisit', x: sg.x + sg.w / 2, y: sg.y + sg.h / 2 + 4 };
    if (centros.rounds >= 2 || !centrosAllDone()) return { key: 'centrosEnd', ...btnPt('cdone') };
    return { key: 'centrosBell', ...btnPt('toys') };
  }
  function classHint() {
    const at = (s, key) => { const [x, y] = headPos(s); return { key, x, y: y + 12 }; };
    if (SC.curId === 'calendario') { const absent = students.find(s => !s.here && s.mode === 'seated'); if (absent) return at(absent, 'attendance'); }
    const moody = students.find(s => s.mood && (s.mode === 'seated' || s.mode === 'stand')); if (moody) return at(moody, 'mood');
    // star / cards: the hand carries the icon from the button onto a student's head
    const carry = (key, btn, s) => { const [hx, hy] = headPos(s); const b = btnPt(btn); return { key, x: b.x, y: b.y, from: b, to: { x: hx, y: hy + 6 }, icon: btn }; };
    const naughty = students.find(s => s.naughty && s.mode !== 'away'); if (naughty && SC.cur.cards) return carry('naughty', 'cardRed', naughty);
    const raised = students.find(s => acting(s, 'raise') && s.mode === 'seated' && !pointing(s)); if (raised) return at(raised, 'question');
    if (jarFull()) return { key: 'jar', x: furn.jar.x, y: furn.jar.y - 22 };
    const jobsPt = choicePt('ayudantes');
    const rt = RT.classHint(G.time - (classStart || 0), (id) => (id === 'jobs' ? jobsPt : btnPt(id)), !jobsPt); if (rt) return rt; // thirsty plant / helpers chart
    if (!SC.purposeDone()) { const r = choiceRects()[0]; if (r) return { key: 'choice', x: r.x + r.w / 2, y: r.y + 12 }; }
    // this block is done: point at ▶ (now and then a gold star instead, in blocks with stars)
    hintIdx++;
    if (SC.cur.cards && hintIdx % 3 === 2) { const c = students.filter(s => s.mode === 'seated' && s.here); if (c.length) return carry('star', 'star', pick(c)); }
    return { key: 'next', ...btnPt('next') };
  }
  let classStart = 0;
  // v2.1: the room keeps ticking while the board / letters / shapes / yard are open; its hints must not talk over them
  const roomShown = () => !hooks.showing || hooks.showing();
  function showHint(force) {
    if (!roomShown()) { hint = null; return; }
    const t = computeHint(); if (!t) return;
    hint = { ...t, t0: G.time, until: G.time + 6 };
    friendHint(hint);
    if (force || !saidHint[t.key] || G.time - saidHint[t.key] > 45) { saidHint[t.key] = G.time; speak(helper(), LD.HINTS[t.key], 'tap'); }
  }
  // now and then a friend shows the way instead of the hand: the nearest awake friend turns toward it, points (a paw up on that side) and hops
  let friendHintN = 0;
  const pointing = (s) => s.hintPoint && G.time < s.hintPoint;
  function friendHint(h) {
    if (h.x == null || h.to || phase !== 'class' || busy || DZ.on || centros || story || quiz.active || serve) return;
    if (++friendHintN % 3) return;
    let best = null, bd = 1e9;
    for (const s of awake()) {
      if (s.naughty || s.mood || !(s.mode === 'seated' || s.mode === 'stand')) continue;
      const [hx, hy] = headPos(s), d = Math.hypot(hx - h.x, hy - h.y);
      if (d > 8 && d < bd) { bd = d; best = s; }
    }
    if (!best) return;
    h.by = best; h.hopAt = G.time;
    best.hintPoint = h.until;
  }
  function friendHintTick() {
    const s = hint.by;
    if (s.mode === 'away' || s.sleep || s.hide > 0) { hint.by = null; return; }
    s.look = h0(hint.x - headPos(s)[0]);
    if (!acting(s, 'point')) act(s, 'point', 1.2);
    if (G.time >= hint.hopAt) { hop(s, 60); hint.hopAt = G.time + 1.1; }
  }
  const h0 = (dx) => (Math.abs(dx) < 6 ? 0 : dx > 0 ? 1 : -1);
  function drawHint(c) {
    if (!hint) return;
    if (G.time > hint.until) { if (hint.by) { hint.by.look = 0; hint.by.hintPoint = 0; } hint = null; return; }
    if (hint.x == null) return; // spoken only
    if (hint.by) { // a friend points: a little twinkle marks the spot instead of the hand
      friendHintTick();
      if (hint.by) {
        for (let k = 0; k < 3; k++) { // three big stars circle the spot
          const a = G.time * 2.5 + k * 2.094, im = S.particle('star', (Math.floor(G.time * 6) + k) % 3 ? '#ffd23f' : '#ffffff');
          const w = im.width * 2, h = im.height * 2;
          c.drawImage(im, Math.round(hint.x + Math.cos(a) * 14 - w / 2), Math.round(hint.y - 14 + Math.sin(a) * 5 - h / 2), w, h);
        }
        return;
      }
    }
    if (hint.to) { // carry the star / card from its button to a student
      let tt = (G.time - hint.t0) % 2.2;
      if (hint.icon === 'cardRed') { // the red card: the hand holds it first (its ring fills), then carries it
        tt = (G.time - hint.t0) % 2.9;
        if (tt < 0.7) { ringAt(c, hint.from.x, hint.from.y + 1, Math.min(1, tt / 0.6)); drawHand(c, hint.from.x, hint.from.y); return; }
        tt -= 0.7;
      }
      const k = Math.min(1, tt / 1.5), e = k * k * (3 - 2 * k);
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
    D(c, glow(UI.button(b.w, b.h, UI.FACE.yellow), '#ffd23f', 'homeglow'), b.x - 2, b.y - 2);
    D(c, UI.button(b.w, b.h, UI.FACE.yellow, true), b.x, b.y);
    c.globalAlpha = 0.35; D(c, ic, b.x + (b.w - ic.width) / 2, b.y + UI.faceY(b.h, ic.height, true)); c.globalAlpha = 1;
    D(c, glow(ic, '#fff6b8', 'armed' + armed.id), b.x + b.w / 2 - 11, b.y - 24 + bob);
    D(c, ic, b.x + b.w / 2 - 9, b.y - 22 + bob);
    if (Math.random() < 0.08) burst('spark', b.x + b.w / 2 + rand(-8, 8), b.y - 14 + bob, 1, ['#ffd23f', '#ffffff'], { sp: 15 });
  }
  let reward = null, bookOpen = null;
  let hintT = 6;
  let attendanceDone = false;
  let btns = [];
  let lastTap = 0;
  let dayCard = null; // morning 'today is...' card
  let lastQ = -99, feelT = 40;
  const MOOD_BUBBLE = { triste: 'm:triste', enojado: 'm:enojado', asustado: 'm:asustado', cansado: 'm:cansado' };
  const MOOD_COL = S.MOOD_COL;
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
    if (calm && !busy && !story && !recess && !centros && quietOK()) {
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
      naughtyAct(s); // v2.0: cat swats, bear rubs his tummy, mouse zooms around
    }
  }

  // ---------------------------------------------------------------- centros
  const C_ICONS = [() => DC.trayIcon('palette'), S.ICONS.book, () => DC.trayIcon('aa'), S.ICONS.toys];
  function centerSpot(ci, k, n) {
    const W = V.W;
    let x, y;
    if (ci === 0) { x = clamp(L.board.x + L.board.w + 16, 20, W - 40); y = L.floorTop + 16; }
    if (ci === 1) { const nb = btns.find(b => b.id === 'next'); y = Math.min(furn.rug.y - 12, nb.y - 4); x = y > nb.y - 30 ? Math.max(furn.rug.x, nb.x + nb.w + 22) : furn.rug.x; } // on the rug, not behind ▶
    if (ci === 2) { x = furn.abc.x; y = L.floorTop + 14; }
    if (ci === 3) { x = furn.shapetable.x; y = furn.shapetable.y - 20; }
    const per = n > 4 ? Math.ceil(n / 2) : n, r = Math.floor(k / per), m = r ? n - per : per, j = k - r * per; // a crowded centro: two rows
    return { x: clamp(x + (j - (m - 1) / 2) * 18 + r * 9, 14, W - 14), y: clamp(y + r * 12, L.floorTop + 12, V.H - 4) };
  }
  function openCentrosChart() {
    const assign = {};
    students.forEach((s, i) => { assign[s.kind] = i % 4; });
    centros = { stage: 'chart', assign, drag: null, sel: null }; // sel: tap-then-tap, the face she tapped (tap a column next)
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
      const two = ks.length > 3 && col.w >= 52, per = two ? 2 : 1, rows = Math.ceil(ks.length / per); // a crowded centro: faces side by side
      const step = rows > 1 ? Math.min(30, Math.floor((col.h - 30 - 26) / (rows - 1))) : 30;
      ks.forEach((s, j) => out.push({ s, x: col.x + col.w / 2 - 13 + (two ? (j % 2 ? 13 : -13) : 0), y: col.y + 30 + Math.floor(j / per) * step, w: 26, h: 26 }));
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
    const sel = centros.sel;
    if (sel) { // a face is picked up: the columns it can go to glow softly
      const a = 0.25 + 0.2 * Math.sin(G.time * 5);
      for (const col of cols) if (col.ci !== centros.assign[sel.kind]) { c.globalAlpha = a; R(c, col.x, col.y + 26, col.w, col.h - 26, '#ffd23f'); c.globalAlpha = 1; }
    }
    for (const f of faceRects()) {
      if (centros.drag && centros.drag.moved && centros.drag.s === f.s) continue;
      const fi = scaled(miniFace(f.s.kind, true), 2);
      if (sel === f.s) { // picked: it glows and bobs
        const bob = -2 - Math.round(Math.abs(Math.sin(G.time * 5)) * 3);
        c.globalAlpha = 0.8 + 0.2 * Math.sin(G.time * 6); D(c, glow(fi, '#ffd23f', 'cfsel' + f.s.kind), f.x - 2, f.y - 2 + bob); c.globalAlpha = 1;
        D(c, fi, f.x, f.y + bob);
        continue;
      }
      D(c, fi, f.x, f.y);
    }
    if (centros.drag && centros.drag.moved) D(c, scaled(miniFace(centros.drag.s.kind, true), 2), centros.drag.x - 13, centros.drag.y - 13);
    const k = Math.sin(G.time * 5) > 0.3 ? 1 : 0;
    const sd = held(start);
    UI.drawBtn(c, start.x, start.y - (sd ? 0 : k), start.w, start.h, UI.FACE.yellow, sd, cached('bellicon', bellIcon));
    const bk = chartBack();
    UI.drawBtn(c, bk.x, bk.y, 26, 26, UI.FACE.blue, held(bk), S.ICONS.back());
  }
  function chartBack() { const { P } = centrosLayout(); return { x: Math.max(V.inset.l + 2, P.x - 12), y: Math.max(V.inset.t + 2, P.y - 12), w: 26, h: 26 }; }
  function runCentros() {
    centros.stage = 'run'; phase = 'activity'; calmMoods();
    // v2.1: every centro wants the teacher once a round; the rewards stay for the whole block
    Object.assign(centros, { visited: [false, false, false, false], total: [0, 0, 0, 0], rewardT: [-9, -9, -9, -9], going: null, rounds: 0, allT: 0, stars: 0 });
    speak(students[3], LD.CENTRO_LINES.start, 'yay'); sfx.bell();
    for (const s of students) { s.sleep = false; s.hide = 0; s.snack = null; s.naughty = null; }
    sendToCenters();
  }
  function sendToCenters() {
    centros.askers = [null, null, null, null];
    for (let ci = 0; ci < 4; ci++) {
      const ks = students.filter(s => centros.assign[s.kind] === ci && s.mode !== 'away');
      centros.askers[ci] = ks.find(s => s.kind !== 'turtle' && s.kind !== 'mouse') || ks[0] || null; // the bold ones raise a paw
      ks.forEach((s, k) => {
        if (s.mode === 'seated') { Object.assign(s, seat(s)); s.mode = 'stand'; }
        const p = centerSpot(ci, k, ks.length);
        s.center = ci; s.centerT = rand(2, 4);
        walkTo(s, p.x, p.y, 48).then(() => { s.look = 0; });
      });
    }
  }
  function rotateCentros() {
    if (centros.going) return; // the teacher is on her way to a centro: finish that first
    for (const s of students) centros.assign[s.kind] = (centros.assign[s.kind] + 1) % 4;
    centros.stars += centros.visited.filter(Boolean).length; // stars from earlier rounds stay as a little count
    centros.visited = [false, false, false, false]; centros.allT = 0;
    for (const s of students) if (s.bubble && s.bubble.kind === 'q') s.bubble = null;
    speak(students[4], LD.CENTRO_LINES.change, 'yay'); sfx.ding(988);
    sendToCenters();
  }
  async function endCentros() {
    centros = null; busy = true;
    centrosClear();
    sfx.ding(784);
    await gatherSeats();
    busy = false; phase = 'class';
  }
  function centrosClear() { // centros is over (✔ or leaving the block): the friends forget their centro, the teacher goes home
    for (const s of students) { s.center = undefined; if (s.bubble && s.bubble.kind === 'q') s.bubble = null; }
    teacherHome();
  }
  // ---- v2.1 centros: the teacher hops over to a centro and a friend there asks her a question
  const CENTRO_Q = [['color'], ['animal', 'size'], ['letter'], ['shape', 'count']]; // arte, biblioteca, letras, bloques
  const centroKids = (ci) => students.filter(s => s.center === ci && s.mode !== 'away');
  const centroWants = (ci) => !!centros && centros.stage === 'run' && !!centros.visited && !centros.visited[ci] && centroKids(ci).length > 0;
  const centrosAllDone = () => !!centros && centros.stage === 'run' && centros.visited.some(Boolean) && [0, 1, 2, 3].every(ci => centros.visited[ci] || !centroKids(ci).length);
  function teacherGo(x, y, then) { teach.go = { x, y, then }; }
  function teacherHome() { // back to her own spot (where she was put, or the default by the door)
    const h = { ...furn.teacher }; place(h);
    if (Math.hypot(h.x - furn.teacher.x, h.y - furn.teacher.y) < 2) { teach.go = null; return; }
    teacherGo(h.x, h.y, () => { place(furn.teacher); teacherAct('wave', 1); });
  }
  function teacherWalkTick(dt) {
    const g = teach.go, t = furn.teacher;
    if (!g) return;
    if (drag && drag.f === t) { teach.go = null; return; } // she's being carried
    const dx = g.x - t.x, dy = g.y - t.y, d = Math.hypot(dx, dy), sp = 105 * dt;
    if (d <= sp) { t.x = g.x; t.y = g.y; teach.go = null; g.then?.(); return; }
    t.x += dx / d * sp; t.y += dy / d * sp;
    if (Math.abs(dx) > 2) teach.walkRight = dx > 0;
    if (teach.z <= 0 && teach.vz <= 0) { teach.vz = 42; sfx.step(Math.floor(G.time * 4)); } // little hops
    teacherAct('walk', 0.3);
  }
  const centroSide = (ci) => (centerSpot(ci, 0, 1).x < V.W / 2 ? 1 : -1); // the teacher stands on the room's side
  const centroHalf = (ci) => (Math.min(Math.max(1, centroKids(ci).length), 4) - 1) / 2 * 18;
  function teacherSpot(ci) {
    const p = centerSpot(ci, 0, 1);
    return { x: clamp(p.x + centroSide(ci) * (centroHalf(ci) + (ci === 0 ? 50 : 40)), 18, V.W - 18), y: clamp(p.y + 3, L.floorTop + 14, V.H - 3) };
  }
  function tapCentro(ci) {
    if (!centroWants(ci)) { // already visited: someone there cheers again
      const ks = centroKids(ci); if (!ks.length) return;
      const t = pick(ks); act(t, 'cheer', 1.2); hop(t, 70); sfx.pop(1.2); speak(t, LD.CENTERS[ci].line, 'yay');
      return;
    }
    if (centros.going || quiz.active || busy) return;
    const q = teacherSpot(ci);
    centros.going = { ci, stage: 'walk' }; hint = null;
    sfx.whoosh(); teach.vz = 60;
    teacherGo(q.x, q.y, () => {
      if (!centros || !centros.going || centros.going.ci !== ci) return;
      const a0 = centros.askers[ci], asker = a0 && a0.center === ci ? a0 : centroKids(ci)[0];
      if (!asker) { centros.going = null; return; }
      centros.going.stage = 'ask';
      teach.pointRight = asker.x > furn.teacher.x; teacherAct('wave', 0.8);
      asker.look = asker.x > furn.teacher.x ? -1 : 1; hop(asker, 70);
      wait(0.5).then(() => {
        if (!centros || !centros.going || centros.going.ci !== ci) return;
        centros.going.stage = 'quiz';
        quiz.open(asker, [makeQuestion(asker, students, CENTRO_Q[ci])], () => centroDone(ci, asker), LD.Q_INTRO);
      });
    });
  }
  function centroDone(ci, asker) {
    if (!centros || centros.stage !== 'run') return;
    centros.going = null; centros.visited[ci] = true; centros.total[ci]++; centros.rewardT[ci] = G.time;
    if (asker.bubble && asker.bubble.kind === 'q') asker.bubble = null;
    const ks = centroKids(ci);
    for (const s of ks) { act(s, 'cheer', 1.6); hop(s, 75); }
    const sayer = ks.find(s => s !== asker) || asker;
    wait(0.3).then(() => speak(sayer, LD.CENTERS[ci].line, 'yay'));
    teacherAct('clap', 1.2); sfx.sparkle(); sfx.chime();
    const sg = centerSigns()[ci];
    burst('star', sg.x + sg.w / 2, sg.y + sg.h / 2, 10, ['#ffd23f', '#fff6b8', '#ffb020'], { sp: 70 });
    if (centrosAllDone()) wait(2.2).then(() => { if (centros && centrosAllDone() && !centros.allT) allCentrosCheer(); });
  }
  function allCentrosCheer() { // all four centros visited: the whole class cheers, the bell starts to glow
    centros.allT = G.time; centros.rounds++;
    for (const s of awake()) { act(s, 'cheer', 1.8); hop(s, 80); }
    teacherAct('cheer', 1.8); teach.vz = 70;
    sfx.fanfare(); sfx.cheer(1.1);
    burst('confetti', V.W / 2, 20, 50, ['#ef6f6c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'], { sp: 110, g: 80, life: 1.8 });
    const t = awake()[0]; if (t) speak(t, pick(LD.Q_RIGHT), 'yay');
  }
  const bellWants = () => !!centros && centros.stage === 'run' && !!centros.allT && !centros.going;
  function centrosTick(dt) {
    teacherWalkTick(dt);
    if (!centros || centros.stage !== 'run') return;
    const g = centros.going;
    if (g && ((g.stage === 'quiz' && !quiz.active) || (g.stage === 'walk' && !teach.go))) centros.going = null; // she closed the question (or picked the teacher up): the centro still waits
    for (let ci = 0; ci < 4; ci++) { // a raised paw + "?" at every centro that wants the teacher
      const a = centros.askers[ci];
      if (!a || a.center !== ci || a.mode !== 'stand' || !centroWants(ci) || (g && g.ci === ci && g.stage !== 'walk')) continue;
      if (!acting(a, 'raise') && !acting(a, 'cheer')) act(a, 'raise', 1.6);
      if (!a.bubble) talk(a, 'q', 1.5);
    }
    for (const s of students) {
      if (s.center === undefined || s.mode !== 'stand') continue;
      if (centroWants(s.center) && centros.askers[s.center] === s) continue;
      s.centerT -= dt;
      if (s.centerT > 0) continue;
      s.centerT = rand(2.5, 4.5);
      const [hx, hy] = headPos(s);
      if (s.center === 0) { act(s, 'paint', 1.6); burst('confetti', hx + 8, hy + 14, 4, ['#ef4b4b', '#ffd23f', '#2f7de1', '#3cb44b'], { sp: 25, g: 40 }); }
      if (s.center === 1) { act(s, 'look', 1.6); if (Math.random() < 0.4) sfx.page(); }
      if (s.center === 2) { act(s, 'raise', 1.4); burst('spark', hx + 10, hy - 4, 2, ['#ef5b5b', '#2f7de1']); }
      if (s.center === 3) { act(s, 'clap', 1.2); burst('crumb', hx, hy + 18, 5, ['#ef6f6c', '#64a8e8', '#ffd23f', '#7dd370'], { up: true, sp: 35, g: 120 }); }
      if (Math.random() < 0.12 && !quiz.active) speak(s, LD.CENTERS[s.center].line, 'yay');
    }
  }
  function centerSigns() {
    if (!centros || centros.stage !== 'run') return [];
    return [0, 1, 2, 3].map(ci => { const p = centerSpot(ci, 0, 1); return { ci, x: clamp(p.x - 13 + (ci === 3 ? 26 : ci === 1 ? -34 : 22), 4, V.W - V.inset.r - 32), y: Math.max(V.inset.t + 12, p.y - 62), w: 26, h: 26 }; });
  }
  // what she gets for a visit, drawn at each centro: a painting, an open book, letters, a block tower
  const REW_COLS = ['#ef6f6c', '#64a8e8', '#ffd23f', '#7dd370', '#b48be6', '#ff9a2e'];
  function rewardSpot(ci) {
    const p = centerSpot(ci, 0, 1);
    return { x: clamp(p.x + centroSide(ci) * (centroHalf(ci) + (ci === 0 ? 22 : 17)), 14, V.W - 14), y: p.y }; // between the friends and the teacher
  }
  function drawCentroReward(c, ci) {
    const n = centros.total[ci], k = clamp((G.time - centros.rewardT[ci]) / 0.9, 0, 1); // k: the newest reward growing in
    if (ci === 0) { // a painting on the easel, painted top to bottom
      const p0 = rewardSpot(0), ex = Math.round(p0.x - 12), ey = Math.round(p0.y + 4 - 40);
      D(c, DC.decor('easel', Math.max(0, n - 1) % 3), ex, ey);
      const cover = n ? Math.round(21 * (1 - k)) : 21;
      if (cover > 0) R(c, ex + 3, ey + 27 - cover, 18, cover, '#fffaf0');
      if (n && k < 1) R(c, ex + 3, ey + 26 - cover, 18, 1, REW_COLS[n % REW_COLS.length]); // the wet brush line
      return;
    }
    const q = rewardSpot(ci), x = Math.round(q.x), y = Math.round(q.y);
    if (ci === 1) { // a book on the rug: closed, then open with a picture
      if (!n) { D(c, S.ICONS.book(), x - 9, y - 16); return; }
      const h = Math.max(2, Math.round(12 * k)), t = y - h - 2;
      shadow(c, x, y, 26);
      R(c, x - 13, t - 1, 26, h + 3, '#c25b4e'); R(c, x - 12, t, 11, h, '#fffaf0'); R(c, x + 1, t, 11, h, '#fffaf0'); R(c, x - 1, t, 2, h + 1, '#8a3b33');
      if (h >= 10) {
        for (let r = 0; r < 4; r++) R(c, x - 10, t + 2 + r * 2, 8, 1, '#c9b8d8');
        const pic = S.particle(['heart', 'star', 'note'][(n - 1) % 3], ['#ff6f91', '#ffd23f', '#7a5bc0'][(n - 1) % 3]);
        D(c, pic, x + 7 - pic.width / 2, t + 6 - pic.height / 2);
        if (Math.random() < 0.01) burst('heart', x, t - 2, 1, ['#ff6f91', '#ff9ec4'], { up: true, sp: 20 });
      }
      return;
    }
    if (ci === 2) { // letters pop up over the writers, more every visit
      const ls = ['A', 'E', 'I', 'O', 'U', 'M'], m = n ? Math.min(ls.length, 2 + n) : 0, fresh = n === 1 ? m : 1;
      for (let i = 0; i < m; i++) {
        const j = i - (m - fresh); // the new ones pop in one by one
        const born = j < 0 ? 1 : clamp((G.time - centros.rewardT[2]) / 0.3 - j * 0.7, 0, 1);
        if (born <= 0) continue;
        const img = textSprite(ls[i], { h: 14, col: REW_COLS[i % REW_COLS.length], outline: '#ffffff', ow: 1.1 }), ang = -Math.PI / 2 + (i - (m - 1) / 2) * 0.45; // a white rim: readable on the chalkboard
        const p2 = centerSpot(2, 0, 1), lx = p2.x - 18 + Math.cos(ang) * 34, ly = p2.y - 40 + Math.sin(ang) * 12 + Math.round(Math.sin(G.time * 3 + i) * 2) + Math.round((1 - born) * 8);
        D(c, img, lx - img.width / 2, ly - img.height / 2);
      }
      return;
    }
    // bloques: a tower that grows two blocks a visit
    const tot = Math.min(13, 2 + n * 2), grow = n ? Math.min(2, Math.floor(k * 3)) : 2, show = tot - 2 + grow;
    shadow(c, x, y, 14);
    for (let i = 0; i < show; i++) {
      const col = REW_COLS[i % REW_COLS.length], bx = x - 5 + (i % 3 === 1 ? 1 : i % 3 === 2 ? -1 : 0), by = y - 6 - i * 6;
      R(c, bx - 1, by - 1, 12, 7, '#2a1630'); R(c, bx, by, 10, 5, col); R(c, bx, by, 10, 1, lighten(col, 0.4));
    }
  }
  function drawCenterProps(c) {
    if (!centros || centros.stage !== 'run') return;
    for (let ci = 0; ci < 4; ci++) {
      if (!centroWants(ci)) continue;
      // a glowing ring on the floor around the friends: "come here, maestra!"
      const p = centerSpot(ci, 0, 1), n = centroKids(ci).length, pulse = Math.sin(G.time * 4 + ci);
      const rx = centroHalf(ci) + 16 + pulse * 2, ry = (n > 4 ? 14 : 8) + pulse, cy = p.y + (n > 4 ? 5 : 0);
      c.fillStyle = `rgba(255,230,110,${0.22 + 0.1 * pulse})`; c.beginPath(); c.ellipse(Math.round(p.x), Math.round(cy), rx, ry, 0, 0, Math.PI * 2); c.fill();
      for (let a = 0; a < Math.PI * 2; a += 0.04) {
        R(c, p.x + Math.cos(a) * rx - 1, cy + Math.sin(a) * ry - 1, 2, 2, (Math.floor(a * 6 - G.time * 8) & 3) ? '#ffd23f' : '#ffffff');
      }
    }
  }
  function centrosObjs(objs) { // v2.1: the rewards stand on the floor, y-sorted with the friends and the furniture
    if (!centros || centros.stage !== 'run') return;
    for (const ci of [0, 1, 3]) objs.push({ y: (ci === 0 ? rewardSpot(0).y + 4 : rewardSpot(ci).y) - 0.5, draw: (c) => drawCentroReward(c, ci) });
  }
  function drawCenterSigns(c) { // on top of the room, so a beanbag or a shelf never hides a sign
    if (!centros || centros.stage !== 'run') return;
    drawCentroReward(c, 2); // the letters float over the writers' heads
    for (const sg of centerSigns()) {
      const want = centroWants(sg.ci), done = centros.visited[sg.ci];
      const bob = want ? -Math.round(Math.abs(Math.sin(G.time * 5 + sg.ci)) * 4) : Math.round(Math.sin(G.time * 3 + sg.ci));
      R(c, sg.x + 12, sg.y + 24, 2, 10, '#a8703f');
      const face = ['#ffb3ad', '#a9d2fa', '#ffe27a', '#b5e8a4'][sg.ci], sd = !!(press && press.sign && press.sign.ci === sg.ci);
      if (want) { c.globalAlpha = 0.55 + 0.45 * Math.sin(G.time * 6 + sg.ci); D(c, glow(UI.button(sg.w, sg.h, face), '#ffd23f', 'signglow' + sg.ci), sg.x - 2, sg.y - 2 + bob); c.globalAlpha = 1; }
      UI.drawBtn(c, sg.x, sg.y + bob, sg.w, sg.h, face, sd, C_ICONS[sg.ci]());
      if (done) { // a big gold star for a visited centro
        const st = S.ICONS.star(), tw = Math.floor(G.time * 3 + sg.ci) % 6 === 0 ? -1 : 0;
        D(c, glow(st, '#fff6b8', 'cstar'), sg.x + sg.w - 13, sg.y - 11 + tw);
        D(c, st, sg.x + sg.w - 11, sg.y - 9 + tw);
      }
      const old = centros.total[sg.ci] - (done ? 1 : 0); // stars from earlier rounds: little pips under the sign
      for (let i = 0; i < Math.min(old, 4); i++) D(c, S.particle('star', '#ffd23f'), sg.x + 2 + i * 6, sg.y + sg.h + 2);
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
  const teach = { act: null, z: 0, vz: 0, blinkT: 2, blink: 0, pointRight: true, bag: null, last: null };
  function teacherAct(name, dur = 1.2, tap = false) {
    if (!tap && teach.act && teach.act.tap && G.time < teach.act.t0 + teach.act.dur) return; // her reaction to a tap plays out first
    teach.act = { name, t0: G.time, dur, tap };
  }
  // v2.1: tapping Louise always gets a reaction (it used to be the last thing checked, behind the morning hurry,
  // `busy`, story time and the students; and her twirl was soon overwritten by other poses). She takes turns:
  // a twirl, a wave, or a wave to the whole class, and the friends wave back.
  const TEACH_TAPS = ['twirl', 'wave', 'class'];
  function teacherHit(x, y) {
    const f = furn.teacher, top = f.y - DC.TH - teach.z - (f.lift || 0);
    return x >= f.x - DC.TW / 2 - 3 && x <= f.x + DC.TW / 2 + 3 && y >= top - 3 && y <= f.y + 4;
  }
  function tapTeacher() {
    const f = furn.teacher, kids = awake().filter(s => s.mode === 'seated' || s.mode === 'stand');
    if (!teach.bag || !teach.bag.length) { // all three in a shuffled turn, never the same one twice in a row
      teach.bag = [...TEACH_TAPS].sort(() => Math.random() - 0.5);
      if (teach.bag[teach.bag.length - 1] === teach.last) teach.bag.reverse();
    }
    let k = teach.bag.pop();
    if (k === 'class' && !kids.length) k = 'wave';
    teach.last = k;
    const hx = f.x, hy = f.y - DC.TH + 6 - teach.z;
    if (k === 'twirl') {
      teacherAct('twirl', 0.9, true); teach.vz = 70; sfx.giggle(1.05, 4);
      burst('heart', hx, hy, 4, ['#ff6f91', '#ff9ec4'], { up: true, sp: 30 });
      return;
    }
    teacherAct('wave', k === 'class' ? 2 : 1.4, true); teach.vz = 40; sfx.hi(1.25);
    burst('spark', hx - 10, hy, 5, ['#ffd23f', '#ffffff'], { sp: 30 });
    if (k !== 'class') return;
    kids.forEach((s, i) => wait(0.35 + i * 0.09).then(() => {
      if (s.mode === 'away' || s.sleep || s.hide > 0 || quiz.active) return;
      act(s, 'wave', 1.4); talk(s, 'heart', 1.2);
      if (i % 3 === 0) sfx.hi(1.4 + (i % 4) * 0.08);
      burst('heart', ...headPos(s), 1, ['#ff6f91', '#ff9ec4'], { up: true, sp: 25 });
    }));
  }
  function teacherPose() {
    const t = G.time;
    const a = teach.act && t < teach.act.t0 + teach.act.dur ? teach.act : null;
    const st = { eyes: teach.blink > 0 ? 'blink' : 'happy', mouth: 'grin', armL: 'down', armR: 'down', feet: 0, sway: Math.floor(t * 1.2) % 2 };
    let flip = false;
    // v2.3 her face follows the moment: eyes open while she listens (a question, a story, a guest, a centro visit),
    // and at goodbye she keeps waving
    if (quiz.active || story || guest || RT.chartOpen || (centros && centros.stage === 'run')) { st.eyes = teach.blink > 0 ? 'blink' : 'open'; st.mouth = 'smile'; }
    if (phase === 'goodbye' && !a) { st.eyes = 'happy'; st.armL = Math.floor(t * 4) % 2 ? 'wave1' : 'wave2'; st.mouth = 'open'; }
    if (a) {
      const k = t - a.t0, alt = (hz) => Math.floor(k * hz) % 2 === 0;
      if (a.name === 'wave') { st.armL = alt(5) ? 'wave1' : 'wave2'; st.mouth = 'open'; }
      if (a.name === 'clap') { st.armL = st.armR = alt(7) ? 'clap' : 'front'; st.mouth = 'open'; }
      if (a.name === 'point') { st.armL = 'point'; st.eyes = 'open'; st.mouth = alt(3) ? 'open' : 'grin'; flip = teach.pointRight; }
      if (a.name === 'twirl') { flip = alt(8); st.armL = st.armR = 'up'; st.mouth = 'open'; }
      if (a.name === 'cheer') { st.armL = st.armR = 'up'; st.mouth = 'open'; }
      if (a.name === 'walk') { st.feet = alt(7) ? 1 : 2; st.armL = alt(7) ? 'front' : 'down'; st.mouth = 'open'; flip = !!teach.walkRight; } // v2.1: hopping over to a centro
    }
    return { st, flip };
  }

  // ---------------------------------------------------------------- layout
  function resize() {
    compact = G.devH / G.dpr < 500; // phones: an icon-only Horario; iPad: pictures + words
    Vfull = compact ? makeView(200, 300) : makeView(220, 330);
    ox = SC.layout(Vfull, compact);
    V = { ...Vfull, W: Vfull.W - ox, ox, inset: { ...Vfull.inset, l: 0 } };
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
    const i = V.inset, B = 26, RED_GAP = 22;
    btns = [
      { id: 'help', x: V.W - i.r - B - 4, y: i.t + 4, w: B, h: B, icon: () => S.bubble('q') },
      { id: 'next', x: 4, y: V.H - i.b - 31, w: 46, h: 28, icon: S.ICONS.play }, // ▶ siguiente (+ the next card's picture)
      { id: 'toys', x: 54, y: V.H - i.b - B - 4, w: B, h: B, icon: () => cached('bellicon', bellIcon) }, // centros: ring to rotate
      { id: 'cdone', x: 54 + B + 4, y: V.H - i.b - B - 4, w: B, h: B, icon: S.ICONS.check },
      { id: 'star', x: V.W - i.r - B - 4, y: V.H - i.b - B - 4, w: B, h: B, icon: S.ICONS.star },
      { id: 'cardGreen', x: V.W - i.r - 2 * B - 8, y: V.H - i.b - B - 4, w: B, h: B, icon: () => DC.trayIcon('cardGreen') },
      // the red card sits apart (a gap away from the green card and the star), a bit smaller and quieter; a short hold picks it up
      { id: 'cardRed', x: V.W - i.r - 3 * B - 8 - RED_GAP, y: V.H - i.b - B - 4, w: B, h: B, icon: () => DC.trayIcon('cardRed'), art: 22 },
    ];
    DZ.layout(); // the decorate tray sits right of ▶
    layoutAbc();
    bg = drawBg();
    return V;
  }
  function place(f) {
    if (f.type === 'teacher' && f.fx < 0) f.fx = (L.door.x + L.door.w + 17) / V.W;
    if (f.type === 'abc' && f.fx < 0) { f.fx = ((L.door.x + L.door.w + L.board.x) / 2 + 4) / V.W; f.fy = (L.wallH - 22) / L.wallH; }
    if (f.type === 'shapetable' && f.fx < 0) { f.fx = 0.9; f.fy = 0.62; }
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
    if (f.deco && DZ.on && layerOf(f) === 'floor') f.y = Math.max(L.floorTop + 12, Math.min(f.y, DZ.floorMax())); // not hidden under the open tray
  }
  function remember(f) {
    if (layerOf(f) === 'wall') { f.fx = f.x / V.W; f.fy = f.y / L.wallH; }
    else { f.fx = f.x / V.W; f.fy = (f.y - L.floorTop) / L.floorH; }
    if (f.deco) saveDecor();
    else G.save.furniture[f.id] = [+f.fx.toFixed(4), +f.fy.toFixed(4)];
    persist();
  }
  function saveDecor() {
    G.save.decor = Object.values(furn).filter(f => f.deco).map(f => {
      const d = { t: f.type, fx: +f.fx.toFixed(4), fy: +f.fy.toFixed(4), v: f.v };
      if (f.sc) d.s = f.sc; if (f.fl) d.f = 1;
      return d;
    });
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
    // v2.3: softer wallpaper (stripes and dots halfway back to the wall colour) so the busy decorated wall stays calm
    for (let x = 2; x < W; x += 9) R(c, x, 3, 3, wh - 22, mix(wa, wb, 0.5));
    for (let x = 6; x < W; x += 18) for (let y = 10; y < wh - 24; y += 14) { R(c, x, y, 1, 1, mix(wa, '#f9c8b0', 0.5)); R(c, x + 9, y + 7, 1, 1, mix(wa, '#cde3c8', 0.5)); }
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
      const top = r.y + (s.hide > 0 ? (S.CROWN_HIDE[s.kind] ?? 20) - 5 : 6) - s.z; // hiding turtle / mouse: only the shell or ears stick up
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
  const BTN_PAD = 2; // HUD buttons: a slightly bigger hit area than the art (neighbours sit 4 px apart, so they never overlap)
  const btnHit = (b) => ({ x: b.x - BTN_PAD, y: b.y - BTN_PAD, w: b.w + 2 * BTN_PAD, h: b.h + 2 * BTN_PAD });
  const onBtn = (x, y, b) => inRect(x, y, btnHit(b));
  const awake = () => students.filter(s => s.mode !== 'away' && !s.sleep && !(s.hide > 0));

  // ---------------------------------------------------------------- tapping students
  function tapStudent(s) {
    hintT = Math.min(hintT, 8);
    if (doorTapStudent(s)) return;
    if (s.mode === 'walk') { hop(s, 60); sfx.boing(); return; }
    if (coax(s)) {
      if (!s.here && s.hide > 0) { // shy turtle / mouse peeks out: a moment later comes all the way out and says ¡Presente!
        s.here = true;
        wait(0.6).then(() => { if (s.hide > 0) { s.hide = 0; s.hideT = rand(30, 50); sfx.boing(); } s.here = false; markHere(s, 0, s.kind === 'mouse' ? LD.V20_LINES.peek : null); });
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
    if (pointing(s)) { s.hintPoint = 0; if (hint && hint.by === s) hint.by = null; act(s, 'happy', 0.9); hop(s, 70); animalSound(s); return; } // she was showing the way
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
  let attStarDay = 0;
  function markHere(s, delay, line) {
    s.here = true;
    if (attStarDay !== G.save.day && students.every(q => q.here)) { attStarDay = G.save.day; JAR.earnStar(); } // everyone is here
    wait(delay).then(() => {
      act(s, 'here', 1.3); hop(s, 55); talk(s, 'check', 1.6);
      speak(s, line || (s.kind === 'turtle' ? 'here...' : 'Here!'));
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

  // ---------------------------------------------------------------- v2.4 the class star jar
  // jar.js keeps the count (saved at once); here the stars fly in one by one whenever the room is on screen,
  // and a full jar waits for her tap: a class party and a new sticker.
  let jarShown = JAR.jarCount(), jarFly = [], jarNextFly = 0, jarPop = -9, partying = false;
  const jarFull = () => jarShown >= JAR.JAR_MAX && !partying && !reward;
  const nextSticker = (pool) => pool.find(id => !G.save.stickers.includes(id)) || pick(pool);
  function jarTick() {
    const want = JAR.jarCount();
    if (jarShown > want) jarShown = want;
    const canShow = roomShown() && (phase === 'class' || phase === 'activity') && !reward && !dayCard && !quiz.active && !bookOpen;
    if (canShow && jarShown + jarFly.length < want && G.time > jarNextFly) {
      jarNextFly = G.time + 0.45;
      jarFly.push({ x0: clamp(furn.jar.x + rand(40, 90), 20, V.W - 20), y0: -8, t0: G.time });
    }
    for (let i = jarFly.length - 1; i >= 0; i--) {
      if (G.time - jarFly[i].t0 < 0.8) continue;
      jarFly.splice(i, 1); jarShown = Math.min(want, jarShown + 1); jarPop = G.time;
      sfx.ding(880 + jarShown * 45); burst('spark', furn.jar.x, furn.jar.y - 30, 5, ['#ffd23f', '#fff6b8'], { sp: 40 });
      if (jarShown >= JAR.JAR_MAX) { sfx.fanfare(); for (const s of awake()) if (s.mode === 'seated' && !s.act) { act(s, 'gasp', 0.9); } nextHintAt = Math.min(nextHintAt, G.time + 3); }
    }
  }
  function drawJar(c, f, lift) {
    const full = jarFull();
    const pop = G.time - jarPop < 0.2 ? -1 : 0;
    const wig = full ? Math.round(Math.sin(G.time * 9) * 1.2) : 0;
    shadow(c, f.x, f.y, 18);
    const img = JAR.jarSprite(jarShown, full);
    if (full && Math.floor(G.time * 2.5) % 2) D(c, glow(img, '#ffe58a', 'jarfull'), f.x - JAR.JAR_W / 2 - 2 + wig, f.y - JAR.JAR_H - lift - 2 + pop);
    D(c, img, f.x - JAR.JAR_W / 2 + wig, f.y - JAR.JAR_H - lift + pop);
    if (full && Math.random() < 0.1) burst('spark', f.x + rand(-9, 9), f.y - 30 + rand(-6, 6), 1, ['#ffd23f', '#ffffff'], { sp: 18 });
  }
  function drawJarFly(c) {
    const star = S.particle('star', '#ffd23f');
    for (const q of jarFly) {
      const k = clamp((G.time - q.t0) / 0.8, 0, 1), e = k * k * (3 - 2 * k);
      const tx = furn.jar.x, ty = furn.jar.y - JAR.JAR_H + 4;
      const x = q.x0 + (tx - q.x0) * e, y = q.y0 + (ty - q.y0) * e - Math.sin(k * Math.PI) * 26;
      c.drawImage(star, Math.round(x - star.width), Math.round(y - star.height), star.width * 2, star.height * 2);
    }
  }
  function tapJar() {
    const f = furn.jar;
    if (jarFull() && phase === 'class' && !busy && !quiz.active && !DZ.on) { jarParty(); return; }
    f.lift = 2; setTimeout(() => { f.lift = 0; }, 120); jarPop = G.time;
    sfx.ding(880 + jarShown * 45); burst('spark', f.x, f.y - 24, 4, ['#ffd23f', '#fff6b8'], { sp: 30 });
    if (jarShown > 0 && phase === 'class' && !busy) { const t = pick(awake().length ? awake() : students); speak(t, LD.STAR_COUNT_LINE, 'yay'); } // "¡Cuántas estrellas!"
  }
  async function jarParty() {
    partying = true; busy = true; hint = null;
    const f = furn.jar;
    sfx.fanfare(); teacherAct('cheer', 1.4); teach.vz = 60;
    burst('star', f.x, f.y - 30, 26, ['#ffd23f', '#fff6b8', '#ffb020'], { up: true, sp: 120, life: 1.4 });
    JAR.emptyJar(); jarShown = 0; jarFly = [];
    for (const s of students) { s.sleep = false; s.hide = 0; s.naughty = null; }
    speak(helper(), LD.THEME_NAMES.fiesta, 'yay'); // "¡Fiesta!"
    danceUntil = G.time + 4.4;
    await wait(0.9);
    const cheers = ['Hooray!', 'Yay!', 'Wow!'];
    for (let b = 0; b < 6; b++) {
      if (b % 2 === 0) { burst('confetti', V.W * (0.25 + 0.25 * b / 2), 20, 30, ['#ef6f6c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'], { sp: 90, g: 80, life: 1.7 }); sfx.cheer(1 + b * 0.05); }
      for (const s of students) if (s.mode === 'seated' || s.mode === 'stand') { act(s, 'wiggle', 0.6); wait(rand(0, 0.15)).then(() => hop(s, 55 + b * 6)); }
      if (b === 1 || b === 3) { const t = pick(awake().filter(s => s !== helper())); if (t) speak(t, cheers[(b - 1) / 2], 'yay'); }
      if (b === 2 || b === 4) { teacherAct('twirl', 0.9); teach.vz = 55; }
      await wait(0.6);
    }
    sfx.clap(6, 0.8);
    await wait(0.5);
    reward = { id: nextSticker(S.PARTY_STICKERS), t: G.time, collected: false, party: true };
    sfx.fanfare();
    busy = false; partying = false; lastInput = G.time;
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
      if (pk >= 0 && pk < 0.6 && col) D(c, glow(S.abcCard(ch, col), '#fff6b8', 'abcg'), abcCardX(k) - 2 + sway, A.y + bob);
      D(c, S.abcCard(ch, col), abcCardX(k) - 1 + sway, A.y + 1 + bob);
      if (col) { // the letter she traced, in the round school font (smooth, at device resolution)
        const t = textSprite(ch, { h: 4.6, col: '#ffffff', weight: 0.27, outline: darken(col, 0.2), ow: 0.3 });
        D(c, t, abcCardX(k) - 1 + sway + 2.5 - t.width / 2, A.y + 1 + bob + 6.5 - t.lt.base);
      }
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
  // v2.0: the kids arrive (Trabajo de la mañana, or quickly when she jumps ahead on the Horario)
  async function arrive(fast) {
    busy = true; phase = 'morning'; hurry = !!fast; redToday = false;
    RT.dayStart();
    sky = 'morning'; duskTarget = 0;
    attendanceDone = false;
    feelT = rand(35, 50);
    for (const s of students) Object.assign(s, { card: 'green', naughty: null, center: undefined, mood: null, mode: 'away', here: false, sleep: false, hide: 0, act: null, bubble: null, glowT: 0, z: 0, vz: 0, snack: null, sleepT: rand(14, 24), wanderT: rand(20, 32), hideT: 0 });
    planDoor(); // maybe a friend is late today, and 1-2 knocks at the door later
    await hw(1.2);
    const pace = Math.min(1, 5 / students.length); // v2.0: a bigger class walks in a little closer together
    for (const s of students) {
      if (s.lateToday) continue;
      doorTarget = 1; sfx.door();
      await hw(0.35 * pace);
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
      await hw(1.5 * pace);
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
      if (G.save.theme) { speak(helper(), LD.DECO_SAY.wow, 'tap'); await hw(1.4); } // v2.0: a whole new themed room!
    }
    await abcMorning();
    busy = false; phase = 'class'; sky = 'day'; hurry = false;
    hintT = 3; classStart = G.time; lastInput = G.time; nextHintAt = G.time + 6;
  }
  // Calendario: today's day card, the weather, then attendance with the big faces
  async function circle() {
    busy = true; hurry = false;
    dayCard = { t0: G.time, day: dayIndex() };
    sfx.chime(); teacherAct('point', 1.4);
    teach.pointRight = furn.calendar.x > furn.teacher.x;
    wait(0.4).then(() => speak(RT.calSpeaker(), daySentence(), 'here')); // the calendar helper
    await hw(3.2);
    await RT.morningWeather(); // what's the weather today?
    busy = false; classStart = G.time; lastInput = G.time; nextHintAt = G.time + 4;
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
      await wait(1.3 * Math.min(1, 6 / students.length));
    }
    for (let i = 0; i < 50 && students.some(s => s.mode !== 'away'); i++) await wait(0.2);
    doorTarget = 0; sfx.door();
    await wait(0.8);
    duskTarget = 0.5; sky = 'night';
    await wait(0.8);
    // earn a sticker
    JAR.earnStar(); // a whole day of school
    reward = { id: nextSticker(S.STICKERS), t: G.time, collected: false };
    sfx.fanfare();
    phase = 'reward';
    busy = false;
  }
  function collectReward() {
    if (!reward || reward.collected) return;
    reward.collected = true; reward.ct = G.time;
    sfx.peel();
    G.save.stickers.push(reward.id);
    if (reward.party) { persist(); wait(1.0).then(() => { sfx.chime(); reward = null; }); return; } // a star-jar party: the day goes on
    G.save.day = (G.save.day || 1) + 1;
    persist();
    wait(1.0).then(() => { sfx.chime(); reward = null; phase = 'night'; DZ.close(); guest = null; });
  }

  // ---------------------------------------------------------------- free time
  // ================================================================ v1.9 activities
  // ---------------------------------------------------------------- A5: she serves snack
  // a tray with five snacks: drag one onto a friend, or tap it (it bobs up) and then tap a friend
  let serve = null; // { slots:[{k, taken}], served, eating, armed:{i, until}, drag:{i,x,y}, done, hintAt }
  const SNACK_KINDS = S.KINDS; // one snack per student (v2.0: follows the roster)
  const eaters = () => students.filter(s => s.mode !== 'away');
  const seatedAt = (x, y) => { const d = deskAt(x, y); return d ? students.find(s => s.desk === d.i && s.mode === 'seated') : null; };
  function snackLayout() {
    const nb = btns.find(b => b.id === 'next'), lo = nb.x + nb.w + 4, hi = V.W - V.inset.r - 4;
    const sw = clamp(Math.floor((hi - lo - 8) / SNACK_KINDS.length), 20, 24), w = SNACK_KINDS.length * sw + 8;
    const x0 = Math.round(clamp(V.W / 2 - w / 2, lo, hi - w)), y0 = V.H - V.inset.b - 31;
    return { tray: { x: x0, y: y0, w, h: 28 }, slot: (i) => ({ x: x0 + 4 + i * sw + (sw - 24) / 2, y: y0 + 2, w: 24, h: 24 }) };
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
    if (s.kind === 'bear' && slot.k === 'bear') wait(1.3).then(() => { if (s.snack) { talk(s, 'heart', 1.4); speak(s, LD.V20_LINES.honey, 'yay'); } }); // his honey pot!
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
    sv.done = true; sv.armed = null; JAR.earnStar();
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
    if (!serve || serve.done || DZ.inTray(x, y)) return false;
    const { slot } = snackLayout();
    const i = serve.slots.findIndex((sl, k) => !sl.taken && inRect(x, y, slot(k)));
    if (i >= 0) { press.snack = i; return true; }
    if (serve.armed) {
      if (shownBtns().some(q => onBtn(x, y, q))) { serve.armed = null; return false; }
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
    const bob = Math.max(door ? door.bob : -9, guest ? guest.bob : -9);
    if (G.time - bob > 0.7) return d;
    return ((G.time - bob) % 0.24) < 0.08 ? { ...d, x: d.x + 1 } : d;
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
      if (door.queue.length && G.time > door.nextAt && doorQuiet() && !interrupting() && (SC.calmNow() || (SC.curId === 'calendario' && door.queue[0] === 'late' && G.time - SC.t0 > 8))) door.knock = { kind: door.queue.shift(), n: 0, nextT: G.time };
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
    wait(0.6).then(() => { if (story === st && st.page === pg) speak(st.reader || helper(), t.lines[pg], 'here'); });
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
    UI.drawBtn(c, bk.x, bk.y, 26, 26, UI.FACE.blue, held(bk), S.ICONS.back());
  }
  /** n places to sit on the rug: one gentle arc for a few friends, two staggered rows for a full class
   *  (kept clear of the ▶ button in the bottom-left corner) */
  function rugSpots(n, x0 = furn.rug.x, y0 = furn.rug.y - 12) {
    const nb = btns.find(b => b.id === 'next'), two = n > 5, back = two ? Math.ceil(n / 2) : n, front = n - back, sp = two ? 22 : 15, gap = 15;
    const yb = clamp(y0 - (two ? gap : 0), L.floorTop + 14, Math.min(V.H - 2, nb.y + 2) - (two ? gap : 0)), yf = yb + gap;
    const low = (two ? yf : yb) > nb.y - 6; // the lowest row would stand behind the ▶ button: slide everyone right of it
    const lo = low ? nb.x + nb.w + 6 : 14, hi = V.W - 14;
    const firstX = (m, off) => x0 - (m - 1) / 2 * sp + off;
    let cx = x0;
    if (low) cx += Math.max(0, lo - firstX(two ? front : back, two ? sp / 2 : 0));
    cx = Math.max(cx, 14 + (back - 1) / 2 * sp);
    cx = Math.min(cx, hi - (back - 1) / 2 * sp - (two ? sp / 2 : 0));
    const out = [];
    for (let k = 0; k < back; k++) { const t = back > 1 ? k / (back - 1) : 0.5; out.push({ x: Math.round(cx + (k - (back - 1) / 2) * sp), y: Math.round(yb - (two ? 0 : Math.sin(t * Math.PI) * 4)) }); }
    for (let k = 0; k < front; k++) out.push({ x: Math.round(cx + (k - (front - 1) / 2) * sp + sp / 2), y: yf });
    return out;
  }
  async function storyTime() {
    busy = true; phase = 'activity'; calmMoods();
    const spots = rugSpots(students.length);
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
    busy = true; JAR.earnStar();
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
    if (press && press.redT0 && !press.redFired) { // the red card: a short hold picks it up; then drag it, or let go and tap a student
      const b = press.btn;
      if (!b || busy || !shownBtns().includes(b) || !inRect(press.x, press.y, { x: b.x - 8, y: b.y - 8, w: b.w + 16, h: b.h + 16 })) press.redT0 = null;
      else if (performance.now() - press.redT0 >= RED_HOLD) {
        press.redFired = true; press.moved = false; press.x0 = press.x; press.y0 = press.y;
        drag = { kind: 'star', x: press.x, y: press.y, card: 'red' }; sfx.lift();
        burst('spark', b.x + 13, b.y + 4, 6, ['#ef4b4b', '#ffffff']);
      }
    }
    if (press && press.upd && !press.updFired) { // grown-up refresh needs a 1.5 s hold on the button
      const r = L.updBtn;
      if (!inRect(press.x, press.y, { x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 })) press.upd = false;
      else if (performance.now() - press.updT0 > 1500) {
        press.updFired = true; sfx.chime();
        Promise.resolve(hooks.forceUpdate ? hooks.forceUpdate() : false).then(ok => { if (ok === false) sayNo(); }).catch(sayNo);
      }
    }
    dusk += (duskTarget - dusk) * Math.min(1, dt * 1.5);
    jarTick();
    if (phase === 'class') hintT -= dt; if (hintT < 0) hintT = rand(10, 16);
    if (!roomShown()) { hint = null; lastInput = G.time; } // another scene is open: a fresh wait when she comes back
    const hintable = phase === 'prep' || phase === 'class' || (centros && centros.stage === 'chart') || (phase === 'activity' && (story || recess || (guest && guest.stage === 'knock') || (centros && centros.stage === 'run')));
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
    SC.tick(); guestTick(dt);
    RT.update(dt);
    if (calm && !busy && !story && !recess && !bookOpen && quietOK()) {
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
        if (calm) { const q = quietOK(); if (!q && s.kind === 'owl') s.raiseT = Math.max(s.raiseT || 0, 1); traits(s, dt, { noRaise: !q }); }
        if (s.sleep && Math.random() < dt * 0.9) floatUp('z', '#6f8fd6', ...headPos(s)); // the sleepy bunny, the napping cat
      }
      // wiggly puppy wanders
      if (s.kind === 'puppy' && calm && s.mode === 'seated' && s.here && !s.act && quietOK()) {
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
    if (crowned(s)) { const o = S.CROWN_AT[s.kind]; D(c, S.crown(), x + dx + o[0] - 1, yy + (s.hide > 0 ? S.CROWN_HIDE[s.kind] ?? 19 : o[1]) - 1); }
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
    if (f.type === 'jar') return drawJar(c, f, lift);
    if (f.type === 'teacher') return drawTeacher(c, f);
    const [w, h] = sizeOf(f);
    const bob = f.pop && G.time < f.pop ? -1 : 0;
    if (layerOf(f) === 'floor' && !(f.born > G.time)) shadow(c, f.x, f.y, w * 0.7);
    DZ.drawDeco(c, f, f.x - w / 2, f.y - h - lift + bob); // v2.0: size, mirror, animation, selection glow, art wall
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
  function drawNewGhost(c) {
    const d = drag;
    if (d.desk) {
      const tgt = deskAt(d.px, d.py + 6);
      if (tgt) { c.fillStyle = 'rgba(255,230,110,0.6)'; c.fillRect(tgt.x - 16, tgt.y - 19, 32, 6); }
      D(c, scaled(DC.deskItem(d.type), 2), d.px - 14, d.py - 12);
      return;
    }
    // where it will land: wall things snap to the wall, floor things to the floor
    const g = ghostSpot(d), [w, h] = sizeOf(g);
    if (layerOf(g) === 'floor') shadow(c, g.x, g.y, w * 0.7);
    if (Math.hypot(g.x - d.px, g.y - h / 2 - d.py) > 12) { c.globalAlpha = 0.35; D(c, DC.decor(d.type, 0), d.px - w / 2, d.py - h / 2); c.globalAlpha = 1; }
    D(c, DC.decor(d.type, 0), g.x - w / 2, g.y - h - 2);
  }
  function ghostSpot(d) { const [, h] = DC.decoSize(d.type, 0); const g = { type: d.type, deco: true, sc: 0, x: d.px, y: d.py + h / 2 }; clampItem(g); return g; }

  function render() {
    const c = V.ctx;
    c.save(); c.translate(ox, 0);
    renderRoom();
    c.restore();
    SC.drawChart(c, Vfull, phase);
    c.save(); c.translate(ox, 0); SC.drawLabel(c); c.restore();
  }
  function renderRoom() {
    const c = V.ctx, { W, H } = V;
    c.drawImage(bg, 0, 0);
    drawWindow(c); drawDoor(c); drawBoard(c); drawAbcLine(c);
    RT.drawSwitch(c);
    // wall decorations: v2.3 they fade softly (~15%) while an activity has the focus, so the eye lands on it;
    // in Decorar they're always full strength
    const focus = !DZ.on && SC.curId !== 'decorar' && (quiz.active || (centros && centros.stage === 'run') || story || serve || (hint && G.time < hint.until));
    wallFade += ((focus ? 0.15 : 0) - wallFade) * Math.min(1, 0.06);
    c.save(); if (wallFade > 0.005) c.globalAlpha = 1 - wallFade;
    for (const f of Object.values(furn)) if (layerOf(f) === 'wall' && !(drag && drag.f === f)) drawItem(c, f);
    c.restore();
    // rug
    const rug = furn.rug;
    if (!(drag && drag.f === rug)) D(c, S.rug(DC.RUGS[G.save.rugV % DC.RUGS.length]), rug.x - 42, rug.y - 32);
    drawCenterProps(c);
    // y-sorted objects
    const objs = [];
    // (v2.3: at goodbye the teacher comes to the front, so no turtle, cage or desk hides her wave)
    for (const f of Object.values(furn)) if (f.type !== 'rug' && layerOf(f) === 'floor' && !(drag && drag.f === f)) objs.push({ y: f.type === 'teacher' && phase === 'goodbye' ? 1e6 : f.y, f });
    for (const s of students) if (s.mode !== 'seated' && s.mode !== 'away' && s.mode !== 'held') objs.push({ y: s.y, s });
    if (recess) objs.push({ y: recess.ball.y, ball: recess.ball });
    v19Objs(objs);
    centrosObjs(objs);
    if (guest && guest.stage !== 'knock') objs.push({ y: guest.y, draw: drawGuest });
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
    drawCenterSigns(c);
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
    DZ.drawSel(c); // the selected thing's bubbles (colour / size / trash)
    drawSnackTray(c);
    drawHud(c);
    // things being dragged float on top of everything (the trash can stays visible over them)
    if (drag && drag.f) {
      const f = drag.f, ot = overTrash(drag.px, drag.py);
      if (layerOf(f) === 'floor') shadow(c, f.x, f.y, sizeOf(f)[0] * 0.8);
      if (ot) c.globalAlpha = 0.5;
      drawItem(c, f); c.globalAlpha = 1;
    }
    drawTrash(c);
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

  /** v2.3: every tappable thing is a chunky button: blue for tools, green for go/done, red for the red card */
  const BTN_FACE = { next: UI.FACE.green, cdone: UI.FACE.green, cardRed: UI.FACE.red };
  function drawButton(c, b, pressed, face = BTN_FACE[b.id] || UI.FACE.blue) { UI.drawBtn(c, b.x, b.y, b.w, b.h, face, pressed, b.icon()); }
  /** is she holding a finger on this rect right now? (for buttons that don't track their own press) */
  const held = (r) => !!(press && r && !press.moved && inRect(press.x, press.y, r));
  function hudVisible() { return phase === 'class' || phase === 'activity' || phase === 'prep' || phase === 'morning'; }
  function shownBtns() {
    if (phase === 'prep') return btns.filter(b => ['help', 'next'].includes(b.id));
    if (phase === 'morning') return btns.filter(b => b.id === 'next');
    if (phase !== 'class' && phase !== 'activity') return [];
    const cards = SC.cur.cards && !DZ.on && !serve;
    const run = centros && centros.stage === 'run';
    return btns.filter(b => ['help', 'next'].includes(b.id) || (cards && ['star', 'cardGreen', 'cardRed'].includes(b.id)) || (run && ['toys', 'cdone'].includes(b.id)));
  }
  function drawHud(c) {
    if (!hudVisible() || quiz.active) return; // v2.3: nothing peeks out from under a question card
    DZ.draw(c); // (it tucks down to its tabs while she drags a thing into the room and after she places one)
    if (SC.curId === 'calendario' && phase === 'class' && !dayCard && !busy) drawBigFaces(c);
    if (choicesShown()) SC.drawChoices(c, choiceRects(), btnFrame, press && press.choice);
    for (const b of shownBtns()) {
      const dn = !!(press && press.btn === b);
      if (b.id === 'next') { // big ▶ "siguiente": glows when this block is done
        const ready = (phase === 'prep' || phase === 'class' || recess) && !busy && (SC.purposeDone() || recess);
        const k = ready && !dn ? Math.round(Math.abs(Math.sin(G.time * 4)) * 2) : 0;
        if (ready) { c.globalAlpha = 0.6 + 0.4 * Math.sin(G.time * 4); D(c, glow(UI.button(b.w, b.h, UI.FACE.green), '#ffd23f', 'nextglow'), b.x - 2, b.y - 2 - k); c.globalAlpha = 1; }
        const sh = UI.drawBtn(c, b.x, b.y - k, b.w, b.h, UI.FACE.green, dn);
        const ic = b.icon(), fy = b.y - k + UI.faceY(b.h, 0, false) + sh;
        D(c, ic, b.x + 3, fy - ic.height / 2);
        D(c, blockIcon(SC.nextId), b.x + b.w - ICON_W - 3, fy - ICON_H / 2); // ▶ + the next card's picture
        continue;
      }
      if (b.id === 'cardRed') { drawRedCard(c, b, dn); continue; }
      if (b.id === 'toys' && bellWants()) { c.globalAlpha = 0.6 + 0.4 * Math.sin(G.time * 5); D(c, glow(UI.button(b.w, b.h, UI.FACE.yellow), '#ffd23f', 'homeglow'), b.x - 2, b.y - 2); c.globalAlpha = 1; } // v2.1: ring for a new round
      drawButton(c, b, dn, b.id === 'toys' && bellWants() ? UI.FACE.yellow : undefined);
    }
  }
  function drawRedCard(c, b, dn) { // smaller, on a quiet frame; while it's held a ring fills up (like the ⟳ button)
    const a = b.art, x = b.x + (b.w - a) / 2, y = b.y + (b.h - a) / 2 + 1, ic = b.icon();
    UI.drawBtn(c, x, y, a, a + 2, UI.FACE.red, dn, ic);
    const hold = press && press.btn === b && press.redT0 && !press.redFired ? Math.min(1, (performance.now() - press.redT0) / RED_HOLD) : 0;
    if (hold > 0) ringAt(c, x + a / 2, y + a / 2, hold);
  }
  function ringAt(c, cx, cy, k, r = 13) {
    for (let t = 0; t < k * Math.PI * 2; t += 0.05) for (const rr of [r, r + 1]) R(c, cx + Math.sin(t) * rr - 0.5, cy - Math.cos(t) * rr - 0.5, 1, 1, '#c94f4f');
  }
  // ---- v2.0 Calendario: the attendance faces, big, across the top
  function faceRow() { // eight faces fit between the left edge and the ? button
    const n = students.length, hb = btns.find(b => b.id === 'help'), lo = V.inset.l + 6, hi = hb.x - 8;
    const gap = clamp(Math.floor((hi - lo - n * 26) / Math.max(1, n - 1)), 0, 3), fw = 26 + gap, tot = n * fw - gap;
    const x0 = Math.round(clamp(V.W / 2 - tot / 2, lo, hi - tot)), y = V.inset.t + 5;
    return students.map((s, k) => ({ s, x: x0 + k * fw, y, w: 26, h: 32 }));
  }
  function drawBigFaces(c) {
    const fr = faceRow(), f0 = fr[0], fl = fr[fr.length - 1], pw = fl.x + fl.w - f0.x + 8;
    D(c, btnFrame(pw, 38, '#fffaf0', 'faces'), f0.x - 4, f0.y - 3);
    for (const f of fr) {
      const s = f.s, bob = s.here && acting(s, 'here') ? -2 : 0;
      D(c, scaled(miniFace(s.kind, s.here), 2), f.x, f.y + bob);
      if (!s.here) { const zb = Math.floor(G.time * 2 + f.x) % 2; D(c, scaled(S.particle('z', '#4f6fc6'), 1), f.x + 20, f.y + 1 - zb); D(c, S.particle('z', '#6f8fd6'), f.x + 23, f.y - 4 - zb); } // v2.3: not here yet: a sleepy badge, still in full colour
      if (s.card) R(c, f.x + 3, f.y + 28, 8, 3, s.card === 'red' ? '#ef4b4b' : '#3cb44b');
      if (crowned(s)) D(c, cached('minicrown', () => { const p = new Pix(7, 5); p.map(1, 1, ['#.#.#', '#####', '#####'], { '#': '#ffd23f' }); p.px(3, 3, '#ef4b4b'); p.outline(); return p.canvas(); }), f.x + 10, f.y - 3);
      if (s.here) D(c, cached('bigtick', () => { const p = new Pix(10, 8); p.line(0, 4, 3, 7, '#3cb44b'); p.line(3, 7, 9, 0, '#3cb44b'); p.line(1, 4, 3, 6, '#3cb44b'); p.line(3, 6, 8, 0, '#3cb44b'); p.outline('#ffffff', 0.9); return p.canvas(); }), f.x + 17, f.y + 20);
    }
  }
  // ---- v2.0 the block's big choice cards (Pizarra, Letras, …) along the bottom
  function choicesShown() {
    return phase === 'class' && !busy && !DZ.on && !serve && !story && !recess && !centros && !guest && !dayCard && (SC.cur.choices || []).length > 0 && !SC.going;
  }
  function choiceRects() {
    const nb = btns.find(b => b.id === 'next'), red = btns.find(b => b.id === 'cardRed');
    const hi = SC.cur.cards ? red.x - 4 : V.W - V.inset.r - 4;
    return SC.choiceRects(V, nb.x + nb.w + 6, hi);
  }
  function choicePt(id) { if (!choicesShown()) return null; const r = choiceRects().find(q => q.id === id); return r ? { x: r.x + r.w / 2, y: r.y + 12 } : null; }
  const CHOICE_UI = { ayudantes: 'jobs', recreo: 'recess', cuento: 'story', almuerzo: 'snack' };
  function choose(id) {
    if (busy) return;
    sayUI(CHOICE_UI[id] || id); SC.markUsed(); hint = null;
    if (id === 'pizarra') { sfx.whoosh(); hooks.openBoard(L.board, V.s); }
    if (id === 'letras' || id === 'numeros' || id === 'silabas') { sfx.whoosh(); hooks.openLetters({ letras: 'abc', numeros: '123', silabas: 'ma' }[id]); }
    if (id === 'figuras') { sfx.whoosh(); hooks.openShapes(); }
    if (id === 'ayudantes') RT.openJobs();
    if (id === 'emociones') feelingsCheck();
    if (id === 'recreo') recessTime();
    if (id === 'cuento') storyTime();
    if (id === 'centros') openCentrosChart();
    if (id === 'almuerzo') serveSnack();
    if (id === 'lector') lectorTime();
  }
  function feelingsCheck() { // "¿Cómo te sientes?": a friend shares a feeling and she helps
    const c = students.filter(s => s.mode === 'seated' && !s.mood && !s.sleep && !(s.hide > 0));
    if (!c.length) { sfx.softPop(); return; }
    const s = pick(c); s.here = true;
    s.mood = pick(LD.MOODS); talk(s, MOOD_BUBBLE[s.mood], 9999); speak(s, LD.FEEL_CALL, 'here');
    wait(1.2).then(() => { if (s.mood && !quiz.active && phase === 'class') helpFeelings(s); });
  }
  function sayNo() { sfx.thump(); setTimeout(() => sfx.thump(), 170); } // "not now" (e.g. offline refresh)
  function bellIcon() {
    const p = new Pix(18, 18);
    p.ball(9, 9, 6, 6.5, '#ffd23f', { clip: { y1: 12 } }); p.rect(2, 12, 14, 2, '#e0a820'); p.ball(9, 15, 1.6, 1.6, '#a8703f'); p.rect(8, 1, 2, 2, '#a8703f');
    p.outline(); return p.canvas();
  }

  // ---------------------------------------------------------------- decorate tray (v2.0: js/decorate.js)
  const DZ = createDecorate({
    V: () => V, L: () => L, furn, desks: () => desks, sizeOf, layerOf, clampItem, remember, saveDecor, loadDecor, cycleVariant, setDeskItem,
    addDecor: (t, x, y, o) => addDecor(t, x, y, { ...o, bottom: true }), puff: puffAt, trashFx, cheer: cheerDecor, burst, sayUI, sayItem, teacherAct,
    say: (t) => speak(helper(), t, 'tap'), btnFrame, scaled, boardCanvas: () => hooks.boardCanvas(),
    redrawBg: () => { if (V) bg = drawBg(); }, reflow: () => { if (V) for (const f of Object.values(furn)) if (f.deco) place(f); },
    nextBtn: () => btns.find(b => b.id === 'next'), hudRects: () => btns,
    dragging: () => !!drag, pressTile: () => (press && press.dz && press.dz.tile && !press.dz.mode ? press.dz.tile.kind + press.dz.tile.id : null),
  });
  function puffAt(f) { // a soft puff of dust around a thing that just arrived or changed
    const [w, h] = sizeOf(f), wall = layerOf(f) === 'wall';
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2;
      parts.push({ kind: 'puff', color: k % 2 ? '#ffffff' : '#fff1dc', x: f.x + Math.cos(a) * w * 0.45, y: (wall ? f.y - h / 2 : f.y - 2) + Math.sin(a) * (wall ? h * 0.45 : 3), vx: Math.cos(a) * 22, vy: Math.sin(a) * 8 - 6, g: -8, life: 0.55, t: 0 });
    }
  }
  function trashFx(x, y) {
    sfx.trash(); sayUI('trash');
    burst('crumb', x, y, 10, ['#d8d0c8', '#bfe0f5', '#ffffff'], { up: true, sp: 50, g: 120 });
    burst('puff', x, y, 6, ['#ffffff', '#f2ece4'], { sp: 30, g: -10 });
  }
  function cheerDecor(x, y) {
    burst('spark', x, y, 10, ['#ffd23f', '#ff9ec4', '#7ec8ff', '#ffffff'], { sp: 60 });
    sfx.sparkle();
    teacherAct(Math.random() < 0.5 ? 'clap' : 'cheer', 1);
    const aw = awake().filter(s => s.mode === 'seated');
    if (aw.length && Math.random() < 0.6) { const s = pick(aw); act(s, 'gasp', 0.8); speak(s, pick(['Ooh!', 'Pretty!', 'Wow!', 'I like it!']), 'ooh'); }
  }
  // y: the middle of the thing (a drop) or, with o.bottom, where it stands; o.quiet + o.delay: a theme pops things in one by one
  function addDecor(type, x, y, o = {}) {
    if (Object.values(furn).filter(f => f.deco).length >= 40) { sfx.softPop(); return null; }
    const id = 'd' + (uid++);
    const sc = o.sc || 0, [, h] = DC.decoSize(type, sc);
    const f = { id, type, deco: true, v: (o.v || 0) % DC.DECOR[type].variants.length, sc, fl: !!o.fl, x, y: o.bottom ? y : y + h / 2, fx: 0, fy: 0, lift: 0, born: G.time + (o.delay || 0) };
    furn[id] = f;
    clampItem(f); if (!o.quiet) DZ.settle(f); remember(f);
    if (!o.quiet) { sfx.thump(); puffAt(f); cheerDecor(f.x, f.y - h / 2); sayItem(type); }
    return f;
  }
  function setDeskItem(d, type) {
    G.save.deskItems[d.i] = type; G.save.decorStamp++; persist(); sayItem(type);
    sfx.pop(1.3); burst('spark', d.x + 9, d.y - 24, 8, ['#ffd23f', '#ffffff', '#ff9ec4']);
    const s = students.find(t => t.desk === d.i && t.mode === 'seated');
    if (s) { act(s, 'happy', 1); talk(s, 'heart', 1.4); speak(s, 'Thank you!', 'yay'); }
    if (desks.every(q => G.save.deskItems[q.i])) wait(0.4).then(() => { sfx.chime(); teacherAct('cheer', 1.2); for (const q of desks) burst('star', q.x, q.y - 26, 3, ['#ffd23f'], { up: true }); });
  }
  function cycleVariant(f) {
    if (f.type === 'rug') { G.save.rugV = (G.save.rugV + 1) % DC.RUGS.length; G.save.decorStamp++; persist(); }
    else { f.v = (f.v + 1) % DC.DECOR[f.type].variants.length; saveDecor(); }
    f.pop = G.time + 0.2; sfx.pop(1.2);
    burst('spark', f.x, f.y - sizeOf(f)[1] / 2, 5, ['#ffd23f', '#ffffff']);
  }
  // v2.1: ▶ Play starts the day where the class comes in: the bell rings and the friends walk in for Trabajo de la mañana.
  // 'prep' is only the empty morning room for the moment before the first friend comes through the door.
  // Decorar is optional now: its card on the Horario opens the tray any time (with the class watching).
  function startDay() {
    phase = 'prep'; sky = 'morning'; duskTarget = 0; busy = false; DZ.close(); dayCard = null;
    for (const s of students) Object.assign(s, { mode: 'away', act: null, bubble: null, snack: null });
    teacherAct('wave', 1.6);
    prepStamp = G.save.decorStamp; lastInput = G.time; nextHintAt = G.time + 8;
    SC.reset(); SC.go('manana', 'next');
  }

  // ---------------------------------------------------------------- trash can
  function trashRect() { return { x: Math.round(V.W / 2 - 13), y: (DZ.on ? DZ.visTop() : V.H - V.inset.b) - 34, w: 26, h: 30 }; }
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
    const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2 + (k < 2.4 ? Math.sin(G.time * 3) * 2 : 0));
    c.drawImage(card, x0, y0, w, h);
    const wd = textSprite(DAY_WORDS[di], { h: 15, col: DAY_COLORS[di], weight: 0.22 }), ws = w / card.width; // "LUNES" in the school font, smooth
    c.drawImage(wd, x0 + ((card.width - 2 - wd.width) / 2) * ws, y0 + (41 - wd.lt.base) * ws, wd.width * ws, wd.height * ws);
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
      L.bigBtn = { x: bx - 6, y: by - 6, w: big.width + 12, h: big.height + 14 };
      UI.drawBtn(c, L.bigBtn.x, L.bigBtn.y, L.bigBtn.w, L.bigBtn.h, phase === 'title' ? UI.FACE.green : UI.FACE.yellow, !!(press && press.big), big);
      L.stickBtn = { ...stickPos(), w: 26, h: 26 }; // Mis estampas
      UI.drawBtn(c, L.stickBtn.x, L.stickBtn.y, 26, 26, UI.FACE.blue, !!(press && press.stick), S.ICONS.stickers());
      L.whoBtn = { x: L.stickBtn.x + 30, y: L.stickBtn.y, w: 26, h: 26 }; // who is the teacher today?
      UI.drawBtn(c, L.whoBtn.x, L.whoBtn.y, 26, 26, UI.FACE.pink, !!(press && press.whoBtn), teacherFace(G.save.look));
      if (phase === 'title' || phase === 'night') { // grown-up corner: version, refresh, music on/off
        const vt = wsprite('v' + VERSION, '#8a7a90');
        const vx = W - V.inset.r - vt.width - 4, vy = H - V.inset.b - vt.height - 3;
        D(c, vt, vx, vy);
        L.updBtn = { x: vx - 24, y: vy - 8, w: 22, h: 22 };
        const glowOn = updateAvail && Math.floor(G.time * 3) % 2;
        D(c, UI.button(22, 22, glowOn ? '#fff3a0' : '#efe6dc', !!(press && press.upd)), L.updBtn.x, L.updBtn.y);
        // grey, for grown-ups (not the green of Play or the letters' ↻); hold 1.5 s, a ring fills while held
        D(c, cached('updicon2', () => { const p = new Pix(16, 16), g = '#9a8ea0'; for (let a = -2.6; a < 2.0; a += 0.06) { p.px(8 + Math.cos(a) * 5.5, 8 + Math.sin(a) * 5.5, g); p.px(8 + Math.cos(a) * 4.6, 8 + Math.sin(a) * 4.6, g); } p.map(10, 1, ['###', '.##', '..#'], { '#': g }); return p.canvas(); }), L.updBtn.x + 3, L.updBtn.y + 1 + (press && press.upd ? UI.DROP : 0));
        if (press && press.upd) {
          const k = Math.min(1, (performance.now() - press.updT0) / 1500), cx = L.updBtn.x + 11, cy = L.updBtn.y + 11;
          for (let a = 0; a < k * Math.PI * 2; a += 0.05) for (const rr of [12, 13]) R(c, cx + Math.sin(a) * rr - 0.5, cy - Math.cos(a) * rr - 0.5, 1, 1, k >= 1 ? '#7a5bc0' : '#8a7a90');
        }
        L.musBtn = { x: W - V.inset.r - 26, y: V.inset.t + 4, w: 22, h: 22 };
        const mOn = G.save.music !== false;
        const md = !!(press && press.mus); D(c, UI.button(22, 22, '#efe6dc', md), L.musBtn.x, L.musBtn.y);
        D(c, cached('musicon' + mOn, () => { const p = new Pix(16, 16); p.map(3, 2, ['....######', '....#....#', '....#....#', '....#....#', '..###..###', '.####.####', '..##...##.'], { '#': mOn ? '#7a5bc0' : '#b9a9c0' }); if (!mOn) { p.line(1, 14, 14, 1, '#ef4b4b'); p.line(2, 14, 15, 1, '#ef4b4b'); } p.outline(); return p.canvas(); }), L.musBtn.x + 3, L.musBtn.y + 1 + (md ? UI.DROP : 0));
        if (!updateChecked) { updateChecked = true; fetch('js/version.js', { cache: 'no-store' }).then(r => r.text()).then(t => { const m = t.match(/VERSION = '([^']+)'/); if (m && m[1] !== VERSION) updateAvail = m[1]; }).catch(() => {}); }
      }
      if (phase === 'title') {
        // the whole class peeking up to say hello: four friends on each side of Louise, inner ones in front
        D(c, DC.teacher({ eyes: Math.floor(G.time * 1.1) % 6 === 0 ? 'blink' : 'happy', mouth: 'grin', armL: Math.floor(G.time * 4) % 2 ? 'wave1' : 'wave2', armR: 'down', sway: Math.floor(G.time * 1.2) % 2 }), W / 2 - 15, H * 0.58 - 106);
        const half = Math.ceil(students.length / 2), sp = Math.min(28, Math.floor((W / 2 - 38) / half));
        const spots = students.map((s, i) => { const side = i < half ? -1 : 1, k = i < half ? half - 1 - i : i - half; return { s, i, x: W / 2 + side * (40 + k * sp), y: H * 0.58 - 92 - (k % 2 ? 6 : 0) }; });
        for (const q of spots.sort((a, b) => a.y - b.y)) {
          const { s, i } = q;
          const img = S.student(s.kind, { eyes: Math.floor(G.time * 1.3 + i) % 5 === 0 ? 'blink' : 'happy', mouth: 'smile', armL: i % 2 ? 'wave1' : 'down', armR: 'down', feet: 0, look: 0, blush: true, hide: 0, wag: false, earUp: false, tongue: s.kind === 'puppy' });
          D(c, img, q.x - 17, q.y + Math.round(Math.abs(Math.sin(G.time * 3 + i)) * -3));
        }
      } else {
        const n = G.save.stickers.length;
        const stk = n ? S.sticker(G.save.stickers[n - 1]) : null;
        if (stk) D(c, scaled(stk, 2), W / 2 - 32, H * 0.58 - 100);
      }
    }
    if (menu) {
      c.fillStyle = 'rgba(40,30,60,0.45)'; c.fillRect(0, 0, W, H);
      for (const m of menu.items) {
        UI.drawBtn(c, m.x, m.y, m.w, m.h, UI.FACE.yellow, held(m), scaled(m.icon(), 2));
      }
    }
    drawJarFly(c);
    if (story) drawStory(c);
    if (reward) drawReward(c);
    if (bookOpen) drawStickerBook(c);
    if (who && (phase === 'title' || phase === 'night')) drawWho(c);
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
      const b = stickPos();
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
  // ---------------------------------------------------------------- v2.4 who is the teacher today?
  // Three teachers can share the iPad. Each card is one teacher with her own classroom, stickers and look;
  // the teacher who is playing can change her hair, her dress and her skin with the three round buttons.
  G.save.look = DC.cleanLook(G.save.look, SLOT);
  let who = null;
  try { if (sessionStorage.getItem('littleTeacher.pick')) { sessionStorage.removeItem('littleTeacher.pick'); who = { t: 0 }; } } catch (e) { /* ignore */ }
  const lookOf = (i) => (i === SLOT ? G.save.look : DC.cleanLook((peekSlot(i) || {}).look, i));
  const LOOK_PARTS = [['hair', DC.HAIRS], ['outfit', DC.OUTFITS], ['skin', DC.SKINS]];
  function whoLayout() {
    const { W, H } = V, gap = 6;
    const cw = Math.min(78, Math.floor((W - 16 - gap * (SLOTS - 1)) / SLOTS));
    const k = H >= 178 && cw >= 66 ? 2 : 1;
    const ch = DC.TH * k + 40;
    const x0 = Math.round(W / 2 - (cw * SLOTS + gap * (SLOTS - 1)) / 2), y0 = Math.max(V.inset.t + 16, Math.round(H / 2 - ch / 2) + 4);
    const cards = Array.from({ length: SLOTS }, (_, i) => ({ i, x: x0 + i * (cw + gap), y: y0, w: cw, h: ch }));
    const me = cards[SLOT];
    const sw = LOOK_PARTS.map((q, j) => ({ j, x: Math.round(me.x + cw / 2 - 35 + j * 24), y: me.y + ch - 29, w: 22, h: 22 }));
    const back = { x: Math.max(V.inset.l + 2, x0 - 14), y: Math.max(V.inset.t + 2, y0 - 14), w: 26, h: 26 };
    return { cards, sw, back, k };
  }
  function swatchIcon(j, look) {
    return cached('lookico' + j + ',' + look.hair + ',' + look.outfit + ',' + look.skin, () => {
      const p = new Pix(14, 12);
      if (j === 0) { const [h, hi] = DC.HAIRS[look.hair]; p.ell(7, 5, 6, 5, h); p.rect(1, 5, 3, 7, h); p.rect(10, 5, 3, 7, h); p.hline(5, 9, 2, hi); p.ell(7, 8, 3.5, 3.5, DC.SKINS[look.skin][0]); }
      if (j === 1) { const [top, skirt] = DC.OUTFITS[look.outfit]; p.rect(5, 0, 4, 5, top); p.rect(3, 1, 8, 2, top); for (let y = 5; y < 12; y++) p.hline(5 - Math.floor((y - 4) * 0.6), 8 + Math.floor((y - 4) * 0.6), y, skirt); }
      if (j === 2) { const [sk, sh] = DC.SKINS[look.skin]; p.ell(7, 6, 5.5, 5.5, sk); p.px(5, 5, '#3a2a24'); p.px(9, 5, '#3a2a24'); p.hline(6, 8, 8, sh); }
      p.outline(); return p.canvas();
    });
  }
  function teacherFace(look) { // the teacher's head, for the title button
    const lk = DC.cleanLook(look);
    return cached('tface' + lk.hair + ',' + lk.outfit + ',' + lk.skin, () => {
      const src = DC.teacher({ eyes: 'happy', mouth: 'grin', armL: 'down', armR: 'down', feet: 0, sway: 0 }, lk);
      const c2 = document.createElement('canvas'); c2.width = 22; c2.height = 18; c2.getContext('2d').drawImage(src, -4, -4); return c2;
    });
  }
  function drawWho(c) {
    const { W, H } = V;
    c.fillStyle = 'rgba(40,30,60,0.5)'; c.fillRect(0, 0, W, H);
    const lay = whoLayout(); L.who = lay;
    for (const cd of lay.cards) {
      const me = cd.i === SLOT, sv = peekSlot(cd.i), down = !!(press && press.who) && inRect(press.x, press.y, cd) && !(me && lay.sw.some(r => inRect(press.x, press.y, r)));
      const dy = UI.drawBtn(c, cd.x, cd.y, cd.w, cd.h, me ? UI.FACE.yellow : UI.FACE.cream, down, null, me ? '#c98a00' : null);
      const st = me
        ? { eyes: Math.floor(G.time * 1.1) % 6 === 0 ? 'blink' : 'happy', mouth: 'grin', armL: Math.floor(G.time * 4) % 2 ? 'wave1' : 'wave2', armR: 'down', feet: 0, sway: Math.floor(G.time * 1.2) % 2 }
        : { eyes: 'happy', mouth: 'smile', armL: 'down', armR: 'down', feet: 0, sway: 0 };
      const img = DC.teacher(st, lookOf(cd.i)), k = lay.k;
      const pop = me && who.pop && G.time - who.pop < 0.25 ? -2 : 0;
      c.drawImage(img, Math.round(cd.x + cd.w / 2 - DC.TW * k / 2), cd.y + 5 + dy + pop, DC.TW * k, DC.TH * k);
      if (me) continue;
      // another teacher's card: her newest stickers, so each girl knows which one is hers
      const mine = sv ? [...new Set(sv.stickers || [])].filter(id => S.ALBUM.includes(id)).slice(-3) : [];
      mine.forEach((id, q) => c.drawImage(S.sticker(id), Math.round(cd.x + cd.w / 2 - mine.length * 9 + q * 18), cd.y + cd.h - 27 + dy, 16, 16));
    }
    for (const r of lay.sw) UI.drawBtn(c, r.x, r.y, r.w, r.h, UI.FACE.blue, held(r), swatchIcon(r.j, G.save.look));
    UI.drawBtn(c, lay.back.x, lay.back.y, 26, 26, UI.FACE.blue, held(lay.back), S.ICONS.back());
  }
  function tapWho(x, y) {
    const lay = L.who || whoLayout();
    const sw = lay.sw.find(r => inRect(x, y, r));
    if (sw) { // change her hair / dress / skin
      const [field, list] = LOOK_PARTS[sw.j];
      G.save.look = { ...G.save.look, [field]: (G.save.look[field] + 1) % list.length }; persist();
      who.pop = G.time; sfx.pop(1.1 + sw.j * 0.15); sfx.sparkle();
      return;
    }
    if (inRect(x, y, lay.back)) { sfx.whoosh(); sayUI('back'); who = null; return; }
    const cd = lay.cards.find(r => inRect(x, y, r));
    if (!cd) { sfx.pop(); who = null; return; }
    if (cd.i === SLOT) { sfx.chime(); who = null; speak(pick(students.filter(s => s !== helper())), 'Hi teacher!', 'hi'); return; }
    sfx.chime(); switchSlot(cd.i); // her classroom loads
  }

  const bookPages = () => Math.max(1, Math.ceil(S.ALBUM.length / 18));
  const bookPageOf = (id) => Math.max(0, Math.floor(S.ALBUM.indexOf(id) / 18)); // open at her newest sticker
  function drawStickerBook(c) {
    const { W, H } = V;
    c.fillStyle = 'rgba(40,30,60,0.5)'; c.fillRect(0, 0, W, H);
    const bw = Math.min(W - 40, 236), bh = Math.min(H - 30, 150);
    const x = Math.round(W / 2 - bw / 2), y = Math.round(H / 2 - bh / 2);
    R(c, x - 3, y - 3, bw + 6, bh + 6, '#4f97d6'); R(c, x, y, bw, bh, '#7ec8ff');
    R(c, x + 4, y + 4, bw / 2 - 5, bh - 8, '#fffaf0'); R(c, x + bw / 2 + 1, y + 4, bw / 2 - 5, bh - 8, '#fffaf0');
    R(c, x + bw / 2 - 1, y + 3, 2, bh - 6, '#bcd8ee');
    const cols = 3, rows = 3, cell = Math.min(Math.floor((bw / 2 - 10) / cols), Math.floor((bh - 14) / rows));
    // v2.4: an album. Every sticker has its own place; the ones she hasn't earned yet show as a grey shape
    const all = S.ALBUM, owned = new Set(G.save.stickers), newest = G.save.stickers[G.save.stickers.length - 1];
    const pageSize = cols * rows * 2;
    const pg = bookOpen.page;
    L.bookCells = [];
    for (let side = 0; side < 2; side++) {
      const ox = x + 6 + side * (bw / 2 + 1) + Math.floor((bw / 2 - 10 - cols * cell) / 2), oy = y + 7 + Math.floor((bh - 14 - rows * cell) / 2);
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const idx = pg * pageSize + side * cols * rows + r * cols + q;
        const cx = ox + q * cell, cy = oy + r * cell;
        R(c, cx + 2, cy + 2, cell - 4, cell - 4, '#f1e9dc');
        if (idx >= all.length) continue;
        const id = all[idx];
        if (!owned.has(id)) { D(c, S.stickerShadow(id), cx + cell / 2 - 16, cy + cell / 2 - 16); continue; }
        const isNew = id === newest && G.time - bookOpen.t < 2;
        const tapped = bookOpen.tap && bookOpen.tap.id === id ? G.time - bookOpen.tap.t : 9;
        const bob = isNew ? Math.round(Math.sin(G.time * 8)) : tapped < 0.5 ? -Math.round(Math.sin(tapped / 0.5 * Math.PI) * 5) : 0;
        D(c, S.sticker(id), cx + cell / 2 - 16, cy + cell / 2 - 16 + bob);
        L.bookCells.push({ id, x: cx, y: cy, w: cell, h: cell });
      }
    }
    // page arrows when needed + close button
    const pages = bookPages();
    L.bookRect = { x: x - 3, y: y - 3, w: bw + 6, h: bh + 6 };
    L.bookBack = { x: Math.max(V.inset.l + 2, x - 12), y: Math.max(V.inset.t + 2, y - 12), w: 26, h: 26 };
    UI.drawBtn(c, L.bookBack.x, L.bookBack.y, 26, 26, UI.FACE.blue, held(L.bookBack), S.ICONS.back());
    L.bookNext = pages > 1 ? { x: x + bw - 12, y: y + bh - 14, w: 26, h: 26 } : null;
    if (L.bookNext) UI.drawBtn(c, L.bookNext.x, L.bookNext.y, 26, 26, UI.FACE.green, held(L.bookNext), S.ICONS.play());
  }

  // ---------------------------------------------------------------- input
  function deskAt(x, y) {
    let best = null, bd = 30;
    for (const d of desks) { const dd = Math.hypot(d.x - x, (d.y - 20) - y); if (dd < bd) { bd = dd; best = d; } }
    return best;
  }
  function stickPos() { return { x: 4, y: V.H - V.inset.b - 30 }; }
  function down(x, y) {
    if (!quiz.active && !RT.chartOpen && !RT.picking && !bookOpen && !reward && !drag && SC.down(x, y)) { lastInput = G.time; hint = null; return; }
    downR(x - ox, y);
  }
  function move(x, y) { if (SC.taking()) return; moveR(x - ox, y); }
  function up(x, y) { if (SC.taking()) { SC.up(x, y); return; } upR(x - ox, y); }
  function downR(x, y) {
    press = { x0: x, y0: y, x, y, moved: false, t: G.time };
    lastInput = G.time; hint = null;
    if (quiz.active) { press.quiz = true; return; }
    if (RT.down(x, y)) { press.rt = true; return; } // weather picker / jobs chart
    if (centros && centros.stage === 'chart') {
      press.cchart = true;
      const f = faceRects().find(r => inRect(x, y, { x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 }));
      if (f) { centros.drag = { s: f.s, x, y, moved: false }; sfx.lift(); }
      return;
    }
    if (centros && centros.stage === 'run' && !shownBtns().some(b => onBtn(x, y, b))) { // v2.1: a centro's sign, or a friend at a centro that wants the teacher
      const sg = centerSigns().find(r => inRect(x, y, { x: r.x - 5, y: r.y - 6, w: r.w + 10, h: r.h + 14 }));
      if (sg) { press.sign = sg; return; }
      const s = hitStudent(x, y);
      if (s && s.center !== undefined && centroWants(s.center)) { press.sign = { ci: s.center }; return; }
    }
    if (phase === 'title' || phase === 'night') {
      if (who) { press.who = true; return; }
      if (bookOpen) { press.book = true; return; }
      if (L.stickBtn && inRect(x, y, L.stickBtn)) { press.stick = true; return; }
      if (L.whoBtn && inRect(x, y, L.whoBtn)) { press.whoBtn = true; return; }
      if (L.updBtn && inRect(x, y, L.updBtn)) { press.upd = true; press.updT0 = performance.now(); return; }
      if (L.musBtn && inRect(x, y, L.musBtn)) { press.mus = true; return; }
      if (L.bigBtn && inRect(x, y, L.bigBtn)) press.big = true; return;
    }
    if (reward) { press.reward = true; return; }
    if (bookOpen) { press.book = true; return; }
    if (menu) { press.menu = true; return; }
    if (['prep', 'morning', 'class', 'activity', 'goodbye'].includes(phase) && !story && !dayCard && !armed && !(DZ.on && (DZ.sel || DZ.inTray(x, y)))
      && teacherHit(x, y) && !shownBtns().some(b => onBtn(x, y, b)) && !(choicesShown() && choiceRects().some(r => inRect(x, y, r)))) {
      const s = hitStudent(x, y); // a friend standing in front of her gets the tap
      if (!s || sortY(s) < furn.teacher.y) { press.f = furn.teacher; press.teach = true; return; }
    }
    if (phase === 'morning' && !hurry) hurryUp(x, y);
    if (snackDown(x, y)) return;
    if (armed) { // holding a star / card: the next student tap gets it, a tap anywhere else puts it back
      const b = shownBtns().find(q => onBtn(x, y, q));
      if (!b) {
        const s = hitStudent(x, y);
        if (s) { press.armedS = s; return; }
        armed = null; sfx.softPop(); press.swallow = true; return;
      }
      if (!ARM_IDS.includes(b.id)) armed = null;
    }
    if (story && !shownBtns().some(q => onBtn(x, y, q) && ['help', 'next'].includes(q.id))) { press.story = true; return; }
    for (const b of shownBtns()) if (onBtn(x, y, b)) {
      press.btn = b;
      if (b.id === 'star' && !busy) { drag = { kind: 'star', x, y }; sfx.lift(); }
      if (['star', 'cardGreen', 'cardRed'].includes(b.id)) sayUI(b.id);
      if (b.id === 'cardGreen' && !busy) { drag = { kind: 'star', x, y, card: 'green' }; sfx.lift(); }
      if (b.id === 'cardRed' && !busy) press.redT0 = performance.now(); // held for 0.6 s it comes off (see update())
      return;
    }
    if (choicesShown()) { const r = choiceRects().find(q => inRect(x, y, q)); if (r) { press.choice = r.id; return; } }
    if (SC.curId === 'calendario' && phase === 'class' && !busy && !dayCard) { const f = faceRow().find(q => inRect(x, y, q)); if (f) { press.face = f.s; return; } }
    { const dz = DZ.down(x, y); if (dz) { press.dz = dz; return; } } // the decorate tray + the selected thing's bubbles
    if (phase !== 'class' && phase !== 'activity' && phase !== 'prep') return;
    if (RT.hitSwitch(x, y)) { press.lightSw = true; return; }
    if (!busy && !story) for (const d of desks) {
      if (G.save.deskItems[d.i] && inRect(x, y, { x: d.x + 1, y: d.y - 30, w: 18, h: 16 })) { press.deskItem = d; break; }
    }
    if (press.deskItem) return;
    if (v19Down(x, y)) return;
    if (DZ.on && !busy) { const f = hitFurn(x, y); if (f && f.deco) { press.f = f; return; } } // decorating with the class in: her things come first
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
  function moveR(x, y) {
    if (!press) return;
    press.x = x; press.y = y;
    if (press.rt) { RT.move(x, y); return; }
    if (snackMove(x, y)) return;
    if (press.cchart) { if (centros && centros.drag) { centros.drag.x = x; centros.drag.y = y; if (Math.hypot(x - press.x0, y - press.y0) > 6) centros.drag.moved = true; } return; }
    if (press.dz) { // the decorate tray: swipe to scroll, or pull a thing out into the room
      const r = DZ.move(press.dz, x, y);
      if (Math.hypot(x - press.x0, y - press.y0) > 6) press.moved = true;
      if (!r) return;
      drag = { kind: 'new', type: r.drag.id, desk: r.drag.kind === 'desk', px: x, py: y };
      press.dz = null; DZ.deselect(); sfx.lift(); sayItem(r.drag.id);
    }
    if (!press.moved && Math.hypot(x - press.x0, y - press.y0) > 6) {
      press.moved = true;
      if (press.deskItem) {
        if (DZ.on) DZ.snap();
        const d = press.deskItem, type = G.save.deskItems[d.i];
        delete G.save.deskItems[d.i]; persist();
        drag = { kind: 'new', type, desk: true, from: d.i, px: x, py: y, left: true };
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
    if (drag.kind === 'new') { drag.px = x; drag.py = y; if (y < DZ.top() - 4 || drag.desk) drag.left = true; if (drag.left) DZ.tuck(); }
    if (drag.kind === 'furn' && drag.f.deco && DZ.on) DZ.tuck(); // moving one of her things: the tray gets out of the way
    if (drag.kind === 'furn') {
      const f = drag.f;
      drag.px = x; drag.py = y;
      f.x = x + drag.ox; f.y = y + drag.oy;
      clampItem(f);
    }
    if (drag.kind === 'student') { drag.s.x = x; drag.s.y = y + 16; }
  }
  function upR() {
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
        if (DZ.on && d.from === undefined && !(!d.left && DZ.inTray(d.px, d.py))) DZ.snap(); // (a desk supply moved off a desk was saved when it was lifted)
        if (d.from !== undefined && nearTrash(d.px, d.py)) { trashIt(d.px, d.py); G.save.decorStamp++; persist(); return; }
        if (d.desk) {
          const tgt = deskAt(d.px, d.py + 6);
          if (d.from !== undefined && (!tgt || tgt.i === d.from)) { G.save.deskItems[d.from] = d.type; persist(); sfx.softPop(); return; }
          if (d.from !== undefined && tgt && G.save.deskItems[tgt.i]) G.save.deskItems[d.from] = G.save.deskItems[tgt.i]; // swap
        }
        if (d.desk) { const tgt = deskAt(d.px, d.py + 6); if (tgt) setDeskItem(tgt, d.type); else sfx.softPop(); return; }
        if (!d.left && DZ.inTray(d.px, d.py)) { sfx.softPop(); return; }
        const g = ghostSpot(d); addDecor(d.type, g.x, g.y, { bottom: true });
        return;
      }
      if (d.kind === 'furn') {
        const f = d.f; f.lift = 0;
        if (f.deco && DZ.on) DZ.snap(); // the save still has where it was
        if (f.deco && nearTrash(d.px, d.py)) { DZ.forget(f); delete furn[f.id]; saveDecor(); trashIt(f.x, f.y - sizeOf(f)[1] / 2); return; }
        if (f.deco && DZ.on) DZ.settle(f);
        remember(f); sfx.thump();
        if (f.deco) puffAt(f);
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
      const moveTo = (s, ci) => { centros.assign[s.kind] = ci; sfx.pop(1.2); speak(s, LD.CENTERS[ci].id, 'here'); };
      if (centros.drag) {
        const d = centros.drag; centros.drag = null;
        if (!d.moved) { // a tap on a face picks it up (tap it again to hear it again); then tap a column
          centros.sel = d.s; sfx.pop(1.25);
          speak(d.s, Math.random() < 0.5 ? 'Hi teacher!' : LD.CENTERS[centros.assign[d.s.kind]].id, 'here');
          return;
        }
        centros.sel = null;
        const col = cols.find(cl => x >= cl.x && x <= cl.x + cl.w);
        if (col) moveTo(d.s, col.ci);
        return;
      }
      if (inRect(x, y, chartBack())) { centros = null; sfx.whoosh(); sayUI('back'); return; }
      if (inRect(x, y, start)) { centros.sel = null; runCentros(); return; }
      if (centros.sel) { // tap-then-tap: a column (its picture or anywhere in it) takes the picked face
        const s = centros.sel, col = cols.find(cl => inRect(x, y, { x: cl.x - 1, y: cl.y, w: cl.w + 3, h: cl.h }));
        centros.sel = null;
        if (col) { moveTo(s, col.ci); burst('spark', x, y, 1, ['#ffd23f']); return; }
        sfx.softPop(); return; // a tap anywhere else puts it back
      }
      const col = cols.find(cl => inRect(x, y, { x: cl.x, y: cl.y, w: cl.w, h: 26 }));
      if (col) { sfx.pop(); speak(students[3], LD.CENTERS[col.ci].id, 'here'); return; }
      if (!inRect(x, y, P)) { centros = null; sfx.softPop(); }
      return;
    }
    if (p.sign) { if (!p.moved) tapCentro(p.sign.ci); return; }
    if (p.teach) { if (!p.moved) tapTeacher(); return; }
    if (p.v19) { if (!p.moved) v19Tap(p.v19); return; }
    if (p.dz) { if (!p.moved) DZ.tap(p.dz); return; }
    if (p.moved) return;
    if (DZ.on && !p.btn && DZ.tapRoom(p.f, p.deskItem)) return; // select a placed thing (or let go of it)
    if (p.lightSw) { RT.tapSwitch(); return; }
    if (p.upd) { if (!p.updFired) sfx.tap(); return; } // a grown-up holds it for 1.5 s (see update())
    if (p.mus) { const on = G.save.music === false; hooks.setMusic?.(on); persist(); sfx.pop(on ? 1.3 : 0.8); return; }
    if (p.who) { if (who) tapWho(x, y); return; }
    if (p.whoBtn) { sfx.pop(); who = { t: G.time }; return; }
    if (p.stick) { sfx.pop(); sayUI('stickers'); bookOpen = { page: bookPageOf(G.save.stickers[G.save.stickers.length - 1]), t: G.time }; return; }
    if (p.big && inRect(x, y, L.bigBtn)) { sfx.pop(); hooks.unlock?.(); startDay(); return; }
    if (p.choice) { choose(p.choice); return; }
    if (p.face) { tapStudent(p.face); return; }
    if (p.reward) { if (!reward.collected && G.time - reward.t > 0.6) collectReward(); return; }
    if (p.book) {
      if (L.bookNext && inRect(x, y, L.bookNext)) { sfx.page(); bookOpen.page = (bookOpen.page + 1) % bookPages(); }
      else if ((L.bookCells || []).some(r => inRect(x, y, r))) { const r = L.bookCells.find(r => inRect(x, y, r)); bookOpen.tap = { id: r.id, t: G.time }; sfx.pop(1.2 + Math.random() * 0.5); sfx.sparkle(); }
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
    if (p.btn) {
      sfx.pop();
      const id = p.btn.id;
      if (id === 'help') { hint = null; showHint(true); return; }
      if (id === 'cardRed' && armed && armed.id === 'cardRed') { armed = null; sfx.softPop(); return; } // a quick tap puts it back
      if (id === 'next') { SC.next(); return; } // ▶ siguiente: the bell + the next card on the Horario
      if (id === 'cdone') { sayUI('cdone'); endCentros(); return; }
      if (id === 'toys' && centros && !busy) { rotateCentros(); return; }
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
    if (p.f && p.f.type === 'teacher') { tapTeacher(); return; }
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
      sfx.whoosh();
      if (p.f.type === 'abc') hooks.openLetters(); else hooks.openShapes();
      return;
    }
    if (p.f && p.f.type === 'shelf' && phase === 'class' && !busy && SC.curId !== 'decorar') { sfx.page(); SC.go('lectura'); return; } // story time: Lectura con Maestra
    if (p.f && p.f.deco) { p.f.pop = G.time + 0.25; sfx.pop(1.2); sayItem(p.f.type); burst('spark', p.f.x, p.f.y - sizeOf(p.f)[1] / 2, 4, ['#ffd23f', '#ffffff']); return; } // (decorating: tap to edit)
    if (p.f && p.f.type === 'rug') { cycleVariant(p.f); return; }
    if (p.f && p.f.type === 'plant' && RT.tapPlant(p.f)) return; // the plant helper waters it
    if (p.f && p.f.type === 'jar') { tapJar(); return; }
    if (p.f) { // tap on furniture: a little wobble/sound
      p.f.lift = 2; setTimeout(() => { p.f.lift = 0; }, 120); sfx.tap();
      if (p.f.type === 'shelf') sfx.page();
      return;
    }
    if (p.board && phase === 'prep') { // the board opens once class starts: point at ▶
      sfx.tap(); bellBob = G.time + 1.8; speak(helper(), LD.HINTS.next, 'tap');
      hint = { key: 'next', ...btnPt('next'), t0: G.time, until: G.time + 3 };
      return;
    }
    if (p.board && (phase === 'class') && !busy) {
      sfx.whoosh();
      const now = G.time;
      if (now - lastTap > 0.3) { lastTap = now; hooks.openBoard(L.board, V.s); }
      return;
    }
    if (p.door) { if (guest && guest.stage === 'knock') guestIn(); else if (!answerDoor()) sfx.door(); }
  }

  function watchBoard() { // after a lesson: students react to the new drawing
    DZ.snapArt(hooks.boardCanvas()); // v2.0: and it goes on the art wall
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
    css: (x, y) => [(x + ox) * V.s / G.dpr, y * V.s / G.dpr], overBtn: (x, y) => shownBtns().some(b => onBtn(x, y, b)),
  });

  // hooks for automated screenshot tests
  const css = (x, y) => [(x + ox) * V.s / G.dpr, y * V.s / G.dpr];
  window.__ltDeskPts = () => students.map(s => { const r = spriteRect(s); return css(r.x + 17, r.y + 20); });
  window.__ltBtn = (id) => { const b = btns.find(q => q.id === id); return css(b.x + 13, b.y + 13); };
  window.__ltFurn = (id) => { const f = furn[id]; return css(f.x, f.y - 8); };
  window.__ltBoardPt = () => css(L.board.x + 52, L.board.y + 30);
  window.__ltTray = () => DZ.test(css); // v2.0: { tab, tabs: {themes, wall, floor, desks, colors}, items, ids, bubbles, undo, sel, undoN }
  window.__ltTrayScroll = (i) => DZ.scrollTo(i);
  window.__ltSelect = (id) => { const f = furn[id]; if (f) DZ.tapRoom(f); };
  window.__ltDecoIds = () => Object.values(furn).filter(f => f.deco).map(f => f.id);
  window.__ltDesks = () => desks.map(d => css(d.x, d.y - 18));
  window.__ltFurnPt = (id) => { const f = furn[id]; const [, h] = sizeOf(f); return css(f.x, f.y - h / 2); };
  window.__ltDeskItem = (i) => { const d = desks[i]; return css(d.x + 10, d.y - 22); };
  window.__ltTrash = () => { const r = trashRect(); return css(r.x + 13, r.y + 15); };
  window.__ltAsk = (i) => askQuestion(students[i]);
  window.__ltFeel = (i, m) => { const s = students[i]; s.mood = m; talk(s, MOOD_BUBBLE[m], 9999); helpFeelings(s); };
  window.__ltQuiz = () => { const k = V.s / G.dpr; return quiz.active ? { opts: [0, 1, 2].map(i => { const r = quiz._L?.opts?.[i]; return r ? [(r.x + r.w / 2 + ox) * k, (r.y + r.h / 2) * k] : null; }) } : null; };
  window.__ltQuizQ = () => quiz._Q;
  window.__ltCentros = () => {
    if (!centros) return null; const k = V.s / G.dpr; const lay = centrosLayout();
    const run = centros.stage === 'run';
    const chart = centros.stage === 'chart';
    return { stage: centros.stage, sel: chart && centros.sel ? centros.sel.kind : null, assign: { ...centros.assign },
      faces: chart ? faceRects().map(f => ({ kind: f.s.kind, ci: centros.assign[f.s.kind], at: [(f.x + 13 + ox) * k, (f.y + 13) * k] })) : null,
      cols: chart ? lay.cols.map(cl => [(cl.x + cl.w / 2 + ox) * k, (cl.y + cl.h - 14) * k]) : null,
      start: [(lay.start.x + 18 + ox) * k, (lay.start.y + 16) * k], signs: centerSigns().map(r => [(r.x + r.w / 2 + ox) * k, (r.y + r.h / 2) * k]),
      // v2.1: the teacher's visits
      visited: run ? [...centros.visited] : null, wants: run ? [0, 1, 2, 3].map(centroWants) : null, total: run ? [...centros.total] : null,
      going: run && centros.going ? { ...centros.going } : null, quiz: quiz.active, quizReady: quiz.active && !quiz._Q?.wait, allDone: run && centrosAllDone(), rounds: run ? centros.rounds : 0,
      bellGlow: bellWants(), arrived: run ? students.filter(s => s.center !== undefined).every(s => s.mode === 'stand') : false, teacher: css(furn.teacher.x, furn.teacher.y - 30), teacherWalking: !!teach.go,
      kids: run ? [0, 1, 2, 3].map(ci => { const s = centroKids(ci).find(t => t !== centros.askers[ci]) || centroKids(ci)[0]; if (!s) return null; const r = spriteRect(s); return css(r.x + S.SW / 2, r.y + S.SH - 10); }) : null };
  };
  window.__ltArmed = () => (armed ? armed.id : null);
  window.__ltCardOf = (i) => students[i].card || null;
  window.__ltNaughty = (i) => { students[i].naughty = { until: G.time + 22, next: 0 }; };
  window.__ltHint = () => ({ hint: hint && { ...hint, by: hint.by ? hint.by.kind : null }, lastInput, nextHintAt, time: G.time, phase, busy, story: !!story, reward: !!reward, dayCard: !!dayCard, menu: !!menu, book: !!bookOpen, q: quiz.active });
  window.__ltTeacher = () => css(furn.teacher.x, furn.teacher.y - 30);
  window.__ltWho = () => ({ open: !!who, slot: SLOT, look: G.save.look, V: [V.W, V.H], btn: L.whoBtn && css(L.whoBtn.x + 13, L.whoBtn.y + 13), cards: L.who && L.who.cards.map(r => css(r.x + r.w / 2, r.y + 20)), sw: L.who && L.who.sw.map(r => css(r.x + 11, r.y + 11)), back: L.who && css(L.who.back.x + 13, L.who.back.y + 13) });
  window.__ltJar = () => ({ pt: css(furn.jar.x, furn.jar.y - 18), shown: jarShown, full: jarFull(), flying: jarFly.length, partying, reward: reward && { id: reward.id, party: !!reward.party }, stick: css(stickPos().x + 13, stickPos().y + 13), next: L.bookNext && css(L.bookNext.x + 13, L.bookNext.y + 13), cells: (L.bookCells || []).map(r => css(r.x + r.w / 2, r.y + r.h / 2)) });
  window.__ltTeach = () => ({ act: teach.act && G.time < teach.act.t0 + teach.act.dur ? teach.act.name : null, last: teach.last, pts: [8, 20, 32, 44, 52].map(d => css(furn.teacher.x, furn.teacher.y - d)) });
  window.__ltMenu = () => (menu ? menu.items.map(m => css(m.x + 24, m.y + 24)) : []);
  window.__ltAbc = (ch) => css(abcCardX(LETTERS.indexOf(ch)) + 2, L.abc.y + 5);
  window.__ltUpd = () => (L.updBtn ? css(L.updBtn.x + 11, L.updBtn.y + 11) : null);
  // v1.9 activities
  window.__ltSnack = () => (serve ? { slots: serve.slots.map((sl, i) => { const r = snackLayout().slot(i); return sl.taken ? null : css(r.x + 12, r.y + 12); }), served: serve.served, done: serve.done, armed: !!serve.armed } : null);
  window.__ltDoorPlan = (q, late) => { doorPlanNext = { q, late }; };
  window.__ltKnock = (kind) => { if (!door) planDoor(); door.queue.unshift(kind); door.nextAt = G.time; };
  window.__ltDoor = () => ({ pt: css(L.door.x + L.door.w / 2, L.door.y + 30), door: door && { queue: door.queue, knock: door.knock, late: door.late && door.late.kind }, parcel: parcel && css(parcel.x, parcel.y - 8), ball: rollBall && { state: rollBall.state, pt: css(rollBall.x, rollBall.y - 5 - rollBall.z) } });
  // v2.0 schedule
  window.__ltBig = () => (L.bigBtn ? css(L.bigBtn.x + L.bigBtn.w / 2, L.bigBtn.y + L.bigBtn.h / 2) : null);
  window.__ltStick = () => (L.stickBtn ? css(L.stickBtn.x + 13, L.stickBtn.y + 13) : null);
  window.__ltCard = (id) => { const q = SC.cardPt(id); return q ? [q.x * Vfull.s / G.dpr, q.y * Vfull.s / G.dpr] : null; };
  window.__ltChoice = (id) => { if (!choicesShown()) return null; const r = choiceRects().find(q => q.id === id); return r ? css(r.x + r.w / 2, r.y + r.h / 2) : null; };
  window.__ltRoom = () => ({ W: V.W, H: V.H, ox, s: V.s, floorTop: L.floorTop, wallH: L.wallH, furn: Object.fromEntries(Object.values(furn).map(f => [f.id, [f.x, f.y]])) });
  window.__ltFaces = () => faceRow().map(f => css(f.x + 14, f.y + 14));
  // phone sizes: CSS-px rects of the small targets (art = what's drawn, hit = what a tap hits)
  window.__ltSizes = () => {
    const k = V.s / G.dpr, kf = Vfull.s / G.dpr, r = (q, o = ox, kk = k) => q && { x: Math.round((q.x + o) * kk), y: Math.round(q.y * kk), w: Math.round(q.w * kk), h: Math.round(q.h * kk) };
    const hud = btns.map(b => ({ id: b.id, art: r(b.art ? { x: b.x + (b.w - b.art) / 2, y: b.y + (b.h - b.art) / 2, w: b.art, h: b.art } : b), hit: r(btnHit(b)) }));
    const sched = SC.cardRects().map(c => ({ id: c.id, art: r(c.art, 0, kf), hit: r(c.hit, 0, kf) }));
    const quizO = quiz.active && quiz._L.opts ? quiz._L.opts.map(o => ({ art: r(o), hit: r(o) })) : null;
    return { css: [innerWidth, innerHeight], k, hud, sched, quiz: quizO, choices: choicesShown() ? choiceRects().map(c => ({ id: c.id, hit: r(c) })) : null, tray: DZ.on ? DZ.sizes().map(t => ({ id: t.id, art: r(t.art), hit: r(t.hit) })) : null };
  };
  window.__ltGuest = () => (guest ? { stage: guest.stage } : null);
  window.__ltStory = () => (story ? { stage: story.stage, book: story.book, page: story.page, covers: story.stage === 'choose' ? coverRects().map(r => css(r.x + r.w / 2, r.y + r.h / 2)) : null, book_pt: L.storyBook ? css(L.storyBook.x + L.storyBook.w / 2, L.storyBook.y + L.storyBook.h / 2) : null } : null);

  // ---------------------------------------------------------------- v2.0 the day's blocks (js/schedule.js)
  const activityOn = () => !!(recess || story || centros || serve || guest) || phase === 'activity';
  // an interruption (knock, raised paw, mood, naughty, wandering puppy) is going on
  function interrupting() {
    return quiz.active || !!(door && door.knock) || !!parcel || !!rollBall || (guest && guest.stage === 'knock')
      || students.some(s => s.naughty || s.mood || (acting(s, 'raise') && s.mode === 'seated') || (s.kind === 'puppy' && s.mode === 'stand' && phase === 'class'));
  }
  const quietOK = () => SC.calmNow() && !interrupting();
  async function leaveBlock() {
    if (DZ.on && students.some(s => s.mode !== 'away')) { G.save.decorSeen = G.save.decorStamp; persist(); } // the class watched her decorate: no gasp tomorrow
    armed = null; hint = null; DZ.close(); dayCard = null;
    if (recess) await endRecess();
    if (story) story = null;
    if (guest) { guest = null; doorTarget = 0; }
    if (centros) { centros = null; centrosClear(); }
    if (serve) { serve = null; snackOn = false; for (const s of students) s.snack = null; }
    if (phase === 'activity' || students.some(s => s.mode === 'stand' || s.mode === 'walk')) {
      busy = true; await gatherSeats(); busy = false;
      if (phase === 'activity') phase = 'class';
    }
  }
  async function enterBlock(id) {
    hint = null; armed = null; lastInput = G.time; nextHintAt = G.time + 7; classStart = G.time;
    if (id === 'decorar') { DZ.open(); prepStamp = G.save.decorStamp; prepHintN = 0; return; }
    if (id === 'calendario') return circle();
    if (id === 'recreo') { SC.markUsed(); return recessTime(); }
    if (id === 'lectura') { SC.markUsed(); return storyTime(); }
    if (id === 'centros') { SC.markUsed(); openCentrosChart(); return; }
    if (id === 'almuerzo') { SC.markUsed(); return serveSnack(); }
    if (id === 'lector') { SC.markUsed(); return lectorTime(); }
    if (id === 'casa') return goodbye();
  }
  function blockDone(id) {
    if (id === 'decorar') return G.save.decorStamp !== prepStamp;
    if (id === 'calendario') return students.every(s => s.here || s.mode === 'away');
    if (id === 'casa') return false;
    return SC.used && !activityOn();
  }
  const SC = createSchedule({
    busy: () => busy, locked: () => ['title', 'goodbye', 'reward', 'night'].includes(phase),
    kidsIn: () => students.some(s => s.mode !== 'away'), leave: leaveBlock, arrive, enter: enterBlock, done: blockDone,
    say: (t) => speak(helper(), t, 'tap'), sayUI, askHome: () => { teacherAct('wave', 1.6); speak(helper(), LD.HINTS.homeAsk, 'tap'); },
  });

  // ---------------------------------------------------------------- v2.0 Lector Misterioso: a knock, a surprise guest reads a book
  let guest = null; // { kind, kid, stage: 'knock'|'enter'|'read'|'leave', x, y, n, nextT, bob, tx, ty }
  async function lectorTime() {
    busy = true; phase = 'activity'; calmMoods();
    await gatherSeats();
    const kids = students.filter(s => s.mode !== 'away' && s !== helper());
    const kid = kids.length ? kids[(G.save.day || 1) % kids.length] : students[0];
    guest = { kind: kid.kind, kid, stage: 'knock', x: L.doorPt.x, y: L.doorPt.y + 4, n: 0, nextT: G.time + 1.2, bob: -9 };
    busy = false; lastInput = G.time;
  }
  const guestWalk = (x, y) => new Promise(r => { if (!guest) { r(); return; } guest.tx = x; guest.ty = y; guest.arrive = r; });
  function guestTick(dt) {
    const g = guest; if (!g) return;
    if (g.stage === 'knock' && G.time > g.nextT && !quiz.active) {
      if (g.n >= 3) { guestIn(); return; } // nobody answered: she lets herself in
      g.n++; g.nextT = G.time + 7; g.bob = G.time;
      [0, 0.24, 0.48].forEach(t => wait(t).then(() => { sfx.thump(); burst('spark', L.door.x + L.door.w / 2 + rand(-6, 6), L.door.y + 22 + rand(-6, 6), 2, ['#ffffff', '#ffd23f'], { sp: 25 }); }));
      for (const s of students) if (s.mode === 'seated' && !s.sleep && !(s.hide > 0)) { s.look = -1; act(s, 'look', 1.4); }
      hint = { key: 'door', x: L.door.x + L.door.w / 2, y: L.door.y + 28, t0: G.time, until: G.time + 6 };
      if (g.n === 1) wait(0.8).then(() => speak(helper(), LD.HINTS.door, 'tap'));
    }
    if (g.tx !== undefined) {
      const dx = g.tx - g.x, dy = g.ty - g.y, d = Math.hypot(dx, dy), sp = 42 * dt;
      if (d <= sp) { g.x = g.tx; g.y = g.ty; g.tx = undefined; const r = g.arrive; g.arrive = null; if (r) r(); }
      else { g.x += dx / d * sp; g.y += dy / d * sp; }
    }
    if (g.stage === 'read' && !story) { // the book is finished: she waves goodbye and leaves
      g.stage = 'leave'; doorTarget = 1; sfx.door(); g.talkT = G.time + 1.2;
      guestWalk(L.doorPt.x + 4, L.doorPt.y + 10).then(() => guestWalk(L.doorPt.x, L.doorPt.y - 2)).then(() => { if (guest === g) { guest = null; doorTarget = 0; sfx.door(); } });
    }
  }
  async function guestIn() {
    const g = guest; if (!g || g.stage !== 'knock') return;
    g.stage = 'enter'; hint = null; busy = true;
    doorTarget = 1; sfx.door();
    for (const s of awake()) act(s, 'gasp', 0.9);
    sfx.ooh(1.2);
    await wait(0.4);
    const rug = furn.rug, spots = rugSpots(students.length, rug.x - 6), gx = Math.max(...spots.map(q => q.x)) + 30;
    students.forEach((s, k) => { // everyone sits on the rug
      if (s.mode === 'away') return;
      if (s.mode === 'seated') { Object.assign(s, seat(s)); s.mode = 'stand'; }
      walkTo(s, spots[k].x, spots[k].y, 50);
    });
    await guestWalk(L.doorPt.x + 6, L.doorPt.y + 12);
    await guestWalk(clamp(gx, 20, V.W - 20), clamp(Math.max(...spots.map(q => q.y)) - 4, L.floorTop + 30, V.H - 4)); // beside the class
    if (guest !== g) { busy = false; return; }
    doorTarget = 0; sfx.door();
    g.talkT = G.time + 2.4; speak({ kind: 'guest' }, LD.MYSTERY_LINES.guest, 'here');
    await wait(2.6);
    if (guest !== g) { busy = false; return; }
    if (g.kid.mode !== 'away') { act(g.kid, 'cheer', 1.4); hop(g.kid, 80); speak(g.kid, LD.MYSTERY_LINES.kid, 'yay'); burst('heart', ...headPos(g.kid), 6, ['#ff6f91', '#ff9ec4'], { up: true, sp: 45 }); }
    await wait(1.8);
    if (guest !== g) { busy = false; return; }
    for (const s of students) s.look = 0;
    const k = (dayIndex() + 1) % BOOKS.length;
    story = { stage: 'read', book: k, def: k, page: -1, t: G.time, flipT: G.time, reader: { kind: 'guest' } };
    g.stage = 'read'; sfx.page(); sfx.sparkle();
    const st = story;
    wait(0.4).then(() => { if (story === st && st.page < 0) { g.talkT = G.time + 1.5; speak(st.reader, LD.BOOK_TEXT[k].title, 'yay'); } });
    busy = false; lastInput = G.time;
  }
  function drawGuest(c) {
    const g = guest; if (!g) return;
    const walking = g.tx !== undefined, talking = G.time < (g.talkT || 0);
    const st = { eyes: Math.floor(G.time * 1.3) % 5 === 0 ? 'blink' : 'happy', mouth: talking && Math.floor(G.time * 6) % 2 ? 'open' : 'smile', armL: g.stage === 'leave' ? (Math.floor(G.time * 4) % 2 ? 'wave1' : 'wave2') : 'down', armR: 'down', feet: walking ? Math.floor(G.time * 8) % 2 : 0, look: 0, blush: true, hide: 0, wag: false, earUp: false, tongue: false };
    const img = S.student(g.kind, st), w = Math.round(img.width * 1.5), h = Math.round(img.height * 1.5);
    const hopY = walking ? Math.round(Math.abs(Math.sin(G.time * 9)) * 2) : 0;
    shadow(c, g.x, g.y, 24);
    c.drawImage(img, Math.round(g.x - w / 2), Math.round(g.y - h - hopY), w, h);
    // a flowery sun hat and the book under her arm: a grown-up visitor
    D(c, cached('guesthat', () => { const p = new Pix(24, 8); p.ell(12, 6, 11.5, 1.6, '#f5d27a'); p.ell(12, 3.5, 6, 3.5, '#f5d27a', { y1: 5 }); p.hline(6, 18, 5, '#e0559a'); p.ball(16, 4, 1.4, 1.4, '#ff9ec4', { hi: false }); p.outline(); return p.canvas(); }), g.x - w / 2 + ((S.CROWN_AT[g.kind] || [12, 4])[0] + 3.5) * 1.5 - 12, g.y - h + (S.CROWN_AT[g.kind] || [12, 4])[1] * 1.5 - 3 - hopY);
    if (g.stage !== 'read') D(c, S.ICONS.book(), g.x + 6, g.y - h * 0.55 - hopY);
  }

  return {
    resize, update, render, down, move, up, startDay, watchBoard, startle: () => students.forEach(startle),
    get view() { return Vfull; }, get phase() { return phase; },
    boardAt: () => ({ x: ox + L.board.x + 4, y: L.board.y + 4 }), // where the wall board's drawing sits (zoom transition)
    get musicTrack() { return G.time < danceUntil ? 'recess' : ['goodbye', 'reward', 'night'].includes(phase) ? 'night' : recess ? 'recess' : 'class'; },
  };
}
