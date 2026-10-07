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

    await input.fill('this-is-not-an-email');
    await input.press('Tab');

    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute('role', 'alert');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAttribute(
      'aria-describedby',
      new RegExp(await attrOf(error, 'id')),
    );

    // The field border signals the error with a colour from a token: `--pct-danger`, which
    // is red.700 since the tone axis moved it one step down the ramp (0082).
    await expect(field.locator('[data-pct-part="field-row"]')).toHaveCSS(
      'border-color',
      'rgb(185, 28, 28)',
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

  /**
   * A verdict without a veto ([0087](../../../docs/decisions/0087-a-warning-is-a-verdict-without-a-veto.md)):
   * the one message line after the error and before the hint, under the error's own
   * `touched` gate, in the warning tone — the border and the line in `--pct-warning`, which is
   * amber.700 on the light theme — with the glyph before the text and a hidden word for a
   * reader, announced as `status`; and the control is NOT invalid.
   */
  test('a warning takes the line once the field is left, and the field stays valid', async ({
    page,
  }) => {
    const field = page.getByTestId('field-amount');
    const input = field.getByTestId('number-amount');
    const hint = field.locator('[data-pct-part="field-hint"]');
    const warning = field.locator('[data-pct-part="field-warning"]');
    const row = field.locator('[data-pct-part="field-row"]');

    // The model holds a suspect amount already, and the line says nothing until the field
    // is left — the same gate as the error's.
    await expect(hint).toBeVisible();
    await expect(warning).toHaveCount(0);
    await expect(field).not.toHaveAttribute('data-pct-warning');

    await input.click();
    await input.press('Tab');

    await expect(warning).toBeVisible();
    await expect(warning).toHaveAttribute('role', 'status');
    await expect(warning).toContainText('Unusually large');
    await expect(hint).toHaveCount(0);
    await expect(input).toHaveAttribute(
      'aria-describedby',
      await attrOf(warning, 'id'),
    );
    // A verdict without a veto: nothing about the control says invalid.
    await expect(input).not.toHaveAttribute('aria-invalid');
    await expect(field).toHaveAttribute('data-pct-warning', '');
    await expect(field).not.toHaveAttribute('data-pct-invalid');

    // The tone's two channels: the colour on the border and on the line, and the glyph —
    // `--pct-warning` is amber.700 on the light theme (0082).
    await expect(row).toHaveCSS('border-color', 'rgb(180, 83, 9)');
    await expect(warning).toHaveCSS('color', 'rgb(180, 83, 9)');
    await expect(warning.locator('pct-icon svg')).toHaveCount(1);
    await expect(warning.locator('pct-icon')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    // The hidden word opens the sentence for a reader — in the accessible name of the line.
    expect(
      await warning.evaluate((el) =>
        el.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toBe('Warning: Unusually large — it will be reviewed by hand');

    // A value under the line takes the warning away, and the hint is back.
    await input.fill('500');
    await input.press('Tab');
    await expect(warning).toHaveCount(0);
    await expect(hint).toBeVisible();
    await expect(input).toHaveAttribute(
      'aria-describedby',
      await attrOf(hint, 'id'),
    );
  });

  test("the platform's own validator as a warning: required, with the field still valid", async ({
    page,
  }) => {
    const field = page.getByTestId('field-phone');
    const input = field.getByTestId('text-phone');
    const warning = field.locator('[data-pct-part="field-warning"]');

    await expect(warning).toHaveCount(0);
    await input.click();
    await input.press('Tab');

    // `schema(required)` as a warning: the sentence, and no `required` on the control.
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(
      'Without a number we cannot call you back',
    );
    await expect(input).not.toHaveAttribute('aria-invalid');
    await expect(input).not.toHaveAttribute('required');

    await input.fill('+48 600 000 000');
    await input.press('Tab');
    await expect(warning).toHaveCount(0);
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
