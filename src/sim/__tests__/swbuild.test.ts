import { buildSw, cacheName, CACHE_TOKEN, hash53 } from '../../pwa/swBuild';

// B-001: the service worker must change whenever anything it caches changes,
// and stay byte-identical when nothing does.
const T = `const CACHE = '${CACHE_TOKEN}';\nself.x = CACHE;`;
const base = { files: ['assets/index-A1.js', 'assets/Glossary-B2.js', 'precache.json'], indexHtml: '<html>a</html>', publicFiles: { 'icon-192.png': 'AAAA', 'fonts/inter.woff2': 'BBBB' } };

describe('service worker build stamp (B-001)', () => {
  it('same build → same sw.js, and file order does not matter', () => {
    const shuffled = { ...base, files: [...base.files].reverse(), publicFiles: { 'fonts/inter.woff2': 'BBBB', 'icon-192.png': 'AAAA' } };
    expect(buildSw(T, base)).toBe(buildSw(T, shuffled));
  });
  it('a changed chunk, index.html, public file or template → new cache name', () => {
    const name = cacheName(T, base);
    expect(cacheName(T, { ...base, files: ['assets/index-A2.js', 'assets/Glossary-B2.js', 'precache.json'] })).not.toBe(name);
    expect(cacheName(T, { ...base, indexHtml: '<html>b</html>' })).not.toBe(name);
    expect(cacheName(T, { ...base, publicFiles: { ...base.publicFiles, 'icon-192.png': 'AAAB' } })).not.toBe(name);
    expect(cacheName(T + '\n// changed', base)).not.toBe(name);
  });
  it('stamps every placeholder and fails loudly without one', () => {
    const out = buildSw(T, base);
    expect(out).not.toContain(CACHE_TOKEN);
    expect(out).toMatch(/const CACHE = 'cfs-[0-9a-z]+';/);
    expect(() => buildSw('const CACHE = "fixed";', base)).toThrow();
  });
  it('hash is stable and differs for near-identical input', () => {
    expect(hash53('abc')).toBe(hash53('abc'));
    expect(hash53('abc')).not.toBe(hash53('abd'));
    expect(hash53('')).toMatch(/^[0-9a-z]+$/);
  });
});
