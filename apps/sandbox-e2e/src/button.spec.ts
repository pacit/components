import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

test.describe('PctButton', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/button');
  });

  test('renderuje stronę biblioteki i przyciski', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('@pacit/components');
    await expect(page.locator('button[pctButton]').first()).toBeVisible();
  });

  test('solid button ma tło z tokenu (--pct-button-bg)', async ({ page }) => {
    const bg = await page
      .getByTestId('btn-solid')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    // --pct-primary = blue-600 = #2563eb
    expect(bg).toBe('rgb(37, 99, 235)');
  });

  test('loading pokazuje part=spinner i blokuje przycisk', async ({ page }) => {
    const loading = page.getByTestId('btn-loading');
    await expect(loading).toBeDisabled();
    await expect(loading.locator('[data-pct-part="spinner"]')).toBeVisible();
  });

  test('wyłączony przycisk nie jest przyciemniany opacity', async ({ page }) => {
    // Stany mają własne tokeny koloru — opacity zmieniałoby kontrast
    // w sposób niewidoczny dla bramki (wym-token-12).
    await expect(page.getByTestId('btn-disabled')).toHaveCSS('opacity', '1');
  });
});
