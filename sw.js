const VERSION = "gestionnaire-v1";
const RACINE = self.registration.scope;
const INDEX = RACINE + "index.html";
const FICHIERS = [RACINE, INDEX, RACINE + "manifest.json", RACINE + "logo.png"];

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
        noms
          .filter((nom) => nom.startsWith("gestionnaire-") && nom !== VERSION)
          .map((nom) => caches.delete(nom))
      ))
      .then(() => self.clients.claim())
  );
});

async function cacheDabord(requete) {
  const cache = await caches.open(VERSION);
  const trouve = await cache.match(requete);
  if (trouve) return trouve;
  const reponse = await fetch(requete);
  if (reponse && reponse.ok) cache.put(requete, reponse.clone());
  return reponse;
}

async function reseauPuisCache(requete) {
  const cache = await caches.open(VERSION);
  try {
    const reponse = await Promise.race([
      fetch(requete),
      new Promise((_, rejeter) => setTimeout(() => rejeter(new Error("lent")), 4000))
    ]);
    if (reponse && reponse.ok) cache.put(INDEX, reponse.clone());
    return reponse;
  } catch (e) {
    return (await cache.match(INDEX)) || (await cache.match(RACINE)) || Response.error();
  }
}

async function cacheEtMiseAJour(requete) {
  const cache = await caches.open(VERSION);
  const trouve = await cache.match(requete);
  const reseau = fetch(requete)
    .then((reponse) => {
      if (reponse && reponse.ok) cache.put(requete, reponse.clone());
      return reponse;
    })
    .catch(() => null);
  return trouve || (await reseau) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);

  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) {
    event.respondWith(cacheDabord(requete));
    return;
  }

  if (url.origin === self.location.origin) {
    if (requete.mode === "navigate") {
      event.respondWith(reseauPuisCache(requete));
    } else {
      event.respondWith(cacheEtMiseAJour(requete));
    }
  }
});
