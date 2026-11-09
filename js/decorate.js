// v2.0 Decorar: the decorate tray (picture tabs: Temas, Pared, Piso, Escritorios, Colores), one-tap room
// themes, select-to-edit bubbles (colour / size / trash), multi-step undo and "nice spot" placement.
// The room (classroom.js) owns the furniture and the drag-and-drop; this module owns the tray UI.
import { G, persist, wait, clamp, rand } from './state.js';
import { cached, glow } from './raster.js';
import * as S from './sprites.js';
import { sfx } from './audio.js';
import * as DC from './decor.js';
import * as LD from './learndata.js';

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const D = (c, img, x, y) => c.drawImage(img, Math.round(x), Math.round(y));
const inRect = (x, y, r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export const TABS = ['themes', 'wall', 'floor', 'desks', 'colors'];
// a theme: wall / floor paint, rug, and things placed near a preferred spot ([type, x 0-1, y 0-1 of the wall or floor, variant, size])
export const THEMES = [
  { id: 'oceano', wall: 4, floor: 5, rug: 4, items: [['fishmobile', 0.14, 0.45, 0, 1], ['lights', 0.5, 0.1, 1], ['lanterns', 0.86, 0.75, 1], ['fishtank', 0.06, 0.45, 0], ['teepee', 0.93, 0.55, 1], ['beanbag', 0.12, 0.85, 1], ['globe', 0.62, 0.55]] },
  { id: 'espacio', wall: 6, floor: 7, rug: 5, items: [['planet', 0.14, 0.45, 0, 1], ['garland', 0.5, 0.1, 0], ['moon', 0.86, 0.8], ['planet', 0.97, 0.3, 1], ['teepee', 0.07, 0.5, 2], ['lamp', 0.95, 0.45, 2], ['beanbag', 0.9, 0.85, 4], ['globe', 0.2, 0.85]] },
  { id: 'jardin', wall: 8, floor: 6, rug: 3, items: [['butterflies', 0.14, 0.45, 0, 1], ['sun', 0.86, 0.25], ['winplants', 0.85, 0.8, 0], ['garland', 0.5, 0.1, 1], ['flowers', 0.05, 0.4, 0, 1], ['flowers', 0.96, 0.45, 2, 1], ['hamster', 0.9, 0.8, 2], ['beanbag', 0.1, 0.85, 3], ['teddy', 0.55, 0.55, 0]] },
  { id: 'arcoiris', wall: 1, floor: 2, rug: 0, items: [['rainbow', 0.14, 0.45, 0, 1], ['lights', 0.5, 0.1, 1], ['lanterns', 0.86, 0.75, 0], ['balloons', 0.05, 0.45, 0, 1], ['balloons', 0.96, 0.45, 2], ['beanbag', 0.12, 0.85, 0], ['easel', 0.9, 0.85, 1], ['toybox', 0.55, 0.55, 1]] },
  { id: 'otono', wall: 7, floor: 1, rug: 6, items: [['leaves', 0.5, 0.1, 0], ['wordwall', 0.14, 0.45, 0], ['leaves', 0.86, 0.75, 1], ['pumpkin', 0.06, 0.45, 0, 1], ['pumpkin', 0.12, 0.6, 1], ['cubbies', 0.93, 0.5, 0], ['teddy', 0.9, 0.85, 0, 1], ['lamp', 0.55, 0.55, 0]] },
  { id: 'fiesta', wall: 3, floor: 3, rug: 2, items: [['garland', 0.5, 0.1, 1], ['lanterns', 0.14, 0.45, 0], ['lights', 0.86, 0.75, 1], ['balloons', 0.05, 0.45, 1, 1], ['balloons', 0.95, 0.45, 0, 1], ['toybox', 0.12, 0.85, 0], ['teddy', 0.9, 0.85, 1], ['beanbag', 0.55, 0.55, 4]] },
  { id: 'invierno', wall: 9, floor: 4, rug: 7, items: [['snowflakes', 0.14, 0.45, 0, 1], ['lights', 0.5, 0.1, 0], ['snowflakes', 0.86, 0.75, 1], ['snowman', 0.06, 0.45, 0, 1], ['snowman', 0.95, 0.5, 1], ['teddy', 0.12, 0.85, 2], ['lamp', 0.9, 0.85, 0], ['beanbag', 0.55, 0.55, 1]] },
  { id: 'cuentos', wall: 0, floor: 0, rug: 2, items: [['artwall', 0.14, 0.45, 0, 1], ['lights', 0.5, 0.1, 0], ['bulletin', 0.86, 0.75, 0], ['wordwall', 0.97, 0.4, 1], ['teepee', 0.07, 0.5, 0, 1], ['cubbies', 0.93, 0.5, 1], ['beanbag', 0.12, 0.85, 4], ['lamp', 0.9, 0.85, 0], ['hamster', 0.55, 0.55, 0]] },
];

export function createDecorate(api) {
  let on = false, tab = 'themes';
  const scroll = {}, undoStack = [];
  let P = null, tabR = [], undoR = null, strip = null; // layout (room coords)
  let sel = null; // { f } a placed thing, or { desk } a desk supply
  let themeRun = 0, tabT = 0, flash = null;

  // ------------------------------------------------------------------ layout
  function layout() {
    const V = api.V(), i = V.inset, nb = api.nextBtn();
    const x = nb.x + nb.w + 3, w = V.W - i.r - 2 - x, h = 46, y = V.H - i.b - h - 2;
    P = { x, y, w, h };
    tabR = TABS.map((t, k) => ({ id: t, x: x + 3 + k * 26, y: y - 19, w: 25, h: 21 }));
    undoR = { x: x + w - 29, y: y - 19, w: 27, h: 21 };
    strip = { x: x + 4, y: y + 3, w: w - 8, h: h - 7 };
  }
  const top = () => (P ? P.y - 19 : api.V().H);
  const floorMax = () => top() + 2;

  // ------------------------------------------------------------------ tiles
  function miniRoom(th) { // the theme's preview: its walls, floor, rug and a big emblem
    return cached('themeTile' + th.id, () => {
      const cv = document.createElement('canvas'); cv.width = 40; cv.height = 34;
      const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
      const [wa, wb] = DC.WALLS[th.wall], [fa, fb, fs] = DC.FLOORS[th.floor], rug = DC.RUGS[th.rug];
      R(c, 0, 0, 40, 20, wa); for (let x = 1; x < 40; x += 5) R(c, x, 1, 2, 16, wb);
      R(c, 0, 16, 40, 4, '#bfe0d0'); R(c, 0, 19, 40, 1, '#8c5a3c');
      for (let y = 20, r = 0; y < 34; y += 4, r++) { R(c, 0, y, 40, 4, r % 2 ? fb : fa); R(c, 0, y + 3, 40, 1, fs); }
      c.drawImage(S.rug(rug), 0, 0, 84, 32, 6, 25, 28, 10);
      D(c, DC.themeIcon(th.id), 10, 3);
      return cv;
    });
  }
  function tiles() {
    const out = [], y = strip.y, h = strip.h;
    let x = 0;
    const push = (t) => { out.push(t); };
    if (tab === 'themes') {
      for (const th of THEMES) { push({ kind: 'theme', id: th.id, th, x, y, w: 44, h, img: miniRoom(th) }); x += 47; }
    } else if (tab === 'wall' || tab === 'floor') {
      const list = tab === 'wall' ? DC.WALL_ITEMS : [...DC.FLOOR_ITEMS, ...DC.PARCEL_ITEMS.filter(t => G.save.gifts.includes(t))];
      for (const t of list) { const d = DC.DECOR[t], w = Math.max(28, d.w + 6); push({ kind: tab, id: t, x, y, w, h, img: DC.decor(t, 0) }); x += w + 3; }
    } else if (tab === 'desks') {
      for (const t of DC.DESK_ITEMS) { push({ kind: 'desk', id: t, x, y, w: 34, h, img: api.scaled(DC.deskItem(t), 2) }); x += 37; }
    } else {
      DC.WALLS.forEach((_, k) => { push({ kind: 'paintWall', id: k, x, y, w: 20, h: 19, img: DC.swatch('wall', k) }); if (k < DC.FLOORS.length) push({ kind: 'paintFloor', id: k, x, y: y + 20, w: 20, h: 19, img: DC.swatch('floor', k) }); x += 22; });
      x += 4;
      DC.RUGS.forEach((_, k) => { push({ kind: 'rug', id: k, x: x + Math.floor(k / 2) * 34, y: y + (k % 2) * 20, w: 32, h: 19, img: rugIcon(k) }); });
      x += Math.ceil(DC.RUGS.length / 2) * 34;
    }
    const total = x, max = Math.max(0, total - strip.w);
    scroll[tab] = clamp(scroll[tab] || 0, 0, max);
    const s = scroll[tab];
    for (const t of out) t.x += strip.x - s;
    return { list: out, max, s };
  }
  function rugIcon(k) {
    return cached('rugicon' + k, () => { const c2 = document.createElement('canvas'); c2.width = 28; c2.height = 11; const x2 = c2.getContext('2d'); x2.imageSmoothingEnabled = false; x2.drawImage(S.rug(DC.RUGS[k]), 0, 0, 84, 32, 0, 0, 28, 11); return c2; });
  }
  function arrows() {
    const { max, s } = tiles();
    return { left: s > 0 ? { x: strip.x - 2, y: strip.y, w: 16, h: strip.h } : null, right: s < max ? { x: strip.x + strip.w - 14, y: strip.y, w: 16, h: strip.h } : null };
  }
  const visible = (t) => t.x + t.w > strip.x && t.x < strip.x + strip.w;

  // ------------------------------------------------------------------ drawing
  function draw(c, hideTray) {
    if (!on) return;
    drawDeskMarks(c);
    if (hideTray) return;
    // tabs: folder tabs sitting on the tray
    tabR.forEach(r => {
      const act = r.id === tab, lift = act ? 0 : 2;
      D(c, api.btnFrame(r.w, r.h + 2, act ? '#fff3dc' : '#f1dcc0', 'dztab' + act), r.x, r.y + lift);
      D(c, r.id === 'wall' ? DC.trayIcon('wall') : r.id === 'floor' ? DC.trayIcon('floor') : DC.decoIcon(r.id), r.x + 4, r.y + 2 + lift - (act && G.time - tabT < 0.25 ? 1 : 0));
    });
    D(c, api.btnFrame(Math.round(P.w), P.h, '#fff3dc', 'dztray'), P.x, P.y);
    const ar = tabR.find(r => r.id === tab); R(c, ar.x + 1, P.y, ar.w - 2, 2, '#fff3dc'); // the open tab joins the tray
    // undo
    const can = undoStack.length > 0, dn = flash === 'undo' && G.time - tabT < 0.2 ? 1 : 0;
    D(c, api.btnFrame(undoR.w, undoR.h, can ? '#dff0ff' : '#ece6dc', 'dzundo' + can), undoR.x, undoR.y + dn);
    c.globalAlpha = can ? 1 : 0.35; D(c, DC.decoIcon('undo'), undoR.x + 5, undoR.y + 1 + dn); c.globalAlpha = 1;
    // tiles (clipped to the strip; tall things may poke out of the top)
    const { list } = tiles();
    c.save(); c.beginPath(); c.rect(strip.x, strip.y - 12, strip.w, strip.h + 14); c.clip();
    for (const t of list) {
      if (!visible(t)) continue;
      const pressed = api.pressTile && api.pressTile() === t.kind + t.id;
      const lift = pressed ? -2 : 0;
      if (t.kind === 'theme') {
        const cur = G.save.theme === t.id;
        if (cur) R(c, t.x - 1, t.y - 1, t.w + 2, t.h + 2, '#ffd23f');
        D(c, api.btnFrame(t.w, t.h, '#fffaf0', 'dzth'), t.x, t.y + lift);
        D(c, t.img, t.x + 2, t.y + 2 + lift);
      } else if (t.kind === 'wall' || t.kind === 'floor' || t.kind === 'desk') {
        D(c, api.btnFrame(t.w, t.h, '#fffaf0', 'dzit'), t.x, t.y);
        const im = t.img, ix = t.x + (t.w - im.width) / 2;
        const iy = t.kind === 'wall' ? t.y + Math.max(2, (t.h - im.height) / 2) : t.y + t.h - 3 - im.height;
        D(c, im, ix, iy + lift);
      } else {
        const sel2 = (t.kind === 'paintWall' && G.save.paint.wall === t.id) || (t.kind === 'paintFloor' && G.save.paint.floor === t.id) || (t.kind === 'rug' && G.save.rugV % DC.RUGS.length === t.id);
        if (sel2) R(c, t.x - 1, t.y - 1, t.w + 2, t.h + 2, '#ffd23f');
        if (t.kind === 'rug') { D(c, api.btnFrame(t.w, t.h, '#fffaf0', 'dzrug'), t.x, t.y); D(c, t.img, t.x + 2, t.y + 4 + lift); }
        else D(c, t.img, t.x + 1, t.y + lift);
      }
    }
    c.restore();
    const ar2 = arrows();
    for (const [k, r] of [['left', ar2.left], ['right', ar2.right]]) {
      if (!r) continue;
      c.fillStyle = 'rgba(255,243,220,0.92)'; c.fillRect(r.x, r.y, r.w, r.h);
      D(c, DC.decoIcon(k), r.x - 1 + (k === 'left' ? Math.round(Math.sin(G.time * 5)) : -Math.round(Math.sin(G.time * 5))), r.y + (r.h - 18) / 2);
    }
  }
  function drawDeskMarks(c) { // Escritorios: the empty desks twinkle
    if (tab !== 'desks') return;
    for (const d of api.desks()) {
      if (G.save.deskItems[d.i]) continue;
      const bob = Math.round(Math.sin(G.time * 5 + d.i) * 1.5);
      D(c, S.particle('star', '#ffd23f'), d.x + 6, d.y - 36 + bob);
    }
  }
  // the selected thing: a bobbing glow (drawn by the room through decoSprite) + three big bubbles
  function bubbles() {
    if (!sel || !on) return [];
    const b = selBox(); if (!b) return [];
    const V = api.V(), list = [];
    if (sel.desk || sel.f.type === 'rug' || DC.DECOR[sel.f.type].variants.length > 1) list.push('color');
    if (sel.f && sel.f.deco) list.push('size');
    if (sel.desk || (sel.f && sel.f.deco)) list.push('del');
    const B = 22, gap = 3, n = list.length, hh = n * B + (n - 1) * gap;
    let x = b.x + b.w + 4;
    if (x + B > V.W - V.inset.r - 2) x = b.x - B - 4;
    x = clamp(x, 2, V.W - B - 2);
    const y0 = clamp(Math.round(b.y + b.h / 2 - hh / 2), V.inset.t + 2, top() - hh - 4);
    return list.map((id, k) => ({ id, x, y: y0 + k * (B + gap), w: B, h: B }));
  }
  function selBox() {
    if (sel.desk) { const d = sel.desk; return { x: d.x + 1, y: d.y - 30, w: 18, h: 16 }; }
    const f = sel.f; if (!api.furn[f.id]) { sel = null; return null; }
    const [w, h] = api.sizeOf(f); return { x: f.x - w / 2, y: f.y - h - (f.lift || 0), w, h };
  }
  function drawSel(c) {
    if (!sel || !on || api.dragging()) return;
    const b = selBox(); if (!b) return;
    if (sel.desk) { // desk supplies are small: a glowing ring around it
      const k = Math.round(Math.sin(G.time * 6));
      c.strokeStyle = '#ffd23f'; c.lineWidth = 1; c.strokeRect(Math.round(b.x) - 1.5 - k, Math.round(b.y) - 1.5 - k, b.w + 3 + 2 * k, b.h + 3 + 2 * k);
    }
    for (const q of bubbles()) {
      const bob = Math.round(Math.sin(G.time * 4 + q.y * 0.1));
      D(c, bubbleFrame(), q.x, q.y + bob);
      D(c, q.id === 'color' ? DC.trayIcon('palette') : q.id === 'size' ? DC.decoIcon('size') : DC.decoIcon('bin'), q.x + 2, q.y + 2 + bob);
    }
  }
  const bubbleFrame = () => cached('dzbubble', () => {
    const cv = document.createElement('canvas'); cv.width = 22; cv.height = 22; const c = cv.getContext('2d');
    const rows = [7, 4, 3, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 3, 4, 7];
    rows.forEach((ins, y) => { R(c, ins, y, 22 - 2 * ins, 1, '#7a5b6a'); });
    rows.forEach((ins, y) => { if (y > 0 && y < 21) R(c, ins + 1, y, 20 - 2 * ins, 1, y < 3 ? '#ffffff' : y > 18 ? '#e8dcc8' : '#fffaf0'); });
    return cv;
  });

  // the sprite of a placed thing: animated frame, size, mirror (+ a soft glow when selected)
  function sprite(f) {
    const def = DC.DECOR[f.type];
    const fr = def.frames ? Math.floor(G.time * (f.type === 'hamster' ? 10 : 2)) % def.frames : 0;
    const base = DC.decor(f.type, f.v || 0, fr);
    const sc = f.sc || 0, k = DC.SCALES[sc] || 1;
    if (k === 1 && !f.fl) return base;
    return cached('dzspr' + f.type + (f.v || 0) + '_' + fr + '_' + sc + (f.fl ? 'f' : ''), () => {
      const [w, h] = DC.decoSize(f.type, sc);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      if (f.fl) { c.translate(w, 0); c.scale(-1, 1); }
      c.drawImage(base, 0, 0, w, h);
      return cv;
    });
  }
  function silhouette(img, key) {
    return cached('dzsil' + key, () => {
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const c = cv.getContext('2d');
      c.drawImage(img, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#5a3a4a'; c.fillRect(0, 0, cv.width, cv.height);
      return cv;
    });
  }
  function drawDeco(c, f, x, y) {
    const def = DC.DECOR[f.type], img = sprite(f);
    const key = f.type + (f.v || 0) + '_' + (f.sc || 0) + (f.fl ? 'f' : '') + '_' + (def.frames ? Math.floor(G.time * (f.type === 'hamster' ? 10 : 2)) % def.frames : 0);
    // pop in: a little boing when a thing arrives
    const age = f.born ? G.time - f.born : 9;
    if (age < 0) return; // a theme's things wait their turn
    if (age < 0.35) {
      const t = age / 0.35, s = t < 0.6 ? 0.3 + t / 0.6 * 0.95 : 1.25 - (t - 0.6) / 0.4 * 0.25;
      const w = Math.round(img.width * s), h = Math.round(img.height * s);
      c.drawImage(img, Math.round(x + img.width / 2 - w / 2), Math.round(y + img.height - h), w, h);
      return;
    }
    const isSel = on && sel && sel.f === f;
    if (def.layer === 'wall' && f.deco) { c.globalAlpha = 0.16; D(c, silhouette(img, key), x + 1, y + 2); c.globalAlpha = 1; }
    if (def.glow) { // string lights: a warm halo, stronger in the evening
      c.globalAlpha = 0.4 + 0.15 * Math.sin(G.time * 3); D(c, glow(img, '#fff2a0', 'dzglow' + key), x - 2, y - 2); c.globalAlpha = 1;
    }
    if (isSel) {
      c.globalAlpha = 0.65 + 0.35 * Math.sin(G.time * 6);
      D(c, glow(img, '#ffd23f', 'dzsel' + key), x - 2, y - 2); c.globalAlpha = 1;
    }
    D(c, img, x, y);
    if (f.type === 'artwall') drawArt(c, f, x, y);
  }
  // ------------------------------------------------------------------ the art wall: her whiteboard drawings
  const artImgs = new Map();
  function artImg(src) {
    if (!artImgs.has(src)) { const im = new Image(); im.src = src; artImgs.set(src, im); }
    const im = artImgs.get(src); return im.complete && im.naturalWidth ? im : null;
  }
  function drawArt(c, f, x, y) {
    const def = DC.DECOR.artwall, k = DC.SCALES[f.sc || 0] || 1;
    const pics = G.save.gallery.length ? G.save.gallery.map(artImg) : (G.save.board ? [api.boardCanvas()] : []);
    c.imageSmoothingEnabled = true;
    DC.ART_WIN.forEach((r, i) => {
      const im = pics[i]; if (!im) return;
      const rx = f.fl ? def.w - r.x - r.w : r.x;
      c.drawImage(im, Math.round(x + rx * k), Math.round(y + r.y * k), Math.round(r.w * k), Math.round(r.h * k));
    });
    c.imageSmoothingEnabled = false;
  }
  function snapArt(board) { // after she draws: keep a little copy of the drawing for the art wall
    try {
      const cv = document.createElement('canvas'); cv.width = 96; cv.height = 54; const c = cv.getContext('2d');
      c.imageSmoothingEnabled = true; c.drawImage(board, 0, 0, 96, 54);
      const url = cv.toDataURL('image/png');
      if (G.save.gallery[0] !== url) { G.save.gallery.unshift(url); G.save.gallery = G.save.gallery.slice(0, 3); persist(); }
    } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------------ nice spots
  function obstacles(layer, skip) {
    const L = api.L(), V = api.V(), out = [];
    const add = (x, y, w, h, k) => out.push({ x, y, w, h, k });
    if (layer === 'wall') {
      add(L.board.x - 5, L.board.y - 3, L.board.w + 10, L.board.h + 8, 3);
      add(L.door.x - 5, L.door.y - 17, L.door.w + 10, L.door.h + 17, 3);
      add(L.win.x - 8, L.win.y - 5, L.win.w + 16, L.win.h + 10, 2);
      add(L.clock.x - 10, L.clock.y - 10, 20, 20, 2);
      add(L.board.x - 8, 2, Math.min(L.win.x - 4, V.W - 36) - L.board.x + 8, 12, 0.6); // the pennant banner
      add(0, L.door.y - 4, L.door.x, 24, 1); // the light switch
      const gap = L.win.x - (L.board.x + L.board.w); // the shapes poster painted between board and window
      if (gap > 40) add(L.board.x + L.board.w + Math.round(gap / 2) - 14, 22, 28, 35, 2);
      for (const b of api.hudRects()) if (b.y < L.wallH) add(b.x - 3, b.y - 3, b.w + 6, b.h + 6, 4); // the ? button
    } else {
      add(L.doorPt.x - 14, L.floorTop - 4, 40, 34, 2); // the friends walk in here
      add(L.board.x, L.board.y, L.board.w, L.board.h, 1.2); add(L.door.x, L.door.y, L.door.w, L.door.h, 1.2); // tall things shouldn't hide the board / door
      for (const b of api.hudRects()) add(b.x - 2, b.y - 2, b.w + 4, b.h + 4, 3);
      if (on) add(P.x, top(), P.w, V.H - top(), 4);
    }
    for (const f of Object.values(api.furn)) {
      if (f === skip) continue;
      if (layer === 'floor' && api.layerOf(f) === 'wall' && !f.deco) { const [w, h] = api.sizeOf(f); add(f.x - w / 2, f.y - h, w, h, 1.2); continue; } // the ABC board, the calendar
      if (api.layerOf(f) !== layer) continue;
      const [w, h] = api.sizeOf(f);
      if (f.type === 'desk') { add(f.x - 18, f.y - 52, 36, 54, 3); continue; } // desk + chair + the friend sitting there
      if (f.type === 'rug') { add(f.x - 34, f.y - 26, 68, 20, 0.5); continue; }
      add(f.x - w / 2, f.y - h, w, h, f.deco ? 2 : f.type === 'teacher' ? 1.5 : 3);
    }
    return out;
  }
  // the best spot near a preferred point (0-1 of the wall / floor); null when the room is too full (themes skip it)
  function findSpot(type, sc, pref, strict, skip) {
    const def = DC.DECOR[type], [w, h] = DC.decoSize(type, sc), L = api.L(), V = api.V();
    const wall = def.layer === 'wall';
    const x0 = w / 2 + 2, x1 = V.W - V.inset.r - w / 2 - 2;
    const y0 = wall ? h + 4 : L.floorTop + 12, y1 = wall ? L.wallH - 20 : (on ? floorMax() : V.H - 2);
    if (x1 < x0 || y1 < y0) return null;
    const px = pref.ax ?? x0 + (x1 - x0) * pref.x, py = pref.ay ?? y0 + (y1 - y0) * pref.y;
    const obs = obstacles(def.layer, skip);
    let best = null;
    for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 3) {
      const r = { x: x - w / 2, y: y - h, w, h };
      let ov = 0, hard = 0;
      for (const o of obs) {
        const ix = Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x), iy = Math.min(r.y + r.h, o.y + o.h) - Math.max(r.y, o.y);
        if (ix <= 0 || iy <= 0) continue;
        ov += ix * iy * o.k; if (o.k >= 2) hard += ix * iy;
      }
      if (strict && hard > w * h * 0.3) continue;
      const score = ov / (w * h) * 220 + Math.hypot(x - px, (y - py) * 1.4) * 0.5;
      if (!best || score < best.score) best = { x: Math.round(x), y: Math.round(y), score };
    }
    return best;
  }

  // a floor thing dropped onto a desk / chair slides to the nearest free floor nearby (no hamster cage around a friend)
  function settle(f) {
    if (api.layerOf(f) !== 'floor') return;
    const [w, h] = api.sizeOf(f), r = { x: f.x - w / 2, y: f.y - h, w, h };
    const hit = api.desks().some(d => {
      const ix = Math.min(r.x + r.w, d.x + 18) - Math.max(r.x, d.x - 18), iy = Math.min(r.y + r.h, d.y + 2) - Math.max(r.y, d.y - 52);
      return ix > 0 && iy > 0 && ix * iy > w * h * 0.12;
    });
    if (!hit) return;
    const sp = findSpot(f.type, f.sc || 0, { ax: f.x, ay: f.y }, true, f);
    if (sp) { f.x = sp.x; f.y = sp.y; api.clampItem(f); }
  }

  // ------------------------------------------------------------------ undo
  const state = () => JSON.stringify({ d: G.save.decor, k: G.save.deskItems, w: G.save.paint.wall, f: G.save.paint.floor, r: G.save.rugV, t: G.save.theme || null });
  function snap() {
    const s = state();
    if (undoStack[undoStack.length - 1] !== s) undoStack.push(s);
    if (undoStack.length > 40) undoStack.shift();
  }
  function undo() {
    themeRun++;
    const s = undoStack.pop(); if (!s) { sfx.softPop(); return; }
    const o = JSON.parse(s);
    G.save.decor = o.d; G.save.deskItems = o.k; G.save.paint.wall = o.w; G.save.paint.floor = o.f; G.save.rugV = o.r; G.save.theme = o.t;
    G.save.decorStamp++; persist();
    sel = null;
    api.loadDecor(); api.redrawBg();
    sfx.whoosh(); sayUI('undo');
    const L = api.L(), V = api.V();
    api.burst('puff', V.W / 2, L.wallH, 10, ['#ffffff', '#fff6e0'], { sp: 70, g: -10 });
  }

  // ------------------------------------------------------------------ themes
  async function applyTheme(th) {
    snap();
    const run = ++themeRun;
    sel = null;
    G.save.theme = th.id;
    G.save.paint.wall = th.wall; G.save.paint.floor = th.floor; G.save.rugV = th.rug;
    for (const f of Object.values(api.furn)) if (f.deco) { api.burst('puff', f.x, f.y - api.sizeOf(f)[1] / 2, 4, ['#ffffff', '#fff6e0'], { sp: 30, g: -10 }); delete api.furn[f.id]; }
    api.saveDecor(); api.redrawBg();
    const L = api.L(), V = api.V();
    for (let k = 0; k < 7; k++) api.burst('puff', V.W * (k + 0.5) / 7, rand(L.wallH * 0.3, L.wallH + 30), 4, ['#ffffff', '#fff6e0', '#ffe9f2'], { sp: 40, g: -15 });
    sfx.sparkle(); api.teacherAct('cheer', 1.4);
    api.say(LD.THEME_NAMES[th.id]);
    let t = 0.35;
    for (const [type, x, y, v = 0, sc = 0] of th.items) {
      const spot = findSpot(type, sc, { x, y }, true);
      if (!spot) continue;
      const f = api.addDecor(type, spot.x, spot.y, { v, sc, quiet: true, delay: t });
      if (!f) break;
      const when = t; t += 0.3;
      wait(when).then(() => { if (run !== themeRun || !api.furn[f.id]) return; sfx.pop(1 + Math.random() * 0.4); api.puff(f); });
    }
    wait(t + 0.2).then(() => { if (run === themeRun) { sfx.chime(); api.cheer(V.W / 2, L.wallH / 2); } });
  }

  // ------------------------------------------------------------------ select-to-edit
  function select(f, desk) {
    sel = desk ? { desk } : { f };
    sfx.pop(1.25);
    if (desk) sayItem(G.save.deskItems[desk.i]); else if (f.deco) sayItem(f.type); else sayUI('rug');
    if (!desk) { f.pop = G.time + 0.2; }
  }
  function bubbleTap(id) {
    const b = selBox(); if (!b) return;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    snap();
    if (id === 'color') {
      if (sel.desk) {
        const d = sel.desk, i = DC.DESK_ITEMS.indexOf(G.save.deskItems[d.i]);
        api.setDeskItem(d, DC.DESK_ITEMS[(i + 1) % DC.DESK_ITEMS.length]);
      } else { api.cycleVariant(sel.f); sayUI('color'); }
      api.burst('spark', cx, cy, 6, ['#ffd23f', '#ff9ec4', '#7ec8ff', '#ffffff']);
    } else if (id === 'size') {
      const f = sel.f;
      f.sc = ((f.sc || 0) + 1) % DC.SCALES.length;
      if (!f.sc) f.fl = !f.fl; // back to small: it turns around
      f.born = G.time;
      api.clampItem(f); settle(f); api.remember(f);
      sfx.boing(); sayUI('size');
      api.puff(f);
    } else if (id === 'del') {
      if (sel.desk) { delete G.save.deskItems[sel.desk.i]; G.save.decorStamp++; persist(); api.trashFx(cx, cy); }
      else { delete api.furn[sel.f.id]; api.saveDecor(); api.trashFx(cx, cy); }
      sel = null;
    }
  }
  const sayUI = (k) => api.sayUI(k), sayItem = (k) => api.sayItem(k);

  // ------------------------------------------------------------------ input (room coords); the room calls these first
  function down(x, y) {
    if (!on) return null;
    const bb = bubbles().find(q => inRect(x, y, { x: q.x - 2, y: q.y - 2, w: q.w + 4, h: q.h + 4 }));
    if (bb) return { bubble: bb.id };
    const t = tabR.find(r => inRect(x, y, r)); if (t) return { tab: t.id };
    if (inRect(x, y, undoR)) return { undo: true };
    if (!inRect(x, y, P)) return null;
    const ar = arrows();
    if (inRect(x, y, ar.left)) return { arrow: -1 };
    if (inRect(x, y, ar.right)) return { arrow: 1 };
    const tile = inRect(x, y, strip) ? tiles().list.find(q => visible(q) && inRect(x, y, q)) : null;
    return { tile, x0: x, y0: y, s0: scroll[tab] || 0 };
  }
  // returns { drag: tile } when a thing is pulled out of the tray
  function move(pr, x, y) {
    if (!pr || pr.x0 === undefined) return null;
    const dx = x - pr.x0, dy = y - pr.y0;
    if (!pr.mode) {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.2 && tiles().max > 0) pr.mode = 'scroll';
      else if (Math.hypot(dx, dy) > 6) pr.mode = pr.tile && ['wall', 'floor', 'desk'].includes(pr.tile.kind) ? 'drag' : 'none';
      if (pr.mode === 'drag') return { drag: pr.tile };
    }
    if (pr.mode === 'scroll') scroll[tab] = clamp(pr.s0 - dx, 0, tiles().max);
    return null;
  }
  function tap(pr) {
    if (pr.bubble) { bubbleTap(pr.bubble); return; }
    if (pr.tab) { if (tab !== pr.tab) { tab = pr.tab; tabT = G.time; flash = null; } sfx.pop(1.1); sayUI(pr.tab); return; }
    if (pr.undo) { tabT = G.time; flash = 'undo'; undo(); return; }
    if (pr.arrow) { sfx.tap(); const s0 = scroll[tab] || 0, s1 = s0 + pr.arrow * Math.round(strip.w * 0.7); glide(s0, s1); return; }
    const it = pr.tile; if (!it) return;
    sel = null;
    if (it.kind === 'theme') { applyTheme(it.th); return; }
    snap();
    if (it.kind === 'paintWall' || it.kind === 'paintFloor') {
      G.save.paint[it.kind === 'paintWall' ? 'wall' : 'floor'] = it.id; G.save.decorStamp++; persist();
      api.redrawBg(); const L = api.L(), V = api.V(); api.cheer(V.W / 2, it.kind === 'paintWall' ? L.wallH / 2 : L.floorTop + 30);
      return;
    }
    if (it.kind === 'rug') { G.save.rugV = it.id; G.save.decorStamp++; persist(); const r = api.furn.rug; api.burst('puff', r.x, r.y - 16, 8, ['#ffffff', '#fff6e0'], { sp: 40, g: -10 }); sfx.pop(1.2); sayUI('rug'); return; }
    if (it.kind === 'desk') { const d = api.desks().find(q => !G.save.deskItems[q.i]) || api.desks()[Math.floor(Math.random() * api.desks().length)]; api.setDeskItem(d, it.id); return; }
    // a tap on a thing: it goes to a nice free spot
    const spot = findSpot(it.id, 0, { x: rand(0.1, 0.9), y: DC.DECOR[it.id].layer === 'wall' ? rand(0.2, 0.8) : rand(0.2, 0.7) }, false);
    if (spot) api.addDecor(it.id, spot.x, spot.y, {});
  }
  function glide(s0, s1) {
    const max = tiles().max; s1 = clamp(s1, 0, max);
    const t0 = G.time, tb = tab;
    const step = () => { if (tab !== tb) return; const k = Math.min(1, (G.time - t0) / 0.25); scroll[tb] = s0 + (s1 - s0) * (1 - (1 - k) * (1 - k)); if (k < 1) requestAnimationFrame(step); };
    step();
  }
  // a tap in the room (not on the tray): select a placed thing / a desk supply, or let go of the selection
  function tapRoom(f, desk) {
    if (!on) return false;
    if (desk) { if (sel && sel.desk === desk) { sel = null; sfx.softPop(); } else select(null, desk); return true; }
    if (f && (f.deco || f.type === 'rug')) { if (sel && sel.f === f) { sel = null; sfx.softPop(); } else select(f); return true; }
    if (sel) { sel = null; sfx.softPop(); return !f; } // the first tap elsewhere just lets go
    return false;
  }

  return {
    get on() { return on; }, get tab() { return tab; }, get sel() { return sel; },
    open(t = 'themes') { on = true; tab = t; sel = null; layout(); api.reflow(); }, // (floor things step out from under the tray)
    close() { if (!on) return; on = false; sel = null; themeRun++; api.reflow(); },
    layout, top, floorMax, settle, draw, drawSel, drawDeco, sprite, down, move, tap, tapRoom, snap, undo, findSpot, snapArt, applyTheme,
    inTray: (x, y) => on && (inRect(x, y, P) || tabR.some(r => inRect(x, y, r)) || inRect(x, y, undoR)),
    deselect() { sel = null; },
    forget(f) { if (sel && sel.f === f) sel = null; },
    // where the hand points: the first theme picture (or the Temas tab)
    hintPt() { if (tab !== 'themes') { const r = tabR[0]; return { x: r.x + 12, y: r.y + 8 }; } const t = tiles().list.find(visible); return { x: t.x + t.w / 2, y: t.y + 10 }; },
    // automated tests
    test(css) {
      if (!on) return null;
      const tl = tiles().list;
      return {
        tab, undo: css(undoR.x + 13, undoR.y + 10), tabs: Object.fromEntries(tabR.map(r => [r.id, css(r.x + 12, r.y + 10)])),
        items: tl.map(t => { const cx = t.x + t.w / 2; return cx > strip.x + 16 && cx < strip.x + strip.w - 16 ? css(cx, t.y + t.h / 2) : null; }),
        ids: tl.map(t => t.id), bubbles: Object.fromEntries(bubbles().map(b => [b.id, css(b.x + 11, b.y + 11)])),
        sel: sel ? (sel.desk ? 'desk' + sel.desk.i : sel.f.id) : null, undoN: undoStack.length,
        right: arrows().right ? css(strip.x + strip.w - 6, strip.y + strip.h / 2) : null,
      };
    },
    scrollTo(i) { const tl = tiles(); const t = tl.list[i]; if (t) scroll[tab] = clamp((scroll[tab] || 0) + t.x - strip.x - 20, 0, tl.max); },
  };
}
