import AxeBuilder from '@axe-core/playwright';
import { test, expect, plantReady } from './fixtures';

for (const [name, hash] of [
  ['Simulator 3D', '#/sim'],
  ['Procedures', '#/procedures'],
] as const) {
  test(`axe: ${name} has no serious or critical issues`, async ({ page, open }, info) => {
    await open(hash);
    if (hash === '#/sim') await plantReady(page);
    await page.waitForTimeout(800); // let entrance motion settle
    await page.screenshot({ path: `tests/e2e/.shots/${info.project.name}-${hash.slice(2)}.png` });
    const r = await new AxeBuilder({ page }).analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('axe: MOP running in 3D', async ({ page, open }) => {
  await open('#/procedures');
  await page.getByRole('button', { name: /Monthly generator test run/ }).first().click();
  await plantReady(page);
  await page.waitForTimeout(800);
  const r = await new AxeBuilder({ page }).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
