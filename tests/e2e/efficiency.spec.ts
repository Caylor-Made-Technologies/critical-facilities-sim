import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

declare const process: { env: Record<string, string | undefined> };

// Engine v2 only (Phase 4c part 3): live PUE tile and the "how it adds up" panel.
test('engine v2: live PUE tile and breakdown add up, with Verify and simplified-model notes', async ({ page, open }) => {
  test.skip(process.env.E2E_ENGINE !== 'v2', 'the live PUE readout is behind ?engine=v2');
  await open('#/sim', { three: false });
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'v2');
  const tile = page.locator('.kpi', { hasText: 'PUE (live)' });
  await expect(tile).toBeVisible();
  const pue = Number(await tile.locator('.kpi-value').innerText());
  expect(pue).toBeGreaterThan(1.05);
  expect(pue).toBeLessThan(1.6);
  const panel = page.locator('.eff-panel');
  await panel.locator('summary').click();
  await expect(panel.getByRole('rowheader', { name: 'Total facility' })).toBeVisible();
  await expect(panel.getByText('Verify')).toBeVisible();
  await expect(panel.getByText(/Simplified model for training/)).toBeVisible();
  // Rows add up to the total (rounding to whole kW per row).
  const cells = await panel.locator('tbody tr td').allInnerTexts();
  const nums = cells.map((c) => Number(c.replace(/[^0-9.]/g, '')));
  const parts = nums.slice(0, 9).reduce((a, b) => a + b, 0);
  expect(Math.abs(parts - nums[9]!)).toBeLessThanOrEqual(9);
  expect(Math.abs(nums[9]! / nums[0]! - pue)).toBeLessThan(0.011);
  const axe = await new AxeBuilder({ page }).include('.eff-panel').analyze();
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
});
