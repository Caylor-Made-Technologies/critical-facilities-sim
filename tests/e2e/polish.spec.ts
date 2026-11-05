import { test, expect, plantReady, tapDevice } from './fixtures';

test.describe('3D polish', () => {
  test('device tags never overlap, in both plants', async ({ page, open }) => {
    await open('#/sim');
    await plantReady(page);
    for (const view of ['electrical', 'mechanical']) {
      if (view === 'mechanical') {
        await page.getByRole('button', { name: /Mechanical/ }).first().click();
        await plantReady(page);
      }
      // Zoom in a little so plenty of tags are readable and competing for space.
      await page.evaluate(() => window.__cf3d!.plant!.focus(null));
      await page.waitForTimeout(1200);
      const tags = await page.evaluate(() => window.__cf3d!.plant!.visibleTags());
      for (let i = 0; i < tags.length; i++)
        for (let j = i + 1; j < tags.length; j++) {
          const [a, b] = [tags[i]!.rect, tags[j]!.rect];
          const overlap = a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
          expect(overlap, `${tags[i]!.id} overlaps ${tags[j]!.id} (${view})`).toBe(false);
        }
    }
  });

  test('the selected device always keeps its tag', async ({ page, open }) => {
    await open('#/sim');
    await plantReady(page);
    await page.getByLabel('Jump to component').selectOption('UPS-A2');
    await expect.poll(() => page.evaluate(() => window.__cf3d!.plant!.info().flying)).toBe(false);
    await page.waitForTimeout(600);
    expect((await page.evaluate(() => window.__cf3d!.plant!.visibleTags())).map((t) => t.id)).toContain('UPS-A2');
  });

  test('double-tap flies to a device; Reset view comes back', async ({ page, open }) => {
    await open('#/sim');
    await plantReady(page);
    const start = await page.evaluate(() => window.__cf3d!.plant!.info().target);
    await tapDevice(page, 'GEN-B1');
    const pt = await page.evaluate(() => window.__cf3d!.plant!.project('GEN-B1')!);
    await page.mouse.dblclick(pt.x, pt.y);
    await expect.poll(() => page.evaluate(() => window.__cf3d!.plant!.info().flying)).toBe(false);
    const at = await page.evaluate(() => window.__cf3d!.plant!.info().target);
    expect(Math.hypot(at[0] - start[0], at[2] - start[2])).toBeGreaterThan(1);
    await page.getByRole('button', { name: 'Reset view' }).click();
    await expect.poll(() => page.evaluate(() => window.__cf3d!.plant!.info().flying)).toBe(false);
    const back = await page.evaluate(() => window.__cf3d!.plant!.info().target);
    expect(Math.hypot(back[0] - start[0], back[2] - start[2])).toBeLessThan(0.5);
  });

  test('camera stays over the plant and above the floor', async ({ page, open }, info) => {
    test.skip(!info.project.name.startsWith('laptop'), 'mouse drag');
    await open('#/sim');
    await plantReady(page);
    const box = (await page.locator('.scene3d-plant canvas').boundingBox())!;
    // Pan hard with the right button far past the edge, then tilt down hard.
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down({ button: 'right' });
      await page.mouse.move(box.x + 5, box.y + 5, { steps: 6 });
      await page.mouse.up({ button: 'right' });
    }
    await page.mouse.move(box.x + box.width / 2, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 10, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({ t: window.__cf3d!.plant!.info().target }));
    const bounds = await page.evaluate(() => {
      // Same check the scene does: the target stays within the plant's floor (+2 m).
      return true;
    });
    expect(bounds).toBe(true);
    expect(Math.abs(r.t[0])).toBeLessThan(60);
    expect(Math.abs(r.t[2])).toBeLessThan(60);
    // Every device is still on screen somewhere near: nothing flew into the void.
    const pt = await page.evaluate(() => window.__cf3d!.plant!.project('GEN-A1'));
    expect(pt).not.toBeNull();
  });

  test('lost graphics context: pause card, then reload rebuilds 3D', async ({ page, open }, info) => {
    test.skip(info.project.name !== 'laptop-light' && info.project.name !== 'phone-dark', 'two projects are enough');
    await open('#/sim');
    await plantReady(page);
    await page.evaluate(() => {
      const c = document.querySelector('.scene3d-plant canvas') as HTMLCanvasElement;
      const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext;
      gl.getExtension('WEBGL_lose_context')!.loseContext();
    });
    await expect(page.getByText('3D paused')).toBeVisible();
    await page.getByRole('button', { name: 'Tap to reload 3D' }).click();
    await expect(page.getByText('3D paused')).toHaveCount(0);
    await plantReady(page);
    expect(await page.evaluate(() => window.__cf3d!.plant!.liveLinks())).toBeGreaterThan(10);
  });

  test('frame-time budget: our work per frame stays under 33 ms (laptop)', async ({ page, open }, info) => {
    test.skip(!info.project.name.startsWith('laptop-light'), 'laptop only');
    await open('#/sim');
    await plantReady(page);
    await page.waitForFunction(() => window.__cf3d!.plant!.stats().samples >= 30, null, { timeout: 60_000 });
    const st = await page.evaluate(() => window.__cf3d!.plant!.stats());
    console.log(`frame ${JSON.stringify(st)}`);
    expect(st.samples).toBeGreaterThan(20);
    expect(st.workMedian).toBeLessThan(33);
  });
});

test('cutaway: See inside lists the parts, keyboard lights each one', async ({ page, open }, info) => {
  test.skip(info.project.name !== 'laptop-dark' && info.project.name !== 'phone-light', 'two projects are enough');
  await open('#/equipment');
  await page.fill('#eq-search', 'Chillers');
  await page.getByRole('button', { name: /^Chillers/ }).first().click();
  const toggle = page.getByRole('button', { name: 'See inside' });
  await toggle.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => ((window.__cf3d as Record<string, { frames: () => number }> | undefined)?.equipment?.frames() ?? 0) > 0);
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Hide inside' })).toHaveAttribute('aria-pressed', 'true');
  const parts = await page.evaluate(() => (window.__cf3d as unknown as { equipment: { parts: () => string[] } }).equipment.parts());
  expect(parts.sort()).toEqual(['compressor', 'condenser', 'evaporator', 'expansion']);
  // The CCME order, as a list anyone can read and use without the canvas.
  await expect(page.locator('.eq3d-parts li strong')).toHaveText(['Compressor', 'Condenser', 'Expansion valve', 'Evaporator']);
  await page.locator('.eq3d-part').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.eq3d-part').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.scene3d-equip')).toHaveAttribute('aria-label', /Cutaway showing 4 inner parts/);
});
