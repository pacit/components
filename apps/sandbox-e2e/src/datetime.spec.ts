import { expect, Locator, Page, test } from '@playwright/test';
import { boxOf, setRtl, visit } from './support/dom';

/**
 * Every case in this file runs with the browser's clock in Kiritimati — UTC+14, the farthest a
 * clock gets from the meridian — and not in whatever timezone the machine happens to be in. A
 * day with a time is a wall clock with a date and never an instant (0090), so nothing below may
 * move when the browser stands fourteen hours east of the server that stored the value: a field
 * that wrote its pair through a `Date` would show 1 December at 13:05 as another hour of another
 * day here, measured where the machine's own timezone would have hidden it
 * (`req-api-datetime`).
 */
test.use({ timezoneId: 'Pacific/Kiritimati' });

/**
 * The datetime field, in a real browser: where focus really goes when a panel that lives outside
 * the host tree opens on a grid and moves on to the columns, what each engine's own `Intl`
 * writes for both halves in four languages, and which way the two texts and the panel stand in
 * a page written right to left. The sandbox runs under `fr-FR`, so the application's texts —
 * the sentences, the words and the letters of the hints — are French.
 */

const partOf = (host: Locator, part: string) =>
  host.locator(`[data-pct-part="${part}"]`);

const dayOf = (page: Page, id: string) =>
  partOf(page.getByTestId(id), 'date-control');

const timeOf = (page: Page, id: string) =>
  partOf(page.getByTestId(id), 'time-control');

const toggleOf = (page: Page, id: string) =>
  partOf(page.getByTestId(id), 'toggle');

/** The panel is attached to `body`, so it is looked for on the page and not in the host. */
const panelOf = (page: Page) => page.locator('[data-pct-part="panel"]');

const columnOf = (scope: Locator, field: string) =>
  scope.locator(`[data-pct-part="column"][data-pct-field="${field}"]`);

/** The row a column points at — what `aria-activedescendant` names, read as its text. */
const activeIn = (column: Locator) =>
  column.evaluate(
    (list) =>
      list.ownerDocument
        .getElementById(list.getAttribute('aria-activedescendant') ?? '')
        ?.textContent?.trim() ?? null,
  );

/** The rows of a column that can be taken, as their text. */
const takeable = (column: Locator) =>
  column
    .locator('[role="option"]:not([aria-disabled="true"])')
    .allTextContents()
    .then((rows) => rows.map((row) => row.trim()));

/**
 * The grid's cell for a day, found by the END of the whole date it is named by — the weekday
 * stands before it, and ` 2 décembre 2026` is not the end of `12 décembre 2026`.
 */
const cellOf = (page: Page, name: string) =>
  panelOf(page).locator(`[data-pct-part="day"][aria-label$=" ${name}"]`);

/** What the focused element is called — the grid's cell is named by its whole date. */
const focusedName = (page: Page) =>
  page.evaluate(
    () => document.activeElement?.getAttribute('aria-label') ?? null,
  );

test.describe('Datetime — the two texts', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datetime');
  });

  /**
   * The case the decision rests on, twice: `<input type="datetime-local">` draws its clock and
   * its order in a language each engine takes from a different place (0090, A1), and here four
   * fields on one page are each written in their own — the time FIRST in Vietnamese, the one
   * language of 52 that writes it so (C1).
   */
  test('writes both halves in the language the FIELD is in, each in its own text', async ({
    page,
  }) => {
    await expect(dayOf(page, 'datetime-en')).toHaveValue('12/01/2026');
    await expect(timeOf(page, 'datetime-en')).toHaveValue('1:05 PM');
    await expect(dayOf(page, 'datetime-pl')).toHaveValue('01.12.2026');
    await expect(timeOf(page, 'datetime-pl')).toHaveValue('13:05');
    // No `locale` of its own: the application's, which is `fr-FR` here.
    await expect(dayOf(page, 'datetime-standalone')).toHaveValue('01/12/2026');
    await expect(timeOf(page, 'datetime-standalone')).toHaveValue('13:05');

    const vietnamese = page
      .getByTestId('datetime-vi')
      .locator('input[type="text"]');
    await expect(vietnamese).toHaveCount(2);
    await expect(vietnamese.first()).toHaveAttribute(
      'data-pct-part',
      'time-control',
    );
    await expect(vietnamese.first()).toHaveValue('13:05');
    await expect(vietnamese.nth(1)).toHaveValue('01/12/2026');
    // The label points at the text that stands first, whichever half it is.
    const label = partOf(page.getByTestId('datetime-vi'), 'label');
    const first = await vietnamese.first().getAttribute('id');
    await expect(label).toHaveAttribute('for', first ?? '');
  });

  /**
   * Two hints with two owners each, as the date's and the time's have (0043 §6): the ORDER and
   * the separators are `Intl`'s for the FIELD's locale, the letters `PCT_TEXTS`' for the
   * APPLICATION — so the American field writes the month first in French letters.
   */
  test('shows two FORMATS while it is empty — the order per field, the letters per application', async ({
    page,
  }) => {
    for (const id of ['datetime-standalone', 'datetime-en']) {
      for (const text of [dayOf(page, id), timeOf(page, id)]) {
        await text.fill('');
        await text.blur();
      }
    }
    await expect(dayOf(page, 'datetime-standalone')).toHaveAttribute(
      'placeholder',
      'jj/mm/aaaa',
    );
    await expect(timeOf(page, 'datetime-standalone')).toHaveAttribute(
      'placeholder',
      'hh:mm',
    );
    await expect(dayOf(page, 'datetime-en')).toHaveAttribute(
      'placeholder',
      'mm/jj/aaaa',
    );
    await expect(timeOf(page, 'datetime-en')).toHaveAttribute(
      'placeholder',
      'h:mm AM/PM',
    );
  });

  /**
   * One text would be junk whole; two report a half as a half (0090 §2). The day's sentence is
   * the date field's own, the time stays as it stood, and the calendar opens on the month the
   * junk names — the day of the month is what is wrong with `31/02/2026`.
   */
  test('junk in one half keeps the other, says which half, and the panel opens on the month it names', async ({
    page,
  }) => {
    const host = page.getByTestId('datetime-standalone');
    const day = dayOf(page, 'datetime-standalone');
    await day.fill('31/02/2026');
    await day.blur();

    await expect(day).toHaveValue('31/02/2026');
    await expect(timeOf(page, 'datetime-standalone')).toHaveValue('13:05');
    await expect(host).toHaveAttribute('data-pct-malformed', '');
    await expect(partOf(host, 'error')).toHaveText('Pas une date');
    await expect(day).toHaveAttribute('aria-invalid', 'true');
    await expect(timeOf(page, 'datetime-standalone')).not.toHaveAttribute(
      'aria-invalid',
      /.*/,
    );

    await toggleOf(page, 'datetime-standalone').click();
    await expect(partOf(panelOf(page), 'caption')).toContainText(
      'février 2026',
    );
  });

  /**
   * A whole day with no time is no value — the platform's own reading (0090, A2) — and a form
   * that sees `null` would say "required" over a day the user can see. The control says what is
   * missing, once focus has left the WHOLE field: moving to the other half is staying in it.
   */
  test('a day with no time is no value, and the field says so once it is left', async ({
    page,
  }) => {
    const field = page.getByTestId('field-starts-at');
    const time = timeOf(page, 'datetime-starts-at');
    await time.fill('');
    // To the button, inside the field: nothing is said yet.
    await time.press('Tab');
    await expect(toggleOf(page, 'datetime-starts-at')).toBeFocused();
    await expect(partOf(field, 'field-error')).toHaveCount(0);
    // Off the field.
    await page.keyboard.press('Tab');
    await expect(partOf(field, 'field-error')).toHaveText(
      'Saisir une date et une heure',
    );
    await expect(time).toHaveAttribute('aria-invalid', 'true');
    await expect(dayOf(page, 'datetime-starts-at')).toHaveValue('01/12/2026');

    // A keystroke in the empty half takes it back.
    await time.press('1');
    await expect(partOf(field, 'field-error')).not.toHaveText(
      'Saisir une date et une heure',
    );
  });
});

test.describe('Datetime — the panel', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datetime');
  });

  /**
   * A panel of the kind that TAKES focus (0025), and what takes it is the grid's cell — the day
   * is the first half (0090 §4). jsdom can be asked whether the attribute is right; only a
   * browser can be asked where focus went.
   */
  test('opens on the day and the time the field holds, with focus in the grid', async ({
    page,
  }) => {
    // From the keyboard: the button reached as a Tab stop and pressed with Enter.
    await toggleOf(page, 'datetime-standalone').focus();
    await page.keyboard.press('Enter');
    const panel = panelOf(page);
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('role', 'dialog');
    await expect(toggleOf(page, 'datetime-standalone')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect.poll(() => focusedName(page)).toContain('1 décembre 2026');
    expect(await activeIn(columnOf(panel, 'hour'))).toBe('13');
    expect(await activeIn(columnOf(panel, 'minute'))).toBe('05');
  });

  /**
   * The two halves close differently, so one panel decides (0090 §4): a pick in the grid
   * answers the first question and hands focus to the hours; a pick in the columns completes
   * the pair and closes. The day's text is rewritten by the pick; the time's is the user's.
   */
  test('a day picked moves on to the hours, and a time picked closes', async ({
    page,
  }) => {
    await toggleOf(page, 'datetime-standalone').click();
    await expect.poll(() => focusedName(page)).toContain('1 décembre 2026');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(dayOf(page, 'datetime-standalone')).toHaveValue('02/12/2026');
    await expect(columnOf(panelOf(page), 'hour')).toBeFocused();
    await expect(panelOf(page)).toBeVisible();

    // A column is a field: the value moves under the key, and the time's text shows it.
    await page.keyboard.press('ArrowDown');
    await expect(timeOf(page, 'datetime-standalone')).toHaveValue('14:05');

    await page.keyboard.press('Enter');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(dayOf(page, 'datetime-standalone')).toBeFocused();
    await expect(timeOf(page, 'datetime-standalone')).toHaveValue('14:05');
  });

  /**
   * A day picked with the time half empty writes the day and no value; the columns stand on
   * the current hour, active and chosen nowhere — 0089's opening with no value — and the pair
   * appears the moment the second half holds one (0090 §3).
   */
  test('a day picked with no time writes the day alone, and the columns stand on now', async ({
    page,
  }) => {
    const time = timeOf(page, 'datetime-standalone');
    await time.fill('');
    await time.blur();
    await toggleOf(page, 'datetime-standalone').click();
    await expect.poll(() => focusedName(page)).toContain('1 décembre 2026');

    await page.keyboard.press('Enter');
    const hour = columnOf(panelOf(page), 'hour');
    await expect(hour).toBeFocused();
    await expect(time).toHaveValue('');
    expect(await activeIn(hour)).not.toBeNull();
    await expect(
      panelOf(page).locator('[role="option"][aria-selected="true"]'),
    ).toHaveCount(0);

    await page.keyboard.press('Enter');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(time).not.toHaveValue('');
  });

  test('Escape closes it with the value as the halves left it, focus back on the field', async ({
    page,
  }) => {
    await toggleOf(page, 'datetime-standalone').click();
    await expect.poll(() => focusedName(page)).toContain('1 décembre 2026');
    await page.keyboard.press('Tab');
    await expect(columnOf(panelOf(page), 'hour')).toBeFocused();
    await page.keyboard.press('ArrowDown');

    await page.keyboard.press('Escape');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(timeOf(page, 'datetime-standalone')).toHaveValue('14:05');
    await expect(dayOf(page, 'datetime-standalone')).toBeFocused();
  });

  /**
   * The panel is a child of `body`, so its content stands at the END of the document's tab
   * order however near the field it is drawn. Tab walks the grid, then the columns one stop
   * each, and then leaves, spliced back onto the field (0031).
   */
  test('Tab walks the grid, then the columns, and comes back to the field', async ({
    page,
  }) => {
    await toggleOf(page, 'datetime-standalone').click();
    const panel = panelOf(page);
    await expect.poll(() => focusedName(page)).toContain('1 décembre 2026');

    await page.keyboard.press('Tab');
    await expect(columnOf(panel, 'hour')).toBeFocused();
    // Shift+Tab from the hours is the way back to a day picked wrong.
    await page.keyboard.press('Shift+Tab');
    await expect.poll(() => focusedName(page)).toContain('1 décembre 2026');
    await page.keyboard.press('Tab');
    await expect(columnOf(panel, 'hour')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(columnOf(panel, 'minute')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(columnOf(panel, 'hour')).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(panelOf(page)).toHaveCount(0);
    await expect(dayOf(page, 'datetime-standalone')).toBeFocused();
  });

  test('a press outside closes it and leaves focus where the press landed', async ({
    page,
  }) => {
    await toggleOf(page, 'datetime-standalone').click();
    await expect(panelOf(page)).toBeVisible();
    await page.locator('main h2').first().click();
    await expect(panelOf(page)).toHaveCount(0);
    await expect(dayOf(page, 'datetime-standalone')).not.toBeFocused();
    await expect(toggleOf(page, 'datetime-standalone')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});

test.describe('Datetime — the bounds and the slots', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/datetime');
  });

  /**
   * The cast of 0090 §5: the calendar gets the day of each bound, the columns the time of a
   * bound only on the bound's own day — and the step counts from midnight, so `min` at 09:05 at
   * a quarter-hour step opens at 09:15 and every other day keeps its quarters whole.
   */
  test('a day on the edge narrows the hours, and a day inside leaves them whole', async ({
    page,
  }) => {
    await toggleOf(page, 'datetime-bounded').click();
    const panel = panelOf(page);
    await expect(panel).toBeVisible();

    await expect
      .poll(async () => (await takeable(columnOf(panel, 'hour')))[0])
      .toBe('09');
    await expect
      .poll(() => takeable(columnOf(panel, 'minute')))
      .toEqual(['15', '30', '45']);
    await expect(cellOf(page, '30 novembre 2026')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(cellOf(page, '4 décembre 2026')).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await expect.poll(() => focusedName(page)).toContain('1 décembre 2026');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(columnOf(panel, 'hour')).toBeFocused();
    await expect.poll(() => takeable(columnOf(panel, 'hour'))).toHaveLength(24);
    await expect
      .poll(() => takeable(columnOf(panel, 'minute')))
      .toEqual(['00', '15', '30', '45']);
  });

  /**
   * `datetimeDisabled` is asked of every time of the chosen day: ten o'clock booked whole is an
   * hour refused, half past twelve a minute refused in its hour — and the day stays a day the
   * grid offers.
   */
  test('taken slots refuse their rows on their own day, and the day stays takeable', async ({
    page,
  }) => {
    await toggleOf(page, 'datetime-booked').click();
    const panel = panelOf(page);
    await expect(panel).toBeVisible();
    await expect
      .poll(() => takeable(columnOf(panel, 'hour')))
      .not.toContain('10');
    await expect.poll(() => takeable(columnOf(panel, 'hour'))).toHaveLength(23);
    await expect(cellOf(page, '2 décembre 2026')).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await page.keyboard.press('Tab');
    await expect(columnOf(panel, 'hour')).toBeFocused();
    await page.keyboard.type('12');
    await expect
      .poll(() => takeable(columnOf(panel, 'minute')))
      .not.toContain('30');
    await expect
      .poll(() => takeable(columnOf(panel, 'minute')))
      .toHaveLength(59);
  });

  test('a value typed outside the bounds is kept as typed — the form’s to refuse', async ({
    page,
  }) => {
    const time = timeOf(page, 'datetime-bounded');
    await time.fill('08:07');
    await time.blur();
    await expect(time).toHaveValue('08:07');
    await expect(page.getByTestId('datetime-bounded')).not.toHaveAttribute(
      'data-pct-malformed',
      /.*/,
    );
  });
});

test.describe('Datetime — bounds from a signal form', () => {
  /**
   * A signal form cannot write `min` beside `[formField]` (`NG8022`), and Angular's own
   * `minDate()` takes a `Date`: `pctDateTimeBounds` binds the field's own type to the platform's
   * `MIN` / `MAX`, and the directive hands the bounds on. The end of the talk is bounded by its
   * start and by the conference's close.
   */
  test('a signal form hands its bounds to the panel, and reports a datetime typed outside', async ({
    page,
  }) => {
    await visit(page, '/datetime');
    await toggleOf(page, 'datetime-talk-ends').click();
    const panel = panelOf(page);
    await expect(panel).toBeVisible();
    await expect(cellOf(page, '30 novembre 2026')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(cellOf(page, '3 décembre 2026')).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(cellOf(page, '4 décembre 2026')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    // The start's own day opens at the start's hour.
    await expect
      .poll(async () => (await takeable(columnOf(panel, 'hour')))[0])
      .toBe('10');
    await page.keyboard.press('Escape');

    const time = timeOf(page, 'datetime-talk-ends');
    await time.fill('09:30');
    await time.blur();
    await expect(time).toHaveValue('09:30');
    await expect(time).toHaveAttribute('aria-invalid', 'true');
    const field = page.getByTestId('demo-form-bounds').locator('pct-field');
    await expect(partOf(field.nth(1), 'field-error')).toHaveText(
      'It ends after it starts',
    );
  });
});

test.describe('Datetime — right to left', () => {
  /**
   * The row mirrors as the date and the time fields do — the button at the END of the row,
   * which is the left in RTL — and the panel stands its columns after the grid along the inline
   * axis. No rule says `rtl` anywhere: a flex row and logical properties, and the geometry is
   * the only witness.
   */
  test('the two texts, the button and the panel’s halves change sides', async ({
    page,
  }) => {
    await visit(page, '/datetime');
    const day = dayOf(page, 'datetime-standalone');
    const time = timeOf(page, 'datetime-standalone');
    const toggle = toggleOf(page, 'datetime-standalone');
    expect((await boxOf(day)).x).toBeLessThan((await boxOf(time)).x);
    expect((await boxOf(time)).x).toBeLessThan((await boxOf(toggle)).x);

    await setRtl(page);
    expect((await boxOf(day)).x).toBeGreaterThan((await boxOf(time)).x);
    expect((await boxOf(time)).x).toBeGreaterThan((await boxOf(toggle)).x);

    await toggle.click();
    const panel = panelOf(page);
    await expect(panel).toBeVisible();
    const grid = await boxOf(partOf(panel, 'grid'));
    const hour = await boxOf(columnOf(panel, 'hour'));
    expect(grid.x).toBeGreaterThan(hour.x);
  });
});
