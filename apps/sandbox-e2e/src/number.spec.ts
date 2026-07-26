import { expect, test } from '@playwright/test';
import { boxOf, visit } from './support/dom';

/**
 * Pole liczbowe w prawdziwej przeglądarce: formatowanie wg locale aplikacji
 * (sandbox ustawia `pl-PL`), krokowanie klawiaturą i granice pochodzące
 * z walidatorów signal forms.
 */
test.describe('PctNumber', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/number');
  });

  test('formatuje wartość wg locale aplikacji', async ({ page }) => {
    const price = page.getByTestId('number-price');

    // pl-PL: przecinek dziesiętny, dwa miejsca wymuszone minFractionDigits.
    await expect(price).toHaveValue('1\u00a0499,90');
  });

  test('wpisana liczba zostaje sformatowana po opuszczeniu pola', async ({
    page,
  }) => {
    const price = page.getByTestId('number-price');

    await price.click();
    await price.fill('1234567.5');
    // W trakcie pisania tekst nie jest przepisywany — kursor by skakał.
    await expect(price).toHaveValue('1234567.5');

    await price.blur();
    // Separator tysięcy to spacja nierozdzielająca (U+00A0), nie zwykła.
    await expect(price).toHaveValue('1\u00a0234\u00a0567,50');
  });

  test('przecinek i kropka są równoważne przy wpisywaniu', async ({ page }) => {
    const price = page.getByTestId('number-price');

    await price.fill('12,34');
    await price.blur();
    await expect(price).toHaveValue('12,34');

    // Klawiatura numeryczna daje kropkę niezależnie od ustawień regionalnych.
    await price.fill('12.34');
    await price.blur();
    await expect(price).toHaveValue('12,34');
  });

  test('treść, której nie da się sparsować, jest odrzucana', async ({
    page,
  }) => {
    const price = page.getByTestId('number-price');

    await price.fill('abc');
    await price.blur();
    await expect(price).toHaveValue('');
  });

  test('strzałki zmieniają wartość o step', async ({ page }) => {
    const price = page.getByTestId('number-price');

    await price.click();
    await price.press('ArrowUp');
    // step = 0.5
    await expect(price).toHaveValue('1\u00a0500,40');

    await price.press('ArrowDown');
    await price.press('ArrowDown');
    await expect(price).toHaveValue('1\u00a0499,40');
  });

  test('pole całkowite zaokrągla i nie przyjmuje ułamków', async ({ page }) => {
    const seats = page.getByTestId('number-seats');

    await expect(seats).toHaveAttribute('inputmode', 'numeric');

    await seats.fill('3,7');
    await seats.blur();
    await expect(seats).toHaveValue('4');
  });

  test('granice pochodzą z walidatorów schematu, nie z szablonu', async ({
    page,
  }) => {
    const seats = page.getByTestId('number-seats');

    // W app.html nie ma [min]/[max] — przekazuje je dyrektywa FormField
    // na podstawie min()/max() ze schematu formularza.
    await expect(seats).toHaveAttribute('aria-valuemin', '1');
    await expect(seats).toHaveAttribute('aria-valuemax', '500');

    await seats.fill('9999');
    await seats.blur();
    await expect(seats).toHaveValue('500');

    await seats.fill('0');
    await seats.blur();
    await expect(seats).toHaveValue('1');
  });

  test('jest spinbuttonem z wartością czytaną w postaci sformatowanej', async ({
    page,
  }) => {
    const price = page.getByTestId('number-price');

    await expect(price).toHaveAttribute('role', 'spinbutton');
    await expect(price).toHaveAttribute('aria-valuenow', '1499.9');
    await expect(price).toHaveAttribute('aria-valuetext', '1\u00a0499,90');
  });

  test('etykieta obudowy fokusuje pole, a puste pole nie ma wartości', async ({
    page,
  }) => {
    const field = page.getByTestId('field-price');
    const price = page.getByTestId('number-price');

    await field.locator('[data-pct-part="field-label"]').click();
    await expect(price).toBeFocused();

    await page.getByTestId('field-price-clear').click();
    await expect(price).toHaveValue('');
    // Puste pole to brak wartości, nie zero.
    await expect(price).not.toHaveAttribute('aria-valuenow');
  });

  test('obszar dotyku pola liczbowego spełnia próg SC 2.5.8', async ({
    page,
  }) => {
    const box = await boxOf(page.getByTestId('number-seats'));
    expect(box.height).toBeGreaterThanOrEqual(24);
  });
});
