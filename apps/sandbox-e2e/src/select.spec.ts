import { expect, test } from '@playwright/test';
import { attrOf, boxOf, visit } from './support/dom';

test.describe('PctSelect — combobox z panelem', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/select');
  });

  const trigger = (
    page: import('@playwright/test').Page,
    id = 'select-country',
  ) => page.getByTestId(id).locator('[data-pct-part="trigger"]');
  const panel = (page: import('@playwright/test').Page) =>
    page.locator('[data-pct-part="panel"]');
  const options = (page: import('@playwright/test').Page) =>
    page.locator('[data-pct-part="option"]');

  test('trigger realizuje wzorzec combobox', async ({ page }) => {
    const t = trigger(page);
    await expect(t).toHaveRole('combobox');
    await expect(t).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(t).toHaveAttribute('aria-expanded', 'false');
    await expect(panel(page)).toHaveCount(0);
  });

  /**
   * Napisy biblioteki są angielskie, a sandbox tłumaczy je przez
   * `providePctTexts` (req-api-texts). Ten test pilnuje całego łańcucha —
   * token DI, render serwerowy i hydracja — bo widoczny tu tekst zastępczy
   * nie pada nigdzie w kodzie aplikacji poza konfiguracją providerów.
   */
  test('tekst zastępczy pochodzi z tłumaczenia aplikacji, nie z biblioteki', async ({
    page,
  }) => {
    await expect(
      page
        .getByTestId('select-country')
        .locator('[data-pct-part="placeholder"]'),
    ).toHaveText('Wybierz…');
  });

  test('kliknięcie otwiera panel, wybór zamyka i pokazuje etykietę', async ({
    page,
  }) => {
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');

    await options(page).filter({ hasText: 'Niemcy' }).click();

    await expect(panel(page)).toHaveCount(0);
    await expect(
      page.getByTestId('select-country').locator('[data-pct-part="value"]'),
    ).toHaveText('Niemcy');
  });

  /**
   * W obudowie widoczną krawędzią jest ramka pola, a trigger stoi w kolumnie
   * odsuniętej o padding — panel oparty o trigger byłby od pola węższy
   * i przesunięty (lesson-35).
   */
  test('w obudowie panel pokrywa się z ramką pola, nie z triggerem', async ({
    page,
  }) => {
    const row = page
      .getByTestId('field-country')
      .locator('[data-pct-part="field-row"]');
    const rowBox = await boxOf(row);
    const triggerBox = await boxOf(trigger(page));
    // Założenie testu: trigger jest węższy od pola — inaczej test nic nie mierzy.
    expect(rowBox.width).toBeGreaterThan(triggerBox.width);

    await trigger(page).click();
    const panelBox = await boxOf(panel(page));

    expect(Math.abs(panelBox.width - rowBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(panelBox.x - rowBox.x)).toBeLessThanOrEqual(1);
  });

  test('bez obudowy panel ma szerokość triggera — on jest tam ramką', async ({
    page,
  }) => {
    const t = trigger(page, 'select-bare');
    const triggerBox = await boxOf(t);
    await t.click();
    const panelBox = await boxOf(panel(page));

    expect(Math.abs(panelBox.width - triggerBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(panelBox.x - triggerBox.x)).toBeLessThanOrEqual(1);
  });

  test('panelWidth="auto" rozszerza panel do najdłuższej opcji', async ({
    page,
  }) => {
    const rowBox = await boxOf(
      page
        .getByTestId('field-width-auto')
        .locator('[data-pct-part="field-row"]'),
    );
    await trigger(page, 'select-width-auto').click();
    const panelBox = await boxOf(panel(page));

    expect(panelBox.width).toBeGreaterThan(rowBox.width);
    // Opcje mieszczą się w jednej linii — po to jest to dopasowanie.
    const optionBox = await boxOf(options(page).nth(2));
    expect(optionBox.height).toBeLessThan(2 * rowBox.height);
  });

  test('panelWidth wprost i panelAlign="end" przyklejają panel do prawej krawędzi pola', async ({
    page,
  }) => {
    const rowBox = await boxOf(
      page
        .getByTestId('field-width-fixed')
        .locator('[data-pct-part="field-row"]'),
    );
    await trigger(page, 'select-width-fixed').click();
    const panelBox = await boxOf(panel(page));

    expect(Math.round(panelBox.width)).toBe(320);
    expect(
      Math.abs(panelBox.x + panelBox.width - (rowBox.x + rowBox.width)),
    ).toBeLessThanOrEqual(1);
  });

  /**
   * Panel jest dzieckiem `body`, więc dziedziczy pismo po nim, a nie po
   * aplikacji — krój i wielkość musi dostać wprost z kontrolki (lesson-35).
   */
  test('opcje piszą tym samym krojem i wielkością co trigger', async ({
    page,
  }) => {
    const t = trigger(page);
    const font = await t.evaluate((el) => {
      const s = getComputedStyle(el);
      return { family: s.fontFamily, size: s.fontSize };
    });
    await t.click();

    await expect(options(page).first()).toHaveCSS('font-family', font.family);
    await expect(options(page).first()).toHaveCSS('font-size', font.size);
  });

  /**
   * Dla customowego listboxa nie ma natywnego odpowiednika, więc obsługa
   * klawiatury jest nasza — te testy pilnują zgodności z wzorcem ARIA APG.
   */
  test('klawiatura: strzałki, Home/End, Enter i aria-activedescendant', async ({
    page,
  }) => {
    const t = trigger(page);
    await t.focus();

    await page.keyboard.press('ArrowDown'); // otwarcie + aktywna pierwsza
    await expect(panel(page)).toBeVisible();
    const first = options(page).first();
    await expect(first).toHaveAttribute('data-pct-active', '');
    await expect(t).toHaveAttribute(
      'aria-activedescendant',
      await attrOf(first, 'id'),
    );

    await page.keyboard.press('End');
    await expect(options(page).last()).toHaveAttribute('data-pct-active', '');

    await page.keyboard.press('Home');
    await expect(first).toHaveAttribute('data-pct-active', '');

    await page.keyboard.press('ArrowDown'); // Niemcy
    await page.keyboard.press('Enter');
    await expect(panel(page)).toHaveCount(0);
    await expect(
      page.getByTestId('select-country').locator('[data-pct-part="value"]'),
    ).toHaveText('Niemcy');
    // Po wyborze fokus wraca na trigger.
    await expect(t).toBeFocused();
  });

  test('klawiatura: strzałki pomijają wyłączoną opcję', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown'); // Polska
    await page.keyboard.press('ArrowDown'); // Niemcy
    await page.keyboard.press('ArrowDown'); // pomija Czechy -> Słowacja

    await expect(
      options(page).filter({ hasText: 'Czechy' }),
    ).not.toHaveAttribute('data-pct-active', '');
    await expect(options(page).filter({ hasText: 'Słowacja' })).toHaveAttribute(
      'data-pct-active',
      '',
    );
  });

  test('Escape zamyka panel, klik poza panelem też', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown');
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);

    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await page.locator('h1').click();
    await expect(panel(page)).toHaveCount(0);
  });

  test('typeahead aktywuje opcję po pierwszych literach', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('s'); // Słowacja

    await expect(options(page).filter({ hasText: 'Słowacja' })).toHaveAttribute(
      'data-pct-active',
      '',
    );
  });

  /**
   * Panel renderuje się w nakładce CDK, czyli poza drzewem panelu ciemnego —
   * motyw musi być przeniesiony jawnie, inaczej scoped theme (req-token-scoped)
   * przestaje działać dla list rozwijanych.
   */
  test('panel dziedziczy scoped theme z otoczenia triggera', async ({
    page,
  }) => {
    await trigger(page, 'select-scoped').click();
    const p = panel(page);
    await expect(p).toBeVisible();
    await expect(p).toHaveAttribute('data-theme', 'dark');

    // Tło panelu musi odpowiadać powierzchni motywu ciemnego, nie jasnego.
    await expect(p).toHaveCSS('background-color', 'rgb(15, 23, 42)');
  });

  test('obszar klikalny triggera ma minimum 24 px wysokości', async ({
    page,
  }) => {
    const box = await boxOf(trigger(page));
    expect(box.height).toBeGreaterThanOrEqual(24);
  });
});
