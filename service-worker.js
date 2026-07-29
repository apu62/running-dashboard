const CACHE = "running-dashboard-v3.2.3";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./icons/app-icon.svg",
  "./css/main.css", "./css/layout.css", "./css/dashboard.css", "./css/mobile.css", "./css/themes.css",
  "./js/app.js?v=3.2.3", "./js/storage.js?v=3.2.3", "./js/migration.js?v=3.2.3", "./js/statistics.js?v=3.2.3", "./js/dashboard.js?v=3.2.3",
  "./js/history.js?v=3.2.3", "./js/shoes.js?v=3.2.3", "./js/backup.js?v=3.2.3", "./js/ui.js?v=3.2.3", "./js/uuid.js?v=3.2.3",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
        return response;
      })
      .catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(fetch(event.request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      }
      return response;
    })
    .catch(() => caches.match(event.request)
      .then((cached) => cached || new Response("Ressource ist offline nicht verfügbar.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }))));
});
