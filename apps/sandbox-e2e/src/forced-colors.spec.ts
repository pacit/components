import { expect, Page, test } from '@playwright/test';
import { visit } from './support/dom';
import { styleOf, systemColors } from './support/css';

/**
 * Tryb wymuszonych kolorów (Windows High Contrast, `forced-colors: active`).
 *
 * W tym trybie przeglądarka podmienia KAŻDY kolor autora na kolor z palety
 * użytkownika. Tokeny przestają cokolwiek znaczyć, a każdy stan wyrażony
 * wyłącznie kolorem znika: dwa różne tła stają się tym samym prostokątem.
 * Testy nie sprawdzają więc, „jaki jest kolor" — sprawdzają, czy stany, które
 * mają się od siebie różnić, nadal się różnią, i czy to, co ma być z palety,
 * faktycznie z niej pochodzi (wym-a11y-kolory-wymuszone).
 *
 * Emulacja przez `visit(page, path, { media })` — powód w `support/dom.ts`.
 */

const FORCED = { forcedColors: 'active' } as const;

/** Kolor tła / pisma elementu, wyliczony przez przeglądarkę. */
const bg = (page: Page, sel: string) =>
  styleOf(page.locator(sel).first(), 'background-color');

test.describe('forced-colors: active', () => {
  /**
   * Kontrola bramki. Sam fakt, że media query się zapala, nie dowodzi jeszcze,
   * że przeglądarka realnie podmienia kolory — a jeśli nie podmienia, wszystkie
   * poniższe testy przechodzą na kolorach z tokenów i nie badają niczego.
   * Punktem odniesienia jest element BEZ reguł forced-colors: jego kolor musi
   * przestać być kolorem z palety biblioteki.
   */
  test('emulacja naprawdę podmienia kolory autora (kontrola bramki)', async ({
    page,
  }) => {
    await visit(page, '/states');
    const tokenowy = await styleOf(
      page.getByTestId('idle-button'),
      'background-color',
    );
    expect(tokenowy).toBe('rgb(37, 99, 235)'); // --pct-primary, motyw jasny

    await visit(page, '/states', { media: FORCED });
    expect(
      await page.evaluate(() => matchMedia('(forced-colors: active)').matches),
    ).toBe(true);

    const wymuszony = await styleOf(
      page.getByTestId('idle-button'),
      'background-color',
    );
    expect(wymuszony).not.toBe(tokenowy);
  });

  test('pierścień fokusu rysuje się kolorem Highlight, nie kolorem ramki', async ({
    page,
  }) => {
    await visit(page, '/states', { media: FORCED });
    const sys = await systemColors(page);

    const input = page.getByTestId('idle-text');
    await input.focus();

    const row = page
      .getByTestId('states-idle')
      .locator('[data-pct-part="field-row"]')
      .first();
    // Bez jawnej reguły pierścień dostaje wymuszony kolor obramowania i zlewa
    // się z ramką pola — znika dokładnie tam, gdzie jest najpotrzebniejszy.
    expect(await styleOf(row, 'outline-color')).toBe(sys.Highlight);
  });

  /**
   * Kropka radia była realną wadą, nie hipotezą: to `<div>` niosący stan samym
   * tłem, więc wymuszenie zrównywało ją z tłem okręgu i zaznaczony radiobutton
   * wyglądał jak pusty.
   */
  test('zaznaczony radiobutton pozostaje odróżnialny od pustego', async ({
    page,
  }) => {
    await visit(page, '/states', { media: FORCED });

    const zaznaczony = page
      .getByTestId('idle-radio')
      .locator('pct-radio[data-pct-checked]')
      .first();
    await expect(zaznaczony).toHaveCount(1);

    const kropka = await styleOf(
      zaznaczony.locator('[data-pct-part="dot"]'),
      'background-color',
    );
    const okrag = await styleOf(
      zaznaczony.locator('[data-pct-part="circle"]'),
      'background-color',
    );

    expect(kropka).not.toBe(okrag);
  });

  test('ptaszek checkboxa odcina się od pudełka', async ({ page }) => {
    await visit(page, '/states', { media: FORCED });
    const sys = await systemColors(page);

    const checkbox = page.getByTestId('idle-checkbox');
    await checkbox.locator('[data-pct-part="control"]').check();

    const mark = checkbox.locator('[data-pct-part="mark"]');
    await expect(mark).toBeVisible();
    expect(await styleOf(mark, 'stroke')).toBe(sys.FieldText);
    expect(
      await styleOf(
        checkbox.locator('[data-pct-part="box"]'),
        'background-color',
      ),
    ).toBe(sys.Field);
  });

  /**
   * Najcięższy przypadek: w panelu listy opcja zwykła, wybrana i aktywna
   * klawiaturą różnią się WYŁĄCZNIE tłem. Po podmianie palety wszystkie trzy
   * byłyby tym samym prostokątem, więc wybór rozdzielono na dwa niezależne
   * kanały — tło dla wyboru, obrys dla kursora klawiatury.
   */
  test('w panelu listy wybór i kursor klawiatury są rozróżnialne', async ({
    page,
  }) => {
    await visit(page, '/select', { media: FORCED });
    const sys = await systemColors(page);

    const trigger = page
      .getByTestId('select-country')
      .locator('[data-pct-part="trigger"]');
    await trigger.click();
    const options = page.locator('[data-pct-part="option"]');
    await expect(options.first()).toBeVisible();

    // Wybór: własna para palety, przeznaczona w niej właśnie do zaznaczeń list.
    await options.nth(1).click();
    await trigger.click();
    const wybrana = options
      .locator('[data-pct-selected]')
      .or(page.locator('[data-pct-part="option"][data-pct-selected]'));
    expect(await bg(page, '[data-pct-part="option"][data-pct-selected]')).toBe(
      sys.SelectedItem,
    );
    await expect(wybrana.first()).toBeVisible();

    // Zwykła opcja stoi na powierzchni panelu — a więc jest inna niż wybrana.
    expect(
      await bg(page, '[data-pct-part="option"]:not([data-pct-selected])'),
    ).toBe(sys.Canvas);

    // Kursor klawiatury: obrys, czyli kanał niezależny od tła. Dzięki temu
    // opcja jednocześnie wybrana i aktywna pokazuje oba stany naraz.
    await trigger.press('ArrowDown');
    const aktywna = page.locator('[data-pct-part="option"][data-pct-active]');
    await expect(aktywna).toHaveCount(1);
    expect(await styleOf(aktywna, 'outline-color')).toBe(sys.Highlight);
    expect(await styleOf(aktywna, 'outline-style')).toBe('solid');
  });

  test('stan wyłączony mówi GrayText we wszystkich kontrolkach', async ({
    page,
  }) => {
    await visit(page, '/states', { media: FORCED });
    const sys = await systemColors(page);

    const przypadki: Record<string, Promise<string>> = {
      przycisk: styleOf(page.getByTestId('disabled-button'), 'color'),
      'pole tekstowe': styleOf(page.getByTestId('disabled-text'), 'color'),
      'kropka radia': styleOf(
        page
          .getByTestId('disabled-radio')
          .locator('[data-pct-part="dot"]')
          .first(),
        'background-color',
      ),
      'ptaszek checkboxa': styleOf(
        page.getByTestId('disabled-checkbox').locator('[data-pct-part="mark"]'),
        'stroke',
      ),
    };

    for (const [nazwa, pomiar] of Object.entries(przypadki)) {
      expect(await pomiar, `${nazwa} nie używa GrayText`).toBe(sys.GrayText);
    }
  });
});
