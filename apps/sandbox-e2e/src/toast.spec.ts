import { expect, Page, test } from '@playwright/test';
import { boxOf, setRtl, visit } from './support/dom';

/**
 * The toast (`req-a11y-built-in`, `req-a11y-wcag`, `req-token-logical`).
 *
 * The component has no element a consumer writes, so every case here starts from a button on
 * the sandbox view and looks at the one place messages land — a `role="log"` that was in the
 * document before any of them.
 */

const viewport = (page: Page) => page.locator('pct-toast-viewport');
const items = (page: Page) => page.locator('[data-pct-part="item"]');

test.describe('Toast', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/toast');
  });

  test('the region is in the document before anything has been said', async ({
    page,
  }) => {
    await expect(viewport(page)).toHaveAttribute('role', 'log');
    await expect(items(page)).toHaveCount(0);

    // A child of `body` and not of the application's own tree: that is the one place
    // `PctModalBackground` leaves speaking while a modal is up.
    expect(
      await viewport(page).evaluate((el) => el.parentElement?.tagName),
    ).toBe('BODY');
  });

  test('the region writes none of what the role already publishes', async ({
    page,
  }) => {
    const region = viewport(page);

    // Measured in chromium's own accessibility tree: `log` is `live=polite`,
    // `atomic=false`, `relevant="additions text"` with no attribute written at all. The
    // reflex — `role="status"` — publishes `atomic=true`, which re-reads the whole stack
    // every time a message arrives (0039, 0044).
    await expect(region).not.toHaveAttribute('aria-live');
    await expect(region).not.toHaveAttribute('aria-atomic');
    await expect(region).not.toHaveAttribute('aria-relevant');
  });

  test('a message lands in the region and goes away by itself', async ({
    page,
  }) => {
    await page.getByTestId('raise-brief').click();
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first()).toContainText('Copied to the clipboard');
    expect(
      await items(page)
        .first()
        .evaluate((el) => el.closest('pct-toast-viewport') !== null),
    ).toBe(true);

    await expect(items(page)).toHaveCount(0, { timeout: 4000 });
  });

  test('a message the pointer is on does not expire, and expires once it leaves', async ({
    page,
  }) => {
    await page.getByTestId('raise-brief').click();
    await items(page).first().hover();

    // Well past the 1500 ms the message was raised with.
    await page.waitForTimeout(2500);
    await expect(items(page)).toHaveCount(1);

    await page.mouse.move(4, 4);
    await expect(items(page)).toHaveCount(0, { timeout: 4000 });
  });

  test('a message the keyboard is in does not expire', async ({ page }) => {
    await page.getByTestId('raise-brief').click();
    await items(page).first().getByRole('button').first().focus();

    await page.waitForTimeout(2500);
    await expect(items(page)).toHaveCount(1);

    // Focus goes back to the page and what was left of the clock runs on.
    await page.getByTestId('raise-brief').focus();
    await expect(items(page)).toHaveCount(0, { timeout: 4000 });
  });

  test('an urgent message is an alert, and it waits', async ({ page }) => {
    await page.getByTestId('raise-urgent').click();

    await expect(items(page).first()).toHaveAttribute('role', 'alert');
    await page.waitForTimeout(2000);
    await expect(items(page)).toHaveCount(1);
  });

  test('a message with an action runs it, and goes', async ({ page }) => {
    await page.getByTestId('raise-action').click();
    await expect(page.getByTestId('undone-count')).toContainText('0 time');

    await items(page).first().getByRole('button', { name: 'Undo' }).click();

    await expect(page.getByTestId('undone-count')).toContainText('1 time');
    await expect(items(page)).toHaveCount(0);
  });

  test('the cross takes a message down', async ({ page }) => {
    await page.getByTestId('raise-standing').click();
    await expect(items(page)).toHaveCount(1);

    await items(page).first().getByRole('button', { name: 'Dismiss' }).click();

    await expect(items(page)).toHaveCount(0);
  });

  test('the stack holds no more than the configured limit', async ({
    page,
  }) => {
    for (let i = 0; i < 6; i++)
      await page.getByTestId('raise-standing').click();

    await expect(items(page)).toHaveCount(4);
  });

  test('the box is as big as its messages, and the page under the corner still answers', async ({
    page,
  }) => {
    await page.getByTestId('raise-standing').click();
    await expect(items(page)).toHaveCount(1);

    const stack = await boxOf(viewport(page));
    const message = await boxOf(items(page).first());
    // The viewport is the messages and the gaps between them, and nothing else — a box
    // stretched across the window would take the hit test away from the whole page under it
    // (measured in three engines).
    expect(Math.round(stack.width)).toBe(Math.round(message.width));
    expect(Math.round(stack.height)).toBe(Math.round(message.height));

    const size = page.viewportSize();
    expect(size).not.toBeNull();
    // A point in the corner the stack does not cover: the page answers there.
    const covered = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el?.closest('pct-toast-viewport') !== null;
      },
      [8, (size?.height ?? 600) - 8],
    );
    expect(covered).toBe(false);
  });

  test('the stack mirrors with the writing direction', async ({ page }) => {
    await setRtl(page);
    await page.getByTestId('raise-standing').click();
    await expect(items(page)).toHaveCount(1);

    // The direction is severed by a body-level element and handed over explicitly
    // (`lesson-35`); without it the placement would resolve against the page.
    await expect(viewport(page)).toHaveAttribute('dir', 'rtl');

    const stack = await boxOf(viewport(page));
    const size = page.viewportSize();
    expect(size).not.toBeNull();
    // Pinned to the left edge now, not the right one.
    expect(stack.x).toBeLessThan((size?.width ?? 1280) / 2);
  });

  test('a modal does not silence the stack standing behind it', async ({
    page,
  }) => {
    await page.getByTestId('raise-standing').click();
    await expect(items(page)).toHaveCount(1);

    await page.getByTestId('open-modal').click();
    await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();

    // Everything else on the page goes inert, and an inert subtree is ABSENT from the
    // accessibility tree rather than merely ignored — so a message inside one reaches
    // nobody. The exemption reads the ROLE, since a `log` carries no `aria-live` attribute
    // to be recognised by.
    await expect(viewport(page)).not.toHaveAttribute('inert');
    expect(
      await page.evaluate(() =>
        Array.from(document.body.children)
          .filter((child) => child.hasAttribute('inert'))
          .some((child) => child.querySelector('pct-toast-viewport') !== null),
      ),
    ).toBe(false);
  });

  test('the top layer orders by recency: a modal opened later stands over an older message', async ({
    page,
  }) => {
    await page.getByTestId('raise-standing').click();
    await expect(items(page)).toHaveCount(1);
    await page.getByTestId('open-modal').click();
    await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();

    // Not a defect but the platform's own rule, and the reason `z-index` was given up here:
    // the CDK draws its overlays inside a shown popover, so the veil is in the top layer and
    // nothing outside it can be above it whatever the number says (lesson-122).
    const overVeil = await items(page)
      .first()
      .evaluate((el) => {
        const box = el.getBoundingClientRect();
        const top = document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
        return top?.closest('pct-toast-viewport') !== null;
      });
    expect(overVeil).toBe(false);
  });

  test('a message raised while the modal is up stands over it', async ({
    page,
  }) => {
    await page.getByTestId('open-modal').click();
    await page.getByTestId('modal-report').click();
    await expect(items(page)).toHaveCount(1);

    // Shown last means shown on top, so the cross can be pressed with the veil in place.
    await items(page).first().getByRole('button', { name: 'Dismiss' }).click();
    await expect(items(page)).toHaveCount(0);
  });

  test('a modal can report on its way out', async ({ page }) => {
    await page.getByTestId('open-modal').click();
    await page.getByTestId('modal-save').click();

    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first()).toContainText('Settings saved');
  });
});
