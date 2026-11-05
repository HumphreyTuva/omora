// Minimal service worker: it makes the site installable and shows a friendly page when the phone is offline.
// It deliberately caches NO pages, orders or API data, so nothing private is ever stored or shown out of date.
const CACHE = 'omora-shell-v2';
const SHELL = ['/offline.html', '/logo-dark.png', '/icons/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  // Pages: normal network; if the phone is offline, show the offline page.
  if (req.mode === 'navigate') { e.respondWith(fetch(req).catch(() => caches.match('/offline.html'))); return; }
  // The few saved files the offline page itself needs (its logo and icon), so it never shows a broken image.
  if (url.origin === self.location.origin && SHELL.includes(url.pathname)) e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
