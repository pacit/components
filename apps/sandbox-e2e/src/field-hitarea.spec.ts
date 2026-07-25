import { expect, test } from '@playwright/test';
import { boxOf } from './support/dom';

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
    const row = field.locator('[data-pct-part="field-row"]');
    const input = field.locator('input');

    // mouse.click() używa współrzędnych widoku i sam nie przewija — inaczej
    // klik trafia poza ekran, w <html>.
    await row.scrollIntoViewIfNeeded();
    const box = await boxOf(row);
    // 3 px od lewej krawędzi — obszar paddingu, przed dekoracją prefix.
    await page.mouse.click(box.x + 3, box.y + box.height / 2);

    await expect(input).toBeFocused();
  });

  test('kliknięcie u góry i u dołu ramki fokusuje pole', async ({ page }) => {
    const field = page.getByTestId('field-price');
    const row = field.locator('[data-pct-part="field-row"]');
    const input = field.locator('input');

    await row.scrollIntoViewIfNeeded();
    const box = await boxOf(row);
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

    await field.locator('[data-pct-part="field-prefix"]').click();
    await expect(input).toBeFocused();
  });

  test('kolumny szczelnie kafelkują wnętrze ramki', async ({ page }) => {
    // Sedno poprawki: rząd nie ma własnego paddingu, więc nie ma w nim pasa,
    // który nie należy do żadnej kolumny. Wcześniej było to ~60% powierzchni.
    const field = page.getByTestId('field-price');
    const row = await boxOf(field.locator('[data-pct-part="field-row"]'));
    const border = 1;

    const columns = [];
    for (const part of ['field-prefix', 'field-control', 'field-suffix']) {
      columns.push(await boxOf(field.locator(`[data-pct-part="${part}"]`)));
    }

    for (const column of columns) {
      expect(column.height).toBeCloseTo(row.height - 2 * border, 0);
      expect(column.y).toBeCloseTo(row.y + border, 0);
    }

    // Kolumny stykają się bez luk i sięgają obu krawędzi wnętrza rzędu.
    expect(columns[0].x).toBeCloseTo(row.x + border, 0);
    expect(columns[1].x).toBeCloseTo(columns[0].x + columns[0].width, 0);
    expect(columns[2].x).toBeCloseTo(columns[1].x + columns[1].width, 0);
    expect(columns[2].x + columns[2].width).toBeCloseTo(
      row.x + row.width - border,
      0,
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
      page.getByTestId('field-price').locator('[data-pct-part="field-row"]'),
    ).toHaveCSS('cursor', 'text');
  });

  test('pole z listą pokazuje kursor wskaźnika na całej ramce', async ({
    page,
  }) => {
    await expect(
      page.getByTestId('field-country').locator('[data-pct-part="field-row"]'),
    ).toHaveCSS('cursor', 'pointer');
  });

  test('pole wyłączone nie zaprasza do pisania', async ({ page }) => {
    await expect(
      page.getByTestId('field-disabled').locator('[data-pct-part="field-row"]'),
    ).toHaveCSS('cursor', 'not-allowed');
  });

  test('kliknięcie w padding pola z listą otwiera panel', async ({ page }) => {
    // Kursor `pointer` nad całą ramką obiecuje otwarcie listy — obietnica musi
    // obowiązywać też w paddingu, nie tylko nad samym triggerem.
    const field = page.getByTestId('field-country');
    const row = field.locator('[data-pct-part="field-row"]');
    const trigger = field.locator('[data-pct-part="trigger"]');

    await row.scrollIntoViewIfNeeded();
    const box = await boxOf(row);
    await page.mouse.click(box.x + 3, box.y + 3);

    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();
  });

  test('interaktywna dekoracja zajmuje całą wysokość swojego slotu', async ({
    page,
  }) => {
    // Pas nad przyciskiem i pod nim należy do przycisku, nie do pola — inaczej
    // kursor i obszar kliknięcia rozjeżdżają się na jego krawędziach.
    const field = page.getByTestId('field-price');
    const clear = field.getByTestId('field-price-clear');
    const slot = await boxOf(field.locator('[data-pct-part="field-suffix"]'));
    const button = await boxOf(clear);

    expect(button.height).toBeCloseTo(slot.height, 0);
    await expect(clear).toHaveCSS('cursor', 'pointer');
  });

  test('bierna dekoracja dziedziczy kursor pola', async ({ page }) => {
    // Jednostka „PLN" nie jest celem kliknięcia — klik w nią fokusuje kontrolkę,
    // więc kursor ma mówić to samo co reszta ramki.
    await expect(
      page.getByTestId('field-price').locator('[data-pct-part="field-prefix"]'),
    ).toHaveCSS('cursor', 'text');
  });
});
