const VERSION = "gestionnaire-v2";
const FICHIERS = ["./", "./index.html", "./manifest.json", "./logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(FICHIERS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(
        noms.filter((n) => n !== VERSION).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

function aGarder(url) {
  return url.origin === self.location.origin || url.hostname === "www.gstatic.com";
}

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (!aGarder(url)) return;

  event.respondWith(
    fetch(requete)
      .then((reponse) => {
        if (reponse && reponse.status === 200) {
          const copie = reponse.clone();
          caches.open(VERSION).then((cache) => cache.put(requete, copie));
        }
        return reponse;
      })
      .catch(() =>
        caches.match(requete, { ignoreSearch: true, ignoreVary: true }).then((trouve) => {
          if (trouve) return trouve;
          if (requete.mode === "navigate") {
            return caches.match("./index.html", { ignoreSearch: true });
          }
          return Response.error();
        })
      )
  );
});
