// Content for questions, feelings and sílabas (all Spanish).

// students' grammatical gender (for "Estoy cansado / cansada")
export const GENDER = { bunny: 'f', puppy: 'm', turtle: 'm', owl: 'f', frog: 'f' };
export const ANIMAL_WORD = { bunny: 'conejo', puppy: 'perro', turtle: 'tortuga', owl: 'búho', frog: 'rana' };
// ---- v2.0 animals: gatito (cat), osito (bear, the biggest), ratoncito (mouse, the smallest)
Object.assign(GENDER, { cat: 'm', bear: 'm', mouse: 'm' });
Object.assign(ANIMAL_WORD, { cat: 'gato', bear: 'oso', mouse: 'ratón' });
export const PET_WORD = { cat: 'gatito', bear: 'osito', mouse: 'ratoncito' }; // what the class calls them
const V20_ANIMAL_QS = { cat: '¿Dónde está el gato?', bear: '¿Dónde está el oso?', mouse: '¿Dónde está el ratón?' };
const V20_NAUGHTY = { cat: '¡Miau, miau!', bear: '¡Tengo hambre!', mouse: '¡Cuic, cuic!' };
export const V20_LINES = { hug: '¡Un abrazo de oso!', honey: '¡Me encanta la miel!', peek: '¡Aquí estoy!', nap: '¡Qué rica siesta!' };
const V20_STUDENT = () => [...Object.values(PET_WORD), ...Object.values(V20_LINES), MYSTERY_LINES.kid];

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
  owl: '¿Dónde está el búho?', frog: '¿Dónde está la rana?', ...V20_ANIMAL_QS,
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
// ---- v2.0 playground
// recess happens outside (playground.js): what the friends say while they play, and the owl's hints
export const YARD_LINES = {
  yay: '¡Yupi!', higher: '¡Más alto!', myTurn: '¡Me toca!', castle: '¡Mi castillo!', snowman: '¡Un muñeco de nieve!',
  caught: '¡Te atrapé!', up: '¡Arriba!', puddles: '¡Charcos!',
};
export const YARD_HINTS = { // merged into HINTS by playground.js
  yardSwing: 'Toca el columpio.', yardSlide: 'Toca la resbaladilla.', yardBall: '¡Patea la pelota!', yardSand: 'Toca el arenero.',
  yardSeesaw: 'Toca el subibaja.', yardHop: 'Toca la rayuela.', yardTree: 'Toca el árbol.', yardPuddle: '¡Salta en los charcos!',
  yardSnow: '¡Hagamos un muñeco de nieve!', yardWhistle: '¿Volvemos a clase? Toca el silbato.',
};

// ------------------------------------------------------------------ whiteboard
export const STAR_COUNT_LINE = '¡Cuántas estrellas!';

// ------------------------------------------------------------------ behaviour cards + centros
export const CARD_LINES = { sorry: 'Lo siento, maestra.', thanks: '¡Gracias, maestra!', allGreen: '¡Todos empiezan en verde!', newDay: '¡Mañana es un nuevo día!' };
export const NAUGHTY_LINES = { frog: '¡Jajaja!', owl: '¡Yo sé! ¡Yo sé!', bunny: '¡Oye, oye!', ...V20_NAUGHTY };
// ---- v1.9 alive
export const ALIVE_LINES = { starWeek: '¡Soy la estrella de la semana!', shell: '¡Mira mi caparazón!', again: '¡Otra vez!' };
export const ALIVE_OWL = { allGreen: '¡Todos terminaron en verde!', friday: '¡Es viernes!', newLetter: '¡Mira, una letra nueva!' };
export const CENTERS = [
  { id: 'arte', line: '¡Me encanta pintar!' }, { id: 'biblioteca', line: '¡Me gusta leer!' },
  { id: 'letras', line: '¡Estoy escribiendo!' }, { id: 'bloques', line: '¡Mira mis bloques!' },
];
export const CENTRO_LINES = { start: '¡Hora de centros!', change: '¡Cambio de centro!' };

// ---- v1.9 rituals
// weather at circle time (owl asks + says the sentence, the class echoes the word)
export const WEATHER = [
  { id: 'sol', line: '¡Hoy hace sol!', word: '¡Sol!' },
  { id: 'nubes', line: 'Hoy está nublado.', word: '¡Nubes!' },
  { id: 'lluvia', line: '¡Hoy llueve!', word: '¡Lluvia!' },
  { id: 'nieve', line: '¡Hoy nieva!', word: '¡Nieve!' },
];
export const WEATHER_ASK = '¿Qué tiempo hace hoy?';
export const WEATHER_RECESS = { lluvia: '¡Burbujas!', nieve: '¡Hace frío!' };
// class jobs ("Ayudantes"): the last column is the student who rests today
export const JOBS = [
  { id: 'lider', word: 'Líder de la fila' }, { id: 'luces', word: 'Luces' },
  { id: 'calendario', word: 'Calendario' }, { id: 'plantas', word: 'Plantas' }, { id: 'descanso', word: 'Descanso' },
];
export const JOB_LINES = { follow: '¡Síganme!', water: '¡Yo riego las plantas!', lightsOff: '¡Apago la luz!', lightsOn: '¡Prendo la luz!' };
export const RITUAL_UI = { jobs: 'Ayudantes' }; // merged into UI_WORDS by rituals.js
export const RITUAL_HINTS = { weather: '¿Qué tiempo hace hoy? Toca un dibujo.', plant: '¡La planta tiene sed!', jobs: '¿Quién ayuda hoy?', jobsChart: 'Mueve a tus amigos a su trabajo.' }; // merged into HINTS

// ------------------------------------------------------------------ spoken button names + hints (owl = helper voice)
export const UI_WORDS = {
  stickers: 'Mis estampas', home: '¡Hora de ir a casa!', bell: '¡A clase!', decorate: 'Decorar', toys: 'Tiempo libre',
  star: 'Estrella de oro', cardGreen: 'Tarjeta verde', cardRed: 'Tarjeta roja', cdone: 'Terminamos', help: '¿Qué hago?',
  recess: 'Recreo', snack: 'Merienda', story: 'Cuento', centros: 'Centros',
  floor: 'Cosas para el piso', wall: 'Cosas para la pared', desk: 'Útiles', paint: 'Pintura', trash: 'Basura',
  back: 'Regresar', eraser: 'Borrador', wipe: 'Limpiar', letras: 'Letras', numeros: 'Números', silabas: 'Sílabas',
  next: 'Siguiente', again: 'Otra vez', rug: 'Alfombra',
};
export const ITEM_WORDS = {
  beanbag: 'puf', teddy: 'osito', toybox: 'caja de juguetes', easel: 'caballete', fishtank: 'pecera', globe: 'globo terráqueo',
  flowers: 'flores', balloons: 'globos', lamp: 'lámpara', rainbow: 'arcoíris', poster: 'cartel', frame: 'cuadro',
  butterflies: 'mariposas', garland: 'guirnalda', sun: 'sol', moon: 'luna', clock: 'reloj',
  apple: 'manzana', pencils: 'lápices', books: 'libros', crayons: 'crayones', cactus: 'cactus', snowglobe: 'bola de nieve',
};
export const HINTS = {
  decorate: '¡Decora tu salón!', ring: 'Toca la campana para empezar.', attendance: 'Toca a cada amigo para pasar lista.',
  mood: '¡Alguien necesita ayuda!', question: '¡Tienen una pregunta!', board: 'Toca el pizarrón para dibujar.',
  star: 'Dale una estrella a un amigo.', play: '¡Vamos a jugar!', abc: '¡Vamos a escribir letras!', home: 'Cuando termines, toca la casita.',
  trace: 'Empieza en el punto verde.', shapes: 'Pon cada figura en su lugar.', draw: '¡Dibuja con un marcador!',
  chart: 'Mueve a tus amigos y toca la campana.', naughty: '¿Quién necesita una tarjeta?',
  closeTray: 'Toca el pincel para guardar la bandeja.', homeAsk: '¿Ya nos vamos a casa?',
  recessEnd: 'Toca la campana para volver a clase.', centrosEnd: 'Toca la palomita para terminar.',
  storyPage: 'Toca el libro para pasar la página.', snackWait: 'Espera, están comiendo.',
};

// ---- v1.9 activities
// serve snack (students say '¡Gracias!' / '¡Qué rico!'; the owl counts 'uno'…'cinco' — clips exist)
export const SNACK_THANKS = ['¡Gracias!', '¡Qué rico!'];
export const COUNT_WORDS = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho']; // v2.0: up to eight friends (number clips already exist)
export const SNACK_FULL = '¡Ya comí!';
// knock-knock door
export const DOOR_LINES = { late: '¡Perdón, maestra! Llegué tarde.', ball: '¡Mi pelota!', parcel: '¡Algo nuevo para el salón!' };
// story books: the owl reads one short line per page, a friend echoes the key word (art: pages.js BOOKS)
export const BOOK_TEXT = [
  { title: '¡Pato y la lluvia!', lines: ['Pato sale a jugar.', '¡Ay! Llueve mucho.', 'Pato salta en el charco.', '¡Mira! Un arcoíris.'], words: ['¡Pato!', '¡Llueve!', '¡Salta!', '¡Arcoíris!'] },
  { title: '¡La semillita!', lines: ['Una semillita duerme.', 'Sale el sol. Cae el agua.', 'Crece, crece, crece.', '¡Una flor muy grande!'], words: ['¡Semillita!', '¡Agua!', '¡Crece!', '¡Flor!'] },
  { title: '¡El cohete!', lines: ['El cohete está listo.', 'Tres, dos, uno… ¡Despega!', 'Vuela con las estrellas.', '¡Hola, luna!'], words: ['¡Cohete!', '¡Despega!', '¡Estrellas!', '¡Luna!'] },
];
export const V19_HINTS = {
  snackServe: 'Dale la merienda a tus amigos.', door: 'Toc, toc. ¿Quién será?', parcel: '¡Abre la caja!',
  ballBack: 'Toca al perrito para regresar la pelota.', storyPick: 'Escoge un cuento.',
};
Object.assign(HINTS, V19_HINTS);
Object.assign(ITEM_WORDS, { dino: 'dinosaurio', robot: 'robot', rocket: 'cohete' });
const V19_STUDENT = () => [...SNACK_THANKS, SNACK_FULL, DOOR_LINES.late, DOOR_LINES.ball, ...BOOK_TEXT.flatMap(b => b.words)];
const V19_OWL = () => [...COUNT_WORDS, DOOR_LINES.parcel, ...BOOK_TEXT.flatMap(b => [b.title, ...b.lines])];

// ---- v2.0 decorating
// the tray's picture tabs, the edit bubbles and undo (owl voice), the room themes and the new decorations
export const DECO_UI = {
  themes: 'Temas', desks: 'Escritorios', colors: 'Colores', undo: 'Deshacer', color: 'Otro color', size: 'Tamaño',
};
export const THEME_NAMES = {
  oceano: '¡Océano!', espacio: '¡Espacio!', jardin: '¡Jardín!', arcoiris: '¡Arcoíris!',
  otono: '¡Otoño!', fiesta: '¡Fiesta!', invierno: '¡Invierno!', cuentos: '¡Cuentos!',
};
export const DECO_HINTS = { decoTheme: 'Toca un dibujo para decorar todo el salón.', decoEdit: 'Toca algo para cambiarlo.', decoDesk: 'Pon algo en cada escritorio.' };
export const DECO_SAY = { wow: '¡Qué bonito quedó el salón!' };
Object.assign(UI_WORDS, DECO_UI);
Object.assign(HINTS, DECO_HINTS);
Object.assign(ITEM_WORDS, {
  teepee: 'tienda de lectura', hamster: 'hámster', cubbies: 'casilleros', pumpkin: 'calabaza', snowman: 'muñeco de nieve',
  lights: 'lucecitas', lanterns: 'farolitos', artwall: 'mis dibujos', wordwall: 'muro de palabras', bulletin: 'tablero',
  winplants: 'plantitas', planet: 'planeta', fishmobile: 'pececitos', snowflakes: 'copos de nieve', leaves: 'hojas de otoño',
});
const V20_DECO = () => [...Object.values(THEME_NAMES), DECO_SAY.wow];

// ---- v2.0 schedule
// the "Horario" cards (names spoken by the owl when a card is tapped) and '¡Es hora de…!' for each block
export const SCHED_NAMES = {
  b_decorar: 'Decorar', b_manana: 'Trabajo de la mañana', b_calendario: 'Calendario', b_alfabeto: 'Alfabeto', b_recreo: 'Recreo',
  b_lectura: 'Lectura con maestra', b_heggerty: 'Heggerty', b_sla: 'Ese, ele, a', b_centros: 'Centros de aprendizaje',
  b_almuerzo: 'Almuerzo', b_lector: 'Lector misterioso', b_casa: 'Casa',
  pizarra: 'Pizarra', figuras: 'Figuras', emociones: 'Emociones', lector: 'Lector misterioso',
};
export const SCHED_SAY = {
  decorar: '¡Vamos a decorar el salón!', manana: '¡Es hora del trabajo de la mañana!', calendario: '¡Es hora del calendario!',
  alfabeto: '¡Es hora del alfabeto!', recreo: '¡Es hora del recreo!', lectura: '¡Es hora de lectura con maestra!',
  heggerty: '¡Es hora de Heggerty!', sla: '¡Es hora de ese, ele, a!', centros: '¡Es hora de centros de aprendizaje!',
  almuerzo: '¡Es hora del almuerzo!', lector: '¡Es hora del lector misterioso!', casa: '¡Es hora de ir a casa!',
};
export const SCHED_HINTS = {
  next: 'Toca la flecha para seguir.', choice: 'Toca una tarjeta para empezar.', attendanceBig: 'Toca a cada amigo para pasar lista.',
};
export const MYSTERY_LINES = { guest: '¡Hola, niños! Soy el lector misterioso.', kid: '¡Es mi abuelita!' };
Object.assign(UI_WORDS, SCHED_NAMES, { snack: 'Almuerzo' });
Object.assign(HINTS, SCHED_HINTS, { snackServe: 'Dale el almuerzo a tus amigos.' });
const V20_OWL = () => [...Object.values(SCHED_SAY), MYSTERY_LINES.guest];
/** lines the Lector Misterioso grandma reads in her own voice (audio/guest/) */
export const guestPhrases = () => [MYSTERY_LINES.guest, ...BOOK_TEXT.flatMap(b => [b.title, ...b.lines])];

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
  Object.values(CARD_LINES).forEach(l => out.add(l));
  Object.values(NAUGHTY_LINES).forEach(l => out.add(l));
  CENTERS.forEach(c => { out.add(c.id); out.add(c.line); });
  Object.values(CENTRO_LINES).forEach(l => out.add(l));
  out.add(STAR_COUNT_LINE);
  V19_STUDENT().forEach(l => out.add(l));
  V20_STUDENT().forEach(l => out.add(l));
  Object.values(ALIVE_LINES).forEach(l => out.add(l));
  [...WEATHER.map(w => w.word), ...Object.values(WEATHER_RECESS), ...JOBS.map(j => j.word), ...Object.values(JOB_LINES)].forEach(l => out.add(l));
  Object.values(YARD_LINES).forEach(l => out.add(l));
  return [...out];
}
/** lines only the owl (our reading helper) says */
export function narratorPhrases() {
  const out = new Set([SIL_HELLO]);
  for (const c of FAMILIES) for (const v of VOWELS) out.add(c + v);
  for (const w of WORDS) { out.add(w.w); w.s.forEach(x => out.add(x)); }
  [UI_WORDS, ITEM_WORDS, HINTS].forEach(o => Object.values(o).forEach(x => out.add(x)));
  V19_OWL().forEach(l => out.add(l));
  V20_OWL().forEach(l => out.add(l));
  V20_DECO().forEach(l => out.add(l));
  Object.values(ALIVE_OWL).forEach(x => out.add(x));
  [WEATHER_ASK, ...WEATHER.map(w => w.line), ...Object.values(RITUAL_UI), ...Object.values(RITUAL_HINTS)].forEach(l => out.add(l));
  Object.values(YARD_HINTS).forEach(l => out.add(l));
  return [...out];
}
