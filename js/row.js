// A row of students sitting behind a ledge at the bottom of an activity screen.
import { G, rand, pick } from './state.js';
import * as S from './sprites.js';
import { sfx } from './audio.js';
import { act, acting, hop, speak, animalSound, coax, physics, pose, traits, randomCheer } from './students.js';

export function makeRow(students) {
  let ledge = 0, xs = [];
  const parts = [];
  const shown = () => students.filter(s => s.mode !== 'away');
  const awake = () => shown().filter(s => !s.sleep && !(s.hide > 0));
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const D = (c, im, x, y) => c.drawImage(im, Math.round(x), Math.round(y));
  function rect(s) { return { x: xs[s.idx] - S.SW / 2, y: ledge + 14 - S.SH }; }
  const row = {
    parts,
    layout(W, ledgeY, x0, x1) {
      ledge = ledgeY;
      const sp = Math.min(44, Math.floor((x1 - x0) / 5));
      xs = students.map((s, k) => Math.round((x0 + x1) / 2 + (k - 2) * sp));
    },
    burst(kind, x, y, n, colors, o = {}) {
      for (let i = 0; i < n; i++) {
        const a = o.up ? rand(-2.6, -0.5) : rand(0, Math.PI * 2), sp = rand(20, o.sp ?? 60);
        parts.push({ kind, color: pick(colors), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g ?? 60, life: rand(0.6, 1.1) * (o.life ?? 1), t: 0 });
      }
    },
    update(dt) {
      for (const s of students) {
        physics(s, dt);
        if (s.mode === 'away') continue;
        if (s.mode === 'walk' || s.mode === 'stand') { s.mode = 'seated'; s.target = null; const cb = s.onArrive; s.onArrive = null; cb?.(); }
        traits(s, dt, { sounds: false, snore: false });
        if (s.kind === 'bunny' && s.sleep && Math.random() < dt * 0.9) { const r = rect(s); parts.push({ kind: 'z', color: '#6f8fd6', x: r.x + 22, y: r.y + 8, vx: rand(4, 9), vy: -14, g: 0, life: 1.4, t: 0 }); }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += dt;
        if (p.t > p.life) { parts.splice(i, 1); continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      }
    },
    render(c, W, H, ledgeCol = '#dca46a') {
      for (const s of shown()) {
        const r = rect(s);
        const { st, dx } = pose(s);
        D(c, S.student(s.kind, st), r.x + dx, r.y - s.z);
        if (s.bubble) D(c, S.bubble(s.bubble.kind), r.x + 20, r.y - 6 - s.z);
      }
      R(c, 0, ledge, W, H - ledge, ledgeCol); R(c, 0, ledge, W, 1, '#f0c792'); R(c, 0, ledge + 3, W, 1, '#b77942');
    },
    renderParts(c) {
      for (const p of parts) {
        if (p.life - p.t < 0.25 && Math.floor(p.t * 20) % 2) continue;
        const im = S.particle(p.kind, p.color);
        D(c, im, p.x - im.width / 2, p.y - im.height / 2);
      }
    },
    hit(x, y) {
      for (const s of shown()) { const r = rect(s); if (x >= r.x + 4 && x <= r.x + S.SW - 4 && y >= r.y + 4 && y <= ledge + 4) return s; }
      return null;
    },
    tap(s) {
      const r = rect(s), hx = r.x + S.SW / 2, hy = r.y + 10;
      if (coax(s)) return;
      if (acting(s, 'raise')) { act(s, 'cheer', 1.2); hop(s, 80); sfx.cheer(1.2); speak(s, randomCheer(), 'yay'); row.burst('star', hx, hy, 6, ['#ffd23f', '#ff9ec4', '#7ec8ff'], { up: true }); }
      else if (s.kind === 'frog') { act(s, 'giggle', 1.2); sfx.giggle(1.3, 6); row.burst('note', hx, hy, 3, ['#7a5bc0', '#ff6f91'], { up: true }); }
      else { act(s, 'happy', 0.9); hop(s, 70); animalSound(s); row.burst('heart', hx, hy, 2, ['#ff6f91'], { up: true, sp: 30 }); }
    },
    cheer(kind = 'clap') {
      for (const s of awake()) { act(s, Math.random() < 0.5 ? kind : 'cheer', 1.3); hop(s, rand(40, 80)); const r = rect(s); row.burst('star', r.x + 17, r.y + 8, 2, ['#ffd23f', '#ff9ec4', '#7ec8ff'], { up: true }); }
    },
    react(name = 'gasp', dur = 0.8) { for (const s of awake()) act(s, name, dur); },
    awake,
    talker() { const a = awake(); return a.length ? pick(a) : null; },
    look(x) { for (const s of shown()) { const dx = x - xs[s.idx]; s.look = Math.abs(dx) > 18 ? Math.sign(dx) : 0; } },
  };
  return row;
}
