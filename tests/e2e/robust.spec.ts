import { test, expect } from './fixtures';
import { startSiteCopy } from './helpers/site.mjs';

const DIST = new URL('../../dist/', import.meta.url).pathname;

test.describe('a broken tab never blanks the app (B-002)', () => {
  test.use({ serviceWorkers: 'block' });

  test('a tab whose code fails to load shows its own error card; the rest of the app works', async ({ page, open, problems }, info) => {
    test.skip(info.project.name !== 'laptop-light' && info.project.name !== 'phone-dark', 'two projects are enough');
    await page.route(/GlossaryTab-[^/]*\.js$/, (r) => r.abort());
    await open('#/glossary', { three: false });
    const card = page.getByRole('alert').filter({ has: page.getByRole('heading', { name: /Glossary didn't load/ }) });
    await expect(card).toBeVisible();
    await expect(card.getByRole('button', { name: 'Reload the app' })).toBeVisible();
    await page.screenshot({ path: `tests/e2e/.shots/${info.project.name}-tab-error.png` });
    // Header and navigation still work, and another tab opens normally.
    await expect(page.getByRole('button', { name: /Quick search/ })).toBeVisible();
    await page.evaluate(() => (location.hash = '#/never'));
    await expect(page.locator('main[data-tab="never"] h1')).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: "didn't load" })).toHaveCount(0);
    // The blocked file is expected to log a load error here; nothing else may.
    const unexpected = problems.filter((m) => !/GlossaryTab|Failed to load resource|dynamically imported module|net::ERR_FAILED|registration blocked by Playwright/.test(m));
    expect(unexpected).toEqual([]);
    problems.length = 0;
  });
});

test.describe('updates and offline after a deploy (B-001, B-003)', () => {
  test('a new deploy installs a fresh worker, shows Reload, then the new version works offline', async ({ page, context, problems }, info) => {
    test.skip(info.project.name !== 'laptop-light', 'one project is enough');
    test.setTimeout(120_000);
    const site = await startSiteCopy(DIST);
    try {
      await page.addInitScript(() => {
        sessionStorage.setItem('cfs-splash', '1');
        localStorage.setItem('cfs-sim-3d', '0');
      });
      await page.goto(`${site.url}#/home`);
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30_000 });
      const cacheKeys = () => page.evaluate(() => caches.keys());
      const v1 = (await cacheKeys()).filter((k) => k.startsWith('cfs-'));
      expect(v1).toHaveLength(1);
      // No banner for a first install.
      await expect(page.locator('.upd-bar')).toHaveCount(0);

      // "Deploy" a new build: a new sw.js (new stamped cache name), like any real code change.
      const sw = site.read('sw.js');
      const oldName = /const CACHE = '(cfs-[0-9a-z]+)'/.exec(sw)![1]!;
      site.write('sw.js', sw.replace(oldName, `${oldName}x`));
      await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r!.update()));

      const bar = page.locator('.upd-bar');
      await expect(bar).toContainText('new version');
      await page.waitForTimeout(600); // let the slide-in finish
      await page.screenshot({ path: `tests/e2e/.shots/${info.project.name}-update-bar.png` });
      // The open page keeps working on the old version until the person chooses.
      await page.evaluate(() => (location.hash = '#/never'));
      await expect(page.locator('main[data-tab="never"] h1')).toBeVisible();

      await Promise.all([page.waitForEvent('load'), bar.getByRole('button', { name: 'Reload' }).click()]);
      await expect.poll(async () => (await cacheKeys()).filter((k) => k.startsWith('cfs-'))).toEqual([`${oldName}x`]);
      await expect(page.locator('.upd-bar')).toHaveCount(0);

      // The new cache holds every built file, so a never-opened tab works offline.
      await page.waitForFunction(async (name) => {
        const c = await caches.open(name);
        return (await c.keys()).some((r) => /GlossaryTab-.*\.js$/.test(r.url));
      }, `${oldName}x`);
      await context.setOffline(true);
      await page.reload();
      await page.evaluate(() => (location.hash = '#/glossary'));
      await expect(page.locator('main[data-tab="glossary"] h1')).toBeVisible();
      await context.setOffline(false);
      expect(problems.filter((m) => !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(m))).toEqual([]);
      problems.length = 0;
    } finally {
      await site.close();
    }
  });
});

test('memory stays flat across 10 rounds through the 3D tabs (no leaks)', async ({ page, open }, info) => {
  test.skip(info.project.name !== 'laptop-light', 'one project is enough');
  test.setTimeout(300_000);
  const cdp = await page.context().newCDPSession(page);
  const heapMb = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    await cdp.send('HeapProfiler.collectGarbage');
    const { usedSize } = (await cdp.send('Runtime.getHeapUsage')) as { usedSize: number };
    return usedSize / 1e6;
  };
  const TABS = ['sim', 'equipment', 'safety', 'learn', 'home'];
  const round = async () => {
    for (const t of TABS) {
      await page.evaluate((t) => (location.hash = `#/${t}`), t);
      await expect(page.locator(`main[data-tab="${t}"] h1, main[data-tab="${t}"] h2`).first()).toBeVisible();
      await page.waitForTimeout(700);
    }
  };
  await open('#/home');
  // Two warm-up rounds load every chunk and fill caches that are meant to stay.
  await round();
  await round();
  const base = { heap: await heapMb(), gl: await page.evaluate(() => window.__glLive!()) };
  for (let i = 0; i < 10; i++) await round();
  const after = { heap: await heapMb(), gl: await page.evaluate(() => window.__glLive!()) };
  console.log(`heap ${base.heap.toFixed(1)} → ${after.heap.toFixed(1)} MB, live WebGL ${base.gl} → ${after.gl}`);
  expect(after.gl).toBeLessThanOrEqual(base.gl);
  // B-013: before the fix 10 rounds grew the heap ~17 MB (every closed 3D scene stayed in memory).
  // After it, ~4 MB of browser caches that level off. 8 MB catches a real leak without flaking.
  expect(after.heap - base.heap).toBeLessThan(8);
});

test('typing straight after Ctrl+K on a 6× slower CPU keeps every letter', async ({ page, open }, info) => {
  test.skip(info.project.name !== 'laptop-dark', 'one project is enough');
  await open('#/home', { three: false });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await page.keyboard.press('Control+k');
  await page.keyboard.type('stranded');
  await expect(page.locator('dialog input').first()).toHaveValue('stranded');
});
