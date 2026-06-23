/* Park&Speech — service worker (network-first, offline fallback) */
const CACHE = "voce-v3";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    fetch(req)
      .then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)).catch(()=>{}); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match("./")))
  );
});
