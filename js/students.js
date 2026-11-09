import { G, rand, pick } from './state.js';
import { KINDS, PAL } from './sprites.js';
import { say, sfx, playClip } from './audio.js';
import { tr, lang } from './i18n.js';

export function makeStudents() {
  return KINDS.map((kind, i) => ({
    kind, idx: i, desk: i,
    mode: 'away', // away | walk | seated | stand | held
    x: 0, y: 0, z: 0, vz: 0,
    target: null, onArrive: null, speed: 42,
    act: null, blink: 0, blinkT: rand(1, 4), look: 0,
    here: false, sleep: false, sleepT: rand(14, 26),
    hide: 0, hideT: 0, wanderT: rand(18, 30), giggleT: rand(7, 14), raiseT: rand(3, 7),
    glowT: 0, bubble: null, stepT: 0, snack: null, stars: 0, tapCount: 0,
  }));
}

export function act(s, name, dur = 1.2) { s.act = { name, t0: G.time, dur }; }
export function acting(s, name) { return s.act && s.act.name === name && G.time < s.act.t0 + s.act.dur; }
export function hop(s, v = 70) { if (s.z <= 0.01) s.vz = v; }
export function talk(s, kind, dur = 1.4) { s.bubble = { kind, until: G.time + dur }; }

const VOICE = { bunny: 1.85, puppy: 1.45, turtle: 1.15, owl: 1.35, frog: 1.7 };
const SQUEAK = { bunny: 1.35, puppy: 1.0, turtle: 0.8, owl: 1.1, frog: 1.2 };
export function speak(s, text, fallback = 'here') {
  if (!s) return;
  const line = tr(text);
  if (playClip(s.kind, line)) return;
  if (!say(line, VOICE[s.kind], s.kind === 'turtle' ? 0.9 : 1.08, lang())) sfx[fallback](SQUEAK[s.kind]);
}
export function squeakPitch(s) { return SQUEAK[s.kind]; }
export function animalSound(s) {
  ({ bunny: () => sfx.squeak(), puppy: () => sfx.woof(), turtle: () => sfx.hum(), owl: () => sfx.hoot(), frog: () => sfx.ribbit() })[s.kind]();
}

/** wake a sleepy bunny / coax the turtle; returns true if the tap was "used up" by that */
export function coax(s) {
  if (s.kind === 'bunny' && s.sleep) {
    s.sleep = false; s.sleepT = rand(25, 45);
    act(s, 'gasp', 0.7); sfx.gasp(1.3); hop(s, 60);
    return true;
  }
  if (s.kind === 'turtle' && s.hide > 0) {
    s.hide = s.hide >= 1 ? 0.5 : 0;
    s.hideT = rand(30, 50);
    if (s.hide === 0) { act(s, 'wiggle', 1.2); hop(s, 50); sfx.boing(); }
    else sfx.softPop();
    return true;
  }
  return false;
}

/** blink + gravity + cleanup, call every frame */
export function physics(s, dt) {
  s.blinkT -= dt;
  if (s.blinkT < 0) { s.blink = 0.13; s.blinkT = rand(2, 5.5); }
  if (s.blink > 0) s.blink -= dt;
  if (s.z > 0 || s.vz > 0) {
    s.vz -= 380 * dt; s.z += s.vz * dt;
    if (s.z <= 0) { s.z = 0; s.vz = 0; }
  }
  if (s.glowT > 0) s.glowT -= dt;
  if (s.bubble && G.time > s.bubble.until) s.bubble = null;
  if (s.act && G.time > s.act.t0 + s.act.dur) s.act = null;
}

/** move toward target while walking */
export function walkStep(s, dt) {
  if (s.mode !== 'walk' || !s.target) return;
  const dx = s.target.x - s.x, dy = s.target.y - s.y;
  const d = Math.hypot(dx, dy);
  const sp = s.speed * dt;
  if (d < sp) {
    s.x = s.target.x; s.y = s.target.y; s.target = null;
    const cb = s.onArrive; s.onArrive = null;
    s.mode = 'stand';
    if (cb) cb();
  } else {
    s.x += dx / d * sp; s.y += dy / d * sp;
    s.look = Math.abs(dx) > 4 ? Math.sign(dx) : 0;
    s.stepT -= dt;
    if (s.stepT < 0) { s.stepT = 0.25; sfx.step(Math.floor(G.time * 4)); }
  }
}
export function walkTo(s, x, y, speed = 42) {
  return new Promise(res => {
    s.mode = 'walk'; s.target = { x, y }; s.speed = speed; s.onArrive = res;
  });
}

/** compute the sprite state for the current moment */
export function pose(s) {
  const t = G.time;
  const st = { eyes: 'open', mouth: 'smile', armL: 'down', armR: 'down', feet: 0, look: s.look | 0, blush: true, hide: 0, wag: false, earUp: false, tongue: s.kind === 'puppy' };
  let dx = 0;
  if (s.kind === 'turtle') st.hide = s.hide;
  if (s.mode === 'walk') { st.feet = (Math.floor(t * 7) % 2) + 1; st.wag = Math.floor(t * 8) % 2 === 0; }
  if (s.mode === 'held') { st.armL = 'up'; st.armR = 'up'; st.feet = (Math.floor(t * 6) % 2) + 1; st.eyes = 'happy'; st.mouth = 'open'; st.wag = Math.floor(t * 10) % 2 === 0; }
  if (s.kind === 'puppy' && s.mode === 'stand') st.wag = Math.floor(t * 5) % 2 === 0;
  if (s.sleep) { st.eyes = 'closed'; st.mouth = Math.floor(t * 0.8) % 2 ? 'o' : 'smile'; }
  else if (s.blink > 0) st.eyes = 'blink';
  const a = s.act;
  if (a) {
    const k = t - a.t0;
    const alt = (hz) => Math.floor(k * hz) % 2 === 0;
    switch (a.name) {
      case 'raise': st.armL = 'up'; st.earUp = true; st.eyes = s.blink > 0 ? 'blink' : 'open'; st.mouth = alt(1.5) ? 'smile' : 'open'; break;
      case 'here': st.armL = alt(6) ? 'wave1' : 'wave2'; st.mouth = k < 0.6 ? 'open' : 'smile'; st.earUp = true; st.eyes = 'open'; break;
      case 'wave': st.armL = alt(5) ? 'wave1' : 'wave2'; st.mouth = alt(4) ? 'open' : 'smile'; st.eyes = 'happy'; break;
      case 'clap': st.armL = st.armR = alt(7) ? 'clap' : 'front'; st.eyes = 'happy'; st.mouth = 'open'; break;
      case 'cheer': st.armL = st.armR = 'up'; st.eyes = 'happy'; st.mouth = 'open'; st.earUp = true; st.wag = alt(10); break;
      case 'gasp': st.armL = st.armR = 'front'; st.eyes = 'wide'; st.mouth = 'o'; st.earUp = true; break;
      case 'giggle': st.eyes = 'happy'; st.mouth = 'grin'; st.armL = st.armR = 'front'; dx = alt(14) ? 1 : 0; break;
      case 'wiggle': st.eyes = 'happy'; st.mouth = 'grin'; st.armL = alt(4) ? 'up' : 'front'; st.armR = alt(4) ? 'front' : 'up'; dx = alt(8) ? 1 : -1; st.wag = alt(10); break;
      case 'munch': st.eyes = 'happy'; st.mouth = alt(5) ? 'munch' : 'flat'; st.armL = st.armR = 'front'; break;
      case 'yawn': st.eyes = 'closed'; st.mouth = 'open'; st.armL = st.armR = 'up'; break;
      case 'happy': st.eyes = 'happy'; st.mouth = 'open'; st.wag = alt(10); break;
      case 'look': st.eyes = 'open'; st.mouth = 'o'; break;
    }
  }
  if (s.mood && !a && !s.sleep) {
    const M = { triste: ['open', 'frown', 'sad'], enojado: ['open', 'frown', 'angry'], asustado: ['wide', 'o', 'scared'], cansado: ['sleepy', 'o', null] }[s.mood];
    if (M) { st.eyes = s.blink > 0 && M[0] === 'open' ? 'blink' : M[0]; st.mouth = M[1]; st.mood = M[2]; st.tongue = false; st.earUp = false; }
    if (s.mood === 'asustado') dx = Math.floor(t * 12) % 2;
  }
  if (s.hide > 0) dx = 0;
  return { st, dx };
}

/** shared idle-personality behaviour for a seated student (both classroom & whiteboard).
 *  returns a string event name when something noteworthy happens. */
export function traits(s, dt, opts = {}) {
  if (s.mode !== 'seated' && s.mode !== 'stand') return;
  const busy = !!s.act;
  if (s.kind === 'bunny' && !s.sleep && !opts.noSleep) {
    s.sleepT -= dt;
    if (s.sleepT < 0 && !busy) { act(s, 'yawn', 1.1); s.sleepT = 999; setTimeout(() => { s.sleep = true; }, 1100); }
  }
  if (s.kind === 'bunny' && s.sleep) {
    s.snoreT = (s.snoreT ?? 2) - dt;
    if (s.snoreT < 0) { s.snoreT = rand(3, 5); if (opts.snore !== false) sfx.snore(); }
  }
  if (s.kind === 'turtle' && s.hide === 0 && !busy) {
    s.hideT -= dt;
    if (s.hideT < 0) { s.hide = 1; s.hideT = rand(30, 50); sfx.softPop(); }
  }
  if (s.kind === 'owl' && !busy && s.hide === 0) {
    s.raiseT -= dt;
    if (s.raiseT < 0) { act(s, 'raise', rand(2.5, 4)); s.raiseT = rand(5, 9); }
  }
  if (s.kind === 'frog' && !busy) {
    s.giggleT -= dt;
    if (s.giggleT < 0) { act(s, 'giggle', 1.1); if (opts.sounds !== false) sfx.giggle(1.25, 4); s.giggleT = rand(9, 16); }
  }
}

/** make a student hide (turtle) after loud stuff */
export function startle(s) {
  if (s.kind === 'turtle' && s.hide === 0 && Math.random() < 0.35) { s.hide = 1; s.hideT = rand(30, 50); }
}

export const GREETINGS = {
  bunny: 'Good morning!', puppy: 'Hi teacher!', turtle: 'hi...', owl: 'Good morning, teacher!', frog: 'Hello hello!',
};
export const BYES = { bunny: 'Bye bye!', puppy: 'See you tomorrow!', turtle: 'bye...', owl: 'Goodbye, teacher!', frog: 'Bye bye!' };
export const CHEERS = ['Yay!', 'Me! Me!', 'Ooh!', 'I know!', 'Hooray!', 'Wow!'];
export const randomCheer = () => pick(CHEERS);
