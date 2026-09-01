import { expect, test, type Page } from '@playwright/test';
import { boxOf, visit } from './support/dom';

/**
 * What is measured here is the CHAIN under a real network and real Unicode: the dead
 * picture below is an actual 404 whose `error` the platform fires, and the initials row is
 * the five scripts of 0052's probe rendered by real engines — a unit run drives the same
 * logic, only a browser can say the family, the flag and the matra survive the whole road
 * from template to glyph. Three engines have to agree, or "an initial is a grapheme" is a
 * claim about one of them.
 */
test.describe('PctAvatar — the picture beside a name', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/avatar');
  });

  const standingPart = (page: Page, id: string) =>
    page
      .getByTestId(id)
      .locator('[data-pct-part]')
      .first()
      .getAttribute('data-pct-part');

  test('is hidden decoration, whole', async ({ page }) => {
    await expect(page.getByTestId('alive')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  test('the chain: image, initials after a real 404, silhouette with nothing', async ({
    page,
  }) => {
    expect(await standingPart(page, 'alive')).toBe('image');

    // The dead avatar's `src` points nowhere on this very server: the 404 is real, the
    // `error` is the platform's, and the initials stand up with no code of the page's.
    await expect.poll(() => standingPart(page, 'dead')).toBe('initials');
    await expect(
      page.getByTestId('dead').locator('[data-pct-part="initials"]'),
    ).toHaveText('AL');

    expect(await standingPart(page, 'nobody')).toBe('silhouette');
  });

  test('the decorative image is alt="" — the platform’s own word for it', async ({
    page,
  }) => {
    await expect(
      page.getByTestId('alive').locator('[data-pct-part="image"]'),
    ).toHaveAttribute('alt', '');
  });

  test('a new src re-arms the chain, both ways', async ({ page }) => {
    const retry = page.getByTestId('retry');
    await expect.poll(() => standingPart(page, 'retry')).toBe('initials');

    // Dead → alive: the failure is forgotten with the URL that caused it.
    await page.getByTestId('swap').click();
    await expect.poll(() => standingPart(page, 'retry')).toBe('image');
    await expect(retry.locator('[data-pct-part="image"]')).toHaveJSProperty(
      'complete',
      true,
    );

    // Alive → dead again: a fresh error, a fresh fall.
    await page.getByTestId('swap').click();
    await expect.poll(() => standingPart(page, 'retry')).toBe('initials');
  });

  test('an initial is a grapheme: the five scripts of the probe, whole', async ({
    page,
  }) => {
    const drawn = await page
      .getByTestId('demo-initials')
      .locator('[data-pct-part="initials"]')
      .allTextContents();
    expect(drawn).toEqual(['AL', 'Ø', '👩‍👩‍👧T', 'आश', '李']);
  });

  test('the box is the control axis, and it is a circle at every size', async ({
    page,
  }) => {
    for (const [id, expected] of [
      ['size-sm', 28],
      ['size-md', 36],
      ['size-lg', 44],
    ] as const) {
      const box = await boxOf(page.getByTestId(id));
      expect(box.height, id).toBeCloseTo(expected, 0);
      // Equal sides are the circle's arithmetic — and the reading that catches a flex row
      // shrinking the box into an ellipse, which is what a specified width alone measures
      // as: a basis, not a promise.
      expect(box.width, id).toBeCloseTo(box.height, 0);
    }
  });

  test('a control that shows only an avatar names itself, once', async ({
    page,
  }) => {
    const account = page.getByTestId('account');
    await expect(account).toHaveAccessibleName('Account: Ada Lovelace');
    // The picture adds nothing to that name: its subtree is hidden, so the button's label
    // is the whole announcement.
    await expect(account.locator('pct-avatar')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  test('nothing in the component can take focus', async ({ page }) => {
    // The aria-hidden host must hold nothing reachable (axe's `aria-hidden-focus`); the
    // skeleton's reading, at the third hidden component.
    const focusable = await page
      .getByTestId('demo-chain')
      .locator('pct-avatar')
      .evaluateAll((avatars) =>
        avatars.flatMap((avatar) =>
          [...avatar.querySelectorAll<HTMLElement>('*')].filter((el) => {
            el.focus();
            return document.activeElement === el;
          }),
        ),
      );
    expect(focusable).toHaveLength(0);
  });
});
