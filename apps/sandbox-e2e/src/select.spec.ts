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

  /**
   * A heading in the list is drawn where a native `<select>` would put an `<optgroup>`, and
   * the questions it raises are the ones only a browser answers: does the tree really own the
   * options through the group, and does the walk still behave as ONE list once the DOM has
   * three levels instead of two? Both are measured on the rendered page rather than deduced
   * from the template.
   */
  /**
   * The many-choice control. Everything below is the SAME file as the single-choice one —
   * one template, one stylesheet, one walk — so what is measured here is only what the tag
   * decides: the listbox says it takes many answers, a pick does not end the question, and
   * the chosen rows carry a mark as well as a surface. In three engines, because the mark is
   * a glyph and the panel is an overlay.
   */
  test.describe('more than one answer', () => {
    const multi = (page: import('@playwright/test').Page) =>
      trigger(page, 'select-multi');
    const checks = (page: import('@playwright/test').Page) =>
      page.locator('[data-pct-part="option-check"]');
    const chosen = (page: import('@playwright/test').Page) =>
      page.getByTestId('select-multi').locator('[data-pct-part="value"]');

    test('the listbox says it takes many answers, and the single-choice one does not', async ({
      page,
    }) => {
      await multi(page).click();
      await expect(panel(page)).toHaveAttribute('aria-multiselectable', 'true');
      await page.keyboard.press('Escape');

      await trigger(page).click();
      await expect(panel(page)).toBeVisible();
      await expect(panel(page)).not.toHaveAttribute('aria-multiselectable');
    });

    test('a pick does not end the question, and a second one takes it back', async ({
      page,
    }) => {
      await expect(chosen(page)).toHaveText('Poland, Slovakia');
      await multi(page).click();
      await expect(panel(page)).toBeVisible();
      await expect(checks(page)).toHaveCount(2);

      await options(page).filter({ hasText: 'Germany' }).click();

      // The panel is still up — three choices are one journey, not three.
      await expect(panel(page)).toBeVisible();
      await expect(multi(page)).toHaveAttribute('aria-expanded', 'true');
      await expect(checks(page)).toHaveCount(3);
      // Written the way the list reads, not the way the picking went.
      await expect(chosen(page)).toHaveText('Poland, Germany, Slovakia');

      await options(page).filter({ hasText: 'Poland' }).click();
      await expect(checks(page)).toHaveCount(2);
      await expect(chosen(page)).toHaveText('Germany, Slovakia');
      await expect(options(page).first()).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });

    test('the keyboard toggles the active row and leaves the panel standing', async ({
      page,
    }) => {
      const t = multi(page);
      await t.focus();
      await page.keyboard.press('ArrowDown'); // opens on the first chosen row: Poland
      await expect(panel(page)).toBeVisible();
      await expect(t).toHaveAttribute(
        'aria-activedescendant',
        await attrOf(options(page).first(), 'id'),
      );

      await page.keyboard.press('Enter');
      await expect(panel(page)).toBeVisible();
      await expect(chosen(page)).toHaveText('Slovakia');

      // …and Escape is still the one thing that closes it.
      await page.keyboard.press('Escape');
      await expect(panel(page)).toHaveCount(0);
      await expect(chosen(page)).toHaveText('Slovakia');
    });
  });

  test.describe('headings in the list', () => {
    const groups = (page: import('@playwright/test').Page) =>
      page.locator('[data-pct-part="group"]');

    test('a group is named by the heading it draws, and owns the options below it', async ({
      page,
    }) => {
      await trigger(page, 'select-groups').click();
      await expect(panel(page)).toBeVisible();

      await expect(groups(page)).toHaveCount(3);
      await expect(groups(page).first()).toHaveRole('group');

      const heading = groups(page)
        .first()
        .locator('[data-pct-part="group-label"]');
      await expect(heading).toHaveText('Central Europe');
      await expect(groups(page).first()).toHaveAttribute(
        'aria-labelledby',
        await attrOf(heading, 'id'),
      );

      // The loose option above the first heading is the listbox's own child; the rest hang
      // under a group. `role="option"` inside a plain wrapper would be an option with no
      // owner, which is why the nameless section is drawn with no element at all.
      const first = options(page).first();
      await expect(first).toHaveText('Anywhere');
      expect(
        await first.evaluate((el) =>
          el.parentElement?.getAttribute('data-pct-part'),
        ),
      ).toBe('panel');
      expect(
        await options(page)
          .nth(1)
          .evaluate((el) => el.parentElement?.getAttribute('data-pct-part')),
      ).toBe('group');
    });

    test('the walk crosses the headings and skips what a disabled group holds', async ({
      page,
    }) => {
      const t = trigger(page, 'select-groups');
      await t.focus();
      await page.keyboard.press('ArrowDown'); // opens on the chosen row: Poland

      await expect(options(page).nth(1)).toHaveAttribute('data-pct-active', '');
      await expect(t).toHaveAttribute(
        'aria-activedescendant',
        await attrOf(options(page).nth(1), 'id'),
      );

      // Czechia, Slovakia, then over the "Baltic" heading to Lithuania.
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await expect(options(page).nth(4)).toHaveAttribute('data-pct-active', '');

      // Latvia is disabled, the whole last group is: End lands on Lithuania, the last row
      // anybody can reach.
      await page.keyboard.press('End');
      await expect(options(page).nth(4)).toHaveAttribute('data-pct-active', '');

      // Typeahead reads one list too — "s" is Slovakia, two headings up.
      await page.keyboard.press('s');
      await expect(options(page).nth(3)).toHaveAttribute('data-pct-active', '');

      await page.keyboard.press('Home');
      await expect(options(page).first()).toHaveAttribute(
        'data-pct-active',
        '',
      );
    });

    test('a disabled group takes its whole section out of reach', async ({
      page,
    }) => {
      await trigger(page, 'select-groups').click();
      const japan = options(page).filter({ hasText: 'Japan' });
      await expect(japan).toHaveAttribute('aria-disabled', 'true');

      // `force`, and it is the measurement rather than a workaround: an ordinary click never
      // lands, because Playwright's own actionability reads `aria-disabled` and refuses the
      // press — the browser agrees the row is out of reach before we ask. What is left to
      // prove is that a press delivered anyway changes nothing.
      await japan.click({ force: true });
      await expect(panel(page)).toBeVisible();
      await expect(
        page.getByTestId('select-groups').locator('[data-pct-part="value"]'),
      ).toHaveText('Poland');
    });
  });

  test.describe('an option row the consumer wrote (req-api-templates)', () => {
    const templated = (page: import('@playwright/test').Page) =>
      page.getByTestId('select-template').locator('[data-pct-part="trigger"]');

    test('replaces what is inside the row and keeps the row itself', async ({
      page,
    }) => {
      await templated(page).click();
      const rows = options(page);
      await expect(rows).toHaveCount(6);

      // The consumer's markup is there…
      await expect(rows.first().getByTestId('option-row')).toBeVisible();
      await expect(rows.first()).toHaveText(/Poland\s*pl/);
      // …and the listbox pattern is still the component's: role, id and aria-selected are
      // not the template's to draw, so a custom row cannot lose them.
      await expect(rows.first()).toHaveRole('option');
      await expect(rows.first()).toHaveAttribute('id', /-option-0$/);
      await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'true');
    });

    test('the context follows the state, in the browser and not only in jsdom', async ({
      page,
    }) => {
      await templated(page).click();
      // `de` is the chosen value on this page, so exactly one ROW draws the mark. Counted
      // among the options and not over the page: the word is prose somewhere else on it.
      await expect(options(page).filter({ hasText: 'chosen' })).toHaveCount(1);
      await expect(options(page).nth(1)).toContainText('chosen');

      await options(page).first().click();
      await templated(page).click();
      await expect(options(page).first()).toContainText('chosen');
      await expect(options(page).nth(1)).not.toContainText('chosen');
    });

    test('the keyboard is unchanged by a custom row', async ({ page }) => {
      const t = templated(page);
      await t.click();
      // The keys sit on the trigger, not on the row — a template that replaces the row's
      // content cannot take them away. From `de` at 1 the walk skips the disabled option at
      // 2 and lands on 3, which is the walk the built-in row gets as well.
      await page.keyboard.press('ArrowDown');
      await expect(t).toHaveAttribute('aria-activedescendant', /-option-3$/);
      await page.keyboard.press('Enter');
      await expect(t).toHaveText(/Slovakia/);
    });
  });

  test.describe('an arrow the consumer registered (req-api-icons)', () => {
    const arrowOf = (page: import('@playwright/test').Page, id: string) =>
      page.getByTestId(id).locator('[data-pct-part="arrow"]');

    test('the set replaces the drawing and nothing else about the icon', async ({
      page,
    }) => {
      const own = arrowOf(page, 'select-icons');
      const builtIn = arrowOf(page, 'select-country');

      // The two cards are the same component on one page, and only one of them is under
      // a `providePctIcons` — which is the whole claim about the scope of the token.
      await expect(own.getByTestId('own-arrow')).toBeVisible();
      await expect(own.locator('svg')).toHaveCount(0);
      await expect(builtIn.locator('svg')).toHaveCount(1);
      await expect(builtIn.getByTestId('own-arrow')).toHaveCount(0);

      // The box the sheet sizes and turns is the same element in both, so a swapped
      // drawing takes the layout it was given rather than one of its own.
      const swapped = await boxOf(own);
      const original = await boxOf(builtIn);
      expect(swapped.width).toBeCloseTo(original.width, 0);
      expect(swapped.height).toBeCloseTo(original.height, 0);
      await expect(own).toHaveAttribute('aria-hidden', 'true');
    });

    test('the state the component paints on the icon still reaches it', async ({
      page,
    }) => {
      const own = arrowOf(page, 'select-icons');
      const transform = () =>
        own.evaluate((el) => getComputedStyle(el).transform);
      const resting = await transform();

      await page
        .getByTestId('select-icons')
        .locator('[data-pct-part="trigger"]')
        .click();
      await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();

      // `[data-pct-open]` turns the icon's BOX, so the consumer's drawing turns with it —
      // a rule written on the `<svg>` would have stopped applying with the swap.
      await expect
        .poll(transform, { message: 'the icon box turns on opening' })
        .not.toBe(resting);
      expect(await transform()).toContain('matrix');
    });
  });

  /**
   * Filtering, in a browser rather than in jsdom: the trigger is a different ELEMENT here, so
   * what is measured is the part jsdom cannot answer — that the letters reach the field, that
   * the caret keeps the keys the list does not take, and that the panel narrows under them
   * ([0035](../../../docs/decisions/0035-a-filter-is-a-question-not-a-value.md)).
   */
  test.describe('a question typed into the trigger', () => {
    const filtering = (page: import('@playwright/test').Page) =>
      trigger(page, 'select-filter');
    const many = (page: import('@playwright/test').Page) =>
      trigger(page, 'select-filter-multi');
    const active = (page: import('@playwright/test').Page) =>
      page.locator('[data-pct-part="option"][data-pct-active]');

    test('the trigger is a text field, and the panel is what answers it', async ({
      page,
    }) => {
      const field = filtering(page);
      await expect(field).toHaveRole('combobox');
      await expect(field).toHaveJSProperty('tagName', 'INPUT');
      await expect(field).toHaveAttribute('aria-autocomplete', 'list');
      // The select-only trigger of the same page is a button and says none of it.
      await expect(trigger(page)).toHaveJSProperty('tagName', 'BUTTON');
      await expect(trigger(page)).not.toHaveAttribute('aria-autocomplete');
    });

    test('the letters open the panel and narrow it, and the cursor follows', async ({
      page,
    }) => {
      const field = filtering(page);
      await field.fill('ith');

      await expect(panel(page)).toBeVisible();
      await expect(options(page)).toHaveCount(1);
      await expect(options(page).first()).toHaveText('Lithuania');
      // The row the cursor stands on is the row that is left, and the trigger names it by an
      // id that is in the tree.
      await expect(field).toHaveAttribute(
        'aria-activedescendant',
        await attrOf(options(page).first(), 'id'),
      );
      // A heading with nothing left under it is gone with its rows. Scoped to the panel: the
      // sandbox's own controls are radio groups, and a group label is their part too.
      await expect(
        panel(page).locator('[data-pct-part="group-label"]'),
      ).toHaveText('Baltic');
    });

    /**
     * The cursor goes to the first row that can be REACHED, and a question can leave none —
     * `Latvia` is the one row matching `lat` and it is disabled. Then the trigger names no
     * option at all, which is the honest answer: `aria-activedescendant` is a reference, and
     * there is nothing there to point at.
     */
    test('a question that leaves only a row nobody may pick points at none', async ({
      page,
    }) => {
      const field = filtering(page);
      await field.fill('lat');

      await expect(options(page)).toHaveCount(1);
      await expect(options(page).first()).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await expect(field).not.toHaveAttribute('aria-activedescendant');

      // …and Enter picks nothing, so the panel is still standing.
      await page.keyboard.press('Enter');
      await expect(panel(page)).toBeVisible();
    });

    test('Enter answers the question, and the field goes back to the answer', async ({
      page,
    }) => {
      const field = filtering(page);
      await field.fill('czech');
      await page.keyboard.press('Enter');

      await expect(panel(page)).toHaveCount(0);
      await expect(field).toHaveValue('Czechia');
    });

    test('a chosen label survives a question that hides it', async ({
      page,
    }) => {
      const field = filtering(page);
      await expect(field).toHaveValue('Lithuania');

      await field.fill('never');

      // The field holds the question; the answer stands behind it and the panel says that
      // nothing answers it.
      await expect(field).toHaveValue('never');
      await expect(field).toHaveAttribute('placeholder', 'Lithuania');
      await expect(panel(page).locator('[data-pct-part="empty"]')).toHaveText(
        'No matches',
      );

      await page.keyboard.press('Escape');
      await expect(field).toHaveValue('Lithuania');
    });

    test('the caret keeps the keys the list does not take', async ({
      page,
    }) => {
      const field = filtering(page);
      await field.fill('a');
      await page.keyboard.press('ArrowDown');
      await expect(active(page)).toHaveText('Poland');

      // On a select-only trigger End is the last row of the list. Here it belongs to the text,
      // so the cursor does not move — `Lithuania` is what the list would have jumped to.
      await page.keyboard.press('End');
      await expect(active(page)).toHaveText('Poland');

      // And the space bar is a character: it neither picks nor closes, it lengthens the
      // question — which nothing on this list answers.
      await page.keyboard.press(' ');
      await expect(panel(page)).toBeVisible();
      await expect(field).toHaveValue('a ');
      await expect(panel(page).locator('[data-pct-part="empty"]')).toHaveText(
        'No matches',
      );
    });

    test('a pick over a many-choice list keeps what the question hid', async ({
      page,
    }) => {
      const field = many(page);
      await expect(field).toHaveValue('Poland, Slovakia');

      await field.fill('ger');
      await expect(options(page)).toHaveCount(1);
      await options(page).first().click();

      // The panel stays up, the question is answered and gone, and the two chosen countries
      // the panel never showed are still chosen — in the order of the list.
      await expect(panel(page)).toBeVisible();
      await expect(field).toHaveValue('');
      await expect(options(page)).toHaveCount(6);
      await expect(page.locator('[data-pct-part="option-check"]')).toHaveCount(
        3,
      );
      await page.keyboard.press('Escape');
      await expect(field).toHaveValue('Poland, Germany, Slovakia');
    });
  });

  test.describe('a cross that takes the answer back', () => {
    const clearable = (page: import('@playwright/test').Page) =>
      trigger(page, 'select-clear');
    const cross = (
      page: import('@playwright/test').Page,
      id = 'select-clear',
    ) => page.getByTestId(id).locator('[data-pct-part="clear"]');

    test('the cross is a named button that stands beside the trigger, not inside it', async ({
      page,
    }) => {
      // The whole reason it is a sibling: a `<button>` may hold no interactive content, and
      // the HTML parser does not nest one — it closes the first. The same template would then
      // be one tree when Angular builds it and another when the browser parses the server's
      // answer, which is what this measures in a page that really was parsed (lesson-104).
      await expect(cross(page)).toHaveRole('button');
      await expect(cross(page)).toHaveAccessibleName('Effacer');
      expect(
        await cross(page).evaluate((el) =>
          el.closest('[data-pct-part="trigger"]') === null
            ? 'beside'
            : 'inside',
        ),
      ).toBe('beside');
    });

    test('a press takes the answer back and leaves the panel shut', async ({
      page,
    }) => {
      await expect(clearable(page)).toHaveText('Poland');
      await cross(page).click();

      await expect(
        page.getByTestId('select-clear').locator('[data-pct-part="value"]'),
      ).toHaveCount(0);
      await expect(panel(page)).toHaveCount(0);
      await expect(cross(page)).toHaveCount(0);
    });

    /**
     * The press must not cost the trigger its focus: the cross removes itself the moment it
     * works, and focus on an element that leaves the tree lands on `body` — the end of the
     * key map. `mousedown` is refused, so focus never moves in the first place.
     */
    test('and focus stays where the keyboard can carry on', async ({
      page,
    }) => {
      await clearable(page).focus();
      await cross(page).click();

      await expect(clearable(page)).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(panel(page)).toBeVisible();
    });

    test('the cross is not a stop on the way to the next control', async ({
      page,
    }) => {
      await clearable(page).focus();
      await page.keyboard.press('Tab');

      // Out of the tab order, exactly as the platform's own clear control is: the next stop
      // is the trigger of the card below, not the cross standing beside this one.
      await expect(cross(page)).not.toBeFocused();
      await expect(trigger(page, 'select-clear-filter')).toBeFocused();
    });

    test('Escape over a shut panel is the keyboard’s cross', async ({
      page,
    }) => {
      await clearable(page).focus();
      await page.keyboard.press('Escape');

      await expect(
        page.getByTestId('select-clear').locator('[data-pct-part="value"]'),
      ).toHaveCount(0);
      // A second press has nothing to take back and is left to whatever stands around the
      // control — nothing here, which is what "the key was not spent" looks like from outside.
      await page.keyboard.press('Escape');
      await expect(clearable(page)).toBeFocused();
    });

    test('over an open question the cross takes the letters, not the answer', async ({
      page,
    }) => {
      const field = trigger(page, 'select-clear-filter');
      await expect(field).toHaveValue('Lithuania');

      await field.fill('pol');
      await expect(options(page)).toHaveCount(1);
      await cross(page, 'select-clear-filter').click();

      // The list is whole again, the panel never went away, and the answer the question was
      // hiding is still the answer.
      await expect(panel(page)).toBeVisible();
      await expect(field).toHaveValue('');
      await expect(options(page).first()).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(field).toHaveValue('Lithuania');
    });

    test('a many-choice cross takes every answer at once', async ({ page }) => {
      const field = trigger(page, 'select-clear-multi');
      await expect(field).toHaveText('Poland, Slovakia');

      await cross(page, 'select-clear-multi').click();

      await expect(
        page
          .getByTestId('select-clear-multi')
          .locator('[data-pct-part="value"]'),
      ).toHaveCount(0);
      await field.click();
      await expect(page.locator('[data-pct-part="option-check"]')).toHaveCount(
        0,
      );
    });

    test('the cross is a target of at least 24 px', async ({ page }) => {
      const box = await boxOf(cross(page));
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
    });
  });

  test('the clickable area of the trigger is at least 24 px tall', async ({
    page,
  }) => {
    const box = await boxOf(trigger(page));
    expect(box.height).toBeGreaterThanOrEqual(24);
  });
});
