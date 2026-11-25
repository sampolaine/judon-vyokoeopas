/* Keeps the cards working offline from the home-screen icon. Only this site's own files are cached;
   YouTube's player is never touched (it isn't same-origin), so offline the page shows its own message. */
'use strict';
// One origin (the github.io site) holds other apps too: only caches named vyokoeopas- are ours to touch
var PREFIX = 'vyokoeopas-', CACHE = PREFIX + '1c892d03a8d2';
var FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
// the page waits this long for the network before the cached copy answers (a slow or captive network)
var WAIT = 3000;
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // past the HTTP cache (GitHub Pages says max-age=600), so a new worker never stores the old page
    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'no-cache' }); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function cached(r) {
  // only our own cache: the origin holds other apps' caches too
  return caches.open(CACHE).then(function (c) {
    return c.match(r, { ignoreSearch: true }).then(function (hit) { return hit || c.match('index.html'); });
  });
}
self.addEventListener('fetch', function (e) {
  var r = e.request, url = new URL(r.url);
  if (r.method !== 'GET' || url.origin !== self.location.origin) return;
  var scope = new URL(self.registration.scope);
  // the version check goes to the network only, never to a cache (part 5)
  if (url.pathname === scope.pathname + 'version.json') {
    e.respondWith(fetch(url.href, { cache: 'no-cache' }));
    return;
  }
  var page = r.mode === 'navigate' || url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html';
  // The page: always asked again (revalidated past the HTTP cache), the cache only offline or after WAIT.
  // Other files: the network first too, the cache when it fails.
  var net = (page ? fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(r)).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(page ? 'index.html' : r, copy); }); }
    return res;
  });
  if (!page) { e.respondWith(net.catch(function () { return cached(r); })); return; }
  e.respondWith(new Promise(function (done) {
    var late = setTimeout(function () { cached(r).then(function (hit) { if (hit) done(hit); }); }, WAIT);
    net.then(function (res) { clearTimeout(late); done(res); }, function () {
      clearTimeout(late);
      cached(r).then(function (hit) { done(hit || Response.error()); });
    });
  }));
});
