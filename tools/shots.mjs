// Playwright walkthrough of a whole school day on the Horario: node tools/shots.mjs <outdir> [ipad|phone]
// (serve the repo first, e.g. python3 -m http.server 8123; LT_PORT picks another port)
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
const ev = (fn, arg) => p.evaluate(fn, arg);
const tapAt = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up(); };
const drag = async (a, c) => { await p.mouse.move(a[0], a[1]); await p.mouse.down(); await p.mouse.move((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, { steps: 4 }); await p.mouse.move(c[0], c[1], { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(150); };
const step = (name) => console.log('--', name);
// the day's flow: wait until the current block has settled (kids arrived, nothing pending)
const ready = async (timeout = 40000) => p.waitForFunction(() => { const s = window.__ltSched(), h = window.__ltHint(); return !s.going && !s.pending && !h.busy && ['class', 'activity', 'prep'].includes(h.phase); }, null, { timeout });
const next = async () => { await tapAt(...(await ev(() => window.__ltBtn('next')))); await p.waitForTimeout(300); };
const card = async (id) => { await tapAt(...(await ev((id) => window.__ltCard(id), id))); await p.waitForTimeout(300); };
const choice = async (id) => { const c = await ev((id) => window.__ltChoice(id), id); if (!c) throw new Error('no choice card ' + id); await tapAt(...c); };
const cur = async () => (await ev(() => window.__ltSched())).cur;
const expectBlock = async (id) => { const c = await cur(); if (c !== id) throw new Error(`expected block ${id}, got ${c}`); };

await shot('01-title');
step('decorar');
await tapAt(...(await ev(() => window.__ltBig())));
await p.waitForTimeout(500);
await expectBlock('decorar');
await shot('02a-decorar');
await p.waitForTimeout(3000);
await shot('02a2-decorar-hint');
let tray = await ev(() => window.__ltTray());
// pull a thing out of the tray: up first (a sideways swipe scrolls the tray)
const pull = async (a, c) => { await p.mouse.move(a[0], a[1]); await p.mouse.down(); await p.mouse.move(a[0], a[1] - 30, { steps: 3 }); await p.mouse.move(c[0], c[1], { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250); };
// Temas: one tap decorates the whole room (things pop in one by one)
await tapAt(...tray.items[0]); await p.waitForTimeout(700);
await shot('02a3-theme-popping');
await p.waitForTimeout(3000);
await shot('02a4-theme-oceano');
await ev(() => window.__ltTrayScroll(7)); tray = await ev(() => window.__ltTray());
await tapAt(...tray.items[7]); await p.waitForTimeout(3600);
await shot('02a5-theme-cuentos');
// Piso + Pared: drag things in, tap one to drop it in a free spot
await tapAt(...tray.tabs.floor); await p.waitForTimeout(150);
tray = await ev(() => window.__ltTray());
await shot('02b0-floor-tab');
await pull(tray.items[2], [W * 0.36, H * 0.6]);
await pull(tray.items[1], [W * 0.62, H * 0.52]);
await tapAt(...tray.items[3]); await p.waitForTimeout(200);
await tapAt(...tray.tabs.wall); await p.waitForTimeout(150);
await ev(() => window.__ltTrayScroll(3)); tray = await ev(() => window.__ltTray());
await pull(tray.items[3], [W * 0.75, H * 0.62]); // dropped on the floor: a wall thing snaps up to the wall
await shot('02b-decor');
// select-to-edit: tap a placed thing, then its bubbles (colour, size, trash)
let ids = await ev(() => window.__ltDecoIds());
await tapAt(...(await ev((id) => window.__ltFurnPt(id), ids[ids.length - 3])));
await p.waitForTimeout(300);
tray = await ev(() => window.__ltTray());
if (!tray.sel || !tray.bubbles.size) throw new Error('select-to-edit: no bubbles');
await shot('02b2-select');
await tapAt(...tray.bubbles.color); await p.waitForTimeout(200);
await tapAt(...tray.bubbles.size); await p.waitForTimeout(500);
tray = await ev(() => window.__ltTray());
await shot('02b3-bigger');
await tapAt(...tray.bubbles.del); await p.waitForTimeout(300);
await tapAt(...tray.undo); await p.waitForTimeout(300); // ↶ brings it back
await tapAt(...tray.tabs.colors); await p.waitForTimeout(100);
tray = await ev(() => window.__ltTray());
await tapAt(...tray.items[2]); await tapAt(...tray.items[5]);
await p.waitForTimeout(200);
await shot('02c-paint');
await tapAt(...tray.tabs.desks); await p.waitForTimeout(100);
tray = await ev(() => window.__ltTray());
const dsk = await ev(() => window.__ltDesks());
for (let i = 0; i < dsk.length && i < tray.items.length; i++) if (tray.items[i]) await pull(tray.items[i], dsk[i]);
await p.waitForTimeout(400);
await shot('02d-desks');
// trash: drag a placed thing into the trash can (screenshot while hovering), and a desk supply too
ids = await ev(() => window.__ltDecoIds());
const bean = await ev((id) => window.__ltFurnPt(id), ids[ids.length - 1]);
await p.mouse.move(...bean); await p.mouse.down(); await p.mouse.move(bean[0] + 20, bean[1] + 10, { steps: 3 });
const tr2 = await ev(() => window.__ltTrash());
await p.mouse.move(tr2[0], tr2[1], { steps: 8 });
await shot('02e-trash');
await p.mouse.up(); await p.waitForTimeout(200);
const di = await ev(() => window.__ltDeskItem(4));
await p.mouse.move(...di); await p.mouse.down(); await p.mouse.move(di[0], di[1] - 30, { steps: 3 });
const tr3 = await ev(() => window.__ltTrash());
await p.mouse.move(tr3[0], tr3[1], { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);

step('trabajo de la mañana');
await next();
await expectBlock('manana');
await p.waitForTimeout(1500);
await shot('02f-arrive');
await ready();
await p.waitForTimeout(400);
await shot('03-manana');
await p.waitForTimeout(3600);
await shot('03b-hint');
// morning work: the whiteboard
await choice('pizarra');
await p.waitForTimeout(900);
await shot('08-board');
const bb = await ev(() => { const lt = window.__lt; const r = lt.board.rect(); const v = lt.board.view; const k = v.s / lt.G.dpr; return { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k }; });
const draw = async (pts) => { await p.mouse.move(...pts[0]); await p.mouse.down(); for (const q of pts.slice(1)) await p.mouse.move(q[0], q[1], { steps: 4 }); await p.mouse.up(); };
const bx = (u) => bb.x + u * bb.w, by = (v) => bb.y + v * bb.h;
const circle = []; for (let a = 0; a <= 6.4; a += 0.3) circle.push([bx(0.25) + Math.cos(a) * bb.w * 0.09, by(0.35) + Math.sin(a) * bb.w * 0.09]);
await draw(circle);
await draw([[bx(0.5), by(0.75)], [bx(0.5), by(0.45)], [bx(0.62), by(0.3)], [bx(0.74), by(0.45)], [bx(0.74), by(0.75)], [bx(0.5), by(0.75)]]);
await tapAt(...(await ev(() => window.__ltBoardBtn('marker', 4))));
await draw([[bx(0.1), by(0.9)], [bx(0.3), by(0.85)], [bx(0.5), by(0.9)], [bx(0.7), by(0.85)], [bx(0.9), by(0.9)]]);
await tapAt(...(await ev(() => window.__ltBoardBtn('stamp', 0))));
await tapAt(bx(0.88), by(0.2)); await tapAt(bx(0.78), by(0.12));
await tapAt(...(await ev(() => window.__ltBoardBtn('stamp', 6)))); await tapAt(bx(0.9), by(0.5));
await p.waitForTimeout(700);
await shot('09-drawing');
await tapAt(...(await ev(() => window.__ltBoardBtn('back'))));
await p.waitForTimeout(1500);
await shot('10-back');
// and the numbers
const traceAll = async () => { const L2 = await ev(() => window.__ltLetters()); for (const st of L2.strokes) { await p.mouse.move(...st[0]); await p.mouse.down(); for (let i = 0; i < st.length; i += 2) await p.mouse.move(st[i][0], st[i][1]); await p.mouse.move(...st[st.length - 1]); await p.mouse.up(); } };
await choice('numeros'); await p.waitForTimeout(900);
let lt = await ev(() => window.__ltLetters());
await tapAt(...lt.grid[3]); await p.waitForTimeout(300);
await traceAll();
await p.waitForTimeout(2200);
await shot('21-numbers-done');
await tapAt(...lt.back); await p.waitForTimeout(1000);
await shot('03c-manana-done');

step('calendario');
await next();
await expectBlock('calendario');
await p.waitForTimeout(500);
await shot('04-daycard');
await p.waitForFunction(() => window.__ltWeather?.(), null, { timeout: 20000 });
await shot('04f-weather');
await tapAt(...(await ev(() => window.__ltWeather()))[0]);
await ready();
await p.waitForTimeout(500);
await shot('04g-calendario');
await ev(() => window.__lt.students.forEach(s => { s.sleep = false; s.hide = 0; }));
for (const f of await ev(() => window.__ltFaces())) { await tapAt(...f); await p.waitForTimeout(250); }
await p.waitForTimeout(1600);
await shot('04h-attendance');
await choice('ayudantes'); await p.waitForTimeout(500);
await shot('04i-jobs');
const jobs = await ev(() => window.__ltJobs());
if (jobs) { await tapAt(...jobs.done); await p.waitForTimeout(500); }
await choice('emociones'); await p.waitForTimeout(2000);
const pickOpt = async (right) => {
  const info = await ev((right) => { const o = window.__ltQuiz(); const Q = window.__ltQuizQ(); if (!o || !Q) return null; const st = Q.steps[Q.i]; const k = st.options.findIndex(x => x.right === right); return k >= 0 ? o.opts[k] : null; }, right);
  if (info) await tapAt(...info);
};
await shot('04c-feelings-1');
await pickOpt(true); await p.waitForTimeout(1500);
await shot('04d-feelings-2');
await pickOpt(true); await p.waitForTimeout(1500);
await shot('04e-feelings-done');
await p.waitForTimeout(4000);
await shot('04j-calendario-done');

step('alfabeto');
await next(); await ready();
await expectBlock('alfabeto');
await shot('19a-alfabeto');
await choice('letras'); await p.waitForTimeout(900);
lt = await ev(() => window.__ltLetters());
await shot('19-letters-start');
await p.mouse.move(...lt.strokes[0][0]); await p.mouse.down(); for (let i = 0; i < lt.strokes[0].length * 0.6; i += 2) await p.mouse.move(...lt.strokes[0][i]); await p.mouse.up();
await p.waitForTimeout(200);
await shot('19b-letters-midstroke');
await tapAt(...lt.grid[0]); await p.waitForTimeout(300);
await traceAll();
await p.waitForTimeout(900);
await shot('20-letters-done');
await tapAt(...lt.back); await p.waitForTimeout(900);

step('recreo');
await next();
await p.waitForFunction(() => window.__lt.yard.isOpen, null, { timeout: 40000 }); await p.waitForTimeout(3500);
await expectBlock('recreo');
await shot('14-recess');
await tapAt(...(await ev(() => window.__ltYard().pts.whistle))); // the whistle ends recess
await p.waitForFunction(() => !window.__lt.yard.isOpen && window.__lt.room.phase === 'class', null, { timeout: 40000 });
await ready();

step('lectura');
await next();
await p.waitForFunction(() => window.__ltStory() && window.__ltStory().stage === 'choose', null, { timeout: 30000 });
await expectBlock('lectura');
await shot('12a-story-choose');
await tapAt(...(await ev(() => window.__ltStory().covers[0]))); await p.waitForTimeout(1200);
await tapAt(...(await ev(() => window.__ltStory().book_pt))); await p.waitForTimeout(900);
await shot('12-story');
for (let i = 0; i < 6 && await ev(() => !!window.__ltStory()); i++) { const bp = await ev(() => window.__ltStory() && window.__ltStory().book_pt); if (bp) await tapAt(...bp); await p.waitForTimeout(900); }
await p.waitForFunction(() => window.__lt.room.phase === 'class', null, { timeout: 30000 });
await ready();
await shot('12b-lectura-done');

step('heggerty');
await next(); await ready();
await expectBlock('heggerty');
await choice('silabas'); await p.waitForTimeout(600);
await shot('21a-silabas-fam');
lt = await ev(() => window.__ltLetters());
await tapAt(...lt.grid[7]); await p.waitForTimeout(400);
await shot('21b-silabas-word');
for (let n = 0; n < 4; n++) { const c2 = await ev(() => window.__ltSilNext()); if (!c2) break; await tapAt(...c2); await p.waitForTimeout(250); }
await p.waitForTimeout(500);
await shot('21c-silabas-done');
await tapAt(...lt.back); await p.waitForTimeout(900);

step('sla');
await next(); await ready();
await expectBlock('sla');
await shot('22a-sla');
await choice('figuras'); await p.waitForTimeout(900);
let sh = await ev(() => window.__ltShapes());
await shot('22-shapes-start');
for (let i = 0; i < 3; i++) {
  sh = await ev(() => window.__ltShapes());
  const pc = sh.pieces[i], hole = sh.holes.find(h => h.shape === pc.shape);
  await p.mouse.move(...pc.at); await p.mouse.down(); await p.mouse.move(hole.at[0], hole.at[1], { steps: 6 }); await p.mouse.up();
  await p.waitForTimeout(300);
}
sh = await ev(() => window.__ltShapes());
const pc3 = sh.pieces[3]; await p.mouse.move(...pc3.at); await p.mouse.down(); await p.mouse.move(pc3.at[0], pc3.at[1] - 60, { steps: 6 });
await shot('23-shapes-drag');
await p.mouse.up(); await p.waitForTimeout(300);
await tapAt(...sh.back); await p.waitForTimeout(1200);
// class life during a lesson: a question, a gold star, red + green cards, moving furniture
await ev(() => window.__ltAsk(3));
await p.waitForTimeout(700);
await shot('04a-question');
await pickOpt(false); await p.waitForTimeout(600);
await shot('04b-question-wrong');
await pickOpt(true); await p.waitForTimeout(1600);
let pts = await ev(() => window.__ltDeskPts());
const star = await ev(() => window.__ltBtn('star'));
await p.mouse.move(star[0], star[1]); await p.mouse.down();
await p.mouse.move((star[0] + pts[1][0]) / 2, (star[1] + pts[1][1]) / 2, { steps: 5 });
await p.mouse.move(pts[1][0], pts[1][1], { steps: 5 });
await shot('05-dragstar');
await p.mouse.up(); await p.waitForTimeout(500);
await shot('06-starglow');
await ev(() => window.__ltNaughty(4));
await p.waitForTimeout(700);
await shot('06a-naughty');
pts = await ev(() => window.__ltDeskPts());
await drag(await ev(() => window.__ltBtn('cardRed')), pts[4]); await p.waitForTimeout(500);
await shot('06b-redcard');
await drag(await ev(() => window.__ltBtn('cardGreen')), pts[3]); await p.waitForTimeout(500);
await shot('06c-greencard');
const plant = await ev(() => window.__ltFurn('plant'));
await p.mouse.move(plant[0], plant[1]); await p.mouse.down(); await p.mouse.move(plant[0] - 200, plant[1] - 60, { steps: 8 }); await p.mouse.up();
await p.waitForTimeout(300);
await shot('07-moved');
// knock knock (only in calm blocks after 20 s): a parcel
await p.waitForFunction(() => window.__ltSched().calm, null, { timeout: 30000 });
await ev(() => window.__ltKnock('parcel'));
await p.waitForFunction(() => window.__ltDoor().door?.knock?.n > 0, null, { timeout: 20000 }).catch(() => console.log('(no knock)'));
await shot('07b-knock');
await tapAt(...(await ev(() => window.__ltDoor().pt))); await p.waitForTimeout(1200);
const parcel = await ev(() => window.__ltDoor().parcel);
if (parcel) { await tapAt(...parcel); await p.waitForTimeout(1200); }
await shot('07c-parcel');

step('centros');
await next();
await p.waitForFunction(() => window.__ltCentros()?.stage === 'chart', null, { timeout: 30000 });
await expectBlock('centros');
await shot('11a-centros-chart');
await tapAt(...(await ev(() => window.__ltCentros().start))); await p.waitForTimeout(3500);
await shot('11b-centros-run');
await tapAt(...(await ev(() => window.__ltBtn('toys')))); await p.waitForTimeout(3500);
await shot('11c-centros-rotate');
await tapAt(...(await ev(() => window.__ltBtn('cdone'))));
await p.waitForFunction(() => window.__lt.room.phase === 'class', null, { timeout: 30000 });

step('almuerzo');
await next();
await p.waitForFunction(() => !!window.__ltSnack(), null, { timeout: 30000 }); await p.waitForTimeout(1500);
await expectBlock('almuerzo');
pts = await ev(() => window.__ltDeskPts());
for (let j = 0; j < pts.length; j++) { const sn = await ev(() => window.__ltSnack()); const sl = sn && sn.slots.find(s => s); if (!sl) break; await tapAt(...sl); await p.waitForTimeout(150); await tapAt(...pts[j]); await p.waitForTimeout(500); if (j === 1) await shot('13-snack'); }
{ const sv = await ev(() => window.__ltSnack()); if (sv && sv.served !== pts.length) throw new Error(`served ${sv.served} of ${pts.length} friends`); } // everyone in the class gets one
await p.waitForTimeout(700);
await shot('13b-snack-all');
await p.waitForFunction(() => !window.__ltSnack() || window.__ltSnack().done, null, { timeout: 30000 });
await p.waitForFunction(() => window.__lt.room.phase === 'class', null, { timeout: 30000 });

step('lector misterioso');
await next();
await p.waitForFunction(() => window.__ltGuest()?.stage === 'knock' && window.__ltDoor().pt, null, { timeout: 30000 });
await p.waitForTimeout(1500);
await shot('24a-lector-knock');
await tapAt(...(await ev(() => window.__ltDoor().pt)));
await p.waitForTimeout(1600);
await shot('24b-lector-enter');
await p.waitForFunction(() => window.__ltStory()?.book_pt, null, { timeout: 30000 });
await p.waitForTimeout(600);
await shot('24c-lector-reads');
for (let i = 0; i < 6 && await ev(() => !!window.__ltStory()); i++) { const bp = await ev(() => window.__ltStory() && window.__ltStory().book_pt); if (bp) await tapAt(...bp); await p.waitForTimeout(900); }
await p.waitForTimeout(800);
await shot('24d-lector-bye');
await p.waitForFunction(() => !window.__ltGuest(), null, { timeout: 30000 });

step('casa');
await next(); await p.waitForTimeout(400);
await shot('15a-casa-ask');
await next();
await p.waitForTimeout(2600);
await shot('15-goodbye');
await p.waitForFunction(() => window.__lt.room.phase === 'reward', null, { timeout: 60000 });
await p.waitForTimeout(500);
await shot('16-reward');
await tapAt(W / 2, H / 2);
await p.waitForTimeout(1500);
await shot('17-night');
await tapAt(...(await ev(() => window.__ltStick()))); await p.waitForTimeout(400);
await shot('18-stickerbook');
await tapAt(...(await ev(() => window.__ltBtn('help')))); // outside the book closes it
await p.waitForTimeout(300);

step('a new day: jump straight from Decorar to Recreo');
await tapAt(...(await ev(() => window.__ltBig())));
await p.waitForTimeout(500);
await expectBlock('decorar');
await card('recreo');
await p.waitForTimeout(1200);
await shot('25a-jump-arrive');
await p.waitForFunction(() => window.__lt.yard.isOpen, null, { timeout: 60000 }); await p.waitForTimeout(1500);
await expectBlock('recreo');
await shot('25b-jump-recess');
await tapAt(...(await ev(() => window.__ltYard().pts.whistle)));
await p.waitForFunction(() => !window.__lt.yard.isOpen && window.__lt.room.phase === 'class', null, { timeout: 40000 });
await ready();
await card('calendario'); // leaves recess, kids back to their desks, then circle time
await p.waitForFunction(() => window.__ltWeather?.() || window.__ltSched().cur === 'calendario' && !window.__ltHint().busy, null, { timeout: 30000 });
const wpics = await ev(() => window.__ltWeather?.());
if (wpics) await tapAt(...wpics[1]);
await ready();
await shot('25c-jump-calendario');

console.log('errors:', errors);
await b.close();
if (errors.length) process.exit(1);
