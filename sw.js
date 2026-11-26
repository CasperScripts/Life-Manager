const CACHE = 'pockettrack-shell-v4';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './logo.svg',
  './icon-192.jpg',
  './icon-512.jpg',
  './apple-touch-icon.jpg',
  './js/data.js',
  './js/icons.js',
  './js/money.js',
  './js/health.js',
  './js/routines.js',
  './js/schedule.js',
  './js/home.js',
  './js/reminders.js',
  './js/app.js'
];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  if (e.request.method === 'GET') e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
