// Playwright walkthrough: node tools/shots.mjs <outdir> [ipad|phone]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const out = process.argv[2] || 'shots';
const which = process.argv[3] || 'ipad';
const b = await chromium.launch();
const ctxOpts = which === 'ipad'
  ? { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true }
  : { ...devices['iPhone 13 landscape'] };
const ctx = await b.newContext(ctxOpts);
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => { errors.push(String(e)); console.log('PAGEERROR', String(e)); });
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(`http://localhost:${process.env.LT_PORT || 8123}/index.html?fast`);
await p.waitForTimeout(800);
const W = ctxOpts.viewport.width, H = ctxOpts.viewport.height;
const shot = async (n) => p.screenshot({ path: `${out}/${which}-${n}.png` });
// the morning ends at circle time: tap a weather picture when they appear, then wait for class
const waitMorning = async (timeout, name) => {
  await p.waitForFunction(() => window.__ltWeather?.() || window.__lt.room.phase === 'class', null, { timeout });
  const pics = await p.evaluate(() => window.__ltWeather?.());
  if (pics) { if (name) await shot(name); await p.mouse.move(...pics[0]); await p.mouse.down(); await p.mouse.up(); }
  await p.waitForFunction(() => window.__lt.room.phase === 'class', null, { timeout });
};
await shot('01-title');
// helpers to convert logical coords of the active view to css px
const L = async (fn) => p.evaluate(fn);
const tapAt = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up(); };
const cssOf = async (scene, x, y) => p.evaluate(([scene, x, y]) => { const v = window.__lt[scene].view; return [x * v.s / window.__lt.G.dpr, y * v.s / window.__lt.G.dpr]; }, [scene, x, y]);
await tapAt(W / 2, H * 0.58);
await p.waitForTimeout(500);
await shot('02a-prep');
await p.waitForTimeout(3000);
await shot('02a2-prep-hint');
const drag = async (a, b) => { await p.mouse.move(a[0], a[1]); await p.mouse.down(); await p.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { steps: 4 }); await p.mouse.move(b[0], b[1], { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(150); };
let tray = await p.evaluate(() => window.__ltTray());
await drag(tray.items[0], [W * 0.12, H * 0.62]);
await drag(tray.items[1], [W * 0.18, H * 0.6]);
await drag(tray.items[4], [W * 0.88, H * 0.66]);
await drag(tray.items[7], [W * 0.06, H * 0.5]);
await tapAt(...tray.tabs[1]); await p.waitForTimeout(100);
tray = await p.evaluate(() => window.__ltTray());
await drag(tray.items[0], [W * 0.3, H * 0.2]);
await drag(tray.items[4], [W * 0.75, H * 0.08]);
await drag(tray.items[3], [W * 0.62, H * 0.33]);
await shot('02b-decor');
await tapAt(...tray.tabs[3]); await p.waitForTimeout(100);
tray = await p.evaluate(() => window.__ltTray());
await tapAt(...tray.items[1]); await tapAt(...tray.items[7]);
await p.waitForTimeout(200);
await shot('02c-paint');
await tapAt(...tray.tabs[2]); await p.waitForTimeout(100);
tray = await p.evaluate(() => window.__ltTray());
const dsk = await p.evaluate(() => window.__ltDesks());
for (let i = 0; i < 5; i++) await drag(tray.items[i], dsk[i]);
await p.waitForTimeout(400);
await shot('02d-desks');
// trash: drag the beanbag into the trash can (screenshot while hovering), and a desk supply too
const bean = await p.evaluate(() => { const f = window.__ltFurnPt; return f('d0'); });
const tr = await p.evaluate(() => window.__ltTrash());
await p.mouse.move(...bean); await p.mouse.down(); await p.mouse.move(bean[0] + 20, bean[1] + 10, { steps: 3 });
const tr2 = await p.evaluate(() => window.__ltTrash());
await p.mouse.move(tr2[0], tr2[1], { steps: 8 });
await shot('02e-trash');
await p.mouse.up(); await p.waitForTimeout(200);
const di = await p.evaluate(() => window.__ltDeskItem(4));
await p.mouse.move(...di); await p.mouse.down(); await p.mouse.move(di[0], di[1] - 30, { steps: 3 });
const tr3 = await p.evaluate(() => window.__ltTrash());
await p.mouse.move(tr3[0], tr3[1], { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
void tr;
await tapAt(...(await p.evaluate(() => window.__ltBtn('bell'))));
await p.waitForTimeout(550);
await shot('02f-daycard');
await p.waitForTimeout(1100);
await shot('02-morning');
await waitMorning(30000, '02g-weather');
await p.waitForTimeout(400);
await shot('03-class');
await p.waitForTimeout(3200);
await shot('03b-hint');
// attendance: tap each student
const studs = await p.evaluate(() => window.__lt.students.map(s => s.kind));
for (let i = 0; i < 5; i++) {
  const [x, y] = await p.evaluate((i) => {
    const lt = window.__lt; const s = lt.students[i]; const v = lt.room.view;
    // find desk position via room internals: approximate from seat
    return [0, 0];
  }, i);
}
// we tap students by scanning: use the exposed desk geometry through a helper
const seats = await p.evaluate(() => {
  const lt = window.__lt; const v = lt.room.view;
  return lt.students.map(s => s.mode);
});
console.log('modes', seats);
await p.evaluate(() => window.__lt.students.forEach(s => { s.sleep = false; s.hide = 0; }));
const pts = await p.evaluate(() => window.__ltDeskPts && window.__ltDeskPts());
for (const [x, y] of pts) { await tapAt(x, y); await p.waitForTimeout(250); }
await p.waitForTimeout(600);
await shot('04-attendance');
// a student asks a question
const quizOpts = async () => p.evaluate(() => { const lt = window.__lt; const q = lt.room; return null; });
await p.evaluate(() => window.__ltAsk(3));
await p.waitForTimeout(700);
await shot('04a-question');
const pickOpt = async (right) => {
  const info = await p.evaluate((right) => { const o = window.__ltQuiz(); const Q = window.__ltQuizQ(); if (!o || !Q) return null; const st = Q.steps[Q.i]; const k = st.options.findIndex(x => x.right === right); return k >= 0 ? o.opts[k] : null; }, right);
  if (info) await tapAt(...info);
};
await pickOpt(false); await p.waitForTimeout(600);
await shot('04b-question-wrong');
await pickOpt(true); await p.waitForTimeout(1600);
// feelings
await p.evaluate(() => { const lt = window.__lt; const s = lt.students; s[1].mood = 'triste'; s[4].mood = 'enojado'; s[0].mood = 'asustado'; s[2].mood = 'cansado'; for (const k of [0, 1, 2, 4]) s[k].bubble = { kind: 'm:' + s[k].mood, until: lt.G.time + 999 }; s[0].sleep = false; s[2].hide = 0; });
await p.waitForTimeout(900);
await shot('04bb-moods');
await p.evaluate(() => { const s = window.__lt.students; for (const k of [0, 2, 4]) { s[k].mood = null; s[k].bubble = null; } });
await p.evaluate(() => window.__ltFeel(1, 'triste'));
await p.waitForTimeout(500);
await shot('04c-feelings-1');
await pickOpt(true); await p.waitForTimeout(1500);
await shot('04d-feelings-2');
await pickOpt(true); await p.waitForTimeout(1500);
await shot('04e-feelings-done');
// drag a gold star onto the first student
const star = await p.evaluate(() => window.__ltBtn('star'));
await p.mouse.move(star[0], star[1]); await p.mouse.down();
await p.mouse.move((star[0] + pts[1][0]) / 2, (star[1] + pts[1][1]) / 2, { steps: 5 });
await p.mouse.move(pts[1][0], pts[1][1], { steps: 5 });
await shot('05-dragstar');
await p.mouse.up();
await p.waitForTimeout(500);
await shot('06-starglow');
// behaviour: the frog acts up, she gives a red card; then a green card to the owl
await p.evaluate(() => window.__ltNaughty(4));
await p.waitForTimeout(700);
await shot('06a-naughty');
const dragTo = async (from, to) => { await p.mouse.move(...from); await p.mouse.down(); await p.mouse.move((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, { steps: 4 }); await p.mouse.move(...to, { steps: 4 }); await p.mouse.up(); };
let heads = await p.evaluate(() => window.__ltDeskPts());
await dragTo(await p.evaluate(() => window.__ltBtn('cardRed')), heads[4]);
await p.waitForTimeout(500);
await shot('06b-redcard');
await dragTo(await p.evaluate(() => window.__ltBtn('cardGreen')), heads[3]);
await p.waitForTimeout(500);
await shot('06c-greencard');
// move a plant
const plant = await p.evaluate(() => window.__ltFurn('plant'));
await p.mouse.move(plant[0], plant[1]); await p.mouse.down();
await p.mouse.move(plant[0] - 200, plant[1] - 60, { steps: 8 });
await p.mouse.up();
await p.waitForTimeout(300);
await shot('07-moved');
// open the whiteboard
const brd = await p.evaluate(() => window.__ltBoardPt());
await tapAt(brd[0], brd[1]);
await p.waitForTimeout(900);
await p.waitForFunction(() => document.title && true);
await shot('08-board');
const bb = await p.evaluate(() => { const lt = window.__lt; const r = lt.board.rect(); const v = lt.board.view; const k = v.s / lt.G.dpr; return { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k }; });
// draw a sun-ish squiggle and a house
const draw = async (ptsArr) => { await p.mouse.move(...ptsArr[0]); await p.mouse.down(); for (const q of ptsArr.slice(1)) await p.mouse.move(q[0], q[1], { steps: 4 }); await p.mouse.up(); };
const bx = (u) => bb.x + u * bb.w, by = (v) => bb.y + v * bb.h;
const circle = []; for (let a = 0; a <= 6.4; a += 0.3) circle.push([bx(0.25) + Math.cos(a) * bb.w * 0.09, by(0.35) + Math.sin(a) * bb.w * 0.09]);
await draw(circle);
await draw([[bx(0.5), by(0.75)], [bx(0.5), by(0.45)], [bx(0.62), by(0.3)], [bx(0.74), by(0.45)], [bx(0.74), by(0.75)], [bx(0.5), by(0.75)]]);
// pick a colour and draw again
const mk = await p.evaluate(() => window.__ltBoardBtn('marker', 4));
await tapAt(...mk);
await draw([[bx(0.1), by(0.9)], [bx(0.3), by(0.85)], [bx(0.5), by(0.9)], [bx(0.7), by(0.85)], [bx(0.9), by(0.9)]]);
const stp = await p.evaluate(() => window.__ltBoardBtn('stamp', 0));
await tapAt(...stp);
await tapAt(bx(0.88), by(0.2)); await tapAt(bx(0.78), by(0.12));
const st3 = await p.evaluate(() => window.__ltBoardBtn('stamp', 6));
await tapAt(...st3); await tapAt(bx(0.9), by(0.5));
await p.waitForTimeout(700);
await shot('09-drawing');
const back = await p.evaluate(() => window.__ltBoardBtn('back'));
await tapAt(...back);
await p.waitForTimeout(1200);
await shot('10-back');
// alphabet board: open, trace A (in Spanish), then the number 3
await p.evaluate(() => window.__lt.G.save.lang = 'es');
await tapAt(...(await p.evaluate(() => window.__ltFurnPt('abc'))));
await p.waitForTimeout(900);
let lt = await p.evaluate(() => window.__ltLetters());
await shot('19-letters-start');
const traceAll = async () => { const L2 = await p.evaluate(() => window.__ltLetters()); for (const st of L2.strokes) { await p.mouse.move(...st[0]); await p.mouse.down(); for (let i = 0; i < st.length; i += 2) await p.mouse.move(st[i][0], st[i][1]); await p.mouse.move(...st[st.length - 1]); await p.mouse.up(); } };
await p.mouse.move(...lt.strokes[0][0]); await p.mouse.down(); for (let i = 0; i < lt.strokes[0].length * 0.6; i += 2) await p.mouse.move(...lt.strokes[0][i]); await p.mouse.up();
await p.waitForTimeout(200);
await shot('19b-letters-midstroke');
await tapAt(...lt.grid[0]); await p.waitForTimeout(300);
await traceAll();
await p.waitForTimeout(900);
await shot('20-letters-done');
await tapAt(...lt.tabs[1]); await p.waitForTimeout(300);
lt = await p.evaluate(() => window.__ltLetters());
await tapAt(...lt.grid[3]); await p.waitForTimeout(300);
lt = await p.evaluate(() => window.__ltLetters());
await traceAll();
await p.waitForTimeout(2200);
await shot('21-numbers-done');
// sílabas: families, then build a word
await tapAt(...lt.tabs[2]); await p.waitForTimeout(400);
await shot('21a-silabas-fam');
lt = await p.evaluate(() => window.__ltLetters());
await tapAt(...lt.grid[7]); await p.waitForTimeout(400);
await shot('21b-silabas-word');
for (let n = 0; n < 4; n++) {
  const c2 = await p.evaluate(() => window.__ltSilNext());
  if (!c2) break; await tapAt(...c2); await p.waitForTimeout(250);
}
await p.waitForTimeout(500);
await shot('21c-silabas-done');
await tapAt(...lt.back); await p.waitForTimeout(900);
// shape corner
await tapAt(...(await p.evaluate(() => window.__ltFurnPt('shapetable'))));
await p.waitForTimeout(900);
let sh = await p.evaluate(() => window.__ltShapes());
await shot('22-shapes-start');
for (let i = 0; i < 3; i++) {
  sh = await p.evaluate(() => window.__ltShapes());
  const pc = sh.pieces[i], hole = sh.holes.find(h => h.shape === pc.shape);
  await p.mouse.move(...pc.at); await p.mouse.down(); await p.mouse.move(hole.at[0], hole.at[1], { steps: 6 }); await p.mouse.up();
  await p.waitForTimeout(300);
}
sh = await p.evaluate(() => window.__ltShapes());
const pc3 = sh.pieces[3]; await p.mouse.move(...pc3.at); await p.mouse.down(); await p.mouse.move(pc3.at[0], pc3.at[1] - 60, { steps: 6 });
await shot('23-shapes-drag');
await p.mouse.up();
await p.waitForTimeout(300);
await tapAt(...sh.back); await p.waitForTimeout(900);
await p.evaluate(() => window.__lt.G.save.lang = 'en');
// centros
const toysB = await p.evaluate(() => window.__ltBtn('toys'));
await tapAt(...toysB); await p.waitForTimeout(200);
const mitems = await p.evaluate(() => window.__ltMenu());
await tapAt(...mitems[3]); await p.waitForTimeout(400);
await shot('11a-centros-chart');
let cen = await p.evaluate(() => window.__ltCentros());
await tapAt(...cen.start); await p.waitForTimeout(3500);
await shot('11b-centros-run');
await tapAt(...toysB); await p.waitForTimeout(3500);
await shot('11c-centros-rotate');
await tapAt(...(await p.evaluate(() => window.__ltBtn('cdone'))));
await p.waitForFunction(() => window.__lt.room.phase === 'class', null, { timeout: 30000 });
// story time
const toys = await p.evaluate(() => window.__ltBtn('toys'));
await tapAt(...toys); await p.waitForTimeout(200);
await shot('11-menu');
const items = await p.evaluate(() => window.__ltMenu());
await tapAt(...items[2]);
await p.waitForTimeout(4000);
await tapAt(W / 2, H - 60); await p.waitForTimeout(500); await tapAt(W / 2, H - 60); await p.waitForTimeout(500);
await shot('12-story');
for (let i = 0; i < 5; i++) { await tapAt(W / 2, H - 60); await p.waitForTimeout(400); }
await p.waitForFunction(() => window.__lt.room.phase === 'class', null, { timeout: 30000 });
// snack
await tapAt(...toys); await p.waitForTimeout(200);
await tapAt(...items[1]); await p.waitForTimeout(2600);
await shot('13-snack');
await p.waitForFunction(() => window.__lt.room.phase === 'class', null, { timeout: 30000 });
await tapAt(...toys); await p.waitForTimeout(200);
await tapAt(...items[0]); await p.waitForTimeout(2500);
await shot('14-recess');
await tapAt(...toys); // bell ends recess
await p.waitForFunction(() => window.__lt.room.phase === 'class', null, { timeout: 30000 });
const home = await p.evaluate(() => window.__ltBtn('home'));
await tapAt(...home); await p.waitForTimeout(300); await tapAt(...home); // 🏠 asks first, the second tap goes home
await p.waitForTimeout(2600);
await shot('15-goodbye');
await p.waitForFunction(() => window.__lt.room.phase === 'reward', null, { timeout: 40000 });
await p.waitForTimeout(500);
await shot('16-reward');
await tapAt(W / 2, H / 2);
await p.waitForTimeout(1500);
await shot('17-night');
await tapAt(W / 2, H * 0.58);
await p.waitForTimeout(300);
await tapAt(...(await p.evaluate(() => window.__ltBtn('bell'))));
await waitMorning(40000);
const sb = await p.evaluate(() => window.__ltBtn('stickers'));
await tapAt(...sb); await p.waitForTimeout(400);
await shot('18-stickerbook');
console.log('errors:', errors);
await b.close();
