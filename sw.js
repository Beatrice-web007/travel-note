/* 旅途记 Service Worker —— 应用壳离线缓存 */
const CACHE = 'travel-note-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'css/styles.css',
  'js/util.js',
  'js/store.js',
  'js/dates.js',
  'js/form.js',
  'js/views.js',
  'js/app.js',
  'icons/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match('index.html'));
    })
  );
});
