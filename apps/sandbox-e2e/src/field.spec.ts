import { expect, test } from '@playwright/test';

test.describe('PctField — obudowa pola', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('etykieta obudowy wskazuje kontrolkę w środku (przez granicę projekcji)', async ({
    page,
  }) => {
    const field = page.getByTestId('field-email');
    const input = field.locator('input');

    await field.locator('[data-pct-part="field-label"]').click();
    await expect(input).toBeFocused();

    const hintId = await field
      .locator('[data-pct-part="field-hint"]')
      .getAttribute('id');
    await expect(input).toHaveAttribute('aria-describedby', hintId!);
  });

  test('dekoracje są w środku ramki, w kolejności prefix → pole → suffix', async ({
    page,
  }) => {
    const row = page
      .getByTestId('field-price')
      .locator('[data-pct-part="field-row"]');
    const parts = await row
      .locator('> *')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-pct-part')));
    expect(parts).toEqual(['field-prefix', 'field-control', 'field-suffix']);

    // Ramka należy do rzędu, kontrolka jest przezroczysta i bez obramowania.
    await expect(row).toHaveCSS('border-width', '1px');
    await expect(page.getByTestId('field-price').locator('input')).toHaveCSS(
      'border-width',
      '0px',
    );
  });

  /**
   * Focus ring rysuje obudowa na całym rzędzie — także gdy fokus trafi na
   * przycisk w slocie suffix. Programowy .focus() nie wywołuje :focus-visible,
   * dlatego test używa realnej nawigacji klawiaturą.
   */
  test('fokus wewnątrz pola podświetla całą ramkę, również z przycisku w suffiksie', async ({
    page,
  }) => {
    const field = page.getByTestId('field-price');
    const row = field.locator('[data-pct-part="field-row"]');
    const input = field.locator('input');

    const ringWidth = () =>
      row.evaluate((el) => getComputedStyle(el).outlineWidth);

    // Klik w pole tekstowe daje :focus-visible (przeglądarki stosują je dla
    // elementów przyjmujących tekst), więc nie polegamy na globalnej
    // kolejności Taba, która zmienia się wraz z układem strony.
    await input.click();
    await expect(input).toBeFocused();
    expect(await ringWidth()).toBe('2px');

    // Kolejny Tab przenosi fokus na przycisk w slocie — ramka nadal podświetlona.
    await page.keyboard.press('Tab');
    await expect(field.getByTestId('field-price-clear')).toBeFocused();
    expect(await ringWidth()).toBe('2px');
  });

  test('przycisk w slocie suffix czyści wartość', async ({ page }) => {
    const field = page.getByTestId('field-price');
    const input = field.locator('input');

    await expect(input).toHaveValue('1499');
    await field.getByTestId('field-price-clear').click();
    await expect(input).toHaveValue('');
  });

  test('błąd walidacji renderuje obudowa i wiąże go z kontrolką', async ({
    page,
  }) => {
    const field = page.getByTestId('field-email');
    const input = field.locator('input');
    const error = field.locator('[data-pct-part="field-error"]');

    await expect(error).toHaveCount(0);

    await input.fill('to-nie-email');
    await input.press('Tab');

    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute('role', 'alert');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAttribute(
      'aria-describedby',
      new RegExp((await error.getAttribute('id'))!),
    );

    // Ramka pola sygnalizuje błąd kolorem z tokenu.
    await expect(field.locator('[data-pct-part="field-row"]')).toHaveCSS(
      'border-color',
      'rgb(220, 38, 38)',
    );
  });
});
