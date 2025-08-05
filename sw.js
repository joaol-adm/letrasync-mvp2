
const CACHE_NAME = "letrasync-v22-mic";
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([
      "/",
      "/index.html",
      "/app.js",
      "/manifest.json",
      "/icon-192.png",
      "/icon-512.png"
    ]))
  );
});
self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
