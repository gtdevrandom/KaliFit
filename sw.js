const CACHE_NAME = 'vaulta-v2'; // Changé v1 -> v2
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './crypto.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
