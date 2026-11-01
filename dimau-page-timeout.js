/* Dimau page guard — weak-signal timeout for page loads.
   Load it on the FIRST line of an app's sw.js:  importScripts('/dimau-page-timeout.js');
   It handles page loads only; the app's own worker keeps handling everything else.

   - Normal signal: the page comes from the network, exactly as before.
   - Weak 3G (no answer in 4 seconds): if this page was saved on an earlier
     visit, show the saved copy now. The network answer still arrives in the
     background and refreshes the saved copy for next time.
   - No signal: show the saved copy of this page, or the saved home page.
   - Never-visited page on a slow signal: keep waiting for the network.
   Pages with a ?query are never saved (they can hold plans, trips or tokens). */
(function () {
  'use strict';
  var TIMEOUT = self.DIMAU_PAGE_TIMEOUT_MS || 4000;
  var CACHE = 'dimau-pages-v1';
  var OFFLINE = 'You are offline. Reconnect to load this page for the first time.';

  function firstHit(keys) {
    return keys.reduce(function (chain, key) {
      return chain.then(function (hit) {
        return hit || caches.match(key, { ignoreSearch: true }).catch(function () { return null; });
      });
    }, Promise.resolve(null));
  }
  function thisPage(request, url) { return firstHit([request, url.origin + url.pathname]); }
  function homePage() { return firstHit(['/', '/index.html', 'index.html', './']); }

  self.addEventListener('fetch', function (event) {
    var request = event.request;
    if (request.method !== 'GET' || request.mode !== 'navigate') return;
    var url;
    try { url = new URL(request.url); } catch (err) { return; }
    if (url.origin !== self.location.origin) return;

    var network = fetch(request);
    event.waitUntil(network.then(function (res) {
      if (!res || !res.ok || res.type !== 'basic' || res.redirected || url.search) return null;
      var copy = res.clone();
      return caches.open(CACHE).then(function (cache) { return cache.put(url.origin + url.pathname, copy); });
    }).catch(function () { return null; }));

    event.respondWith(new Promise(function (resolve) {
      var done = false;
      function finish(res) { if (!done) { done = true; resolve(res); } }
      var timer = setTimeout(function () {
        thisPage(request, url).then(function (hit) { if (hit) finish(hit); });
      }, TIMEOUT);
      network.then(function (res) { clearTimeout(timer); finish(res); }, function () {
        clearTimeout(timer);
        thisPage(request, url)
          .then(function (hit) { return hit || homePage(); })
          .then(function (hit) {
            finish(hit || new Response(OFFLINE, { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
          });
      });
    }));
    /* The app's own worker must not also try to answer this page. */
    event.stopImmediatePropagation();
  });
})();
