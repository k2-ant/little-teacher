// v1.9 daily rituals: the weather at circle time and the class jobs chart ("Ayudantes").
// classroom.js creates one with createRituals(ctx) and calls into it from a few small hooks.
import { G, wait, persist, rand, pick, clamp } from './state.js';
import { Pix, cached, darken, lighten, mix } from './raster.js';
import * as S from './sprites.js';
import { sfx } from './audio.js';
import { act, hop, talk, speak, walkTo } from './students.js';
import * as LD from './learndata.js';
import { drawHand, sayHint } from './hints.js';

// the new spoken button name + hints join the shared tables (sayUI / showHint read them)
Object.assign(LD.UI_WORDS, LD.RITUAL_UI);
Object.assign(LD.HINTS, LD.RITUAL_HINTS);

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const D = (c, img, x, y) => c.drawImage(img, Math.round(x), Math.round(y));
const INK = S.INK;
const today = () => G.save.day || 1;

// ------------------------------------------------------------------ pictures
const WCARD = { sol: '#fff2b8', nubes: '#e6edf4', lluvia: '#d6eaff', nieve: '#e8f4ff' };
/** big weather pictures for the picker (30x30, drawn at 2x) */
export function weatherPic(id) {
  return cached('wpic' + id, () => {
    const p = new Pix(30, 30);
    if (id === 'sol') {
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        for (let r = 10.5; r < 14.5; r += 0.5) { const x = 15 + Math.cos(a) * r, y = 15 + Math.sin(a) * r; p.px(x, y, '#ffb020'); p.px(x + 0.6, y + 0.6, '#ffb020'); }
      }
      p.ball(15, 15, 8.6, 8.6, '#ffd23f', { shadow: '#f5b800', hi: '#fff3a8' });
      p.rect(12, 13, 1, 2, INK); p.rect(18, 13, 1, 2, INK);
      p.px(11, 17, '#ff9a9a'); p.px(20, 17, '#ff9a9a');
      p.px(12, 18, INK); p.hline(13, 17, 19, INK); p.px(18, 18, INK);
    }
    if (id === 'nubes') {
      const g = '#b9c6d4';
      p.ball(19, 9, 6, 5, g, { hi: false }); p.ball(25, 12, 4, 3.6, g, { hi: false }); p.ball(13, 11, 4, 3.6, g, { hi: false });
      const w = '#ffffff', sh = '#d6e0ea';
      p.ball(8, 21, 6, 5, w, { shadow: sh, hi: false }); p.ball(15, 17, 7.5, 7, w, { shadow: sh, hi: false }); p.ball(23, 21, 5.5, 4.6, w, { shadow: sh, hi: false });
      p.rect(4, 21, 23, 4, w); p.hline(4, 26, 25, sh);
    }
    if (id === 'lluvia') {
      const g = '#8fa2b8', sh = '#6f8299';
      p.ball(8, 12, 5.5, 4.6, g, { shadow: sh, hi: false }); p.ball(15, 8, 7, 6.4, g, { shadow: sh, hi: false }); p.ball(22, 12, 5.5, 4.6, g, { shadow: sh, hi: false });
      p.rect(4, 12, 23, 5, g); p.hline(4, 26, 17, sh);
      for (const [x, y] of [[7, 21], [15, 24], [23, 21], [11, 27], [19, 28]]) {
        p.px(x, y - 3, '#2f7de1'); p.rect(x - 0.5, y - 2, 2, 1, '#2f7de1'); p.ell(x + 0.5, y + 0.5, 1.8, 2, '#2f7de1'); p.px(x, y - 1, '#9fd0ff');
      }
    }
    if (id === 'nieve') { // a snowman with a scarf in falling snow
      const w = '#ffffff', sh = '#cfdeee';
      p.ball(15, 22, 7.5, 6.6, w, { shadow: sh, hi: false }); p.ball(15, 11, 5.6, 5.2, w, { shadow: sh, hi: false });
      p.rect(10, 4, 10, 2, INK); p.rect(12, 0, 6, 5, INK); p.hline(12, 17, 3, '#ef4b4b');
      p.px(13, 10, INK); p.px(17, 10, INK); p.hline(15, 18, 12, '#ff9a2e'); p.px(15, 13, '#ff9a2e');
      p.rect(10, 15, 11, 2, '#ef4b4b'); p.rect(18, 16, 2, 5, '#ef4b4b'); p.px(12, 15, '#ff9a9a');
      p.px(15, 20, INK); p.px(15, 23, INK);
      for (const [x, y] of [[3, 6], [26, 5], [4, 17], [26, 18], [2, 27], [27, 27]]) { p.px(x, y, '#7ec8ff'); p.px(x - 1, y, '#7ec8ff'); p.px(x + 1, y, '#7ec8ff'); p.px(x, y - 1, '#7ec8ff'); p.px(x, y + 1, '#7ec8ff'); }
    }
    p.outline();
    return p.canvas();
  });
}
/** small weather badge for the wall calendar */
export function weatherBadge(id) {
  return cached('wbadge' + id, () => {
    const p = new Pix(12, 12);
    p.ell(6, 6, 6, 6, '#ffffff');
    if (id === 'sol') { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; p.px(6 + Math.cos(a) * 4.6 - 0.5, 6 + Math.sin(a) * 4.6 - 0.5, '#ffb020'); } p.ball(6, 6, 3, 3, '#ffd23f', { hi: false }); }
    if (id === 'nubes') { p.ball(4.5, 7, 2.6, 2.2, '#9aaabb', { hi: false }); p.ball(7.5, 5.6, 3, 2.8, '#9aaabb', { hi: false }); p.rect(2, 7, 8, 2, '#9aaabb'); }
    if (id === 'lluvia') { p.ball(4.5, 4.6, 2.4, 2, '#8fa2b8', { hi: false }); p.ball(7.5, 4, 2.6, 2.4, '#8fa2b8', { hi: false }); p.rect(2, 4, 8, 2, '#8fa2b8'); for (const x of [3, 6, 9]) { p.px(x, 8, '#2f7de1'); p.px(x - 1, 9, '#2f7de1'); } }
    if (id === 'nieve') { const b = '#4f97d6'; p.hline(2, 9, 6, b); p.vline(6, 2, 9, b); p.line(3, 3, 9, 9, b); p.line(9, 3, 3, 9, b); p.px(6, 6, '#ffffff'); }
    p.outline('#5a3e5e', 0.6);
    return p.canvas();
  });
}
const JOB_COL = ['#ef6f6c', '#ffd23f', '#64a8e8', '#7dd370', '#c9b8e8'];
/** 18x18 job pictures: flag (line leader), light bulb, calendar, watering can, pillow */
export function jobIcon(i) {
  return cached('jobicon' + i, () => {
    const p = new Pix(18, 18);
    if (i === 0) { // line leader: a flag at the front of the line
      p.rect(3, 1, 2, 16, '#a8703f'); p.px(3, 1, '#c98c55');
      for (let y = 0; y < 9; y++) p.hline(5, 5 + Math.round(10 - Math.abs(y - 4) * 2.4), 2 + y, y < 3 ? '#ff8f8f' : '#ef4b4b');
      p.px(8, 6, '#ffd23f'); p.px(9, 6, '#ffd23f'); p.px(8, 5, '#ffd23f'); p.px(8, 7, '#ffd23f'); p.px(7, 6, '#ffd23f');
      p.rect(1, 16, 6, 1, '#7a5b6a');
    }
    if (i === 1) { // light bulb
      for (const [x, y] of [[1, 6], [16, 6], [3, 1], [14, 1], [8.5, -0.2]]) p.px(x, y, '#ffb020');
      p.ball(9, 7, 5.6, 5.6, '#ffe066', { hi: '#fffbe0' });
      p.rect(7, 12, 4, 1, '#ffe066'); p.rect(6, 13, 6, 4, '#9aa7b8'); p.hline(6, 11, 14, '#c9d3df'); p.hline(6, 11, 16, '#7d899c');
      p.px(8, 8, '#ffb020'); p.px(9, 9, '#ffb020'); p.px(10, 8, '#ffb020');
    }
    if (i === 2) { // calendar page
      p.rect(1, 3, 16, 14, '#fffaf0'); p.rect(1, 3, 16, 4, '#ef6f6c'); p.hline(1, 16, 3, '#ff9a9a');
      for (const x of [4, 12]) p.rect(x, 1, 2, 4, '#9aa7b8');
      for (let r = 0; r < 2; r++) for (let q = 0; q < 4; q++) p.rect(3 + q * 3.5, 9 + r * 4, 2, 2, r === 0 && q === 1 ? '#3cb44b' : '#c9b8a8');
    }
    if (i === 3) { // watering can with drops
      p.rect(2, 8, 9, 8, '#64a8e8'); p.hline(2, 10, 8, '#9fd0ff');
      p.line(10, 12, 15, 6, '#4f97d6'); p.line(10, 13, 15, 7, '#4f97d6'); p.rect(14, 5, 3, 2, '#4f97d6');
      for (let a = 0; a < 7; a++) p.px(6.5 + Math.cos(Math.PI + a * 0.5) * 4, 8 + Math.sin(Math.PI + a * 0.5) * 4, '#4f97d6');
      p.px(16, 9, '#7ec8ff'); p.px(17, 12, '#7ec8ff'); p.px(15, 12, '#7ec8ff'); p.px(16, 15, '#7ec8ff');
    }
    if (i === 4) { // resting: a pillow and zzz
      p.ball(9, 13.5, 8, 3.8, '#c9a2ff'); p.ell(8, 12.5, 5, 1.8, '#dcc4ff', null, true);
      p.ball(12, 4.5, 4, 4, '#ffe066', { hi: false }); p.ell(14, 3, 3.2, 3.2, 0); // sleepy moon
      p.map(2, 1, ['###', '..#', '.#.', '###'], { '#': '#4f6fc8' });
    }
    p.outline();
    return p.canvas();
  });
}
/** the HUD button: a little helpers' chart (light bulb + plant jobs, with two faces) */
export function jobsButtonIcon() {
  return cached('jobsbtn', () => {
    const p = new Pix(18, 18);
    p.rect(0, 0, 18, 18, '#c95f4a'); p.rect(1, 1, 16, 16, '#fff4e0');
    p.rect(1, 1, 8, 8, '#ffd23f'); p.rect(9, 1, 8, 8, '#7dd370'); // job tiles: light bulb + watering can
    p.ell(5, 4, 2.4, 2.4, '#fffbe0'); p.rect(4, 6, 3, 2, '#7d899c');
    p.rect(10, 4, 4, 4, '#2f7de1'); p.line(13, 6, 16, 3, '#2f7de1'); p.px(16, 5, '#ffffff'); p.px(15, 7, '#ffffff');
    for (const [x, c] of [[5, '#f6c08a'], [13, '#8fd067']]) { p.ell(x, 13, 3, 2.8, c); p.px(x - 1, 12, INK); p.px(x + 1, 12, INK); p.hline(x - 1, x + 1, 14, INK); }
    p.outline();
    return p.canvas();
  });
}
function bubbleBall() {
  return cached('rtbubble', () => {
    const p = new Pix(14, 14);
    p.ell(7, 7, 6.6, 6.6, '#9fd8ff'); p.ell(7, 7, 5.4, 5.4, '#e6f6ff');
    p.ell(7.5, 7.5, 4, 4, '#f4fbff'); p.rect(4, 4, 2, 2, '#ffffff'); p.px(9, 10, '#ffd6f0'); p.px(10, 9, '#d6ffe6');
    p.outline('#4f86b8', 0.4);
    return p.canvas();
  });
}
function smallBubble() {
  return cached('rtbubble2', () => {
    const p = new Pix(9, 9);
    p.ell(4.5, 4.5, 4.3, 4.3, '#9fd8ff'); p.ell(4.5, 4.5, 3.2, 3.2, '#eef9ff'); p.rect(2, 2, 2, 1, '#ffffff'); p.px(6, 6, '#ffd6f0');
    p.outline('#4f86b8', 0.4);
    return p.canvas();
  });
}
function flower(col) {
  return cached('rtflower' + col, () => {
    const p = new Pix(7, 7);
    for (const [x, y] of [[3, 1], [1, 3], [5, 3], [3, 5]]) p.ell(x + 0.5, y + 0.5, 1.6, 1.6, col);
    p.px(3, 3, '#ffd23f');
    p.outline();
    return p.canvas();
  });
}
function wateringCan() {
  return cached('rtcan', () => {
    const p = new Pix(12, 10);
    p.rect(1, 3, 6, 6, '#64a8e8'); p.hline(1, 6, 3, '#9fd0ff'); p.line(6, 6, 10, 2, '#4f97d6'); p.rect(9, 1, 3, 2, '#4f97d6');
    p.outline(); return p.canvas();
  });
}
function scarf(kind) {
  return cached('rtscarf' + kind, () => {
    const p = new Pix(22, 9);
    const c = { bunny: '#ef4b4b', puppy: '#64a8e8', turtle: '#ffd23f', owl: '#b48be6', frog: '#ff8fb8' }[kind];
    p.rect(1, 0, 20, 3, c); for (let x = 2; x < 21; x += 3) p.vline(x, 0, 2, lighten(c, 0.4));
    p.rect(14, 2, 3, 6, c); p.hline(14, 16, 8, darken(c, 0.2)); p.px(15, 4, lighten(c, 0.4));
    p.outline(); return p.canvas();
  });
}
function leaderFlag() {
  return cached('rtflag', () => {
    const p = new Pix(10, 14);
    p.vline(1, 0, 13, '#a8703f');
    for (let y = 0; y < 7; y++) p.hline(2, 2 + Math.round(7 - Math.abs(y - 3) * 2.2), 1 + y, '#ef4b4b');
    p.px(4, 4, '#ffd23f');
    p.outline(); return p.canvas();
  });
}

// ------------------------------------------------------------------ the rituals
export function createRituals(ctx) {
  const { students } = ctx;
  const owl = () => students[3];
  let picker = null; // { t0, idle, chosen, ct, resolve }
  let chart = null; // { drag: {s, x, y} }
  let lightsOff = false, lightBusy = false, plantBusy = false;
  let watering = null; // { s, until }
  let jobsHintDay = 0, bubbleT = 0;
  const bubbles = []; // rainy recess: soap bubbles rising from the rug (tap to pop)

  // ---------------------------------------------------------------- state
  const weather = () => (G.save.weather && G.save.weather.day === today() && LD.WEATHER.some(w => w.id === G.save.weather.w) ? G.save.weather.w : null);
  function jobs() {
    const kinds = students.map(s => s.kind), n = LD.JOBS.length;
    let J = G.save.jobs;
    const ok = J && kinds.every(k => Number.isInteger(J.assign[k]) && J.assign[k] >= 0 && J.assign[k] < n) && new Set(kinds.map(k => J.assign[k])).size === kinds.length;
    if (!ok) { J = G.save.jobs = { day: today(), assign: Object.fromEntries(kinds.map((k, i) => [k, (i + today() - 1) % n])), watered: 0 }; persist(); }
    else if (J.day !== today()) { // a new school day: everyone moves to the next job
      const step = today() > J.day ? today() - J.day : 1;
      for (const k of kinds) J.assign[k] = (J.assign[k] + step) % n;
      J.day = today(); persist();
    }
    return J;
  }
  const holder = (id) => { const ji = LD.JOBS.findIndex(j => j.id === id), J = jobs(); return students.find(s => J.assign[s.kind] === ji) || null; };
  const ready = (s) => s && s.mode === 'seated' && s.here && !ctx.busy() && ctx.phase() === 'class';
  const wake = (s) => { if (s.sleep) { s.sleep = false; s.sleepT = rand(25, 45); } if (s.hide > 0) { s.hide = 0; s.hideT = rand(30, 50); } };
  const watered = () => jobs().watered === today();

  // ---------------------------------------------------------------- weather at circle time
  function pickLayout() {
    const V = ctx.V(), n = LD.WEATHER.length;
    const cw = Math.min(70, Math.floor((V.W - 24) / n) - 6), ch = cw + 6, gap = 8;
    const x0 = Math.round(V.W / 2 - (n * cw + (n - 1) * gap) / 2), y0 = Math.round(V.H * 0.55 - ch / 2);
    return LD.WEATHER.map((w, i) => ({ i, id: w.id, x: x0 + i * (cw + gap), y: y0, w: cw, h: ch }));
  }
  /** morning: she picks today's weather (once per school day); resolves when the class has said it */
  async function morningWeather() {
    if (weather()) { // already chosen today (e.g. the app was reopened): just remind everyone
      speak(owl(), LD.WEATHER.find(w => w.id === weather()).line, 'here');
      await wait(1.6);
      return;
    }
    const L = ctx.L();
    ctx.pointAt(L.win.x + L.win.w / 2);
    sfx.chime();
    speak(owl(), LD.WEATHER_ASK, 'here');
    await new Promise(res => { picker = { t0: G.time, idle: G.time, chosen: -1, resolve: res }; });
  }
  async function choose(i) {
    const w = LD.WEATHER[i], cards = pickLayout(), cd = cards[i];
    picker.chosen = i; picker.ct = G.time;
    G.save.weather = { day: today(), w: w.id }; persist();
    sfx.pop(1.2); ctx.burst('spark', cd.x + cd.w / 2, cd.y + cd.h / 2, 12, ['#ffd23f', '#ffffff', '#7ec8ff'], { sp: 70 });
    await wait(0.75);
    ctx.redrawBg(); sfx.chime();
    const L = ctx.L();
    ctx.burst('spark', L.win.x + L.win.w / 2, L.win.y + L.win.h / 2, 10, ['#ffffff', '#ffd23f', '#bfe6ff'], { sp: 50 });
    ctx.teacherAct('point', 1.6);
    speak(owl(), w.line, 'yay');
    await wait(1.7);
    const echo = students.filter(s => s.mode === 'seated' && s.kind !== 'owl');
    for (const s of echo) { wake(s); }
    echo.forEach((s, k) => wait(k * 0.45).then(() => { act(s, 'cheer', 1); hop(s, 60); speak(s, w.word, 'yay'); }));
    await wait(echo.length * 0.45 + 0.9);
    const r = picker.resolve; picker = null; r();
  }
  function drawPicker(c) {
    const V = ctx.V(), { W, H } = V, k = picker.chosen >= 0 ? Math.min(1, (G.time - picker.ct) / 0.7) : 0;
    if (k >= 1) return;
    c.fillStyle = `rgba(40,30,60,${0.45 * (1 - k)})`; c.fillRect(0, 0, W, H);
    const L = ctx.L();
    for (const cd of pickLayout()) {
      let { x, y, w, h } = cd;
      if (picker.chosen >= 0) {
        if (cd.i !== picker.chosen) continue;
        const tx = L.win.x + L.win.w / 2, ty = L.win.y + L.win.h / 2, e = k * k;
        const s = 1 - 0.6 * e; w = cd.w * s; h = cd.h * s;
        x = cd.x + cd.w / 2 + (tx - cd.x - cd.w / 2) * e - w / 2; y = cd.y + cd.h / 2 + (ty - cd.y - cd.h / 2) * e - h / 2;
      } else y += Math.round(Math.sin(G.time * 3 + cd.i * 1.3) * 2);
      const cv = cached('wcard' + cd.id + cd.w + 'x' + cd.h, () => {
        const q = document.createElement('canvas'); q.width = cd.w; q.height = cd.h;
        const x2 = q.getContext('2d'); x2.imageSmoothingEnabled = false;
        R(x2, 1, 0, cd.w - 2, cd.h, darken(WCARD[cd.id], 0.45)); R(x2, 0, 1, cd.w, cd.h - 2, darken(WCARD[cd.id], 0.45));
        R(x2, 1, 1, cd.w - 2, cd.h - 3, WCARD[cd.id]); R(x2, 2, 1, cd.w - 4, 1, lighten(WCARD[cd.id], 0.6));
        const pic = weatherPic(cd.id), sz = Math.min(60, cd.w - 6);
        x2.drawImage(pic, Math.round((cd.w - sz) / 2), Math.round((cd.h - sz) / 2) - 1, sz, sz);
        return q;
      });
      c.drawImage(cv, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    if (picker.chosen < 0 && G.time - picker.idle > 8) { // gentle help: the hand visits each picture
      const cards = pickLayout(), cd = cards[Math.floor((G.time - picker.idle) / 1.6) % cards.length];
      drawHand(c, cd.x + cd.w / 2, cd.y + cd.h - 14);
      sayHint(owl(), 'weather');
    }
  }

  // ---------------------------------------------------------------- window, sun patch, calendar badge
  const SKY = { nubes: ['#aebfcf', '#cbd7e2'], lluvia: ['#7f90a6', '#9daec0'], nieve: ['#c3d1df', '#dde7f0'] };
  function cloud(c, x, y, s, col, shade) {
    R(c, x, y, 14 * s, 4 * s, col); R(c, x + 3 * s, y - 3 * s, 7 * s, 3 * s, col); R(c, x + 8 * s, y - 2 * s, 4 * s, 2 * s, col);
    R(c, x + 1 * s, y + 4 * s, 12 * s, 1, shade);
  }
  /** draws the sky for cloudy / rainy / snowy days; returns false on sunny days (the normal sun is drawn) */
  function windowSky(c, w, sky) {
    const wt = weather();
    if (!wt || wt === 'sol') return false;
    let [s0, s1] = SKY[wt];
    if (sky === 'sunset') { s0 = mix(s0, '#ff9f7a', 0.35); s1 = mix(s1, '#ffd29a', 0.35); }
    for (let y = 0; y < w.h; y++) R(c, w.x, w.y + y, w.w, 1, y < w.h * 0.55 ? s0 : s1);
    const t = G.time;
    c.save(); c.beginPath(); c.rect(w.x, w.y, w.w, w.h); c.clip();
    const dark = wt === 'lluvia', col = dark ? '#6f7f94' : wt === 'nieve' ? '#eef3f8' : '#e4eaf0', sh = dark ? '#5c6b80' : '#b9c6d4';
    const n = wt === 'nieve' ? 2 : 3, span = w.w + 44;
    for (let k = 0; k < n; k++) { // big clouds, evenly spaced, drifting slowly
      const cx = w.x + ((t * 1.6 + k * span / n) % span) - 30, cy = w.y + [7, 16, 11][k];
      cloud(c, cx, cy, k === 1 ? 1.5 : 2, k === 1 && !dark ? '#ffffff' : col, sh);
    }
    c.restore();
    return true;
  }
  /** rain / snow in front of the hills (all day and night) */
  function windowFront(c, w) {
    const wt = weather(), t = G.time;
    if (wt !== 'lluvia' && wt !== 'nieve') return;
    c.save(); c.beginPath(); c.rect(w.x, w.y, w.w, w.h); c.clip();
    if (wt === 'lluvia') {
      for (let k = 0; k < 16; k++) {
        const x = w.x + ((k * 13.7 + t * 18) % (w.w + 8)) - 4, y = w.y + ((k * 23.3 + t * 80) % (w.h + 6)) - 4;
        R(c, x, y, 1, 2, '#e6f4ff'); R(c, x - 1, y + 2, 1, 2, '#bfe0f8');
      }
      for (let k = 0; k < 3; k++) { const x = w.x + 8 + k * 15, f = Math.floor(t * 3 + k) % 4; if (f < 2) R(c, x - f, w.y + w.h - 3, 1 + f * 2, 1, '#cfe8ff'); }
    } else {
      R(c, w.x, w.y + w.h - 8, w.w, 3, '#f4f8ff'); R(c, w.x, w.y + w.h - 5, w.w, 1, '#dce8f4');
      R(c, w.x + 6, w.y + w.h - 18, 9, 2, '#ffffff');
      for (let k = 0; k < 18; k++) {
        const x = w.x + ((k * 11.3 + Math.sin(t * 1.5 + k) * 2) % w.w), y = w.y + ((k * 17.9 + t * 9) % (w.h + 2)) - 1;
        R(c, x, y, k % 3 ? 1 : 2, k % 3 ? 1 : 2, '#ffffff');
      }
    }
    c.restore();
  }
  const sunPatch = () => { const wt = weather(); return !wt || wt === 'sol' ? 0.22 : wt === 'nubes' ? 0.1 : 0.06; };
  function calBadge(c, x, y) {
    const wt = weather(); if (!wt) return;
    D(c, weatherBadge(wt), x, y);
  }

  // ---------------------------------------------------------------- light switch (by the door)
  function switchRect() { const L = ctx.L(), V = ctx.V(); return { x: Math.max(V.inset.l + 1, L.door.x - 11), y: L.door.y + 14, w: 8, h: 12 }; }
  function drawSwitch(c) {
    const r = switchRect();
    R(c, r.x - 1, r.y - 1, r.w + 2, r.h + 2, '#c9b8a0'); R(c, r.x, r.y, r.w, r.h, '#fffaf0'); R(c, r.x, r.y + r.h - 1, r.w, 1, '#e6dccb');
    R(c, r.x + 3, r.y + 2, 2, 8, '#d8cbb8');
    const bulb = cached('rtswbulb' + lightsOff, () => { const p = new Pix(7, 8); p.ball(3.5, 3, 3, 3, lightsOff ? '#c9c2b8' : '#ffe066', { hi: false }); p.rect(2, 5, 3, 2, '#9aa7b8'); p.outline(); return p.canvas(); });
    D(c, bulb, r.x + 0.5, r.y - 10); // a little light bulb says what the switch does
    if (lightsOff) { R(c, r.x + 2, r.y + 6, 4, 4, '#9aa7b8'); R(c, r.x + 2, r.y + 9, 4, 1, '#7d899c'); }
    else { R(c, r.x + 2, r.y + 2, 4, 4, '#ffd23f'); R(c, r.x + 2, r.y + 2, 4, 1, '#fff3a8'); }
  }
  function hitSwitch(x, y) { const r = switchRect(); return x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 6 && y <= r.y + r.h + 6; }
  function toggleLights(s) {
    lightsOff = !lightsOff;
    ctx.setDusk(lightsOff ? 0.55 : 0);
    sfx.tap(); setTimeout(() => sfx.softPop(), 60);
    const r = switchRect();
    ctx.burst('spark', r.x + 4, r.y + 2, 5, lightsOff ? ['#bfc8ff', '#ffffff'] : ['#ffd23f', '#fff6b8'], { sp: 35 });
    if (s) speak(s, lightsOff ? LD.JOB_LINES.lightsOff : LD.JOB_LINES.lightsOn, 'yay');
    if (lightsOff) wait(0.4).then(() => { for (const t of ctx.awake()) if (t !== s && t.mode === 'seated' && !t.act) act(t, 'gasp', 0.9); sfx.ooh(1.2); });
  }
  function tapSwitch() {
    if (lightBusy) return;
    const s = holder('luces');
    if (!ready(s)) { toggleLights(null); ctx.pointAt(switchRect().x); return; }
    lightBusy = true; wake(s);
    const L = ctx.L(), V = ctx.V(), r = switchRect();
    Object.assign(s, ctx.seat(s)); s.mode = 'stand'; hop(s, 60); talk(s, 'heart', 1);
    walkTo(s, clamp(r.x + 10, 14, V.W - 14), L.floorTop + 6, 70).then(async () => {
      s.look = -1; act(s, 'raise', 1.2); await wait(0.4);
      toggleLights(s);
      await wait(1.1);
      lightBusy = false;
      if (s.mode === 'stand' && ctx.phase() === 'class') ctx.sendToSeat(s);
    });
  }

  // ---------------------------------------------------------------- the plant helper
  function drawPlantExtra(c, f, lift) {
    if (watered()) {
      const cols = ['#ff6f91', '#ffd23f', '#b48be6'];
      [[8, 9], [20, 7], [14, 3]].forEach(([x, y], k) => D(c, flower(cols[k]), f.x - 14 + x - 3, f.y - 38 - lift + y - 3 + Math.round(Math.sin(G.time * 2 + k) * 0.6)));
    }
    if (watering && G.time < watering.until && Math.random() < 0.5) {
      ctx.burst('bubble', f.x + rand(-8, 8), f.y - 30, 1, ['#7ec8ff'], { up: false, sp: 8, g: 90, life: 0.5 });
    }
  }
  function tapPlant(f) {
    if (plantBusy || ctx.phase() !== 'class' || ctx.busy()) return false;
    if (watered()) { ctx.burst('spark', f.x, f.y - 30, 5, ['#ff6f91', '#ffd23f']); sfx.sparkle(); return true; }
    const s = holder('plantas');
    const V = ctx.V(), L = ctx.L();
    const finish = (who) => {
      jobs().watered = today(); persist();
      sfx.chime(); ctx.burst('star', f.x, f.y - 34, 8, ['#ff6f91', '#ffd23f', '#7dd370'], { up: true });
      if (who) { act(who, 'cheer', 1.2); hop(who, 70); speak(who, LD.JOB_LINES.water, 'yay'); }
      for (const t of ctx.awake()) if (t !== who && t.mode === 'seated' && !t.act) act(t, 'clap', 1.2);
      ctx.teacherAct('clap', 1.2);
    };
    if (!ready(s)) { // nobody free to help: Louise waters it herself
      watering = { s: null, until: G.time + 1.2 }; sfx.whoosh();
      wait(1.2).then(() => finish(null));
      return true;
    }
    plantBusy = true; wake(s);
    Object.assign(s, ctx.seat(s)); s.mode = 'stand'; hop(s, 60); talk(s, 'heart', 1);
    const side = f.x > V.W / 2 ? -1 : 1;
    walkTo(s, clamp(f.x + side * 18, 14, V.W - 14), clamp(f.y + 5, L.floorTop + 12, V.H - 3), 60).then(async () => {
      s.look = -side; act(s, 'raise', 1.6);
      watering = { s, until: G.time + 1.4, side }; sfx.whoosh();
      await wait(1.4);
      finish(s);
      await wait(1.4);
      plantBusy = false; watering = null;
      if (s.mode === 'stand' && ctx.phase() === 'class') ctx.sendToSeat(s);
    });
    return true;
  }

  // ---------------------------------------------------------------- line leader (goodbye)
  function lineOrder() { const l = holder('lider'); return l ? [l, ...students.filter(s => s !== l)] : students.slice(); }
  async function leaderGo() {
    const l = holder('lider'); if (!l) return;
    act(l, 'cheer', 1.2); hop(l, 80); talk(l, 'star', 1.6);
    speak(l, LD.JOB_LINES.follow, 'yay');
    await wait(1.2);
  }
  function calSpeaker() { return holder('calendario') || owl(); }
  function calHelper(aw) { const s = holder('calendario'); if (s && aw.includes(s)) { act(s, 'raise', 1.2); hop(s, 50); return s; } return null; }

  // ---------------------------------------------------------------- recess in the rain / snow
  function recessStart(rec) {
    const wt = weather();
    if (wt === 'lluvia') {
      rec.bubble = true;
      const rug = ctx.furn.rug; rec.ball.x = rug.x; rec.ball.y = rug.y - 10; rec.ball.z = 14;
      wait(0.6).then(() => speak(students[0], LD.WEATHER_RECESS.lluvia, 'yay'));
    }
    if (wt === 'nieve') wait(0.6).then(() => speak(students[2], LD.WEATHER_RECESS.nieve, 'here'));
  }
  function drawBall(c, b) {
    const rec = ctx.recess(); if (!rec || !rec.bubble) return false;
    for (const q of bubbles) { const im = q.big ? bubbleBall() : smallBubble(); c.globalAlpha = 0.8; D(c, im, q.x - im.width / 2, q.y - im.height / 2); c.globalAlpha = 1; }
    ctx.shadow(c, b.x, b.y, 6);
    c.globalAlpha = 0.85; D(c, bubbleBall(), b.x - 7, b.y - 16 - b.z + Math.round(Math.sin(G.time * 3))); c.globalAlpha = 1;
    return true;
  }
  /** scarves on snowy days, the line leader's flag, the watering can */
  function overStudent(c, s, x, y) {
    if (weather() === 'nieve' && s.mode !== 'seated' && !(s.hide > 0)) {
      const ny = { bunny: 25, puppy: 25, turtle: 25, owl: 26, frog: 25 }[s.kind] ?? 25;
      D(c, scarf(s.kind), x + 6, y + ny);
    }
    if (ctx.phase() === 'goodbye' && s.mode !== 'seated' && s === holder('lider')) D(c, leaderFlag(), x + 25, y - 8 + Math.round(Math.sin(G.time * 6)));
    if (watering && watering.s === s && G.time < watering.until) {
      const cv = wateringCan(), sd = watering.side || 1;
      if (sd < 0) D(c, cv, x + 24, y + 18); else { c.save(); c.translate(Math.round(x + 10), Math.round(y + 18)); c.scale(-1, 1); c.drawImage(cv, 0, 0); c.restore(); }
    }
  }

  // ---------------------------------------------------------------- the jobs chart (same look as the centros chart)
  function chartLayout() {
    const V = ctx.V();
    const pw = Math.min(V.W - 16, 250), ph = Math.min(V.H - 16, 170);
    const P = { x: Math.round(V.W / 2 - pw / 2), y: Math.round(V.H / 2 - ph / 2), w: pw, h: ph };
    const n = LD.JOBS.length, cw = Math.floor((pw - 16) / n);
    const cols = LD.JOBS.map((j, ci) => ({ ci, x: P.x + 8 + ci * cw, y: P.y + 8, w: cw - 4, h: ph - 52 }));
    const done = { x: P.x + pw / 2 - 18, y: P.y + ph - 40, w: 36, h: 32 };
    const back = { x: Math.max(V.inset.l + 2, P.x - 12), y: Math.max(V.inset.t + 2, P.y - 12), w: 26, h: 26 };
    return { P, cols, done, back };
  }
  function faceRects() {
    const { cols } = chartLayout(), J = jobs(), out = [];
    for (const col of cols) students.filter(s => J.assign[s.kind] === col.ci).forEach((s, j) => out.push({ s, x: col.x + col.w / 2 - 13, y: col.y + 46 + j * 30, w: 26, h: 26 }));
    return out;
  }
  function openJobs() { jobs(); chart = { drag: null, t0: G.time }; jobsHintDay = today(); sfx.chime(); }
  function drawChart(c) {
    const V = ctx.V(), { W, H } = V, { P, cols, done, back } = chartLayout();
    c.fillStyle = 'rgba(40,30,60,0.45)'; c.fillRect(0, 0, W, H);
    R(c, P.x - 2, P.y - 2, P.w + 4, P.h + 4, '#c95f4a'); R(c, P.x, P.y, P.w, P.h, '#fff0dc');
    for (const col of cols) {
      R(c, col.x, col.y, col.w, col.h, '#fffaf0'); R(c, col.x, col.y, col.w, 40, JOB_COL[col.ci]);
      R(c, col.x, col.y + 40, col.w, 1, darken(JOB_COL[col.ci], 0.25));
      R(c, col.x + 3, col.y + 76, col.w - 6, 2, '#f0d8c0'); // pocket
      D(c, ctx.scaled(jobIcon(col.ci), 2), col.x + col.w / 2 - 18, col.y + 2);
    }
    for (const f of faceRects()) {
      if (chart.drag && chart.drag.s === f.s) continue;
      const bob = G.time - chart.t0 < 1.2 ? Math.round(Math.sin((G.time - chart.t0) * 10 + f.x) * 1) : 0;
      D(c, ctx.scaled(ctx.miniFace(f.s.kind, true), 2), f.x, f.y + bob);
    }
    if (chart.drag) D(c, ctx.scaled(ctx.miniFace(chart.drag.s.kind, true), 2), chart.drag.x - 13, chart.drag.y - 13);
    const k = Math.sin(G.time * 5) > 0.3 ? 1 : 0;
    D(c, ctx.btnFrame(done.w, done.h, k ? '#fff6c8' : '#fff3dc', 'jdone'), done.x, done.y - k);
    D(c, S.ICONS.check(), done.x + 9, done.y + 7 - k);
    D(c, ctx.btnFrame(26, 26), back.x, back.y); D(c, S.ICONS.back(), back.x + 4, back.y + 3);
  }
  function closeChart(how) {
    chart = null;
    if (how === 'done') {
      sfx.chime(); ctx.teacherAct('clap', 1.2);
      const J = jobs();
      for (const s of ctx.awake()) if (s.mode === 'seated' && J.assign[s.kind] < 4) { act(s, 'cheer', 1.2); hop(s, 70); ctx.burst('star', ...ctx.headPos(s), 3, [JOB_COL[J.assign[s.kind]], '#ffd23f'], { up: true }); }
    } else if (how === 'back') { sfx.whoosh(); ctx.sayUI('back'); } else sfx.softPop();
  }
  function chartDown(x, y) {
    const f = faceRects().find(r => inRect(x, y, r));
    if (f) { chart.drag = { s: f.s, x, y }; sfx.lift(); }
  }
  function chartUp(x, y) {
    const { cols, done, back, P } = chartLayout(), J = jobs();
    if (chart.drag) {
      const s = chart.drag.s; chart.drag = null;
      const col = cols.find(cl => x >= cl.x - 2 && x <= cl.x + cl.w + 2 && y >= P.y && y <= P.y + P.h);
      if (col) {
        const old = J.assign[s.kind], other = students.find(t => t !== s && J.assign[t.kind] === col.ci);
        J.assign[s.kind] = col.ci; if (other) J.assign[other.kind] = old;
        persist(); sfx.pop(1.2); speak(s, LD.JOBS[col.ci].word, 'here');
      } else sfx.softPop();
      return;
    }
    if (inRect(x, y, back)) { closeChart('back'); return; }
    if (inRect(x, y, done)) { closeChart('done'); return; }
    const col = cols.find(cl => inRect(x, y, { x: cl.x, y: cl.y, w: cl.w, h: 40 }));
    if (col) { sfx.pop(); speak(owl(), LD.JOBS[col.ci].word, 'here'); return; }
    if (!inRect(x, y, P)) closeChart('outside');
  }
  const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  // ---------------------------------------------------------------- hints
  /** while the chart is open: show how to move a face into a job */
  function hint() {
    if (!chart) return null;
    const f = faceRects().find(r => jobs().assign[r.s.kind] === 4) || faceRects()[0];
    return f ? { key: 'jobsChart', x: f.x + 13, y: f.y + 16 } : null;
  }
  /** in class: the thirsty plant, then once a day the helpers chart */
  function classHint(sinceStart, btnPt, trayOpen) {
    if (plantBusy || lightBusy) return null;
    if (sinceStart > 25 && !watered()) { const f = ctx.furn.plant; return { key: 'plant', x: f.x, y: f.y - 24 }; }
    if (sinceStart > 50 && jobsHintDay !== today() && !trayOpen) { jobsHintDay = today(); return { key: 'jobs', ...btnPt('jobs') }; }
    return null;
  }

  // ---------------------------------------------------------------- per-frame + input hooks
  function update(dt) {
    const rec = ctx.recess();
    if (rec && rec.bubble) { // a big soap bubble floats instead of falling like a ball, little bubbles rise from the rug
      const b = rec.ball;
      if (b.z > 0 || b.vz > 0) b.vz += 230 * dt;
      bubbleT -= dt;
      if (bubbleT < 0 && bubbles.length < 12) { bubbleT = rand(0.3, 0.7); const rug = ctx.furn.rug; bubbles.push({ x: rug.x + rand(-34, 34), y: rug.y - rand(4, 16), vy: -rand(10, 18), ph: rand(0, 6), big: Math.random() < 0.4, t: 0 }); }
      const top = ctx.L().floorTop - 50;
      for (let i = bubbles.length - 1; i >= 0; i--) { const q = bubbles[i]; q.t += dt; q.y += q.vy * dt; q.x += Math.sin(q.t * 2 + q.ph) * 8 * dt; if (q.y < top || q.t > 9) bubbles.splice(i, 1); }
    } else if (bubbles.length) bubbles.length = 0;
  }
  function render(c) {
    if (chart) drawChart(c);
    if (picker) drawPicker(c);
  }
  function down(x, y) {
    if (picker) { picker.idle = G.time; return true; }
    const hit = ctx.overBtn(x, y) ? -1 : bubbles.findIndex(q => Math.hypot(q.x - x, q.y - y) < (q.big ? 11 : 8));
    if (hit >= 0) { // pop!
      const q = bubbles.splice(hit, 1)[0]; sfx.pop(1.5);
      ctx.burst('spark', q.x, q.y, 6, ['#bfe6ff', '#ffffff', '#ffd6f0'], { sp: 40 });
      const near = students.filter(s => s.mode === 'stand').sort((a, b2) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b2.x - q.x, b2.y - q.y))[0];
      if (near) { act(near, 'cheer', 0.8); hop(near, 60); }
      return true;
    }
    if (chart) { chartDown(x, y); return true; }
    return false;
  }
  function move(x, y) { if (chart && chart.drag) { chart.drag.x = x; chart.drag.y = y; } }
  function up(x, y, moved) {
    if (picker) {
      if (picker.chosen >= 0) return;
      const cd = pickLayout().find(r => inRect(x, y, { x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 }));
      if (cd) choose(cd.i); else sfx.softPop();
      return;
    }
    if (chart) chartUp(x, y, moved);
  }
  function dayStart() { lightsOff = false; lightBusy = false; plantBusy = false; watering = null; chart = null; jobs(); }

  // hooks for automated screenshot tests
  window.__ltWeather = () => (picker && picker.chosen < 0 ? pickLayout().map(r => ctx.css(r.x + r.w / 2, r.y + r.h / 2)) : null);
  window.__ltSetWeather = (id) => { G.save.weather = { day: today(), w: id }; ctx.redrawBg(); };
  window.__ltJobs = () => (chart ? { faces: faceRects().map(f => ({ kind: f.s.kind, pt: ctx.css(f.x + 13, f.y + 13) })), cols: chartLayout().cols.map(cl => ctx.css(cl.x + cl.w / 2, cl.y + 60)), done: ctx.css(chartLayout().done.x + 18, chartLayout().done.y + 16), back: ctx.css(chartLayout().back.x + 13, chartLayout().back.y + 13) } : null);
  window.__ltJobAssign = () => ({ ...jobs().assign });
  window.__ltSwitch = () => { const r = switchRect(); return ctx.css(r.x + 4, r.y + 6); };

  return {
    weather, jobs, holder, morningWeather, windowSky, windowFront, sunPatch, calBadge, drawSwitch, hitSwitch, tapSwitch,
    drawPlantExtra, tapPlant, lineOrder, leaderGo, calSpeaker, calHelper, recessStart, drawBall, overStudent,
    openJobs, hint, classHint, update, render, down, move, up, dayStart,
    get chartOpen() { return !!chart; }, get picking() { return !!picker; },
  };
}
