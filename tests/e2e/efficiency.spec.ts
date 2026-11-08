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

// Engine v2 only (Phase 4d): alarm list, first-out, acknowledge, time-limited shelving, fault help.
test('engine v2: a failure raises a first-out alarm that can be acknowledged and shelved', async ({ page, open }) => {
  test.skip(process.env.E2E_ENGINE !== 'v2', 'the alarm list is behind ?engine=v2');
  await open('#/sim', { three: false });
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'v2');
  const panel = page.locator('.alarm-panel');
  await expect(panel.getByText('No alarms')).toBeVisible();
  await page.getByRole('button', { name: /Mechanical/ }).first().click();
  await page.getByRole('button', { name: /^CRAH-101, / }).first().click();
  await page.locator('section.comp-card').getByRole('button', { name: 'Fail it' }).click();
  // Paused: alarms scan once a second, so step one tick (the new time control).
  await page.getByRole('button', { name: 'Step one second' }).click();
  const row = panel.locator('.alarm-row', { hasText: 'CRAH-101' });
  await expect(row).toBeVisible();
  await expect(row.getByText('First out')).toBeVisible();
  await expect(row.getByText(/New \(not acknowledged\)/)).toBeVisible();
  await row.getByRole('button', { name: /Acknowledge CRAH-101/ }).click();
  await expect(row.getByText('Acknowledged')).toBeVisible();
  await row.locator('summary').click();
  await expect(row.getByText(/What to check/)).toBeVisible();
  const axe = await new AxeBuilder({ page }).include('.alarm-panel').analyze();
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  await row.getByRole('button', { name: /Shelve CRAH-101/ }).click();
  await expect(panel.locator('.alarm-row', { hasText: 'CRAH-101' })).toHaveCount(0);
  await expect(panel.getByText(/Shelved \(come back by themselves\): CRAH-101\.FAIL/)).toBeVisible();
});
