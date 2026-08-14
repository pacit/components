import { expect, test } from '@playwright/test';
import { attrOf, visit } from './support/dom';

test.describe('PctField — the field wrapper', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/field');
  });

  test('the wrapper label points at the control inside (across the projection boundary)', async ({
    page,
  }) => {
    const field = page.getByTestId('field-email');
    const input = field.locator('input');

    await field.locator('[data-pct-part="field-label"]').click();
    await expect(input).toBeFocused();

    const hintId = await attrOf(
      field.locator('[data-pct-part="field-hint"]'),
      'id',
    );
    await expect(input).toHaveAttribute('aria-describedby', hintId);
  });

  test('the affixes sit inside the border, in the order prefix → field → suffix', async ({
    page,
  }) => {
    const row = page
      .getByTestId('field-price')
      .locator('[data-pct-part="field-row"]');
    const parts = await row
      .locator('> *')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-pct-part')));
    expect(parts).toEqual(['field-prefix', 'field-control', 'field-suffix']);

    // The border belongs to the row; the control is transparent and has none.
    await expect(row).toHaveCSS('border-width', '1px');
    await expect(page.getByTestId('field-price').locator('input')).toHaveCSS(
      'border-width',
      '0px',
    );
  });

  /**
   * The wrapper draws the focus ring around the whole row — including when focus
   * lands on a button in the suffix slot. A programmatic .focus() does not trigger
   * :focus-visible, which is why the test navigates with a real keyboard.
   */
  test('focus inside the field lights the whole border, from the suffix button too', async ({
    page,
  }) => {
    const field = page.getByTestId('field-price');
    const row = field.locator('[data-pct-part="field-row"]');
    const input = field.locator('input');

    const ringWidth = () =>
      row.evaluate((el) => getComputedStyle(el).outlineWidth);

    // A click on a text field gives :focus-visible (browsers apply it to elements
    // that take text), so we do not lean on the global tab order, which changes
    // along with the page layout.
    await input.click();
    await expect(input).toBeFocused();
    expect(await ringWidth()).toBe('2px');

    // The next Tab moves focus to the slot button — the border stays lit.
    await page.keyboard.press('Tab');
    await expect(field.getByTestId('field-price-clear')).toBeFocused();
    expect(await ringWidth()).toBe('2px');
  });

  test('the button in the suffix slot clears the value', async ({ page }) => {
    const field = page.getByTestId('field-price');
    const input = field.locator('input');

    await expect(input).toHaveValue('1\u202f499,90');
    await field.getByTestId('field-price-clear').click();
    await expect(input).toHaveValue('');
  });

  test('the wrapper renders the validation error and binds it to the control', async ({
    page,
  }) => {
    const field = page.getByTestId('field-email');
    const input = field.locator('input');
    const error = field.locator('[data-pct-part="field-error"]');

    await expect(error).toHaveCount(0);

    await input.fill('to-nie-email');
    await input.press('Tab');

    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute('role', 'alert');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAttribute(
      'aria-describedby',
      new RegExp(await attrOf(error, 'id')),
    );

    // The field border signals the error with a colour from a token.
    await expect(field.locator('[data-pct-part="field-row"]')).toHaveCSS(
      'border-color',
      'rgb(220, 38, 38)',
    );
  });

  test('there is one line below the field: the error replaces the hint', async ({
    page,
  }) => {
    const field = page.getByTestId('field-bio');
    const input = field.getByTestId('bio-input');
    const hint = field.locator('[data-pct-part="field-hint"]');
    const error = field.locator('[data-pct-part="field-error"]');

    // At the start the hint is visible and there is no error.
    await expect(hint).toBeVisible();
    await expect(error).toHaveCount(0);
    await expect(input).toHaveAttribute(
      'aria-describedby',
      await attrOf(hint, 'id'),
    );

    // A description that is too short plus leaving the field: the error takes the
    // place of the hint.
    await input.fill('short');
    await input.press('Tab');

    await expect(error).toBeVisible();
    await expect(hint).toHaveCount(0);
    // describedby points only at the visible message (no dangling hint id).
    await expect(input).toHaveAttribute(
      'aria-describedby',
      await attrOf(error, 'id'),
    );
  });

  test('the aux slots: an icon beside the label and a character counter', async ({
    page,
  }) => {
    const field = page.getByTestId('field-bio');
    const header = field.locator('[data-pct-part="field-header"]');
    const footer = field.locator('[data-pct-part="field-footer"]');
    const counter = field.getByTestId('bio-counter');

    // The label aux lies in the label row, to the right.
    await expect(
      header.locator('[data-pct-part="field-label-aux"] button'),
    ).toHaveAttribute('aria-label', /profile/);

    // The counter lies in the message row and counts the characters typed.
    await expect(
      footer.locator('[data-pct-part="field-message-aux"]'),
    ).toHaveCount(1);
    await expect(counter).toHaveText('0/120');
    await field.getByTestId('bio-input').fill('twelve chars');
    await expect(counter).toHaveText('12/120');
  });

  test('a control with no border (bare) has no clipped corner', async ({
    page,
  }) => {
    const bareRow = page
      .getByTestId('field-bare-checkbox')
      .locator('[data-pct-part="field-row"]');

    // With no visible border the row neither rounds its corners nor clips its
    // content — otherwise the corner of a checkbox standing in the corner of the row
    // (and its focus ring) gets cut off by `border-radius` + `overflow: clip`.
    await expect(bareRow).toHaveCSS('overflow', 'visible');
    await expect(bareRow).toHaveCSS('border-top-left-radius', '0px');

    // The bordered appearance (boxed) still clips the affixes to the rounded border.
    const boxedRow = page
      .getByTestId('field-email')
      .locator('[data-pct-part="field-row"]');
    await expect(boxedRow).toHaveCSS('overflow', 'clip');
    await expect(boxedRow).toHaveCSS('border-top-left-radius', '8px');
  });
});
