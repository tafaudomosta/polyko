/* Polyko — sw.js: يحفظ الموقع على الجهاز ليعمل بدون إنترنت. يعمل فقط على https. */
var CACHE = 'polyko-v4';
var CORE = ['./', 'index.html', 'about.html', 'privacy.html', 'game.html', 'css/style.css', 'js/common.js', 'js/app.js', 'js/game.js',
  'data.js', 'library.js', 'assets/favicon.svg', 'assets/logo.svg', 'favicon.ico', 'manifest.webmanifest', 'assets/icon-192.png', 'assets/apple-touch-icon.png', 'articles.html', 'contact.html', 'js/ads.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function timeout(ms) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); }); }

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  var big = /\.(pdf|webp|jpe?g|png|gif|avif)$/i.test(url.pathname);

  if (big) {            // ملفات ثقيلة: من الذاكرة إن وُجدت، وإلا من الشبكة ثم تُحفظ
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && !req.headers.get('range')) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return res;
      });
    }));
    return;
  }
  // صفحات وسكربتات: الشبكة أولاً (لتصل التحديثات فوراً)، وعند الفشل الذاكرة، وإلا صفحة اللعبة
  e.respondWith(Promise.race([fetch(req), timeout(6000)]).then(function (res) {
    if (res && res.status === 200) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match('game.html');
      return Response.error();
    });
  }));
});
