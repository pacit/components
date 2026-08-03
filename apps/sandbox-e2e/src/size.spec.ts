import { expect, test } from '@playwright/test';
import { boxOf, visit } from './support/dom';

/**
 * Wielkość kontrolki jest jedną osią dla całej biblioteki (wym-api-wielkosc): wiersz
 * pola i przycisk tej samej wielkości mają **tę samą** wysokość, bo obie biorą
 * ją z tokenu `--pct-control-height-*`, a nie z sumy paddingu i wysokości linii.
 *
 * Test mierzy realny layout w przeglądarce — jedyny wiarygodny dowód dla styli
 * (lekcja-13); w jsdom nie ma czego mierzyć.
 */
const SIZES = [
  { size: 'sm', height: 28, fontSize: '13px' },
  { size: 'md', height: 36, fontSize: '14px' },
  { size: 'lg', height: 44, fontSize: '16px' },
] as const;

test.describe('Wielkości — wspólna oś pola i przycisku', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/size');
  });

  for (const { size, height, fontSize } of SIZES) {
    test(`pole i przycisk w wielkości ${size} mają tę samą wysokość`, async ({
      page,
    }) => {
      const row = page
        .getByTestId(`size-field-${size}`)
        .locator('[data-pct-part="field-row"]');
      const button = page.getByTestId(`size-button-${size}`);

      const rowBox = await boxOf(row);
      const buttonBox = await boxOf(button);

      expect(rowBox.height).toBeCloseTo(buttonBox.height, 1);
      // Wartość wprost, nie tylko równość: gdyby oba spadły do wysokości linii
      // tekstu, równość nadal by zachodziła, a kontrolki byłyby za niskie.
      expect(rowBox.height).toBe(height);
    });

    test(`pole z listą w wielkości ${size} trzyma tę samą wysokość i rozmiar tekstu`, async ({
      page,
    }) => {
      // Select w obudowie oddaje jej wielkość — inaczej dwa `size` w jednym polu
      // dawałyby ramkę jednej wielkości i tekst innej.
      const field = page.getByTestId(`size-select-${size}`);
      const row = field.locator('[data-pct-part="field-row"]');
      const trigger = field.locator('[data-pct-part="trigger"]');

      expect((await boxOf(row)).height).toBe(height);
      await expect(trigger).toHaveCSS('font-size', fontSize);
    });
  }

  for (const { size, height } of SIZES) {
    test(`pole z dekoracją w wielkości ${size} nie rozpycha wiersza`, async ({
      page,
    }) => {
      // Dekoracja (jednostka w slocie suffix) leży w środku ramki, więc nie ma
      // prawa zmienić jej wysokości — inaczej pole z jednostką odstawałoby
      // od pola bez niej i od przycisku.
      const row = page
        .getByTestId(`size-number-${size}`)
        .locator('[data-pct-part="field-row"]');
      expect((await boxOf(row)).height).toBe(height);
    });
  }

  /**
   * Wariant `bare` (checkbox, grupa radiów) celowo NIE wchodzi na wspólną oś:
   * bez ramki nie ma czego zgrywać z przyciskiem, a wymuszona wysokość
   * dokładałaby tym kontrolkom pustego miejsca (wym-api-wielkosc).
   */
  test('wariant bare nie skaluje wysokości, ale trzyma próg dotyku', async ({
    page,
  }) => {
    for (const { size, height } of SIZES) {
      const bare = page.getByTestId(`size-checkbox-${size}`);
      const row = await boxOf(bare.locator('[data-pct-part="field-row"]'));
      const control = await boxOf(
        bare.locator('[data-pct-part="field-control"]'),
      );

      // Ta sama wysokość niezależnie od wielkości — to `--pct-target-min`,
      // a nie `--pct-control-height-*`.
      expect(row.height).toBe(24);
      expect(control.height).toBeGreaterThanOrEqual(24);

      // Każda wielkość z osi jest wyższa niż próg dotyku (28/36/44 > 24), więc
      // różnica musi być widoczna zawsze — bez warunku w teście.
      const boxed = await boxOf(
        page
          .getByTestId(`size-field-${size}`)
          .locator('[data-pct-part="field-row"]'),
      );
      expect(boxed.height).toBe(height);
      expect(row.height).toBeLessThan(boxed.height);
    }
  });

  test('wielkość skaluje też tekst pola razem z przyciskiem', async ({
    page,
  }) => {
    for (const { size, fontSize } of SIZES) {
      await expect(
        page.getByTestId(`size-field-${size}`).locator('input'),
      ).toHaveCSS('font-size', fontSize);
      await expect(page.getByTestId(`size-button-${size}`)).toHaveCSS(
        'font-size',
        fontSize,
      );
    }
  });

  test('każda wielkość spełnia próg obszaru dotyku (SC 2.5.8)', async ({
    page,
  }) => {
    // Najmniejsza wielkość jest tu progiem: 28 px ramki to 26 px kolumny
    // kontrolki, wciąż powyżej 24 px (wym-a11y-dotyk).
    for (const { size } of SIZES) {
      const control = page
        .getByTestId(`size-field-${size}`)
        .locator('[data-pct-part="field-control"]');
      expect((await boxOf(control)).height).toBeGreaterThanOrEqual(24);
    }
  });
});
