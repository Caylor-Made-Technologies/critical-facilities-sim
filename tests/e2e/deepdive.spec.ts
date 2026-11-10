import { test, expect } from './fixtures';

test.describe('equipment deep dives (Phase 7)', () => {
  test('transformer: every part opens, quiz saves, See it live lands in the simulator', async ({ page, open }) => {
    await open('#/equipment');
    await page.fill('#eq-search', 'Transformers');
    await page.getByRole('button', { name: /^Transformers/ }).first().click();
    await page.getByRole('tab', { name: 'Deep dive' }).click();
    await expect(page.getByRole('heading', { name: /K-factor/ })).toBeVisible();
    await page.getByRole('tab', { name: 'Normal readings' }).click();
    await expect(page.getByRole('rowheader', { name: /Top-oil temperature/ })).toBeVisible();
    await page.getByRole('tab', { name: 'How it fails' }).click();
    await expect(page.getByText('Overheating', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Quiz' }).click();
    for (const fs of await page.locator('.dd-part fieldset').all()) await fs.locator('input[type=radio]').nth(1).check();
    await page.getByRole('button', { name: 'Check answers' }).click();
    await expect(page.getByRole('status').filter({ hasText: /of 4 right/ })).toBeVisible();
    await page.getByRole('tab', { name: 'Tips & practice' }).click();
    await page.getByRole('button', { name: /^Walkthrough:/ }).first().click();
    await expect(page).toHaveURL(/#\/sim/);
  });

  test('switchboard: See inside shows breaker, trip unit and key interlock', async ({ page, open }, info) => {
    test.skip(info.project.name !== 'laptop-light' && info.project.name !== 'phone-dark', 'two projects are enough');
    await open('#/equipment');
    await page.fill('#eq-search', 'Switchboards');
    await page.getByRole('button', { name: /^Switchboards/ }).first().click();
    const toggle = page.getByRole('button', { name: 'See inside' });
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();
    await expect(page.locator('.eq3d-parts li strong')).toHaveText(['Main bus', 'Drawout breaker', 'Trip unit (LSIG)', 'Cradle and shutters', 'Key interlock']);
  });
});
