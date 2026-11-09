// English / Spanish for a dual-language (DLI) classroom.
import { G, persist } from './state.js';
import { Pix, cached } from './raster.js';

export const lang = () => (G.save.lang === 'es' ? 'es' : 'en');
export function setLang(l) { G.save.lang = l; persist(); }

const ES = {
  'Good morning!': '¡Buenos días!', 'Hi teacher!': '¡Hola, maestra!', 'hi...': 'hola...', 'Good morning, teacher!': '¡Buenos días, maestra!', 'Hello hello!': '¡Hola, hola!',
  'Bye bye!': '¡Adiós!', 'See you tomorrow!': '¡Hasta mañana!', 'bye...': 'adiós...', 'Goodbye, teacher!': '¡Adiós, maestra!',
  'Yay!': '¡Bien!', 'Me! Me!': '¡Yo! ¡Yo!', 'Ooh!': '¡Oh!', 'I know!': '¡Yo sé!', 'Hooray!': '¡Hurra!', 'Wow!': '¡Guau!',
  'Here!': '¡Presente!', 'here...': 'presente...', 'Thank you!': '¡Gracias!', 'Yay! A star!': '¡Una estrella!', 'I love it!': '¡Me encanta!',
  'Yummy!': '¡Qué rico!', 'Recess! Yay!': '¡Recreo!', 'Pretty!': '¡Qué bonito!', 'I like it!': '¡Me gusta!', 'Ooh, so pretty!': '¡Qué bonito!',
  'Star!': '¡Estrella!', 'Heart!': '¡Corazón!', 'Apple!': '¡Manzana!', 'Sun!': '¡Sol!',
  'One!': '¡Uno!', 'Two!': '¡Dos!', 'Three!': '¡Tres!', 'Four!': '¡Cuatro!', 'Five!': '¡Cinco!', 'Ay!': '¡A!', 'Bee!': '¡Be!', 'See!': '¡Ce!',
  'Black!': '¡Negro!', 'Red!': '¡Rojo!', 'Orange!': '¡Anaranjado!', 'Green!': '¡Verde!', 'Blue!': '¡Azul!', 'Pink!': '¡Rosa!',
  'English time!': '¡Hora de inglés!', 'Spanish time!': '¡Hora de español!',
  'Great job!': '¡Muy bien!', 'You did it!': '¡Lo lograste!', 'Hmm?': '¿Mmm?', 'Again!': '¡Otra vez!',
};
export const tr = (text) => (lang() === 'es' ? (ES[text] ?? text) : text);

// ------------------------------------------------------------------ letters & numbers
export const LETTERS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
export const NUMS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const NAMES = {
  en: { A: 'ay', B: 'bee', C: 'see', D: 'dee', E: 'ee', F: 'ef', G: 'jee', H: 'aitch', I: 'eye', J: 'jay', K: 'kay', L: 'el', M: 'em', N: 'en', Ñ: 'enye', O: 'oh', P: 'pee', Q: 'cue', R: 'are', S: 'ess', T: 'tee', U: 'you', V: 'vee', W: 'double you', X: 'ex', Y: 'why', Z: 'zee' },
  es: { A: 'a', B: 'be', C: 'ce', D: 'de', E: 'e', F: 'efe', G: 'ge', H: 'hache', I: 'i', J: 'jota', K: 'ka', L: 'ele', M: 'eme', N: 'ene', Ñ: 'eñe', O: 'o', P: 'pe', Q: 'cu', R: 'erre', S: 'ese', T: 'te', U: 'u', V: 'uve', W: 'doble uve', X: 'equis', Y: 'ye', Z: 'zeta' },
};
const NUMBER_WORDS = {
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
  es: ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'],
};
// word + picture for each letter
const WORDS = {
  en: { A: ['apple', 'apple'], B: ['balloon', 'balloon'], C: ['cupcake', 'cupcake'], D: ['diamond', 'diamond'], E: ['egg', 'egg'], F: ['fish', 'fish'], G: ['globe', 'globe'], H: ['heart', 'heart'], I: ['ice cream', 'icecream'], J: ['juice', 'juice'], K: ['kite', 'kite'], L: ['lamp', 'lamp'], M: ['moon', 'moon'], N: ['nest', 'nest'], Ñ: ['piñata', 'pinata'], O: ['owl', 'owl'], P: ['puppy', 'puppy'], Q: ['queen', 'crown'], R: ['rainbow', 'rainbow'], S: ['sun', 'sun'], T: ['turtle', 'turtle'], U: ['umbrella', 'umbrella'], V: ['vase', 'flowers'], W: ['whale', 'whale'], X: ['xylophone', 'xylo'], Y: ['yo-yo', 'yoyo'], Z: ['zigzag', 'zigzag'] },
  es: { A: ['arcoíris', 'rainbow'], B: ['ballena', 'whale'], C: ['corazón', 'heart'], D: ['diamante', 'diamond'], E: ['estrella', 'star'], F: ['flor', 'flower'], G: ['globo', 'balloon'], H: ['helado', 'icecream'], I: ['iglú', 'igloo'], J: ['jugo', 'juice'], K: ['kiwi', 'kiwi'], L: ['luna', 'moon'], M: ['manzana', 'apple'], N: ['nube', 'cloud'], Ñ: ['piñata', 'pinata'], O: ['oso', 'teddy'], P: ['perro', 'puppy'], Q: ['queso', 'cheese'], R: ['rana', 'frog'], S: ['sol', 'sun'], T: ['tortuga', 'turtle'], U: ['uvas', 'grapes'], V: ['vaso', 'juice'], W: ['wafle', 'waffle'], X: ['xilófono', 'xylo'], Y: ['yoyó', 'yoyo'], Z: ['zapato', 'shoe'] },
};
export const letterName = (ch) => NAMES[lang()][ch];
export const numberWord = (n) => NUMBER_WORDS[lang()][n];
export const letterWord = (ch) => WORDS[lang()][ch];
export function letterSentence(ch) {
  const [w] = letterWord(ch);
  return lang() === 'es' ? `¡${letterName(ch)}, de ${w}!` : `${letterName(ch)} is for ${w}!`;
}

// ------------------------------------------------------------------ shapes
export const SHAPES = ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'oval', 'diamond'];
const SHAPE_NAMES = {
  en: { circle: 'circle', square: 'square', triangle: 'triangle', rectangle: 'rectangle', star: 'star', heart: 'heart', oval: 'oval', diamond: 'diamond' },
  es: { circle: 'círculo', square: 'cuadrado', triangle: 'triángulo', rectangle: 'rectángulo', star: 'estrella', heart: 'corazón', oval: 'óvalo', diamond: 'rombo' },
};
export const shapeName = (s) => SHAPE_NAMES[lang()][s];

// ------------------------------------------------------------------ 5x7 font (Ñ is taller)
export const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['###..', '#..#.', '#...#', '#...#', '#...#', '#..#.', '###..'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  Ñ: ['.##.#', '#..#.', '.....', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
};
FONT['10'] = FONT[1].map((r, i) => r + '.' + FONT[0][i]);

// ------------------------------------------------------------------ flags (US / Mexico) for the language button
export function flag(l) {
  return cached('flag' + l, () => {
    const p = new Pix(18, 14);
    if (l === 'en') {
      for (let y = 0; y < 14; y++) p.hline(0, 17, y, Math.floor(y / 2) % 2 ? '#ffffff' : '#e0404b');
      p.rect(0, 0, 8, 8, '#3a5fb0');
      for (let y = 1; y < 8; y += 2) for (let x = 1 + (y % 4 === 3 ? 1 : 0); x < 8; x += 2) p.px(x, y, '#ffffff');
    } else {
      p.rect(0, 0, 6, 14, '#1f8a4c'); p.rect(6, 0, 6, 14, '#ffffff'); p.rect(12, 0, 6, 14, '#d93a3a');
      p.ell(9, 7, 2.2, 2, '#a8703f'); p.px(8, 6, '#6cc44f'); p.px(10, 9, '#6cc44f');
    }
    p.outline();
    return p.canvas();
  });
}
