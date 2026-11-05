import { test, expect, plantReady } from './fixtures';

/**
 * Screenshot baselines for each 3D scene at a fixed camera and a still frame
 * (reduced motion + ?still: one frame, fixed decoration). Fails on a >1% pixel
 * difference. Baselines change only on purpose:
 *   npx playwright test visual --update-snapshots   (and say why in the commit)
 * Baselines are per machine type (software GPU here), laptop projects only.
 */
test.describe('3D visual baselines', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(!info.project.name.startsWith('laptop'), 'laptop baselines only');
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });
  const opts = { maxDiffPixelRatio: 0.01 };

  test('Home hall', async ({ page, open }) => {
    await open('#/home', { quality: 'medium', still: true });
    await page.waitForFunction(() => ((window.__cf3d as Record<string, { frames: () => number }> | undefined)?.hero?.frames() ?? 0) > 0, null, { timeout: 30_000 });
    await page.waitForTimeout(500);
    // The hero text sits over the 3D; mask it so only the scene is compared.
    await expect(page.locator('.hero-3d .scene3d')).toHaveScreenshot('home-hall.png', { ...opts, mask: [page.locator('.hero-inner')] });
  });

  for (const view of ['electrical', 'mechanical'] as const) {
    test(`Simulator plant: ${view}`, async ({ page, open }) => {
      await open('#/sim', { quality: 'medium', still: true });
      await plantReady(page);
      if (view === 'mechanical') {
        await page.getByRole('button', { name: /Mechanical/ }).first().click();
        await plantReady(page);
      }
      await page.evaluate(() => window.__cf3d!.plant!.reset());
      await page.waitForTimeout(500);
      await expect(page.locator('.scene3d-plant')).toHaveScreenshot(`plant-${view}.png`, opts);
    });
  }

  test('Simulator live hall', async ({ page, open }) => {
    await open('#/sim', { quality: 'medium', still: true, three: false });
    const hall = page.locator('.scene3d-hall.live');
    await hall.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => ((window.__cf3d as Record<string, { frames: () => number }> | undefined)?.hall?.frames() ?? 0) > 0, null, { timeout: 30_000 });
    await page.waitForTimeout(500);
    await expect(hall).toHaveScreenshot('sim-hall.png', opts);
  });

  test('Equipment: UPS cutaway', async ({ page, open }) => {
    await open('#/equipment', { quality: 'medium', still: true });
    await page.fill('#eq-search', 'UPS');
    await page.getByRole('button', { name: 'UPS systems & batteries' }).first().click();
    await page.locator('.scene3d-equip').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => ((window.__cf3d as Record<string, { frames: () => number }> | undefined)?.equipment?.frames() ?? 0) > 0);
    await page.getByRole('button', { name: 'See inside' }).click();
    await page.getByRole('button', { name: /Inverter/ }).click();
    // Clear of the sticky header (its XP count changes).
    await page.evaluate(() => window.scrollBy(0, document.querySelector('.scene3d-equip')!.getBoundingClientRect().top - 140));
    await page.waitForTimeout(600);
    await expect(page.locator('.scene3d-equip')).toHaveScreenshot('equip-ups-cutaway.png', opts);
  });
});
