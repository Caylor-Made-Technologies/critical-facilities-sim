import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { LIFE_STAGES, type LifeStage } from '../../src/content/lifecycle';
import { test, expect, openSearch } from './fixtures';

async function openStage(page: Page, s: LifeStage) {
  const all = page.getByRole('button', { name: 'All stages' });
  if (await all.count()) await all.click();
  await page.getByRole('button', { name: new RegExp(`Stage ${s.n}\\b`) }).first().click();
  await expect(page.locator('#lc-stage-h')).toHaveText(s.title);
}
const part = (page: Page, name: string) => page.getByRole('tab', { name: new RegExp(`^${name}`) }).first();

async function doTask(page: Page, s: LifeStage) {
  const t = s.task;
  if (t.kind === 'order') {
    // Selection sort with the arrow buttons (no drag needed: keyboard and screen readers can do it too).
    for (let i = 0; i < t.items.length; i++) {
      const rows = page.locator('.lc-order li .lc-order-t');
      const texts = await rows.allTextContents();
      let j = texts.indexOf(t.items[i]!);
      while (j > i) {
        await page.getByRole('button', { name: `Move "${t.items[i]}" up` }).click();
        j--;
      }
    }
    await page.getByRole('button', { name: 'Check my order' }).click();
    await expect(page.getByText('All in the right order.')).toBeVisible();
  } else if (t.kind === 'sort') {
    for (let i = 0; i < t.items.length; i++) {
      const it = t.items[i]!;
      const label = t.buckets.find((b) => b.id === it.bucket)!.label;
      await page.locator('.lc-sort li').nth(i).getByRole('radio', { name: label }).check();
    }
    await page.getByRole('button', { name: 'Check my answers' }).click();
    await expect(page.getByText('All sorted correctly.')).toBeVisible();
  } else if (t.kind === 'calc') {
    const slider = page.locator('.lc-calc input[type=range]').first();
    await slider.focus();
    // Every first slider starts above its minimum.
    await page.keyboard.press('ArrowLeft');
  }
  if (t.kind !== 'sim') await expect(page.locator('.lc-ok')).toBeVisible();
}

async function passQuiz(page: Page, s: LifeStage) {
  for (const q of s.quiz) await page.locator('fieldset', { hasText: q.q }).getByRole('radio', { name: q.choices[q.answer]!, exact: true }).check();
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(page.getByText(/\(100%\)\. Passed\./)).toBeVisible();
}

test.describe('Life of a Data Center', () => {
  test('all 10 stages: lesson, tour, task, details, mistakes, quiz', async ({ page, open }, info) => {
    test.skip(info.project.name !== 'laptop-light' && info.project.name !== 'phone-dark', 'two projects are enough');
    // 10 stages × (3D tour + task + quiz) in one test: ~2–3 min alone, slower under the full parallel suite
    // on a software GPU. Each step still has its own 15 s expect timeout.
    test.setTimeout(480_000);
    await open('#/learn', { quality: 'low' });
    await expect(page.getByRole('heading', { name: 'Life of a data center' })).toBeVisible();
    for (const s of LIFE_STAGES) {
      await openStage(page, s);
      await expect(page.locator('.lc-lesson h3').first()).toHaveText(s.lesson[0]!.h);
      await part(page, '3D tour').click();
      await page.getByRole('button', { name: 'Start the tour' }).click();
      for (let i = 1; i < s.tour.length; i++) await page.getByRole('button', { name: 'Next stop' }).click();
      await expect(page.locator('.lc-stop h3')).toHaveText(s.tour[s.tour.length - 1]!.title);
      await part(page, 'Try it').click();
      await doTask(page, s);
      await part(page, 'Minute details').click();
      await expect(page.locator('.lc-card')).toHaveCount(s.details.length);
      if (s.details.some((d) => d.verify)) await expect(page.locator('.lc-verify')).toBeVisible();
      await part(page, 'Mistakes').click();
      await expect(page.locator('.lc-mistakes li')).toHaveCount(s.mistakes.length);
      await part(page, 'Quiz').click();
      await passQuiz(page, s);
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(wide, `${s.id} scrolls sideways`).toBeLessThanOrEqual(0);
    }
    await page.getByRole('button', { name: 'All stages' }).click();
    // Commissioning still needs its IST; the other 9 are complete.
    await expect(page.getByText('Learning path · 9/10 stages complete')).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('cfs-progress-v1') ?? '{}').life);
    expect(Object.keys(saved)).toHaveLength(10);
  });

  test('mini Level 5 IST runs on the live plant to 100/100 and completes commissioning', async ({ page, open }, info) => {
    test.skip(info.project.name !== 'laptop-dark' && info.project.name !== 'phone-light', 'two projects are enough');
    test.setTimeout(180_000);
    await open('#/learn', { three: false });
    await openStage(page, LIFE_STAGES[4]!);
    await part(page, 'Try it').click();
    await page.getByRole('button', { name: 'Run the IST in the simulator' }).click();
    await expect(page.locator('main[data-tab="sim"]')).toBeVisible();
    await page.getByRole('button', { name: /Script approved, witnesses ready/ }).click();
    await page.getByRole('button', { name: /No IT load drops; UPS rides through/ }).click();
    const failOrRestore = async (tag: string, action: 'Fail it' | 'Restore') => {
      // One-line nodes are keyboard buttons; on a phone a node can sit outside the panned view.
      await page.locator(`[aria-label^="${tag},"]`).first().focus();
      await page.keyboard.press('Enter');
      await page.locator('.comp-card').getByRole('button', { name: action, exact: true }).click();
    };
    await failOrRestore('UTIL-A', 'Fail it');
    await failOrRestore('UTIL-B', 'Fail it');
    const skip = page.getByRole('button', { name: 'Skip ahead 10 seconds' });
    for (let i = 0; i < 20 && !(await page.getByRole('button', { name: /Generator start and transfer times/ }).count()); i++) await skip.click();
    await page.getByRole('button', { name: /Generator start and transfer times/ }).click();
    await failOrRestore('UTIL-A', 'Restore');
    await failOrRestore('UTIL-B', 'Restore');
    for (let i = 0; i < 80 && !(await page.getByRole('button', { name: /Results signed, deficiencies logged/ }).count()); i++) await skip.click();
    await page.getByRole('button', { name: /Results signed, deficiencies logged/ }).click();
    await expect(page.locator('.grade-score')).toContainText('100');
    await page.evaluate(() => (location.hash = '#/learn'));
    await openStage(page, LIFE_STAGES[4]!);
    await part(page, 'Try it').click();
    await expect(page.locator('.lc-ok')).toBeVisible();
  });

  test('the tour works by keyboard alone', async ({ page, open }, info) => {
    test.skip(info.project.name !== 'laptop-light', 'one project is enough');
    await open('#/learn');
    await openStage(page, LIFE_STAGES[1]!);
    await part(page, '3D tour').click();
    await page.waitForFunction(() => !!(window.__cf3d as Record<string, unknown> | undefined)?.campus);
    await page.getByRole('button', { name: 'Start the tour' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.lc-stop h3')).toHaveText(LIFE_STAGES[1]!.tour[0]!.title);
    await page.locator('.lc-stop-btn').nth(3).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.lc-stop h3')).toHaveText(LIFE_STAGES[1]!.tour[3]!.title);
    await expect(page.locator('.lc-stop-btn').nth(3)).toHaveAttribute('aria-current', 'step');
    const st = await page.evaluate(() => (window.__cf3d as unknown as { campus: { state: () => string } }).campus.state());
    expect(st).toBe('site');
  });

  for (const p of ['Lesson', 'Try it', 'Quiz', '3D tour'] as const) {
    test(`axe: stage page (${p})`, async ({ page, open }) => {
      await open('#/learn');
      await openStage(page, LIFE_STAGES[6]!);
      await part(page, p).click();
      await page.waitForTimeout(600);
      const r = await new AxeBuilder({ page }).analyze();
      const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

  test('search opens a stage', async ({ page, open }, info) => {
    test.skip(info.project.name !== 'laptop-dark', 'one project is enough');
    await open('#/home', { three: false });
    await openSearch(page);
    await page.keyboard.type('stranded');
    await page.getByRole('option', { name: /Capacity & growth/ }).or(page.getByRole('button', { name: /Capacity & growth/ })).first().click();
    await expect(page.locator('#lc-stage-h')).toHaveText('Capacity & growth');
  });
});
