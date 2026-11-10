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
// v2.1: ▶ Play starts the day where the class comes in (Trabajo de la mañana); Decorar is an optional card
step('trabajo de la mañana: the class walks in');
await tapAt(...(await ev(() => window.__ltBig())));
await p.waitForTimeout(300);
await expectBlock('manana');
await p.waitForTimeout(1200);
await shot('02-arrive');
await ready();
await p.waitForTimeout(400);
await shot('03-manana');
await p.waitForTimeout(3600);
await shot('03b-hint');
// the teacher answers every tap: a twirl, a wave, or a wave to the class (and they wave back)
const teacherReacts = [];
for (let i = 0; i < 4; i++) {
  const tp = await ev(() => window.__ltTeach().pts[2]);
  await tapAt(...tp); await p.waitForTimeout(140);
  const t = await ev(() => window.__ltTeach());
  if (!t.act) throw new Error('the teacher did not react to a tap');
  teacherReacts.push(t.last);
  await shot(`03t${i}-teacher-${t.last}`);
  await p.waitForTimeout(700);
}
console.log('teacher reactions:', teacherReacts.join(' '));
if (new Set(teacherReacts).size < 2) throw new Error('the teacher always reacts the same way');
// morning work: the whiteboard (the room's hints stay quiet while it's open)
await choice('pizarra');
await p.waitForTimeout(900);
await shot('08-board');
await p.waitForTimeout(4500); // ~18 s of game time: the room would have pointed at ▶ by now
{ const h = await ev(() => window.__ltHint()); if (h.hint) throw new Error('a classroom hint showed while the board was open: ' + h.hint.key); }
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
// and the numbers: a stroke left halfway gets a nudge; the ★ row counts when tapped
const traceAll = async () => { const L2 = await ev(() => window.__ltLetters()); for (const st of L2.strokes) { await p.mouse.move(...st[0]); await p.mouse.down(); for (let i = 0; i < st.length; i += 2) await p.mouse.move(st[i][0], st[i][1]); await p.mouse.move(...st[st.length - 1]); await p.mouse.up(); } };
await choice('numeros'); await p.waitForTimeout(900);
let lt = await ev(() => window.__ltLetters());
await tapAt(...lt.grid[3]); await p.waitForTimeout(300);
lt = await ev(() => window.__ltLetters());
await tapAt(...lt.pic); await p.waitForTimeout(450);
await shot('21s-numbers-star-tap');
await p.waitForTimeout(800);
{ const l3 = await ev(() => window.__ltLetters()); if (l3.starTaps < 2) throw new Error('tapping the stars did not count them'); }
await p.mouse.move(...lt.strokes[0][0]); await p.mouse.down(); for (let i = 0; i < lt.strokes[0].length * 0.5; i += 2) await p.mouse.move(...lt.strokes[0][i]); await p.mouse.up();
await p.waitForTimeout(1250); // ~5 s of game time with her finger up
await shot('21n-numbers-nudge');
await tapAt(...lt.grid[3]); await p.waitForTimeout(300);
await traceAll();
await p.waitForTimeout(2200);
await shot('21-numbers-done');
await tapAt(...lt.back); await p.waitForTimeout(1000);
await shot('03c-manana-done');

step('decorar (optional, with the class watching)');
await card('decorar');
await p.waitForFunction(() => window.__ltTray(), null, { timeout: 20000 });
await expectBlock('decorar');
await p.waitForTimeout(400);
await shot('02a-decorar');
await p.waitForTimeout(3000);
await shot('02a2-decorar-hint');
let tray = await ev(() => window.__ltTray());
// pull a thing out of the tray: up first (a sideways swipe scrolls the tray)
const pull = async (a, c, mid) => { await p.mouse.move(a[0], a[1]); await p.mouse.down(); await p.mouse.move(a[0], a[1] - 30, { steps: 3 }); await p.mouse.move(c[0], c[1], { steps: 6 }); if (mid) { await p.waitForTimeout(200); await shot(mid); } await p.mouse.up(); await p.waitForTimeout(250); };
// the tray tucks down to its tabs after she places something: tap its handle to bring it back up
const untuck = async () => { const t = await ev(() => window.__ltTray()); if (t && t.tucked) { await tapAt(...t.handle); await p.waitForTimeout(250); } const t2 = await ev(() => window.__ltTray()); if (t2.tucked) throw new Error('the tray did not come back up'); return t2; };
const expectTucked = async (why) => { await p.waitForTimeout(150); const t = await ev(() => window.__ltTray()); if (!t.tucked) throw new Error('the tray should be tucked: ' + why); return t; };
// Temas: one tap decorates the whole room (things pop in one by one)
await tapAt(...tray.items[0]); await p.waitForTimeout(700);
await shot('02a3-theme-popping');
await p.waitForTimeout(3000);
await expectTucked('after a theme');
await shot('02a4-theme-oceano'); // the tray tucked down to its tabs: the whole room and the class show
await untuck();
await ev(() => window.__ltTrayScroll(7)); tray = await ev(() => window.__ltTray());
await tapAt(...tray.items[7]); await p.waitForTimeout(3600);
await shot('02a5-theme-cuentos');
// Piso + Pared: drag things in, tap one to drop it in a free spot (a tab on the tucked tray brings it back up on that tab)
tray = await ev(() => window.__ltTray());
await tapAt(...tray.tabs.floor); await p.waitForTimeout(250);
tray = await ev(() => window.__ltTray());
if (tray.tucked || tray.tab !== 'floor') throw new Error('a tab on the tucked tray should open it on that tab');
await shot('02b0-floor-tab');
await pull(tray.items[2], [W * 0.36, H * 0.6], '02b0b-dragging-tucked'); // while dragging, the tray is down to its tabs
tray = await expectTucked('after dropping a thing');
await shot('02b0c-placed-tucked');
tray = await untuck();
await pull(tray.items[1], [W * 0.62, H * 0.52]);
tray = await untuck();
await tapAt(...tray.items[3]); await p.waitForTimeout(200);
tray = await expectTucked('after a tap-to-place');
await tapAt(...tray.tabs.wall); await p.waitForTimeout(250);
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
tray = await ev(() => window.__ltTray());
await tapAt(...tray.tabs.colors); await p.waitForTimeout(250);
tray = await ev(() => window.__ltTray());
await tapAt(...tray.items[2]); await tapAt(...tray.items[5]);
await p.waitForTimeout(200);
await shot('02c-paint');
await tapAt(...tray.tabs.desks); await p.waitForTimeout(250);
tray = await ev(() => window.__ltTray());
const dsk = await ev(() => window.__ltDesks());
for (let i = 0; i < dsk.length && i < tray.items.length; i++) { tray = await untuck(); if (tray.items[i]) await pull(tray.items[i], dsk[i]); }
await p.waitForTimeout(400);
await shot('02d-desks');
// trash: drag a placed thing into the trash can (screenshot while hovering), and a desk supply too
ids = await ev(() => window.__ltDecoIds());
const bean = await ev((id) => window.__ltFurnPt(id), ids[ids.length - 1]);
await p.mouse.move(...bean); await p.mouse.down(); await p.mouse.move(bean[0] + 20, bean[1] + 10, { steps: 3 }); await p.waitForTimeout(200);
const tr2 = await ev(() => window.__ltTrash());
await p.mouse.move(tr2[0], tr2[1], { steps: 8 });
await shot('02e-trash');
await p.mouse.up(); await p.waitForTimeout(200);
const di = await ev(() => window.__ltDeskItem(4));
await p.mouse.move(...di); await p.mouse.down(); await p.mouse.move(di[0], di[1] - 30, { steps: 3 }); await p.waitForTimeout(200);
const tr3 = await ev(() => window.__ltTrash());
await p.mouse.move(tr3[0], tr3[1], { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
// ▶ goes back to the block she was in
await next(); await ready();
await expectBlock('manana');
await shot('02f-back-to-manana');

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
await pickOpt(true); await p.waitForTimeout(250);
await shot('04c2-feelings-right');
await p.waitForTimeout(1250);
await shot('04d-feelings-2');
await pickOpt(true); await p.waitForTimeout(450);
await shot('04e-feelings-done');
await p.waitForTimeout(450);
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
// tap-then-tap: tap a shape (it glows and bobs), a wrong hole wiggles it (it stays picked), then its own hole
{
  const pc = sh.pieces[0], right = sh.holes.findIndex(h => h.shape === pc.shape), wrong = sh.holes.findIndex(h => h.shape !== pc.shape);
  await tapAt(...pc.at); await p.waitForTimeout(250);
  sh = await ev(() => window.__ltShapes());
  if (sh.sel !== 0) throw new Error('tapping a shape should pick it up');
  await shot('22b-shapes-picked');
  await tapAt(...sh.holes[wrong].at); await p.waitForTimeout(60);
  await shot('22c-shapes-wrong-hole');
  sh = await ev(() => window.__ltShapes());
  if (sh.sel !== 0 || sh.pieces[0].placed) throw new Error('a wrong hole should keep the shape picked');
  await tapAt(...sh.holes[right].at); await p.waitForTimeout(350);
  sh = await ev(() => window.__ltShapes());
  if (!sh.pieces[0].placed || sh.sel !== -1) throw new Error('tap-then-tap did not place the shape');
  await shot('22d-shapes-tap-placed');
  // tap a shape, then tap the table between the box and the shapes: it's put back
  await tapAt(...sh.pieces[1].at); await p.waitForTimeout(150);
  await tapAt(sh.back[0], (sh.pieces[1].at[1] + sh.holes[0].at[1]) / 2); await p.waitForTimeout(150);
  if ((await ev(() => window.__ltShapes())).sel !== -1) throw new Error('a tap elsewhere should put the shape back');
}
for (let i = 1; i < 3; i++) {
  sh = await ev(() => window.__ltShapes());
  const pc = sh.pieces[i], hole = sh.holes.find(h => h.shape === pc.shape);
  // a sloppy drop (well below the hole, ~70% of the snap radius) still finds the right hole
  const off = i === 2 ? sh.snap * 0.7 : 0;
  await p.mouse.move(...pc.at); await p.mouse.down(); await p.mouse.move(hole.at[0], hole.at[1] + off, { steps: 6 }); await p.mouse.up();
  await p.waitForTimeout(300);
  if (!(await ev((i) => window.__ltShapes().pieces[i].placed, i))) throw new Error('drag-and-drop did not place shape ' + i);
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
await ev(() => { window.__ltSaid = []; });
const qWord = await ev(() => { const Q = window.__ltQuizQ(); return Q.steps[Q.i].options.find(o => o.right).say; });
await pickOpt(true); await p.waitForTimeout(120);
await shot('04b2-question-right-pop');
await p.waitForTimeout(250);
await shot('04b3-question-right');
await p.waitForTimeout(350);
await shot('04b4-question-echo');
await p.waitForFunction(() => !window.__ltHint().q, null, { timeout: 10000 });
{ // the word, the praise, the word again
  const said = (await ev(() => window.__ltSaid)).map(l => l.split(': ').slice(1).join(': '));
  const i1 = said.indexOf(qWord), i2 = said.indexOf('¡Eso es!', i1), i3 = said.indexOf(qWord, i2);
  console.log('   quiz said:', said.join(' | '));
  if (i1 < 0 || i2 < 0 || i3 < 0) throw new Error('a right answer should say the word, the praise, then the word again');
}
await ev(() => { delete window.__ltSaid; });
await p.waitForTimeout(300);
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
// the hint for a naughty friend: the hand holds the red card (its ring fills), then carries it over
await tapAt(...(await ev(() => window.__ltBtn('help')))); await p.waitForTimeout(90);
{ const h = await ev(() => window.__ltHint()); console.log('   hint:', h.hint && h.hint.key); if (h.hint && h.hint.key === 'naughty') { await shot('06a2-redcard-hint-hold'); await p.waitForTimeout(250); await shot('06a3-redcard-hint-carry'); } }
// the red card needs a short hold (0.6 s): a quick tap only says its name
const red = await ev(() => window.__ltBtn('cardRed'));
await tapAt(...red); await p.waitForTimeout(200);
if (await ev(() => window.__ltArmed())) throw new Error('a quick tap should not pick up the red card');
await p.mouse.move(...red); await p.mouse.down(); await p.waitForTimeout(330);
await shot('06a4-redcard-holding');
await p.waitForTimeout(400); await p.mouse.up(); await p.waitForTimeout(100);
if (await ev(() => window.__ltArmed()) !== 'cardRed') throw new Error('holding the red card should pick it up');
await shot('06a5-redcard-picked');
pts = await ev(() => window.__ltDeskPts());
await tapAt(...pts[4]); await p.waitForTimeout(500);
if (await ev(() => window.__ltCardOf(4)) !== 'red') throw new Error('the picked-up red card did not reach the friend');
await shot('06b-redcard');
// hold, then drag it onto a friend
await ev(() => window.__ltNaughty(5)); await p.waitForTimeout(300);
await p.mouse.move(...red); await p.mouse.down(); await p.waitForTimeout(750);
await p.mouse.move((red[0] + pts[5][0]) / 2, (red[1] + pts[5][1]) / 2, { steps: 4 }); await p.mouse.move(...pts[5], { steps: 4 });
await shot('06b2-redcard-drag');
await p.mouse.up(); await p.waitForTimeout(500);
if (await ev(() => window.__ltCardOf(5)) !== 'red') throw new Error('dragging the red card after a hold did not give it');
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
{ // tap-then-tap: tap a face (it glows and bobs), then tap another column
  let cs = await ev(() => window.__ltCentros());
  const f = cs.faces[0], to = (f.ci + 1) % 4;
  await tapAt(...f.at); await p.waitForTimeout(250);
  cs = await ev(() => window.__ltCentros());
  if (cs.sel !== f.kind) throw new Error('tapping a face should pick it up');
  await shot('11a2-centros-face-picked');
  await tapAt(...cs.cols[to]); await p.waitForTimeout(300);
  cs = await ev(() => window.__ltCentros());
  if (cs.assign[f.kind] !== to || cs.sel) throw new Error('tapping a column should move the picked face there');
  await shot('11a3-centros-face-moved');
  // and drag still works: another face goes to the first face's old column
  const g = cs.faces.find(q => q.kind !== f.kind && q.ci !== f.ci) || cs.faces[1];
  await drag(g.at, cs.cols[f.ci]);
  cs = await ev(() => window.__ltCentros());
  if (cs.assign[g.kind] !== f.ci) throw new Error('dragging a face did not move it');
}
await tapAt(...(await ev(() => window.__ltCentros().start)));
await p.waitForFunction(() => window.__ltCentros()?.arrived, null, { timeout: 30000 }); await p.waitForTimeout(600);
await shot('11b-centros-run');
// v2.1: each centro wants the teacher: tap its sign (or a friend there), she hops over, a friend asks a question
const centrosRound = async (round) => {
  for (let n = 0; n < 4; n++) {
    const cs = await ev(() => window.__ltCentros());
    const ci = cs.wants.findIndex(Boolean);
    if (ci < 0) break;
    // the first visit of a round taps a friend standing there, the rest tap the sign
    await tapAt(...(n === 0 && cs.kids[ci] ? cs.kids[ci] : cs.signs[ci]));
    await p.waitForTimeout(150);
    if (round === 1 && n === 0) await shot('11c-centros-walk');
    await p.waitForFunction(() => window.__ltCentros()?.quizReady, null, { timeout: 20000 });
    await p.waitForTimeout(300);
    if (round === 1 && n < 2) await shot(`11d-centros-question-${ci}`);
    const kind = await ev(() => { const Q = window.__ltQuizQ(); return Q.steps[0].prompt; });
    console.log('   centro', ci, 'asks', kind);
    await pickOpt(false); await p.waitForTimeout(1300); // a miss: "Mmm... creo que no." and the right one glows
    await pickOpt(true);
    await p.waitForFunction((ci) => window.__ltCentros()?.visited[ci], ci, { timeout: 20000 });
    await p.waitForTimeout(700);
    if (round === 1 && n === 0) await shot(`11e-centros-reward-${ci}`);
  }
  const cs = await ev(() => window.__ltCentros());
  if (!cs.visited.every(Boolean)) throw new Error('not every centro visited: ' + JSON.stringify(cs.visited));
  await p.waitForFunction(() => window.__ltCentros()?.bellGlow, null, { timeout: 20000 });
};
await centrosRound(1);
await p.waitForTimeout(300);
await shot('11f-centros-all-cheer');
await p.waitForTimeout(2500);
await shot('11g-centros-all-done');
await tapAt(...(await ev(() => window.__ltBtn('toys'))));
await p.waitForFunction(() => window.__ltCentros()?.arrived && !window.__ltCentros().allDone, null, { timeout: 30000 }); await p.waitForTimeout(600);
await shot('11h-centros-rotate');
await centrosRound(2);
await p.waitForTimeout(2500);
await shot('11i-centros-round2');
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

step('a new day: tap Recreo while the class walks in');
await tapAt(...(await ev(() => window.__ltBig())));
await p.waitForTimeout(500);
await expectBlock('manana');
await card('recreo'); // waits until everyone has arrived, then goes
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
