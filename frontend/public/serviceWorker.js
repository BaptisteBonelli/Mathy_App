// public/serviceWorker.js
const CACHE_NAME = "math-auto-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/static/js/bundle.js", // À adapter selon ton build
];

// Installation du Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Récupération des ressources
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});