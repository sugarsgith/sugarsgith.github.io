// SLOTSENSE service worker: network-first (always fresh online), cache fallback offline.
const CACHE = 'slotsense-v4';
const PRECACHE = ['/', '/lycoris/', '/enen2/', '/umineko2/', '/magireco/', '/hyena/', '/history/', '/bofuri/', '/otome5/',
  '/manifest.webmanifest', '/icons/apple-touch-icon.png', '/icons/icon-192.png',
  '/icons/icon-512.png', '/icons/icon-512-maskable.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(PRECACHE.map(u => fetch(u, {cache: 'no-store'}).then(r => r.ok && c.put(u, r)).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('slotsense-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin
  const key = url.origin + url.pathname;            // ignore query (cache-busting) for the cache key
  e.respondWith((async () => {
    try {
      const res = await fetch(req, {cache: 'no-store'});
      if (res && res.ok && res.type === 'basic') {
        const c = await caches.open(CACHE); c.put(key, res.clone());
      }
      return res;
    } catch (err) {
      const hit = await caches.match(key) || (req.mode === 'navigate' && await caches.match('/'));
      if (hit) return hit;
      throw err;
    }
  })());
});
