import { defineConfig, type Plugin } from 'vite';

// Lists every built file so the service worker can cache all of it on install
// (lazy tabs and 3D included), and the app works offline after one visit.
const precacheList = (): Plugin => ({
  name: 'precache-list',
  generateBundle(_opts, bundle) {
    const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'index.html');
    this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) });
  },
});
import react from '@vitejs/plugin-react';

// Served from https://<org>.github.io/critical-facilities-sim/ on GitHub Pages.
export default defineConfig({
  base: '/critical-facilities-sim/',
  plugins: [react(), precacheList()],
  build: {
    // Never inline assets as data: URIs, so the CSP can stay strict.
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
