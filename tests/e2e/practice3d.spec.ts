import { test, expect, tapDevice, plantReady } from './fixtures';

test.describe('Practice in 3D', () => {
  test('generator test MOP runs to 100/100 in 3D', async ({ page, open }, info) => {
    await open('#/procedures');
    await expect(page.getByRole('group', { name: 'Practice view' }).getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /Monthly generator test run/ }).first().click();
    await plantReady(page);
    await expect(page.locator('.scene3d-plant canvas')).toBeVisible();

    await page.getByRole('button', { name: /MOP approved, team briefed/ }).click();
    await page.getByRole('button', { name: /Fuel level and valves/ }).click();

    // Close the card, then pick GEN-A1 on the 3D plant itself.
    const close = page.getByRole('button', { name: 'Close details' });
    if (await close.count()) await close.click();
    await tapDevice(page, 'GEN-A1');
    await expect(page.locator('#comp-h')).toContainText('GEN-A1');
    await page.getByRole('button', { name: 'Start test run' }).click();
    await page.getByRole('button', { name: 'Skip ahead 10 seconds' }).click();
    await expect.poll(() => page.evaluate(() => window.__cf3d!.plant!.nodeState('GEN-A1')?.state)).toBe('ok');

    const logged = page.getByRole('button', { name: /Readings logged and in range/ });
    await logged.scrollIntoViewIfNeeded();
    await logged.click();
    await page.getByRole('button', { name: 'Stop test run' }).click();
    // Cooldown, then back to standby.
    for (let i = 0; i < 40; i++) {
      if (await page.getByRole('button', { name: /Controller in AUTO/ }).count()) break;
      await page.getByRole('button', { name: 'Skip ahead 10 seconds' }).click();
    }
    await page.getByRole('button', { name: /Controller in AUTO/ }).click();
    await expect(page.locator('.grade-score')).toContainText('100');
    await page.locator('.proc-result').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `tests/e2e/.shots/${info.project.name}-gen-mop-done.png` });
  });

  test('a mechanical MOP flies the camera to its unit', async ({ page, open }, info) => {
    await open('#/procedures');
    await page.getByRole('button', { name: /Take a chiller out for maintenance/ }).first().click();
    await plantReady(page);
    // Opens on the mechanical plant, even for the pre-job brief.
    await expect(page.getByRole('region', { name: '3D mechanical plant' })).toBeVisible();
    const brief = page.getByRole('button', { name: /MOP approved, team briefed/ });
    await brief.scrollIntoViewIfNeeded();
    await brief.click();
    await page.locator('.scene3d-plant canvas').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__cf3d!.plant!.info().flying === false);
    const { pt, box } = await page.evaluate(() => {
      const c = document.querySelector('.scene3d-plant canvas')!.getBoundingClientRect();
      return { pt: window.__cf3d!.plant!.project('CH-01')!, box: { x: c.left, y: c.top, w: c.width, h: c.height } };
    });
    // The chiller sits near the middle of the view.
    expect(Math.abs(pt.x - (box.x + box.w / 2))).toBeLessThan(box.w * 0.2);
    expect(Math.abs(pt.y - (box.y + box.h / 2))).toBeLessThan(box.h * 0.25);
    await page.screenshot({ path: `tests/e2e/.shots/${info.project.name}-chiller-fly.png` });
  });
});
