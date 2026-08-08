import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

test.describe('PctButton', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/button');
  });

  test('renders the library page and the buttons', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('@pacit/components');
    await expect(page.locator('button[pctButton]').first()).toBeVisible();
  });

  test('a solid button takes its background from a token (--pct-button-bg)', async ({
    page,
  }) => {
    const bg = await page
      .getByTestId('btn-solid')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    // --pct-primary = blue-600 = #2563eb
    expect(bg).toBe('rgb(37, 99, 235)');
  });

  test('loading shows part=spinner and blocks the button', async ({ page }) => {
    const loading = page.getByTestId('btn-loading');
    await expect(loading).toBeDisabled();
    await expect(loading.locator('[data-pct-part="spinner"]')).toBeVisible();
  });

  test('a disabled button is not dimmed with opacity', async ({ page }) => {
    // The states have colour tokens of their own — opacity would change the
    // contrast in a way the gate cannot see (req-token-no-opacity).
    await expect(page.getByTestId('btn-disabled')).toHaveCSS('opacity', '1');
  });
});
