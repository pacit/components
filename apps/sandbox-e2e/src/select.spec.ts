import { expect, test } from '@playwright/test';

test.describe('PctSelect — combobox z panelem', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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

  test('panel ma szerokość triggera', async ({ page }) => {
    const t = trigger(page);
    const triggerBox = await t.boundingBox();
    await t.click();
    const panelBox = await panel(page).boundingBox();

    expect(Math.abs(panelBox!.width - triggerBox!.width)).toBeLessThanOrEqual(
      2,
    );
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
      (await first.getAttribute('id'))!,
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
   * motyw musi być przeniesiony jawnie, inaczej scoped theme (wym-theme-4)
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
    const box = await trigger(page).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(24);
  });
});
