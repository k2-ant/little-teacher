// v2.6 check of the "little one" mode: node tools/little-check.mjs <outdir>  (serve the repo first: python3 -m http.server 8123)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1, hasTouch: true });
const p = await ctx.newPage();
p.on('pageerror', e => { console.log('PAGEERROR', String(e)); process.exitCode = 1; });
await p.goto(`http://localhost:${process.env.LT_PORT || 8123}/index.html?fast`); await p.waitForTimeout(800);
const ev = (fn, a) => p.evaluate(fn, a);
const tap = async (x, y, w = 250) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(w); };
const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });
const ready = () => p.waitForFunction(() => { const s = window.__ltSched(), h = window.__ltHint(); return !s.going && !s.pending && !h.busy && h.phase === 'class'; }, null, { timeout: 40000 });
// the switch on the teacher's card
let w = await ev(() => window.__ltWho()); await tap(...w.btn);
w = await ev(() => window.__ltWho()); await tap(...w.tot); await shot('who-little');
if (!(await ev(() => window.__ltWho().little))) throw new Error('the little-one switch did not turn on');
await tap(...w.cards[0]);
await p.mouse.move(600, 300); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(60); await shot('sparkle');
await tap(...(await ev(() => window.__ltBig()))); await ready(); await p.waitForTimeout(400); await shot('class');
if (await ev(() => !!window.__ltBtn('cardRed'))) console.log('note: red card rect still reported (hidden buttons keep their rect)');
// a question has two pictures
await tap(...(await ev(() => window.__ltCard('calendario'))));
for (let i = 0; i < 30; i++) { // the day card, then the weather pictures: tap through them
  const ok = await ev(() => { const s = window.__ltSched(), h = window.__ltHint(); return s.cur === 'calendario' && !s.going && !s.pending && !h.busy && !h.dayCard && h.phase === 'class'; });
  if (ok && i > 3) break;
  await tap(560, 400, 700);
}
for (let i = 0; i < 40 && !(await ev(() => window.__ltQuizQ && window.__ltQuizQ())); i++) { await ev(() => window.__ltChoice && null); const c = await ev(() => window.__ltChoice('emociones')); if (c) await tap(...c, 600); else await p.waitForTimeout(400); }
const n = await ev(() => { const Q = window.__ltQuizQ(); return Q ? Q.steps.map(s => s.options.length) : null; });
console.log('question options per step:', JSON.stringify(n)); await shot('question');
if (!n || n.some(k => k > 2)) throw new Error('a little one should get two choices');
await b.close();
console.log('little-check ok');
