import { test, expect, plantReady } from './fixtures';
import type { Page } from '@playwright/test';

/** Page frames per second over a window (requestAnimationFrame). */
const fps = (page: Page, ms = 3000) =>
  page.evaluate(
    (ms) =>
      new Promise<number>((done) => {
        let n = 0;
        const t0 = performance.now();
        const tick = (t: number) => {
          n++;
          if (t - t0 < ms) requestAnimationFrame(tick);
          else done((n * 1000) / (t - t0));
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );

/**
 * Absolute fps depends on the machine: CI and cloud boxes draw WebGL in software
 * (SwiftShader), where even the Home hall runs ~10 fps. So this test compares the
 * 3D plant against the Home hall on the same machine, holds a draw-call budget,
 * and reports absolute numbers. On a real GPU expect ~60 page fps (scene capped at 30).
 */
test('3D plant performance @perf', async ({ page, open }, info) => {
  test.skip(info.project.name !== 'laptop-light', 'laptop only');
  await open('#/home');
  await page.waitForFunction(() => document.querySelector('.scene3d.is-ready'));
  await page.waitForTimeout(1500);
  const hall = Math.max(await fps(page), await fps(page));

  await page.evaluate(() => (location.hash = '#/sim'));
  await plantReady(page);
  await page.waitForTimeout(1500);
  const normal = Math.max(await fps(page), await fps(page));
  const mem = await page.evaluate(() => window.__cf3d!.plant!.info());

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const slow = await fps(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const renderer = await page.evaluate(() => {
    const g = document.createElement('canvas').getContext('webgl');
    const e = g?.getExtension('WEBGL_debug_renderer_info');
    return e ? String(g!.getParameter(e.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  });
  const report = { renderer, homeHallFps: hall, plantFps: normal, plantFps4xThrottle: slow, drawCalls: mem.calls, geometries: mem.geometries, triangles: mem.triangles };
  console.log(`perf ${JSON.stringify(report)}`);
  await info.attach('perf', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });

  expect(mem.calls, 'draw-call budget').toBeLessThan(320);
  expect(mem.geometries, 'shared geometry').toBeLessThan(80);
  // Regression guard: the plant is a bigger scene than the hall (measured ~72-79% of it).
  expect(normal, 'plant within 65% of the Home hall on this machine').toBeGreaterThan(hall * 0.65);
  if (!/SwiftShader/i.test(renderer)) {
    expect(normal).toBeGreaterThan(50);
    expect(slow).toBeGreaterThan(18);
  }
});
