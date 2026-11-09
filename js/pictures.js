// Pictures for alphabet words. Reuses game sprites where possible, draws the rest.
import { Pix, cached, darken, lighten } from './raster.js';
import * as S from './sprites.js';
import * as DC from './decor.js';

const STICK = ['balloon', 'cupcake', 'heart', 'fish', 'icecream', 'moon', 'crown', 'rainbow', 'sun', 'star', 'flower', 'cloud'];
const ANIMALS = { puppy: 'puppy', owl: 'owl', turtle: 'turtle', frog: 'frog' };
const happy = { eyes: 'happy', mouth: 'open', armL: 'up', armR: 'down', feet: 0, look: 0, blush: true, hide: 0, wag: true, earUp: true, tongue: true };

function scale2(img) {
  return cached('x2' + (img.__pid ||= Math.random()), () => {
    const c = document.createElement('canvas'); c.width = img.width * 2; c.height = img.height * 2;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, c.width, c.height); return c;
  });
}
const draw = (key, f) => cached('pic' + key, () => { const p = new Pix(30, 30); f(p); p.outline(); return p.canvas(); });

const NEW = {
  sky: p => { for (let y = 2; y < 28; y++) p.hline(2, 27, y, y < 15 ? '#5fb4ef' : '#8fd0ff'); p.ball(22, 8, 3.5, 3.5, '#ffe066', { hi: false }); p.ball(9, 18, 5, 3, '#ffffff', { hi: false }); p.ball(14, 17, 4, 3, '#ffffff', { hi: false }); },
  duck: p => { p.ball(13, 19, 10, 7, '#ffd23f'); p.ball(21, 10, 6, 6, '#ffd23f'); p.rect(26, 10, 4, 3, '#ff9a2e'); p.px(22, 8, S.INK); p.ell(11, 18, 5, 3, '#f5c000', null, true); p.rect(8, 26, 3, 2, '#ff9a2e'); p.rect(15, 26, 3, 2, '#ff9a2e'); },
  cat: p => { p.ball(15, 21, 9, 7, '#ffb46b'); p.ball(15, 11, 8, 7, '#ffb46b'); for (const x of [9, 21]) for (let i = 0; i < 5; i++) p.hline(x - Math.floor(i / 2) + (x > 15 ? 0 : 0), x + Math.floor(i / 2), 3 + i, '#ffb46b'); p.px(12, 10, S.INK); p.px(18, 10, S.INK); p.px(15, 13, '#ff8fae'); p.line(5, 12, 10, 13, '#c98c55'); p.line(25, 12, 20, 13, '#c98c55'); p.line(24, 24, 29, 18, '#ffb46b'); p.line(25, 24, 29, 19, '#ffb46b'); for (const x of [12, 15, 18]) p.vline(x, 4, 6, '#e8913a'); },
  tomato: p => { p.ball(15, 17, 12, 10, '#ef4b4b'); for (let i = -2; i <= 2; i++) p.ell(15 + i * 2.5, 8, 1.6, 2.2, '#4fae45'); p.vline(15, 3, 7, '#3d7d40'); p.ell(10, 13, 2, 3, '#ff9a9a'); },
  water: p => { p.rect(7, 4, 16, 24, '#e6f4ff'); p.rect(8, 11, 14, 16, '#7ec8ff'); p.rect(8, 11, 14, 2, '#bfe6ff'); p.px(11, 16, '#ffffff'); p.px(12, 20, '#ffffff'); p.rect(7, 27, 16, 1, '#bcd8ee'); },
  pillow: p => { p.ball(15, 16, 13, 9, '#c9a2ff'); p.ell(15, 15, 9, 5, '#dcc4ff', null, true); p.px(4, 9, '#b48be6'); p.px(26, 9, '#b48be6'); p.px(4, 23, '#b48be6'); p.px(26, 23, '#b48be6'); p.map(11, 12, ['##..##', '......', '.####.'], { '#': '#9a6fd6' }); },
  wind: p => { for (const [y, l] of [[9, 20], [15, 25], [21, 16]]) { p.hline(3, 3 + l, y, '#7ec8ff'); p.hline(3, 3 + l, y + 1, '#bfe6ff'); p.px(4 + l, y - 1, '#7ec8ff'); p.px(5 + l, y - 2, '#7ec8ff'); p.px(4 + l, y - 3, '#7ec8ff'); } },

  diamond: p => { for (let y = 0; y < 26; y++) { const h = y < 13 ? y : 25 - y; p.hline(15 - h, 14 + h, 2 + y, y < 13 ? '#7ec8ff' : '#4f97d6'); } p.line(9, 9, 13, 5, '#ffffff'); },
  egg: p => { p.ball(15, 16, 9, 12, '#fff6e6', { shadow: '#e8dcc6' }); p.ell(11, 10, 2, 3, '#ffffff'); },
  juice: p => { p.rect(8, 6, 14, 22, '#d6f0ff'); p.rect(9, 11, 12, 16, '#ffa63c'); p.rect(9, 11, 12, 2, '#ffc27a'); p.line(18, 0, 15, 14, '#ef6f6c'); p.line(19, 0, 16, 14, '#ef6f6c'); p.ell(23, 9, 3, 3, '#ffa63c'); },
  kite: p => { for (let y = 0; y < 22; y++) { const h = y < 8 ? Math.floor(y * 1.2) : Math.floor((21 - y) * 0.7); p.hline(14 - h, 14 + h, 1 + y, y < 8 ? '#ef6f6c' : '#ffd23f'); } p.vline(14, 1, 22, '#ffffff'); p.line(14, 23, 9, 29, '#8a7c90'); p.px(11, 26, '#64a8e8'); p.px(10, 27, '#7dd370'); },
  nest: p => { p.ball(10, 15, 4, 5, '#d6efff'); p.ball(16, 14, 4, 5, '#d6efff'); p.ball(21, 16, 4, 5, '#d6efff'); p.ball(15, 21, 13, 6, '#a8703f'); for (let x = 4; x < 27; x += 3) p.line(x, 18, x + 3, 25, '#8a5730'); },
  pinata: p => { p.ball(16, 16, 9, 7, '#ff8fb8'); p.rect(7, 13, 18, 2, '#ffd23f'); p.rect(7, 18, 18, 2, '#7ec8ff'); p.ball(22, 9, 3, 4, '#ff8fb8'); p.px(23, 8, S.INK); p.rect(10, 22, 2, 6, '#ff8fb8'); p.rect(19, 22, 2, 6, '#ff8fb8'); p.line(4, 14, 1, 20, '#b48be6'); },
  umbrella: p => { p.ell(15, 13, 13, 10, '#b48be6', { y1: 13 }); for (const x of [6, 15, 24]) p.ell(x, 13, 4.5, 2.5, '#9a6fd6', { y0: 13 }); p.vline(15, 13, 26, '#5a4560'); p.line(15, 26, 12, 28, '#5a4560'); p.px(11, 27, '#5a4560'); },
  whale: p => { p.ball(15, 18, 12, 8, '#64a8e8'); p.ell(15, 22, 9, 4, '#bfe6ff', null, true); for (let i = 0; i < 5; i++) p.vline(26 + Math.floor(i / 2), 12 + i, 17, '#4f97d6'); p.px(8, 16, S.INK); p.vline(13, 3, 9, '#9fd8ff'); p.px(11, 4, '#9fd8ff'); p.px(15, 4, '#9fd8ff'); },
  xylo: p => { ['#ef6f6c', '#ffa65c', '#ffd23f', '#7dd370', '#64a8e8', '#b48be6'].forEach((c, i) => p.rect(3 + i * 4, 6 + i, 3, 20 - i * 2, c)); p.line(16, 2, 26, 8, '#a8703f'); p.ball(16, 2, 1.6, 1.6, '#ef6f6c'); },
  yoyo: p => { p.ball(15, 18, 10, 10, '#ef6f6c'); p.ell(15, 18, 4, 4, '#ffd23f'); p.vline(15, 0, 8, '#8a7c90'); },
  zigzag: p => { for (let k = 0; k < 3; k++) { const y = 6 + k * 8, c = ['#ef6f6c', '#ffd23f', '#64a8e8'][k]; for (let x = 2; x < 28; x++) { const yy = y + Math.abs(((x - 2) % 8) - 4); p.px(x, yy, c); p.px(x, yy + 1, c); } } },
  igloo: p => { p.ball(15, 22, 13, 12, '#eef8ff', { clip: { y1: 26 } }); for (const y of [15, 20, 25]) p.hline(4, 26, y, '#bcd8ee'); p.ell(15, 26, 4, 5, '#5a6f8a', { y1: 26 }); p.hline(2, 28, 27, '#d6efff'); },
  kiwi: p => { p.ball(15, 15, 12, 12, '#8a6a3a'); p.ell(15, 15, 10, 10, '#8fd067'); p.ell(15, 15, 3.5, 3.5, '#fff6d0'); for (let a = 0; a < 10; a++) p.px(15 + Math.cos(a * 0.63) * 6, 15 + Math.sin(a * 0.63) * 6, S.INK); },
  cheese: p => { for (let y = 0; y < 14; y++) p.hline(3 + Math.floor((13 - y) * 1.6), 27, 9 + y, '#ffd23f'); p.rect(3, 22, 25, 4, '#f0b820'); for (const [x, y, r] of [[20, 14, 2], [14, 19, 1.6], [24, 20, 1.4]]) p.ell(x, y, r, r, '#e0a820'); },
  grapes: p => { for (const [x, y] of [[9, 9], [15, 9], [21, 9], [12, 14], [18, 14], [15, 19], [12, 4.5], [18, 4.5]]) p.ball(x, y + 5, 3.4, 3.4, '#9a6fd6'); p.line(15, 0, 16, 5, '#7a4a2a'); p.ell(20, 3, 3, 1.5, '#6cc44f'); },
  waffle: p => { p.rect(3, 3, 24, 24, '#e8b06a'); for (let k = 0; k < 4; k++) { p.hline(3, 26, 6 + k * 6, '#c98c4a'); p.vline(6 + k * 6, 3, 26, '#c98c4a'); } p.ball(15, 15, 4, 3, '#ffe9a0'); },
  shoe: p => { p.ball(12, 14, 9, 7, '#ef6f6c'); p.rect(4, 16, 24, 7, '#ef6f6c'); p.rect(3, 22, 26, 3, '#ffffff'); p.line(9, 11, 15, 11, '#ffffff'); p.line(9, 14, 15, 14, '#ffffff'); },
};

export function picture(key) {
  if (key === 'carrot') return scale2(S.snack('bunny', 0));
  if (key === 'house') return S.ICONS.home();
  if (key === 'ball') return S.ICONS.ball();
  if (key === 'desk') return S.desk(1, true);
  if (key === 'butterfly') return S.sticker('butterfly');
  if (key === 'hug') return S.sticker('heart');
  if (key === 'toy') return DC.decor('teddy', 0);
  if (key === 'frog') return S.student('frog', happy);
  if (STICK.includes(key)) return S.sticker(key);
  if (ANIMALS[key]) return S.student(ANIMALS[key], happy);
  if (key === 'apple') return scale2(DC.deskItem('apple'));
  if (key === 'globe') return DC.decor('globe', 0);
  if (key === 'lamp') return DC.decor('lamp', 0);
  if (key === 'flowers') return DC.decor('flowers', 0);
  if (key === 'teddy') return DC.decor('teddy', 0);
  if (NEW[key]) return draw(key, NEW[key]);
  return null;
}
