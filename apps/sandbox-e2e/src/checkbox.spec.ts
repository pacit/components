import { expect, test } from '@playwright/test';
import { boxOf, visit } from './support/dom';

test.describe('PctCheckbox — signal forms', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/checkbox');
  });

  test('a click on the label toggles the state and paints the box from a token', async ({
    page,
  }) => {
    const field = page.getByTestId('checkbox-terms');
    const control = field.locator('input');
    const box = field.locator('[data-pct-part="box"]');
    const mark = field.locator('[data-pct-part="mark"]');
    // Inside the wrapper it is pct-field that renders the label.
    const label = page
      .getByTestId('field-terms')
      .locator('[data-pct-part="field-label"]');

    await expect(control).not.toBeChecked();
    await expect(mark).toBeHidden();
    await expect(box).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    // A click on the label has to work (the for/id binding).
    await label.click();

    await expect(control).toBeChecked();
    await expect(control).toHaveAttribute('aria-checked', 'true');
    await expect(mark).toBeVisible();
    // --pct-checkbox-bg-checked -> --pct-primary -> blue-600
    await expect(box).toHaveCSS('background-color', 'rgb(37, 99, 235)');
  });

  test('the indeterminate state has aria-checked="mixed"', async ({ page }) => {
    const control = page.getByTestId('checkbox-mixed').locator('input');

    await expect(control).toHaveAttribute('aria-checked', 'mixed');
    expect(
      await control.evaluate((el: HTMLInputElement) => el.indeterminate),
    ).toBe(true);
  });

  test('the clickable area is at least 24x24 px (WCAG 2.2 SC 2.5.8)', async ({
    page,
  }) => {
    const field = page.getByTestId('checkbox-terms');
    const control = field.locator('input');
    const box = field.locator('[data-pct-part="box"]');

    const hit = await boxOf(control);
    const visual = await boxOf(box);

    // The requirement is met directly, not through the spacing exception.
    expect(hit.width).toBeGreaterThanOrEqual(24);
    expect(hit.height).toBeGreaterThanOrEqual(24);

    // The visual box stays small — the touch area is independent of it.
    expect(visual.width).toBeLessThan(24);

    // The clickable area is centred on the box (a 1 px tolerance).
    const srodek = (b: { x: number; width: number }) => b.x + b.width / 2;
    expect(Math.abs(srodek(hit) - srodek(visual))).toBeLessThanOrEqual(1);
  });

  test('the enlarged touch area does not hijack clicks on the label', async ({
    page,
  }) => {
    const field = page.getByTestId('checkbox-mixed');
    // A click on the label text has to hit the label, not the input beside it.
    await field.locator('[data-pct-part="label"]').click();
    await expect(field.locator('input')).toBeChecked();
  });

  test('keyboard support: space toggles the checked state', async ({
    page,
  }) => {
    const control = page.getByTestId('checkbox-terms').locator('input');

    await control.focus();
    await expect(control).toBeFocused();

    await page.keyboard.press('Space');
    await expect(control).toBeChecked();

    await page.keyboard.press('Space');
    await expect(control).not.toBeChecked();
  });
});
