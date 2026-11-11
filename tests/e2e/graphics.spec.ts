import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

// Phase 5 (graphics v2): diagrams, air path, trends and the PUE bar read engine v2 directly.

const serious = (v: { impact?: string | null }[]) => v.filter((x) => x.impact === 'serious' || x.impact === 'critical');

test('graphics v2: alarm ring and badge on the mechanical diagram, v2 pump and chiller labels', async ({ page, open }) => {
  await open('#/sim', { three: false });
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'v2');
  await page.getByRole('button', { name: /Mechanical/ }).first().click();
  const mech = page.locator('.diagram-wrap.mech');
  // Live v2 readings on the symbols: pump speed + head, chiller kW/ton, CRAH fan speed.
  await expect(mech.getByRole('button', { name: /^CHWP-01, .*\d+% · [\d.]+ psi/ })).toBeVisible();
  await expect(mech.getByRole('button', { name: /^CH-01, .*kW\/ton/ })).toBeVisible();
  await expect(mech.getByRole('button', { name: /^CRAH-102, .*fan \d+%/ })).toBeVisible();
  // Healthy plant: nothing in alarm.
  await expect(mech.locator('.alm')).toHaveCount(0);
  await mech.getByRole('button', { name: /^CRAH-101, / }).click();
  await page.locator('section.comp-card').getByRole('button', { name: 'Fail it' }).click();
  await page.getByRole('button', { name: 'Step one second' }).click();
  const crah = mech.getByRole('button', { name: /^CRAH-101, / });
  await expect(crah).toHaveClass(/alm-medium/);
  await expect(crah).toHaveClass(/alm-unack/);
  await expect(crah).toHaveAttribute('aria-label', /In alarm: Medium, Equipment failed, not acknowledged/);
  await expect(crah.locator('.alm-badge')).toHaveCount(1);
  // Acknowledging stops the pulse but keeps the ring until the alarm clears.
  await page.locator('.alarm-panel').getByRole('button', { name: 'Acknowledge all' }).click();
  await expect(crah).not.toHaveClass(/alm-unack/);
  await expect(crah).toHaveClass(/alm-medium/);
  // Restore → alarm returns to normal → ring gone.
  await page.locator('section.comp-card').getByRole('button', { name: /Restore/ }).click();
  await page.getByRole('button', { name: 'Step one second' }).click();
  await expect(mech.locator('.alm')).toHaveCount(0);
});

test('graphics v2: air path shows the five nodes and bypass grows when the containment door is propped open', async ({ page, open }) => {
  await open('#/sim', { three: false });
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'v2');
  const card = page.locator('.air-card');
  await expect(card).toBeVisible();
  for (const n of ['cold', 'rackIn', 'rackOut', 'hot', 'room']) await expect(card.locator(`[data-node="${n}"]`)).toHaveCount(1);
  const svg = card.locator('svg.air-svg');
  const before = Number(await svg.getAttribute('data-bypass'));
  expect(before).toBeGreaterThan(0.01);
  expect(before).toBeLessThan(0.2);
  await card.getByRole('button', { name: 'Door propped open' }).click();
  await page.getByRole('button', { name: 'Step one second' }).click();
  await expect(card.getByRole('button', { name: 'Door propped open' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => Number(await svg.getAttribute('data-bypass'))).toBeGreaterThan(before + 0.08);
  await expect(card.locator('[data-contain="door-open"]')).toHaveCount(1);
  await expect(svg).toHaveAttribute('aria-label', /Containment doors open/);
  const axe = await new AxeBuilder({ page }).include('.air-card').analyze();
  expect(serious(axe.violations)).toEqual([]);
  await card.getByRole('button', { name: 'Doors shut' }).click();
  await page.getByRole('button', { name: 'Step one second' }).click();
  await expect.poll(async () => Number(await svg.getAttribute('data-bypass'))).toBeLessThan(before + 0.02);
});

test('graphics v2: trends fill while the plant runs, and the PUE bar adds up to 100%', async ({ page, open }) => {
  await open('#/sim', { three: false });
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'v2');
  const eff = page.locator('.eff-panel');
  await eff.locator('summary').click();
  const shares = (await eff.locator('.eff-seg').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-share')))));
  expect(shares.length).toBeGreaterThanOrEqual(8);
  expect(Math.abs(shares.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(0.001);
  expect(shares[0]).toBeGreaterThan(0.6); // IT is most of the facility load
  const trends = page.locator('.trend-panel');
  await trends.locator('summary').click();
  await expect(trends.locator('.trend-row')).toHaveCount(6);
  await page.getByRole('button', { name: '60×' }).click();
  await page.getByRole('button', { name: /^Run/ }).first().click();
  // At 60× a 10 s sample lands every ~0.17 s of real time.
  await expect.poll(async () => (await trends.locator('[data-trend="inletC"] .trend-line').getAttribute('d'))?.split('L').length ?? 0, { timeout: 15_000 }).toBeGreaterThan(3);
  await page.getByRole('button', { name: /^Pause/ }).first().click();
  await expect(trends.locator('summary')).toContainText(/last \d+ (s|min)/);
  const axe = await new AxeBuilder({ page }).include('.trend-panel').include('.eff-panel').analyze();
  expect(serious(axe.violations)).toEqual([]);
});

test('graphics v2: 3D plant beacon carries the alarm priority', async ({ page, open }) => {
  await open('#/sim', { three: true });
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'v2');
  await page.getByRole('button', { name: /Mechanical/ }).first().click();
  await expect.poll(() => page.evaluate(() => !!window.__cf3d?.plant)).toBe(true);
  await page.locator('.plant3d-jump select').selectOption('CRAH-101');
  await page.locator('section.comp-card').getByRole('button', { name: 'Fail it' }).click();
  await page.getByRole('button', { name: 'Step one second' }).click();
  await expect.poll(() => page.evaluate(() => (window.__cf3d!.plant!.nodeState('CRAH-101') as { alarm?: string | null } | null)?.alarm)).toBe('medium');
  await expect(page.locator('.plant3d-card canvas').first()).toBeVisible();
  await expect(page.locator('.plant3d-card [aria-label*="1 in alarm"]').first()).toBeAttached();
});

// Phase 8b: per-rack heat. Every rack tile shows a heat bar and says its top inlet; missing blanking makes hot spots.
test('graphics v2: rack tiles show per-rack heat; missing blanking raises some racks', async ({ page, open }) => {
  await open('#/sim', { three: false });
  const tiles = page.locator('.hall .rack');
  await expect(tiles).toHaveCount(36);
  await expect(page.locator('.hall .rack .rack-heat')).toHaveCount(36);
  await expect(tiles.first()).toHaveAttribute('aria-label', /Top inlet \d+(\.\d)? °[FC]/);
  const tops = async () =>
    (await tiles.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))).map((l) => Number(/Top inlet ([\d.]+)/.exec(l)?.[1] ?? 'NaN'));
  const before = await tops();
  await page.getByRole('group', { name: 'Blanking panels' }).getByRole('button').nth(1).click();
  await page.getByRole('button', { name: 'Step one second' }).click();
  await expect.poll(async () => Math.max(...(await tops())) - Math.max(...before)).toBeGreaterThan(0.3);
});
