import { expect, test } from '@playwright/test';
import { boxOf, visit } from './support/dom';

/**
 * The number field in a real browser: formatting by the application locale (the
 * sandbox sets `pl-PL`), stepping from the keyboard, and bounds that come from the
 * signal forms validators.
 */
test.describe('PctNumber', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/number');
  });

  test('formats the value by the application locale', async ({ page }) => {
    const price = page.getByTestId('number-price');

    // pl-PL: a decimal comma, two places forced by minFractionDigits.
    await expect(price).toHaveValue('1\u00a0499,90');
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
    // The thousands separator is a non-breaking space (U+00A0), not an ordinary one.
    await expect(price).toHaveValue('1\u00a0234\u00a0567,50');
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

  test('content that cannot be parsed is rejected', async ({ page }) => {
    const price = page.getByTestId('number-price');

    await price.fill('abc');
    await price.blur();
    await expect(price).toHaveValue('');
  });

  test('the arrows change the value by step', async ({ page }) => {
    const price = page.getByTestId('number-price');

    await price.click();
    await price.press('ArrowUp');
    // step = 0.5
    await expect(price).toHaveValue('1\u00a0500,40');

    await price.press('ArrowDown');
    await price.press('ArrowDown');
    await expect(price).toHaveValue('1\u00a0499,40');
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

    // W app.html nie ma [min]/[max] — przekazuje je dyrektywa FormField
    // na podstawie min()/max() ze schematu formularza.
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
    await expect(price).toHaveAttribute('aria-valuetext', '1\u00a0499,90');
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
