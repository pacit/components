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

  test('obszar klikalny ma minimum 24x24 px (WCAG 2.2 SC 2.5.8)', async ({
    page,
  }) => {
    const field = page.getByTestId('checkbox-terms');
    const control = field.locator('input');
    const box = field.locator('[data-pct-part="box"]');

    const hit = await control.boundingBox();
    const visual = await box.boundingBox();

    // Wymóg spełniony wprost, nie przez wyjątek odstępu.
    expect(hit!.width).toBeGreaterThanOrEqual(24);
    expect(hit!.height).toBeGreaterThanOrEqual(24);

    // Wizualne pudełko pozostaje małe — obszar dotyku jest od niego niezależny.
    expect(visual!.width).toBeLessThan(24);

    // Obszar klikalny jest wyśrodkowany na pudełku (tolerancja 1 px).
    const srodek = (b: { x: number; width: number }) => b.x + b.width / 2;
    expect(Math.abs(srodek(hit!) - srodek(visual!))).toBeLessThanOrEqual(1);
  });

  test('powiększony obszar dotyku nie przechwytuje kliknięć etykiety', async ({
    page,
  }) => {
    const field = page.getByTestId('checkbox-mixed');
    // Kliknięcie w tekst etykiety musi trafić w etykietę, nie w input obok.
    await field.locator('[data-pct-part="label"]').click();
    await expect(field.locator('input')).toBeChecked();
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

  test('formularz staje się poprawny dopiero po wypełnieniu wszystkich wymaganych pól', async ({
    page,
  }) => {
    const submit = page.getByTestId('submit');
    await expect(submit).toBeDisabled();

    await page
      .getByTestId('input-email')
      .locator('input')
      .fill('marek@pacit.pl');
    await expect(submit).toBeDisabled(); // brak planu i zgody

    await page
      .getByTestId('radio-plan')
      .locator('pct-radio', { hasText: 'Pro' })
      .locator('input')
      .check();
    await expect(submit).toBeDisabled(); // brak kraju i zgody

    await page
      .getByTestId('select-country')
      .locator('[data-pct-part="trigger"]')
      .click();
    await page
      .locator('[data-pct-part="option"]', { hasText: 'Polska' })
      .click();
    await expect(submit).toBeDisabled(); // brak zgody

    await page.getByTestId('checkbox-terms').locator('input').check();
    await expect(submit).toBeEnabled();
    await expect(page.getByTestId('form-state')).toContainText('poprawny: tak');
  });
});
