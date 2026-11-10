// Offline cache: everything the game needs is cached on first load.
// the version comes from js/version.js (main.js registers sw.js?v=<version>)
const CACHE = 'little-teacher-' + (new URL(self.location).searchParams.get('v') || 'dev');
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './js/main.js', './js/version.js', './js/state.js', './js/raster.js', './js/sprites.js', './js/audio.js',
  './js/students.js', './js/classroom.js', './js/board.js', './js/pages.js', './js/decor.js', './js/i18n.js', './js/pictures.js', './js/row.js', './js/letters.js', './js/shapes.js', './js/playground.js', './js/strokes.js', './js/hints.js', './js/music.js', './js/learndata.js', './js/quiz.js', './js/silabas.js', './js/schedule.js', './js/decorate.js', './js/rituals.js', './js/schoolfont.js', './js/hires.js', './audio/clips.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// App code (html/js/json): network first, so a new version shows up as soon as she's online;
// falls back to the saved copy when offline. Voice clips and images: saved copy first.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isMedia = /\.(mp3|png)$/.test(url.pathname);
  e.respondWith(caches.open(CACHE).then(async (c) => {
    if (isMedia) {
      const hit = await c.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(e.request).catch(() => null);
      if (res && res.ok) c.put(e.request, res.clone());
      return res || Response.error();
    }
    try {
      const res = await Promise.race([fetch(e.request, { cache: 'no-cache' }), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
      if (res.ok) c.put(e.request, res.clone());
      return res;
    } catch (err) {
      return (await c.match(e.request, { ignoreSearch: true })) || (await c.match('./index.html')) || Response.error();
    }
  }));
});
