import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

test.describe('PctButton', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/button');
  });

  test('renders the library page and the buttons', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('@pacit/components');
    await expect(page.locator('button[pctButton]').first()).toBeVisible();
  });

  test('a solid button takes its background from a token (--pct-button-bg)', async ({
    page,
  }) => {
    const bg = await page
      .getByTestId('btn-solid')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    // --pct-primary = blue-600 = #2563eb
    expect(bg).toBe('rgb(37, 99, 235)');
  });

  test('loading shows part=spinner and blocks the button', async ({ page }) => {
    const loading = page.getByTestId('btn-loading');
    await expect(loading).toBeDisabled();
    await expect(loading.locator('[data-pct-part="spinner"]')).toBeVisible();
  });

  test('a disabled button is not dimmed with opacity', async ({ page }) => {
    // The states have colour tokens of their own — opacity would change the
    // contrast in a way the gate cannot see (req-token-no-opacity).
    await expect(page.getByTestId('btn-disabled')).toHaveCSS('opacity', '1');
  });
});

/**
 * The face on the other element (`0071`). What is measured is what the widening could
 * break and a unit case cannot see: that the link is still a link to the accessibility
 * tree, that it is the same object to the eye as the button beside it, that the ring is
 * the same ring, and that a disabled link goes nowhere — by pointer or by keyboard.
 */
test.describe('PctButton — the same face on a link', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/button');
  });

  test('a link keeps its role and its name', async ({ page }) => {
    await expect(page.getByTestId('demo-links')).toMatchAriaSnapshot(`
      - link "Get started"
      - link "Hero link"
      - link "Disabled link"
      - button "Get started"
    `);
  });

  test('it is the same object as the button beside it, minus the underline', async ({
    page,
  }) => {
    const read = (testId: string) =>
      page.getByTestId(testId).evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          face: [
            s.height,
            s.paddingInlineStart,
            s.paddingInlineEnd,
            s.borderRadius,
            s.fontSize,
            s.fontWeight,
            s.backgroundColor,
            s.color,
            s.display,
          ].join(' · '),
          underline: s.textDecorationLine,
        };
      });

    const link = await read('link-solid');
    const button = await read('link-twin');

    expect(
      link.face,
      'a link wearing the face is not the button beside it',
    ).toBe(button.face);
    // The underline is the one thing a link gives up here: the face carries its own
    // hover, so the change is never colour alone (0071).
    expect(link.underline).toBe('none');
    expect(button.underline).toBe('none');
  });

  test("the keyboard ring is the button's ring, and a disabled link still takes focus", async ({
    page,
  }) => {
    const ring = (testId: string) =>
      page.getByTestId(testId).evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.outlineStyle, s.outlineWidth, s.outlineColor].join(' · ');
      });

    // A real keyboard, because `:focus-visible` is an answer to how focus arrived and a
    // programmatic `.focus()` is not that answer (the field's own case, one spec over).
    await page.getByTestId('link-solid').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('link-hero')).toBeFocused();
    const lit = await ring('link-hero');

    // `aria-disabled` is a state, not a removal: the link stays in the tab order so a
    // reader can find it and be told why it does nothing.
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('link-disabled')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('link-twin')).toBeFocused();
    expect(lit, 'the link and the button do not light alike').toBe(
      await ring('link-twin'),
    );
    expect(lit).toContain('solid');
  });

  /**
   * The disabled link in the view is a `routerLink`, on purpose: the refusal has to arrive
   * before the ROUTER's own click handler as well as before the browser's navigation, and
   * that is the case a consumer writes first (`lesson-166`).
   */
  test('an enabled link navigates, and a disabled one refuses both roads', async ({
    page,
  }) => {
    const disabled = page.getByTestId('link-disabled');
    await expect(disabled).toHaveAttribute('aria-disabled', 'true');
    await expect(disabled).toHaveAttribute('href', '/select');

    // `force`, because Playwright's own actionability reads `aria-disabled` as disabled and
    // would wait for the element to become enabled until the case times out — which is a
    // second reading of the state, from a tool that was not told about it. A pointer is not
    // stopped by an attribute, so the press has to be made and refused.
    await disabled.click({ force: true });
    await expect(page).toHaveURL(/\/button$/);

    await disabled.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/button$/);

    await page.getByTestId('link-solid').click();
    await expect(page).toHaveURL(/\/select$/);
  });
});
