// Content for questions, feelings and sílabas (all Spanish).

// students' grammatical gender (for "Estoy cansado / cansada")
export const GENDER = { bunny: 'f', puppy: 'm', turtle: 'm', owl: 'f', frog: 'f' };
export const ANIMAL_WORD = { bunny: 'conejo', puppy: 'perro', turtle: 'tortuga', owl: 'búho', frog: 'rana' };

// ------------------------------------------------------------------ questions
export const COLORS = {
  rojo: '#ef4b4b', azul: '#2f7de1', amarillo: '#ffd23f', verde: '#3cb44b',
  blanco: '#ffffff', morado: '#9b59d0', rosa: '#ff8fc0', anaranjado: '#ff9a2e',
};
export const COLOR_QS = [
  { q: '¿De qué color es el sol?', pic: 'sun', a: 'amarillo' },
  { q: '¿De qué color es la manzana?', pic: 'apple', a: 'rojo' },
  { q: '¿De qué color es la rana?', pic: 'frog', a: 'verde' },
  { q: '¿De qué color es el cielo?', pic: 'sky', a: 'azul' },
  { q: '¿De qué color es la nube?', pic: 'cloud', a: 'blanco' },
  { q: '¿De qué color son las uvas?', pic: 'grapes', a: 'morado' },
  { q: '¿De qué color es la zanahoria?', pic: 'carrot', a: 'anaranjado' },
  { q: '¿De qué color es el corazón?', pic: 'heart', a: 'rosa' },
];
export const SHAPE_QS = {
  circle: '¿Cuál es el círculo?', square: '¿Cuál es el cuadrado?', triangle: '¿Cuál es el triángulo?',
  star: '¿Cuál es la estrella?', heart: '¿Cuál es el corazón?', rectangle: '¿Cuál es el rectángulo?',
};
export const COUNT_Q = '¿Cuántas estrellas hay?';
export const ANIMAL_QS = {
  bunny: '¿Dónde está el conejo?', puppy: '¿Dónde está el perro?', turtle: '¿Dónde está la tortuga?',
  owl: '¿Dónde está el búho?', frog: '¿Dónde está la rana?',
};
export const LETTER_QS = { A: '¿Cuál es la letra A?', E: '¿Cuál es la letra E?', I: '¿Cuál es la letra I?', O: '¿Cuál es la letra O?', U: '¿Cuál es la letra U?', M: '¿Cuál es la letra M?', P: '¿Cuál es la letra P?', S: '¿Cuál es la letra S?' };
export const SIZE_QS = { grande: '¿Cuál es grande?', 'pequeño': '¿Cuál es pequeño?' };
export const Q_INTRO = 'Maestra, tengo una pregunta.';
export const Q_RIGHT = ['¡Sí! ¡Gracias, maestra!', '¡Muy bien, maestra!', '¡Eso es!'];
export const Q_WRONG = 'Mmm... creo que no.';

// ------------------------------------------------------------------ feelings
export const MOODS = ['triste', 'enojado', 'asustado', 'cansado'];
export const moodWord = (mood, kind) => (mood === 'triste' || mood === 'feliz' ? mood : GENDER[kind] === 'f' ? mood.replace(/o$/, 'a') : mood);
export const moodLine = (mood, kind) => `Estoy ${moodWord(mood, kind)}.`;
export const HELPS = [
  { id: 'abrazo', word: 'un abrazo' }, { id: 'juguete', word: 'un juguete' }, { id: 'agua', word: 'agua' },
  { id: 'descansar', word: 'descansar' }, { id: 'respirar', word: 'respirar profundo' },
];
export const FEEL_CALL = 'Maestra...';
export const FEEL_Q1 = '¿Cómo me siento?';
export const FEEL_Q2 = '¿Qué me ayuda?';
export const FEEL_DONE = '¡Gracias, maestra! Ya me siento mejor.';

// ------------------------------------------------------------------ sílabas
export const FAMILIES = ['m', 'p', 's', 'l', 't', 'n', 'd'];
export const VOWELS = ['a', 'e', 'i', 'o', 'u'];
export const WORDS = [
  { w: 'pato', s: ['pa', 'to'], pic: 'duck' }, { w: 'gato', s: ['ga', 'to'], pic: 'cat' },
  { w: 'rana', s: ['ra', 'na'], pic: 'frog' }, { w: 'luna', s: ['lu', 'na'], pic: 'moon' },
  { w: 'casa', s: ['ca', 'sa'], pic: 'house' }, { w: 'mesa', s: ['me', 'sa'], pic: 'desk' },
  { w: 'oso', s: ['o', 'so'], pic: 'teddy' }, { w: 'nube', s: ['nu', 'be'], pic: 'cloud' },
  { w: 'nido', s: ['ni', 'do'], pic: 'nest' }, { w: 'queso', s: ['que', 'so'], pic: 'cheese' },
  { w: 'uvas', s: ['u', 'vas'], pic: 'grapes' }, { w: 'pelota', s: ['pe', 'lo', 'ta'], pic: 'ball' },
  { w: 'tomate', s: ['to', 'ma', 'te'], pic: 'tomato' }, { w: 'mariposa', s: ['ma', 'ri', 'po', 'sa'], pic: 'butterfly' },
];
export const SIL_HELLO = '¡Vamos a leer!';

/** lines spoken by any student */
export function studentPhrases() {
  const out = new Set([Q_INTRO, ...Q_RIGHT, Q_WRONG, FEEL_CALL, FEEL_Q1, FEEL_Q2, FEEL_DONE]);
  COLOR_QS.forEach(q => { out.add(q.q); });
  Object.keys(COLORS).forEach(c => out.add(c));
  Object.values(SHAPE_QS).forEach(q => out.add(q));
  out.add(COUNT_Q);
  Object.values(ANIMAL_QS).forEach(q => out.add(q));
  Object.values(ANIMAL_WORD).forEach(w => out.add(w));
  Object.values(LETTER_QS).forEach(q => out.add(q));
  Object.entries(SIZE_QS).forEach(([w, q]) => { out.add(q); out.add(w); });
  for (const m of MOODS) { out.add(m); out.add(m.replace(/o$/, 'a')); out.add(`Estoy ${m}.`); out.add(`Estoy ${m.replace(/o$/, 'a')}.`); }
  out.add('feliz'); out.add('Estoy feliz.');
  HELPS.forEach(h => out.add(h.word));
  return [...out];
}
/** lines only the owl (our reading helper) says */
export function narratorPhrases() {
  const out = new Set([SIL_HELLO]);
  for (const c of FAMILIES) for (const v of VOWELS) out.add(c + v);
  for (const w of WORDS) { out.add(w.w); w.s.forEach(x => out.add(x)); }
  return [...out];
}
