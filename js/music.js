// Original background music, composed here and played with WebAudio (no audio files).
// Three pieces: a cozy classroom tune, a bouncy recess song and a slow goodbye lullaby.
const _ = null;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const TRACKS = {
  class: {
    bpm: 96, steps: 8, voice: 'box',
    chords: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50], [48, 52, 55], [45, 48, 52], [41, 45, 48], [48, 52, 55]],
    melody: [
      76, _, 79, _, 81, 79, 76, _, 72, _, 76, _, 74, 72, 69, _, 69, _, 72, _, 77, 76, 72, _, 74, _, 79, _, 77, _, 74, _,
      76, 79, 84, _, 79, _, 76, _, 81, _, 79, 76, 72, _, 76, _, 77, _, 81, _, 79, _, 74, _, 72, _, _, _, 67, _, 72, _,
    ],
  },
  recess: {
    bpm: 126, steps: 8, voice: 'xylo', drums: true,
    chords: [[43, 47, 50], [48, 52, 55], [50, 54, 57], [43, 47, 50], [40, 43, 47], [48, 52, 55], [50, 54, 57], [43, 47, 50]],
    melody: [
      67, 71, 74, _, 74, 76, 74, _, 72, _, 76, _, 79, 76, 72, _, 74, _, 78, _, 81, 78, 74, _, 79, _, 74, _, 71, _, 67, _,
      76, _, 79, 76, 71, _, 76, _, 72, 76, 79, _, 76, _, 72, _, 74, 78, 81, _, 78, _, 74, 76, 79, _, _, _, 67, _, _, _,
    ],
  },
  night: {
    bpm: 66, steps: 6, voice: 'box', pad: true,
    chords: [[41, 45, 48], [38, 41, 45], [46, 50, 53], [48, 52, 55], [41, 45, 48], [38, 41, 45], [46, 50, 53], [41, 45, 48]],
    melody: [
      81, _, 79, _, 77, _, 74, _, 77, _, 81, _, 82, _, 81, _, 77, _, 79, _, _, _, 72, _,
      81, _, 84, _, 81, _, 77, _, 74, _, 72, _, 74, _, 77, _, 79, _, 77, _, _, _, _, _,
    ],
  },
};

export function createMusic(getCtx, getOut) {
  let gain = null, track = null, want = null, step = 0, nextTime = 0, timer = null, on = true, duckUntil = 0;
  const BASE = 0.16;
  function ensure() {
    const ac = getCtx();
    if (!ac) return null;
    if (!gain) { gain = ac.createGain(); gain.gain.value = 0; gain.connect(getOut()); }
    return ac;
  }
  function note(ac, f, t, dur, kind, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    if (kind === 'box') { o.type = 'sine'; const o2 = ac.createOscillator(), g2 = ac.createGain(); o2.type = 'sine'; o2.frequency.value = f * 3; g2.gain.value = 0.12; o2.connect(g2); g2.connect(g); o2.start(t); o2.stop(t + dur + 0.1); }
    else if (kind === 'xylo') o.type = 'triangle';
    else if (kind === 'bass') o.type = 'sine';
    else o.type = 'triangle';
    o.frequency.value = f;
    const a = kind === 'pad' ? 0.4 : 0.005;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(gain); o.start(t); o.stop(t + dur + 0.1);
  }
  function tick(ac, t, T) {
    const n = T.melody.length, s = step % n, spb = T.steps, bar = Math.floor(s / spb), inBar = s % spb;
    const chord = T.chords[bar % T.chords.length];
    const m = T.melody[s];
    if (m) note(ac, midi(m), t, T.voice === 'xylo' ? 0.35 : 1.1, T.voice, 0.22);
    // gentle accompaniment: arpeggio on off-beats, bass on the downbeat
    if (inBar % 2 === 1) note(ac, midi(chord[(inBar >> 1) % 3] + 12), t, 0.5, 'arp', 0.06);
    if (inBar === 0) note(ac, midi(chord[0] - 12 + 12), t, 0.9, 'bass', 0.16);
    if (T.steps === 8 && inBar === 4) note(ac, midi(chord[2] - 12 + 12), t, 0.7, 'bass', 0.1);
    if (T.pad && inBar === 0) for (const c of chord) note(ac, midi(c + 12), t, (60 / T.bpm / 2) * spb * 1.05, 'pad', 0.035);
    if (T.drums) {
      const len = ac.sampleRate * 0.05, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = b; f.type = 'highpass'; f.frequency.value = 6000; g.gain.value = inBar % 2 ? 0.05 : 0.08;
      src.connect(f); f.connect(g); g.connect(gain); src.start(t);
      if (inBar === 0 || inBar === 4) { const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.12); og.gain.setValueAtTime(0.18, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.15); o.connect(og); og.connect(gain); o.start(t); o.stop(t + 0.2); }
    }
  }
  function loop() {
    const ac = ensure(); if (!ac || ac.state !== 'running') return;
    const now = ac.currentTime;
    // switch tracks with a short fade
    if (want !== track) {
      gain.gain.setTargetAtTime(0.0001, now, 0.25);
      if (!loop.fadeAt) loop.fadeAt = now + 0.8;
      if (now >= loop.fadeAt) { track = want; step = 0; nextTime = now + 0.1; loop.fadeAt = 0; }
      return;
    }
    if (!track || !on) { gain.gain.setTargetAtTime(0.0001, now, 0.3); return; }
    const target = performance.now() < duckUntil ? BASE * 0.3 : BASE;
    gain.gain.setTargetAtTime(target, now, 0.15);
    const T = TRACKS[track], dt = 60 / T.bpm / 2;
    if (nextTime < now) nextTime = now + 0.05;
    while (nextTime < now + 0.25) { tick(ac, nextTime, T); nextTime += dt; step++; }
  }
  return {
    start() { if (!timer) timer = setInterval(loop, 60); },
    play(name) { want = name; },
    setOn(v) { on = v; },
    get on() { return on; },
    duck(ms = 1500) { duckUntil = Math.max(duckUntil, performance.now() + ms); },
  };
}
