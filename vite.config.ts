import { defineConfig, type Plugin } from 'vite';
import { buildSw } from './src/pwa/swBuild';

// Node built-ins without @types/node (no extra dependency just for two calls).
declare const process: { getBuiltinModule(id: 'node:fs'): { readFileSync(p: string, enc?: 'base64' | 'utf8'): string; readdirSync(p: string, o: { recursive: true }): string[]; statSync(p: string): { isFile(): boolean } } };
const fs = process.getBuiltinModule('node:fs');
const root = new URL('.', import.meta.url).pathname;

// Lists every built file so the service worker can cache all of it on install
// (lazy tabs and 3D included), and the app works offline after one visit.
const precacheList = (): Plugin => ({
  name: 'precache-list',
  generateBundle(_opts, bundle) {
    const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'index.html');
    this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) });
  },
});

// Writes sw.js with a cache name stamped from this build, so every deploy installs a
// fresh worker (B-001). Template: src/pwa/sw.template.js. Logic + tests: src/pwa/swBuild.ts.
const serviceWorker = (): Plugin => ({
  name: 'service-worker',
  apply: 'build',
  generateBundle(_opts, bundle) {
    const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
    const html = bundle['index.html'];
    const indexHtml = html && html.type === 'asset' ? String(html.source) : '';
    const pubDir = `${root}public/`;
    const publicFiles: Record<string, string> = {};
    for (const f of fs.readdirSync(pubDir, { recursive: true })) {
      if (fs.statSync(pubDir + f).isFile()) publicFiles[f] = fs.readFileSync(pubDir + f, 'base64');
    }
    const template = fs.readFileSync(`${root}src/pwa/sw.template.js`, 'utf8');
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: buildSw(template, { files, indexHtml, publicFiles }) });
  },
});
import react from '@vitejs/plugin-react';

// Served from https://<org>.github.io/critical-facilities-sim/ on GitHub Pages.
export default defineConfig({
  base: '/critical-facilities-sim/',
  plugins: [react(), precacheList(), serviceWorker()],
  build: {
    // Never inline assets as data: URIs, so the CSP can stay strict.
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
