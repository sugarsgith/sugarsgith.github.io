// 体調ログ service worker (scope /taicho/): network-first, cache fallback offline.
const CACHE = 'taicho-v1';
const PRECACHE = ['/taicho/', '/taicho/index.html', '/taicho/manifest.webmanifest',
  '/taicho/icons/apple-touch-icon.png', '/taicho/icons/icon-192.png',
  '/taicho/icons/icon-512.png', '/taicho/icons/icon-512-maskable.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(PRECACHE.map(u => fetch(u, {cache: 'no-store'}).then(r => r.ok && c.put(u, r)).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('taicho-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const key = url.origin + url.pathname;
  e.respondWith((async () => {
    try {
      const res = await fetch(req, {cache: 'no-store'});
      if (res && res.ok && res.type === 'basic') { const c = await caches.open(CACHE); c.put(key, res.clone()); }
      return res;
    } catch (err) {
      const hit = await caches.match(key, {cacheName: CACHE}) || (req.mode === 'navigate' && await caches.match('/taicho/', {cacheName: CACHE}));
      if (hit) return hit;
      throw err;
    }
  })());
});
