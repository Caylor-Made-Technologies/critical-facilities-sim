// Serves dist/ like GitHub Pages does (gzip, under /critical-facilities-sim/), for local Lighthouse runs.
// Dev-only: never shipped. Usage: node scripts/serve-dist.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const BASE = '/critical-facilities-sim/';
const ROOT = new URL('../dist/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const port = Number(process.argv[2] ?? 4175);

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (!url.pathname.startsWith(BASE)) return void res.writeHead(404).end();
  let rel = normalize(decodeURIComponent(url.pathname.slice(BASE.length))).replace(/^(\.\.[/\\])+/, '');
  if (!rel || rel === '.' || rel.endsWith('/')) rel = (rel === '.' ? '' : rel) + 'index.html';
  const file = join(ROOT, rel);
  try {
    if (!(await stat(file)).isFile()) throw new Error('dir');
    let body = await readFile(file);
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    const headers = { 'content-type': type, 'cache-control': 'max-age=600' };
    if (/text|javascript|json|svg|manifest/.test(type) && /gzip/.test(String(req.headers['accept-encoding']))) {
      body = gzipSync(body);
      headers['content-encoding'] = 'gzip';
    }
    res.writeHead(200, headers).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log(`serving dist at http://localhost:${port}${BASE}`));
