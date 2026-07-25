import { test, expect } from '@playwright/test';

test.describe('PctButton — sandbox', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renderuje stronę biblioteki i przyciski', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('@pacit/components');
    await expect(page.locator('button[pct-button]').first()).toBeVisible();
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

  test('scoped theme: panel dark ma inną powierzchnię niż :root, a toggle ją przełącza', async ({
    page,
  }) => {
    const rootSurface = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--pct-surface')
        .trim(),
    );
    expect(rootSurface).toBe('#ffffff');

    const panel = page.getByTestId('panel-scoped');
    await expect(panel).toHaveAttribute('data-theme', 'dark');

    const surfaceOf = () =>
      panel.evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--pct-surface').trim(),
      );

    expect(await surfaceOf()).toBe('#0f172a'); // dark scope nadpisuje kaskadą

    await page.getByTestId('toggle').click();
    await expect(panel).not.toHaveAttribute('data-theme', 'dark');
    expect(await surfaceOf()).toBe('#ffffff'); // wraca do :root
  });

  /**
   * Regresja: scoped theme musi przethemowywać także tokeny KOMPONENTOWE, nie
   * tylko semantyczne. Custom properties są podstawiane w miejscu deklaracji,
   * więc token komponentowy zadeklarowany w `:root` zamraża jasną wartość —
   * dlatego build emituje w bloku motywu domknięcie przechodnie (wym-real-17).
   */
  test('scoped theme przethemowuje również tokeny komponentowe', async ({
    page,
  }) => {
    const tokenAt = (selector: string, token: string) =>
      page
        .locator(selector)
        .evaluate(
          (el, t) => getComputedStyle(el).getPropertyValue(t).trim(),
          token,
        );

    const rootButtonBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--pct-button-bg')
        .trim(),
    );
    const scopedButtonBg = await tokenAt(
      '[data-testid="panel-scoped"]',
      '--pct-button-bg',
    );

    // :root -> primary = blue-600, dark scope -> primary = blue-500
    expect(rootButtonBg).toBe('#2563eb');
    expect(scopedButtonBg).toBe('#3b82f6');
    expect(scopedButtonBg).not.toBe(rootButtonBg);
  });
});
