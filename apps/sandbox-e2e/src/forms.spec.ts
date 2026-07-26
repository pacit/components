import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * Integracja kontrolek z signal forms — kilka różnych kontrolek pod jednym
 * schematem. Test siedzi na widoku „wszystko naraz", bo sprawdza to, czego nie
 * widać w widoku pojedynczego komponentu: stan całego formularza.
 */
test.describe('Formularz — kontrolki pod jednym schematem', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/all');
  });

  test('formularz staje się poprawny dopiero po wypełnieniu wszystkich wymaganych pól', async ({
    page,
  }) => {
    const submit = page.getByTestId('submit');
    await expect(submit).toBeDisabled();

    await page
      .getByTestId('field-email')
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
