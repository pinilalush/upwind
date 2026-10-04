// v3 – Offline support. The page is fetched from the network first (so updates
// arrive automatically), with the saved copy used when there is no signal.
const CACHE = "upwind-cache";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)); }

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fonts: use saved copy if there is one, otherwise fetch and save.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.searchParams.has("check")) return; // version check always goes to the network

  // App files: network first (4 s), then saved copy.
  e.respondWith(
    Promise.race([fetch(req.url, {cache: "no-cache", credentials: "same-origin"}), timeout(4000)])
      .then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, {ignoreSearch: true}).then((hit) => hit || caches.match("./index.html")))
  );
});
