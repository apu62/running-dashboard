const CACHE = "running-dashboard-v3.2.5";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./icons/app-icon.svg",
  "./css/main.css?v=3.2.5", "./css/layout.css?v=3.2.5", "./css/dashboard.css?v=3.2.5", "./css/mobile.css?v=3.2.5", "./css/themes.css?v=3.2.5",
  "./js/app.js?v=3.2.5", "./js/storage.js?v=3.2.5", "./js/migration.js?v=3.2.5", "./js/statistics.js?v=3.2.5", "./js/dashboard.js?v=3.2.5",
  "./js/history.js?v=3.2.5", "./js/shoes.js?v=3.2.5", "./js/backup.js?v=3.2.5", "./js/ui.js?v=3.2.5", "./js/uuid.js?v=3.2.5",
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
