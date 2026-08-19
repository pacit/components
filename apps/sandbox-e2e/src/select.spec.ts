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
   * The library texts are English and the sandbox, which runs under `fr-FR`,
   * translates them through `providePctTexts` (req-api-texts). This test watches the
   * whole chain — the DI token, the server render and hydration — because the
   * placeholder visible here appears nowhere in the application code outside the
   * provider configuration.
   */
  test('the placeholder comes from the application translation, not from the library', async ({
    page,
  }) => {
    await expect(
      page
        .getByTestId('select-country')
        .locator('[data-pct-part="placeholder"]'),
    ).toHaveText('Sélectionner…');
  });

  test('a click opens the panel; picking closes it and shows the label', async ({
    page,
  }) => {
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');

    await options(page).filter({ hasText: 'Germany' }).click();

    await expect(panel(page)).toHaveCount(0);
    await expect(
      page.getByTestId('select-country').locator('[data-pct-part="value"]'),
    ).toHaveText('Germany');
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

    await page.keyboard.press('ArrowDown'); // opens, with the first one active
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

    await page.keyboard.press('ArrowDown'); // Germany
    await page.keyboard.press('Enter');
    await expect(panel(page)).toHaveCount(0);
    await expect(
      page.getByTestId('select-country').locator('[data-pct-part="value"]'),
    ).toHaveText('Germany');
    // After the pick the focus returns to the trigger.
    await expect(t).toBeFocused();
  });

  test('the keyboard: the arrows skip a disabled option', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown'); // Poland
    await page.keyboard.press('ArrowDown'); // Germany
    await page.keyboard.press('ArrowDown'); // skips Czechia -> Slovakia

    await expect(
      options(page).filter({ hasText: 'Czechia' }),
    ).not.toHaveAttribute('data-pct-active', '');
    await expect(options(page).filter({ hasText: 'Slovakia' })).toHaveAttribute(
      'data-pct-active',
      '',
    );
  });

  /**
   * The panel is a surface the user presses without it taking anything — focus stays on the
   * trigger, which is where the listbox pattern keeps it (`req-api-overlay`). Left to the
   * browser it does not: a press on the panel's own background moves focus to `body` in all
   * three engines, and everything the trigger owns dies with it — the arrows, Home and End,
   * Enter and the typeahead all sit on its `keydown`, while `aria-activedescendant` goes on
   * pointing at the active option from an element that no longer has focus. The panel stays
   * open through all of it, a press inside it being no press outside it.
   *
   * Which is why the case is here and not in a unit suite: jsdom moves focus on no
   * `mousedown` at all, so it cannot tell the guarded panel from the unguarded one.
   */
  test('a press on the panel takes no focus, so the keyboard stays alive', async ({
    page,
  }) => {
    const t = trigger(page);
    await t.click();
    await expect(panel(page)).toBeVisible();

    // The padding strip along the top edge: the panel itself, not an option.
    const box = await boxOf(panel(page));
    await page.mouse.move(box.x + box.width / 2, box.y + 2);
    await page.mouse.down();
    await page.mouse.up();

    await expect(t).toBeFocused();
    await expect(panel(page)).toBeVisible();

    const germany = options(page).filter({ hasText: 'Germany' });
    await page.keyboard.press('ArrowDown');
    await expect(germany).toHaveAttribute('data-pct-active', '');
    await expect(t).toHaveAttribute(
      'aria-activedescendant',
      await attrOf(germany, 'id'),
    );

    // And the pick itself: the control never lost focus, so nothing has to give it back.
    await germany.click();
    await expect(panel(page)).toHaveCount(0);
    await expect(t).toBeFocused();
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
    await page.keyboard.press('s'); // Slovakia (the option label in the sandbox)

    await expect(options(page).filter({ hasText: 'Slovakia' })).toHaveAttribute(
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

  /**
   * The empty panel and the reader nobody had (`req-a11y-built-in`).
   *
   * The sentence inside the panel is drawn for the eye. Focus stays on the trigger, an empty
   * listbox has no option for `aria-activedescendant` to name, and nothing describes the panel
   * — so a screen reader is pointed at no part of it, measured here as the ARIA relations the
   * trigger carries with the panel open. The library therefore says it on a live channel of
   * its own ([0026](../../../../docs/decisions/0026-one-channel-per-politeness.md)), and this
   * is where that can be measured at all: what the channel is made of — one region per
   * politeness, in the document before anything is said, invisible, holding the sentence and
   * then not holding it — is DOM, and DOM is what a browser can be asked about. Whether an
   * assistive technology reads it out is not measurable here, in any engine.
   */
  test.describe('the empty panel', () => {
    const live = (
      page: import('@playwright/test').Page,
      politeness = 'polite',
    ) => page.locator(`[data-pct-live="${politeness}"]`);

    test('the channels are open, empty and invisible before anything is said', async ({
      page,
    }) => {
      // One of each for the whole document, however many controls are on the page — the
      // property a region per component does not have.
      await expect(live(page)).toHaveCount(1);
      await expect(live(page, 'assertive')).toHaveCount(1);
      await expect(live(page)).toHaveAttribute('aria-live', 'polite');
      await expect(live(page, 'assertive')).toHaveAttribute(
        'aria-live',
        'assertive',
      );
      await expect(live(page)).toHaveAttribute('aria-atomic', 'true');
      await expect(live(page)).toHaveText('');

      // Hidden by the element's own style and not by a class, because a class is a promise
      // about a stylesheet the consumer has to include — CDK's own announcer makes that
      // promise, and on the two stylesheets this library asks for it paints its text across
      // the bottom of the page (`lesson-83`).
      const box = await live(page).boundingBox();
      expect(box?.width).toBeLessThanOrEqual(1);
      expect(box?.height).toBeLessThanOrEqual(1);
    });

    test('opening it announces the text the application translated', async ({
      page,
    }) => {
      const t = trigger(page, 'select-empty');
      await t.click();
      await expect(panel(page)).toBeVisible();

      // The measurement of the defect, beside its repair: with the panel open the trigger
      // points at nothing and is described by nothing, so the sentence in the panel has no
      // reader on the ARIA side at all.
      await expect(t).toHaveAttribute('aria-expanded', 'true');
      await expect(t).not.toHaveAttribute('aria-activedescendant');
      await expect(t).not.toHaveAttribute('aria-describedby');

      // `Aucune option` and not `No options`: the announcement goes through PCT_TEXTS, so an
      // application that translates the library is not announced to in English
      // (req-api-texts).
      await expect(live(page)).toHaveText('Aucune option');
      await expect(live(page, 'assertive')).toHaveText('');
    });

    test('closing withdraws it, and the next opening says it again', async ({
      page,
    }) => {
      const t = trigger(page, 'select-empty');
      await t.click();
      await expect(live(page)).toHaveText('Aucune option');

      await page.keyboard.press('Escape');
      await expect(panel(page)).toHaveCount(0);
      // Withdrawn, and that is what makes the repeat possible: a channel still holding the
      // sentence would take the second opening for a duplicate and stay silent.
      await expect(live(page)).toHaveText('');

      await t.click();
      await expect(live(page)).toHaveText('Aucune option');
    });

    test('a panel with options says nothing', async ({ page }) => {
      await trigger(page).click();
      await expect(panel(page)).toBeVisible();

      // The list a screen reader already reads is not announced over: `aria-activedescendant`
      // names the active option, which is the pattern doing its job.
      await expect(trigger(page)).toHaveAttribute('aria-activedescendant');
      await expect(live(page)).toHaveText('');
    });
  });

  test('the clickable area of the trigger is at least 24 px tall', async ({
    page,
  }) => {
    const box = await boxOf(trigger(page));
    expect(box.height).toBeGreaterThanOrEqual(24);
  });
});
