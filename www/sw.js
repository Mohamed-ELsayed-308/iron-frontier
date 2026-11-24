const CACHE_NAME = "iron-frontier-v30";
// لازم تطابق الروابط في index.html بالضبط (بما فيها ?v=) وإلا لن تعمل اللعبة بدون إنترنت
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js?v=30", "./manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
