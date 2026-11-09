// Offline cache: everything the game needs is cached on first load.
const CACHE = 'little-teacher-v2';
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './js/main.js', './js/state.js', './js/raster.js', './js/sprites.js', './js/audio.js',
  './js/students.js', './js/classroom.js', './js/board.js', './js/pages.js', './js/decor.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Serve from cache instantly (works offline), and refresh the cache in the background
// so a new version shows up the next time the app is opened.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (await c.match('./index.html')) || Response.error();
  }));
});
