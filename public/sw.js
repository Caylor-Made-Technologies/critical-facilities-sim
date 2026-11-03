/*
 * Offline support. Caches this app's own files only; nothing is sent anywhere.
 * Pages: network first, so updates arrive as soon as you're online.
 * Hashed build files, fonts and images: cache first (their names change when they change).
 */
const CACHE = 'cfs-v3';
const SCOPE = self.registration.scope;

// Precache the page plus the build files and fonts it links to, so the very next visit works offline.
async function precache() {
  const c = await caches.open(CACHE);
  const res = await fetch(SCOPE, { cache: 'no-cache' });
  const html = await res.clone().text();
  await c.put(SCOPE, res);
  const linked = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|woff2|png|ico|webmanifest))"/g)].map((m) => new URL(m[1], SCOPE).href);
  const extra = ['brand/logo-mark.png', 'brand/app-mark.png', 'icon-192.png', 'fonts/montserrat-latin-wght-normal.woff2', 'fonts/inter-latin-wght-normal.woff2'].map((p) => SCOPE + p);
  await c.addAll([...new Set([...linked, ...extra])].filter((u) => u.startsWith(SCOPE)));
}

self.addEventListener('install', (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE)) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(SCOPE, copy));
          }
          return res;
        })
        .catch(() => caches.match(SCOPE).then((r) => r || Response.error())),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
