import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * Controls integrated with signal forms — several different controls under one
 * schema. The test sits on the "everything at once" view, because it checks what a
 * single-component view cannot show: the state of the whole form.
 */
test.describe('A form — controls under one schema', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/all');
  });

  test('the form turns valid only once every required field is filled', async ({
    page,
  }) => {
    const submit = page.getByTestId('submit');
    await expect(submit).toBeDisabled();

    await page
      .getByTestId('field-email')
      .locator('input')
      .fill('ada@example.com');
    await expect(submit).toBeDisabled(); // no plan and no consent

    await page
      .getByTestId('radio-plan')
      .locator('pct-radio', { hasText: 'Pro' })
      .locator('input')
      .check();
    await expect(submit).toBeDisabled(); // no country and no consent

    await page
      .getByTestId('select-country')
      .locator('[data-pct-part="trigger"]')
      .click();
    await page
      .locator('[data-pct-part="option"]', { hasText: 'Poland' })
      .click();
    await expect(submit).toBeDisabled(); // no consent

    await page.getByTestId('checkbox-terms').locator('input').check();
    await expect(submit).toBeEnabled();
    await expect(page.getByTestId('form-state')).toContainText('valid: yes');
  });
});
