import { test, expect, tapDevice, plantReady } from './fixtures';

const DESIGNS = ['N', 'N+1', 'N+2', '2N', '2N+1', 'DR', 'BLOCK'];

test.describe('Simulator in 3D', () => {
  test('failure mode: tap fails and restores in 3D', async ({ page, open }, info) => {
    await open('#/sim');
    await plantReady(page);
    await page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: /Failure/ }).click();
    await tapDevice(page, 'UPS-A1');
    await expect.poll(() => page.evaluate(() => window.__cf3d!.plant!.nodeState('UPS-A1')?.state)).toBe('failed');
    await page.screenshot({ path: `tests/e2e/.shots/${info.project.name}-failure.png` });
    await tapDevice(page, 'UPS-A1');
    await expect.poll(() => page.evaluate(() => window.__cf3d!.plant!.nodeState('UPS-A1')?.state)).not.toBe('failed');
  });

  test('jump list opens the component card', async ({ page, open }) => {
    await open('#/sim');
    await plantReady(page);
    await page.getByLabel('Jump to component').selectOption('GEN-A1');
    await expect(page.locator('#comp-h')).toContainText('GEN-A1');
    await expect.poll(() => page.evaluate(() => window.__cf3d!.plant!.info().flying)).toBe(false);
  });

  test('2D switch brings back the 2D diagram', async ({ page, open }) => {
    await open('#/sim');
    await plantReady(page);
    await page.getByRole('group', { name: '2D or 3D' }).getByRole('button', { name: '2D' }).click();
    await expect(page.locator('svg.oneline')).toBeVisible();
    await expect(page.locator('.scene3d-plant')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__glLive!())).toBeLessThanOrEqual(1); // the 3D hall card may stay
  });

  test('all 7 designs build with power flowing; mechanical water flows', async ({ page, open }, info) => {
    test.skip(!info.project.name.startsWith('laptop-light'), 'one project is enough');
    await open('#/sim');
    await plantReady(page);
    const dock = page.locator('details', { hasText: 'Plant settings' });
    if (!(await dock.evaluate((d) => (d as HTMLDetailsElement).open))) await dock.locator('summary').click();
    const sel = page.getByLabel('Redundancy design');
    for (const d of DESIGNS) {
      await sel.selectOption(d);
      await expect.poll(() => page.evaluate(() => window.__cf3d!.plant!.liveLinks())).toBeGreaterThan(10);
      await expect(page.locator('.scene3d-plant'), `design ${d}`).toHaveAttribute('aria-label', / 0 failed/);
    }
    await page.getByRole('button', { name: /Mechanical/ }).first().click();
    await expect(page.getByRole('region', { name: '3D mechanical plant' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__cf3d!.plant!.liveLinks())).toBeGreaterThan(5);
  });

  test('20 rapid 2D/3D switches free their WebGL contexts and GPU memory', async ({ page, open }) => {
    test.skip(!test.info().project.name.startsWith('laptop'), 'laptop only');
    await open('#/sim');
    await plantReady(page);
    // Let the first frames upload everything before taking the baseline.
    await page.waitForTimeout(1500);
    const base = await page.evaluate(() => ({ gl: window.__glLive!(), mem: window.__cf3d!.plant!.info() }));
    const grp = page.getByRole('group', { name: '2D or 3D' });
    for (let i = 0; i < 20; i++) {
      await grp.getByRole('button', { name: '2D' }).click();
      await grp.getByRole('button', { name: '3D' }).click();
    }
    await plantReady(page);
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => ({ gl: window.__glLive!(), mem: window.__cf3d!.plant!.info() }));
    expect(after.gl).toBe(base.gl);
    expect(after.mem.geometries).toBeLessThanOrEqual(base.mem.geometries);
    expect(after.mem.textures).toBeLessThanOrEqual(base.mem.textures);
  });
});

test('reduced motion: the 3D plant draws a still frame', async ({ page, open }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open('#/sim');
  await plantReady(page);
  const a = await page.evaluate(() => window.__cf3d!.plant!.frames());
  await page.waitForTimeout(1500);
  const b = await page.evaluate(() => window.__cf3d!.plant!.frames());
  expect(b - a).toBeLessThanOrEqual(1);
});

test('works offline after the first visit, 3D included', async ({ page, context, open }, info) => {
  test.skip(!info.project.name.startsWith('laptop-light'), 'one project is enough');
  await open('#/sim');
  await plantReady(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Visit once more so the lazy 3D chunk is cached too.
  await page.reload();
  await plantReady(page);
  await context.setOffline(true);
  await page.reload();
  await plantReady(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await context.setOffline(false);
});
