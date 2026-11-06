// Test helper: serves a private copy of dist/ under /critical-facilities-sim/ on a free port,
// so a test can "deploy" a new version into its copy without touching other tests.
import { createServer } from 'node:http';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

const BASE = '/critical-facilities-sim/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };

export async function startSiteCopy(dist) {
  const root = mkdtempSync(join(tmpdir(), 'cfs-site-'));
  cpSync(dist, root, { recursive: true });
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (!url.pathname.startsWith(BASE)) return void res.writeHead(404).end();
    let rel = normalize(decodeURIComponent(url.pathname.slice(BASE.length))).replace(/^(\.\.[/\\])+/, '');
    if (!rel || rel === '.' || rel.endsWith('/')) rel = (rel === '.' ? '' : rel) + 'index.html';
    try {
      const file = join(root, rel);
      if (!statSync(file).isFile()) throw new Error('dir');
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' }).end(readFileSync(file));
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  return {
    url: `http://127.0.0.1:${port}${BASE}`,
    read: (f) => readFileSync(join(root, f), 'utf8'),
    write: (f, text) => writeFileSync(join(root, f), text),
    close: async () => {
      await new Promise((r) => server.close(r));
      rmSync(root, { recursive: true, force: true });
    },
  };
}
