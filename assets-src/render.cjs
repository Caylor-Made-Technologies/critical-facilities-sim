// Renders icon.svg into the PNG sizes the app needs. Run: node assets-src/render.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const svg = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');
// Full-bleed variant (square tile) for maskable icons and iOS, which crop/round themselves.
const square = svg.replace('rx="112"', 'rx="0"');
// Maskable: shrink artwork into the 80% safe zone on a full-bleed tile.
const maskable = square.replace('<circle cx="256" cy="256" r="190"', '<g transform="translate(256 256) scale(0.8) translate(-256 -256)"><circle cx="256" cy="256" r="190"').replace('</svg>', '</g></svg>');
(async () => {
  const b = await chromium.launch();
  const out = (name, s, size, transparent = true) => ({ name, s, size, transparent });
  const jobs = [
    out('icon-512.png', svg, 512), out('icon-192.png', svg, 192),
    out('icon-maskable-512.png', maskable, 512), out('icon-maskable-192.png', maskable, 192),
    out('apple-touch-icon.png', square, 180), out('favicon-32.png', svg, 32), out('favicon-16.png', svg, 16), out('favicon-48.png', svg, 48),
    out('brand/app-mark.png', svg, 96),
  ];
  for (const j of jobs) {
    const pg = await b.newPage({ viewport: { width: j.size, height: j.size } });
    await pg.setContent(`<html><body style="margin:0;background:transparent">${j.s.replace('<svg ', `<svg width="${j.size}" height="${j.size}" `)}</body></html>`);
    await pg.screenshot({ path: path.join(__dirname, '..', 'public', j.name), omitBackground: true });
    await pg.close();
  }
  await b.close();
})();
