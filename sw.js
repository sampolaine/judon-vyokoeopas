/* Keeps the cards working offline from the home-screen icon. Only this site's own files are cached;
   YouTube's player is never touched (it isn't same-origin), so offline the page shows its own message. */
'use strict';
// One origin (the github.io site) holds other apps too: only caches named vyokoeopas- are ours to touch
var PREFIX = 'vyokoeopas-', CACHE = PREFIX + 'fbb1043171cb';
var FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// The network first, so a new version shows when online; the cache when it fails.
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(fetch(r).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); }
    return res;
  }).catch(function () {
    // only our own cache: the origin holds other apps' caches too
    return caches.open(CACHE).then(function (c) {
      return c.match(r, { ignoreSearch: true }).then(function (hit) { return hit || c.match('index.html'); });
    });
  }));
});
