import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * Scoped theme na dowolnym poddrzewie (`data-theme` na sekcji), niezależnie od
 * kart sandboxa — te sprawdza `shell.spec.ts`. Tutaj chodzi o sam mechanizm
 * kaskady: warstwa semantyczna i komponentowa muszą przełączyć się razem.
 */
test.describe('Scoped theme — kaskada CSS custom properties', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/all');
  });

  test('panel dark ma inną powierzchnię niż :root, a toggle ją przełącza', async ({
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
    expect(await surfaceOf()).toBe('#ffffff'); // wraca do motywu strony
  });

  /**
   * Regresja: scoped theme musi przethemowywać także tokeny KOMPONENTOWE, nie
   * tylko semantyczne. Custom properties są podstawiane w miejscu deklaracji,
   * więc token komponentowy zadeklarowany w `:root` zamraża jasną wartość —
   * dlatego build emituje w bloku motywu domknięcie przechodnie (lekcja-17).
   */
  test('scoped theme przethemowuje również tokeny komponentowe', async ({
    page,
  }) => {
    const rootButtonBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--pct-button-bg')
        .trim(),
    );
    const scopedButtonBg = await page
      .getByTestId('panel-scoped')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--pct-button-bg').trim(),
      );

    // :root -> primary = blue-600, dark scope -> primary = blue-400. Rampa
    // ciemna siedzi WYŻEJ niż jasna (blue-400, nie blue-500) od A12: `on-primary`
    // jest w niej ciemny, więc hover przyciemniający tło zbijał kontrast etykiety
    // poniżej AA, a ten sam token bywa też tekstem na ciemnej powierzchni.
    expect(rootButtonBg).toBe('#2563eb');
    expect(scopedButtonBg).toBe('#60a5fa');
    expect(scopedButtonBg).not.toBe(rootButtonBg);
  });
});
