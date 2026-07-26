import { expect, test } from '@playwright/test';
import { attrOf, visit } from './support/dom';

test.describe('PctField — obudowa pola', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/field');
  });

  test('etykieta obudowy wskazuje kontrolkę w środku (przez granicę projekcji)', async ({
    page,
  }) => {
    const field = page.getByTestId('field-email');
    const input = field.locator('input');

    await field.locator('[data-pct-part="field-label"]').click();
    await expect(input).toBeFocused();

    const hintId = await attrOf(
      field.locator('[data-pct-part="field-hint"]'),
      'id',
    );
    await expect(input).toHaveAttribute('aria-describedby', hintId);
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

    await expect(input).toHaveValue('1\u00a0499,90');
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
      new RegExp(await attrOf(error, 'id')),
    );

    // Ramka pola sygnalizuje błąd kolorem z tokenu.
    await expect(field.locator('[data-pct-part="field-row"]')).toHaveCSS(
      'border-color',
      'rgb(220, 38, 38)',
    );
  });

  test('pod polem jest jedna linia: błąd zastępuje podpowiedź', async ({
    page,
  }) => {
    const field = page.getByTestId('field-bio');
    const input = field.getByTestId('bio-input');
    const hint = field.locator('[data-pct-part="field-hint"]');
    const error = field.locator('[data-pct-part="field-error"]');

    // Na starcie widać podpowiedź, nie ma błędu.
    await expect(hint).toBeVisible();
    await expect(error).toHaveCount(0);
    await expect(input).toHaveAttribute(
      'aria-describedby',
      await attrOf(hint, 'id'),
    );

    // Za krótki opis + opuszczenie pola: błąd wchodzi na miejsce podpowiedzi.
    await input.fill('krótko');
    await input.press('Tab');

    await expect(error).toBeVisible();
    await expect(hint).toHaveCount(0);
    // describedby wskazuje wyłącznie widoczny komunikat (bez wiszącego id podpowiedzi).
    await expect(input).toHaveAttribute(
      'aria-describedby',
      await attrOf(error, 'id'),
    );
  });

  test('sloty poboczne: ikona przy etykiecie i licznik znaków', async ({
    page,
  }) => {
    const field = page.getByTestId('field-bio');
    const header = field.locator('[data-pct-part="field-header"]');
    const footer = field.locator('[data-pct-part="field-footer"]');
    const counter = field.getByTestId('bio-counter');

    // Dodatek etykiety leży w wierszu etykiety, po prawej.
    await expect(
      header.locator('[data-pct-part="field-label-aux"] button'),
    ).toHaveAttribute('aria-label', /profilu/);

    // Licznik leży w wierszu komunikatu i liczy wpisane znaki.
    await expect(footer.locator('[data-pct-part="field-message-aux"]')).toHaveCount(
      1,
    );
    await expect(counter).toHaveText('0/120');
    await field.getByTestId('bio-input').fill('dwanaście!!!');
    await expect(counter).toHaveText('12/120');
  });

  test('kontrolka bez ramki (bare) nie ma ściętego rogu', async ({ page }) => {
    const bareRow = page
      .getByTestId('field-bare-checkbox')
      .locator('[data-pct-part="field-row"]');

    // Bez widocznej ramki wiersz nie zaokrągla rogów ani nie przycina zawartości —
    // inaczej róg checkboxa stojącego w rogu wiersza (i jego pierścień fokusu)
    // zostaje ścięty przez `border-radius` + `overflow: clip`.
    await expect(bareRow).toHaveCSS('overflow', 'visible');
    await expect(bareRow).toHaveCSS('border-top-left-radius', '0px');

    // Wariant z ramką (boxed) nadal przycina dekoracje do zaokrąglonej ramki.
    const boxedRow = page
      .getByTestId('field-email')
      .locator('[data-pct-part="field-row"]');
    await expect(boxedRow).toHaveCSS('overflow', 'clip');
    await expect(boxedRow).toHaveCSS('border-top-left-radius', '8px');
  });
});
