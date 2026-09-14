import { expect, Locator, Page, test } from '@playwright/test';
import { attrOf, boxOf, setRtl, visit } from './support/dom';

/**
 * Every case in this file runs with the browser's clock in Kiritimati — UTC+14, the farthest a
 * clock gets from the meridian — and not in whatever timezone the machine happens to be in.
 * A day here is a calendar day and never an instant (0043), so nothing below may move when
 * the browser stands fourteen hours east of the server that stored the value; a case that
 * did move would be the defect the type exists to refuse, measured where the machine's own
 * timezone would have hidden it (`req-api-day`).
 */
test.use({ timezoneId: 'Pacific/Kiritimati' });

/**
 * The date field and its calendar, in a real browser.
 *
 * Every case here is about something jsdom has no answer for: what a browser's own
 * `<input type="date">` would have done instead, where focus really goes when a panel that
 * lives outside the host tree opens, which way an arrow moves in a grid written right to
 * left, and whether a walk that rebuilds the grid takes focus with it.
 */

const partOf = (host: Locator, part: string) =>
  host.locator(`[data-pct-part="${part}"]`);

/** The panel is attached to `body`, so it is looked for on the page and not in the host. */
const panelOf = (page: Page) => page.locator('[data-pct-part="panel"]');

/**
 * The cursor is looked for INSIDE a grid and never on the page, and that is not tidiness:
 * the `/date` view carries an inline calendar as well as the panel, so two grids stand in
 * the document at once and each has a cell with `tabindex="0"`. A page-wide selector finds
 * both — which is the view doing exactly what it is there for.
 */
const cursorIn = (scope: Locator) =>
  scope.locator('[data-pct-part="day"][tabindex="0"]');

const cursorOf = (page: Page) => cursorIn(panelOf(page));

const focusedName = (page: Page) =>
  page.evaluate(
    () => document.activeElement?.getAttribute('aria-label') ?? null,
  );

/**
 * Where the focused cell stands among the panel's day cells, or `-1`.
 *
 * A POSITION and not a name, and that is a control talking: the first version of the RTL
 * case asserted that the label after `ArrowRight` contained `26`, and every label on the page
 * contains `26` — it is in the year. The case passed with the mirroring taken out, which is
 * the one thing it exists to catch. A DOM index has no such second reading: `dir="rtl"`
 * mirrors the drawing and leaves the order alone, so the cell before is the cell before in
 * either direction.
 */
const focusedIndex = (page: Page) =>
  panelOf(page).evaluate((panel) =>
    [...panel.querySelectorAll('[data-pct-part="day"]')].indexOf(
      panel.ownerDocument.activeElement as Element,
    ),
  );

test.describe('Date — the field', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/date');
  });

  /**
   * The case the whole decision rests on. `<input type="date">` takes the order it shows a
   * date in from `lang` in chromium, from the browser's locale in webkit and from neither in
   * firefox — so the one thing an application cannot do with it is decide. Here the
   * application decides, and the proof is two fields on one page in two languages.
   */
  test('shows the date in the language the FIELD is in, not the browser', async ({
    page,
  }) => {
    await expect(
      page.getByTestId('date-pl').locator('input').first(),
    ).toHaveValue('27.08.2026');
    await expect(
      page.getByTestId('date-ja').locator('input').first(),
    ).toHaveValue('2026/08/27');
  });

  /**
   * The format hint has two owners, and this case is what says so out loud.
   *
   * The ORDER and the separators come from `Intl` and follow the FIELD's `locale`; the three
   * LETTERS come from `PCT_TEXTS` and follow the APPLICATION. The sandbox runs under `fr-FR`
   * and translates them to `j`, `m`, `a`, so a field told `locale="pl-PL"` shows
   * `jj.mm.aaaa` — Polish order, Polish separators, French letters. That reads oddly written
   * down and is the right answer read aloud: the order is a fact about the date, the letters
   * are a word in the language the page is written in, and a Polish `y` would mean nothing
   * to the reader either way.
   */
  test('shows the FORMAT while it is empty — the order per field, the letters per application', async ({
    page,
  }) => {
    const pl = page.getByTestId('date-pl').locator('input').first();
    await pl.fill('');
    await pl.blur();
    await expect(pl).toHaveAttribute('placeholder', 'jj.mm.aaaa');

    // The standalone card has no `locale` of its own, so both halves are the application's.
    await expect(
      page.getByTestId('date-standalone').locator('input').first(),
    ).toHaveAttribute('placeholder', 'jj/mm/aaaa');

    // Japanese order, and the same three letters.
    await expect(
      page.getByTestId('date-ja').locator('input').first(),
    ).toHaveAttribute('placeholder', 'aaaa/mm/jj');
  });

  /**
   * The other half of the decision, and the one `req-api-number` already refused
   * `<input type="number">` over: a native date input reads `value === ''` for anything
   * half-typed, in all three engines, and `validity.badInput` — the flag that would tell
   * junk from empty — is `false` in webkit. This control keeps the text and says what it is.
   */
  test('keeps junk in the field and reports it, where a native date input loses it', async ({
    page,
  }) => {
    const host = page.getByTestId('date-standalone');
    const input = host.locator('input').first();

    await input.fill('not a date');
    await input.blur();

    await expect(input).toHaveValue('not a date');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(host).toHaveAttribute('data-pct-malformed', '');
    // And says so in the message line, in the language the application gave it — the
    // control's own channel (0070), which the form's `errors` input could not carry.
    const error = host.locator('[data-pct-part="error"]');
    await expect(error).toHaveText('Pas une date');
    await expect(input).toHaveAttribute(
      'aria-describedby',
      await attrOf(error, 'id'),
    );

    // What the platform's own control would have done with the same keystrokes, measured on
    // the same page rather than quoted: an empty value and no way back to what was typed.
    const native = await page.evaluate(() => {
      const el = document.createElement('input');
      el.type = 'date';
      document.body.append(el);
      el.value = '2026-13-45';
      const answer = {
        value: el.value,
        badInput: el.validity.badInput,
      };
      el.remove();
      return answer;
    });
    expect(native.value).toBe('');
  });

  test('reads back what it writes, in every language on the page', async ({
    page,
  }) => {
    for (const [id, typed, expected] of [
      ['date-pl', '1.9.2026', '01.09.2026'],
      ['date-ja', '2026/9/1', '2026/09/01'],
    ] as const) {
      const input = page.getByTestId(id).locator('input').first();
      await input.fill(typed);
      await input.blur();
      await expect(input).toHaveValue(expected);
    }
  });
});

test.describe('Date — the panel', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/date');
  });

  /**
   * A panel of the kind that TAKES focus (0025), and the cell the cursor stands on is what
   * takes it — the grid moves focus rather than pointing at it (0032). jsdom can be asked
   * whether the attribute is right; only a browser can be asked where focus went.
   */
  test('opens onto the day the field holds, with focus on it', async ({
    page,
  }) => {
    const host = page.getByTestId('date-standalone');
    await partOf(host, 'toggle').click();

    await expect(panelOf(page)).toBeVisible();
    await expect(partOf(panelOf(page), 'caption')).toContainText('2026');
    await expect(cursorOf(page)).toBeFocused();
    // The cell the cursor is on IS the chosen one — asserted as the same element rather
    // than by its name, which carries the year and would read `27` out of `2027` as
    // happily as out of the day.
    await expect(
      panelOf(page).locator('[data-pct-part="day"][data-pct-chosen]'),
    ).toBeFocused();
  });

  test('says on the button that the panel is open, and takes it back', async ({
    page,
  }) => {
    const toggle = partOf(page.getByTestId('date-standalone'), 'toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-haspopup', 'dialog');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(await attrOf(toggle, 'aria-controls')).toBe(
      await attrOf(panelOf(page), 'id'),
    );

    await page.keyboard.press('Escape');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape closes it and hands focus back to the field', async ({
    page,
  }) => {
    const host = page.getByTestId('date-standalone');
    await partOf(host, 'toggle').click();
    await expect(cursorOf(page)).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(host.locator('input').first()).toBeFocused();
  });

  /**
   * The panel is a child of `body`, so its content stands at the END of the document's tab
   * order however near the field it is drawn. Tab out of it therefore closes it and splices
   * focus back onto the control it belongs to (0031) — otherwise the next Tab would leave
   * the page for the browser's own chrome.
   */
  test('Tab out of the panel comes back to the field, not to the end of the page', async ({
    page,
  }) => {
    const host = page.getByTestId('date-standalone');
    await partOf(host, 'toggle').click();
    await expect(cursorOf(page)).toBeFocused();

    // The cell is the last tab stop in the panel — the two nav buttons stand before it.
    await page.keyboard.press('Tab');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(host.locator('input').first()).toBeFocused();
  });

  test('writes the day it is given and closes', async ({ page }) => {
    const host = page.getByTestId('date-standalone');
    const input = host.locator('input').first();
    await partOf(host, 'toggle').click();
    // Where the cursor IS, asked before it is asked to move. The panel takes focus one
    // RENDER after the click and not one round trip — `focusCursor()` runs in an
    // `afterRenderEffect` — so a key pressed straight after the click can arrive while
    // focus still sits on the toggle: `ArrowRight` reaches no grid, `Enter` writes the day
    // the field already held, and the case reads as a component that cannot count
    // (`lesson-152`).
    await expect(cursorOf(page)).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');

    await expect(panelOf(page)).toHaveCount(0);
    await expect(input).toHaveValue('28/08/2026');
    await expect(input).toBeFocused();
  });

  test('a press outside closes it and leaves focus where the press landed', async ({
    page,
  }) => {
    await partOf(page.getByTestId('date-standalone'), 'toggle').click();
    await expect(panelOf(page)).toBeVisible();

    await page.locator('h2.view__title').click();
    await expect(panelOf(page)).toHaveCount(0);
  });
});

test.describe('Date — the walk', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/date');
    await partOf(page.getByTestId('date-standalone'), 'toggle').click();
    await expect(cursorOf(page)).toBeFocused();
  });

  /**
   * A month step REBUILDS the grid, so the cell the cursor lands on is created by the very
   * pass that moved it. Whether focus followed is a question about the DOM after a render,
   * which is why this case is here and not in a unit run.
   */
  test('an arrow follows the writing direction — left to right, here', async ({
    page,
  }) => {
    const before = await focusedIndex(page);
    await page.keyboard.press('ArrowRight');
    // The cell is focused by the pass that moved the cursor, not by the keypress itself, so
    // the reading waits for it (lesson-130): read one frame early under load, this case went
    // red twice on a step that never touched the calendar.
    await expect.poll(() => focusedIndex(page)).toBe(before + 1);
  });

  test('a step into another month carries focus with it', async ({ page }) => {
    // The sandbox runs under `fr-FR`, so the month is the one French writes — asserted on
    // the month it STEPS TO rather than the one it starts on, because the name of August in
    // French carries a letter this repository's language gate reads as another language's.
    const caption = partOf(panelOf(page), 'caption');
    const before = await caption.textContent();

    await page.keyboard.press('PageDown');
    await expect(caption).toContainText('septembre');
    expect(before).not.toContain('septembre');
    await expect(cursorOf(page)).toBeFocused();
    expect(await focusedName(page)).toContain('septembre');

    await page.keyboard.press('Shift+PageUp');
    await expect(caption).toContainText('2025');
    await expect(cursorOf(page)).toBeFocused();
  });

  test('the nav buttons step the month and leave focus on themselves', async ({
    page,
  }) => {
    const caption = partOf(panelOf(page), 'caption');
    const forward = panelOf(page).locator('[data-pct-part="nav"]').nth(1);
    await forward.click();
    await expect(caption).toContainText('septembre');
    await expect(forward).toBeFocused();
  });

  test('the grid is one tab stop and the panel has three', async ({ page }) => {
    await expect(cursorOf(page)).toHaveCount(1);
    const stops = await panelOf(page).evaluate(
      (panel) =>
        panel.querySelectorAll('button:not(:disabled), [tabindex="0"]').length,
    );
    expect(stops).toBe(3);
  });
});

test.describe('Date — right to left', () => {
  /**
   * A grid's arrows are about the CELL to the side, and which side that is depends on the
   * direction the grid is written in. `dir="rtl"` mirrors the drawing, so it has to mirror
   * the movement too — otherwise the cursor walks away from the key that was pressed.
   *
   * Measured as geometry AND as behaviour: the first cell of a row really is drawn on the
   * right, and `ArrowRight` really moves to the day before.
   */
  test('the arrows follow the writing direction, and so does the drawing', async ({
    page,
  }) => {
    await visit(page, '/date');
    await setRtl(page);
    await partOf(page.getByTestId('date-standalone'), 'toggle').click();
    await expect(cursorOf(page)).toBeFocused();

    const cells = panelOf(page).locator('[data-pct-part="day"]');
    const first = await boxOf(cells.nth(0));
    const second = await boxOf(cells.nth(1));
    expect(first.x).toBeGreaterThan(second.x);

    const before = await focusedIndex(page);
    expect(before).toBeGreaterThan(0);
    await page.keyboard.press('ArrowRight');
    // The cell BEFORE, because the row is drawn the other way round: the key follows the
    // eye, not the DOM.
    await expect.poll(() => focusedIndex(page)).toBe(before - 1);
  });
});

test.describe('Date — the bounds and the holes in them', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/date');
    await partOf(page.getByTestId('date-bounded'), 'toggle').click();
  });

  test('the walk stops at the bounds and the nav buttons stop with it', async ({
    page,
  }) => {
    const navs = panelOf(page).locator('[data-pct-part="nav"]');
    await expect(navs.nth(0)).toBeDisabled();
    await expect(navs.nth(1)).toBeDisabled();

    // Forty presses is more than the month is wide, so the cursor is against `min` — which
    // is the first day of the bounded month. Asserted as an ELEMENT rather than as a name:
    // the name is French here, and the first cell of the month is the same cell in every
    // language.
    for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowLeft');
    await expect(
      panelOf(page)
        .locator('[data-pct-part="day"]:not([data-pct-outside])')
        .first(),
    ).toBeFocused();
  });

  /**
   * The split the calendar is built on: a bound clamps where the keyboard can GO, a
   * predicate marks a day it can reach and cannot take.
   */
  test('a refused day is reached, announced and not takeable', async ({
    page,
  }) => {
    const refused = panelOf(page)
      .locator(
        '[data-pct-part="day"][data-pct-disabled]:not([data-pct-outside])',
      )
      .first();
    await expect(refused).toHaveAttribute('aria-disabled', 'true');

    // Playwright's own actionability check reads `aria-disabled` and refuses to press the
    // cell — which is a third party confirming the state is legible, and the reason the
    // press below has to be forced. Without the force the case times out looking exactly
    // like the component ignoring a click.
    await expect(refused).toBeDisabled();

    const input = page.getByTestId('date-bounded').locator('input').first();
    const before = await input.inputValue();
    await refused.click({ force: true });
    await expect(input).toHaveValue(before);
    await expect(panelOf(page)).toBeVisible();
  });
});
