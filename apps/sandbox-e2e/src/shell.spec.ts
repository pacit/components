import { expect, test } from '@playwright/test';
import { visit } from './support/dom';
import { SBX_ROUTES } from './support/views';

/**
 * Powłoka sandboxa i karta demonstracyjna (`sbx-demo`). Sprawdzane w
 * przeglądarce, bo cała rzecz stoi na kaskadzie CSS custom properties —
 * jsdom nie odpowie, jaką wartość ma token w danym poddrzewie (lekcja-13).
 */
test.describe('Powłoka sandboxa i karta demonstracyjna', () => {
  const stage = (testid: string) =>
    `[data-testid="${testid}"] [data-testid="demo-stage"]`;

  test('nawigacja przełącza widok i tytuł dokumentu', async ({ page }) => {
    await visit(page);
    await expect(page.getByTestId('index-button')).toBeVisible();

    await page.getByTestId('nav-button').click();
    await expect(page).toHaveURL(/\/button$/);
    await expect(page).toHaveTitle(/^Button ·/);
    await expect(page.getByTestId('demo-variants')).toBeVisible();
  });

  /**
   * Lista tras w `support/views.ts` jest kopią rejestru widoków aplikacji —
   * ten test pilnuje, żeby kopia nie odstawała. Bez niego widok dodany
   * w aplikacji, a pominięty w liście, po cichu traciłby audyt a11y.
   */
  test('nawigacja odpowiada dokładnie liście tras używanej przez testy', async ({
    page,
  }) => {
    await visit(page);
    const hrefs = await page
      .locator('.shell__nav a')
      .evaluateAll((els) =>
        els.map((el) => new URL((el as HTMLAnchorElement).href).pathname),
      );
    expect(hrefs.sort()).toEqual([...SBX_ROUTES].sort());
  });

  test('strona wejściowa linkuje do każdego widoku poza sobą', async ({
    page,
  }) => {
    await visit(page);
    const cards = page.locator('.index__card');
    await expect(cards).toHaveCount(SBX_ROUTES.length - 1);
  });

  test('globalny przełącznik motywu przethemowuje powłokę, nie :root', async ({
    page,
  }) => {
    await visit(page, '/button');

    const rootSurface = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--pct-surface')
          .trim(),
      );
    const shellSurface = () =>
      page
        .locator('app-root')
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue('--pct-surface').trim(),
        );

    expect(await shellSurface()).toBe('#ffffff');

    await page
      .getByTestId('global-controls')
      .getByTestId('control-scheme')
      .getByRole('radio', { name: 'ciemny' })
      .check();

    expect(await shellSurface()).toBe('#0f172a');
    // `:root` zostaje punktem odniesienia — motyw strony to scoped theme.
    expect(await rootSurface()).toBe('#ffffff');
  });

  /**
   * Regresja na blok `[data-theme="light"]`: dopóki build emitował tylko dark,
   * „jasny" był wyłącznie brakiem atrybutu, więc jasna karta wewnątrz ciemnej
   * strony dziedziczyła ciemne wartości i nie miała czym ich cofnąć.
   */
  test('jasna karta wewnątrz ciemnej strony wraca do wartości jasnych', async ({
    page,
  }) => {
    await visit(page, '/button');
    await page
      .getByTestId('global-controls')
      .getByTestId('control-scheme')
      .getByRole('radio', { name: 'ciemny' })
      .check();

    const surfaceOf = (testid: string) =>
      page
        .locator(stage(testid))
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue('--pct-surface').trim(),
        );

    expect(await surfaceOf('demo-dark')).toBe('#0f172a');
    expect(await surfaceOf('demo-light')).toBe('#ffffff');

    // Token KOMPONENTOWY też musi się cofnąć, nie tylko semantyczny
    // (domknięcie przechodnie nadpisań, wym-token-domkniecie).
    const buttonBg = await page
      .locator(`${stage('demo-light')} button[pctButton]`)
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(buttonBg).toBe('rgb(37, 99, 235)'); // blue-600 = motyw jasny
  });

  test('karta idzie za osią globalną, dopóki nie ma własnego ustawienia', async ({
    page,
  }) => {
    await visit(page, '/button');
    const solid = page.getByTestId('btn-solid');

    await expect(solid).toHaveAttribute('data-pct-size', 'md');

    await page
      .getByTestId('global-controls')
      .getByTestId('control-size')
      .getByRole('radio', { name: 'lg' })
      .check();
    await expect(solid).toHaveAttribute('data-pct-size', 'lg');

    // Pasek karty wygrywa z ustawieniem globalnym.
    await page
      .getByTestId('demo-variants')
      .getByTestId('control-size')
      .getByRole('radio', { name: 'sm' })
      .check();
    await expect(solid).toHaveAttribute('data-pct-size', 'sm');

    // Karta z własną osią wielkości w treści nie daje jej przestawiać.
    await expect(
      page.getByTestId('demo-sizes').getByTestId('control-size'),
    ).toHaveCount(0);
  });
});
