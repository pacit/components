import { expect, test } from '@playwright/test';
import { attrOf, boxOf, visit } from './support/dom';

test.describe('PctSelect — a combobox with a panel', () => {
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

  test('the trigger implements the combobox pattern', async ({ page }) => {
    const t = trigger(page);
    await expect(t).toHaveRole('combobox');
    await expect(t).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(t).toHaveAttribute('aria-expanded', 'false');
    await expect(panel(page)).toHaveCount(0);
  });

  /**
   * The library texts are English and the sandbox translates them through
   * `providePctTexts` (req-api-texts). This test watches the whole chain — the DI
   * token, the server render and hydration — because the placeholder visible here
   * appears nowhere in the application code outside the provider configuration.
   */
  test('the placeholder comes from the application translation, not from the library', async ({
    page,
  }) => {
    await expect(
      page
        .getByTestId('select-country')
        .locator('[data-pct-part="placeholder"]'),
    ).toHaveText('Wybierz…');
  });

  test('a click opens the panel; picking closes it and shows the label', async ({
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
   * Inside the wrapper the visible edge is the field border, and the trigger stands
   * in a column set in by the padding — a panel anchored to the trigger would be
   * narrower than the field and offset (lesson-35).
   */
  test('inside the wrapper the panel lines up with the field border, not the trigger', async ({
    page,
  }) => {
    const row = page
      .getByTestId('field-country')
      .locator('[data-pct-part="field-row"]');
    const rowBox = await boxOf(row);
    const triggerBox = await boxOf(trigger(page));
    // The test assumes the trigger is narrower than the field — otherwise it
    // measures nothing.
    expect(rowBox.width).toBeGreaterThan(triggerBox.width);

    await trigger(page).click();
    const panelBox = await boxOf(panel(page));

    expect(Math.abs(panelBox.width - rowBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(panelBox.x - rowBox.x)).toBeLessThanOrEqual(1);
  });

  test('with no wrapper the panel takes the trigger width — there the trigger is the border', async ({
    page,
  }) => {
    const t = trigger(page, 'select-bare');
    const triggerBox = await boxOf(t);
    await t.click();
    const panelBox = await boxOf(panel(page));

    expect(Math.abs(panelBox.width - triggerBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(panelBox.x - triggerBox.x)).toBeLessThanOrEqual(1);
  });

  test('panelWidth="auto" widens the panel to the longest option', async ({
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
    // The options fit on one line — that is what this fitting is for.
    const optionBox = await boxOf(options(page).nth(2));
    expect(optionBox.height).toBeLessThan(2 * rowBox.height);
  });

  test('a literal panelWidth and panelAlign="end" pin the panel to the right edge of the field', async ({
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
   * The panel is a child of `body`, so it inherits its type from there and not from
   * the application — the family and the size have to come straight from the control
   * (lesson-35).
   */
  test('the options are set in the same family and size as the trigger', async ({
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
   * A custom listbox has no native counterpart, so the keyboard handling is ours —
   * these tests keep it in line with the ARIA APG pattern.
   */
  test('the keyboard: the arrows, Home/End, Enter and aria-activedescendant', async ({
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

  test('the keyboard: the arrows skip a disabled option', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown'); // Polska
    await page.keyboard.press('ArrowDown'); // Niemcy
    await page.keyboard.press('ArrowDown'); // skips Czechy -> Słowacja

    await expect(
      options(page).filter({ hasText: 'Czechy' }),
    ).not.toHaveAttribute('data-pct-active', '');
    await expect(options(page).filter({ hasText: 'Słowacja' })).toHaveAttribute(
      'data-pct-active',
      '',
    );
  });

  test('Escape closes the panel, and so does a click outside it', async ({
    page,
  }) => {
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

  test('the typeahead activates an option from its first letters', async ({
    page,
  }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('s'); // Słowacja (the option label in the sandbox)

    await expect(options(page).filter({ hasText: 'Słowacja' })).toHaveAttribute(
      'data-pct-active',
      '',
    );
  });

  /**
   * The panel renders in a CDK overlay, that is outside the tree of the dark panel —
   * the theme has to be carried over explicitly, or a scoped theme
   * (req-token-scoped) stops working for drop-down lists.
   */
  test('the panel inherits the scoped theme from around the trigger', async ({
    page,
  }) => {
    await trigger(page, 'select-scoped').click();
    const p = panel(page);
    await expect(p).toBeVisible();
    await expect(p).toHaveAttribute('data-theme', 'dark');

    // The panel background has to match the dark theme surface, not the light one.
    await expect(p).toHaveCSS('background-color', 'rgb(15, 23, 42)');
  });

  test('the clickable area of the trigger is at least 24 px tall', async ({
    page,
  }) => {
    const box = await boxOf(trigger(page));
    expect(box.height).toBeGreaterThanOrEqual(24);
  });
});
