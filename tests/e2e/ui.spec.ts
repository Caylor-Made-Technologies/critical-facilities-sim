import { expect, test } from './fixtures';

// Phase 6b: quick taps right as a page opens must count (B-023, B-019).

test('ui v2: a tap during the page slide still answers the drill step (B-023)', async ({ page, open }, info) => {
  test.skip(info.project.name !== 'laptop-light' && info.project.name !== 'phone-dark', 'two projects are enough');
  // Hold the engine chunk back so it arrives while the Simulator slides in (how the bug showed up).
  await page.route(/\/engine-[^/]*\.js$/, async (r) => {
    await new Promise((res) => setTimeout(res, 1200));
    await r.continue();
  });
  await open('#/procedures', { three: false });
  await page.getByRole('tab', { name: /Emergency drills/ }).first().click();
  await page.getByRole('button', { name: /Chiller trip on a 105/ }).first().click();
  const eyebrow = page.locator('.proc-card:not(.proc-result) .eyebrow');
  await expect(eyebrow).toContainText('Step 1 of');
  await page.waitForFunction(() => document.documentElement.dataset.engine === 'v2', null, { polling: 'raf' });
  const btn = page.locator('.choices button.choice').filter({ hasText: 'Confirm the standby chiller' }).first();
  await btn.scrollIntoViewIfNeeded();
  const box = (await btn.boundingBox())!;
  // A raw tap with no waiting for animations, like a person tapping fast.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(eyebrow).toContainText('Step 2 of');
});

test('ui v2: rounds readings do not move while the page fades in, and the first tap flags (B-019)', async ({ page, open }) => {
  await open('#/procedures', { three: false });
  await page.getByRole('tab', { name: /Rounds/ }).first().click();
  const btn = page.locator('button.reading-btn').first();
  await btn.waitFor({ state: 'attached' });
  await btn.scrollIntoViewIfNeeded();
  // No time-based animation may move the button or its cards (scroll-linked effects move with the page, so
  // what you see is still what you tap).
  const moving = await btn.evaluate((el) => {
    const out: string[] = [];
    for (let n: Element | null = el; n; n = n.parentElement)
      for (const a of n.getAnimations()) {
        if (a.timeline && a.timeline !== document.timeline) continue;
        const kf = (a.effect as KeyframeEffect).getKeyframes();
        if (kf.some((k) => ('transform' in k && k.transform !== 'none') || 'translate' in k || 'top' in k)) out.push(`${n.className}:${(a as CSSAnimation).animationName ?? 'transition'}`);
      }
    return out;
  });
  expect(moving).toEqual([]);
  const box = (await btn.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
});

test('ui v2: Alarms tile counts new alarms and jumps to the list', async ({ page, open }) => {
  await open('#/sim', { three: false });
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'v2');
  const tile = page.getByRole('button', { name: /^Alarms: / });
  await expect(tile).toHaveAccessibleName(/Alarms: none/);
  await page.getByRole('button', { name: /Mechanical/ }).first().click();
  await page.getByRole('button', { name: /^CRAH-101, / }).first().click();
  await page.locator('section.comp-card').getByRole('button', { name: 'Fail it' }).click();
  await page.getByRole('button', { name: 'Step one second' }).click();
  await expect(tile).toHaveAccessibleName(/Alarms: 1 · 1 new/);
  await expect(tile).toHaveClass(/tone-warn/);
  await tile.click();
  await expect(page.locator('#alarm-h')).toBeFocused();
  await expect(page.locator('#alarm-h')).toBeInViewport();
});

test('ui v2: nothing below jumps when the v2 panels load', async ({ page, open }) => {
  await page.route(/\/engine-[^/]*\.js$/, async (r) => {
    await new Promise((res) => setTimeout(res, 1500));
    await r.continue();
  });
  await open('#/sim', { three: false });
  await page.locator('.v2-slot-top').waitFor();
  const top = (sel: string) => page.evaluate((s) => document.querySelector(s)!.getBoundingClientRect().top + window.scrollY, sel);
  const a0 = await top('.sim-layout');
  const b0 = await top('.hall');
  await page.locator('.air-card').waitFor();
  await page.locator('.alarm-panel').waitFor();
  expect(Math.abs((await top('.sim-layout')) - a0)).toBeLessThan(8);
  expect(Math.abs((await top('.hall')) - b0)).toBeLessThan(12);
});

// Phase 6b (navigation): every tab within two taps on a phone; old #/ links keep working.
test('ui v2 nav: every tab is at most two taps from Home on a phone, grouped in the More sheet', async ({ page, open }, info) => {
  test.skip(!info.project.name.startsWith('phone'), 'phone layout');
  test.setTimeout(300_000); // visits all 20 tabs
  const { NAV, BOTTOM, GROUPS } = await import('../../src/ui/nav');
  await open('#/home', { three: false });
  const bar = page.locator('.bottombar');
  for (const n of NAV) {
    await page.evaluate(() => (location.hash = '#/home'));
    await expect(page.locator('main')).toHaveAttribute('data-tab', 'home');
    if (BOTTOM.includes(n.id)) {
      await bar.locator(`a[href="#/${n.id}"]`).click(); // tap 1
    } else {
      await bar.getByRole('button', { name: 'More' }).click(); // tap 1
      const sheet = page.locator('#more-sheet');
      await sheet.locator(`a[href="#/${n.id}"]`).click(); // tap 2
    }
    await expect(page.locator('main')).toHaveAttribute('data-tab', n.id);
  }
  await bar.getByRole('button', { name: 'More' }).click();
  const labels = await page.locator('#more-sheet .side-group-label').allInnerTexts();
  expect(labels.map((l) => l.trim().toLowerCase())).toEqual(GROUPS.filter((g) => NAV.some((n) => n.group === g && !BOTTOM.includes(n.id))).map((g) => g.toLowerCase()));
});

test('ui v2 nav: old #/ links open their tab, unknown ones open Home', async ({ page, open }, info) => {
  test.skip(info.project.name !== 'laptop-light', 'one project is enough');
  test.setTimeout(240_000);
  const { TAB_IDS } = await import('../../src/ui/nav');
  await open('#/home', { three: false });
  for (const id of TAB_IDS) {
    await page.goto(`./#/${id}`);
    await expect(page.locator('main')).toHaveAttribute('data-tab', id);
  }
  await page.goto('./#/no-such-tab');
  await expect(page.locator('main')).toHaveAttribute('data-tab', 'home');
});

// 6c: one-thumb controls on a phone once the control dock scrolls away.
test('ui v2 sim: phone thumb bar steps time and acknowledges alarms after the dock scrolls away', async ({ page, open }, info) => {
  test.skip(!info.project.name.startsWith('phone'), 'phone layout');
  await open('#/sim', { three: false });
  await expect(page.locator('html')).toHaveAttribute('data-engine', 'v2');
  await expect(page.locator('.v2-thumb')).toHaveCount(0);
  await page.getByRole('button', { name: /Mechanical/ }).first().click();
  await page.getByRole('button', { name: /^CRAH-101, / }).first().click();
  await page.locator('section.comp-card').getByRole('button', { name: 'Fail it' }).click();
  await page.locator('.air-card').scrollIntoViewIfNeeded();
  const bar = page.getByRole('toolbar', { name: 'Quick simulator controls' });
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'Step one second (quick bar)' }).click();
  await expect(bar.getByRole('button', { name: 'Acknowledge all 1 new alarms' })).toBeEnabled();
  await bar.getByRole('button', { name: 'Acknowledge all 1 new alarms' }).click();
  await expect(bar.getByRole('button', { name: 'No new alarms' })).toBeDisabled();
  await bar.getByRole('button', { name: /^Speed 1 times/ }).click();
  await expect(bar.getByRole('button', { name: /^Speed 10 times/ })).toBeVisible();
  // Bar sits above the bottom navigation and inside the screen.
  const b = (await bar.boundingBox())!;
  const nav = (await page.locator('.bottombar').boundingBox())!;
  expect(b.y + b.height).toBeLessThanOrEqual(nav.y + 1);
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});
