import { expect, Locator, Page, test } from '@playwright/test';
import { boxOf, setRtl, visit } from './support/dom';

/**
 * The tooltip, measured in a browser — which for this component is where most of it exists.
 * A hover is a pointer the unit suite has none of, `:focus-visible` is an answer jsdom gives
 * to nobody, and an enter/leave is a transition in an engine with no layout. What the unit
 * file says is which attributes the library writes; this one says what happens when a person
 * points at something.
 */
test.describe('PctTooltip — a sentence about a control', () => {
  const panel = (page: Page) => page.locator('[data-pct-part="panel"]');

  test.beforeEach(async ({ page }) => {
    await visit(page, '/tooltip');
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

  test('a hover opens it, and the control is described by what it says', async ({
    page,
  }) => {
    const trigger = page.getByTestId('describes-trigger');
    await expect(trigger).not.toHaveAttribute('aria-describedby', /./);

    await trigger.hover();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toHaveRole('tooltip');
    await expect(panel(page)).toHaveText(
      'Removes the project and everything in it',
    );

    const id = await panel(page).getAttribute('id');
    await expect(trigger).toHaveAttribute('aria-describedby', id ?? '');
  });

  /**
   * The whole point of the distinction. A name may not come and go with the pointer — so it
   * is on the control from the start, and the panel is a second rendering of it rather than
   * the place a screen reader reads it from.
   */
  test('an icon-only button is named by its tooltip, open or not', async ({
    page,
  }) => {
    const trigger = page.getByTestId('names-trigger');

    await expect(trigger).toHaveAttribute('aria-label', 'Approve the release');
    await expect(trigger).not.toHaveAttribute('aria-describedby', /./);

    await trigger.hover();
    await expect(panel(page)).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-label', 'Approve the release');
    await expect(trigger).not.toHaveAttribute('aria-describedby', /./);
  });

  /**
   * A control inside the field chrome already points at its hint through `aria-describedby`,
   * and that attribute is a LIST. A tooltip that wrote over it would take the hint away for
   * as long as it was open, and hand it back as if nothing had happened.
   */
  test('the description joins the one the field already gave, and leaves it behind', async ({
    page,
  }) => {
    const input = page.getByTestId('note-input');
    // The chrome's own description, whatever id it happened to generate.
    await expect(input).toHaveAttribute('aria-describedby', /\S/);
    const hint = await input.getAttribute('aria-describedby');

    await input.hover();
    await expect(panel(page)).toBeVisible();
    const id = await panel(page).getAttribute('id');
    await expect(input).toHaveAttribute('aria-describedby', `${hint} ${id}`);

    await page.mouse.move(0, 0);
    await expect(panel(page)).toBeHidden();
    await expect(input).toHaveAttribute('aria-describedby', String(hint));
  });

  test('the keyboard opens it and a click does not', async ({ page }) => {
    await page.getByTestId('side-top').focus();
    await expect(panel(page)).toBeVisible();

    // Away and back by mouse: a press is the user acting on the control, not asking about it,
    // and `:focus-visible` is the platform's own answer to which of the two this was.
    await page.getByTestId('names-close').click();
    await expect(panel(page)).toBeHidden();
  });

  test('Escape dismisses it and leaves focus where it was (WCAG 1.4.13)', async ({
    page,
  }) => {
    const trigger = page.getByTestId('side-top');
    await trigger.focus();
    await expect(panel(page)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    expect(
      await page.evaluate(
        () => document.activeElement?.getAttribute('data-testid') ?? '',
      ),
    ).toBe('side-top');
  });

  /**
   * "Hoverable", the second of the three things WCAG 1.4.13 asks of content shown on hover:
   * the panel stands a gap away from the control, so reaching it means leaving the control —
   * and with no grace period the text would go away as the user reached for it.
   */
  test('the pointer can travel onto the panel and read it', async ({
    page,
  }) => {
    const trigger = page.getByTestId('describes-trigger');
    await trigger.hover();
    await expect(panel(page)).toBeVisible();

    const box = await boxOf(panel(page));
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(600);
    await expect(panel(page)).toBeVisible();

    await page.mouse.move(0, 0);
    await expect(panel(page)).toBeHidden();
  });

  test('the side is the one asked for, at the distance the component promises', async ({
    page,
  }) => {
    const top = page.getByTestId('side-top');
    await top.hover();
    await expect(panel(page)).toBeVisible();
    expect(await sideOf(page, top)).toEqual({ side: 'above', gap: 8 });

    await page.mouse.move(0, 0);
    await expect(panel(page)).toBeHidden();

    const bottom = page.getByTestId('side-bottom');
    await bottom.hover();
    await expect(panel(page)).toBeVisible();
    expect(await sideOf(page, bottom)).toEqual({ side: 'below', gap: 8 });
  });

  /**
   * The inline axis is the one a screenshot would not catch: the dependency resolves
   * `start`/`end` against the writing direction and adds the offset as plain pixels
   * afterwards, so the same number that opens a gap in an English page closes one — and lays
   * the panel over the control — in an Arabic one.
   */
  test('`end` is the side the writing direction says it is', async ({
    page,
  }) => {
    const trigger = page.getByTestId('describes-end');

    await trigger.hover();
    await expect(panel(page)).toBeVisible();
    expect(await sideOf(page, trigger)).toEqual({ side: 'end', gap: 8 });

    await page.mouse.move(0, 0);
    await expect(panel(page)).toBeHidden();

    await setRtl(page);
    await trigger.hover();
    await expect(panel(page)).toBeVisible();
    expect(await sideOf(page, trigger)).toEqual({ side: 'start', gap: 8 });
  });

  /**
   * A side with no room for the panel gives way to the one across the control rather than
   * to the nearest empty corner — a tooltip shown below the control it was asked to stand
   * above is still about that control.
   */
  test('a side with no room falls back across the control', async ({
    page,
  }) => {
    const trigger = page.getByTestId('side-end');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.hover();
    await expect(panel(page)).toBeVisible();

    const { side, gap } = await sideOf(page, trigger);
    expect(gap).toBe(8);
    expect(side).toBe('start');
  });

  /**
   * The leave is the half of the motion CSS cannot do on its own: an element taken out of the
   * DOM takes its transition with it. So the panel is held there, marked as leaving, until
   * the fade has run — and what is measured here is that it is still on the screen after the
   * pointer has gone, and gone once the motion is over.
   */
  test('the leave is waited out rather than cut off', async ({ page }) => {
    await page.getByTestId('describes-trigger').hover();
    await expect(panel(page)).toBeVisible();

    const left = Date.now();
    await page.mouse.move(0, 0);
    // The element is still in the DOM and marked as leaving — that alone is the promise: a
    // panel detached at the decision to close would leave nothing for the locator to find.
    await expect(panel(page)).toHaveAttribute('data-pct-leaving', '');
    await expect(panel(page)).toBeHidden();

    // And it was held for the motion rather than for the grace period alone. The two are
    // 150 ms each, so the boundary sits 100 ms clear of either — measured rather than
    // sampled, because the frame a transition starts on is the engine's to choose and
    // reading `opacity` right after the attribute finds `1` in webkit.
    expect(Date.now() - left).toBeGreaterThan(250);
  });

  /**
   * Reduced motion is answered by the token build, not by a media query in the sheet — so the
   * same rule that fades the panel carries `0.01ms` for a user who asked for less of it, and
   * the wait for the leave collapses with the transition rather than outliving it.
   */
  test('with reduced motion the fade is instant and the leave still ends', async ({
    page,
  }) => {
    await visit(page, '/tooltip', { media: { reducedMotion: 'reduce' } });
    const trigger = page.getByTestId('describes-trigger');

    await trigger.hover();
    await expect(panel(page)).toBeVisible();
    // The number rather than the string: the same `0.01ms` comes back as `0.00001s` from one
    // engine and as `1e-05s` from another, and what is being promised is a duration nobody
    // can see, not a way of printing it.
    const duration = await panel(page).evaluate(
      (el) => getComputedStyle(el).transitionDuration,
    );
    expect(parseFloat(duration)).toBeLessThan(0.001);

    await page.mouse.move(0, 0);
    await expect(panel(page)).toBeHidden();
  });

  test('a tooltip switched off while it is up goes with the state', async ({
    page,
  }) => {
    await page.getByTestId('off-trigger').hover();
    await expect(panel(page)).toBeVisible();

    await page.getByTestId('off-toggle').click();
    await expect(panel(page)).toBeHidden();
    await page.getByTestId('off-trigger').hover();
    await expect(panel(page)).toBeHidden();
  });

  /**
   * The finger, which has no hover at all. A tap is the user pressing the control; the
   * question about it is a long press — and the panel then stays long enough to be read.
   *
   * The gesture is dispatched rather than performed: Playwright's touchscreen has a tap and
   * no press-and-hold, so the events a long press is made of are sent by hand. What that
   * measures is this directive's own state machine, which is where the gesture is decided.
   */
  test('a long press opens it, a tap does not', async ({ page }) => {
    const press = (phase: string, id: string) =>
      page.evaluate(
        ([phase, id]) =>
          document
            .querySelector(`[data-testid="${id}"]`)
            ?.dispatchEvent(
              new PointerEvent(phase, { pointerType: 'touch', bubbles: true }),
            ),
        [phase, id],
      );

    await press('pointerdown', 'off-trigger');
    await press('pointerup', 'off-trigger');
    await page.waitForTimeout(700);
    await expect(panel(page)).toBeHidden();

    await press('pointerdown', 'off-trigger');
    await expect(panel(page)).toBeVisible();
    await press('pointerup', 'off-trigger');
    await expect(panel(page)).toBeVisible();
  });
});
