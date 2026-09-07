import { expect, Page, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * How a keyboard reaches a place that is not where the reading order says it is
 * (plan 4.16, [0072](../../../docs/decisions/0072-a-region-key-is-the-consumer-s-to-install.md)).
 *
 * The measurement behind the mechanism: a toast's `Undo` is a real control on a card that is a
 * child of `body`, so it stands after every control on the page. "Reachable in principle" is
 * not the promise "reachable" makes, and the usual repair — a document-level key handler — is
 * a keystroke taken from an application that never offered one. So the library ships the
 * cycle and the consumer mounts the key; the sandbox is the application that mounts it here,
 * on its own shell, with the default F6.
 *
 * What these cases hold is the mechanism working in a browser rather than in jsdom: the hop
 * itself, that it lands on a place and not on a control, and — the case that matters most —
 * that it reaches the stack in ONE press from anywhere, which is the whole point.
 */

const active = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el
      ? `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).trim().split(/\s+/)[0]}` : ''}`
      : 'none';
  });

test.describe('The region cycle — one hop instead of a walk', () => {
  test('F6 walks the page’s regions and comes back round', async ({ page }) => {
    await visit(page, '/button');

    await page.keyboard.press('F6');
    expect(await active(page)).toBe('nav.shell__nav');

    await page.keyboard.press('F6');
    expect(await active(page)).toBe('main.shell__view');

    // And round: two regions, so the third press is the first again.
    await page.keyboard.press('F6');
    expect(await active(page)).toBe('nav.shell__nav');
  });

  test('a region takes focus as a place, not as a control', async ({
    page,
  }) => {
    await visit(page, '/button');
    await page.keyboard.press('F6');

    const nav = page.locator('nav.shell__nav');
    // `-1`: focusable by the cycle, absent from the tab order. The walk INSIDE a region is
    // still Tab's — a jump straight to the first link would skip what the region says it is.
    await expect(nav).toHaveAttribute('tabindex', '-1');
    expect(await nav.evaluate((el) => el === document.activeElement)).toBe(
      true,
    );

    await page.keyboard.press('Tab');
    expect(await active(page)).not.toBe('nav.shell__nav');
  });

  test('the toast stack is one press away, and one press back', async ({
    page,
  }) => {
    await visit(page, '/toast');
    await page.getByTestId('raise-action').click();
    const stack = page.locator('pct-toast-viewport');
    await expect(stack).toBeVisible();

    // The measurement this whole mechanism exists for. Focus is on the button that raised the
    // message — inside `main`, which is the region before the stack in the document — so ONE
    // press is the whole distance to a control that is otherwise last in the tab order.
    await page.keyboard.press('F6');
    expect(await active(page)).toBe('pct-toast-viewport.pct-toast');

    // Tab from the stack reaches the action, which is what "reachable" was supposed to mean.
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(
        () => document.activeElement?.getAttribute('data-pct-part') ?? 'none',
      ),
    ).toBe('action');

    // And the key works from INSIDE the stack, which is not free: the stack is a child of
    // `body`, so a press there never reaches the element the key was mounted on. The
    // component answers the same key itself, and only because a consumer chose one.
    await page.keyboard.press('F6');
    expect(await active(page)).toBe('nav.shell__nav');
  });

  test('the stack names itself, so arriving there says where you are', async ({
    page,
  }) => {
    await visit(page, '/toast');
    await page.getByTestId('raise-standing').click();

    // A place the keyboard lands on with nothing to announce is a place the user has to guess
    // at. The name is a string of the text channel, so an application translates it.
    await expect(page.locator('pct-toast-viewport')).toHaveAttribute(
      'aria-label',
      'Notifications',
    );
  });
});
