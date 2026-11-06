import type { Page } from '@playwright/test';
import { PROCEDURES } from '../../src/content/procedures';
import { ROUNDS } from '../../src/content/rounds';
import type { Procedure } from '../../src/sim/procedure';
import { test, expect } from './fixtures';

declare const process: { env: Record<string, string | undefined> };

/**
 * Plays every MOP and drill to 100/100 through the real UI, the way a keyboard
 * user would: the "Jump to component" list opens each device's card, then the
 * card's own buttons do the work. Engine-level versions of the same runs live in
 * src/sim/__tests__/procedures.test.ts; this proves the UI wiring matches.
 */

/** One operator action: open a device card and press a button (optionally inside one lock's row). */
type Act = { dev: string; btn: RegExp; lock?: string };

// Same actions as the engine tests, by step index.
const ACTIONS: Record<string, Record<number, Act[]>> = {
  'mop-ups-bypass': {
    2: [{ dev: 'UPS-A', btn: /UPS A to static bypass/ }],
    3: [{ dev: 'UPS-A', btn: /Remove key/, lock: 'L-SKRU-A' }],
    4: [{ dev: 'MBB-A', btn: /Insert key/, lock: 'L-MBB-A' }],
    5: [{ dev: 'MBB-A', btn: /Close breaker/ }],
    6: [{ dev: 'UOB-A', btn: /Open breaker/ }],
    7: [{ dev: 'UIB-A', btn: /Open breaker/ }, { dev: 'SBB-A', btn: /Open breaker/ }],
  },
  'mop-ups-return': {
    1: [{ dev: 'UIB-A', btn: /Close breaker/ }, { dev: 'SBB-A', btn: /Close breaker/ }],
    3: [{ dev: 'UOB-A', btn: /Close breaker/ }],
    4: [{ dev: 'MBB-A', btn: /Open breaker/ }],
    5: [{ dev: 'MBB-A', btn: /Remove key/, lock: 'L-MBB-A' }, { dev: 'UPS-A', btn: /Insert key/, lock: 'L-SKRU-A' }],
    6: [{ dev: 'UPS-A', btn: /UPS A back to inverter/ }],
  },
  'mop-mtm': {
    2: [{ dev: 'MB-A', btn: /Open breaker/ }],
    3: [{ dev: 'MB-A', btn: /Remove key/, lock: 'L-MB-A' }, { dev: 'TIE-AB', btn: /Insert key/, lock: 'L-TIE-AB' }],
    4: [{ dev: 'TIE-AB', btn: /Close breaker/ }],
  },
  'mop-gen-test': {
    2: [{ dev: 'GEN-A1', btn: /Start test run/ }],
    4: [{ dev: 'GEN-A1', btn: /Stop test run/ }],
  },
  'mop-tie-return': {
    2: [{ dev: 'TIE-AB', btn: /Open breaker/ }],
    3: [{ dev: 'TIE-AB', btn: /Remove key/, lock: 'L-TIE-AB' }, { dev: 'MB-A', btn: /Insert key/, lock: 'L-MB-A' }],
    4: [{ dev: 'MB-A', btn: /Close breaker/ }],
  },
  'mop-chiller-pm': { 2: [{ dev: 'CH-01', btn: /Take out of service/ }] },
  'drill-towers': { 3: [{ dev: 'CH-01', btn: /^Restore$/ }, { dev: 'CH-02', btn: /^Restore$/ }] },
  'mop-crah-filters': { 1: [{ dev: 'CRAH-101', btn: /Take out of service/ }], 3: [{ dev: 'CRAH-101', btn: /Return to service/ }] },
};

const card = (page: Page) => page.locator('section.comp-card');

async function doAct(page: Page, a: Act) {
  const jump = page.locator('.plant3d-jump select');
  // Pick the first option whose value starts with the device id (UPS-A → UPS-A1).
  const value = await jump.evaluate((el, dev) => {
    const o = Array.from((el as HTMLSelectElement).options).find((o) => o.value === dev || o.value.startsWith(dev));
    return o?.value ?? null;
  }, a.dev);
  expect(value, `${a.dev} in the jump list`).not.toBeNull();
  await jump.selectOption(value!);
  await expect(card(page).locator('#comp-h')).toContainText(value!);
  const scope = a.lock ? card(page).locator('div').filter({ has: page.locator('code', { hasText: new RegExp(`^${a.lock}$`) }) }).last() : card(page);
  await scope.getByRole('button', { name: a.btn }).first().click();
}

async function play(page: Page, p: Procedure) {
  await page.evaluate(() => (location.hash = '#/procedures'));
  await page.getByRole('tab', { name: p.kind === 'mop' ? /MOP/ : /Emergency drills/ }).first().click();
  await page.getByRole('button', { name: new RegExp(p.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click();
  if (process.env.E2E_ENGINE === 'v2') await expect(page.locator('html')).toHaveAttribute('data-engine', 'v2');
  await expect(page.locator('#proc-h')).toBeVisible();
  const acts = ACTIONS[p.id] ?? {};
  const eyebrow = page.locator('.proc-card:not(.proc-result) .eyebrow');
  const done = new Set<number>();
  for (let guard = 0; guard < 400; guard++) {
    if (await page.locator('.proc-result').count()) break;
    const m = /Step (\d+) of/.exec((await eyebrow.textContent()) ?? '');
    expect(m, 'coach shows a step').not.toBeNull();
    const i = Number(m![1]) - 1;
    const s = p.steps[i]!;
    if (s.confirm) {
      const b = page.locator('.step-nav').getByRole('button', { name: s.confirm });
      await b.scrollIntoViewIfNeeded();
      await b.click();
    } else if (s.choices) {
      const right = s.choices.find((c) => c.correct)!;
      const b = page.locator('.choices button.choice').filter({ hasText: right.text }).first();
      await b.scrollIntoViewIfNeeded();
      await b.click();
    } else if (!done.has(i)) {
      done.add(i);
      for (const a of acts[i] ?? []) await doAct(page, a);
    } else if (p.run) {
      // Drills: run the clock at top speed, the way the hint says.
      const time = page.getByRole('group', { name: 'Time controls' });
      await time.getByRole('group', { name: 'Speed' }).getByRole('button').last().click();
      const run = time.getByRole('button', { name: /^Run$/ });
      if (await run.count()) await run.click();
    } else {
      // MOPs keep the clock paused: step time forward by hand.
      await page.getByRole('button', { name: 'Skip ahead 10 seconds' }).click();
    }
    // Wait for the step to move on (or time to be needed).
    await expect.poll(async () => (await page.locator('.proc-result').count()) > 0 || !((await eyebrow.textContent()) ?? '').includes(`Step ${i + 1} of`), { timeout: s.check ? 1500 : 10_000 }).toBe(true).catch(() => {
      if (!s.check) throw new Error(`${p.id}: step ${i + 1} did not advance`);
    });
  }
  await expect(page.locator('.proc-result .grade-score')).toContainText('100', { timeout: 20_000 });
}

test.describe('every MOP and drill plays to 100/100 in the browser', () => {
  for (const p of PROCEDURES) {
    test(`${p.kind}: ${p.title}`, async ({ page, open }, info) => {
      test.skip(info.project.name !== 'laptop-light' && info.project.name !== 'phone-dark', 'two projects are enough');
      test.setTimeout(180_000);
      await open('#/home');
      await play(page, p);
    });
  }
});

test('every rounds sheet scores 100 when exactly the bad readings are flagged', async ({ page, open }, info) => {
  test.skip(info.project.name !== 'laptop-light' && info.project.name !== 'phone-dark', 'two projects are enough');
  await open('#/procedures', { three: false });
  await page.getByRole('tab', { name: /Rounds/ }).first().click();
  for (const sheet of ROUNDS) {
    const card = page.locator('article.round-sheet').filter({ has: page.getByRole('heading', { name: sheet.title, exact: true }) });
    for (const r of sheet.readings.filter((r) => r.bad)) {
      const btn = card.locator('button.reading-btn').filter({ hasText: r.label }).first();
      await btn.click();
      // Confirm the flag took (a tap during the entrance animation can miss); tap again if not.
      if ((await btn.getAttribute('aria-pressed')) !== 'true') await btn.click();
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
    }
    await card.getByRole('button', { name: 'Check my round' }).click();
    await expect(card.locator('.round-score')).toContainText('100/100');
  }
});
