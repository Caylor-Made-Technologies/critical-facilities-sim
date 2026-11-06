/**
 * Offline support + "new version ready" (B-001, B-003). Production only.
 * Caches this app's own files in the browser. Nothing is sent anywhere.
 *
 * A new deploy installs a new worker in the background. It waits (so open tabs keep
 * their files) until the person taps Reload; then it takes over and the page reloads once.
 */
type Listener = () => void;
let waiting: ServiceWorker | null = null;
const listeners = new Set<Listener>();

function setWaiting(w: ServiceWorker | null) {
  waiting = w;
  if (w) listeners.forEach((l) => l());
}

/** Calls back when a new version is downloaded and ready. Returns an unsubscribe function. */
export function onUpdateReady(l: Listener): () => void {
  listeners.add(l);
  if (waiting) l();
  return () => listeners.delete(l);
}

/** Switch to the new version now (the page reloads when it takes over). */
export function applyUpdate(): void {
  if (!waiting) return window.location.reload();
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  waiting.postMessage('skip-waiting');
}

export function registerServiceWorker(url: string): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(url)
      .then((reg) => {
        // Only an update counts: on a first visit there is no controller yet.
        const watch = (w: ServiceWorker | null) => {
          if (!w) return;
          const check = () => w.state === 'installed' && navigator.serviceWorker.controller && setWaiting(w);
          check();
          w.addEventListener('statechange', check);
        };
        watch(reg.waiting);
        watch(reg.installing);
        reg.addEventListener('updatefound', () => watch(reg.installing));
        // Long-open installed apps: look for a new version when brought back to the front (at most hourly).
        let last = Date.now();
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible' || Date.now() - last < 3_600_000) return;
          last = Date.now();
          reg.update().catch(() => undefined);
        });
      })
      .catch(() => {
        /* offline mode unavailable; the app still works online */
      });
  });
}
