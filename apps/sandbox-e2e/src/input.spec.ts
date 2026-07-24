import { expect, test } from '@playwright/test';

test.describe('PctInput — signal forms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('etykieta jest powiązana z polem, a podpowiedź opisuje je przez aria-describedby', async ({
    page,
  }) => {
    const field = page.getByTestId('input-email');
    const input = field.locator('input');

    // Powiązanie label -> input (klik w etykietę fokusuje pole).
    await field.locator('[data-pct-part="label"]').click();
    await expect(input).toBeFocused();

    const hintId = await field
      .locator('[data-pct-part="hint"]')
      .getAttribute('id');
    await expect(input).toHaveAttribute('aria-describedby', hintId!);
  });

  test('błąd walidacji pojawia się dopiero po opuszczeniu pola i znika po poprawieniu', async ({
    page,
  }) => {
    const field = page.getByTestId('input-email');
    const input = field.locator('input');
    const error = field.locator('[data-pct-part="error"]');

    // Pole nietknięte — brak błędu mimo pustej, wymaganej wartości.
    await expect(error).toHaveCount(0);
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');

    // Niepoprawna wartość + blur (Tab) -> komunikat i aria-invalid.
    await input.fill('to-nie-jest-email');
    await input.press('Tab');
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute('role', 'alert');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('submit')).toBeDisabled();

    // Poprawna wartość -> błąd znika (stan przycisku zależy od całego
    // formularza, w tym od zgody — sprawdzany w checkbox.spec.ts).
    await input.fill('marek@pacit.pl');
    await expect(error).toHaveCount(0);
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('obramowanie pola spełnia kontrast SC 1.4.11 (min 3:1)', async ({
    page,
  }) => {
    const input = page.getByTestId('input-email').locator('input');

    const ratio = await input.evaluate((el) => {
      const cs = getComputedStyle(el);
      const parse = (s: string) =>
        (s.match(/\d+\.?\d*/g) ?? []).map(Number).slice(0, 3);
      const lum = ([r, g, b]: number[]) => {
        const f = (c: number) => {
          c /= 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const a = lum(parse(cs.borderColor));
      const b = lum(parse(cs.backgroundColor));
      const [hi, lo] = a > b ? [a, b] : [b, a];
      return (hi + 0.05) / (lo + 0.05);
    });

    expect(ratio).toBeGreaterThanOrEqual(3);
  });
});
