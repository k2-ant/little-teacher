// Shared "what to do next" helper for the activity scenes: a bobbing hand + a spoken hint.
import { G } from './state.js';
import * as DC from './decor.js';
import { speak } from './students.js';
import { HINTS, UI_WORDS } from './learndata.js';

const said = {};
export function sayHint(owl, key) {
  if (said[key] && G.time - said[key] < 45) return;
  said[key] = G.time; speak(owl, HINTS[key], 'tap');
}
export function sayUI(owl, key) { if (UI_WORDS[key]) speak(owl, UI_WORDS[key], 'tap'); }
export function drawHand(c, x, y) {
  const bob = Math.round(Math.abs(Math.sin(G.time * 5)) * 4);
  const h = DC.hand();
  c.drawImage(h, Math.round(x - 2 + bob * 0.5), Math.round(y - 2 + bob), h.width * 2, h.height * 2);
}
