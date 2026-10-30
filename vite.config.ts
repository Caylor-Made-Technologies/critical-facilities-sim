import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://<org>.github.io/critical-facilities-sim/ on GitHub Pages.
export default defineConfig({
  base: '/critical-facilities-sim/',
  plugins: [react()],
  build: {
    // Never inline assets as data: URIs, so the CSP can stay strict.
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
