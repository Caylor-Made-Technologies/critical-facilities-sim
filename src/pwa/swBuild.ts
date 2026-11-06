/**
 * Build-time helpers for the service worker (used by vite.config.ts, never shipped).
 *
 * The browser only installs a new service worker when the bytes of sw.js change.
 * So every build stamps a cache name made from everything the worker caches:
 * the built file list (names carry content hashes), index.html, the public/ files
 * and the worker template itself. Same build in → same sw.js out; any change → new
 * cache name → new worker → new files precached, old cache deleted (B-001).
 */

export const CACHE_TOKEN = '__CFS_CACHE__';

/** Small, fast, stable string hash (53-bit, cyrb53). Not for security, only for change detection. */
export function hash53(s: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** What one build caches: built file names, index.html text, and public files as name → content. */
export interface BuildInputs {
  files: string[];
  indexHtml: string;
  publicFiles: Record<string, string>;
}

/** Cache name for one build: "cfs-" + a hash of everything it caches. Order-independent. */
export function cacheName(template: string, b: BuildInputs): string {
  const pub = Object.keys(b.publicFiles)
    .sort()
    .map((k) => `${k}:${hash53(b.publicFiles[k]!)}`);
  const parts = [hash53(template), [...b.files].sort().join('|'), hash53(b.indexHtml), pub.join('|')];
  return `cfs-${hash53(parts.join('\n'))}`;
}

/** The sw.js text for one build. Throws if the template lost its cache-name placeholder. */
export function buildSw(template: string, b: BuildInputs): string {
  if (!template.includes(CACHE_TOKEN)) throw new Error(`service worker template has no ${CACHE_TOKEN}`);
  return template.split(CACHE_TOKEN).join(cacheName(template, b));
}
