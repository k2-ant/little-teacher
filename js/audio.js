// Every sound is synthesised with WebAudio - no audio files at all.
let ac = null, out = null, noiseBuf = null;
let muted = false;

export function unlock() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback'; // play even with the iPad's silent switch on
  } catch (e) { /* ignore */ }
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    out = ac.createGain(); out.gain.value = 0.7;
    out.connect(comp); comp.connect(ac.destination);
    const len = ac.sampleRate * 1.5;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  // prime speech on iOS (must happen inside a tap)
  if (window.speechSynthesis && !unlock.spoke) {
    unlock.spoke = true;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* ignore */ }
  }
}
export function setMuted(m) { muted = m; if (out) out.gain.value = m ? 0 : 0.7; }
const now = () => ac.currentTime;
const ok = () => ac && ac.state === 'running' && !muted;

function env(g, t, a, peak, dur, end = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(end, t + dur);
}
function tone({ type = 'sine', f = 440, f2, t = 0, dur = 0.2, vol = 0.2, a = 0.005, dest = out, detune = 0 }) {
  const T = now() + t;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, T); o.detune.value = detune;
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, T + dur);
  env(g, T, a, vol, dur);
  o.connect(g); g.connect(dest);
  o.start(T); o.stop(T + dur + 0.05);
  return o;
}
function noise({ t = 0, dur = 0.1, vol = 0.2, type = 'bandpass', f = 1500, q = 1, f2, a = 0.003 }) {
  const T = now() + t;
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, T); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, T + dur);
  const g = ac.createGain(); env(g, T, a, vol, dur);
  s.connect(fl); fl.connect(g); g.connect(out);
  s.start(T, Math.random() * 0.5); s.stop(T + dur + 0.05);
}

// ---- formant "voice" for squeaky critter sounds
const VOWELS = { ee: [300, 2500], ih: [400, 2000], eh: [550, 1800], ah: [800, 1250], oh: [500, 900], oo: [350, 800], er: [480, 1350] };
function voice({ t = 0, dur = 0.3, f0 = 500, f1, vowel = 'ee', vowel2, vol = 0.25, scale = 1.25, vib = 6 }) {
  const T = now() + t;
  const o = ac.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0, T);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, T + dur);
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = vib; lg.gain.value = f0 * 0.03;
  lfo.connect(lg); lg.connect(o.frequency);
  const g = ac.createGain(); env(g, T, 0.02, vol, dur);
  const mixg = ac.createGain(); mixg.gain.value = 1;
  const [a1, a2] = VOWELS[vowel];
  for (const [i, fr] of [[0, a1], [1, a2]]) {
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 7;
    bp.frequency.setValueAtTime(fr * scale, T);
    if (vowel2) bp.frequency.linearRampToValueAtTime(VOWELS[vowel2][i] * scale, T + dur * 0.8);
    const bg = ac.createGain(); bg.gain.value = i ? 0.6 : 1;
    o.connect(bp); bp.connect(bg); bg.connect(mixg);
  }
  mixg.connect(g); g.connect(out);
  o.start(T); lfo.start(T); o.stop(T + dur + 0.05); lfo.stop(T + dur + 0.05);
}

// ---- recorded voice clips (generated with ElevenLabs, see tools/voices.mjs)
let clipMap = null, owlOnly = new Set();
const bufs = new Map(), loading = new Map(), playingClip = {};
export async function loadClips() {
  try { const m = await (await fetch('audio/clips.json')).json(); clipMap = m.clips; owlOnly = new Set(m.owlOnly || []); } catch (e) { clipMap = null; }
}
function clipUrl(kind, key) { const slug = clipMap && clipMap[key]; if (slug && owlOnly.has(key)) kind = 'owl'; return slug ? `audio/${kind}/${slug}.mp3` : null; }
function getBuf(url) {
  if (bufs.has(url)) return Promise.resolve(bufs.get(url));
  if (loading.has(url)) return loading.get(url);
  const p = fetch(url).then(r => r.arrayBuffer()).then(ab => new Promise((res, rej) => ac.decodeAudioData(ab, res, rej)))
    .then(b => { bufs.set(url, b); loading.delete(url); return b; }).catch(() => { loading.delete(url); return null; });
  loading.set(url, p);
  return p;
}
/** play a recorded line for a student. Returns false if there is no clip (caller falls back to speech). */
export function playClip(kind, key, rate = 1) {
  const url = clipUrl(kind, key);
  if (!url || !ac) return false;
  if (muted) return true;
  getBuf(url).then(b => {
    if (!b || muted) return;
    try { playingClip[kind]?.stop(); } catch (e) { /* already ended */ }
    const src = ac.createBufferSource(); src.buffer = b; src.playbackRate.value = rate;
    const g = ac.createGain(); g.gain.value = 1.25;
    src.connect(g); g.connect(out); src.start();
    playingClip[kind] = src;
    src.onended = () => { if (playingClip[kind] === src) playingClip[kind] = null; };
  });
  return true;
}
/** quietly download every clip once so the game works offline afterwards */
export async function prefetchClips() {
  if (!clipMap) await loadClips();
  if (!clipMap) return;
  const urls = [];
  for (const kind of ['bunny', 'puppy', 'turtle', 'owl', 'frog']) for (const [key, slug] of Object.entries(clipMap)) if (kind === 'owl' || !owlOnly.has(key)) urls.push(`audio/${kind}/${slug}.mp3`);
  const workers = Array.from({ length: 3 }, async () => { while (urls.length) { const u = urls.shift(); try { await fetch(u); } catch (e) { /* offline */ } } });
  await Promise.all(workers);
}

// ---- speech (on-device voices, fallback when a clip is missing)
let voices = [];
function loadVoices() { voices = (window.speechSynthesis && speechSynthesis.getVoices()) || []; }
if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function pickVoice(lang = 'en') {
  if (lang === 'es') {
    const es = voices.filter(v => /^es/i.test(v.lang));
    return es.find(v => /es[-_](MX|US|419)/i.test(v.lang) && /paulina|female|sabina|dalia|helena|m[oó]nica|google/i.test(v.name)) || es.find(v => /es[-_](MX|US|419)/i.test(v.lang)) || es.find(v => /paulina|m[oó]nica|female/i.test(v.name)) || es[0];
  }
  const en = voices.filter(v => /^en/i.test(v.lang));
  return en.find(v => /samantha|karen|moira|tessa|female|zira|aria|jenny/i.test(v.name)) || en.find(v => v.localService) || en[0];
}
export function say(text, pitch = 1.6, rate = 1.05, lang = 'en') {
  if (muted) return false;
  if (!window.speechSynthesis) return false;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(lang); if (v) u.voice = v;
    u.lang = v ? v.lang : (lang === 'es' ? 'es-MX' : 'en-US');
    u.pitch = Math.min(2, pitch); u.rate = rate; u.volume = 0.9;
    speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}
export function hush() { if (window.speechSynthesis) speechSynthesis.cancel(); }

// ------------------------------------------------------------------ sound library
export const sfx = {
  bell() {
    if (!ok()) return;
    for (const [t, f] of [[0, 784], [0.45, 659], [0.9, 784], [1.35, 523]]) {
      for (const [r, v, d] of [[1, 0.22, 1.6], [2.01, 0.07, 0.9], [2.76, 0.05, 0.6], [5.4, 0.02, 0.3]]) tone({ type: 'sine', f: f * r, t, dur: d, vol: v, a: 0.002 });
    }
  },
  ding(f = 1046) { if (!ok()) return; tone({ f, dur: 0.9, vol: 0.15, a: 0.002 }); tone({ f: f * 2.76, dur: 0.4, vol: 0.04, a: 0.002 }); },
  trash() { if (!ok()) return; noise({ dur: 0.18, vol: 0.18, f: 2500, q: 0.7 }); noise({ t: 0.08, dur: 0.12, vol: 0.12, f: 1800, q: 0.7 }); tone({ t: 0.22, f: 180, f2: 90, dur: 0.18, vol: 0.25 }); },
  note(f = 784) { if (!ok()) return; tone({ type: 'triangle', f, dur: 0.35, vol: 0.14 }); tone({ f: f * 2, dur: 0.15, vol: 0.04 }); },
  pop(p = 1) { if (!ok()) return; tone({ f: 320 * p, f2: 900 * p, dur: 0.09, vol: 0.28 }); noise({ dur: 0.03, vol: 0.08, f: 3000 }); },
  softPop() { if (!ok()) return; tone({ f: 500, f2: 700, dur: 0.07, vol: 0.12 }); },
  thump() { if (!ok()) return; tone({ f: 140, f2: 70, dur: 0.15, vol: 0.3 }); noise({ dur: 0.06, vol: 0.12, type: 'lowpass', f: 600 }); },
  lift() { if (!ok()) return; tone({ f: 300, f2: 520, dur: 0.12, vol: 0.12, type: 'triangle' }); },
  step(i = 0) { if (!ok()) return; noise({ dur: 0.04, vol: 0.05, type: 'lowpass', f: 700 + (i % 2) * 150 }); },
  sparkle() {
    if (!ok()) return;
    [1047, 1319, 1568, 2093, 2637].forEach((f, i) => { tone({ type: 'triangle', f, t: i * 0.07, dur: 0.5, vol: 0.12 }); tone({ f: f * 2, t: i * 0.07, dur: 0.25, vol: 0.03 }); });
  },
  chime() { if (!ok()) return; [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f, t: i * 0.11, dur: 0.6, vol: 0.13 })); },
  fanfare() {
    if (!ok()) return;
    const n = [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.62], [1047, 0.78]];
    n.forEach(([f, t], i) => { tone({ type: 'square', f, t, dur: i === 5 ? 0.7 : 0.18, vol: 0.06 }); tone({ type: 'triangle', f, t, dur: i === 5 ? 0.8 : 0.2, vol: 0.12 }); });
    this.sparkle();
  },
  clap(n = 6, spread = 0.9) {
    if (!ok()) return;
    for (let i = 0; i < n; i++) noise({ t: Math.random() * spread, dur: 0.05, vol: 0.18, f: 1200 + Math.random() * 900, q: 1.2 });
  },
  cheer(p = 1) {
    if (!ok()) return;
    this.clap(8, 1.1);
    voice({ f0: 420 * p, f1: 620 * p, vowel: 'eh', vowel2: 'ee', dur: 0.45, vol: 0.18 });
    voice({ t: 0.06, f0: 520 * p, f1: 780 * p, vowel: 'ah', vowel2: 'ee', dur: 0.4, vol: 0.12 });
  },
  yay(p = 1) { if (!ok()) return; voice({ f0: 480 * p, f1: 720 * p, vowel: 'eh', vowel2: 'ee', dur: 0.38, vol: 0.22 }); },
  gasp(p = 1) { if (!ok()) return; noise({ dur: 0.3, vol: 0.1, f: 1400 * p, f2: 2600 * p, q: 3, a: 0.08 }); voice({ f0: 500 * p, f1: 650 * p, vowel: 'oh', dur: 0.3, vol: 0.08 }); },
  ooh(p = 1) { if (!ok()) return; voice({ f0: 380 * p, f1: 300 * p, vowel: 'oo', dur: 0.6, vol: 0.16, vib: 5 }); },
  giggle(p = 1, n = 5) {
    if (!ok()) return;
    for (let i = 0; i < n; i++) voice({ t: i * 0.11, dur: 0.08, f0: (640 - i * 30) * p, f1: (560 - i * 30) * p, vowel: 'ee', vol: 0.18, vib: 0 });
  },
  here(p = 1) { // squeaky "he-re!" (used when speech isn't available)
    if (!ok()) return;
    noise({ dur: 0.06, vol: 0.06, f: 2500, q: 0.8 });
    voice({ t: 0.04, f0: 520 * p, f1: 700 * p, vowel: 'ee', vowel2: 'er', dur: 0.32, vol: 0.24 });
  },
  hi(p = 1) { if (!ok()) return; voice({ f0: 560 * p, f1: 760 * p, vowel: 'ah', vowel2: 'ee', dur: 0.34, vol: 0.22 }); },
  bye(p = 1) { if (!ok()) return; voice({ f0: 620 * p, f1: 460 * p, vowel: 'ah', vowel2: 'ee', dur: 0.4, vol: 0.2 }); voice({ t: 0.42, f0: 600 * p, f1: 420 * p, vowel: 'ah', vowel2: 'ee', dur: 0.4, vol: 0.18 }); },
  // animal voices
  squeak() { if (!ok()) return; tone({ f: 1400, f2: 2100, dur: 0.1, vol: 0.12 }); tone({ f: 1700, f2: 2300, t: 0.12, dur: 0.08, vol: 0.1 }); },
  woof() { if (!ok()) return; voice({ f0: 330, f1: 220, vowel: 'ah', vowel2: 'oo', dur: 0.16, vol: 0.32, vib: 0, scale: 1 }); voice({ t: 0.22, f0: 360, f1: 240, vowel: 'ah', vowel2: 'oo', dur: 0.14, vol: 0.26, vib: 0, scale: 1 }); },
  hoot() { if (!ok()) return; tone({ f: 520, f2: 480, dur: 0.28, vol: 0.18, a: 0.04 }); tone({ f: 520, f2: 470, t: 0.34, dur: 0.4, vol: 0.16, a: 0.05 }); },
  ribbit() {
    if (!ok()) return;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 5; j++) tone({ type: 'square', f: 260 + j * 6, t: i * 0.25 + j * 0.03, dur: 0.025, vol: 0.06 });
  },
  hum() { if (!ok()) return; voice({ f0: 300, f1: 360, vowel: 'oo', dur: 0.4, vol: 0.18 }); },
  snore() { if (!ok()) return; noise({ dur: 1.1, vol: 0.035, type: 'lowpass', f: 350, f2: 700, a: 0.5 }); },
  crunch() { if (!ok()) return; for (let i = 0; i < 3; i++) noise({ t: i * 0.07, dur: 0.06, vol: 0.14, f: 2000 + Math.random() * 1500, q: 0.6 }); },
  whoosh() { if (!ok()) return; noise({ dur: 0.55, vol: 0.22, f: 300, f2: 3500, q: 1.4, a: 0.12 }); },
  page() { if (!ok()) return; noise({ dur: 0.25, vol: 0.12, type: 'highpass', f: 1800, a: 0.04 }); },
  door() { if (!ok()) return; tone({ f: 220, f2: 180, dur: 0.25, vol: 0.06, type: 'triangle' }); noise({ dur: 0.12, vol: 0.06, type: 'lowpass', f: 900 }); },
  boing() { if (!ok()) return; tone({ f: 180, f2: 520, dur: 0.22, vol: 0.18, type: 'triangle' }); },
  tap() { if (!ok()) return; tone({ f: 900, f2: 1200, dur: 0.05, vol: 0.08 }); },
  peel() { if (!ok()) return; noise({ dur: 0.35, vol: 0.12, f: 2500, f2: 5000, q: 2 }); },
};

// ---- continuous drawing sounds (marker squeak / eraser rub)
let loop = null;
export function strokeStart(kind) {
  if (!ok()) return;
  strokeEnd();
  const T = now();
  const g = ac.createGain(); g.gain.value = 0.0001; g.connect(out);
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const bp = ac.createBiquadFilter();
  let o = null;
  if (kind === 'erase') { bp.type = 'lowpass'; bp.frequency.value = 900; }
  else {
    bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 6;
    o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 1900;
    const og = ac.createGain(); og.gain.value = 0.25; o.connect(og); og.connect(g); o.start(T);
  }
  s.connect(bp); bp.connect(g); s.start(T);
  loop = { g, s, o, bp, kind };
}
export function strokeSpeed(v) { // v ~ pixels per frame
  if (!loop || !ok()) return;
  const T = now();
  const amt = Math.min(1, v / 6);
  loop.g.gain.setTargetAtTime(0.0001 + amt * (loop.kind === 'erase' ? 0.35 : 0.12), T, 0.03);
  if (loop.o) loop.o.frequency.setTargetAtTime(1500 + amt * 1400 + Math.random() * 200, T, 0.02);
  if (loop.kind !== 'erase') loop.bp.frequency.setTargetAtTime(2600 + amt * 1600, T, 0.03);
}
export function strokeEnd() {
  if (!loop) return;
  const { g, s, o } = loop; loop = null;
  const T = now();
  g.gain.setTargetAtTime(0.0001, T, 0.03);
  s.stop(T + 0.2); if (o) o.stop(T + 0.2);
}
