import { expect, Locator, Page, test } from '@playwright/test';
import { boxOf, setRtl, visit } from './support/dom';

/**
 * The popover, measured in a browser — which for this component is where the interesting half
 * lives. Whether Tab reaches a control is a question about layout, jsdom runs none, and the
 * whole point of the component is what the page behind it can still do while it is up.
 */
test.describe('PctPopover — a panel on a live page', () => {
  const panel = (page: Page) => page.locator('[data-pct-part="panel"]');

  test.beforeEach(async ({ page }) => {
    await visit(page, '/popover');
  });

  /** Where a panel sits relative to what it hangs on, and how far away. */
  async function sideOf(
    page: Page,
    trigger: Locator,
  ): Promise<{ side: string; gap: number }> {
    const t = await boxOf(trigger);
    const p = await boxOf(panel(page));
    const gaps = {
      start: Math.round(t.x - (p.x + p.width)),
      end: Math.round(p.x - (t.x + t.width)),
      above: Math.round(t.y - (p.y + p.height)),
      below: Math.round(p.y - (t.y + t.height)),
    };
    const [side, gap] = Object.entries(gaps).reduce((best, entry) =>
      entry[1] > best[1] ? entry : best,
    );
    return { side, gap };
  }

  test('nothing is rendered until the trigger is pressed', async ({ page }) => {
    await expect(panel(page)).toHaveCount(0);
    const trigger = page.getByTestId('panel-trigger');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(trigger).not.toHaveAttribute('aria-controls', /./);
  });

  /**
   * The one attribute that says what this component is not. `role="dialog"` it shares with the
   * modal; `aria-modal` is what it must never carry, because the page behind really does
   * answer — and an attribute claiming otherwise is a lie told to the one user who cannot see
   * that it is.
   */
  test('the trigger opens a dialog panel that is not modal', async ({
    page,
  }) => {
    const trigger = page.getByTestId('panel-trigger');
    await trigger.click();

    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toHaveRole('dialog');
    await expect(panel(page)).not.toHaveAttribute('aria-modal', /./);

    const id = await panel(page).getAttribute('id');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('aria-controls', id ?? '');
  });

  /**
   * Onto the PANEL and not onto the field inside it: the panel carries the role and the name,
   * so it is what a screen reader announces on arrival. The Tab that follows is the way in.
   */
  test('focus goes to the panel, and Tab from there reaches the content', async ({
    page,
  }) => {
    await page.getByTestId('panel-trigger').click();
    await expect(panel(page)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('panel-input')).toBeFocused();
  });

  test('Escape closes it and gives focus back to the trigger', async ({
    page,
  }) => {
    const trigger = page.getByTestId('panel-trigger');
    await trigger.click();
    await expect(panel(page)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  /**
   * The tab order is the reason this is written at all. An overlay is a child of `body`, so
   * the panel's content stands at the END of the document however near the trigger it is
   * drawn — Tab past its last control would leave the page altogether. Closing and handing
   * focus back to the trigger puts the panel where the reader thinks it is.
   */
  test('Tab past the last control closes it and returns to the trigger', async ({
    page,
  }) => {
    const trigger = page.getByTestId('panel-trigger');
    await trigger.click();
    await page.getByTestId('panel-apply').focus();

    await page.keyboard.press('Tab');
    await expect(panel(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('and Shift+Tab out of the first control does the same', async ({
    page,
  }) => {
    const trigger = page.getByTestId('panel-trigger');
    await trigger.click();
    await page.getByTestId('panel-input').focus();

    await page.keyboard.press('Shift+Tab');
    await expect(panel(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  /**
   * The defect the guard in `attach` exists for, and the reason it is not obvious: the
   * dependency's outside-press listener sits on `body` in the CAPTURE phase, so it sees the
   * click BEFORE the trigger's own handler does. A popover that dismissed itself there would
   * be re-opened by its own toggle on the way back up, and the control that opened it could
   * never shut it ([`lesson-93`](../../../docs/lessons.md#lesson-93)).
   */
  test('a second press on the trigger closes it, and does not reopen it', async ({
    page,
  }) => {
    const trigger = page.getByTestId('panel-trigger');
    await trigger.click();
    await expect(panel(page)).toBeVisible();
    // Settled before the second press, and not out of politeness: a panel is positioned as it
    // is attached and `withPush` slides it back into the window, so the window in which it is
    // still moving is a window in which it can stand over the control — and a press that lands
    // on the panel measures nothing about the trigger.
    await expect(panel(page)).toHaveCSS('opacity', '1');

    await trigger.click();
    await expect(panel(page)).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('a press outside closes it, and says that is why', async ({ page }) => {
    await page.getByTestId('live-trigger').click();
    await expect(panel(page)).toBeVisible();

    // A piece of the page that takes no focus of its own: what is measured here is the press
    // and nothing focus did on the way.
    await page.getByTestId('live-count').click();
    await expect(panel(page)).toHaveCount(0);
    await expect(page.getByTestId('live-reason')).toHaveText(/outside/);
  });

  test('and the trigger says so too', async ({ page }) => {
    await page.getByTestId('live-trigger').click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toHaveCSS('opacity', '1');

    await page.getByTestId('live-trigger').click();
    await expect(panel(page)).toHaveCount(0);
    await expect(page.getByTestId('live-reason')).toHaveText(/trigger/);
  });

  /**
   * What a popover IS, measured rather than declared: the page behind a modal is `inert` and
   * the page behind this one is not, so a control beside the panel answers a press while the
   * panel is up. The counter goes up on the very press that dismisses the panel.
   */
  test('the page behind is not inert', async ({ page }) => {
    await page.getByTestId('live-trigger').click();
    await expect(panel(page)).toBeVisible();
    await expect(page.getByTestId('live-count')).toHaveText('Count: 0');

    await page.getByTestId('live-counter').click();
    await expect(page.getByTestId('live-count')).toHaveText('Count: 1');
    await expect(page.getByTestId('live-reason')).toHaveText(/outside/);
  });

  /** And the page is not locked either — the other half of what a modal takes away. */
  test('the page behind still scrolls', async ({ page }) => {
    await page.getByTestId('panel-trigger').click();
    await expect(panel(page)).toBeVisible();

    const overflow = await page.evaluate(
      () => getComputedStyle(document.documentElement).overflow,
    );
    expect(overflow).not.toBe('hidden');
  });

  test('the side is the one the author asked for, eight pixels away', async ({
    page,
  }) => {
    for (const [id, side] of [
      ['side-top', 'above'],
      ['side-bottom', 'below'],
    ] as const) {
      const trigger = page.getByTestId(id);
      // Into the middle of the window first: the fallback across the control is a promise of
      // its own, and a trigger sitting near an edge would measure that one instead.
      await trigger.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await trigger.click();
      await expect(panel(page)).toBeVisible();
      expect(await sideOf(page, trigger)).toEqual({ side, gap: 8 });
      await page.keyboard.press('Escape');
      await expect(panel(page)).toHaveCount(0);
    }
  });

  /**
   * The one thing a screenshot would not catch. The dependency resolves the BOX by writing
   * direction and then adds the offset as plain pixels, so the same number that opens a gap in
   * an English page closes one in an Arabic page — the sign is flipped in
   * `pctPlacementPositions`, and this is where it is measured on both sides.
   */
  test('an inline side keeps its gap in both writing directions', async ({
    page,
  }) => {
    const trigger = page.getByTestId('side-end');
    await trigger.click();
    await expect(panel(page)).toBeVisible();
    expect((await sideOf(page, trigger)).gap).toBe(8);
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);

    await setRtl(page);
    await trigger.click();
    await expect(panel(page)).toBeVisible();
    // The gap is the whole measurement, and a negative one is the defect: with the sign left
    // physical, the same number that opens a gap here would lay the panel over the control.
    expect((await sideOf(page, trigger)).gap).toBe(8);
  });

  /**
   * The leave is the half of the motion CSS cannot do on its own: an element taken out of the
   * DOM takes its transition with it. So the panel is held there, marked as leaving, until the
   * fade has run.
   */
  test('the leave is waited out rather than cut off', async ({ page }) => {
    await page.getByTestId('panel-trigger').click();
    await expect(panel(page)).toBeVisible();
    // The ENTER has to have finished first, and this is not test hygiene: a transition
    // reversed in flight is shortened by the engine in proportion to how far it had got
    // (the reversing-adjusted start value), so closing a panel still fading in measures a
    // leave the browser deliberately cut short — 98 ms of the 150 the token asks for.
    await expect(panel(page)).toHaveCSS('opacity', '1');

    const closed = Date.now();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    expect(Date.now() - closed).toBeGreaterThan(100);
  });

  /**
   * Reduced motion is answered by the token build, not by a media query in the sheet — so the
   * same rule that fades the panel carries `0.01ms` for a user who asked for less of it, and
   * the wait for the leave collapses with the transition rather than outliving it.
   */
  test('with reduced motion the fade is instant and the leave still ends', async ({
    page,
  }) => {
    await visit(page, '/popover', { media: { reducedMotion: 'reduce' } });
    await page.getByTestId('panel-trigger').click();
    await expect(panel(page)).toBeVisible();

    // The number rather than the string: the same `0.01ms` comes back as `0.00001s` from one
    // engine and as `1e-05s` from another, and what is promised is a duration nobody can see.
    const duration = await panel(page).evaluate(
      (el) => getComputedStyle(el).transitionDuration,
    );
    expect(parseFloat(duration)).toBeLessThan(0.001);

    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
  });
});
