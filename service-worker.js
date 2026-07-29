const CACHE = "running-dashboard-v3.2.2";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./icons/app-icon.svg",
  "./css/main.css", "./css/layout.css", "./css/dashboard.css", "./css/mobile.css", "./css/themes.css",
  "./js/app.js", "./js/storage.js", "./js/migration.js", "./js/statistics.js", "./js/dashboard.js",
  "./js/history.js", "./js/shoes.js", "./js/backup.js", "./js/ui.js", "./js/uuid.js",
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
