// Entrenos — service worker: la app funciona sin conexión.
const CACHE = 'entrenos-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      // Red primero (para recibir actualizaciones), caché si no hay conexión.
      e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html')));
    } else {
      e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
    }
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.host)) {
    // Fuentes: caché primero, se refrescan en segundo plano.
    e.respondWith(caches.open(CACHE).then(async c => {
      const cached = await c.match(req);
      const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => cached);
      return cached || net;
    }));
  }
});
