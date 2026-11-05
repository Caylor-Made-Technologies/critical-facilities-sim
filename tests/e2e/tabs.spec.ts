import { test, expect } from './fixtures';

const TABS = ['home', 'mypath', 'sim', 'learn', 'procedures', 'cases', 'designs', 'quiz', 'equipment', 'never', 'glossary', 'safety', 'tools', 'tips', 'career', 'codes', 'uptime', 'change', 'feedback', 'about'];

test('every tab loads (lazy code included) and never scrolls sideways', async ({ page, open }, info) => {
  test.skip(!info.project.name.startsWith('phone-light') && !info.project.name.startsWith('laptop-dark'), 'two projects are enough');
  await page.setViewportSize(info.project.name.startsWith('phone') ? { width: 360, height: 740 } : { width: 1366, height: 768 });
  await open('#/home', { three: false });
  for (const t of TABS) {
    await page.evaluate((t) => (location.hash = `#/${t}`), t);
    await expect(page.locator(`main[data-tab="${t}"]`)).toBeVisible();
    await expect(page.locator('.tab-loading')).toHaveCount(0);
    await expect(page.locator('main h1, main h2').first()).toBeVisible();
    await page.waitForTimeout(250); // let entrance motion run
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(wide, `${t} scrolls sideways`).toBeLessThanOrEqual(0);
  }
});

test('an unvisited tab opens offline after one visit', async ({ page, context, open }, info) => {
  test.skip(info.project.name !== 'laptop-light', 'one project is enough');
  await open('#/home', { three: false });
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The worker caches every built file (precache.json) on install.
  await page.waitForFunction(async () => {
    const keys = await caches.keys();
    for (const k of keys) {
      const c = await caches.open(k);
      const all = await c.keys();
      if (all.some((r) => /GlossaryTab-.*\.js$/.test(r.url))) return true;
    }
    return false;
  }, null, { timeout: 30_000 });
  await context.setOffline(true);
  await page.reload();
  await page.evaluate(() => (location.hash = '#/glossary'));
  await expect(page.locator('main[data-tab="glossary"] h1')).toBeVisible();
  await context.setOffline(false);
});

test('Auto quality picks Low on a software GPU and Home keeps its still art', async ({ page, open }) => {
  await open('#/home', { quality: 'auto' });
  await page.waitForTimeout(3500);
  const renderer = await page.evaluate(() => {
    const g = document.createElement('canvas').getContext('webgl');
    const e = g?.getExtension('WEBGL_debug_renderer_info');
    return e ? String(g!.getParameter(e.UNMASKED_RENDERER_WEBGL)) : '';
  });
  test.skip(!/swiftshader|llvmpipe|software/i.test(renderer), 'needs a software GPU');
  await expect(page.locator('.hero-art')).toBeVisible();
  await expect(page.locator('.hero-3d .scene3d')).toHaveCount(0);
  await page.evaluate(() => (location.hash = '#/about'));
  await expect(page.getByText(/Using: Low \(auto\)/)).toBeVisible();
});

test('quality setting rebuilds 3D on a fresh canvas', async ({ page, open }, info) => {
  test.skip(info.project.name !== 'laptop-light', 'one project is enough');
  await open('#/sim', { quality: 'medium' });
  await page.waitForFunction(() => window.__cf3d?.plant);
  await page.locator('.scene3d-plant canvas').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__cf3d!.plant!.frames() > 0);
  expect(await page.evaluate(() => (window.__cf3d!.plant as unknown as { stats: () => { tier: string } }).stats().tier)).toBe('medium');
  await page.evaluate(() => localStorage.setItem('cfs-3d-quality', 'high'));
  await page.evaluate(() => (location.hash = '#/about'));
  await page.getByRole('radio', { name: /High/ }).check();
  await page.evaluate(() => (location.hash = '#/sim'));
  await page.waitForFunction(() => window.__cf3d?.plant);
  await page.locator('.scene3d-plant canvas').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__cf3d!.plant!.frames() > 0);
  expect(await page.evaluate(() => (window.__cf3d!.plant as unknown as { stats: () => { tier: string } }).stats().tier)).toBe('high');
  expect(await page.evaluate(() => window.__glLive!())).toBeLessThanOrEqual(2);
});
