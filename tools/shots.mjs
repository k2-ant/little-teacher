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
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto('http://localhost:8123/index.html?fast');
await p.waitForTimeout(800);
const W = ctxOpts.viewport.width, H = ctxOpts.viewport.height;
const shot = async (n) => p.screenshot({ path: `${out}/${which}-${n}.png` });
await shot('01-title');
// helpers to convert logical coords of the active view to css px
const L = async (fn) => p.evaluate(fn);
const tapAt = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up(); };
const cssOf = async (scene, x, y) => p.evaluate(([scene, x, y]) => { const v = window.__lt[scene].view; return [x * v.s / window.__lt.G.dpr, y * v.s / window.__lt.G.dpr]; }, [scene, x, y]);
await tapAt(W / 2, H * 0.58);
await p.waitForTimeout(1600);
await shot('02-morning');
await p.waitForFunction(() => window.__lt.room.phase === 'class', null, { timeout: 30000 });
await p.waitForTimeout(400);
await shot('03-class');
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
// drag a gold star onto the first student
const star = await p.evaluate(() => window.__ltBtn('star'));
await p.mouse.move(star[0], star[1]); await p.mouse.down();
await p.mouse.move((star[0] + pts[1][0]) / 2, (star[1] + pts[1][1]) / 2, { steps: 5 });
await p.mouse.move(pts[1][0], pts[1][1], { steps: 5 });
await shot('05-dragstar');
await p.mouse.up();
await p.waitForTimeout(500);
await shot('06-starglow');
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
await tapAt(...home);
await p.waitForTimeout(2600);
await shot('15-goodbye');
await p.waitForFunction(() => window.__lt.room.phase === 'reward', null, { timeout: 40000 });
await p.waitForTimeout(500);
await shot('16-reward');
await tapAt(W / 2, H / 2);
await p.waitForTimeout(1500);
await shot('17-night');
await tapAt(W / 2, H * 0.58);
await p.waitForFunction(() => window.__lt.room.phase === 'class', null, { timeout: 40000 });
const sb = await p.evaluate(() => window.__ltBtn('stickers'));
await tapAt(...sb); await p.waitForTimeout(400);
await shot('18-stickerbook');
console.log('errors:', errors);
await b.close();
