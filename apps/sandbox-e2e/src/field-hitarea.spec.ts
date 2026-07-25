import { expect, test } from '@playwright/test';

/**
 * Regresja: padding ramki i wyśrodkowanie w pionie tworzyły „martwą strefę" —
 * kursor był wewnątrz pola, ale kliknięcie nie ustawiało fokusu. Testy klikają
 * w konkretne punkty tej strefy, liczone z realnego layoutu.
 */
test.describe('PctField — obszar klikalny bez martwej strefy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('kliknięcie w lewy padding ramki fokusuje pole', async ({ page }) => {
    const field = page.getByTestId('field-price');
    const row = field.locator('[data-pct-part="row"]');
    const input = field.locator('input');

    // mouse.click() używa współrzędnych widoku i sam nie przewija — inaczej
    // klik trafia poza ekran, w <html>.
    await row.scrollIntoViewIfNeeded();
    const box = (await row.boundingBox())!;
    // 3 px od lewej krawędzi — obszar paddingu, przed dekoracją prefix.
    await page.mouse.click(box.x + 3, box.y + box.height / 2);

    await expect(input).toBeFocused();
  });

  test('kliknięcie u góry i u dołu ramki fokusuje pole', async ({ page }) => {
    const field = page.getByTestId('field-price');
    const row = field.locator('[data-pct-part="row"]');
    const input = field.locator('input');

    await row.scrollIntoViewIfNeeded();
    const box = (await row.boundingBox())!;
    const middleX = box.x + box.width / 2;

    await page.mouse.click(middleX, box.y + 3);
    await expect(input).toBeFocused();

    await input.blur();
    await page.mouse.click(middleX, box.y + box.height - 3);
    await expect(input).toBeFocused();
  });

  test('kliknięcie w dekorację prefix fokusuje pole', async ({ page }) => {
    const field = page.getByTestId('field-price');
    const input = field.locator('input');

    await field.locator('[data-pct-part="prefix"]').click();
    await expect(input).toBeFocused();
  });

  test('kontrolka wypełnia wysokość rzędu, gdy w slocie jest wyższy przycisk', async ({
    page,
  }) => {
    const field = page.getByTestId('field-price');
    const rowBox = (await field
      .locator('[data-pct-part="row"]')
      .boundingBox())!;
    const controlBox = (await field
      .locator('[data-pct-part="control"]')
      .boundingBox())!;

    // Kolumna kontrolki obejmuje całą wysokość wnętrza rzędu (bez paddingu).
    const paddingY = 2 * 8; // --pct-field-padding-y = space-3 = 8px
    expect(controlBox.height).toBeGreaterThanOrEqual(
      rowBox.height - paddingY - 2,
    );
  });

  test('kliknięcie w przycisk slotu nie przenosi fokusu na pole', async ({
    page,
  }) => {
    const field = page.getByTestId('field-price');
    const clear = field.getByTestId('field-price-clear');

    await clear.click();
    await expect(field.locator('input')).not.toBeFocused();
  });

  test('cała ramka pokazuje kursor tekstowy', async ({ page }) => {
    await expect(
      page.getByTestId('field-price').locator('[data-pct-part="row"]'),
    ).toHaveCSS('cursor', 'text');
  });
});
