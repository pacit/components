import { expect, test } from '@playwright/test';
import { boxOf, visit } from './support/dom';

/**
 * The number field in a real browser: formatting by the application locale (the
 * sandbox sets `fr-FR`), stepping from the keyboard, and bounds that come from the
 * signal forms validators.
 */
test.describe('PctNumber', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/number');
  });

  test('formats the value by the application locale', async ({ page }) => {
    const price = page.getByTestId('number-price');

    // fr-FR: a decimal comma, two places forced by minFractionDigits.
    await expect(price).toHaveValue('1\u202f499,90');
  });

  test('a typed number gets formatted once the field is left', async ({
    page,
  }) => {
    const price = page.getByTestId('number-price');

    await price.click();
    await price.fill('1234567.5');
    // While typing the text is not rewritten — the caret would jump.
    await expect(price).toHaveValue('1234567.5');

    await price.blur();
    // The thousands separator is a narrow no-break space (U+202F), not an ordinary one.
    await expect(price).toHaveValue('1\u202f234\u202f567,50');
  });

  test('a comma and a dot are equivalent while typing', async ({ page }) => {
    const price = page.getByTestId('number-price');

    await price.fill('12,34');
    await price.blur();
    await expect(price).toHaveValue('12,34');

    // The numeric keypad gives a dot whatever the regional settings.
    await price.fill('12.34');
    await price.blur();
    await expect(price).toHaveValue('12,34');
  });

  /**
   * Rejected and KEPT (0070): the value is empty, the text stays, and the wrapper's message
   * line says what it is not — the control's own sentence, in the application's language.
   * The field used to clear the text, which is `<input type="number">`'s own failing.
   */
  test('content that cannot be parsed is rejected, kept and named', async ({
    page,
  }) => {
    const price = page.getByTestId('number-price');
    const error = page
      .getByTestId('field-price')
      .locator('[data-pct-part="field-error"]');

    await price.fill('abc');
    await price.blur();
    await expect(price).toHaveValue('abc');
    await expect(price).toHaveAttribute('aria-invalid', 'true');
    await expect(error).toHaveText('Pas un nombre');

    await price.fill('12');
    await price.blur();
    await expect(price).toHaveValue('12,00');
    await expect(error).toHaveCount(0);
  });

  test('the arrows change the value by step', async ({ page }) => {
    const price = page.getByTestId('number-price');

    await price.click();
    await price.press('ArrowUp');
    // step = 0.5
    await expect(price).toHaveValue('1\u202f500,40');

    await price.press('ArrowDown');
    await price.press('ArrowDown');
    await expect(price).toHaveValue('1\u202f499,40');
  });

  test('an integer field rounds and takes no fractions', async ({ page }) => {
    const seats = page.getByTestId('number-seats');

    await expect(seats).toHaveAttribute('inputmode', 'numeric');

    await seats.fill('3,7');
    await seats.blur();
    await expect(seats).toHaveValue('4');
  });

  test('the bounds come from the schema validators, not from the template', async ({
    page,
  }) => {
    const seats = page.getByTestId('number-seats');

    // There is no [min]/[max] in the template — the FormField directive passes them
    // from the min()/max() validators of the form schema.
    await expect(seats).toHaveAttribute('aria-valuemin', '1');
    await expect(seats).toHaveAttribute('aria-valuemax', '500');

    await seats.fill('9999');
    await seats.blur();
    await expect(seats).toHaveValue('500');

    await seats.fill('0');
    await seats.blur();
    await expect(seats).toHaveValue('1');
  });

  test('it is a spinbutton whose value is read out in its formatted form', async ({
    page,
  }) => {
    const price = page.getByTestId('number-price');

    await expect(price).toHaveAttribute('role', 'spinbutton');
    await expect(price).toHaveAttribute('aria-valuenow', '1499.9');
    await expect(price).toHaveAttribute('aria-valuetext', '1\u202f499,90');
  });

  test('the wrapper label focuses the field, and an empty field has no value', async ({
    page,
  }) => {
    const field = page.getByTestId('field-price');
    const price = page.getByTestId('number-price');

    await field.locator('[data-pct-part="field-label"]').click();
    await expect(price).toBeFocused();

    await page.getByTestId('field-price-clear').click();
    await expect(price).toHaveValue('');
    // An empty field is no value, not zero.
    await expect(price).not.toHaveAttribute('aria-valuenow');
  });

  test('the touch area of the number field meets the SC 2.5.8 threshold', async ({
    page,
  }) => {
    const box = await boxOf(page.getByTestId('number-seats'));
    expect(box.height).toBeGreaterThanOrEqual(24);
  });
});
