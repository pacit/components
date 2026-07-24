import { expect, test } from '@playwright/test';

test.describe('PctCheckbox — signal forms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('kliknięcie w etykietę przełącza stan i maluje pudełko kolorem z tokenu', async ({
    page,
  }) => {
    const field = page.getByTestId('checkbox-terms');
    const control = field.locator('input');
    const box = field.locator('[data-pct-part="box"]');
    const mark = field.locator('[data-pct-part="mark"]');

    await expect(control).not.toBeChecked();
    await expect(mark).toBeHidden();
    await expect(box).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    // Kliknięcie w etykietę musi działać (powiązanie for/id).
    await field.locator('[data-pct-part="label"]').click();

    await expect(control).toBeChecked();
    await expect(control).toHaveAttribute('aria-checked', 'true');
    await expect(mark).toBeVisible();
    // --pct-checkbox-checked-bg -> --pct-primary -> blue-600
    await expect(box).toHaveCSS('background-color', 'rgb(37, 99, 235)');
  });

  test('stan nieokreślony ma aria-checked="mixed"', async ({ page }) => {
    const control = page.getByTestId('checkbox-mixed').locator('input');

    await expect(control).toHaveAttribute('aria-checked', 'mixed');
    expect(
      await control.evaluate((el: HTMLInputElement) => el.indeterminate),
    ).toBe(true);
  });

  test('obsługa klawiatury: spacja przełącza zaznaczenie', async ({ page }) => {
    const control = page.getByTestId('checkbox-terms').locator('input');

    await control.focus();
    await expect(control).toBeFocused();

    await page.keyboard.press('Space');
    await expect(control).toBeChecked();

    await page.keyboard.press('Space');
    await expect(control).not.toBeChecked();
  });

  test('formularz staje się poprawny dopiero po e-mailu i zgodzie', async ({
    page,
  }) => {
    const submit = page.getByTestId('submit');
    await expect(submit).toBeDisabled();

    await page
      .getByTestId('input-email')
      .locator('input')
      .fill('marek@pacit.pl');
    await expect(submit).toBeDisabled(); // brak zgody

    await page.getByTestId('checkbox-terms').locator('input').check();
    await expect(submit).toBeEnabled();
    await expect(page.getByTestId('form-state')).toContainText('poprawny: tak');
  });
});
